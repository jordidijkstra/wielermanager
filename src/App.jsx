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
import Rankings from './components/Rankings';
import Settings from './components/Settings';
import YourPoints from './components/YourPoints';
import RaceCountdown from './components/RaceCountdown';
import Footer from './components/Footer';
import '@fortawesome/fontawesome-free/css/all.min.css';

const BUDGET = 200000000; // €200 miljoen

function App() {
  const { user, loading, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [rankingsResetTrigger, setRankingsResetTrigger] = useState(0);
  const { selectedRiders } = useUserTeam(user, BUDGET);

  // Reset Rankings when clicked in menu
  const handleRankingsClick = () => {
    setCurrentPage('rankings');
    setRankingsResetTrigger(prev => prev + 1);
  };

  // Reset to home when user logs out
  if (!user && currentPage !== 'home') {
    setCurrentPage('home');
  }

  // When user logs in while login modal is open, go to home page and close modal
  useEffect(() => {
    if (user && showLoginModal) {
      setShowLoginModal(false);
      setCurrentPage('home');
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
        return <TeamBuilder user={user} setCurrentPage={setCurrentPage}/>;
      case 'points':
        return user ? <YourPoints user={user} /> : <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />;
      case 'raceTeams':
        return <RaceTeamSelector user={user} selectedRiders={selectedRiders}/>;
      case 'pointsTables':
        return <PointsTables />;
      case 'rankings':
        return <Rankings user={user} resetTrigger={rankingsResetTrigger} />;
      case 'settings':
        return user ? <Settings user={user} /> : <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />;
      default:
        return <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />;
    }
  };

  return (
    <>
      <Nav setCurrentPage={setCurrentPage} handleRankingsClick={handleRankingsClick} setShowLoginModal={setShowLoginModal} />
      {user && <RaceCountdown user={user} />}
      {renderPage()}
      {showLoginModal && <Login onClose={() => setShowLoginModal(false)} />}
      <Footer />
    </>
  );
}

export default App;