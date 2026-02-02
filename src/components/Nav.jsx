import '../css/nav.css';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';
import { useTeamDeadline } from '../hooks/useTeamDeadline';

export default function Nav({ setCurrentPage, handleRankingsClick, setShowLoginModal, currentPage }) {
    const { user, isAdmin } = useAuth();
    const logout = useLogout();
    const { deadlinePassed } = useTeamDeadline(user);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Track scroll position
    useEffect(() => {
      const handleScroll = () => {
        // On home page, no background until scrolling far down; on other pages, always show background
        if (currentPage === 'home') {
          // Home page: only show background after scrolling significantly (95% of viewport height)
          setIsScrolled(window.scrollY > window.innerHeight * 0.5);
        } else {
          // Other pages: always show background
          setIsScrolled(true);
        }
      };

      // Set initial state based on current page
      if (currentPage === 'home') {
        setIsScrolled(window.scrollY > window.innerHeight * 0.5);
      } else {
        setIsScrolled(true);
      }

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, [currentPage]);

    const handleProfileClick = (page) => {
        setCurrentPage(page);
        setShowProfileMenu(false);
        setShowMobileMenu(false);
    };

    const handleNavClick = (page) => {
        setCurrentPage(page);
        setShowMobileMenu(false);
    };

    // Render main nav items (shared between desktop and mobile)
    const renderMainNavItems = () => (
        <>
            <li><a href="#" onClick={() => handleNavClick('home')}>Home</a></li>
            {user && <li><a href="#" onClick={() => handleNavClick('pointsTables')}>Puntentabellen</a></li>}
            {user && <li><a href="#" onClick={() => handleRankingsClick()}>Klassement</a></li>}
            {user && <li><a href="#" onClick={() => handleNavClick('riderStatistics')}>Statistieken</a></li>}
        </>
    );

    // Render profile items (desktop or mobile based on parameter)
    const renderProfileItems = (isMobile = false) => {
        const items = [
            { label: 'Jouw team', page: 'team', requireDeadline: true },
            { label: 'Jouw punten', page: 'points' },
            { label: 'Jouw selecties', page: 'raceTeams' },
            { label: '🔧 Instellingen', page: 'settings' },
            { label: '⚙️ Admin', page: 'admin', adminOnly: true },
            { label: '🚪 Uitloggen', logout: true },
        ];

        const renderItem = (item) => {
            if (item.adminOnly && !isAdmin) return null;
            if (item.requireDeadline && deadlinePassed) return null;
            
            let content;
            if (item.logout) {
                const logoutFn = () => {
                    if (isMobile) setShowMobileMenu(false);
                    else setShowProfileMenu(false);
                    logout();
                };
                content = (
                    <button 
                        className={isMobile ? 'btn-logout-submenu' : 'btn-logout-dropdown'}
                        onClick={logoutFn}
                    >
                        {item.label}
                    </button>
                );
            } else {
                content = (
                    <a href="#" onClick={() => handleProfileClick(item.page)}>
                        {item.label}
                    </a>
                );
            }

            const key = item.logout ? 'logout' : item.page;
            return isMobile ? (
                <li key={key} className="profile-submenu">{content}</li>
            ) : (
                <div key={key}>{content}</div>
            );
        };

        return <>{items.map(renderItem)}</>;
    };

    return (
        <nav className={clsx('nav', { scrolled: isScrolled, 'menu-open': showMobileMenu })}>
            <div className="logo-container">
                <p>De Patron</p>
                <span>van de koers</span>
            </div>
            
            {/* Hamburger Menu Button */}
            <button 
                className={clsx('hamburger-menu', { active: showMobileMenu })}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label="Menu"
                title="Menu"
            >
                <i className={showMobileMenu ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'}></i>
            </button>

            {/* Desktop Menu */}
            {!showMobileMenu && (
                <ul className="nav-menu desktop">
                    {renderMainNavItems()}
                    
                    {user ? (
                        <li className="profile-menu">
                            <button 
                                className="btn-profile"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            >
                                <i className="fa-solid fa-user"></i> Profiel
                            </button>
                            {showProfileMenu && (
                                <div className="profile-dropdown">
                                    {renderProfileItems()}
                                </div>
                            )}
                        </li>
                    ) : (
                        <li>
                            <button onClick={() => setShowLoginModal(true)} className="btn-login">Inloggen</button>
                        </li>
                    )}
                </ul>
            )}

            {/* Mobile Menu */}
            {showMobileMenu && (
                <ul className="nav-menu mobile">
                    {renderMainNavItems()}
                    {user ? renderProfileItems(true) : <li><button onClick={() => setShowLoginModal(true)} className="btn-login">Inloggen</button></li>}
                </ul>
            )}
        </nav>
    );
}