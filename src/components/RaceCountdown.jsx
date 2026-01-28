import { useState, useEffect, memo, useRef, useMemo } from 'react';
import { useRaces } from '../hooks/useRaces';
import '../css/raceCountdown.css';

// Module-level cache that persists across component remounts
let moduleCache = {
  nearestDeadlineDate: null,
  nearestDeadlineRaces: null,
  cachedRacesLength: null,
  cacheDate: null
};

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
    const racesLength = races?.length || 0;
    const today = new Date().toDateString();
    
    // Check if we have a valid cache from the same day with same races count
    if (
      moduleCache.nearestDeadlineDate && 
      moduleCache.cacheDate === today && 
      moduleCache.cachedRacesLength === racesLength &&
      racesLength > 0
    ) {
      return {
        nextRaces: moduleCache.nearestDeadlineRaces,
        nextDeadlineDate: moduleCache.nearestDeadlineDate
      };
    }

    if (!races || races.length === 0) {
      return { nextRaces: [], nextDeadlineDate: null };
    }

    const now = new Date();
    
    // Find the nearest race day (only look for next upcoming race date)
    // Races are already sorted chronologically from useRaces()
    let nearestDeadlineDate = null;
    
    for (const race of races) {
      if (!race.startDate) continue;
      if (race.status === 'raced') continue;
      if (race.tourId !== null && race.tourId !== undefined) continue; // Skip stages - no selections for stages
      
      const startDate = new Date(race.startDate);
      if (startDate <= now) continue;
      
      // Found a future race - this day becomes our deadline
      nearestDeadlineDate = new Date(startDate);
      nearestDeadlineDate.setHours(9, 0, 0, 0);
      break; // Stop at first future race
    }

    if (!nearestDeadlineDate) {
      return { nextRaces: [], nextDeadlineDate: null };
    }

    // Get only races on this nearest deadline day
    const racesOnNearestDay = races.filter(race => {
      if (!race.startDate) return false;
      if (race.status === 'raced') return false;
      if (race.tourId !== null && race.tourId !== undefined) return false; // Skip stages
      
      const raceDate = new Date(race.startDate);
      raceDate.setHours(0, 0, 0, 0);
      
      const deadlineCheck = new Date(nearestDeadlineDate);
      deadlineCheck.setHours(0, 0, 0, 0);
      
      return raceDate.getTime() === deadlineCheck.getTime();
    });
    
    console.log('🔍 RaceCountdown: Found', racesOnNearestDay.length, 'races on', nearestDeadlineDate.toDateString(), ':', racesOnNearestDay.map(r => r.name));
    
    // Cache the result at module level
    moduleCache.nearestDeadlineDate = nearestDeadlineDate;
    moduleCache.nearestDeadlineRaces = racesOnNearestDay;
    moduleCache.cachedRacesLength = racesLength;
    moduleCache.cacheDate = today;
    
    return { nextRaces: racesOnNearestDay, nextDeadlineDate: nearestDeadlineDate };
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
