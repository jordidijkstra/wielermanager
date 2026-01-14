import '../css/nav.css';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';

export default function Nav({ setCurrentPage}) {
    const { user, isAdmin } = useAuth();
    const logout = useLogout();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const handleProfileClick = (page) => {
        setCurrentPage(page);
        setShowProfileMenu(false);
        setShowMobileMenu(false);
    };

    const handleNavClick = (page) => {
        setCurrentPage(page);
        setShowMobileMenu(false);
    };

    return (
        <nav>
            <div className="logo-container">
                <p>Wielermanager</p>
            </div>
            
            <button 
                className={`hamburger-menu ${showMobileMenu ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label="Menu"
                title="Menu"
            >
                <i className={showMobileMenu ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'}></i>
            </button>

            <ul className={`nav-menu ${showMobileMenu ? 'active' : ''}`}>
                <li><a href="#" onClick={() => handleNavClick('home')}>Home</a></li>
                {user && <li><a href="#" onClick={() => handleNavClick('team')}>Jouw team</a></li>}
                {user && <li><a href="#" onClick={() => handleNavClick('raceTeams')}>Race selecties</a></li>}
                <li><a href="#" onClick={() => handleNavClick('rankings')}>Rankings</a></li>
                
                {user ? (
                    <>
                        <li className="profile-menu">
                            <button 
                                className="btn-profile"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            >
                                👤 Profiel
                            </button>
                            {showProfileMenu && (
                                <div className="profile-dropdown">
                                    {isAdmin && (
                                        <a href="#" onClick={() => handleProfileClick('admin')}>
                                            ⚙️ Admin
                                        </a>
                                    )}
                                    <a href="#" onClick={() => handleProfileClick('settings')}>
                                        🔧 Instellingen
                                    </a>
                                    <button 
                                        className="btn-logout-dropdown"
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            setShowMobileMenu(false);
                                            logout();
                                        }}
                                    >
                                        🚪 Uitloggen
                                    </button>
                                </div>
                            )}
                        </li>
                        {showMobileMenu && (
                            <>
                                {isAdmin && (
                                    <li className="profile-submenu">
                                        <a href="#" onClick={() => handleProfileClick('admin')}>
                                            ⚙️ Admin
                                        </a>
                                    </li>
                                )}
                                <li className="profile-submenu">
                                    <a href="#" onClick={() => handleProfileClick('settings')}>
                                        🔧 Instellingen
                                    </a>
                                </li>
                                <li className="profile-submenu">
                                    <button 
                                        className="btn-logout-submenu"
                                        onClick={() => {
                                            setShowMobileMenu(false);
                                            logout();
                                        }}
                                    >
                                        🚪 Uitloggen
                                    </button>
                                </li>
                            </>
                        )}
                    </>
                ) : (
                    <li>
                        <button onClick={() => handleNavClick('login')} className="btn-login">Inloggen</button>
                    </li>
                )}
            </ul>
        </nav>
    );
}