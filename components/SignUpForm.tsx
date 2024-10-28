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
    status: string;
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

const SignUpForm: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [selectedChauffeur, setSelectedChauffeur] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchChauffeurs();
        fetchEvents(); // Fetch all events initially
        fetchAllAvailability(); // Fetch all availability records initially
    }, []);

    useEffect(() => {
        if (selectedChauffeur) {
            // No need to fetch availability again, just filter the existing data
            filterAvailability(selectedChauffeur);
        }
    }, [selectedChauffeur]);

    // Fetch the list of chauffeurs
    const fetchChauffeurs = async () => {
        try {
            const response = await axios.get('/api/airtable/chauffeurs');
            const chauffeursData = response.data.map((record: { id: string; fields: { Name: string } }) => ({
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
            const eventsData = response.data.map((record: { id: string; fields: { 'Event name': string; 'Starts at': string; 'Stops at': string; 'Location City': string; 'Travel Time': string; 'Status': string } }) => ({
                id: record.id,
                name: record.fields['Event name'],
                start: record.fields['Starts at'],
                stop: record.fields['Stops at'],
                city: record.fields['Location City'],
                travelTime: record.fields['Travel Time'],
                status: record.fields['Status'], 
            }));
            setEvents(eventsData);
        } catch (error) {
            console.error('Error fetching events:', error);
            setErrorMessage('Failed to fetch events');
        }
    };

    // Fetch all availability records
    const fetchAllAvailability = async () => {
        try {
            const response = await axios.get('/api/airtable/availability');
            const availabilityData = response.data.map((record: { id: string; eventId: string; chauffeurId: string; status: string }) => ({
                id: record.id,
                eventId: record.eventId,
                chauffeurId: record.chauffeurId,
                status: record.status,
            }));
            setAvailability(availabilityData);
        } catch (error) {
            console.error('Error fetching availability:', error);
            setErrorMessage('Failed to fetch availability');
        }
    };

    // Filter availability records for the selected chauffeur
    const filterAvailability = (chauffeurId: string) => {
        const filteredAvailability = availability.filter(avail => avail.chauffeurId === chauffeurId);
        setAvailability(filteredAvailability);
    };

    // Update or create availability for a given event and chauffeur
    const updateAvailability = async (eventId: string, status: string) => {
        try {
            const existingRecord = availability.find(avail => avail.eventId === eventId && avail.chauffeurId === selectedChauffeur);
            if (existingRecord) {
                await axios.patch('/api/airtable/availability', {
                    recordId: existingRecord.id,
                    eventId,
                    chauffeurId: selectedChauffeur,
                    status
                });
                setAvailability(prev => prev.map(avail => avail.id === existingRecord.id ? { ...avail, status } : avail));
            } else {
                const response = await axios.post('/api/airtable/availability', {
                    eventId,
                    chauffeurId: selectedChauffeur,
                    status
                });
                const newRecord = response.data[0];
                setAvailability(prev => [...prev, { id: newRecord.id, eventId, chauffeurId: selectedChauffeur, status }]);
            }
        } catch (error) {
            console.error('Error updating availability:', error);
            setErrorMessage('Failed to update availability');
        }
    };

    // Format travel time
        const formatTravelTime = (travelTime: string | null | undefined) => {
            // Check if travelTime is a valid string; otherwise, return an empty string
            return travelTime ? travelTime : '';
        };};

    return (
        <div className="sign-up-form">
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

            {selectedChauffeur && (
                <div className="events-container">
                    {events.map((event) => {
                        const availabilityForEvent = availability.find(
                            avail => avail.eventId === event.id && avail.chauffeurId === selectedChauffeur
                        );
        
                        console.log("Matching availability for event:", availabilityForEvent);  // Add this line

                        return (
                            <div key={event.id} className="event-item">
                                <h3 className="event-name">
                                    {event.name} {event.status === 'concept' && <span className="event-status">⏳ To be confirmed</span>}
                                </h3>
                                <p className="event-details">Starts at: {format(new Date(event.start), "HH:mm 'on' EEEE, do 'of' MMMM")}</p>
                                <p className="event-details">Stops at: {format(new Date(event.stop), "HH:mm 'on' EEEE, do 'of' MMMM")}</p>
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
            )}

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

                .event-status {
                    font-weight: normal;
                    color: #C9DA9A;
                }

                .availability-dropdown {
                    margin-top: 10px;
                }
                .event-separator {
                    border: 1px solid #C9DA9A;
                    margin-top: 20px;
                }
            `}</style>
        </div>
    );
};

export default SignUpForm;