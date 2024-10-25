useEffect(() => {
    fetchChauffeurs();
    fetchEvents();
}, []);

useEffect(() => {
    if (selectedChauffeur) {
        fetchAvailabilityByChauffeur(selectedChauffeur); // Fetch data for the newly selected chauffeur
    }
}, [selectedChauffeur]);

// Fetch the list of chauffeurs
const fetchChauffeurs = async () => {
    try {
        const response = await axios.get('/api/airtable/chauffeurs');
        setChauffeurs(response.data.map((record: { id: string; fields: { Name: string } }) => ({
            id: record.id,
            name: record.fields['Name'],
        })));
    } catch (error) {
        console.error('Error fetching chauffeurs:', error);
        setErrorMessage('Failed to fetch chauffeurs');
    }
};

// Fetch the list of events
const fetchEvents = async () => {
    try {
        const response = await axios.get('/api/airtable/events');
        setEvents(response.data.map((record: { id: string; fields: { 'Event name': string; 'Starts at': string; 'Stops at': string; 'Location City': string; 'Travel Time': string } }) => ({
            id: record.id,
            name: record.fields['Event name'],
            start: record.fields['Starts at'],
            stop: record.fields['Stops at'],
            city: record.fields['Location City'],
            travelTime: record.fields['Travel Time'],
        })));
    } catch (error) {
        console.error('Error fetching events:', error);
        setErrorMessage('Failed to fetch events');
    }
};

// Fetch availability for a specific chauffeur and overwrite availability data
const fetchAvailabilityByChauffeur = async (chauffeurId: string) => {
    try {
        const response = await axios.get(`/api/airtable/availability?chauffeurId=${chauffeurId}`);
        const availabilityData = response.data.map((record: { id: string; fields: { Event: string[]; Chauffeurs: string[]; Availability: string } }) => ({
            id: record.id,
            eventId: record.fields['Event'][0],
            chauffeurId: record.fields['Chauffeurs'][0],
            status: record.fields['Availability'],
        }));
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



return (
    <div className="sign-up-form">
        <h1 className="title">Sign up for Poem Booth rides</h1>
        {errorMessage && <p className="error">{errorMessage}</p>}

        <label htmlFor="chauffeur-select" className="chauffeur-label">Chauffeur Name:</label>
        <select
            id="chauffeur-select"
            className="chauffeur-dropdown"
            value={selectedChauffeur}
            onChange={(e) => setSelectedChauffeur(e.target.value)}
        >
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
                    const availabilityForEvent = filteredAvailability.find(avail => avail.eventId === event.id);
                    return (
                        <div key={event.id} className="event-item">
                            <h3 className="event-name">{event.name}</h3>
                            <p className="event-details">Starts at: {format(new Date(event.start), "HH:mm 'on' EEEE, do 'of' MMMM")}</p>
                            <p className="event-details">Stops at: {format(new Date(event.stop), "HH:mm 'on' EEEE, do 'of' MMMM")}</p>
                            <p className="event-details">City: {event.city}</p>
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