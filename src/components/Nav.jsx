import '../css/nav.css';

import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';

export default function Nav({ setCurrentPage}) {
    const { user, isAdmin } = useAuth();
    const logout = useLogout();

    return (
        <nav>
            <div className="logo-container">
                <p>Wielermanager</p>
            </div>
            <ul>
                <li><a href="#" onClick={() => setCurrentPage('home')}>Home</a></li>
                {isAdmin && <li><a href="#" onClick={() => setCurrentPage('results')}>Resultaten</a></li>}
                {user && <li><a href="#" onClick={() => setCurrentPage('team')}>Jouw team</a></li>}
                <li><a href="#" onClick={() => setCurrentPage('rankings')}>Rankings</a></li>
                {user ? (
                    <li className="user-info">
                        <button onClick={logout} className="btn-logout">Uitloggen</button>
                    </li>
                ) : (
                    <li>
                        <button onClick={() => setCurrentPage('login')} className="btn-login">Inloggen</button>
                    </li>
                )}
            </ul>
        </nav>
    );
}