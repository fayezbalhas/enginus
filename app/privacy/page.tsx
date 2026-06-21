'use client'

import Navbar from '../components/Navbar'

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p style={{ fontSize: '14px', color: '#555' }}>Last updated: June 2026</p>
        </div>

        <h2>1. Introduction</h2>
        <p>
          Enginus (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at enginus.org and use our structural engineering tools.
        </p>

        <h2>2. Data We Collect</h2>
        <h3>Account Information</h3>
        <ul>
          <li>Email address (when you create an account)</li>
          <li>Display name (optional)</li>
          <li>Account preferences and settings</li>
        </ul>

        <h3>Usage Data</h3>
        <ul>
          <li>Pages visited and features used</li>
          <li>Calculator inputs and interactions (anonymized)</li>
          <li>Device type, browser, and operating system</li>
          <li>IP address (anonymized for analytics)</li>
          <li>Referring website and session duration</li>
        </ul>

        <h3>Cookies &amp; Tracking</h3>
        <ul>
          <li>Authentication cookies (to keep you signed in)</li>
          <li>Analytics cookies (to understand usage patterns)</li>
          <li>Advertising cookies (served by Google AdSense)</li>
          <li>Preference cookies (to remember your settings)</li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <ul>
          <li>Account creation and management</li>
          <li>Providing and improving our calculators and tools</li>
          <li>Analytics to understand how our tools are used</li>
          <li>Serving relevant advertisements via Google AdSense</li>
          <li>Sending account-related communications</li>
          <li>Preventing fraud and abuse</li>
        </ul>

        <h2>4. Third-Party Services</h2>
        <p>We use the following third-party services that may collect data:</p>
        <ul>
          <li><strong>Supabase</strong> — Authentication and database services. Data stored securely in compliance with SOC 2 Type II.</li>
          <li><strong>Vercel Analytics</strong> — Privacy-focused website analytics. No personally identifiable information is collected.</li>
          <li><strong>Google AdSense</strong> — Advertising network. Google may use cookies to serve ads based on your browsing history. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.</li>
        </ul>

        <h2>5. Cookie Policy</h2>
        <p>
          We use cookies and similar technologies to enhance your experience. You can control cookie preferences through your browser settings. Disabling certain cookies may limit functionality such as staying signed in or saving preferences.
        </p>
        <ul>
          <li><strong>Essential cookies</strong> — Required for authentication and core functionality. Cannot be disabled.</li>
          <li><strong>Analytics cookies</strong> — Help us understand usage patterns. Can be disabled.</li>
          <li><strong>Advertising cookies</strong> — Used by Google AdSense for personalized ads. Can be disabled.</li>
        </ul>

        <h2>6. Data Retention</h2>
        <p>
          We retain your personal data only for as long as necessary to provide our services and fulfill the purposes described in this policy. Account data is retained until you delete your account. Anonymized analytics data may be retained indefinitely.
        </p>

        <h2>7. Your Rights (GDPR)</h2>
        <p>Under the General Data Protection Regulation (GDPR) and similar laws, you have the right to:</p>
        <ul>
          <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
          <li><strong>Rectification</strong> — Request correction of inaccurate data</li>
          <li><strong>Erasure</strong> — Request deletion of your personal data</li>
          <li><strong>Data portability</strong> — Request an export of your data in a machine-readable format</li>
          <li><strong>Restriction</strong> — Request that we limit processing of your data</li>
          <li><strong>Objection</strong> — Object to processing based on legitimate interests</li>
          <li><strong>Withdraw consent</strong> — Withdraw consent for data processing at any time</li>
        </ul>
        <p>To exercise any of these rights, contact us at <a href="mailto:privacy@enginus.org">privacy@enginus.org</a>.</p>

        <h2>8. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes encryption in transit (TLS), secure authentication via Supabase, and regular security reviews.
        </p>

        <h2>9. Children&apos;s Privacy</h2>
        <p>
          Our services are not directed to individuals under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us at <a href="mailto:privacy@enginus.org">privacy@enginus.org</a>.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Continued use of our services after changes constitutes acceptance of the updated policy.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:
        </p>
        <p style={{ color: '#ccc' }}>
          Email: <a href="mailto:privacy@enginus.org">privacy@enginus.org</a>
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
