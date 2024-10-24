import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

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

  if (req.method === 'GET') {
    const { chauffeurId } = req.query;
    if (!chauffeurId) {
      return res.status(400).json({ message: 'Missing chauffeurId' });
    }

    try {
      const records = await base('Availability').select({
        filterByFormula: `{Chauffeurs}='${chauffeurId}'`,
        fields: ['Availability', 'Chauffeurs', 'Event'],
      }).all();

      const formattedRecords = records.map(record => ({
        id: record.id,
        fields: record.fields,
      }));

      res.status(200).json(formattedRecords);
    } catch (error) {
      console.error('Error fetching availability from Airtable:', error);
      res.status(500).json({ message: 'Error fetching availability from Airtable' });
    }
  } else if (req.method === 'PATCH') {
    const { eventId, chauffeurId, status } = req.body;

    if (!eventId || !chauffeurId || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
      const records = await base('Availability').update([
        {
          fields: {
            Event: [eventId],
            Chauffeurs: [chauffeurId],
            Availability: status,
          },
        },
      ]);

      res.status(200).json(records);
    } catch (error) {
      console.error('Error updating availability in Airtable:', error);
      res.status(500).json({ message: 'Error updating availability in Airtable' });
    }
  }
}