import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_TOKEN || !BASE_ID) {
  throw new Error('Missing Airtable configuration');
}

Airtable.configure({
  apiKey: AIRTABLE_TOKEN,
});

const base = Airtable.base(BASE_ID!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let records;

    if (req.method === 'GET') {
      // Retrieve all records in the Availability table
      records = await base('Availability').select({
        fields: ['Availability', 'Chauffeurs', 'Event'],
      }).all();

      console.log("Raw Airtable records:", records);

      const formattedRecords = records.map(record => ({
        id: record.id,
        eventId: Array.isArray(record.fields['Event']) ? record.fields['Event'][0] : null,
        chauffeurId: Array.isArray(record.fields['Chauffeurs']) ? record.fields['Chauffeurs'][0] : null,
        status: record.fields['Availability'] || 'Unavailable',
      }));

      console.log("Formatted availability records being sent to frontend:", formattedRecords);
      return res.status(200).json(formattedRecords);

    } else if (req.method === 'PATCH') {
      const { recordId, eventId, chauffeurId, status } = req.body;

      records = await base('Availability').update([
        {
          id: recordId,
          fields: {
            Event: [eventId],
            Chauffeurs: [chauffeurId],
            Availability: status,
          },
        },
      ]);

      return res.status(200).json(records);

    } else if (req.method === 'POST') {
      const { eventId, chauffeurId, status } = req.body;

      records = await base('Availability').create([
        {
          fields: {
            Event: [eventId],
            Chauffeurs: [chauffeurId],
            Availability: status,
          },
        },
      ]);

      return res.status(200).json(records);
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).json({ message: 'Error handling request', error: (error as Error).message });
  }
}