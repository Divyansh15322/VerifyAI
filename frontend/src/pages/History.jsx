import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Search, Filter, RefreshCw, FileText } from 'lucide-react';

const History = () => {
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [industry, statusFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (industry) params.industry = industry;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/verifications/', { params });
      setVerifications(res.data);
    } catch (err) {
      console.error("Failed to load audit history", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleResetFilters = () => {
    setSearch('');
    setIndustry('');
    setStatusFilter('');
    // Trigger reloading
    setLoading(true);
    api.get('/verifications/')
      .then(res => setVerifications(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  return (
    <div className="history-page">
      <h1 className="editorial-title">Audit History</h1>
      <p className="editorial-subtitle">
        Search, filter, and review all processed evidence verification audits in your archive.
      </p>

      {/* Filter Toolbar Panel */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '220px' }}>
            <label className="form-label">Keyword Query</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '36px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, code, type..."
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0, width: '160px' }}>
            <label className="form-label">Industry</label>
            <select 
              className="form-select" 
              value={industry} 
              onChange={(e) => setIndustry(e.target.value)}
            >
              <option value="">All Industries</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="fmcg">FMCG</option>
              <option value="entertainment">Entertainment</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="legal">Legal Services</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, width: '160px' }}>
            <label className="form-label">Status</label>
            <select 
              className="form-select" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Supported">Supported</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Insufficient Evidence">Insufficient</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ height: '45px' }}>
              Apply
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleResetFilters}
              style={{ height: '45px', padding: '10px' }}
              title="Reset Filters"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* Grid of Results */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ width: '100%', height: '40px' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '40px' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '40px' }}></div>
          </div>
        ) : verifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ margin: '0 auto 15px auto', opacity: 0.3 }} />
            <p>No verification records match your filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 10px' }}>Audit ID</th>
                  <th style={{ padding: '12px 10px' }}>Date</th>
                  <th style={{ padding: '12px 10px' }}>Industry</th>
                  <th style={{ padding: '12px 10px' }}>Type</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                  <th style={{ padding: '12px 10px' }}>Confidence</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 10px', fontWeight: '600' }}>VER-{v.id}</td>
                    <td style={{ padding: '16px 10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 10px', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                      {v.industry}
                    </td>
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
                        Inspect
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

export default History;
