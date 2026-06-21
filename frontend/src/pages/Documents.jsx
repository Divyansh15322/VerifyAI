import React from 'react';
import { FileText, Search, ExternalLink, HardDrive } from 'lucide-react';

const Documents = () => {
  return (
    <div className="documents-page">
      <h1 className="editorial-title">Evidence Vault</h1>
      <p className="editorial-subtitle">
        Secure library containing all uploaded images, PDFs, and laboratory sheets.
      </p>

      <div className="card" style={{ marginBottom: '24px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: '300px', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '36px' }}
            placeholder="Search filenames..."
            disabled
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <HardDrive size={16} />
          <span>Storage Used: 4.8 MB / 500 MB (Mock Sandbox)</span>
        </div>
      </div>

      <div className="card">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <FileText size={48} style={{ margin: '0 auto 15px auto', opacity: 0.3 }} />
          <h3 style={{ fontFamily: 'var(--font-headings)', color: 'var(--primary-color)' }}>Sandbox Storage</h3>
          <p style={{ maxWidth: '400px', margin: '8px auto 20px auto', fontSize: '0.9rem', lineHeight: '1.4' }}>
            Evidence files are kept inside the local server. Submit a new verification to upload files.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Documents;
