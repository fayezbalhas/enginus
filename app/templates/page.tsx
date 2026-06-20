'use client'

import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'

const templates = [
  { name: 'RC Beam Design Sheet', price: '$12', tags: ['Eurocode', 'ACI', 'RC'] },
  { name: 'RC Slab Design Sheet', price: '$10', tags: ['Eurocode', 'ACI', 'RC'] },
  { name: 'RC Column Design Sheet', price: '$12', tags: ['Eurocode', 'ACI', 'RC'] },
  { name: 'Steel Beam Design Sheet', price: '$12', tags: ['Eurocode', 'AISC', 'Steel'] },
  { name: 'Foundation Design Sheet', price: '$10', tags: ['Eurocode', 'ACI', 'Geotech'] },
  { name: 'RC Design Bundle', price: '$39', tags: ['Eurocode', 'ACI', 'Bundle'] },
]

const faqs = [
  { q: 'What format are the templates in?', a: 'All templates are fully unlocked Microsoft Excel (.xlsx) files. No macros, no passwords — you own the sheet and can edit anything.' },
  { q: 'Which design codes are supported?', a: 'Each template supports both Eurocode (EC2/EC3) and ACI (318/360) standards, with toggleable unit systems (SI and Imperial).' },
  { q: 'Can I use these for real projects?', a: 'The templates are designed for professional use. However, always verify results with a licensed engineer and apply your own engineering judgement before relying on any output.' },
  { q: 'What is included in the RC Design Bundle?', a: 'The bundle includes the RC Beam, RC Slab, RC Column, and Foundation design sheets — all four at a discounted price.' },
  { q: 'Will more templates be added?', a: 'Yes. We are actively developing steel connection, retaining wall, and staircase design sheets. Sign up above to be notified when new templates launch.' },
]

export default function TemplatesPage() {
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [email, setEmail] = useState('')

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
          font-family: 'Inter', sans-serif;
        }
        .btn-primary::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, #e60000, #ff2222); transition: left 0.35s ease; z-index: -1;
        }
        .btn-primary:hover::before { left: 0; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(204,0,0,0.4); }

        .template-card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 28px 24px;
          position: relative; overflow: hidden; transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .template-card:hover { border-color: #333; }

        .template-overlay {
          position: absolute; inset: 0; background: rgba(10,10,10,0.55);
          backdrop-filter: blur(1.5px); -webkit-backdrop-filter: blur(1.5px);
          display: flex; align-items: center; justify-content: center; z-index: 2;
          border-radius: 8px;
        }

        .lock-icon {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(204,0,0,0.12); border: 1px solid rgba(204,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; color: #cc0000;
        }

        .coming-badge {
          position: absolute; top: 16px; right: 16px; z-index: 3;
          background: rgba(204,0,0,0.15); border: 1px solid rgba(204,0,0,0.3);
          color: #ff4444; font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
          padding: 5px 12px; border-radius: 3px; text-transform: uppercase;
        }

        .tag-pill { background: rgba(255,255,255,0.06); color: #666; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; padding: 3px 8px; border-radius: 2px; }

        .email-input {
          background: #111; border: 1px solid #2a2a2a; color: #f0f0f0; padding: 14px 18px;
          font-size: 15px; border-radius: 4px; outline: none; transition: border-color 0.2s;
          flex: 1; min-width: 0; font-family: 'Inter', sans-serif;
        }
        .email-input::placeholder { color: #444; }
        .email-input:focus { border-color: #cc0000; }

        .faq-item { border-bottom: 1px solid #1a1a1a; }
        .faq-question {
          display: flex; justify-content: space-between; align-items: center; gap: 16px;
          padding: 22px 0; cursor: pointer; transition: color 0.2s; width: 100%;
          background: none; border: none; color: #ccc; font-size: 16px; font-weight: 500;
          text-align: left; font-family: 'Inter', sans-serif; letter-spacing: -0.01em;
        }
        .faq-question:hover { color: #f0f0f0; }
        .faq-chevron {
          font-size: 18px; color: #444; transition: transform 0.3s, color 0.3s;
          flex-shrink: 0; width: 20px; text-align: center;
        }
        .faq-chevron.open { transform: rotate(180deg); color: #cc0000; }
        .faq-answer {
          overflow: hidden; max-height: 0; transition: max-height 0.35s ease, padding 0.35s ease;
          padding: 0 0;
        }
        .faq-answer.open { max-height: 200px; padding: 0 0 22px; }

        .fade-up { opacity: 0; transform: translateY(40px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .fade-up.visible { opacity: 1; transform: translateY(0); }

        .templates-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

        @media (max-width: 768px) {
          .templates-grid { grid-template-columns: 1fr !important; }
          .tmpl-hero { padding: 80px 20px 60px !important; }
          .tmpl-section { padding: 60px 20px !important; }
          .tmpl-footer { padding: 36px 20px !important; }
          .email-row { flex-direction: column !important; }
          .btn-primary { min-height: 44px; padding: 14px 24px !important; font-size: 14px !important; width: 100%; text-align: center; }
          .email-input { width: 100%; }
        }
        @media (max-width: 480px) {
          .tmpl-hero { padding: 70px 16px 48px !important; }
          .tmpl-section { padding: 48px 16px !important; }
          .tmpl-footer { padding: 28px 16px !important; }
        }
      `}</style>

      <Navbar activePage="templates" />

      {/* Hero */}
      <section className="tmpl-hero" style={{ padding: '100px 48px 80px', borderBottom: '1px solid #1a1a1a', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(204,0,0,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div id="hero" data-animate className={`fade-up${visible['hero'] ? ' visible' : ''}`}>
            <div style={{ display: 'inline-block', background: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '3px', padding: '7px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#ff4444', marginBottom: '28px', textTransform: 'uppercase' }}>
              Coming Soon
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(32px, 5.5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, marginBottom: '20px' }}>
              Professional Design<br /><span style={{ color: '#cc0000' }}>Templates</span>
            </h1>
            <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.75, fontWeight: 300, maxWidth: '560px', margin: '0 auto' }}>
              We are building a library of professional Excel design sheets for structural engineers. Sign up to be notified when they launch.
            </p>
          </div>

          {/* Email signup */}
          <div id="signup" data-animate className={`fade-up${visible['signup'] ? ' visible' : ''}`} style={{ transitionDelay: '0.15s', marginTop: '40px' }}>
            <form onSubmit={(e) => e.preventDefault()} className="email-row" style={{ display: 'flex', gap: '12px', maxWidth: '480px', margin: '0 auto' }}>
              <input
                type="email"
                className="email-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
              <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Notify Me</button>
            </form>
            <p style={{ fontSize: '13px', color: '#444', marginTop: '14px' }}>No spam. Just a one-time launch email.</p>
          </div>
        </div>
      </section>

      {/* Template Preview Cards */}
      <section className="tmpl-section" style={{ padding: '80px 48px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div id="cards-header" data-animate className={`fade-up${visible['cards-header'] ? ' visible' : ''}`} style={{ marginBottom: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>Preview</div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              What&apos;s coming
            </h2>
          </div>

          <div className="templates-grid">
            {templates.map((tmpl, i) => (
              <div key={i} id={`tmpl-${i}`} data-animate className={`template-card fade-up${visible[`tmpl-${i}`] ? ' visible' : ''}`} style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
                <div className="coming-badge">Coming Soon</div>
                <div className="template-overlay">
                  <div className="lock-icon">🔒</div>
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  {/* Spreadsheet icon */}
                  <div style={{ width: '44px', height: '44px', background: 'rgba(204,0,0,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '20px', color: '#cc0000' }}>◫</span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f0', marginBottom: '8px', letterSpacing: '-0.01em' }}>{tmpl.name}</h3>

                  {/* Price */}
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#cc0000', marginBottom: '16px' }}>{tmpl.price}</div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {tmpl.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="tmpl-section" style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div id="faq-header" data-animate className={`fade-up${visible['faq-header'] ? ' visible' : ''}`} style={{ marginBottom: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>FAQ</div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Common questions
            </h2>
          </div>

          <div id="faq-list" data-animate className={`fade-up${visible['faq-list'] ? ' visible' : ''}`}>
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item">
                <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span className={`faq-chevron${openFaq === i ? ' open' : ''}`}>▾</span>
                </button>
                <div className={`faq-answer${openFaq === i ? ' open' : ''}`}>
                  <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.7 }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="tmpl-footer" style={{ borderTop: '1px solid #1a1a1a', padding: '44px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
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
