import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Info } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const showExpiredMsg = searchParams.get('expired') === 'true';

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
            "Integrity is doing the right thing, even when no one is watching. AI is verifying it, so everyone is aligned."
          </p>
          <div className="auth-author">VerifyAI Audit Standards</div>
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
              Sign in to access your audit workspace
            </p>
          </div>

          {showExpiredMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px',
              backgroundColor: 'var(--warning-bg)',
              color: 'var(--warning-text)',
              border: '1px solid var(--warning-border)',
              borderRadius: '4px',
              fontSize: '0.8rem',
              marginBottom: '16px'
            }}>
              <Info size={16} />
              <span>Your session has expired. Please sign in again.</span>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
