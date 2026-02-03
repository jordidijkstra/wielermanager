import React, { useState, useEffect } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getTeamJerseyPath } from '../services/cyclingTeamService';
import { formatPrice, getFullName } from '../utils/formatters';
import RiderTable from './RiderTable';
import '../css/riderStatistics.css';


const riderColumns = [
  { label: '#', className: 'rank-column', cellClassName: 'rank-column', render: (_, i) => i + 1 },
  { label: 'Renner', className: 'name-column', cellClassName: 'name-column', key: 'fullName' },
  { label: 'Kostprijs', className: 'price-column', cellClassName: 'price-column', render: (rider) => `€${(rider.price || 0).toLocaleString('nl-NL')}` },
  { label: 'Punten', className: 'points-column', cellClassName: 'points-column', key: 'points' }
];

export default function RiderStatistics() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('points'); // 'points' or 'name'
  const [filterMinPoints, setFilterMinPoints] = useState(0);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'mvp', 'bestteam'

  useEffect(() => {
    loadRiderStatistics();
  }, []);

  const loadRiderStatistics = async () => {
    try {
      setLoading(true);
      const ridersSnapshot = await getDocs(collection(db, 'riders'));
      const ridersData = ridersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(rider => rider.id !== '911' && rider.id !== 911) // Exclude dummy rider
        .map(rider => ({
          ...rider,
          points: rider.points || 0,
          fullName: rider.fullName || `${rider.firstname || ''} ${rider.lastname || ''}`.trim()
        }));

      setRiders(ridersData);
    } catch (error) {
      console.error('Error loading rider statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedAndFilteredRiders = () => {
    return riders
      .filter(rider => rider.points >= filterMinPoints)
      .sort((a, b) => {
        if (sortBy === 'points') {
          return b.points - a.points;
        } else {
          return a.fullName.localeCompare(b.fullName);
        }
      });
  };

  // Bereken waarde-opbrengst ratio: prijs / 10000 versus behaalde punten
  const getValueClass = (rider) => {
    if (!rider.price || !rider.points) return '';
    const priceValue = rider.price / 10000;
    
    if (priceValue > rider.points) {
      return 'rider-overpriced'; // Rood: duur voor wat hij behaalde
    } else if (priceValue <= rider.points) {
      return 'rider-good-value'; // Groen: gelijk of goed voor zijn prijs
    }
    return '';
  };

  // MVP renners: alleen groen (prijs/10000 <= punten)
  const getMVPRiders = () => {
    return riders
      .filter(rider => {
        if (!rider.price || !rider.points) return false;
        const priceValue = rider.price / 10000;
        return priceValue <= rider.points;
      })
      .sort((a, b) => b.points - a.points);
  };

  // Beste mogelijke team: 14-30 renners met budget van 300 miljoen
  const getBestTeam = () => {
    const BUDGET = 300000000; // 300 miljoen
    const MIN_RIDERS = 14;
    const MAX_RIDERS = 30;

    // Filter riders met prijs en punten, sorteer op punten (aflopend)
    const availableRiders = riders
      .filter(rider => rider.price && rider.points)
      .sort((a, b) => b.points - a.points); // Meeste punten eerst

    // Greedy selectie: voeg renners toe naar aantal punten, zolang we onder budget blijven
    let team = [];
    let totalBudget = 0;

    for (const rider of availableRiders) {
      const riderCost = rider.price || 0;
      
      // Voeg toe als we nog onder budget blijven EN we hebben nog plek
      if (totalBudget + riderCost <= BUDGET && team.length < MAX_RIDERS) {
        team.push(rider);
        totalBudget += riderCost;
      }
    }

    // Als we minder dan 14 renners hebben, voeg toe totdat we minimaal 14 hebben
    if (team.length < MIN_RIDERS) {
      for (const rider of availableRiders) {
        if (!team.find(t => t.id === rider.id) && team.length < MAX_RIDERS) {
          team.push(rider);
        }
        if (team.length >= MIN_RIDERS) break;
      }
    }

    // Sorteer team op punten (aflopend)
    return team.sort((a, b) => b.points - a.points);
  };

  const sortedRiders = getSortedAndFilteredRiders();

  if (loading) {
    return <div className="rider-statistics-container"><p>Laden...</p></div>;
  }

  return (
    <div className="rider-statistics-container">
      <h1>Renner Statistieken</h1>

      {/* Tabs */}
      <div className="statistics-tabs">
        <button 
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Alle Renners
        </button>
        <button 
          className={`tab-button ${activeTab === 'mvp' ? 'active' : ''}`}
          onClick={() => setActiveTab('mvp')}
        >
          MVP's
        </button>
        <button 
          className={`tab-button ${activeTab === 'bestteam' ? 'active' : ''}`}
          onClick={() => setActiveTab('bestteam')}
        >
          Beste Team
        </button>
      </div>

      {/* Controls (alleen voor 'all' tab) */}
      {activeTab === 'all' && (
        <div className="statistics-controls">
          <div className="sort-control">
            <label>Sorteer op:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="points">Punten (Aflopend)</option>
              <option value="name">Naam (A-Z)</option>
            </select>
          </div>

          <div className="filter-control">
            <label>Minimaal punten:</label>
            <input
              type="number"
              min="0"
              value={filterMinPoints}
              onChange={(e) => setFilterMinPoints(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'all' && (
        <RiderTable
          columns={riderColumns}
          data={sortedRiders}
          rowClassName={(rider) => `${getValueClass(rider)} ${rider.points > 0 ? 'rider-with-points' : 'rider-no-points'}`}
        />
      )}

      {/* MVP Tab */}
      {activeTab === 'mvp' && (
        <div className="riders-table-container">
          <h2>MVP Renners (Beste waarde)</h2>
          <RiderTable
            columns={riderColumns}
            data={getMVPRiders()}
            rowClassName={() => "rider-good-value rider-with-points"}
          />
        </div>
      )}

      {/* Best Team Tab */}
      {activeTab === 'bestteam' && (
        <div className="riders-table-container">
          <h2>Beste Mogelijke Team (14-30 renners, Budget: €300M)</h2>
          {getBestTeam().length > 0 ? (
            <>
              <div className="best-team-display">
                {getBestTeam().map(rider => (
                  <div key={rider.id} className="best-team-rider">
                    <img 
                      src={getTeamJerseyPath(rider.teamId)}
                      alt="jersey" 
                      className="best-team-rider-jersey"
                      onError={(e) => e.target.src = '/assets/default.webp'}
                    />
                    <div className="best-team-rider-info">
                      <div className="best-team-rider-name">{getFullName(rider)}</div>
                      <div className="best-team-rider-stats">
                        <span className="best-team-rider-price">{formatPrice(rider.price)}</span>
                        <span className="best-team-rider-points">{rider.points} pts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="best-team-summary">
                <div className="summary-stat">
                  <span className="summary-label">Renners:</span>
                  <span className="summary-value">{getBestTeam().length}</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Totale prijs:</span>
                  <span className="summary-value">€{getBestTeam().reduce((sum, rider) => sum + (rider.price || 0), 0).toLocaleString('nl-NL')}</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Totale punten:</span>
                  <span className="summary-value">{getBestTeam().reduce((sum, rider) => sum + (rider.points || 0), 0)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data">Geen renners beschikbaar voor team</div>
          )}
        </div>
      )}
    </div>
  );
}
