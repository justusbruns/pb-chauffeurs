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

    // Handle GET request (Fetching availability based on Chauffeur ID)
    if (req.method === 'GET') {
      const { chauffeurId } = req.query;

      // Log chauffeurId being used for debugging
      console.log("Fetching availability for Chauffeur ID:", chauffeurId);

      // Fetch records from Airtable based on Chauffeur ID
      records = await base('Availability').select({
        filterByFormula: `{Chauffeurs}='${chauffeurId}'`,
        fields: ['Availability', 'Chauffeurs', 'Event'],
      }).all();

      // Log raw Airtable records for debugging
      console.log("Fetched availability records from Airtable:", records);

      // Format records to send to frontend
      const formattedRecords = records.map(record => ({
        id: record.id,
        eventId: record.fields['Event'][0],  // Assuming Event is a linked record
        chauffeurId: record.fields['Chauffeurs'][0],  // Assuming Chauffeurs is a linked record
        status: record.fields['Availability'],  // Availability status
      }));

      // Log formatted records to check if everything is mapped properly
      console.log("Formatted availability records:", formattedRecords);

      return res.status(200).json(formattedRecords);

    // Handle PATCH request (Updating existing availability record)
    } else if (req.method === 'PATCH') {
      const { recordId, eventId, chauffeurId, status } = req.body;

      // Log the incoming request body for debugging
      console.log('PATCH Request body:', req.body);

      // Update the availability record in Airtable
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

      // Log the Airtable response for debugging
      console.log('PATCH Airtable response:', records);

      return res.status(200).json(records);

    // Handle POST request (Creating a new availability record)
    } else if (req.method === 'POST') {
      const { eventId, chauffeurId, status } = req.body;

      // Log the incoming request body for debugging
      console.log('POST Request body:', req.body);

      // Create a new availability record in Airtable
      records = await base('Availability').create([
        {
          fields: {
            Event: [eventId],
            Chauffeurs: [chauffeurId],
            Availability: status,
          },
        },
      ]);

      // Log the Airtable response for debugging
      console.log('POST Airtable response:', records);

      return res.status(200).json(records);
    }
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error handling request:', error);
    return res.status(500).json({ message: 'Error handling request', error: (error as Error).message });
  }
}