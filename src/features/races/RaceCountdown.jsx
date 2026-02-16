import { useState, useEffect, memo, useRef, useMemo } from 'react';
import { useRaces } from '../../hooks/useRaces';
import '../../css/raceCountdown.css';

const RaceCountdown = memo(function RaceCountdown({ user }) {
  // Use a ref to track if races have been loaded at least once to prevent flash
  const racesLoadedRef = useRef(false);
  const { races } = useRaces(user);
  const [countdown, setCountdown] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (races && races.length > 0) {
      racesLoadedRef.current = true;
    }
  }, [races]);
  
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
      // Logic for grouping...
      if (!race.startDate) return;
      
      // Skip stages for deadline calculation
      const isStage = race.tourId !== null && race.tourId !== undefined;
      // We also want to skip if it's NOT a stage but has a tourId? Wait, the logic below says isStage if tourId is present.
      // But typically races have tourId null.
      if (isStage) return;
      
      // Use same date logic as YourPoints
      let dateKey;
      if (race.name?.includes('Algemeen klassement')) {
        dateKey = race.startDate;
      } else {
        // Fallback or specific logic
        dateKey = race.endDate || race.startDate;
      }

      // Convert to string key for grouping
      // dateKey might be a Timestamp or Date or string. Assuming it's convertible to Date or is a string.
      // Let's be safe and try to convert to YYYY-MM-DD or similar representative string?
      // Actually the original code just used it as object key. If it's an object (Date/Timestamp), it converts to string.
      // Firestore Timestamps convert to something unique-ish? Or `[object Object]`?
      // If `race.startDate` is a string '2024-02-28', it works.
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(race);
    });
    
    // Find the first speeldag with a future date
    const sortedDates = Object.keys(grouped).sort();
    let nearestDeadlineDate = null;
    let racesOnDeadlineDay = [];
    
    // Iterate keys to find first future date
    for (const dateStr of sortedDates) {
      const dateObj = new Date(dateStr);
      // Check if valid date
      if (isNaN(dateObj.getTime())) continue;

      // Set deadline at 9:00 AM on that day
      const deadlineCandidate = new Date(dateObj);
      deadlineCandidate.setHours(9, 0, 0, 0);

      // If deadline is in the future
      if (deadlineCandidate >= now) {
        nearestDeadlineDate = deadlineCandidate;
        racesOnDeadlineDay = grouped[dateStr];
        break;
      }
    }
    
    if (!nearestDeadlineDate) {
      return { nextRaces: [], nextDeadlineDate: null };
    }
    
    // Use toDateString() in logs to avoid object serialization noise
    // console.log('✅ RaceCountdown deadline:', nearestDeadlineDate.toDateString(), 'Races count:', racesOnDeadlineDay.length);
    return { nextRaces: racesOnDeadlineDay, nextDeadlineDate: nearestDeadlineDate };
  }, [races]);

  const deadlineTimestamp = calculatedDeadlineDate ? calculatedDeadlineDate.getTime() : null;

  // Update countdown timer using calculated values
  useEffect(() => {
    if (!deadlineTimestamp) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = deadlineTimestamp - now.getTime();

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

    // Run immediately once
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
  }, [deadlineTimestamp]); // Only re-run when deadline changes

  // Remove this check to prevent re-render loop if return null causes parent to do something
  // or if calculatedNextRaces is unstable
  if (!calculatedNextRaces || calculatedNextRaces.length === 0) {
    return null;
  }
  
  // Show component even if countdown is null (calculating...) or show nothing
  if (!countdown) {
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
