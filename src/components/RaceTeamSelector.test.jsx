import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RaceTeamSelector from './RaceTeamSelector';

vi.mock('../hooks/useRaces', () => ({
  useRaces: vi.fn(() => ({
    races: [
      {
        id: 1,
        name: 'Tour de France',
        startDate: '2024-07-01',
        endDate: '2024-07-23',
        minRiders: 5,
        maxRiders: 7,
        tourId: null,
        overlappingRaces: []
      },
      {
        id: 2,
        name: 'Giro d\'Italia',
        startDate: '2024-05-01',
        endDate: '2024-05-26',
        minRiders: 5,
        maxRiders: 7,
        tourId: null,
        overlappingRaces: []
      }
    ],
    loading: false,
    userRaceTeams: [],
    saveTeamForRace: vi.fn(),
    saveStatus: ''
  }))
}));

vi.mock('../services/raceService', () => ({
  getAutoSelectedRiders: vi.fn(() => [1, 2, 3, 4, 5, 6, 7]),
  getAutoSelectedForAllRaces: vi.fn(() => ({})),
  getAvailableRidersCount: vi.fn(() => 10),
  getRaceParticipants: vi.fn(async (raceId) => {
    if (raceId === 1) {
      return [
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
        { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }
      ];
    }
    return null;
  }),
  filterRidersByParticipants: vi.fn((riders) => riders)
}));

vi.mock('../css/raceTeamSelector.css', () => ({}));

const mockUser = { uid: '123', email: 'test@test.com' };

const mockSelectedRiders = [
  { id: '1', firstname: 'John', lastname: 'Doe', price: 8000000 },
  { id: '2', firstname: 'Jane', lastname: 'Smith', price: 7500000 },
  { id: '3', firstname: 'Bob', lastname: 'Johnson', price: 7000000 },
  { id: '4', firstname: 'Alice', lastname: 'Williams', price: 6500000 },
  { id: '5', firstname: 'Charlie', lastname: 'Brown', price: 6000000 },
  { id: '6', firstname: 'David', lastname: 'Davis', price: 5500000 },
  { id: '7', firstname: 'Eve', lastname: 'Miller', price: 5000000 },
  { id: '8', firstname: 'Frank', lastname: 'Wilson', price: 4500000 },
  { id: '9', firstname: 'Grace', lastname: 'Moore', price: 4000000 },
  { id: '10', firstname: 'Henry', lastname: 'Taylor', price: 3500000 }
];

describe('RaceTeamSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('toont een race selector dropdown', () => {
    render(<RaceTeamSelector user={mockUser} selectedRiders={mockSelectedRiders} />);
    
    expect(screen.getByText('Kies een race:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('- Race -')).toBeInTheDocument();
  });

  it('toont alle beschikbare races in dropdown', () => {
    render(<RaceTeamSelector user={mockUser} selectedRiders={mockSelectedRiders} />);
    
    const options = screen.getAllByRole('option');
    const optionTexts = options.map(opt => opt.textContent);
    
    expect(optionTexts.some(text => text.includes('Tour de France'))).toBe(true);
    expect(optionTexts.some(text => text.includes('Giro d\'Italia'))).toBe(true);
  });

  it('toont batch action buttons', () => {
    render(<RaceTeamSelector user={mockUser} selectedRiders={mockSelectedRiders} />);
    
    expect(screen.getByText('Alle Races Auto-Invullen')).toBeInTheDocument();
    expect(screen.getByText('Alle Selecties Opslaan')).toBeInTheDocument();
  });

  it('toont race details na selectie', async () => {
    render(<RaceTeamSelector user={mockUser} selectedRiders={mockSelectedRiders} />);
    
    const select = screen.getByDisplayValue('- Race -');
    fireEvent.change(select, { target: { value: '1' } });
    
    await waitFor(() => {
      expect(screen.getByText('Tour de France')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('verbergt renners wanneer deelnemerslijst null is', async () => {
    render(<RaceTeamSelector user={mockUser} selectedRiders={mockSelectedRiders} />);
    
    const select = screen.getByDisplayValue('- Race -');
    fireEvent.change(select, { target: { value: '2' } });
    
    await waitFor(() => {
      expect(screen.getByText('Nog geen deelnemerslijst beschikbaar voor deze race')).toBeInTheDocument();
      expect(screen.queryByText('Je Team Renners')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('toont min/max renners requirement', async () => {
    render(<RaceTeamSelector user={mockUser} selectedRiders={mockSelectedRiders} />);
    
    const select = screen.getByDisplayValue('- Race -');
    fireEvent.change(select, { target: { value: '1' } });
    
    await waitFor(() => {
      expect(screen.getByText('Selecteer 5 - 7 renners')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
