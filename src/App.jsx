import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useUserTeam } from './hooks/useUserTeam';
import { useUserBudget } from './hooks/useUserBudget';
import Nav from './components/Nav';
import Home from './components/Home';
import Admin from './components/AdminTabs/Admin';
import Login from './components/Login/Login';
import TeamBuilder from './components/Team/TeamBuilder';
import RaceTeamSelector from './components/Team/RaceTeamSelector';
import PointsTables from './components/Standings/PointsTables';
import Rankings from './components/Standings/Rankings';
import Settings from './components/Settings';
import YourPoints from './components/Standings/YourPoints';
import RaceCountdown from './components/Races/RaceCountdown';
import RiderStatistics from './components/Riders/RiderStatistics';
import Rules from './components/Rules';
import Footer from './components/Footer';
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const { user, loading, isAdmin } = useAuth();
  const { budget } = useUserBudget(user);
  
  // Initialize from URL hash to persist page on refresh
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'home';
  });
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [rankingsResetTrigger, setRankingsResetTrigger] = useState(0);
  const { selectedRiders } = useUserTeam(user, budget);

  // Sync state to URL hash
  useEffect(() => {
    window.location.hash = currentPage;
  }, [currentPage]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== currentPage) {
        setCurrentPage(hash);
      } else if (!hash) {
        setCurrentPage('home');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [currentPage]);

  // Reset Rankings when clicked in menu
  const handleRankingsClick = () => {
    setCurrentPage('rankings');
    setRankingsResetTrigger(prev => prev + 1);
  };

  // Reset to home when user logs out (only for protected pages)
  const protectedPages = ['team', 'raceTeams', 'admin', 'settings', 'points'];
  if (!loading && !user && protectedPages.includes(currentPage)) {
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
      case 'riderStatistics':
        return <RiderStatistics />;
      case 'settings':
        return user ? <Settings user={user} /> : <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />;
      case 'rules':
        return <Rules />;
      default:
        return <Home user={user} setCurrentPage={setCurrentPage} setShowLoginModal={setShowLoginModal} />;
    }
  };

  return (
    <>
      <Nav setCurrentPage={setCurrentPage} handleRankingsClick={handleRankingsClick} setShowLoginModal={setShowLoginModal} currentPage={currentPage} />
      {user && <RaceCountdown user={user} />}
      {renderPage()}
      {showLoginModal && <Login onClose={() => setShowLoginModal(false)} />}
      <Footer />
    </>
  );
}

export default App;