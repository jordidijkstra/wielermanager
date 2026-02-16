export default function EmailPasswordForm({
  isRegister,
  formData,
  onFieldChange,
  error,
  isLoading,
  onSubmit,
  onToggleMode
}) {
  const { email, password, confirmPassword, firstname, lastname } = formData;

  return (
    <>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={onSubmit}>
        {isRegister && (
          <div className="container-name-fields">
            <div className="form-group-login">
              <label htmlFor="firstname">Voornaam</label>
              <input 
                id="firstname"
                type="text"
                placeholder="John" 
                value={firstname}
                onChange={(e) => onFieldChange('firstname', e.target.value)}
                required
              />
            </div>
            <div className="form-group-login">
              <label htmlFor="lastname">Achternaam</label>
              <input 
                id="lastname"
                type="text"
                placeholder="Doe" 
                value={lastname}
                onChange={(e) => onFieldChange('lastname', e.target.value)}
                required
              />
            </div>
          </div>
        )}
        <div className="form-group-login">
          <label htmlFor="email">Email</label>
          <input 
            id="email"
            type="email"
            placeholder="jouw@email.com" 
            value={email}
            onChange={(e) => onFieldChange('email', e.target.value)}
            required
          />
        </div>
        <div className="form-group-login">
          <label htmlFor="password">Wachtwoord</label>
          <input 
            id="password"
            type="password"
            placeholder="••••••••" 
            value={password}
            onChange={(e) => onFieldChange('password', e.target.value)}
            required
          />
        </div>
        {isRegister && (
          <div className="form-group-login">
            <label htmlFor="confirm-password">Herhaal wachtwoord</label>
            <input 
              id="confirm-password"
              type="password"
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => onFieldChange('confirmPassword', e.target.value)}
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
        <button 
          onClick={onToggleMode}
          type="button"
        >
          {isRegister ? 'Inloggen' : 'Registreren'}
        </button>
      </div>
    </>
  );
}
