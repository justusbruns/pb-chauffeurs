// pages/api/airtable.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

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
    let response;
    switch (path) {
      case 'events':
        response = await axios.get(`https://api.airtable.com/v0/${BASE_ID}/Events`, {
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
          params: {
            fields: ['Event name', 'Starts at', 'Stops at', 'Location City', 'Travel Time']
          }
        });
        break;
      case 'chauffeurs':
        response = await axios.get(`https://api.airtable.com/v0/${BASE_ID}/People`, {
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
          params: {
            view: 'Chauffeurs',
            fields: ['Name']
          }
        });
        break;
      case 'availability':
        if (req.method === 'GET') {
          const { chauffeurId } = query;
          response = await axios.get(`https://api.airtable.com/v0/${BASE_ID}/Availability`, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
            params: {
              filterByFormula: `{Chauffeurs}='${chauffeurId}'`,
              fields: ['Availability', 'Chauffeurs', 'Event']
            }
          });
        } else if (req.method === 'PATCH') {
          const { eventId, chauffeurId, status } = req.body;
          response = await axios.patch(`https://api.airtable.com/v0/${BASE_ID}/Availability`, {
            records: [
              {
                fields: {
                  Event: [eventId],
                  Chauffeurs: [chauffeurId],
                  Availability: status,
                },
              },
            ],
          }, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
          });
        }
        break;
      default:
        return res.status(404).json({ message: 'Not Found' });
    }

    res.status(200).json(response.data.records);
  } catch (error) {
    console.error('Error fetching data from Airtable:', error);
    res.status(500).json({ message: 'Error fetching data from Airtable' });
  }
}