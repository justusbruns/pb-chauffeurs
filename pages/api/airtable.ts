// pages/api/airtable.ts
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

  const { pathname, query } = new URL(req.url || '', `http://${req.headers.host}`);
  const path = pathname.split('/').pop();

  try {
    let records;
    switch (path) {
      case 'events':
        records = await base('Events').select({
          fields: ['Event name', 'Starts at', 'Stops at', 'Location City', 'Travel Time'],
        }).all();
        break;
      case 'chauffeurs':
        records = await base('People').select({
          view: 'Chauffeurs',
          fields: ['Name'],
        }).all();
        break;
      case 'availability':
        if (req.method === 'GET') {
          const { chauffeurId } = query;
          records = await base('Availability').select({
            filterByFormula: `{Chauffeurs}='${chauffeurId}'`,
            fields: ['Availability', 'Chauffeurs', 'Event'],
          }).all();
        } else if (req.method === 'PATCH') {
          const { eventId, chauffeurId, status } = req.body;
          records = await base('Availability').update([
            {
              fields: {
                Event: [eventId],
                Chauffeurs: [chauffeurId],
                Availability: status,
              },
            },
          ]);
        }
        break;
      default:
        return res.status(404).json({ message: 'Not Found' });
    }

    const formattedRecords = records.map(record => ({
      id: record.id,
      fields: record.fields,
    }));

    res.status(200).json(formattedRecords);
  } catch (error) {
    console.error('Error fetching data from Airtable:', error);
    res.status(500).json({ message: 'Error fetching data from Airtable' });
  }
}