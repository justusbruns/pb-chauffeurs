"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

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
    id: string;  // Airtable record ID for availability
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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchChauffeurs();
    }, []);

    useEffect(() => {
        if (selectedChauffeur) {
            // Clear previous events and availability when a new chauffeur is selected
            setEvents([]);
            setAvailability([]);
            fetchEvents();
            fetchAvailability(selectedChauffeur);
        }
    }, [selectedChauffeur]);

    // Fetch the list of chauffeurs
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
            setErrorMessage('Failed to fetch chauffeurs');
        }
    };

    // Fetch the list of events
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
            setErrorMessage('Failed to fetch events');
        }
    };

    // Fetch the availability for the selected chauffeur
    const fetchAvailability = async (chauffeurId: string) => {
        try {
            const response = await axios.get(`/api/airtable/availability?chauffeurId=${chauffeurId}`);
            const availabilityData = response.data.map((record: AirtableRecord<{ Event: string[]; Chauffeurs: string[]; Availability: string }>) => ({
                id: record.id,  // Capture the Airtable record ID for the availability record
                eventId: record.fields['Event'][0],
                chauffeurId: record.fields['Chauffeurs'][0],
                status: record.fields['Availability'],
            }));

            console.log("Fetched availability data:", availabilityData); // Debugging log

            setAvailability(availabilityData);
        } catch (error) {
            console.error('Error fetching availability:', error);
            setErrorMessage('Failed to fetch availability');
        }
    };

    // Update or create availability for a given event and chauffeur
    const updateAvailability = async (eventId: string, status: string) => {
        try {
            const existingRecord = availability.find(avail => avail.eventId === eventId && avail.chauffeurId === selectedChauffeur);
            if (existingRecord) {
                // Update the existing record using the recordId
                await axios.patch('/api/airtable/availability', {
                    recordId: existingRecord.id,  // Use the Airtable record ID for the existing availability
                    eventId,
                    chauffeurId: selectedChauffeur,
                    status
                });
                // Update the local state
                setAvailability(prevAvailability =>
                    prevAvailability.map(avail =>
                        avail.id === existingRecord.id ? { ...avail, status } : avail
                    )
                );
            } else {
                // Create a new record in the Availability table
                const response = await axios.post('/api/airtable/availability', {
                    eventId,
                    chauffeurId: selectedChauffeur,
                    status
                });
                const newRecord = response.data[0];
                // Update the local state
                setAvailability(prevAvailability => [...prevAvailability, {
                    id: newRecord.id,
                    eventId,
                    chauffeurId: selectedChauffeur,
                    status
                }]);
            }
        } catch (error) {
            console.error('Error updating availability:', error);
            setErrorMessage('Failed to update availability');
        }
    };

    // Format date and time
    const formatDateTime = (dateTime: string) => {
        const date = new Date(dateTime);
        return format(date, "HH:mm 'on' EEEE, do 'of' MMMM");
    };

    // Format travel time
    const formatTravelTime = (travelTime: string) => {
        if (typeof travelTime !== 'string') return '';
        const [hours, minutes] = travelTime.split(':').map(Number);
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    };

    return (
        <div className="sign-up-form">
            <h1 className="title">Sign up for Poem Booth rides</h1>
            {errorMessage && <p className="error">{errorMessage}</p>}

            <label htmlFor="chauffeur-select" className="chauffeur-label">Chauffeur Name:</label>
            <select id="chauffeur-select" className="chauffeur-dropdown" value={selectedChauffeur} onChange={(e) => setSelectedChauffeur(e.target.value)}>
                <option value="">Select a Chauffeur</option>
                {chauffeurs.map((chauffeur) => (
                    <option key={chauffeur.id} value={chauffeur.id}>
                        {chauffeur.name}
                    </option>
                ))}
            </select>

            <div className="events-container">
                {events.map((event) => {
                    const availabilityForEvent = availability.find(avail => avail.eventId === event.id);
                    console.log("Event ID:", event.id); // Debugging log
                    console.log("Availability for event:", availabilityForEvent); // Debugging log

                    return (
                        <div key={event.id} className="event-item">
                            <h3 className="event-name">{event.name}</h3>
                            <p className="event-details">Starts at: {formatDateTime(event.start)}</p>
                            <p className="event-details">Stops at: {formatDateTime(event.stop)}</p>
                            <p className="event-details">City: {event.city}</p>
                            {event.travelTime && <p className="event-details">Travel Time: {formatTravelTime(event.travelTime)}</p>}
                            <div className="availability-dropdown">
                                <select
                                    value={availabilityForEvent?.status || 'Select Availability'}
                                    onChange={(e) => updateAvailability(event.id, e.target.value)}
                                >
                                    <option value="Select Availability">Select Availability</option>
                                    <option value="Available">✅ Available</option>
                                    <option value="Not Available">🚫 Not Available</option>
                                    <option value="Maybe Available">💅 Maybe Available</option>
                                </select>
                            </div>
                            <hr className="event-separator" />
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .sign-up-form {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                .title {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .chauffeur-label {
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .chauffeur-dropdown {
                    margin-bottom: 20px;
                    padding: 5px;
                    width: 100%;
                    font-size: 16px;
                }
                .events-container {
                    margin-top: 20px;
                }
                .event-item {
                    padding: 10px 0;
                }
                .event-name {
                    font-size: 18px;
                    font-weight: bold;
                }
                .event-details {
                    margin: 5px 0;
                }
                .availability-dropdown {
                    margin-top: 10px;
                }
                .event-separator {
                    border: 1px solid #ccc;
                    margin-top: 20px;
                }
            `}</style>
        </div>
    );
};

export default SignUpForm;