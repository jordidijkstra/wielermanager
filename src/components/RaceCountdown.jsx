import { useState, useEffect, memo, useRef, useMemo } from 'react';
import { useRaces } from '../hooks/useRaces';
import '../css/raceCountdown.css';

const RaceCountdown = memo(function RaceCountdown({ user }) {
  const { races } = useRaces(user);
  const [nextRaces, setNextRaces] = useState([]);
  const [nextDeadlineDate, setNextDeadlineDate] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const intervalRef = useRef(null);

  // Only attempt to load races if user is logged in
  if (!user) {
    return null;
  }

  // Calculate next races - only keep races for the nearest deadline day
  const { nextRaces: calculatedNextRaces, nextDeadlineDate: calculatedDeadlineDate } = useMemo(() => {
    if (!races || races.length === 0) {
      return { nextRaces: [], nextDeadlineDate: null };
    }

    const now = new Date();
    
    // Group races by speeldag (game day), using same logic as YourPoints
    const grouped = {};
    races.forEach(race => {
      if (!race.startDate) return;
      
      // Skip stages for deadline calculation
      const isStage = race.tourId !== null && race.tourId !== undefined;
      if (isStage) return;
      
      // Use same date logic as YourPoints
      let date;
      if (race.name?.includes('Algemeen klassement')) {
        date = race.startDate;
      } else {
        date = race.endDate || race.startDate;
      }
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(race);
    });
    
    // Find the first speeldag with a future date
    const sortedDates = Object.keys(grouped).sort();
    let nearestDeadlineDate = null;
    let racesOnDeadlineDay = [];
    
    for (const dateStr of sortedDates) {
      const dateObj = new Date(dateStr);
      if (dateObj >= now) {
        nearestDeadlineDate = new Date(dateObj);
        nearestDeadlineDate.setHours(9, 0, 0, 0);
        racesOnDeadlineDay = grouped[dateStr];
        break;
      }
    }
    
    if (!nearestDeadlineDate) {
      return { nextRaces: [], nextDeadlineDate: null };
    }
    
    console.log('✅ RaceCountdown deadline:', nearestDeadlineDate.toDateString(), 'Races:', racesOnDeadlineDay.map(r => r.name));
    return { nextRaces: racesOnDeadlineDay, nextDeadlineDate: nearestDeadlineDate };
  }, [races]);

  // Update countdown timer using calculated values
  useEffect(() => {
    if (!calculatedDeadlineDate) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = calculatedDeadlineDate - now;

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    
    // Cleanup old interval if exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [calculatedDeadlineDate]);

  if (!calculatedNextRaces || calculatedNextRaces.length === 0 || !countdown) {
    return null;
  }

  return (
    <div className="race-countdown-container">
      <div className="countdown-card">
        <h2>⏱️ Deadline</h2>
        
        <span className="race-start-time" style={{ marginRight: '10px' }}>
          {calculatedDeadlineDate.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })} om {calculatedDeadlineDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
        </span>
        
        <div className="races-deadline-list">
          {calculatedNextRaces.map((race, index) => (
            <div key={race.id} className="race-deadline-item">
              {index > 0 && <span className="race-separator">•</span>}
              <span className="race-name">{race.name}</span>
            </div>
          ))}
        </div>
        
        <div className="countdown-timer">
          <div className="countdown-item">
            <span className="countdown-value">{String(countdown.days).padStart(2, '0')}</span>
            <span className="countdown-label">dagen</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-item">
            <span className="countdown-value">{String(countdown.hours).padStart(2, '0')}</span>
            <span className="countdown-label">uren</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-item">
            <span className="countdown-value">{String(countdown.minutes).padStart(2, '0')}</span>
            <span className="countdown-label">minuten</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-item">
            <span className="countdown-value">{String(countdown.seconds).padStart(2, '0')}</span>
            <span className="countdown-label">seconden</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RaceCountdown;
