import React, { useState } from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const mockNotifications = [
    { id: 1, text: "Verification VER-12 approved (Healthcare)", time: "2 hours ago" },
    { id: 2, text: "Audit log checklist updated by AI", time: "5 hours ago" },
    { id: 3, text: "New login detected from Delhi, India", time: "1 day ago" }
  ];

  return (
    <header className="navbar">
      <div className="navbar-search">
        <Search size={18} className="search-icon" />
        <input type="text" placeholder="Search verifications, files, or audit logs..." />
      </div>

      <div className="navbar-actions">
        <button className="nav-btn" title="Help & Documentation">
          <HelpCircle size={20} />
        </button>

        <div style={{ position: 'relative' }}>
          <button 
            className="nav-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell size={20} />
            <span className="nav-badge"></span>
          </button>

          {showNotifications && (
            <div className="card" style={{
              position: 'absolute',
              right: 0,
              top: '50px',
              width: '320px',
              zIndex: 1000,
              padding: '16px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <h4 style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Notifications
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mockNotifications.map(n => (
                  <div key={n.id} style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: '500' }}>{n.text}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px' }}>
          <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>
            <div style={{ fontWeight: '600' }}>{user?.full_name || 'User'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
