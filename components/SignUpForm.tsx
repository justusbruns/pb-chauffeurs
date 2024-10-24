// components/SignUpForm.tsx
"use client";

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

interface AirtableRecord<T> {
    id: string;
    fields: T;
}

const SignUpForm: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [selectedChauffeur, setSelectedChauffeur] = useState<string>('');

    useEffect(() => {
        fetchEvents();
        fetchChauffeurs();
    }, []);

    useEffect(() => {
        if (selectedChauffeur) {
            fetchAvailability(selectedChauffeur);
        }
    }, [selectedChauffeur]);

    const fetchEvents = async () => {
        try {
            const response = await axios.get('/api/airtable/events');
            const eventsData = response.data.map((record: AirtableRecord<{ 'Event name': string; 'Starts at': string; 'Stops at': string; 'Location City': string; 'Travel Time': string }>) => ({
                id: record.id,
                name: record.fields['Event name'],
                start: record.fields['Starts at'],
                stop: record.fields['Stops at'],
                city: record.fields['Location City'],
                travelTime: record.fields['Travel Time'],
            }));
            setEvents(eventsData);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const fetchChauffeurs = async () => {
        try {
            const response = await axios.get('/api/airtable/chauffeurs');
            const chauffeursData = response.data.map((record: AirtableRecord<{ Name: string }>) => ({
                id: record.id,
                name: record.fields['Name'],
            }));
            setChauffeurs(chauffeursData);
        } catch (error) {
            console.error('Error fetching chauffeurs:', error);
        }
    };

    const fetchAvailability = async (chauffeurId: string) => {
        try {
            const response = await axios.get(`/api/airtable/availability?chauffeurId=${chauffeurId}`);
            const availabilityData = response.data.map((record: AirtableRecord<{ Event: string[]; Chauffeurs: string[]; Availability: string }>) => ({
                eventId: record.fields['Event'][0],
                chauffeurId: record.fields['Chauffeurs'][0],
                status: record.fields['Availability'],
            }));
            setAvailability(availabilityData);
        } catch (error) {
            console.error('Error fetching availability:', error);
        }
    };

    const updateAvailability = async (eventId: string, status: string) => {
        try {
            await axios.patch('/api/airtable/availability', {
                eventId,
                chauffeurId: selectedChauffeur,
                status
            });
            fetchAvailability(selectedChauffeur); // Refresh data
        } catch (error) {
            console.error('Error updating availability:', error);
        }
    };

    return (
        <div>
            <label htmlFor="chauffeur-select">Chauffeur Name:</label>
            <select id="chauffeur-select" value={selectedChauffeur} onChange={(e) => setSelectedChauffeur(e.target.value)}>
                <option value="">Select a Chauffeur</option>
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