'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Navbar from '../components/Navbar'

const freeTools = [
  { icon: '⟂', name: 'Beam Calculator', href: '/calculators/beam', desc: 'Reactions, shear & moment diagrams' },
  { icon: '⇄', name: 'Unit Converter', href: '/calculators/unit-converter', desc: 'SI and Imperial conversions' },
  { icon: '⦿', name: 'Rebar Calculator', href: '/calculators/rebar', desc: 'Bar areas & spacing' },
]

const proTools = [
  { icon: '▧', name: 'RC Beam Design', href: '/calculators/rc-beam', desc: 'EC2 & ACI 318 beam design' },
  { icon: '▤', name: 'RC Slab Design', href: '/calculators/rc-slab', desc: 'One-way & two-way slab design' },
  { icon: '▥', name: 'RC Column Design', href: '/calculators/rc-column', desc: 'Axial + moment interaction' },
  { icon: '⬡', name: 'Steel Beam Design', href: '#', desc: 'Coming soon' },
  { icon: '⊞', name: 'Foundation Design', href: '#', desc: 'Coming soon' },
]

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const isPro = false

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/sign-in'
    }
  }, [loading, user])

  if (loading || !user) {
    return (
      <main style={{ background: '#0a0a0a', color: '#f0f0f0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ color: '#666', fontSize: '15px' }}>Loading...</div>
      </main>
    )
  }

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .dash-card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 28px 24px;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden;
          text-decoration: none; display: block; color: inherit;
        }
        .dash-card:hover { border-color: #cc0000; transform: translateY(-4px); background: #141414; }
        .dash-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #cc0000, #ff4444); transform: scaleX(0);
          transition: transform 0.35s; transform-origin: left;
        }
        .dash-card:hover::before { transform: scaleX(1); }

        .dash-card.locked { opacity: 0.55; }
        .dash-card.locked:hover { border-color: #333; transform: none; background: #111; cursor: default; }
        .dash-card.locked::before { display: none; }

        .badge-pro {
          background: rgba(34,197,94,0.15); color: #22c55e; font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; padding: 5px 12px; border-radius: 4px; display: inline-block;
        }
        .badge-free {
          background: rgba(255,255,255,0.06); color: #888; font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; padding: 5px 12px; border-radius: 4px; display: inline-block;
        }

        .btn-upgrade {
          background: #cc0000; color: #fff; border: none; padding: 12px 28px;
          font-size: 14px; font-weight: 600; border-radius: 4px; cursor: pointer;
          text-decoration: none; display: inline-block; transition: all 0.25s;
          font-family: 'Inter', sans-serif;
        }
        .btn-upgrade:hover { background: #e60000; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(204,0,0,0.35); }

        .lock-icon { font-size: 16px; color: #444; }

        .dash-section { padding: 0 48px; max-width: 1000px; margin: 0 auto; }

        @media (max-width: 768px) {
          .dash-section { padding: 0 20px; }
          .tools-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar />

      <div className="dash-section" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '12px' }}>Dashboard</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Welcome back, <span style={{ color: '#cc0000' }}>{user.email}</span>
          </h1>
        </div>

        {/* Subscription Status */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '32px', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700 }}>Subscription</h2>
                {isPro ? (
                  <span className="badge-pro">Pro Active</span>
                ) : (
                  <span className="badge-free">Free Plan</span>
                )}
              </div>
              {isPro ? (
                <p style={{ fontSize: '14px', color: '#888' }}>Your Pro subscription is active. Expires: Dec 31, 2026</p>
              ) : (
                <p style={{ fontSize: '14px', color: '#888' }}>Upgrade to Pro to unlock all design calculators.</p>
              )}
            </div>
            {!isPro && (
              <a href="/pro" className="btn-upgrade">Upgrade to Pro</a>
            )}
          </div>
        </div>

        {/* Free Tools */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '20px' }}>Free Tools</div>
          <div className="tools-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {freeTools.map((tool) => (
              <a key={tool.name} href={tool.href} className="dash-card">
                <span style={{ fontSize: '26px', color: '#cc0000', display: 'block', marginBottom: '14px' }}>{tool.icon}</span>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>{tool.name}</h3>
                <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.5 }}>{tool.desc}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Pro Tools */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase' }}>Pro Tools</span>
            {!isPro && <span style={{ fontSize: '11px', color: '#444', fontWeight: 500 }}>— Upgrade to unlock</span>}
          </div>
          <div className="tools-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {proTools.map((tool) => (
              isPro ? (
                <a key={tool.name} href={tool.href} className="dash-card">
                  <span style={{ fontSize: '26px', color: '#cc0000', display: 'block', marginBottom: '14px' }}>{tool.icon}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>{tool.name}</h3>
                  <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.5 }}>{tool.desc}</p>
                </a>
              ) : (
                <div key={tool.name} className="dash-card locked">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <span style={{ fontSize: '26px', color: '#444' }}>{tool.icon}</span>
                    <span className="lock-icon">🔒</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px', color: '#666' }}>{tool.name}</h3>
                  <p style={{ fontSize: '13px', color: '#444', lineHeight: 1.5 }}>{tool.desc}</p>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '20px' }}>Recent Activity</div>
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>⊘</div>
            <p style={{ fontSize: '14px', color: '#444' }}>No recent activity yet. Open a calculator to get started.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
