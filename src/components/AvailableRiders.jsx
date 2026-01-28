import { useState } from 'react';
import RiderCard from './RiderCard';
import Pagination from './Pagination';

export default function AvailableRiders({ 
  riders, 
  teams, 
  selectedRiders, 
  remainingBudget,
  onAddRider,
  deadlinePassed
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [maxPrice, setMaxPrice] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const ridersPerPage = 13;

  const getFullName = (rider) => `${rider.firstname} ${rider.lastname}`;

  const filteredRiders = riders
    .filter(r => {
      const riderId = parseInt(r.id);
      if (riderId === 911) return false; // Exclude dummy rider 911
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

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const goToPage = (pageNumber) => setCurrentPage(pageNumber);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const goToPrevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  return (
    <div className="available-riders">
      <div className="section-header">
        <h2>Beschikbare Renners ({filteredRiders.length})</h2>
      </div>
      
      <div className="filters">
        <input 
          type="text" 
          placeholder="Zoek renner..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
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

      <div className="riders-list-teambuilder">
        {currentRiders.length === 0 ? (
          <div className="no-riders">Geen renners gevonden</div>
        ) : (
          currentRiders.map(rider => (
            <RiderCard
              key={rider.id}
              rider={rider}
              selectedRiders={selectedRiders}
              remainingBudget={remainingBudget}
              onAdd={onAddRider}
              isDisabled={deadlinePassed}
            />
          ))
        )}
      </div>

      {filteredRiders.length > ridersPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onGoToPage={goToPage}
          onPrevPage={goToPrevPage}
          onNextPage={goToNextPage}
        />
      )}
    </div>
  );
}
