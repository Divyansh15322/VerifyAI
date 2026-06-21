import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

const Register = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, password, fullName);
      setSuccess(true);
      // Automatically log the user in after registration
      setTimeout(async () => {
        try {
          await login(email, password);
          navigate('/dashboard');
        } catch (err) {
          navigate('/login');
        }
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Email might already be taken.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-editorial-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.4rem', fontFamily: 'var(--font-headings)', fontWeight: '700' }}>
          <ShieldCheck size={24} style={{ color: 'var(--accent-color)' }} />
          <span>VerifyAI</span>
        </div>

        <div className="auth-quote-section">
          <p className="auth-quote">
            "Automate compliance logs. Track latencies. Deliver trusted proof across Healthcare, Finance, and Legal systems."
          </p>
          <div className="auth-author">VerifyAI Platform Architect</div>
        </div>

        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          Universal Multimodal Evidence Verification System
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-header">
            <div className="auth-logo">
              <ShieldCheck size={32} style={{ color: 'var(--accent-color)' }} />
              <span>VerifyAI</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Create your account to start auditing evidence
            </p>
          </div>

          {success && (
            <div style={{
              padding: '10px',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success-text)',
              border: '1px solid var(--success-border)',
              borderRadius: '4px',
              fontSize: '0.8rem',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              Registration successful! Logging you in...
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger-border)',
              borderRadius: '4px',
              fontSize: '0.8rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full name</label>
              <input 
                id="fullName"
                type="text" 
                className="form-input" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input 
                id="email"
                type="email" 
                className="form-input" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                className="form-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading || success}>
              {loading ? 'Creating account...' : 'Register workspace'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
