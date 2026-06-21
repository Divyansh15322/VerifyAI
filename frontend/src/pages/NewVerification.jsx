import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Upload, File, X, Sparkles } from 'lucide-react';

const NewVerification = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [industry, setIndustry] = useState('healthcare');
  const [verificationType, setVerificationType] = useState('prescription_reimbursement');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');

  // Industry-specific verification types
  const typeMap = {
    healthcare: [
      { value: 'prescription_reimbursement', label: 'Prescription Reimbursement' },
      { value: 'medical_bill_audit', label: 'Medical Bill Audit' },
      { value: 'treatment_authorization', label: 'Treatment Authorization' }
    ],
    finance: [
      { value: 'income_validation', label: 'Loan Income Validation' },
      { value: 'tax_audit', label: 'Tax Declaration Audit' },
      { value: 'bank_standing', label: 'Bank Statement Audit' }
    ],
    fmcg: [
      { value: 'ingredients_compliance', label: 'Ingredients Standards Check' },
      { value: 'packaging_label', label: 'Packaging Label Compliance' },
      { value: 'batch_expiry', label: 'Batch Expiry Audit' }
    ],
    entertainment: [
      { value: 'ticket_validation', label: 'Ticket Barcode Validation' },
      { value: 'copyright_permissions', label: 'Copyright Permissions Check' },
      { value: 'event_credentials', label: 'Event Credentials Audit' }
    ],
    manufacturing: [
      { value: 'materials_audit', label: 'ISO Materials Audit' },
      { value: 'dimension_specs', label: 'Dimension Specs Verification' },
      { value: 'quality_stamp', label: 'Quality Stamp Audit' }
    ],
    legal: [
      { value: 'contract_execution', label: 'Contract Execution Check' },
      { value: 'notary_deed', label: 'Notarized Deed Audit' },
      { value: 'witness_verification', label: 'Witnesses Verification' }
    ]
  };

  const handleIndustryChange = (e) => {
    const selected = e.target.value;
    setIndustry(selected);
    // Reset type to first available in selected industry
    setVerificationType(typeMap[selected][0].value);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    // Basic file validation
    const validFiles = newFiles.filter(file => {
      const isPdf = file.type === 'application/pdf';
      const isImg = file.type.startsWith('image/');
      const isText = file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv');
      
      if (!isPdf && !isImg && !isText) {
        setError(`File type '${file.name}' not supported. Please upload PDF, TXT or Images.`);
        return false;
      }
      
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        setError(`File '${file.name}' exceeds the 10MB size limit.`);
        return false;
      }
      
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerLoaderLogs = () => {
    setLoadingStep(0);
    const intervals = [
      setTimeout(() => setLoadingStep(1), 1800),
      setTimeout(() => setLoadingStep(2), 3500),
      setTimeout(() => setLoadingStep(3), 5200),
      setTimeout(() => setLoadingStep(4), 7000),
    ];
    return () => intervals.forEach(clearTimeout);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Start status logging ticker
    const clearTicker = triggerLoaderLogs();
    
    const formData = new FormData();
    formData.append('industry', industry);
    formData.append('verification_type', verificationType);
    formData.append('description', description);
    
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await api.post('/verifications/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      // Redirect to results
      navigate(`/results/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred during evidence verification. Please try again.');
      setLoading(false);
      clearTicker();
    }
  };

  const loadingLogs = [
    "Uploading evidence documents to secure bucket...",
    "Extracting plain texts and tokenizing parameters...",
    "Encoding image files as base64 parts...",
    "Calling Groq LLM (llama-3.2-11b-vision-preview)...",
    "Parsing AI checklist response and creating report..."
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        textAlign: 'center',
        gap: '20px'
      }}>
        <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%' }}></div>
        <h2 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.8rem', color: 'var(--primary-color)' }}>
          Auditing Evidence...
        </h2>
        <div style={{
          padding: '16px 24px',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          maxWidth: '450px',
          width: '100%',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-color)' }}>
            Current Stage:
          </div>
          <div style={{ color: 'var(--accent-color)', marginTop: '6px', fontWeight: '500' }}>
            {loadingLogs[loadingStep]}
          </div>
          
          <div style={{
            height: '4px',
            backgroundColor: 'var(--border-color)',
            borderRadius: '10px',
            marginTop: '15px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              backgroundColor: 'var(--primary-color)',
              width: `${(loadingStep + 1) * 20}%`,
              transition: 'width 0.8s ease'
            }}></div>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          This may take a few moments depending on Groq response latency.
        </p>
      </div>
    );
  }

  return (
    <div className="new-verification-page">
      <h1 className="editorial-title">New AI Audit</h1>
      <p className="editorial-subtitle">
        Upload claims files, select the targeting compliance industry, and start automated audits.
      </p>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger-text)',
          border: '1px solid var(--danger-border)',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: '800px' }}>
        <div className="bento-grid" style={{ marginBottom: '10px' }}>
          <div className="form-group bento-col-6">
            <label className="form-label" htmlFor="industry">Compliance Industry</label>
            <select 
              id="industry"
              className="form-select" 
              value={industry} 
              onChange={handleIndustryChange}
            >
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="fmcg">FMCG</option>
              <option value="entertainment">Entertainment</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="legal">Legal Services</option>
            </select>
          </div>

          <div className="form-group bento-col-6">
            <label className="form-label" htmlFor="type">Verification Type</label>
            <select 
              id="type"
              className="form-select" 
              value={verificationType} 
              onChange={(e) => setVerificationType(e.target.value)}
            >
              {typeMap[industry].map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">Claim Context & Description</label>
          <textarea 
            id="description"
            className="form-input" 
            rows="4" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the claim or statement details (e.g. details of transaction, patient details, product batch numbers) to verify against documents..."
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Upload Evidence Documents (Images/PDFs)</label>
          
          <div 
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <Upload size={32} className="upload-zone-icon" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '1.05rem', color: 'var(--primary-color)', marginBottom: '4px' }}>
              Drag & Drop files here, or click to browse
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Supports PDFs, Images (PNG, JPG), or Plain Text. Max 10MB per file.
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple 
              onChange={handleFileChange}
              accept="image/*,application/pdf,text/plain,.txt,.csv"
            />
          </div>

          {files.length > 0 && (
            <div className="file-list-preview">
              <h5 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginTop: '10px' }}>
                Files Selected ({files.length}):
              </h5>
              {files.map((file, idx) => (
                <div key={idx} className="file-preview-card">
                  <div className="file-preview-info">
                    <File size={16} style={{ color: 'var(--primary-color)' }} />
                    <span style={{ fontWeight: '500' }}>{file.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <X 
                    size={16} 
                    className="file-preview-remove" 
                    onClick={() => removeFile(idx)} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            <Sparkles size={16} /> Run Multimodal AI Audit
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewVerification;
