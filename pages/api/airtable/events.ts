import { NextApiRequest, NextApiResponse } from 'next';
import { base } from '../../lib/airtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const records = await base('Events').select({
      view: 'viwrQmtgDMoynYnfv', // Add the view parameter for "Chauffeurs" view
      fields: ['Event name', 'Starts at', 'Stops at', 'Location City', 'Travel Time', 'Status'], // Include the Status field
    }).all();

    const formattedRecords = records.map(record => ({
      id: record.id,
      fields: record.fields,
    }));

    res.status(200).json(formattedRecords);
  } catch (error) {
    console.error('Error fetching events from Airtable:', error);
    res.status(500).json({ message: 'Error fetching data from Airtable', error: (error as Error).message });
  }
}