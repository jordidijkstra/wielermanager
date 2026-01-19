import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import '../css/settings.css';

export default function Settings({ user }) {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Load user profile data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setFirstname(data.firstname || '');
          setLastname(data.lastname || '');
          setEmail(user.email || '');
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Fout bij laden profielgegevens:', err);
        setMessage('Fout bij laden profielgegevens');
        setMessageType('error');
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!firstname.trim() || !lastname.trim()) {
      setMessage('Voornaam en achternaam zijn verplicht.');
      setMessageType('error');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        firstname: firstname.trim(),
        lastname: lastname.trim()
      });

      setMessage('✅ Profielprofiel succesvol bijgewerkt!');
      setMessageType('success');
    } catch (err) {
      console.error('Fout bij bijwerken profiel:', err);
      setMessage('Fout bij bijwerken profiel. Probeer opnieuw.');
      setMessageType('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="settings">
        <p className="not-logged-in">Je moet ingelogd zijn om je instellingen te wijzigen.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="settings">
        <h1>Instellingen</h1>
        <p className="loading-message">Profielgegevens laden...</p>
      </div>
    );
  }

  return (
    <div className="settings">
      <h1>Instellingen</h1>

      <div className="settings-container">
        <div className="profile-section">
          <h2>Mijn Profiel</h2>

          {message && (
            <div className={`message message-${messageType}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label htmlFor="firstname">Voornaam</label>
              <input
                id="firstname"
                type="text"
                placeholder="Voornaam"
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
                placeholder="Achternaam"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                disabled
                className="disabled-field"
              />
              <small className="form-hint">Email kan niet worden gewijzigd</small>
            </div>

            <button type="submit" className="btn-save-settings" disabled={isSaving}>
              {isSaving ? 'Bezig...' : 'Wijzigingen opslaan'}
            </button>
          </form>
        </div>

        <div className="account-info">
          <h3>Account Informatie</h3>
          <div className="info-item">
            <span className="label">Email:</span>
            <span className="value">{email}</span>
          </div>
          <div className="info-item">
            <span className="label">Gebruiker ID:</span>
            <span className="value code">{user.uid}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
