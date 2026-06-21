import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import {
  FileDown,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  FileCheck2,
  BookOpen,
  Bot,
  ShieldCheck,
  CircleX,
  CircleAlert
} from 'lucide-react';

// ── Inline Markdown renderer ──────────────────────────────────
const RenderMarkdown = ({ content }) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="markdown-content">
      {lines.map((line, idx) => {
        if (line.startsWith('### ')) {
          return <h3 key={idx} style={{ margin: '16px 0 8px 0', fontSize: '1.15rem', color: 'var(--primary-color)' }}>{line.slice(4)}</h3>;
        } else if (line.startsWith('## ')) {
          return <h2 key={idx} style={{ margin: '20px 0 10px 0', fontSize: '1.35rem', color: 'var(--primary-color)' }}>{line.slice(3)}</h2>;
        } else if (line.startsWith('# ')) {
          return <h1 key={idx} style={{ margin: '24px 0 12px 0', fontSize: '1.55rem', color: 'var(--primary-color)' }}>{line.slice(2)}</h1>;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={idx} style={{ marginLeft: '20px', listStyleType: 'square', marginBottom: '6px' }}>{line.slice(2)}</li>;
        } else if (line.trim() === '') {
          return <div key={idx} style={{ height: '8px' }} />;
        } else {
          const boldRegex = /\*\*(.*?)\*\*/g;
          const parts = [];
          let lastIndex = 0;
          let match;
          while ((match = boldRegex.exec(line)) !== null) {
            parts.push(line.slice(lastIndex, match.index));
            parts.push(<strong key={match.index} style={{ color: 'var(--primary-color)' }}>{match[1]}</strong>);
            lastIndex = boldRegex.lastIndex;
          }
          parts.push(line.slice(lastIndex));
          return <p key={idx} style={{ marginBottom: '10px', lineHeight: '1.6' }}>{parts.length > 1 ? parts : line}</p>;
        }
      })}
    </div>
  );
};

// ── Agent timeline step icon ─────────────────────────────────
const StepIcon = ({ text }) => {
  if (text.includes('✓')) return <CheckCircle2 size={15} style={{ color: 'var(--success-text)', flexShrink: 0 }} />;
  if (text.includes('✗') || text.includes('Error')) return <CircleX size={15} style={{ color: 'var(--danger-text)', flexShrink: 0 }} />;
  if (text.includes('⚠')) return <CircleAlert size={15} style={{ color: '#d97706', flexShrink: 0 }} />;
  return <Bot size={15} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />;
};

// ── RAG Citation Card ─────────────────────────────────────────
const CitationCard = ({ item, index }) => (
  <div style={{
    backgroundColor: 'var(--bg-color)',
    border: '1px solid var(--border-color)',
    borderLeft: '3px solid var(--accent-color)',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '12px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
      <span style={{
        fontSize: '0.72rem',
        fontWeight: '700',
        color: 'var(--accent-color)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase'
      }}>
        Citation [{index + 1}]
      </span>
      <span style={{
        fontSize: '0.7rem',
        backgroundColor: 'rgba(var(--accent-rgb, 74, 124, 89), 0.1)',
        color: 'var(--primary-color)',
        padding: '2px 8px',
        borderRadius: '50px',
        fontWeight: '600'
      }}>
        {item.source}
      </span>
    </div>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: '1.5', margin: '0 0 8px 0' }}>
      {item.text?.slice(0, 320)}{item.text?.length > 320 ? '...' : ''}
    </p>
    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
      {item.citation}
    </span>
  </div>
);

// ── Main Results Component ────────────────────────────────────
const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchResults(); }, [id]);

  const fetchResults = async () => {
    try {
      const res = await api.get(`/verifications/${id}`);
      setVerification(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch verification audit results.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    const token = localStorage.getItem('verifyai_token');
    const url = `${import.meta.env.VITE_API_BASE_URL || 'https://verify-fbfi7t0dh-divyansh15322s-projects.vercel.app/'}/verifications/${id}/report`;
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error("Download failed"); return r.blob(); })
      .then(blob => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `verifyai_audit_VER-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert("Error exporting PDF report"));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton" style={{ width: '200px', height: '30px' }}></div>
        <div className="bento-grid">
          <div className="card bento-col-4 skeleton" style={{ height: '250px' }}></div>
          <div className="card bento-col-8 skeleton" style={{ height: '250px' }}></div>
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertCircle size={48} style={{ color: 'var(--danger-text)', margin: '0 auto 15px auto' }} />
        <h3 style={{ fontFamily: 'var(--font-headings)' }}>Audit Load Failed</h3>
        <p style={{ color: 'var(--text-muted)', margin: '10px 0 20px 0' }}>{error || 'Record does not exist.'}</p>
        <Link to="/dashboard" className="btn btn-primary">Return to Workspace</Link>
      </div>
    );
  }

  const score = verification.confidence_score;
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let scoreClass = 'score-high';
  if (score < 40) scoreClass = 'score-low';
  else if (score < 75) scoreClass = 'score-mid';

  const hasRAG = verification.retrieved_context && verification.retrieved_context.length > 0;

  return (
    <div className="results-page">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '8px 14px' }}>
          <ArrowLeft size={16} />
          <span>Back to Workspace</span>
        </button>
        <button className="btn btn-primary" onClick={handleDownloadReport}>
          <FileDown size={18} />
          <span>Export PDF Audit Certificate</span>
        </button>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span className="editorial-subtitle" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
          Audit Certificate VER-{verification.id} &nbsp;·&nbsp; {verification.industry}
        </span>
        <h1 className="editorial-title" style={{ marginTop: '4px' }}>
          Agentic AI Compliance Report
        </h1>
      </div>

      {/* ── Row 1: Score + Explanation ── */}
      <div className="bento-grid" style={{ marginBottom: '24px' }}>
        {/* Score Dial */}
        <div className="card bento-col-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span className="stat-label" style={{ marginBottom: '15px' }}>Assessment Decision</span>
          <span className={`badge-status ${
            verification.status === 'Supported' ? 'badge-supported' :
            verification.status === 'Needs Review' ? 'badge-review' : 'badge-insufficient'
          }`} style={{ padding: '8px 20px', fontSize: '0.95rem', borderRadius: '50px' }}>
            {verification.status}
          </span>
          <div className="gauge-container" style={{ marginTop: '20px' }}>
            <div className="gauge-dial-box">
              <svg className="gauge-svg" width="180" height="180">
                <circle className="gauge-circle-bg" r={normalizedRadius} cx="90" cy="90" />
                <circle
                  className={`gauge-circle-val ${scoreClass}`}
                  r={normalizedRadius} cx="90" cy="90"
                  strokeDasharray={`${circumference} ${circumference}`}
                  style={{ strokeDashoffset }}
                />
              </svg>
              <div className="gauge-text">
                <div className="gauge-percentage">{score}%</div>
                <div className="gauge-label">Confidence</div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                {verification.files?.length ?? 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Files</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                {verification.retrieved_context?.length ?? 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Citations</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                {verification.checklist?.length ?? 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Checks</div>
            </div>
          </div>
        </div>

        {/* AI Explanation */}
        <div className="card bento-col-8">
          <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-color)' }} />
            <span>AI Reasoning & Audit Explanation</span>
          </h3>
          <div style={{ backgroundColor: 'var(--bg-color)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '200px', maxHeight: '380px', overflowY: 'auto' }}>
            <RenderMarkdown content={verification.explanation} />
          </div>
        </div>
      </div>

      {/* ── Row 2: Checklist + Agent Timeline ── */}
      <div className="bento-grid" style={{ marginBottom: '24px' }}>
        {/* Compliance Checklist */}
        <div className="card bento-col-6">
          <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck2 size={20} />
            <span>Compliance Checklist</span>
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '15px' }}>
            Generated from {verification.industry} auditing protocol.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {verification.checklist && verification.checklist.length > 0 ? (
              verification.checklist.map((item, idx) => (
                <div key={idx} className="checklist-item" style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.status === 'Verified'
                      ? <CheckCircle2 size={15} style={{ color: 'var(--success-text)', flexShrink: 0 }} />
                      : item.status === 'Missing'
                      ? <AlertCircle size={15} style={{ color: 'var(--danger-text)', flexShrink: 0 }} />
                      : <HelpCircle size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                    }
                    <span className="checklist-label" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{item.item}</span>
                  </div>
                  <span className={`badge-status ${
                    item.status === 'Verified' ? 'badge-supported' :
                    item.status === 'Missing' ? 'badge-insufficient' : 'badge-review'
                  }`} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                    {item.status}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No checklist items compiled.</div>
            )}
          </div>
        </div>

        {/* Agent Processing Timeline */}
        <div className="card bento-col-6">
          <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} />
            <span>Agentic Processing Timeline</span>
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '15px' }}>
            7-Agent AI pipeline execution log.
          </p>
          <div className="timeline-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {verification.timeline && verification.timeline.length > 0 ? (
              verification.timeline.map((step, idx) => (
                <div key={idx} className="timeline-item" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', paddingBottom: '10px' }}>
                  <StepIcon text={step} />
                  <span style={{ fontSize: '0.82rem', lineHeight: '1.5', color: 'var(--text-color)' }}>{step}</span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No timeline logged.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: RAG Retrieved Context / Citations ── */}
      {hasRAG && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} style={{ color: 'var(--accent-color)' }} />
            <span>Retrieved Policy Evidence &amp; Citations</span>
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '18px' }}>
            Relevant policy chunks retrieved via Hybrid RAG (BM25 + TF-IDF) and reranked by cross-encoder LLM.
          </p>
          {verification.retrieved_context.map((item, idx) => (
            <CitationCard key={idx} item={item} index={idx} />
          ))}
        </div>
      )}

      {/* ── Row 4: Recommendations ── */}
      {verification.recommendations && verification.recommendations.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '3px solid var(--accent-color)' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: 'var(--accent-color)' }} />
            <span>AI Recommendations &amp; Next Steps</span>
          </h3>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {verification.recommendations.map((rec, idx) => (
              <li key={idx} style={{ color: 'var(--text-color)', fontSize: '0.93rem', lineHeight: '1.5', listStyleType: 'circle' }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Row 5: Submitted Files ── */}
      <div className="card">
        <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', marginBottom: '15px' }}>
          Uploaded Evidence Files
        </h3>
        {verification.files && verification.files.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {verification.files.map((file) => (
              <div key={file.id} className="file-preview-card" style={{ padding: '12px 18px', backgroundColor: 'var(--surface-color)' }}>
                <div className="file-preview-info">
                  <CheckCircle2 size={16} style={{ color: 'var(--success-text)' }} />
                  <span style={{ fontWeight: '600' }}>{file.file_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({file.file_type})</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No physical files submitted.</p>
        )}
      </div>
    </div>
  );
};

export default Results;
