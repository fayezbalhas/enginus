'use client'

import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'

const offerings = [
  { icon: '⟂', title: 'Free Calculators', desc: 'Beam analysis, unit conversion, rebar sizing and more — all free, no login required.' },
  { icon: '◫', title: 'Excel Templates', desc: 'Professional design sheets for beams, slabs, columns and footings. Coming soon.' },
  { icon: '§', title: 'Code Support', desc: 'Every tool supports both Eurocode (EC) and ACI, so you can switch standards instantly.' },
  { icon: '⇄', title: 'Both Unit Systems', desc: 'Full SI and Imperial support across all calculators and templates.' },
]

export default function AboutPage() {
  const [visible, setVisible] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .nav-link { color: #888; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #f0f0f0; }

        .btn-primary {
          background: #cc0000; color: #fff; border: none; padding: 15px 34px;
          font-size: 15px; font-weight: 600; border-radius: 4px; cursor: pointer;
          text-decoration: none; display: inline-block; transition: all 0.25s;
          letter-spacing: 0.02em; position: relative; overflow: hidden; z-index: 1;
        }
        .btn-primary::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, #e60000, #ff2222); transition: left 0.35s ease; z-index: -1;
        }
        .btn-primary:hover::before { left: 0; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(204,0,0,0.4); }

        .offer-card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 30px 26px;
          transition: all 0.4s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden;
        }
        .offer-card:hover { border-color: #cc0000; transform: translateY(-5px); background: #151515; }
        .offer-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #cc0000, #ff4444); transform: scaleX(0);
          transition: transform 0.4s; transform-origin: left;
        }
        .offer-card:hover::before { transform: scaleX(1); }
        .offer-card .offer-icon { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); display: inline-block; }
        .offer-card:hover .offer-icon { transform: scale(1.2) rotate(-8deg); }

        .fade-up { opacity: 0; transform: translateY(40px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .fade-up.visible { opacity: 1; transform: translateY(0); }

        .about-section { padding: 80px 48px; max-width: 1000px; margin: 0 auto; }
        .offers-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

        @media (max-width: 768px) {
          .about-section { padding: 60px 20px !important; }
          .offers-grid { grid-template-columns: 1fr !important; }
          .about-footer { padding: 36px 20px !important; }
          .about-hero { padding: 80px 20px 60px !important; }
          .btn-primary { min-height: 44px; padding: 14px 24px !important; font-size: 14px !important; }
        }
        @media (max-width: 480px) {
          .about-section { padding: 48px 16px !important; }
          .about-hero { padding: 70px 16px 48px !important; }
          .about-footer { padding: 28px 16px !important; }
        }
      `}</style>

      <Navbar activePage="about" />

      {/* Hero */}
      <section className="about-hero" style={{ padding: '100px 48px 80px', borderBottom: '1px solid #1a1a1a', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(204,0,0,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div id="hero" data-animate className={`fade-up${visible['hero'] ? ' visible' : ''}`}>
            <div style={{ display: 'inline-block', background: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '3px', padding: '7px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#ff4444', marginBottom: '28px', textTransform: 'uppercase' }}>
              About
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, marginBottom: '24px' }}>
              Built by Engineers,<br /><span style={{ color: '#cc0000' }}>for Engineers.</span>
            </h1>
            <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.75, maxWidth: '600px', fontWeight: 300 }}>
              Enginus is a structural engineering tools platform offering free web calculators and professional design templates &mdash; supporting Eurocode and ACI, in both SI and Imperial units.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="about-section" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div id="mission" data-animate className={`fade-up${visible['mission'] ? ' visible' : ''}`}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>Our Mission</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '20px' }}>
            Accessible tools for every engineer.
          </h2>
          <p style={{ fontSize: '17px', color: '#888', lineHeight: 1.8, maxWidth: '650px' }}>
            Our mission is to make professional structural engineering tools accessible to every engineer and student, regardless of location or budget. Whether you&apos;re in a top firm or studying from your phone, you should have access to reliable, transparent calculation tools.
          </p>
        </div>
      </section>

      {/* What We Offer */}
      <section className="about-section" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div id="offer-header" data-animate className={`fade-up${visible['offer-header'] ? ' visible' : ''}`} style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>What We Offer</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Everything you need to calculate.
          </h2>
        </div>
        <div className="offers-grid">
          {offerings.map((item, i) => (
            <div key={i} id={`offer-${i}`} data-animate className={`offer-card fade-up${visible[`offer-${i}`] ? ' visible' : ''}`} style={{ transitionDelay: `${(i % 2) * 0.1}s` }}>
              <span className="offer-icon" style={{ fontSize: '28px', color: '#cc0000', display: 'block', marginBottom: '18px' }}>{item.icon}</span>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#f0f0f0', marginBottom: '10px', letterSpacing: '-0.01em' }}>{item.title}</h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.65 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Approach */}
      <section className="about-section" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div id="tech" data-animate className={`fade-up${visible['tech'] ? ' visible' : ''}`}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>Technical Approach</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '20px' }}>
            No black boxes.
          </h2>
          <p style={{ fontSize: '17px', color: '#888', lineHeight: 1.8, maxWidth: '650px' }}>
            Our calculators use classical elastic beam theory and code-compliant formulas. Every result is traceable &mdash; we show the equations behind every output so you can verify the engineering, not just trust the software.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="about-section" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div id="contact" data-animate className={`fade-up${visible['contact'] ? ' visible' : ''}`}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>Contact</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '20px' }}>
            Get in touch.
          </h2>
          <p style={{ fontSize: '17px', color: '#888', lineHeight: 1.8, marginBottom: '28px', maxWidth: '650px' }}>
            Have a suggestion or found a bug? We&apos;d love to hear from you.
          </p>
          <a href="mailto:contact@enginus.org" className="btn-primary">contact@enginus.org</a>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="about-section">
        <div id="disclaimer" data-animate className={`fade-up${visible['disclaimer'] ? ' visible' : ''}`} style={{ background: '#0e0e0e', border: '1px solid #1e1e1e', borderLeft: '4px solid #cc0000', borderRadius: '8px', padding: '32px 36px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '12px' }}>Disclaimer</div>
          <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.75 }}>
            All calculators are for educational and preliminary design purposes. Always verify results with a licensed engineer before use in practice. Enginus assumes no liability for the use of its tools in professional work.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="about-footer" style={{ borderTop: '1px solid #1a1a1a', padding: '44px 48px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              ENGI<span style={{ color: '#cc0000' }}>NUS</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <a href="/calculators" className="nav-link" style={{ fontSize: '13px' }}>Calculators</a>
              <a href="/pro" className="nav-link" style={{ fontSize: '13px' }}>Pro Tools</a>
              <a href="/about" className="nav-link" style={{ fontSize: '13px' }}>About</a>
              <a href="/privacy" className="nav-link" style={{ fontSize: '13px' }}>Privacy Policy</a>
              <a href="/terms" className="nav-link" style={{ fontSize: '13px' }}>Terms of Service</a>
              <a href="/disclaimer" className="nav-link" style={{ fontSize: '13px' }}>Disclaimer</a>
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
