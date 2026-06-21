import React from 'react';
import { Settings as SettingsIcon, ShieldCheck, Database, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="settings-page">
      <h1 className="editorial-title">Workspace Settings</h1>
      <p className="editorial-subtitle">
        Manage API credentials, user permissions, audit templates, and visual mode configurations.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
        
        {/* Profile Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} />
            <span>Profile Details</span>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem' }}>
            <div>
              <strong>Full Name:</strong> <span style={{ color: 'var(--text-muted)' }}>{user?.full_name || 'N/A'}</span>
            </div>
            <div>
              <strong>Email Account:</strong> <span style={{ color: 'var(--text-muted)' }}>{user?.email}</span>
            </div>
            <div>
              <strong>Workspace Role:</strong> <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</span>
            </div>
          </div>
        </div>

        {/* API Credentials */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} />
            <span>API Integrations</span>
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
            Configure keys to run live verification audits.
          </p>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">GROQ API KEY</label>
            <input 
              type="password" 
              className="form-input" 
              value="••••••••••••••••••••••••••••••••••••••••"
              disabled
              style={{ letterSpacing: '0.15em' }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '6px' }}>
              The API key is securely loaded from the backend `.env` configuration file.
            </p>
          </div>
        </div>

        {/* Database Status */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} />
            <span>Database Status</span>
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-text)'
            }}></span>
            <span style={{ fontWeight: '500' }}>SQLite (Sandbox Database Connected)</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
            Development databases automatically fall back to local SQLite files to ensure instant execution. Configure PostgreSQL inside backend `.env` for production.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
