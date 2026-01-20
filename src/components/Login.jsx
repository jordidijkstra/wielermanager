import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/config';
import { ensureUserDocument } from '../services/userService';
import '../css/login.css';

export default function Login({ onClose }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [setupMode, setSetupMode] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        setIsLoading(true);
        setError('');
        try {
            console.log('Starting Google sign in...');
            const result = await signInWithPopup(auth, provider);
            console.log('Google sign in result:', result.user.email);
            
            // Set up mode for Google users to add firstname/lastname
            setPendingUser(result.user);
            setSetupMode(true);
            setIsLoading(false);
        } catch (error) {
            console.error('Google sign-in error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            if (error.code === 'auth/popup-closed-by-user') {
                console.log('User closed the popup');
                setError('Popup gesloten. Probeer opnieuw.');
            } else if (error.code === 'auth/cancelled-popup-request') {
                console.log('Popup request cancelled');
                setError('Login geannuleerd.');
            } else {
                setError(`Google inloggen mislukt: ${error.message}`);
            }
            setIsLoading(false);
        }
    };

    const handleSetupComplete = async () => {
        if (!firstname.trim() || !lastname.trim()) {
            setError('Voornaam en achternaam zijn verplicht.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await ensureUserDocument(pendingUser, { firstname, lastname });
            setSetupMode(false);
            setPendingUser(null);
            if (onClose) onClose();
        } catch (error) {
            console.error('Setup error:', error);
            setError('Er ging iets mis. Probeer opnieuw.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        
        if (isRegister && (!firstname.trim() || !lastname.trim())) {
            setError('Voornaam en achternaam zijn verplicht.');
            return;
        }
        
        if (isRegister && password !== confirmPassword) {
            setError('Wachtwoorden komen niet overeen.');
            return;
        }
        
        setIsLoading(true);
        try {
            if (isRegister) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await ensureUserDocument(userCredential.user, { firstname, lastname });
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                await ensureUserDocument(userCredential.user);
            }
            // Firebase auth state change will trigger useAuth hook
            // No need to call setUser - let the hook handle it
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
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <button className="btn-close" onClick={onClose}>×</button>
                
                {setupMode ? (
                    <>
                        <h2>Voltooi je profiel</h2>
                        <p className="setup-intro">Voer je voornaam en achternaam in</p>
                        
                        {error && <div className="error-message">{error}</div>}

                        <form onSubmit={(e) => { e.preventDefault(); handleSetupComplete(); }}>
                            <div className="form-group">
                                <label htmlFor="setup-firstname">Voornaam</label>
                                <input 
                                    id="setup-firstname"
                                    type="text" 
                                    placeholder="John" 
                                    value={firstname}
                                    onChange={(e) => setFirstname(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="setup-lastname">Achternaam</label>
                                <input 
                                    id="setup-lastname"
                                    type="text" 
                                    placeholder="Doe" 
                                    value={lastname}
                                    onChange={(e) => setLastname(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-primary" disabled={isLoading}>
                                {isLoading ? 'Bezig...' : 'Verder'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
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
                            {isLoading ? 'Bezig...' : 'Doorgaan met Google'}
                        </button>

                        <div className="divider">
                            <span>of</span>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <form onSubmit={handleAuth}>
                            {isRegister && (
                                <>
                                    <div className="form-group">
                                        <label htmlFor="firstname">Voornaam</label>
                                        <input 
                                            id="firstname"
                                            type="text" 
                                            placeholder="John" 
                                            value={firstname}
                                            onChange={(e) => setFirstname(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="lastname">Achternaam</label>
                                        <input 
                                            id="lastname"
                                            type="text" 
                                            placeholder="Doe" 
                                            value={lastname}
                                            onChange={(e) => setLastname(e.target.value)}
                                            required
                                        />
                                    </div>
                                </>
                            )}
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
                            {isRegister && (
                                <div className="form-group">
                                    <label htmlFor="confirm-password">Herhaal wachtwoord</label>
                                    <input 
                                        id="confirm-password"
                                        type="password" 
                                        placeholder="••••••••" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                            <button type="submit" className="btn-primary" disabled={isLoading}>
                                {isLoading ? 'Bezig...' : (isRegister ? 'Account aanmaken' : 'Inloggen')}
                            </button>
                        </form>

                        <div className="toggle-auth">
                            {isRegister ? 'Al een account?' : 'Nog geen account?'}
                            <button onClick={() => {
                                setIsRegister(!isRegister);
                                setFirstname('');
                                setLastname('');
                                setPassword('');
                                setConfirmPassword('');
                                setError('');
                            }}>
                                {isRegister ? 'Inloggen' : 'Registreren'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
