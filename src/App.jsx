import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useUserTeam } from './hooks/useUserTeam';
import Nav from './components/Nav';
import Home from './components/Home';
import Admin from './components/Admin';
import Results from './components/Results';
import Login from './components/Login';
import TeamBuilder from './components/TeamBuilder';
import RaceTeamSelector from './components/RaceTeamSelector';
import Footer from './components/Footer';
import '@fortawesome/fontawesome-free/css/all.min.css';

const BUDGET = 200000000; // €200 miljoen
const ADMIN_EMAIL = 'dijkstrajordi@gmail.com';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const { selectedRiders } = useUserTeam(user, BUDGET);
  const isAdmin = user && user.email === ADMIN_EMAIL;

  // Reset to home when user logs out
  if (!user && currentPage !== 'home') {
    setCurrentPage('home');
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Login />;
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
        return <Home />;
      case 'admin':
        return isAdmin ? <Admin /> : <Home />;
      case 'team':
        return <TeamBuilder user={user}/>;
      case 'raceTeams':
        return <RaceTeamSelector user={user} selectedRiders={selectedRiders}/>;
      case 'settings':
        return <Home />; // Placeholder voor instellingen
      default:
        return <Home />;
    }
  };

  return (
    <>
      <Nav setCurrentPage={setCurrentPage} />
      {renderPage()}
      <Footer />
    </>
  );
}

export default App;