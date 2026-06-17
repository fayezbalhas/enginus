import Navbar from '../components/Navbar'

export default function AboutPage() {
  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .nav-link { color: #888; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #f0f0f0; }

        .btn-primary {
          background: #cc0000; color: #fff; border: none; padding: 10px 22px;
          font-size: 13px; font-weight: 600; border-radius: 4px; cursor: pointer;
          text-decoration: none; display: inline-block; transition: all 0.2s;
        }
        .btn-primary:hover { background: #e60000; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(204,0,0,0.35); }

        @media (max-width: 768px) {
          .about-content { padding: 60px 20px !important; }
          .about-footer { padding: 36px 20px !important; }
          .btn-primary { min-height: 44px; display: flex; align-items: center; justify-content: center; }
        }
      `}</style>

      {/* Navbar */}
      <Navbar activePage="about" />

      {/* Content */}
      <section className="about-content" style={{ padding: '90px 48px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>About</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '24px' }}>
            Built by engineers,<br />for engineers.
          </h1>
          <p style={{ fontSize: '17px', color: '#999', lineHeight: 1.8, marginBottom: '20px' }}>
            Enginus is a free toolkit of structural engineering calculators and templates, built to remove the friction of everyday design work. Every calculator shows its formulas and supports both Eurocode and ACI, in SI and Imperial units.
          </p>
          <p style={{ fontSize: '17px', color: '#999', lineHeight: 1.8 }}>
            No accounts and no paywalls on the core tools &mdash; just fast, transparent calculations you can trust and hand off.
          </p>
          <a href="/calculators" className="btn-primary" style={{ marginTop: '36px' }}>Explore Calculators</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="about-footer" style={{ borderTop: '1px solid #1a1a1a', padding: '44px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          ENGI<span style={{ color: '#cc0000' }}>NUS</span>
        </div>
        <div style={{ fontSize: '13px', color: '#444' }}>&copy; 2025 Enginus. Built for engineers.</div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="/calculators" className="nav-link" style={{ fontSize: '13px' }}>Calculators</a>
          <a href="/templates" className="nav-link" style={{ fontSize: '13px' }}>Templates</a>
          <a href="/about" className="nav-link" style={{ fontSize: '13px' }}>About</a>
        </div>
      </footer>
    </main>
  )
}
