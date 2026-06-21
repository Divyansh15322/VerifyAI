import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Users, 
  Activity, 
  Clock, 
  FileText, 
  ShieldAlert, 
  TrendingUp,
  Cpu
} from 'lucide-react';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/logs')
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to retrieve admin workspace parameters.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton" style={{ width: '250px', height: '30px' }}></div>
        <div className="bento-grid">
          <div className="card bento-col-6 skeleton" style={{ height: '200px' }}></div>
          <div className="card bento-col-6 skeleton" style={{ height: '200px' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--danger-text)' }}>
        <ShieldAlert size={48} style={{ margin: '0 auto 15px auto' }} />
        <h3 style={{ fontFamily: 'var(--font-headings)' }}>Admin Permissions Denied</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>{error}</p>
      </div>
    );
  }

  // Latency graph config
  const recentLatencies = stats?.performance?.recent_latencies || [];
  const maxLatency = Math.max(...recentLatencies.map(l => l.latency), 5000) || 5000;

  return (
    <div className="admin-panel-page">
      <h1 className="editorial-title">Admin Dashboard</h1>
      <p className="editorial-subtitle">
        System diagnostics, pipeline processing latency, active user logs, and audit logs.
      </p>

      {/* Admin stats widgets */}
      <div className="bento-grid">
        <div className="card bento-col-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Total Users</span>
            <Users size={20} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div className="stat-value">{stats?.users?.total}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Admins: {stats?.users?.admins} | Users: {stats?.users?.consumers}
          </div>
        </div>

        <div className="card bento-col-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Average Latency</span>
            <Clock size={20} style={{ color: 'var(--accent-color)' }} />
          </div>
          <div className="stat-value">{stats?.performance?.average_latency_ms} ms</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Groq multimodal inference cycle
          </div>
        </div>

        <div className="card bento-col-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">System Audits</span>
            <Cpu size={20} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div className="stat-value">{stats?.verifications?.total}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total processed records
          </div>
        </div>
      </div>

      <div className="bento-grid">
        {/* Latency History Chart */}
        <div className="card bento-col-6">
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginBottom: '15px' }}>
            Recent Submission Latencies
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Track times (in milliseconds) for the last 10 evidence audits.
          </p>

          {recentLatencies.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No latency log details compiled yet.
            </div>
          ) : (
            <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '10px 10px' }}>
              {recentLatencies.map((item, idx) => {
                const heightPercent = (item.latency / maxLatency) * 80;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>
                      {Math.round(item.latency / 100) / 10}s
                    </div>
                    <div style={{
                      width: '18px',
                      height: `${Math.max(10, heightPercent)}%`,
                      backgroundColor: 'var(--primary-color)',
                      borderRadius: '2px 2px 0 0'
                    }} title={`VER-${item.id}: ${item.latency}ms`}></div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      VER-{item.id}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Industry distribution breakdown */}
        <div className="card bento-col-6">
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginBottom: '15px' }}>
            Audits by Industry
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Aggregate distribution across the six supported sectors.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats?.verifications?.by_industry && Object.keys(stats.verifications.by_industry).length > 0 ? (
              Object.entries(stats.verifications.by_industry).map(([ind, count]) => {
                const percent = stats.verifications.total > 0 ? (count / stats.verifications.total) * 100 : 0;
                return (
                  <div key={ind} style={{ fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: '500' }}>
                      <span>{ind}</span>
                      <span>{count} ({Math.round(percent)}%)</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-color)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', backgroundColor: 'var(--accent-color)', width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                No submissions data recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Logs list */}
      <div className="card">
        <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginBottom: '20px' }}>
          System Audit Trail
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px' }}>Log ID</th>
                <th style={{ padding: '10px' }}>Timestamp</th>
                <th style={{ padding: '10px' }}>User</th>
                <th style={{ padding: '10px' }}>Action</th>
                <th style={{ padding: '10px' }}>Metadata / Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 10px', fontWeight: '600' }}>#{log.id}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{log.created_at}</td>
                  <td style={{ padding: '12px 10px', fontWeight: '500' }}>{log.user_email}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      backgroundColor: 'var(--bg-color)',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase'
                    }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
