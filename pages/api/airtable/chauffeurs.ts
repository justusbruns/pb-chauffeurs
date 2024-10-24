import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

Airtable.configure({
  apiKey: AIRTABLE_TOKEN,
});

const base = Airtable.base(BASE_ID);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const records = await base('People').select({
      view: 'Chauffeurs',
      fields: ['Name'],
    }).all();

    const formattedRecords = records.map(record => ({
      id: record.id,
      fields: record.fields,
    }));

    res.status(200).json(formattedRecords);
  } catch (error) {
    console.error('Error fetching chauffeurs from Airtable:', error);
    res.status(500).json({ message: 'Error fetching chauffeurs from Airtable' });
  }
}