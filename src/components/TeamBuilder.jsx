import { useState, useEffect } from 'react';
import { useRiders } from '../hooks/useRiders';
import { useUserTeam } from '../hooks/useUserTeam';
import { useCyclingTeams } from '../hooks/useCyclingTeams';
import { getTeamJerseyPath } from '../services/cyclingTeamService';

import '../css/TeamBuilder.css';

function TeamBuilder({ user }) {
  const [budget] = useState(200000000);

  const { riders, loading } = useRiders();
  const { selectedRiders, addRider, removeRider, saveTeam, saveStatus, getTotalSpent } = useUserTeam(user, budget);
  const { teams, loadingTeams } = useCyclingTeams();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [maxPrice, setMaxPrice] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const ridersPerPage = 13;

  const getRemainingBudget = () => budget - getTotalSpent();
  const formatPrice = (price) => '€' + (price / 1000000).toFixed(1) + 'M';
  const getFullName = (rider) => `${rider.firstname} ${rider.lastname}`;

  const filteredRiders = riders
  .filter(r => {
    const fullName = getFullName(r).toLowerCase();
    const search = searchTerm.toLowerCase();
    const priceOk = !maxPrice || r.price <= parseInt(maxPrice) * 1000000;
    const teamOk = !teamFilter || String(r.teamId) === String(teamFilter);
    return fullName.includes(search) && priceOk && teamOk;
  })
  .sort((a, b) => b.price - a.price);

  // Pagination
  const indexOfLastRider = currentPage * ridersPerPage;
  const indexOfFirstRider = indexOfLastRider - ridersPerPage;
  const currentRiders = filteredRiders.slice(indexOfFirstRider, indexOfLastRider);
  const totalPages = Math.ceil(filteredRiders.length / ridersPerPage);

  useEffect(() => setCurrentPage(1), [searchTerm]);

  const goToPage = (pageNumber) => setCurrentPage(pageNumber);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const goToPrevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage <= 4) {
        for (let i = 2; i <= 5; i++) pages.push(i);
        pages.push('...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (loading) {
    return <div className="team-builder loading">Riders laden...</div>;
  }

  return (
    <div className="team-builder">
      <div className="team-header">
        <h1>Stel je Team Samen</h1>
        <div className="budget-info">
          <div className="budget-stat">
            <span className="label">Budget:</span>
            <span className="value">{formatPrice(budget)}</span>
          </div>
          <div className="budget-stat">
            <span className="label">Uitgegeven:</span>
            <span className="value spent">{formatPrice(getTotalSpent())}</span>
          </div>
          <div className="budget-stat">
            <span className="label">Resterend:</span>
            <span className={`value ${getRemainingBudget() < 0 ? 'over-budget' : ''}`}>
              {formatPrice(getRemainingBudget())}
            </span>
          </div>
          <div className="budget-stat">
            <span className="label">Renners:</span>
            <span className="value">{selectedRiders.length}/30</span>
          </div>
        </div>
      </div>

      <div className="team-content">
        <div className="selected-team">
          <div className="section-header">
            <h2>Jouw Team</h2>
            {selectedRiders.length > 0 && (
              <button className="btn-save" onClick={saveTeam}>
                Opslaan <i className="fas fa-save"></i>
              </button>
            )}
          </div>
          {saveStatus && <div className="save-status">{saveStatus}</div>}
          
          {selectedRiders.length === 0 ? (
            <div className="empty-team">
              <p>Je hebt nog geen renners geselecteerd.</p>
              <p>Kies maximaal 30 renners uit de lijst hiernaast.</p>
            </div>
          ) : (
            <div className="selected-riders-list">
              {selectedRiders.map(rider => (
                <div key={rider.id} className="selected-rider">
                  <img 
                    src={getTeamJerseyPath(rider.teamId)}
                    alt="jersey" 
                    className="selected-rider-jersey"
                    onError={(e) => e.target.src = 'src/assets/default.webp'}
                  />
                  <div className="selected-rider-info">
                    <div className="selected-rider-name">{getFullName(rider)}</div>
                  </div>
                  <div className="selected-rider-actions">
                    <span className="selected-rider-price">{formatPrice(rider.price)}</span>
                    <button 
                      className="btn-remove"
                      onClick={() => removeRider(rider.id)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ))}
              {Array.from({ length: 30 - selectedRiders.length }).map((_, idx) => (
                <div key={`placeholder-${idx}`} className="selected-rider placeholder"></div>
              ))}
            </div>
          )}
        </div>

        <div className="available-riders">
          <div className="section-header">
            <h2>Beschikbare Renners ({filteredRiders.length})</h2>
            {user.email === 'dijkstrajordi@gmail.com' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-download">
                  Download CSV
                </button>
                <label htmlFor="csv-upload" className="btn-download" style={{ cursor: 'pointer' }}>
                  Upload CSV
                  <input 
                    id="csv-upload"
                    type="file" 
                    accept=".csv"
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}
          </div>
          
          <div className="filters">
            <input 
              type="text" 
              placeholder="Zoek renner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="filter-selects">
              <select
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="filter-select max-price-select"
              >
                <option value="">Max</option>
                <option value="60">60 miljoen</option>
                <option value="50">50 miljoen</option>
                <option value="40">40 miljoen</option>
                <option value="30">30 miljoen</option>
                <option value="20">20 miljoen</option>
                <option value="10">10 miljoen</option>
                <option value="5">5 miljoen</option>
                <option value="1">1 miljoen</option>
              </select>

              <select
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                className="filter-select team-select"
              >
                <option value="">Alle teams</option>
                {teams.map((team, index) => (
                  <option key={index} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="riders-list">
            {currentRiders.length === 0 ? (
              <div className="no-riders">Geen renners gevonden</div>
            ) : (
              currentRiders.map(rider => (
                <div key={rider.id} className="rider-card">
                  <img 
                    src={getTeamJerseyPath(rider.teamId)}
                    alt="jersey" 
                    className="rider-jersey"
                    onError={(e) => e.target.src = 'src/assets/default.webp'}
                  />
                  <div className="rider-info">
                    <div className="rider-name">{getFullName(rider)}</div>
                  </div>
                  <div className="rider-actions">
                    <span className="rider-price">{formatPrice(rider.price)}</span>
                    {selectedRiders.find(r => r.id === rider.id) ? (
                      <span style={{ display: 'inline-block', width: '32px', height: '32px' }}></span>
                    ) : getRemainingBudget() >= rider.price ? (
                      <button
                        className="btn-add"
                        onClick={() => addRider(rider)}
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    ) : (
                      <span style={{ display: 'inline-block', width: '32px', height: '32px' }}></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {filteredRiders.length > ridersPerPage && (
            <div className="pagination">
              <button 
                className="pagination-btn"
                onClick={goToPrevPage}
                disabled={currentPage === 1}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <div className="pagination-pages">
                {getPaginationPages().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button 
                className="pagination-btn"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamBuilder;
