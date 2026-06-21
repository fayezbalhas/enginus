'use client'

import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'

const freePlan = {
  name: 'Free',
  price: '$0',
  period: 'forever',
  desc: 'Core structural calculators — no account needed.',
  features: [
    'Beam Calculator',
    'Unit Converter',
    'Rebar Calculator',
    'SI + Imperial units',
    'Eurocode + ACI support',
    'Forever free',
  ],
  cta: 'Start Calculating',
  href: '/calculators',
  highlighted: false,
}

const proPlan = {
  name: 'Pro',
  priceMonthly: '$9',
  priceYearly: '$49',
  desc: 'Professional-grade design calculators for real projects.',
  features: [
    'Everything in Free',
    'RC Beam Design Calculator',
    'RC Slab Design Calculator',
    'RC Column Design Calculator',
    'Steel Beam Design Calculator',
    'Foundation Design Calculator',
    'Priority support',
  ],
  cta: 'Get Started',
  href: '/pro/subscribe',
  highlighted: true,
}

const faqs = [
  { q: 'What do I get with the Free plan?', a: 'The Free plan includes the Beam Calculator, Unit Converter, and Rebar Calculator — with full Eurocode and ACI support in both SI and Imperial units. No account required.' },
  { q: 'Can I switch between monthly and yearly?', a: 'Yes. You can switch between billing cycles at any time. When upgrading to yearly, you get the equivalent of 7 months free.' },
  { q: 'What design codes are supported?', a: 'All Pro tools support Eurocode (EC2/EC3) and ACI (318), with toggleable SI and Imperial unit systems.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel your subscription at any time — no long-term contracts, no hidden fees.' },
]

export default function ProPage() {
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [yearly, setYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
          text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
          transition: all 0.25s; letter-spacing: 0.02em; position: relative; overflow: hidden; z-index: 1;
          font-family: 'Inter', sans-serif; width: 100%;
        }
        .btn-primary::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, #e60000, #ff2222); transition: left 0.35s ease; z-index: -1;
        }
        .btn-primary:hover::before { left: 0; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(204,0,0,0.4); }

        .btn-outline {
          background: transparent; color: #ccc; border: 1px solid #333; padding: 15px 34px;
          font-size: 15px; font-weight: 600; border-radius: 4px; cursor: pointer;
          text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
          transition: all 0.25s; letter-spacing: 0.02em; font-family: 'Inter', sans-serif; width: 100%;
        }
        .btn-outline:hover { border-color: #cc0000; color: #fff; transform: translateY(-2px); background: rgba(204,0,0,0.05); }

        .pricing-card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 10px; padding: 40px 32px;
          position: relative; overflow: hidden; transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          display: flex; flex-direction: column;
        }
        .pricing-card:hover { transform: translateY(-4px); }
        .pricing-card.highlighted { border-color: #cc0000; background: #121212; }
        .pricing-card.highlighted::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #cc0000, #ff4444);
        }

        .toggle-track {
          width: 44px; height: 24px; border-radius: 12px; background: #222; border: 1px solid #333;
          cursor: pointer; position: relative; transition: all 0.25s; flex-shrink: 0;
        }
        .toggle-track.active { background: #cc0000; border-color: #cc0000; }
        .toggle-thumb {
          width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute;
          top: 2px; left: 2px; transition: transform 0.25s;
        }
        .toggle-track.active .toggle-thumb { transform: translateX(20px); }

        .check-icon { color: #cc0000; font-size: 14px; flex-shrink: 0; width: 20px; }
        .feature-text { font-size: 14px; color: #999; line-height: 1.5; }
        .feature-row { display: flex; align-items: flex-start; gap: 10px; }

        .save-badge {
          background: rgba(204,0,0,0.15); border: 1px solid rgba(204,0,0,0.3);
          color: #ff4444; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          padding: 4px 10px; border-radius: 3px; display: inline-block;
        }

        .popular-badge {
          position: absolute; top: -1px; right: 24px;
          background: #cc0000; color: #fff; font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; padding: 6px 14px; border-radius: 0 0 4px 4px;
          text-transform: uppercase;
        }

        .faq-item { border-bottom: 1px solid #1a1a1a; }
        .faq-question {
          display: flex; justify-content: space-between; align-items: center; gap: 16px;
          padding: 22px 0; cursor: pointer; width: 100%;
          background: none; border: none; color: #ccc; font-size: 16px; font-weight: 500;
          text-align: left; font-family: 'Inter', sans-serif; letter-spacing: -0.01em;
          transition: color 0.2s;
        }
        .faq-question:hover { color: #f0f0f0; }
        .faq-chevron {
          font-size: 18px; color: #444; transition: transform 0.3s, color 0.3s;
          flex-shrink: 0; width: 20px; text-align: center;
        }
        .faq-chevron.open { transform: rotate(180deg); color: #cc0000; }
        .faq-answer { overflow: hidden; max-height: 0; transition: max-height 0.35s ease, padding 0.35s ease; padding: 0; }
        .faq-answer.open { max-height: 200px; padding: 0 0 22px; }

        .fade-up { opacity: 0; transform: translateY(40px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .fade-up.visible { opacity: 1; transform: translateY(0); }

        .pricing-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; max-width: 780px; margin: 0 auto; }

        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 420px; }
          .pro-hero { padding: 80px 20px 60px !important; }
          .pro-section { padding: 60px 20px !important; }
          .pro-footer { padding: 36px 20px !important; }
          .pricing-card { padding: 32px 24px; }
          .btn-primary, .btn-outline { min-height: 48px; }
        }
        @media (max-width: 480px) {
          .pro-hero { padding: 70px 16px 48px !important; }
          .pro-section { padding: 48px 16px !important; }
          .pro-footer { padding: 28px 16px !important; }
        }
      `}</style>

      <Navbar activePage="pro" />

      {/* Hero */}
      <section className="pro-hero" style={{ padding: '100px 48px 80px', borderBottom: '1px solid #1a1a1a', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(204,0,0,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div id="hero" data-animate className={`fade-up${visible['hero'] ? ' visible' : ''}`}>
            <div style={{ display: 'inline-block', background: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '3px', padding: '7px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#ff4444', marginBottom: '28px', textTransform: 'uppercase' }}>
              Pro Tools
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, marginBottom: '20px' }}>
              Enginus <span style={{ color: '#cc0000' }}>Pro</span>
            </h1>
            <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.75, fontWeight: 300, maxWidth: '540px', margin: '0 auto' }}>
              Unlock professional-grade structural design tools. Full code-compliant calculators for beams, slabs, columns, foundations and more.
            </p>
          </div>

          {/* Billing toggle */}
          <div id="toggle" data-animate className={`fade-up${visible['toggle'] ? ' visible' : ''}`} style={{ transitionDelay: '0.15s', marginTop: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: yearly ? '#666' : '#f0f0f0', transition: 'color 0.2s' }}>Monthly</span>
            <div className={`toggle-track${yearly ? ' active' : ''}`} onClick={() => setYearly(!yearly)}>
              <div className="toggle-thumb" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500, color: yearly ? '#f0f0f0' : '#666', transition: 'color 0.2s' }}>Yearly</span>
            {yearly && <span className="save-badge">Save 55%</span>}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pro-section" style={{ padding: '80px 48px', borderBottom: '1px solid #1a1a1a' }}>
        <div className="pricing-grid">
          {/* Free Card */}
          <div id="card-free" data-animate className={`pricing-card fade-up${visible['card-free'] ? ' visible' : ''}`}>
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{freePlan.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '12px' }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '42px', fontWeight: 700, letterSpacing: '-0.03em' }}>{freePlan.price}</span>
                <span style={{ fontSize: '14px', color: '#666' }}>{freePlan.period}</span>
              </div>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>{freePlan.desc}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px', flex: 1 }}>
              {freePlan.features.map((f, i) => (
                <div key={i} className="feature-row">
                  <span className="check-icon">✓</span>
                  <span className="feature-text">{f}</span>
                </div>
              ))}
            </div>

            <a href={freePlan.href} className="btn-outline">{freePlan.cta}</a>
          </div>

          {/* Pro Card */}
          <div id="card-pro" data-animate className={`pricing-card highlighted fade-up${visible['card-pro'] ? ' visible' : ''}`} style={{ transitionDelay: '0.1s' }}>
            <div className="popular-badge">Most Popular</div>

            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{proPlan.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '12px' }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '42px', fontWeight: 700, letterSpacing: '-0.03em', color: '#cc0000' }}>
                  {yearly ? proPlan.priceYearly : proPlan.priceMonthly}
                </span>
                <span style={{ fontSize: '14px', color: '#666' }}>/ {yearly ? 'year' : 'month'}</span>
              </div>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>{proPlan.desc}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px', flex: 1 }}>
              {proPlan.features.map((f, i) => (
                <div key={i} className="feature-row">
                  <span className="check-icon">✓</span>
                  <span className="feature-text" style={i === 0 ? { color: '#ccc', fontWeight: 500 } : undefined}>{f}</span>
                </div>
              ))}
            </div>

            <a href={proPlan.href} className="btn-primary">{proPlan.cta}</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pro-section" style={{ padding: '80px 48px' }}>
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
                  <span className={`faq-chevron${openFaq === i ? ' open' : ''}`}>&#x25BE;</span>
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
      <footer className="pro-footer" style={{ borderTop: '1px solid #1a1a1a', padding: '44px 48px' }}>
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
