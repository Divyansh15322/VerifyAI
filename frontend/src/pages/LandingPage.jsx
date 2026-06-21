import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  ArrowRight, 
  Upload, 
  FileSearch, 
  Award, 
  Activity, 
  DollarSign, 
  Package, 
  Film, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Clock
} from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Interactive demo state
  const [demoIndustry, setDemoIndustry] = useState('healthcare');
  const [demoDescription, setDemoDescription] = useState('Patient seeking reimbursement for emergency tooth extraction. Enclosed is dentist invoice and x-ray report.');
  const [demoFile, setDemoFile] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  
  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(null);

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setDemoLoading(true);
    setDemoResult(null);
    
    // Simulate AI pipeline delay
    setTimeout(() => {
      setDemoLoading(false);
      if (demoIndustry === 'healthcare') {
        setDemoResult({
          status: 'Supported',
          score: 95,
          explanation: '### Medical Audit Success\n- **Practitioner Registry**: Dentists license matches active registry status.\n- **Pricing Consistency**: The treatment codes listed in the invoice align with dental extraction reimbursement schedules.\n- **Patient Check**: Invoice name matches claimant data.',
          checklist: [
            { item: 'Hospital Letterhead', status: 'Verified' },
            { item: 'Authorized Signature', status: 'Verified' },
            { item: 'Treatment Codes', status: 'Verified' }
          ]
        });
      } else if (demoIndustry === 'finance') {
        setDemoResult({
          status: 'Needs Review',
          score: 68,
          explanation: '### Financial Audit Assessment\n- **Income Slips**: Monthly credit amount ($3,500) matches records.\n- **Discrepancy Warning**: Transaction listing displays atypical formatting. Potential layout tempering. Recommendation: check bank statement print origin.',
          checklist: [
            { item: 'Account Holder Details', status: 'Verified' },
            { item: 'Stamp & Signatures', status: 'Missing' },
            { item: 'Continuity Check', status: 'Verified' }
          ]
        });
      } else {
        setDemoResult({
          status: 'Supported',
          score: 88,
          explanation: '### Evidence Validation Success\n- The submitted document matches compliance standards for the selected FMCG classification.\n- Barcode format matches system catalog.',
          checklist: [
            { item: 'Label Standards', status: 'Verified' },
            { item: 'Compliance Stamp', status: 'Verified' }
          ]
        });
      }
    }, 2000);
  };

  const faqData = [
    {
      q: "How does VerifyAI process visual and textual evidence?",
      a: "VerifyAI uses advanced multimodal Large Language Models (LLMs) via the Groq API. When you upload a document (like a PDF statement) and an image (like a medical scan or barcode receipt), our pipeline extracts text context from the files and runs unified reasoning checks to detect inconsistencies or missing requirements."
    },
    {
      q: "What industries are supported by default?",
      a: "We support six core domains: Healthcare (reimbursements, diagnoses), Finance (bank audits, income validation), FMCG (packaging and food standards), Entertainment (barcodes, ticket copyrights), Manufacturing (parts quality sheet), and Legal Services (notarized agreements)."
    },
    {
      q: "Can I download official audit logs as PDFs?",
      a: "Yes. Every verification runs through a reporting engine that creates a high-fidelity PDF certificate. It compiles the AI scoring, audit checklist, compliance notes, and submitted files table, which you can archive or export."
    },
    {
      q: "Is there an administration panel for monitoring?",
      a: "VerifyAI includes an Admin Dashboard showing real-time statistics, aggregate user growth, submission volume trends, and processing latency graphs to monitor LLM server performance."
    }
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <ShieldCheck size={28} className="logo-icon" />
          <span>VerifyAI</span>
        </div>
        <div>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to="/login" className="btn btn-secondary">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <span className="hero-tag">Multimodal Evidence Validation Engine</span>
        <h1 className="hero-title">
          Trust Every Decision with AI-Powered Evidence Verification
        </h1>
        <p className="hero-subtitle">
          Submit claim files, tax forms, receipts, and descriptions. VerifyAI runs instant multimodal checks, calculates confidence scores, and generates downloadable audit certificates.
        </p>
        <div className="hero-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg" style={{ padding: '14px 28px' }}>
              Access Workspace <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg" style={{ padding: '14px 28px' }}>
                Create Account <ArrowRight size={18} />
              </Link>
              <a href="#interactive-demo" className="btn btn-secondary btn-lg" style={{ padding: '14px 28px' }}>
                Try Interactive Demo
              </a>
            </>
          )}
        </div>

        {/* Interactive Demo Panel */}
        <div id="interactive-demo" className="landing-preview-container">
          <h3 style={{ fontSize: '1.6rem', color: 'var(--primary-color)', marginBottom: '8px' }}>
            Interactive Demo Preview
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
            Test the AI verification engine directly. Choose an industry, type a claim, and review the AI check response.
          </p>

          <div className="preview-grid">
            <form className="preview-form" onSubmit={handleDemoSubmit}>
              <div className="form-group">
                <label className="form-label">Select Industry</label>
                <select 
                  className="form-select" 
                  value={demoIndustry} 
                  onChange={(e) => setDemoIndustry(e.target.value)}
                >
                  <option value="healthcare">Healthcare (Reimbursements, prescriptions)</option>
                  <option value="finance">Finance (Bank statements, income proof)</option>
                  <option value="fmcg">FMCG (Label ingredients, expiry checks)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Claim Explanation</label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  value={demoDescription} 
                  onChange={(e) => setDemoDescription(e.target.value)}
                  placeholder="Enter details of what you are claiming..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mock Evidence File Upload</label>
                <div style={{
                  border: '1px dashed var(--border-color)',
                  borderRadius: '6px',
                  padding: '12px',
                  backgroundColor: 'var(--bg-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.85rem'
                }}>
                  <Upload size={16} style={{ color: 'var(--primary-color)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>
                    {demoFile ? demoFile : 'dentist_invoice_receipt.pdf (Attached for simulation)'}
                  </span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={demoLoading}>
                {demoLoading ? 'Processing Multimodal Evidence...' : 'Run Audit Check'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {demoLoading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div className="skeleton" style={{ width: '50px', height: '50px', borderRadius: '50%', marginBottom: '15px' }}></div>
                  <h4 style={{ fontFamily: 'var(--font-headings)' }}>AI is evaluating evidence...</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Reading document texts and parsing images.
                  </p>
                </div>
              )}

              {!demoLoading && !demoResult && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  <FileSearch size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <p>Results will be displayed here after you click "Run Audit Check".</p>
                </div>
              )}

              {!demoLoading && demoResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge-status ${demoResult.status === 'Supported' ? 'badge-supported' : 'badge-review'}`}>
                      {demoResult.status}
                    </span>
                    <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                      AI Confidence: {demoResult.score}%
                    </span>
                  </div>

                  <div className="card" style={{ padding: '16px', backgroundColor: 'var(--bg-color)' }}>
                    <h5 style={{ marginBottom: '8px', color: 'var(--primary-color)' }}>Assessment Notes</h5>
                    <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                      {demoResult.explanation.replace('### Medical Audit Success', '').replace('### Financial Audit Assessment', '')}
                    </div>
                  </div>

                  <div>
                    <h5 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Verified Checklist</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {demoResult.checklist.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          padding: '4px 0',
                          borderBottom: '1px solid var(--border-color)'
                        }}>
                          <span>{item.item}</span>
                          <span style={{ fontWeight: '600', color: item.status === 'Verified' ? 'var(--success-text)' : 'var(--danger-text)' }}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="landing-section" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="section-tag">High-Performance Core</div>
        <h2 className="section-title">Designed for Critical Compliance Audits</h2>

        <div className="feature-bento">
          <div className="card bento-card-large card-hover">
            <h3 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', marginBottom: '10px' }}>
              Multimodal Reasoning Engine
            </h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Upload bank receipts, identification cards, tax slips, or medical certificates. The AI matches visual indicators inside images with extracted textual data from documents and your text description.
            </p>
          </div>

          <div className="card card-hover">
            <div className="industry-icon-box" style={{ marginBottom: '15px' }}>
              <Award size={22} />
            </div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--primary-color)', marginBottom: '8px' }}>
              Audit Certificates
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Generate downloadable PDF reports containing the full reasoning logs, verification timelines, and checklist states.
            </p>
          </div>

          <div className="card card-hover">
            <div className="industry-icon-box" style={{ marginBottom: '15px' }}>
              <Clock size={22} />
            </div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--primary-color)', marginBottom: '8px' }}>
              Latency Analytics
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Admins can track processing durations, API latency changes, and user metrics directly on the charts.
            </p>
          </div>

          <div className="card bento-card-large card-hover">
            <h3 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', marginBottom: '10px' }}>
              Compliance Checklist Validation
            </h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
              VerifyAI automatically checks for official notary public stamps, authorized signatures, hospital letterheads, and tax identifiers relative to standard rules.
            </p>
          </div>
        </div>
      </section>

      {/* Industry Showcase */}
      <section className="landing-section" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
        <div className="section-tag">Omni-Channel Support</div>
        <h2 className="section-title">Built for Six Global Industries</h2>

        <div className="industry-card-grid">
          <div className="industry-badge-card">
            <div className="industry-icon-box"><Activity size={20} /></div>
            <h4 style={{ fontSize: '1.15rem' }}>Healthcare</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Validate prescriptions, patient profiles, treatment cost codes, and clinical stamps.
            </p>
          </div>

          <div className="industry-badge-card">
            <div className="industry-icon-box"><DollarSign size={20} /></div>
            <h4 style={{ fontSize: '1.15rem' }}>Finance</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Audit monthly bank statement continuity, salary credits, and tax registration sheets.
            </p>
          </div>

          <div className="industry-badge-card">
            <div className="industry-icon-box"><Package size={20} /></div>
            <h4 style={{ fontSize: '1.15rem' }}>FMCG</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Audit physical packaging ingredient compliance, batch codes, and shelf labels.
            </p>
          </div>

          <div className="industry-badge-card">
            <div className="industry-icon-box"><Film size={20} /></div>
            <h4 style={{ fontSize: '1.15rem' }}>Entertainment</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Verify barcodes on event tickets, registration databases, and copyright letters.
            </p>
          </div>

          <div className="industry-badge-card">
            <div className="industry-icon-box"><Settings size={20} /></div>
            <h4 style={{ fontSize: '1.15rem' }}>Manufacturing</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Evaluate inspector signatures, dimension specification charts, and ISO sheets.
            </p>
          </div>

          <div className="industry-badge-card">
            <div className="industry-icon-box"><ShieldCheck size={20} /></div>
            <h4 style={{ fontSize: '1.15rem' }}>Legal Services</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Audit notarized deeds, contract execution blocks, agreements, and witness lines.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="landing-section" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="section-tag">Common Inquiries</div>
        <h2 className="section-title">Frequently Asked Questions</h2>

        <div className="faq-list">
          {faqData.map((faq, index) => (
            <div key={index} className="faq-item">
              <button 
                className="faq-question" 
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <span>{faq.q}</span>
                {openFaq === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openFaq === index && (
                <div className="faq-answer">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: 'var(--primary-color)',
        color: '#FFFDF9',
        padding: '60px 5% 40px 5%',
        borderTop: '1px solid var(--border-color)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '30px',
          marginBottom: '40px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.4rem', fontFamily: 'var(--font-headings)', fontWeight: '700', marginBottom: '15px' }}>
              <ShieldCheck size={24} style={{ color: 'var(--accent-color)' }} />
              <span>VerifyAI</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,253,249,0.7)', maxWidth: '280px', lineHeight: '1.5' }}>
              Advanced multimodal AI validation. Verify evidence across industries with speed, integrity, and depth.
            </p>
          </div>
          <div>
            <h5 style={{ fontSize: '1rem', marginBottom: '15px', color: 'var(--accent-color)' }}>Legal</h5>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'rgba(255,253,249,0.7)' }}>
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Audit Guidelines</li>
            </ul>
          </div>
        </div>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          borderTop: '1px solid rgba(255,253,249,0.1)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '15px',
          fontSize: '0.8rem',
          color: 'rgba(255,253,249,0.5)'
        }}>
          <span>&copy; {new Date().getFullYear()} VerifyAI. All rights reserved.</span>
          <span>Created for University Major Project & Hackathons.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
