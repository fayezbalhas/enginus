'use client'

import { useEffect, useRef, useState } from 'react'
import Navbar from './components/Navbar'

export default function Home() {
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [loaded, setLoaded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Page load trigger
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Mouse parallax
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      })
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  // Scroll reveal observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll('[data-animate]').forEach((el) => observerRef.current?.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  // Particle network canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const handleResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const NODE_COUNT = Math.min(70, Math.floor(w / 24))
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }))

    let mx = w / 2, my = h / 2
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }
    window.addEventListener('mousemove', onMove)

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      nodes.forEach((n) => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1

        // Mouse attraction
        const dx = mx - n.x
        const dy = my - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 180) {
          n.x += dx * 0.0015
          n.y += dy * 0.0015
        }
      })

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            const opacity = (1 - dist / 130) * 0.5
            ctx.strokeStyle = `rgba(204,0,0,${opacity})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Nodes
      nodes.forEach((n) => {
        const dxm = mx - n.x
        const dym = my - n.y
        const dm = Math.sqrt(dxm * dxm + dym * dym)
        const near = dm < 180
        ctx.fillStyle = near ? 'rgba(255,68,68,0.9)' : 'rgba(204,0,0,0.5)'
        ctx.beginPath()
        ctx.arc(n.x, n.y, near ? 2.4 : 1.6, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  const tools = [
    { icon: '\u27C2', name: 'Beam Calculator', desc: 'Reactions, shear, moment & deflection diagrams', tag: 'FREE' },
    { icon: '\u21C4', name: 'Unit Converter', desc: 'Force, moment, stress & length \u2014 SI and Imperial', tag: 'FREE' },
    { icon: '\u29BF', name: 'Rebar Calculator', desc: 'Bar areas, counts & spacing \u2014 EC and ACI', tag: 'FREE' },
    { icon: '\u2295', name: 'Seismic Base Shear', desc: 'Equivalent static method \u2014 EC8 & ASCE 7', tag: 'FREE' },
    { icon: '\u25A6', name: 'RC Design Pack', desc: 'Beam, slab, column & footing Excel sheets', tag: 'PRO' },
    { icon: '\u2B21', name: 'Steel Design Pack', desc: 'Beams, columns & connections per AISC/EC3', tag: 'PRO' },
  ]

  const stats = [
    { value: '20+', label: 'Free Calculators' },
    { value: '2', label: 'Design Codes' },
    { value: 'SI + US', label: 'Unit Systems' },
    { value: '$0', label: 'To Get Started' },
  ]

  const steps = [
    { num: '01', title: 'Pick a tool', desc: 'Choose from beam analysis, load calculators, section tools and more.' },
    { num: '02', title: 'Enter your data', desc: 'Switch between Eurocode and ACI, SI and Imperial units instantly.' },
    { num: '03', title: 'Get results', desc: 'Live diagrams, formulas shown, ready to export or hand off.' },
  ]

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=Space+Grotesk:wght@500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: #cc0000; color: #fff; }

        .nav-link {
          color: #888; text-decoration: none; font-size: 14px;
          font-weight: 500; letter-spacing: 0.03em; transition: color 0.2s; position: relative;
        }
        .nav-link::after {
          content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 1px;
          background: #cc0000; transition: width 0.25s;
        }
        .nav-link:hover { color: #f0f0f0; }
        .nav-link:hover::after { width: 100%; }

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

        .btn-secondary {
          background: transparent; color: #aaa; border: 1px solid #333; padding: 15px 34px;
          font-size: 15px; font-weight: 500; border-radius: 4px; cursor: pointer;
          text-decoration: none; display: inline-block; transition: all 0.25s; letter-spacing: 0.02em;
        }
        .btn-secondary:hover { border-color: #cc0000; color: #fff; transform: translateY(-2px); background: rgba(204,0,0,0.05); }

        .tool-card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 30px 26px;
          transition: all 0.4s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden; cursor: pointer;
        }
        .tool-card:hover { border-color: #cc0000; transform: translateY(-6px); background: #151515; }
        .tool-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #cc0000, #ff4444); transform: scaleX(0);
          transition: transform 0.4s; transform-origin: left;
        }
        .tool-card:hover::before { transform: scaleX(1); }
        .tool-card::after {
          content: ''; position: absolute; bottom: -50%; right: -50%; width: 120px; height: 120px;
          background: radial-gradient(circle, rgba(204,0,0,0.12), transparent 70%);
          opacity: 0; transition: opacity 0.4s;
        }
        .tool-card:hover::after { opacity: 1; }
        .tool-card .icon { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); display: inline-block; }
        .tool-card:hover .icon { transform: scale(1.2) rotate(-8deg); }

        .fade-up { opacity: 0; transform: translateY(40px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .fade-up.visible { opacity: 1; transform: translateY(0); }

        .tag-free { background: rgba(204,0,0,0.15); color: #ff4444; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 4px 9px; border-radius: 3px; }
        .tag-pro { background: rgba(255,255,255,0.07); color: #999; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 4px 9px; border-radius: 3px; }

        .stat-card { border-left: 2px solid #cc0000; padding-left: 22px; transition: all 0.3s; }
        .stat-card:hover { transform: translateX(6px); border-left-color: #ff4444; }

        .step-row { transition: all 0.3s; }
        .step-row:hover { background: #0f0f0f; }
        .step-row:hover .step-num { color: #cc0000; }

        @keyframes float-cue { 0%,100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(10px); opacity: 1; } }
        @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
        @keyframes beamFlex {
          0%, 100% { d: path('M 40 60 Q 200 60 360 60'); }
          50% { d: path('M 40 60 Q 200 95 360 60'); }
        }
        @keyframes drawLine { to { stroke-dashoffset: 0; } }

        .hero-stagger { opacity: 0; transform: translateY(30px); }
        .loaded .hero-stagger { animation: fadeIn 0.9s cubic-bezier(0.16,1,0.3,1) forwards; }
        .loaded .hero-stagger.d1 { animation-delay: 0.1s; }
        .loaded .hero-stagger.d2 { animation-delay: 0.25s; }
        .loaded .hero-stagger.d3 { animation-delay: 0.4s; }
        .loaded .hero-stagger.d4 { animation-delay: 0.55s; }
        .loaded .hero-stagger.d5 { animation-delay: 0.7s; }

        .beam-showcase-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }

        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 28px !important; }
          .tools-grid { grid-template-columns: 1fr !important; }
          .cta-banner { flex-direction: column; align-items: flex-start !important; }
          .hero-pad { padding: 100px 20px 80px !important; }
          .beam-showcase-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .home-section-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .home-footer { padding: 36px 20px !important; }
          .step-row { gap: 20px !important; }
          .cta-inner { padding: 40px 28px !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 18px !important; }
          .hero-pad { padding: 90px 16px 60px !important; }
          .home-section-pad { padding-left: 16px !important; padding-right: 16px !important; }
          .step-row { flex-direction: column; gap: 10px !important; padding: 20px 16px !important; }
          .step-num { font-size: 28px !important; min-width: unset !important; }
          .cta-inner { padding: 28px 20px !important; }
          .btn-primary, .btn-secondary { padding: 14px 24px !important; font-size: 14px !important; min-height: 44px; }
        }
      `}</style>

      <div className={loaded ? 'loaded' : ''}>

        {/* Navbar */}
        <Navbar fixed />

        {/* Hero */}
        <section className="hero-pad" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>

          {/* Particle network canvas */}
          <canvas ref={canvasRef} style={{
            position: 'absolute', inset: 0, zIndex: 0,
            maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black 25%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black 25%, transparent 80%)',
          }} />

          {/* Glow following mouse */}
          <div style={{
            position: 'absolute', top: '42%', left: '50%', zIndex: 0,
            transform: `translate(calc(-50% + ${mouse.x * 20}px), calc(-50% + ${mouse.y * 20}px))`,
            width: '700px', height: '450px',
            background: 'radial-gradient(ellipse, rgba(204,0,0,0.1) 0%, transparent 70%)',
            transition: 'transform 0.5s ease-out', pointerEvents: 'none',
          }} />

          {/* Content */}
          <div style={{ maxWidth: '860px', position: 'relative', zIndex: 2 }}>
            <div className="hero-stagger d1" style={{
              display: 'inline-block', background: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)',
              borderRadius: '3px', padding: '7px 18px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.14em', color: '#ff4444', marginBottom: '34px', textTransform: 'uppercase',
            }}>
              Structural Engineering Tools
            </div>

            <h1 className="hero-stagger d2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(44px, 7.5vw, 86px)', fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.03em', marginBottom: '26px' }}>
              Calculate Faster.<br />
              <span style={{ color: '#cc0000' }}>Design Smarter.</span>
            </h1>

            <p className="hero-stagger d3" style={{ fontSize: '18px', color: '#888', lineHeight: 1.7, maxWidth: '580px', margin: '0 auto 48px', fontWeight: 300 }}>
              Free online structural calculators and professional Excel templates for civil and structural engineers &mdash; supporting Eurocode and ACI, in both SI and Imperial units.
            </p>

            <div className="hero-stagger d4" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/calculators" className="btn-primary">Explore Free Tools</a>
              <a href="/templates" className="btn-secondary">View Templates &rarr;</a>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="hero-stagger d5" style={{ position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#444', textTransform: 'uppercase' }}>Scroll</span>
            <div style={{ width: '1px', height: '36px', background: 'linear-gradient(to bottom, #cc0000, transparent)', animation: 'float-cue 2s ease-in-out infinite' }} />
          </div>
        </section>

        {/* Stats */}
        <section className="home-section-pad" style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '60px 48px', position: 'relative', zIndex: 3, background: '#0a0a0a' }}>
          <div className="stats-grid" style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
            {stats.map((s, i) => (
              <div key={i} id={`stat-${i}`} data-animate className={`stat-card fade-up${visible[`stat-${i}`] ? ' visible' : ''}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '34px', fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: '13px', color: '#555', marginTop: '4px', fontWeight: 400 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Animated Beam Showcase */}
        <section className="home-section-pad" style={{ padding: '110px 48px', position: 'relative', zIndex: 3, background: '#0a0a0a' }}>
          <div className="beam-showcase-grid" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div id="beam-text" data-animate className={`fade-up${visible['beam-text'] ? ' visible' : ''}`}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>Live Analysis</div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '18px' }}>
                See the structure<br />respond in real time.
              </h2>
              <p style={{ fontSize: '16px', color: '#666', lineHeight: 1.7, marginBottom: '28px' }}>
                Apply a load and watch the beam deflect, with shear and moment diagrams updating instantly. No guesswork &mdash; every result traces back to the code equations behind it.
              </p>
              <a href="/calculators" className="btn-secondary">Try the Beam Calculator &rarr;</a>
            </div>

            <div id="beam-vis" data-animate className={`fade-up${visible['beam-vis'] ? ' visible' : ''}`} style={{ background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '30px' }}>
              <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto' }}>
                {/* Supports */}
                <polygon points="40,135 28,160 52,160" fill="none" stroke="#cc0000" strokeWidth="1.5" />
                <polygon points="360,135 348,160 372,160" fill="none" stroke="#cc0000" strokeWidth="1.5" />
                <circle cx="354" cy="164" r="3" fill="none" stroke="#cc0000" strokeWidth="1.5" />
                <circle cx="366" cy="164" r="3" fill="none" stroke="#cc0000" strokeWidth="1.5" />

                <defs>
                  <marker id="arr-dn" markerWidth="9" markerHeight="9" refX="4.5" refY="9" markerUnits="userSpaceOnUse">
                    <polygon points="0,0 9,0 4.5,9" fill="#ff4444" />
                  </marker>
                </defs>
                {/* Load arrows – point downward, tip touches beam at y=100 */}
                {[120, 160, 200, 240, 280].map((x, i) => (
                  <line key={i} x1={x} y1="55" x2={x} y2="100" stroke="#ff4444" strokeWidth="1.5" markerEnd="url(#arr-dn)">
                    <animate attributeName="y1" values="60;55;60" dur="2s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
                  </line>
                ))}

                {/* The beam - flexes */}
                <path fill="none" stroke="#f0f0f0" strokeWidth="3" strokeLinecap="round">
                  <animate attributeName="d"
                    values="M 40 100 Q 200 100 360 100; M 40 100 Q 200 130 360 100; M 40 100 Q 200 100 360 100"
                    dur="3s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
                </path>

                {/* Deflection label */}
                <text x="200" y="155" textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace">
                  &#948;max
                  <animate attributeName="y" values="120;150;120" dur="3s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
                </text>
              </svg>
            </div>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="home-section-pad" style={{ padding: '40px 48px 100px', position: 'relative', zIndex: 3, background: '#0a0a0a' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div id="tools-header" data-animate className={`fade-up${visible['tools-header'] ? ' visible' : ''}`} style={{ marginBottom: '56px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>What We Offer</div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
                Tools built for real work
              </h2>
              <p style={{ fontSize: '16px', color: '#555', marginTop: '12px', maxWidth: '480px', lineHeight: 1.7 }}>
                Every calculator shows its formulas. Every template is unlocked and editable. No black boxes.
              </p>
            </div>

            <div className="tools-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {tools.map((tool, i) => (
                <div key={i} id={`tool-${i}`} data-animate className={`tool-card fade-up${visible[`tool-${i}`] ? ' visible' : ''}`} style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                    <span className="icon" style={{ fontSize: '28px', color: '#cc0000', fontWeight: 300 }}>{tool.icon}</span>
                    <span className={tool.tag === 'FREE' ? 'tag-free' : 'tag-pro'}>{tool.tag}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f0', marginBottom: '8px', letterSpacing: '-0.01em' }}>{tool.name}</h3>
                  <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.6 }}>{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="home-section-pad" style={{ padding: '100px 48px', position: 'relative', zIndex: 3, background: '#0c0c0c', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div id="how-header" data-animate className={`fade-up${visible['how-header'] ? ' visible' : ''}`} style={{ marginBottom: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '16px' }}>How It Works</div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Three steps. Zero friction.
              </h2>
            </div>

            {steps.map((step, i) => (
              <div key={i} id={`step-${i}`} data-animate className={`step-row fade-up${visible[`step-${i}`] ? ' visible' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '28px 24px', borderBottom: i < steps.length - 1 ? '1px solid #1a1a1a' : 'none', borderRadius: '6px', transitionDelay: `${i * 0.12}s` }}>
                <div className="step-num" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '40px', fontWeight: 700, color: '#222', transition: 'color 0.3s', minWidth: '70px' }}>{step.num}</div>
                <div>
                  <h3 style={{ fontSize: '19px', fontWeight: 600, marginBottom: '6px', letterSpacing: '-0.01em' }}>{step.title}</h3>
                  <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="home-section-pad" style={{ padding: '100px 48px', position: 'relative', zIndex: 3, background: '#0a0a0a' }}>
          <div id="cta" data-animate className={`cta-banner cta-inner fade-up${visible['cta'] ? ' visible' : ''}`} style={{ maxWidth: '1000px', margin: '0 auto', border: '1px solid #1e1e1e', borderLeft: '4px solid #cc0000', borderRadius: '8px', padding: '60px 56px', background: 'linear-gradient(135deg, #0f0f0f, #0a0a0a)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(204,0,0,0.08), transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '10px' }}>
                Start calculating now &mdash; it&apos;s free.
              </h2>
              <p style={{ color: '#666', fontSize: '15px' }}>No account required. Open any calculator and get results in seconds.</p>
            </div>
            <a href="/calculators" className="btn-primary" style={{ whiteSpace: 'nowrap', position: 'relative', zIndex: 1 }}>Open a Calculator</a>
          </div>
        </section>

        {/* Footer */}
        <footer className="home-footer" style={{ borderTop: '1px solid #1a1a1a', padding: '44px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 3, background: '#0a0a0a' }}>
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

      </div>
    </main>
  )
}