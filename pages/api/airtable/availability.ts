// pages/api/airtable/availability.ts
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
      const { chauffeurId } = req.query;
      records = await base('Availability').select({
        filterByFormula: `{Chauffeurs}='${chauffeurId}'`,
        fields: ['Availability', 'Chauffeurs', 'Event'],
      }).all();
    } else if (req.method === 'PATCH' || req.method === 'POST') {
      const { eventId, chauffeurId, status } = req.body;
      try {
        console.log(`${req.method} Request body:`, req.body);  // Log the request body

        // Check if a record already exists for the given event and chauffeur
        const existingRecords = await base('Availability').select({
          filterByFormula: `AND({Event}='${eventId}', {Chauffeurs}='${chauffeurId}')`,
          fields: ['Availability', 'Chauffeurs', 'Event'],
        }).all();

        if (existingRecords.length > 0) {
          // Update the existing record
          const recordId = existingRecords[0].id;
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
          console.log('PATCH Airtable response:', records);  // Log the Airtable response
        } else {
          // Create a new record
          records = await base('Availability').create([
            {
              fields: {
                Event: [eventId],
                Chauffeurs: [chauffeurId],
                Availability: status,
              },
            },
          ]);
          console.log('POST Airtable response:', records);  // Log the Airtable response
        }

        res.status(200).json(records);
      } catch (error) {
        console.error(`Error ${req.method === 'PATCH' ? 'updating' : 'creating'} availability in Airtable:`, error);  // Log the error
        res.status(500).json({ message: `Airtable ${req.method === 'PATCH' ? 'update' : 'create'} error`, error: (error as Error).message });
      }
    }

    if (!records) {
      return res.status(404).json({ message: 'No records found' });
    }

    const formattedRecords = records.map(record => ({
      id: record.id,
      fields: record.fields,
    }));

    res.status(200).json(formattedRecords);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ message: 'Error handling request', error: (error as Error).message });
  }
}
