export default function TemplatesPage() {
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

        .status-badge {
          display: inline-block; background: rgba(204,0,0,0.1); border: 1px solid rgba(204,0,0,0.3);
          border-radius: 3px; padding: 7px 18px; font-size: 11px; font-weight: 700;
          letter-spacing: 0.14em; color: #ff4444; margin-bottom: 28px; text-transform: uppercase;
        }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #1a1a1a', padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', textDecoration: 'none', color: '#f0f0f0' }}>
          ENGI<span style={{ color: '#cc0000' }}>NUS</span>
        </a>
        <div style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          <a href="/calculators" className="nav-link">Calculators</a>
          <a href="/templates" className="nav-link" style={{ color: '#f0f0f0' }}>Templates</a>
          <a href="/about" className="nav-link">About</a>
          <a href="/templates" className="btn-primary">Get Templates</a>
        </div>
      </nav>

      {/* Content */}
      <section style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ maxWidth: '600px' }}>
          <div className="status-badge">Coming Soon</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '16px' }}>
            Templates
          </h1>
          <p style={{ fontSize: '17px', color: '#666', lineHeight: 1.7, marginBottom: '8px' }}>
            Professional Excel design templates for beams, slabs, columns and footings &mdash; built to Eurocode and ACI, fully unlocked and editable.
          </p>
          <p style={{ fontSize: '17px', color: '#666', lineHeight: 1.7 }}>
            We&apos;re putting the finishing touches on the first pack. Check back soon.
          </p>
          <a href="/calculators" className="btn-primary" style={{ marginTop: '32px' }}>Explore Free Calculators</a>
        </div>
      </section>
    </main>
  )
}
