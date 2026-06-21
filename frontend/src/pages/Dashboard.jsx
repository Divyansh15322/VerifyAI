import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  FileCheck, 
  Clock, 
  CheckCircle, 
  HelpCircle, 
  PlusCircle, 
  ListFilter, 
  FileDown, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    supported: 0,
    review: 0,
    insufficient: 0,
    supportedRate: 0,
    avgConfidence: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/verifications');
      const data = res.data;
      setVerifications(data);
      
      // Calculate Stats
      const total = data.length;
      let supported = 0;
      let review = 0;
      let insufficient = 0;
      let sumConfidence = 0;
      
      data.forEach(v => {
        if (v.status === 'Supported') supported++;
        else if (v.status === 'Needs Review') review++;
        else insufficient++;
        sumConfidence += v.confidence_score;
      });
      
      const supportedRate = total > 0 ? Math.round((supported / total) * 100) : 0;
      const avgConfidence = total > 0 ? Math.round(sumConfidence / total) : 0;
      
      setStats({
        total,
        supported,
        review,
        insufficient,
        supportedRate,
        avgConfidence
      });
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  // Mock chart data representing recent weekly volume
  const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Map counts to days. For visual interest, we'll draw bars:
  const chartValues = [4, 6, 2, 8, 9, 3, stats.total % 10 || 5];
  const maxVal = Math.max(...chartValues) || 10;

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h1 className="editorial-title">Workspace Overview</h1>
        <Link to="/new-verification" className="btn btn-primary">
          <PlusCircle size={18} />
          <span>New Audit Check</span>
        </Link>
      </div>
      <p className="editorial-subtitle">
        Review your verification queues, aggregate statistics, and AI confidence trends.
      </p>

      {/* Stats Bento Grid Row */}
      <div className="bento-grid">
        <div className="card bento-col-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Total Audits</span>
            <FileCheck size={20} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div className="stat-value">{loading ? '...' : stats.total}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Submissions processed</div>
        </div>

        <div className="card bento-col-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Approval Rate</span>
            <CheckCircle size={20} style={{ color: 'var(--success-text)' }} />
          </div>
          <div className="stat-value">{loading ? '...' : `${stats.supportedRate}%`}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Statused as Supported</div>
        </div>

        <div className="card bento-col-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Average Confidence</span>
            <TrendingUp size={20} style={{ color: 'var(--accent-color)' }} />
          </div>
          <div className="stat-value">{loading ? '...' : `${stats.avgConfidence}%`}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mean AI probability output</div>
        </div>
      </div>

      {/* Charts & Actions Grid */}
      <div className="bento-grid">
        {/* SVG Chart Panel */}
        <div className="card bento-col-8">
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginBottom: '20px' }}>
            Weekly Audit Volume
          </h3>
          
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '10px 20px' }}>
            {chartDays.map((day, idx) => {
              const heightPercent = Math.max(10, (chartValues[idx] / maxVal) * 80);
              return (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px' }}>{chartValues[idx]}</div>
                  <div style={{
                    width: '32px',
                    height: `${heightPercent}%`,
                    backgroundColor: idx === 6 ? 'var(--accent-color)' : 'var(--primary-color)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.8s ease'
                  }}></div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>{day}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="card bento-col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginBottom: '12px' }}>
              Quick Actions
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Access direct verification submission pathways or inspect system databases.
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/new-verification" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              <PlusCircle size={16} /> Submit Claim Files
            </Link>
            <Link to="/history" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              <ListFilter size={16} /> View Audit History
            </Link>
          </div>
        </div>
      </div>

      {/* Queue List Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-color)' }}>
            Recent Activity Queue
          </h3>
          <Link to="/history" style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
            <span>View All Records</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ width: '100%', height: '40px' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '40px' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '40px' }}></div>
          </div>
        ) : verifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <FileCheck size={48} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
            <p>No verification logs found. Submit your first evidence document to start auditing.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 10px' }}>Audit ID</th>
                  <th style={{ padding: '12px 10px' }}>Industry</th>
                  <th style={{ padding: '12px 10px' }}>Type</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                  <th style={{ padding: '12px 10px' }}>Confidence</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {verifications.slice(0, 5).map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 10px', fontWeight: '500' }}>VER-{v.id}</td>
                    <td style={{ padding: '16px 10px' }}>{v.industry.toUpperCase()}</td>
                    <td style={{ padding: '16px 10px', textTransform: 'capitalize' }}>
                      {v.verification_type.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '16px 10px' }}>
                      <span className={`badge-status ${
                        v.status === 'Supported' ? 'badge-supported' : 
                        v.status === 'Needs Review' ? 'badge-review' : 'badge-insufficient'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 10px', fontWeight: '600' }}>{v.confidence_score}%</td>
                    <td style={{ padding: '16px 10px', textAlign: 'right' }}>
                      <button 
                        onClick={() => navigate(`/results/${v.id}`)}
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Inspect Result
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
