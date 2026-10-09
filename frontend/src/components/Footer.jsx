import React from 'react';
import './Navigation.css';

const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="stitch-footer">
      <div className="stitch-footer-container">
        {/* Left: Brand & Ledger Copyright */}
        <div className="stitch-footer-left">
          <span className="stitch-footer-badge">SKILL PASSPORT</span>
          <span className="stitch-footer-bullet d-none d-sm-inline">•</span>
          <p className="stitch-footer-copyright">
            &copy; {CURRENT_YEAR} Skill Passport. Verified Institutional Credential Ledger. All rights reserved.
          </p>
        </div>

        {/* Right: Informational & Compliance Links */}
        <nav className="stitch-footer-nav" aria-label="Footer Navigation">
          <a href="#privacy" className="stitch-footer-link">
            Privacy Policy
          </a>
          <a href="#terms" className="stitch-footer-link">
            Terms of Service
          </a>
          <a href="#accreditation" className="stitch-footer-link">
            Accreditation Standards
          </a>
          <a href="#verifier" className="stitch-footer-link">
            Verifier Portal
          </a>
          <a href="#support" className="stitch-footer-link">
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
