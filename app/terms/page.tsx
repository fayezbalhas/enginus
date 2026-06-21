'use client'

import Navbar from '../components/Navbar'

export default function TermsPage() {
  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .legal-wrap { max-width: 780px; margin: 0 auto; padding: 48px 24px 80px; }
        .legal-wrap h2 { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; color: #f0f0f0; margin: 48px 0 16px; letter-spacing: -0.01em; }
        .legal-wrap h3 { font-size: 16px; font-weight: 600; color: #ccc; margin: 28px 0 10px; }
        .legal-wrap p { font-size: 15px; color: #888; line-height: 1.8; margin-bottom: 16px; }
        .legal-wrap ul { padding-left: 24px; margin-bottom: 16px; }
        .legal-wrap li { font-size: 15px; color: #888; line-height: 1.8; margin-bottom: 6px; }
        .legal-wrap a { color: #cc0000; text-decoration: none; }
        .legal-wrap a:hover { text-decoration: underline; }
        .nav-link { color: #888; text-decoration: none; font-size: 13px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #f0f0f0; }
        @media (max-width: 768px) { .legal-wrap { padding: 32px 20px 60px; } .legal-footer { padding: 36px 20px !important; } }
      `}</style>

      <Navbar />

      <div className="legal-wrap">
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '12px' }}>Legal</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: '14px', color: '#555' }}>Last updated: June 2026</p>
        </div>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Enginus (enginus.org), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our services. We reserve the right to modify these terms at any time, and continued use constitutes acceptance of any changes.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Enginus provides online structural engineering calculators and design tools. Our services include:
        </p>
        <ul>
          <li><strong>Free Tools</strong> — Beam calculator, unit converter, rebar calculator, and seismic base shear calculator, available without an account</li>
          <li><strong>Pro Tools</strong> — Advanced calculators including RC beam design, RC slab design, RC column design, and section properties calculator, available with a Pro subscription</li>
        </ul>

        <h2>3. User Accounts</h2>
        <p>To access certain features, you may need to create an account. You are responsible for:</p>
        <ul>
          <li>Providing accurate and complete registration information</li>
          <li>Maintaining the security of your account credentials</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized access</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate accounts that violate these terms or are used for unauthorized purposes.
        </p>

        <h2>4. Disclaimer of Engineering Results</h2>
        <p style={{ color: '#ccc', fontWeight: 500 }}>
          IMPORTANT: All calculations provided by Enginus are for educational and preliminary design purposes only. Results are NOT a substitute for professional engineering judgment.
        </p>
        <ul>
          <li>Calculations are based on simplified classical structural theory and code provisions</li>
          <li>Results must be independently verified by a licensed structural engineer before use in actual design or construction</li>
          <li>Users are solely responsible for verifying compliance with applicable building codes and standards</li>
          <li>Enginus does not guarantee the accuracy, completeness, or fitness of any calculation for a particular purpose</li>
        </ul>

        <h2>5. Pro Subscription</h2>
        <p>Pro features require a paid subscription. By subscribing, you agree to:</p>
        <ul>
          <li>Pay the applicable subscription fees as displayed at the time of purchase</li>
          <li>Automatic renewal unless cancelled before the renewal date</li>
          <li>No refunds for partial billing periods upon cancellation</li>
          <li>Pricing may change with 30 days&apos; notice before your next billing cycle</li>
        </ul>
        <p>
          We reserve the right to modify, suspend, or discontinue Pro features at any time. In case of discontinuation, we will provide a prorated refund for the remaining subscription period.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service for any unlawful purpose</li>
          <li>Attempt to reverse engineer, decompile, or extract source code from our tools</li>
          <li>Scrape, crawl, or automated access the service without permission</li>
          <li>Interfere with or disrupt the service infrastructure</li>
          <li>Impersonate any person or entity</li>
          <li>Share Pro account credentials with others</li>
        </ul>

        <h2>7. Intellectual Property</h2>
        <p>
          All content, design, code, calculators, algorithms, and documentation on Enginus are the intellectual property of Enginus and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from our content without explicit written permission.
        </p>
        <p>
          User-generated inputs and calculation results belong to the user. We claim no ownership over your engineering data or designs.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, ENGINUS AND ITS OWNERS, OPERATORS, AND CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
        </p>
        <ul>
          <li>Loss of profits, data, or business opportunities</li>
          <li>Structural failures, property damage, or personal injury resulting from reliance on calculations</li>
          <li>Service interruptions or data loss</li>
          <li>Errors or inaccuracies in calculation results</li>
        </ul>
        <p>
          Our total liability for any claim arising from these terms or use of our services shall not exceed the amount you paid to us in the 12 months preceding the claim, or $100 USD, whichever is greater.
        </p>

        <h2>9. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Enginus, its owners, and contributors from any claims, damages, losses, or expenses arising from your use of the service, violation of these terms, or reliance on calculation results for engineering design or construction.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these terms or use of our services shall be resolved through binding arbitration or in the courts of the applicable jurisdiction.
        </p>

        <h2>11. Severability</h2>
        <p>
          If any provision of these terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about these Terms of Service, contact us at:
        </p>
        <p style={{ color: '#ccc' }}>
          Email: <a href="mailto:legal@enginus.org">legal@enginus.org</a>
        </p>
      </div>

      <footer className="legal-footer" style={{ borderTop: '1px solid #1a1a1a', padding: '44px 48px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              ENGI<span style={{ color: '#cc0000' }}>NUS</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <a href="/calculators" className="nav-link">Calculators</a>
              <a href="/pro" className="nav-link">Pro Tools</a>
              <a href="/about" className="nav-link">About</a>
              <a href="/privacy" className="nav-link">Privacy Policy</a>
              <a href="/terms" className="nav-link">Terms of Service</a>
              <a href="/disclaimer" className="nav-link">Disclaimer</a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#444' }}>&copy; 2026 Enginus. All rights reserved.</div>
            <div style={{ fontSize: '12px', color: '#444', fontStyle: 'italic' }}>Results are for educational purposes. Always verify with a licensed engineer.</div>
          </div>
        </div>
      </footer>
    </main>
  )
}
