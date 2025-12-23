import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/config';
import '../css/login.css';

export default function Login({ setUser, onClose }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            setUser(result.user);
            if (onClose) onClose();
        } catch (error) {
            console.error('Google sign-in error:', error);
            setError('Google inloggen mislukt. Probeer opnieuw.');
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegister) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);
            }
            if (onClose) onClose();
        } catch (error) {
            console.error('Auth error:', error);
            if (error.code === 'auth/email-already-in-use') {
                setError('Dit email adres is al in gebruik.');
            } else if (error.code === 'auth/wrong-password') {
                setError('Verkeerd wachtwoord.');
            } else if (error.code === 'auth/user-not-found') {
                setError('Geen account gevonden met dit email adres.');
            } else if (error.code === 'auth/weak-password') {
                setError('Wachtwoord moet minimaal 6 tekens zijn.');
            } else {
                setError('Er ging iets mis. Probeer opnieuw.');
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <button className="btn-close" onClick={onClose}>×</button>
                <h2>{isRegister ? 'Registreren' : 'Inloggen'}</h2>
                
                <button className="btn-google" onClick={handleGoogleSignIn}>
                    <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                        <g fill="none" fillRule="evenodd">
                            <path d="M17.6 9.2l-.1-1.8H9v3.4h4.8C13.6 12 13 13 12 13.6v2.2h3a8.8 8.8 0 0 0 2.6-6.6z" fill="#4285F4"/>
                            <path d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.2a5.4 5.4 0 0 1-8-2.9H1V13a9 9 0 0 0 8 5z" fill="#34A853"/>
                            <path d="M4 10.7a5.4 5.4 0 0 1 0-3.4V5H1a9 9 0 0 0 0 8l3-2.3z" fill="#FBBC05"/>
                            <path d="M9 3.6c1.3 0 2.5.4 3.4 1.3L15 2.3A9 9 0 0 0 1 5l3 2.4a5.4 5.4 0 0 1 5-3.7z" fill="#EA4335"/>
                        </g>
                    </svg>
                    Doorgaan met Google
                </button>

                <div className="divider">
                    <span>of</span>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleAuth}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input 
                            id="email"
                            type="email" 
                            placeholder="jouw@email.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Wachtwoord</label>
                        <input 
                            id="password"
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary">
                        {isRegister ? 'Account aanmaken' : 'Inloggen'}
                    </button>
                </form>

                <div className="toggle-auth">
                    {isRegister ? 'Al een account?' : 'Nog geen account?'}
                    <button onClick={() => setIsRegister(!isRegister)}>
                        {isRegister ? 'Inloggen' : 'Registreren'}
                    </button>
                </div>
            </div>
        </div>
    );
}
