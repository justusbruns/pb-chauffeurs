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

const base = Airtable.base(BASE_ID! || 'default_base_id');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let records;
    
    // Fetch availability records for a specific chauffeur
    if (req.method === 'GET') {
      const { chauffeurId } = req.query;
      if (!chauffeurId) {
        return res.status(400).json({ message: 'Missing chauffeurId' });
      }
      records = await base('Availability').select({
        filterByFormula: `{Chauffeurs}='${chauffeurId}'`,
        fields: ['Availability', 'Chauffeurs', 'Event'],
      }).all();
    }
    
    // Update an existing availability record
    else if (req.method === 'PATCH') {
      const { recordId, eventId, chauffeurId, status } = req.body;
      if (!recordId || !eventId || !chauffeurId || !status) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

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
    }

    // Create a new availability record
    else if (req.method === 'POST') {
      const { eventId, chauffeurId, status } = req.body;
      if (!eventId || !chauffeurId || !status) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      records = await base('Availability').create([
        {
          fields: {
            Event: [eventId],
            Chauffeurs: [chauffeurId],
            Availability: status,
          },
        },
      ]);
    }

    if (!records || records.length === 0) {
      return res.status(404).json({ message: 'No records found or created' });
    }

    // Format and return the response
    const formattedRecords = records.map(record => ({
      id: record.id,
      fields: record.fields,
    }));

    res.status(200).json(formattedRecords);

  } catch (error) {
    console.error('Error handling availability request:', error);
    res.status(500).json({ message: 'Error handling availability request', error: (error as Error).message });
  }
}