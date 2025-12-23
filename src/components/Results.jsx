import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import '../css/results.css'

export default function Results() {
    const [races, setRaces] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRaces, setSelectedRaces] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedRace, setSelectedRace] = useState("");
    const [selectedResults, setSelectedResults] = useState([]);
    const [isMultiDay, setIsMultiDay] = useState(false);
    const [stages, setStages] = useState([]);
    const [currentRaceId, setCurrentRaceId] = useState(null);

    // Load data from Firestore
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load races
            const racesSnapshot = await getDocs(collection(db, 'races'));
            const racesData = racesSnapshot.docs.map(doc => ({
                id: doc.data().id,
                name: doc.data().name,
                startDate: doc.data().startDate,
                endDate: doc.data().endDate,
                categoryId: doc.data().categoryId,
                tourId: doc.data().tourId
            })).sort((a, b) => a.id - b.id); // Sort by ID
            setRaces(racesData);

            // Load results
            const resultsSnapshot = await getDocs(collection(db, 'results'));
            const resultsData = resultsSnapshot.docs.map(doc => ({
                raceId: doc.data().raceId,
                results: doc.data().results
            }));
            setResults(resultsData);

            setLoading(false);
        } catch (err) {
            console.error('Error loading data:', err);
            setLoading(false);
        }
    };

    const months = [
        {monthNumber: "01", monthName: "januari"}, 
        {monthNumber: "02", monthName: "februari"}, 
        {monthNumber: "03", monthName: "maart"}, 
        {monthNumber: "04", monthName: "april"}, 
        {monthNumber: "05", monthName: "mei"}, 
        {monthNumber: "06", monthName: "juni"}, 
        {monthNumber: "07", monthName: "juli"}, 
        {monthNumber: "08", monthName: "augustus"}, 
        {monthNumber: "09", monthName: "september"}, 
        {monthNumber: "10", monthName: "oktober"}, 
        {monthNumber: "11", monthName: "november"}, 
        {monthNumber: "12", monthName: "december"}
    ];
    
    function showRaces(monthNumber) {
        setSelectedMonth(months.find(m => m.monthNumber === monthNumber).monthName);
        setSelectedRace("");
        setSelectedResults([]);
        setIsMultiDay(false);
        const filteredRaces = races.filter((race) => {
            const month = race.startDate.split('-')[1];
            return month === monthNumber;
        });
        setSelectedRaces(filteredRaces);
    }

    function showResults(raceId) {
        const raceIdNum = parseInt(raceId);
        const race = races.find((race) => race.id === raceIdNum);
        setCurrentRaceId(raceIdNum);
        
        // Check if multi-day race
        const isMultiDayRace = race.startDate !== race.endDate;
        setIsMultiDay(isMultiDayRace);
        
        if (isMultiDayRace) {
            // Set title to GC for multi-day races
            setSelectedRace(race.name + " - Algemeen Klassement");
            // Get all stages for this tour
            const raceStages = races.filter((r) => r.tourId === raceIdNum);
            setStages(raceStages);
            // Show GC by default
            const raceResults = results.filter((result) => result.raceId === raceIdNum);
            setSelectedResults(raceResults);
        } else {
            setSelectedRace(race.name);
            const raceResults = results.filter((result) => result.raceId === raceIdNum);
            setSelectedResults(raceResults);
        }
    }

    function showStageResults(raceId) {
        const raceIdNum = parseInt(raceId);
        const raceResults = results.filter((result) => result.raceId === raceIdNum);
        setSelectedResults(raceResults);
        
        // Update selected race name if it's a stage
        if (raceIdNum !== currentRaceId) {
            const stage = races.find((race) => race.id === raceIdNum);
            if (stage) {
                setSelectedRace(stage.name);
            }
        } else {
            // It's the GC
            const race = races.find((race) => race.id === currentRaceId);
            if (race) {
                setSelectedRace(race.name + " - Algemeen Klassement");
            }
        }
    }

    return(
        <>
            {loading ? (
                <div className="loading">Gegevens laden...</div>
            ) : (
                <main className="container-results">
                <div className="container-select">
                    
                    <div className="container-months">
                        <label htmlFor="month-select">Kies een maand:</label>
                        <select id="month-select" onChange={(e) => showRaces(e.target.value)} defaultValue="">
                            <option value="" disabled>- maand -</option>
                            {months.map((month) => (
                                <option key={month.monthNumber} value={month.monthNumber}>
                                    {month.monthName}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="container-races">
                        <label htmlFor="race-select">Kies een race:</label>
                        <select id="race-select" onChange={(e) => showResults(e.target.value)} defaultValue="">
                            <option value="" disabled>- race -</option>
                            {selectedMonth && selectedRaces.map((race) => {
                                const isMultiDayRace = race.startDate !== race.endDate;
                                if (!race.tourId || race.tourId === null) {
                                    return (
                                        <option key={race.id} value={race.id}>
                                            {race.name} {isMultiDayRace ? '(Meerdaags)' : ''}
                                        </option>
                                    );
                                }
                                return null;
                            })}
                        </select>
                    </div>

                    {isMultiDay && (
                        <div className="container-stages">
                            <label htmlFor="stage-select">Kies een etappe:</label>
                            <select id="stage-select" onChange={(e) => showStageResults(e.target.value)} defaultValue={currentRaceId}>
                                <option value={currentRaceId}>Algemeen Klassement (GC)</option>
                                {stages.map((stage) => (
                                    <option key={stage.id} value={stage.id}>
                                        {stage.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                </div>
                <div className="container-race-results">
                    {selectedResults.map((result) => (
                        <div key={result.raceId}>
                            <h3>Uitslag {selectedRace}</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Position</th>
                                        <th>Rider ID</th>
                                        <th>Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.results.map((res, index) => (
                                        <tr key={index}>
                                            <td>{res.position}</td>
                                            <td>{res.riderId !== null ? res.riderId : 'N/A'}</td>
                                            <td>{res.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </main>
            )}
        </>
    );
}