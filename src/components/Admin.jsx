import { useState } from 'react';
import RidersTab from './RidersTab';
import RacesTab from './RacesTab';
import ResultsTab from './ResultsTab';
import ParticipantsTab from './ParticipantsTab';
import PointsTab from './PointsTab';
import AdminToolsTab from './AdminToolsTab';
import '../css/admin.css';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('riders');

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>
      
      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'riders' ? 'active' : ''}`}
          onClick={() => setActiveTab('riders')}
        >
          👥 Renners
        </button>
        <button 
          className={`tab-button ${activeTab === 'races' ? 'active' : ''}`}
          onClick={() => setActiveTab('races')}
        >
          🏁 Races
        </button>
        <button 
          className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          🏆 Resultaten
        </button>
        <button 
          className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          📋 Startlijsten
        </button>
        <button 
          className={`tab-button ${activeTab === 'points' ? 'active' : ''}`}
          onClick={() => setActiveTab('points')}
        >
          ⭐ Punten
        </button>
        <button 
          className={`tab-button ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          🔧 Tools
        </button>
      </div>

      {/* Riders Tab */}
      {activeTab === 'riders' && <RidersTab />}

      {/* Races Tab */}
      {activeTab === 'races' && <RacesTab />}

      {/* Results Tab */}
      {activeTab === 'results' && <ResultsTab />}

      {/* Participants Tab */}
      {activeTab === 'participants' && <ParticipantsTab />}

      {/* Points Tab */}
      {activeTab === 'points' && <PointsTab />}

      {/* Tools Tab */}
      {activeTab === 'tools' && <AdminToolsTab />}
    </div>
  );
}
      
