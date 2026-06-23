'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'

const calculators = [
  {
    slug: 'beam',
    icon: '⟂',
    name: 'Beam Calculator',
    desc: 'Reactions, shear force diagram, bending moment diagram and deflection for any beam type and loading.',
    tags: ['Structural', 'Analysis'],
    codes: ['EC', 'ACI'],
    units: ['SI', 'Imperial'],
    status: 'free' as const,
  },
  {
    slug: 'unit-converter',
    icon: '⇄',
    name: 'Unit Converter',
    desc: 'Convert force, moment, stress, pressure, length and distributed loads between SI and Imperial units instantly.',
    tags: ['Utility'],
    codes: ['EC', 'ACI'],
    units: ['SI', 'Imperial'],
    status: 'free' as const,
  },
  {
    slug: 'rebar',
    icon: '⦿',
    name: 'Rebar Calculator',
    desc: 'Calculate rebar areas, number of bars and spacing for any diameter. Supports EC and ACI bar designations.',
    tags: ['RC Design'],
    codes: ['EC', 'ACI'],
    units: ['SI', 'Imperial'],
    status: 'free' as const,
  },
  {
    slug: 'rc-beam',
    icon: '▧',
    name: 'RC Beam Design',
    desc: 'Complete flexure, shear and serviceability design per EC2 and ACI 318-19.',
    tags: ['RC Design', 'Pro Tools'],
    codes: ['EC2', 'ACI'],
    units: ['SI', 'Imperial'],
    status: 'pro' as const,
  },
  {
    slug: 'rc-slab',
    icon: '▤',
    name: 'RC Slab Design',
    desc: 'One-way and two-way slab design with moment coefficients per EC2 and ACI.',
    tags: ['RC Design', 'Pro Tools'],
    codes: ['EC2', 'ACI'],
    units: ['SI', 'Imperial'],
    status: 'pro' as const,
  },
  {
    slug: 'rc-column',
    icon: '▥',
    name: 'RC Column Design',
    desc: 'Axial and biaxial bending design with interaction diagram per EC2 and ACI.',
    tags: ['RC Design', 'Pro Tools'],
    codes: ['EC2', 'ACI'],
    units: ['SI', 'Imperial'],
    status: 'pro' as const,
  },
  {
    slug: 'section-properties',
    icon: '◫',
    name: 'Section Properties',
    desc: 'Area, moment of inertia, section modulus for standard and custom sections.',
    tags: ['Structural', 'Analysis', 'Pro Tools'],
    codes: ['EC', 'ACI'],
    units: ['SI', 'Imperial'],
    status: 'pro' as const,
  },
  {
    slug: 'seismic',
    icon: '⊕',
    name: 'Seismic Base Shear',
    desc: 'Equivalent static lateral force method per EC8 and ASCE 7. Includes site class and response spectrum.',
    tags: ['Seismic'],
    codes: ['EC8', 'ASCE 7'],
    units: ['SI', 'Imperial'],
    status: 'coming' as const,
  },
  {
    slug: 'wind',
    icon: '≋',
    name: 'Wind Load Calculator',
    desc: 'Wind pressure and force on structures per EN 1991-1-4 and ASCE 7-22.',
    tags: ['Loads'],
    codes: ['EC1', 'ASCE 7'],
    units: ['SI', 'Imperial'],
    status: 'coming' as const,
  },
]

const allTags = ['All', 'Pro Tools', 'Structural', 'RC Design', 'Steel', 'Seismic', 'Loads', 'Utility', 'Analysis']

export default function CalculatorsPage() {
  const [activeTag, setActiveTag] = useState('All')
  const [visible, setVisible] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setLoggedIn(true)
    })
    return () => clearTimeout(t)
  }, [])

  const filtered = activeTag === 'All'
    ? calculators
    : calculators.filter(c => c.tags.includes(activeTag))

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .filter-btn {
          background: transparent; color: #666; border: 1px solid #222; padding: 7px 16px;
          font-size: 12px; font-weight: 500; border-radius: 3px; cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.03em; font-family: 'Inter', sans-serif;
        }
        .filter-btn:hover { border-color: #444; color: #ccc; }
        .filter-btn.active { background: #cc0000; border-color: #cc0000; color: #fff; }

        .calc-card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 28px 24px;
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden;
          cursor: pointer; text-decoration: none; display: block; color: inherit;
        }
        .calc-card:hover { border-color: #cc0000; transform: translateY(-5px); background: #141414; box-shadow: 0 16px 40px rgba(0,0,0,0.4); }
        .calc-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #cc0000, #ff4444); transform: scaleX(0);
          transition: transform 0.35s; transform-origin: left;
        }
        .calc-card:hover::before { transform: scaleX(1); }
        .calc-card.coming { opacity: 0.5; cursor: default; pointer-events: none; }
        .calc-card.pro-card { border-color: rgba(204,0,0,0.25); }
        .calc-card.pro-card:hover { border-color: #cc0000; }

        .card-icon { transition: transform 0.35s cubic-bezier(0.16,1,0.3,1); display: inline-block; }
        .calc-card:hover .card-icon { transform: scale(1.2) rotate(-8deg); }

        .tag-pill { background: rgba(255,255,255,0.06); color: #666; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; padding: 3px 8px; border-radius: 2px; }
        .code-pill { background: rgba(204,0,0,0.1); color: #cc0000; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 2px; }

        .status-free { background: rgba(204,0,0,0.15); color: #ff4444; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 4px 9px; border-radius: 3px; }
        .status-pro { background: linear-gradient(135deg, rgba(204,0,0,0.2), rgba(234,179,8,0.15)); color: #eab308; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 4px 9px; border-radius: 3px; display: inline-flex; align-items: center; gap: 4px; }
        .status-coming { background: rgba(255,255,255,0.05); color: #555; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 4px 9px; border-radius: 3px; }

        .fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .fade-in.show { opacity: 1; transform: translateY(0); }

        .arrow-icon { opacity: 0; transform: translateX(-4px); transition: all 0.3s; font-size: 18px; color: #cc0000; }
        .calc-card:hover .arrow-icon { opacity: 1; transform: translateX(0); }

        .calc-grid { grid-template-columns: repeat(3, 1fr); }

        @media (max-width: 768px) {
          .calc-grid { grid-template-columns: 1fr !important; }
          .calcs-header { padding: 60px 20px 40px !important; }
          .calcs-body { padding: 40px 20px 80px !important; }
          .filter-btn { min-height: 44px; padding: 10px 16px; }
          .calc-card { padding: 22px 18px; }
        }
      `}</style>

      {/* Navbar */}
      <Navbar activePage="calculators" />

      {/* Header */}
      <section className="calcs-header" style={{ padding: '80px 48px 56px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className={`fade-in${visible ? ' show' : ''}`}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>Engineering Tools</div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '16px' }}>
              Structural Calculators
            </h1>
            <p style={{ fontSize: '17px', color: '#666', lineHeight: 1.7, maxWidth: '520px' }}>
              All calculators support Eurocode and ACI, with both SI and Imperial unit systems. Free tools require no login. Pro tools require a free account.
            </p>
          </div>

          {/* Filter tags */}
          <div className={`fade-in${visible ? ' show' : ''}`} style={{ marginTop: '36px', display: 'flex', gap: '8px', flexWrap: 'wrap', transitionDelay: '0.1s' }}>
            {allTags.map(tag => (
              <button key={tag} className={`filter-btn${activeTag === tag ? ' active' : ''}`} onClick={() => setActiveTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Calculators Grid */}
      <section className="calcs-body" style={{ padding: '56px 48px 100px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="calc-grid" style={{ display: 'grid', gap: '16px' }}>
            {filtered.map((calc, i) => {
              const isPro = calc.status === 'pro'
              const isComing = calc.status === 'coming'
              const href = isComing
                ? undefined
                : isPro && !loggedIn
                ? '/sign-in'
                : `/calculators/${calc.slug}`

              return (
                <a
                  key={calc.slug}
                  href={href}
                  className={`calc-card${isComing ? ' coming' : ''}${isPro ? ' pro-card' : ''} fade-in${visible ? ' show' : ''}`}
                  style={{ transitionDelay: `${0.15 + i * 0.07}s` }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <span className="card-icon" style={{ fontSize: '28px', color: isPro ? '#cc0000' : '#cc0000' }}>{calc.icon}</span>
                    {calc.status === 'free' && <span className="status-free">FREE</span>}
                    {calc.status === 'pro' && (
                      <span className="status-pro">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        PRO
                      </span>
                    )}
                    {calc.status === 'coming' && <span className="status-coming">COMING SOON</span>}
                  </div>

                  {/* Name & desc */}
                  <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#f0f0f0', marginBottom: '10px', letterSpacing: '-0.01em' }}>{calc.name}</h3>
                  <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.65, marginBottom: '22px' }}>{calc.desc}</p>

                  {/* Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {calc.codes.map(c => <span key={c} className="code-pill">{c}</span>)}
                    {calc.tags.filter(t => t !== 'Pro Tools').map(t => <span key={t} className="tag-pill">{t}</span>)}
                  </div>

                  {/* Arrow / CTA */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#444', fontWeight: 500 }}>
                      {isComing
                        ? 'In development'
                        : isPro && !loggedIn
                        ? 'Sign in for Pro access'
                        : 'Open calculator'}
                    </span>
                    <span className="arrow-icon">&rarr;</span>
                  </div>
                </a>
              )
            })}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#444' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>⊘</div>
              <p style={{ fontSize: '15px' }}>No calculators in this category yet.</p>
            </div>
          )}
        </div>
      </section>

    </main>
  )
}
