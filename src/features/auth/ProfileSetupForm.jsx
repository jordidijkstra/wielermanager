export default function ProfileSetupForm({
  formData,
  onFieldChange,
  error,
  isLoading,
  onSubmit
}) {
  const { firstname, lastname } = formData;

  return (
    <>
      <h2>Voltooi je profiel</h2>
      <p className="setup-intro">Voer je voornaam en achternaam in</p>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="setup-firstname">Voornaam</label>
          <input 
            id="setup-firstname"
            type="text" 
            placeholder="John" 
            value={firstname}
            onChange={(e) => onFieldChange('firstname', e.target.value)}
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
            onChange={(e) => onFieldChange('lastname', e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Bezig...' : 'Verder'}
        </button>
      </form>
    </>
  );
}
