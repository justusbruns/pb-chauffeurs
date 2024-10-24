// components/SignUpForm.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Event {
    id: string;
    name: string;
    start: string;
    stop: string;
    city: string;
    travelTime: string;
}

interface Chauffeur {
    id: string;
    name: string;
}

interface Availability {
    eventId: string;
    chauffeurId: string;
    status: string; // "Available", "Not Available", "Maybe Available"
}

const SignUpForm: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [selectedChauffeur, setSelectedChauffeur] = useState<string>('');

    useEffect(() => {
        // Fetch events, chauffeurs, and availability from Airtable
        fetchEvents();
        fetchChauffeurs();
    }, []);

    const fetchEvents = async () => {
        const response = await axios.get('/api/airtable/events');
        const eventsData = response.data.map((record: any) => ({
            id: record.id,
            name: record.fields['Event name'],
            start: record.fields['Starts at'],
            stop: record.fields['Stops at'],
            city: record.fields['Location City'],
            travelTime: record.fields['Travel Time'],
        }));
        setEvents(eventsData);
    };

    const fetchChauffeurs = async () => {
        const response = await axios.get('/api/airtable/chauffeurs');
        const chauffeursData = response.data.map((record: any) => ({
            id: record.id,
            name: record.fields['Name'],
        }));
        setChauffeurs(chauffeursData);
    };

    const fetchAvailability = async (chauffeurId: string) => {
        const response = await axios.get(`/api/airtable/availability?chauffeurId=${chauffeurId}`);
        const availabilityData = response.data.map((record: any) => ({
            eventId: record.fields['Event'][0],
            chauffeurId: record.fields['Chauffeurs'][0],
            status: record.fields['Availability'],
        }));
        setAvailability(availabilityData);
    };

    const handleChauffeurChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = event.target.value;
        setSelectedChauffeur(selectedId);
        fetchAvailability(selectedId);
    };

    const updateAvailability = async (eventId: string, status: string) => {
        // Send availability update to Airtable
        await axios.patch('/api/airtable/availability', {
            eventId,
            chauffeurId: selectedChauffeur,
            status
        });
        fetchAvailability(selectedChauffeur); // Refresh data
    };

    return (
        <div>
            <label htmlFor="chauffeur-select">Chauffeur Name:</label>
            <select id="chauffeur-select" value={selectedChauffeur} onChange={handleChauffeurChange}>
                {chauffeurs.map((chauffeur) => (
                    <option key={chauffeur.id} value={chauffeur.id}>
                        {chauffeur.name}
                    </option>
                ))}
            </select>

            {events.map((event) => {
                const availabilityForEvent = availability.find(avail => avail.eventId === event.id);

                return (
                    <div key={event.id} className="event">
                        <h3>{event.name}</h3>
                        <p>Starts at: {event.start}</p>
                        <p>Stops at: {event.stop}</p>
                        <p>City: {event.city}</p>
                        <p>Travel Time: {event.travelTime}</p>
                        <select
                            value={availabilityForEvent?.status || 'Unavailable'}
                            onChange={(e) => updateAvailability(event.id, e.target.value)}
                        >
                            <option value="Available">✅ Available</option>
                            <option value="Not Available">🚫 Not Available</option>
                            <option value="Maybe Available">💅 Maybe Available</option>
                        </select>
                    </div>
                );
            })}
        </div>
    );
};

export default SignUpForm;