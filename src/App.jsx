import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Nav from './components/Nav';
import Home from './components/Home';
import Results from './components/Results';
import Login from './components/Login';
import TeamBuilder from './components/TeamBuilder';
import Footer from './components/Footer';
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'results':
        return isAdmin ? <Results /> : <Home />;
      case 'team':
        return <TeamBuilder user={user}/>;
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