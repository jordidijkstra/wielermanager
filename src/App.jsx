import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useUserTeam } from './hooks/useUserTeam';
import Nav from './components/Nav';
import Home from './components/Home';
import Admin from './components/Admin';
import Login from './components/Login';
import TeamBuilder from './components/TeamBuilder';
import RaceTeamSelector from './components/RaceTeamSelector';
import PointsTables from './components/PointsTables';
import YourPoints from './components/YourPoints';
import RaceCountdown from './components/RaceCountdown';
import Footer from './components/Footer';
import '@fortawesome/fontawesome-free/css/all.min.css';

const BUDGET = 200000000; // €200 miljoen

function App() {
  const { user, loading, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { selectedRiders } = useUserTeam(user, BUDGET);

  // Reset to home when user logs out
  if (!user && currentPage !== 'home') {
    setCurrentPage('home');
  }

  // When user logs in while login modal is open, go to team page and close modal
  useEffect(() => {
    if (user && showLoginModal) {
      setShowLoginModal(false);
      setCurrentPage('team');
    }
  }, [user, showLoginModal]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  const renderPage = () => {
    // Protected pages - only render if user is logged in
    const protectedPages = ['team', 'raceTeams', 'admin'];
    
    // If trying to access protected page without being logged in, show home
    if (protectedPages.includes(currentPage) && !user) {
      return <Home />;
    }

    switch (currentPage) {
      case 'home':
        return <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />;
      case 'admin':
        return isAdmin ? <Admin /> : <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />;
      case 'team':
        return <TeamBuilder user={user}/>;
      case 'points':
        return user ? <YourPoints user={user} /> : <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />;
      case 'raceTeams':
        return <RaceTeamSelector user={user} selectedRiders={selectedRiders}/>;
      case 'pointsTables':
        return <PointsTables />;
      case 'settings':
        return <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />; // Placeholder voor instellingen
      default:
        return <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />;
    }
  };

  return (
    <>
      <Nav setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />
      {user && <RaceCountdown user={user} />}
      {renderPage()}
      {showLoginModal && <Login onClose={() => setShowLoginModal(false)} />}
      <Footer />
    </>
  );
}

export default App;