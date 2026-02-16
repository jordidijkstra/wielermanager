export default function LoginCard({ onClose, children }) {
  return (
    <div className="login-container">
      <div className="login-card">
        <button className="btn-close" onClick={onClose}>×</button>
        <div className="login-card-content">
          {children}
        </div>
      </div>
    </div>
  );
}
