import React from 'react';

const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-auto font-sans">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-5">
        {/* Left: Brand & Ledger Copyright */}
        <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
          <span className="font-heading font-bold text-xs uppercase tracking-wider text-slate-500">
            SKILL PASSPORT
          </span>
          <span className="text-slate-300 text-sm hidden sm:inline">•</span>
          <p className="text-xs text-slate-500 m-0">
            &copy; {CURRENT_YEAR} Skill Passport. Verified Institutional Credential Ledger. All rights reserved.
          </p>
        </div>

        {/* Right: Informational & Compliance Links */}
        <nav className="flex items-center gap-6 flex-wrap justify-center" aria-label="Footer Navigation">
          <a href="#privacy" className="text-xs text-slate-500 hover:text-primary transition-colors hover:underline">
            Privacy Policy
          </a>
          <a href="#terms" className="text-xs text-slate-500 hover:text-primary transition-colors hover:underline">
            Terms of Service
          </a>
          <a href="#accreditation" className="text-xs text-slate-500 hover:text-primary transition-colors hover:underline">
            Accreditation Standards
          </a>
          <a href="#verifier" className="text-xs text-slate-500 hover:text-primary transition-colors hover:underline">
            Verifier Portal
          </a>
          <a href="#support" className="text-xs text-slate-500 hover:text-primary transition-colors hover:underline">
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
