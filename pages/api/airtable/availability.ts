// pages/api/airtable/availability.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

//const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
//const BASE_ID = process.env.AIRTABLE_BASE_ID;

const AIRTABLE_TOKEN = 'patLctiFQeNRiWop6';
const BASE_ID = 'apphYtwSYRt7UDukL';

Airtable.configure({
  apiKey: AIRTABLE_TOKEN,
});

const base = Airtable.base(BASE_ID);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let records;
    if (req.method === 'GET') {
      const { chauffeurId } = req.query;
      records = await base('Availability').select({
        filterByFormula: `{Chauffeurs}='${chauffeurId}'`,
        fields: ['Availability', 'Chauffeurs', 'Event'],
      }).all();
    } else if (req.method === 'PATCH') {
        const { recordId, eventId, chauffeurId, status } = req.body;
        records = await base('Availability').update([
          {
            id: recordId, // Include the record ID here
            fields: {
              Event: [eventId],
              Chauffeurs: [chauffeurId],
              Availability: status,
            },
          },
        ]);
      }

    const formattedRecords = records.map(record => ({
      id: record.id,
      fields: record.fields,
    }));

    res.status(200).json(formattedRecords);
  } catch (error) {
    console.error('Error fetching availability from Airtable:', error);
    res.status(500).json({ message: 'Error fetching data from Airtable' });
  }
}