'use client'

import Navbar from '../components/Navbar'

export default function DisclaimerPage() {
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
        .disclaimer-box { background: #111; border: 1px solid #1e1e1e; border-left: 4px solid #cc0000; border-radius: 8px; padding: 28px 32px; margin: 32px 0; }
        .disclaimer-box p { color: #ccc; font-weight: 500; margin-bottom: 12px; }
        .disclaimer-box p:last-child { margin-bottom: 0; }
        .nav-link { color: #888; text-decoration: none; font-size: 13px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #f0f0f0; }
        @media (max-width: 768px) { .legal-wrap { padding: 32px 20px 60px; } .legal-footer { padding: 36px 20px !important; } .disclaimer-box { padding: 20px !important; } }
      `}</style>

      <Navbar />

      <div className="legal-wrap">
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '12px' }}>Important Notice</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Engineering Disclaimer
          </h1>
          <p style={{ fontSize: '14px', color: '#555' }}>Last updated: June 2026</p>
        </div>

        <div className="disclaimer-box">
          <p style={{ fontSize: '16px' }}>
            All calculations and results provided by Enginus are for educational and preliminary design purposes only. They are NOT a substitute for professional engineering judgment, detailed analysis, or licensed engineering review.
          </p>
        </div>

        <h2>1. Nature of Calculations</h2>
        <p>
          All calculators on Enginus are based on classical structural theory, simplified analytical methods, and standard design code provisions (Eurocode 2, ACI 318, EC8, ASCE 7, and others). These calculations involve inherent simplifications and assumptions that may not apply to all real-world situations.
        </p>
        <ul>
          <li>Calculations assume idealized material behavior and loading conditions</li>
          <li>Complex phenomena such as nonlinear behavior, dynamic effects, soil-structure interaction, and construction tolerances may not be fully accounted for</li>
          <li>Code provisions are simplified versions of complex structural behavior</li>
          <li>Input parameters significantly affect results — small errors in input can lead to significantly different outputs</li>
        </ul>

        <h2>2. Professional Verification Required</h2>
        <p style={{ color: '#ccc', fontWeight: 500 }}>
          All results from Enginus calculators MUST be independently verified by a qualified and licensed structural engineer before being used in any actual structural design or construction project.
        </p>
        <ul>
          <li>A licensed structural engineer must review and approve all designs</li>
          <li>Results should be cross-checked with established engineering software</li>
          <li>Site-specific conditions, local codes, and project requirements must be considered</li>
          <li>Appropriate factors of safety and engineering judgment must be applied</li>
        </ul>

        <h2>3. No Liability for Structural Outcomes</h2>
        <p>
          Enginus, its owners, developers, and contributors accept NO liability whatsoever for:
        </p>
        <ul>
          <li>Structural failures, collapses, or damage of any kind</li>
          <li>Personal injury or loss of life</li>
          <li>Property damage or financial loss</li>
          <li>Construction defects or non-compliance with building codes</li>
          <li>Any consequence arising from the use or misuse of our calculators</li>
        </ul>

        <h2>4. Code Compliance</h2>
        <p>
          Users are solely responsible for ensuring that their designs comply with all applicable building codes, standards, and regulations in their jurisdiction. Enginus calculators reference specific code editions, but:
        </p>
        <ul>
          <li>Local amendments and national annexes may modify standard provisions</li>
          <li>Code editions are updated periodically — verify you are using the current applicable version</li>
          <li>Not all code clauses and checks are implemented in our calculators</li>
          <li>Detailing requirements, serviceability checks, and durability provisions may not be fully covered</li>
        </ul>

        <h2>5. Not a Replacement for Professional Software</h2>
        <p>
          Enginus is designed as an educational and preliminary design aid. It is NOT a replacement for professional structural engineering software such as finite element analysis programs, detailed design suites, or building information modeling tools. Professional projects require:
        </p>
        <ul>
          <li>Comprehensive structural analysis software with validated solvers</li>
          <li>Full 3D modeling of structural systems</li>
          <li>Load combination generation per applicable codes</li>
          <li>Detailed connection design and detailing</li>
          <li>Progressive collapse and robustness checks where required</li>
        </ul>

        <h2>6. User Responsibility</h2>
        <p>
          By using Enginus, you acknowledge and agree that:
        </p>
        <ul>
          <li>You understand the limitations of simplified calculations</li>
          <li>You will not use results directly for construction without professional review</li>
          <li>You accept full responsibility for any engineering decisions made using our tools</li>
          <li>You will verify all results independently before relying on them</li>
          <li>You have the necessary engineering knowledge to interpret results correctly, or will seek professional guidance</li>
        </ul>

        <h2>7. Accuracy Statement</h2>
        <p>
          While we strive for accuracy in our implementations, we cannot guarantee that our calculators are free from errors. Software bugs, rounding differences, and interpretation differences in code provisions may exist. If you identify any errors, please report them to <a href="mailto:legal@enginus.org">legal@enginus.org</a>.
        </p>

        <div className="disclaimer-box" style={{ marginTop: '48px' }}>
          <p style={{ fontSize: '14px', color: '#ff4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            Summary
          </p>
          <p>
            Use Enginus for learning, quick checks, and preliminary estimates. Always have a licensed structural engineer verify and approve any design before construction. We are not responsible for how you use our results.
          </p>
        </div>
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
