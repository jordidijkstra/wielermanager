import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { ensureUserDocument } from '../services/userService';
import LoginCard from './Login/LoginCard';
import GoogleSignInButton from './Login/GoogleSignInButton';
import EmailPasswordForm from './Login/EmailPasswordForm';
import ProfileSetupForm from './Login/ProfileSetupForm';
import '../css/login.css';

const INITIAL_FORM_STATE = {
  email: '',
  password: '',
  confirmPassword: '',
  firstname: '',
  lastname: ''
};

export default function Login({ onClose }) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  // Disable scroll when login modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Update form field
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle Google sign-in success
  const handleGoogleSuccess = (user) => {
    setPendingUser(user);
    setSetupMode(true);
    setIsLoading(false);
  };

  // Handle Google sign-in error
  const handleGoogleError = (errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  // Handle profile setup complete
  const handleSetupComplete = async (e) => {
    e.preventDefault();
    
    const { firstname, lastname } = formData;
    
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

  // Handle email/password authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    const { firstname, lastname, email, password, confirmPassword } = formData;
    
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

  // Reset form when toggling between login and register
  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    setFormData(INITIAL_FORM_STATE);
    setError('');
  };

  return (
    <LoginCard onClose={onClose}>
      {setupMode ? (
        <ProfileSetupForm
          formData={formData}
          onFieldChange={handleFieldChange}
          error={error}
          isLoading={isLoading}
          onSubmit={handleSetupComplete}
        />
      ) : (
        <>
          <h2>{isRegister ? 'Registreren' : 'Inloggen'}</h2>
          
          <GoogleSignInButton
            isLoading={isLoading}
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />

          <div className="divider">
            <span>of</span>
          </div>

          <EmailPasswordForm
            isRegister={isRegister}
            formData={formData}
            onFieldChange={handleFieldChange}
            error={error}
            isLoading={isLoading}
            onSubmit={handleAuth}
            onToggleMode={handleToggleMode}
          />
        </>
      )}
    </LoginCard>
  );
}
