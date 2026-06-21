'use client'

import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'

type DesignCode = 'EC2' | 'ACI'
type UnitSystem = 'SI' | 'Imperial'

const SI_DEFAULTS = { b: 400, h: 400, fck: 30, fyk: 500, Ned: 1500, Med: 120, cover: 40 }
const IMP_DEFAULTS = { b: 16, h: 16, fck: 4000, fyk: 60000, Ned: 340, Med: 90, cover: 1.5 }

function generateInteraction(
  b: number, h: number, fck: number, fyk: number, As: number,
  code: DesignCode, units: UnitSystem, cover: number
): { n: number; m: number }[] {
  const d = units === 'SI' ? h - cover - 20 : h - cover - 0.75
  const dPrime = units === 'SI' ? cover + 20 : cover + 0.75
  const points: { n: number; m: number }[] = []

  const fc = code === 'EC2' ? fck / 1.5 : 0.85 * fck
  const fy = code === 'EC2' ? fyk / 1.15 : fyk
  const phi = code === 'ACI' ? 0.65 : 1.0

  const Ag = b * h
  const As_half = As / 2

  const N0 = phi * (fc * Ag + fy * As) * (units === 'SI' ? 1e-3 : 1e-3)
  points.push({ n: N0, m: 0 })

  for (let ratio = 0.95; ratio >= 0; ratio -= 0.05) {
    const c = ratio * d
    const eps_s = 0.003 * (c - dPrime) / c
    const eps_s2 = 0.003 * (d - c) / c

    const ey = fy / (units === 'SI' ? 200000 : 29000000)
    const fs1 = Math.min(Math.abs(eps_s), ey) * (units === 'SI' ? 200000 : 29000000) * Math.sign(eps_s)
    const fs2 = Math.min(Math.abs(eps_s2), ey) * (units === 'SI' ? 200000 : 29000000) * Math.sign(eps_s2)

    const beta1 = code === 'EC2' ? 0.8 : Math.max(0.65, Math.min(0.85, 0.85 - 0.05 * ((units === 'SI' ? fck - 28 : fck - 4000) / (units === 'SI' ? 7 : 1000))))
    const a = beta1 * c
    const a_capped = Math.min(a, h)

    const Cc = fc * b * a_capped
    const Cs = As_half * fs1
    const Ts = As_half * fs2

    const N = phi * (Cc + Cs - Ts)
    const M = phi * (Cc * (h / 2 - a_capped / 2) + Cs * (h / 2 - dPrime) + Ts * (d - h / 2))

    const Nk = units === 'SI' ? N * 1e-3 : N * 1e-3
    const Mk = units === 'SI' ? M * 1e-6 : M / 12000

    points.push({ n: Nk, m: Math.abs(Mk) })
  }

  const Nt = -phi * fy * As * (units === 'SI' ? 1e-3 : 1e-3)
  points.push({ n: Nt, m: 0 })

  return points
}

function designColumn(
  b: number, h: number, fck: number, fyk: number, Ned: number, Med: number, cover: number,
  code: DesignCode, units: UnitSystem
) {
  if (b <= 0 || h <= 0 || fck <= 0 || fyk <= 0 || Ned <= 0) return null

  const Ag = b * h
  const fc = code === 'EC2' ? fck / 1.5 : 0.85 * fck
  const fy = code === 'EC2' ? fyk / 1.15 : fyk
  const phi = code === 'ACI' ? 0.65 : 1.0

  const rho_min = code === 'EC2' ? 0.002 : 0.01
  const rho_max = code === 'EC2' ? 0.04 : 0.08

  const d = units === 'SI' ? h - cover - 20 : h - cover - 0.75

  const Ned_N = units === 'SI' ? Ned * 1e3 : Ned * 1000
  const Med_Nmm = units === 'SI' ? Med * 1e6 : Med * 12000

  let As_req: number
  if (Med <= 0) {
    As_req = Math.max((Ned_N / phi - fc * Ag) / fy, rho_min * Ag)
  } else {
    const e = Med_Nmm / Ned_N
    const dPrime = units === 'SI' ? cover + 20 : cover + 0.75
    As_req = Ned_N / (phi * fy) + Med_Nmm / (phi * fy * (d - dPrime))
    As_req = Math.max(As_req, rho_min * Ag)
  }

  const As_min = rho_min * Ag
  const As_max = rho_max * Ag
  const As_provided = Math.max(As_req, As_min)
  const rho = As_provided / Ag

  const barDia = units === 'SI' ? [16, 20, 25, 32] : [0.625, 0.75, 0.875, 1.0, 1.128]
  const barArea = barDia.map(d => Math.PI * d * d / 4)
  const barLabel = units === 'SI' ? ['Ø16', 'Ø20', 'Ø25', 'Ø32'] : ['#5', '#6', '#7', '#8', '#9']

  let bestArr = ''
  let bestCount = 999
  for (let i = 0; i < barDia.length; i++) {
    const n = Math.ceil(As_provided / barArea[i])
    const rounded = n < 4 ? 4 : n % 2 === 0 ? n : n + 1
    if (rounded < bestCount) {
      bestCount = rounded
      bestArr = `${rounded}${barLabel[i]}`
    }
  }

  const pass = As_provided <= As_max && rho <= rho_max

  const interactionCurve = generateInteraction(b, h, fck, fyk, As_provided, code, units, cover)

  const nPlot = units === 'SI' ? Ned : Ned
  const mPlot = units === 'SI' ? Med : Med
  let inside = false
  for (let i = 0; i < interactionCurve.length - 1; i++) {
    const p1 = interactionCurve[i]
    const p2 = interactionCurve[i + 1]
    if (nPlot <= p1.n && nPlot >= p2.n) {
      const t = (p1.n - nPlot) / (p1.n - p2.n)
      const mBound = p1.m + t * (p2.m - p1.m)
      if (mPlot <= mBound) { inside = true; break }
    }
  }

  return {
    As_req: units === 'Imperial' ? As_req / 645.16 : As_req,
    As_min: units === 'Imperial' ? As_min / 645.16 : As_min,
    As_max: units === 'Imperial' ? As_max / 645.16 : As_max,
    As_provided: units === 'Imperial' ? As_provided / 645.16 : As_provided,
    rho,
    barArrangement: bestArr,
    pass: pass && inside,
    interactionCurve,
    loadPoint: { n: nPlot, m: mPlot },
    insideCurve: inside,
  }
}

export default function RcColumnPage() {
  const [code, setCode] = useState<DesignCode>('EC2')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const defaults = units === 'SI' ? SI_DEFAULTS : IMP_DEFAULTS
  const [b, setB] = useState(defaults.b)
  const [h, setH] = useState(defaults.h)
  const [fck, setFck] = useState(defaults.fck)
  const [fyk, setFyk] = useState(defaults.fyk)
  const [Ned, setNed] = useState(defaults.Ned)
  const [Med, setMed] = useState(defaults.Med)
  const [cover, setCover] = useState(defaults.cover)

  const switchUnits = (u: UnitSystem) => {
    setUnits(u)
    const def = u === 'SI' ? SI_DEFAULTS : IMP_DEFAULTS
    setB(def.b); setH(def.h); setFck(def.fck); setFyk(def.fyk)
    setNed(def.Ned); setMed(def.Med); setCover(def.cover)
  }

  const result = useMemo(() => designColumn(b, h, fck, fyk, Ned, Med, cover, code, units), [b, h, fck, fyk, Ned, Med, cover, code, units])

  const dimUnit = units === 'SI' ? 'mm' : 'in'
  const stressUnit = units === 'SI' ? 'MPa' : 'psi'
  const forceUnit = units === 'SI' ? 'kN' : 'kip'
  const momentUnit = units === 'SI' ? 'kN·m' : 'kip·ft'
  const areaUnit = units === 'SI' ? 'mm²' : 'in²'

  const renderInteraction = () => {
    if (!result) return null
    const pts = result.interactionCurve
    const maxN = Math.max(...pts.map(p => p.n)) * 1.1
    const minN = Math.min(...pts.map(p => p.n)) * 1.1
    const maxM = Math.max(...pts.map(p => p.m)) * 1.3
    if (maxM === 0 || maxN === 0) return null

    const W = 320
    const H = 260
    const pad = 40

    const toX = (m: number) => pad + (m / maxM) * (W - 2 * pad)
    const toY = (n: number) => pad + ((maxN - n) / (maxN - minN)) * (H - 2 * pad)

    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.m).toFixed(1)},${toY(p.n).toFixed(1)}`).join(' ')

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: '16px' }}>
        {/* axes */}
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#333" strokeWidth="1" />
        <line x1={pad} y1={toY(0)} x2={W - pad} y2={toY(0)} stroke="#333" strokeWidth="1" />
        {/* labels */}
        <text x={W / 2} y={H - 5} textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace">M ({momentUnit})</text>
        <text x={12} y={H / 2} textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace" transform={`rotate(-90, 12, ${H / 2})`}>N ({forceUnit})</text>
        {/* curve */}
        <path d={pathD} fill="none" stroke="#cc0000" strokeWidth="2" />
        {/* load point */}
        <circle cx={toX(result.loadPoint.m)} cy={toY(result.loadPoint.n)} r="5" fill={result.insideCurve ? '#22c55e' : '#ef4444'} />
        <text x={toX(result.loadPoint.m) + 8} y={toY(result.loadPoint.n) + 4} fill={result.insideCurve ? '#22c55e' : '#ef4444'} fontSize="9" fontFamily="monospace">
          ({result.loadPoint.m.toFixed(0)}, {result.loadPoint.n.toFixed(0)})
        </text>
      </svg>
    )
  }

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rc-input { background: #111; border: 1px solid #222; color: #f0f0f0; padding: 10px 14px; border-radius: 4px; font-size: 14px; width: 100%; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; }
        .rc-input:focus { border-color: #cc0000; }
        .rc-label { display: block; font-size: 12px; color: #888; margin-bottom: 6px; font-weight: 500; }
        .toggle-btn { padding: 8px 20px; border: 1px solid #222; background: transparent; color: #888; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .toggle-btn.active { background: #cc0000; border-color: #cc0000; color: #fff; }
        .toggle-btn:first-child { border-radius: 4px 0 0 4px; }
        .toggle-btn:last-child { border-radius: 0 4px 4px 0; }
        .result-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #1a1a1a; }
        .result-label { font-size: 14px; color: #888; }
        .result-value { font-size: 14px; font-weight: 600; color: #f0f0f0; font-family: 'Space Grotesk', monospace; }
        .pass-badge { background: rgba(34,197,94,0.15); color: #22c55e; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 4px; }
        .fail-badge { background: rgba(239,68,68,0.15); color: #ef4444; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 4px; }
        .calc-wrap { max-width: 900px; margin: 0 auto; padding: 48px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 768px) {
          .calc-wrap { padding: 24px 20px; }
          .grid-2 { grid-template-columns: 1fr; }
          .calc-panels { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar activePage="calculators" />

      <div className="calc-wrap">
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '12px' }}>Pro Calculator</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            RC Column Design
          </h1>
          <p style={{ fontSize: '16px', color: '#666', lineHeight: 1.6 }}>Reinforced concrete column design per {code === 'EC2' ? 'Eurocode 2' : 'ACI 318'}.</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <div>
            <button className={`toggle-btn${code === 'EC2' ? ' active' : ''}`} onClick={() => setCode('EC2')}>EC2</button>
            <button className={`toggle-btn${code === 'ACI' ? ' active' : ''}`} onClick={() => setCode('ACI')}>ACI 318</button>
          </div>
          <div>
            <button className={`toggle-btn${units === 'SI' ? ' active' : ''}`} onClick={() => switchUnits('SI')}>SI</button>
            <button className={`toggle-btn${units === 'Imperial' ? ' active' : ''}`} onClick={() => switchUnits('Imperial')}>Imperial</button>
          </div>
        </div>

        <div className="calc-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '28px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '24px', color: '#ccc' }}>Input Parameters</h2>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div>
                <label className="rc-label">Width, b ({dimUnit})</label>
                <input className="rc-input" type="number" value={b} onChange={e => setB(+e.target.value)} />
              </div>
              <div>
                <label className="rc-label">Depth, h ({dimUnit})</label>
                <input className="rc-input" type="number" value={h} onChange={e => setH(+e.target.value)} />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div>
                <label className="rc-label">{code === 'EC2' ? 'fck' : "f'c"} ({stressUnit})</label>
                <input className="rc-input" type="number" value={fck} onChange={e => setFck(+e.target.value)} />
              </div>
              <div>
                <label className="rc-label">{code === 'EC2' ? 'fyk' : 'fy'} ({stressUnit})</label>
                <input className="rc-input" type="number" value={fyk} onChange={e => setFyk(+e.target.value)} />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div>
                <label className="rc-label">Axial load, N ({forceUnit})</label>
                <input className="rc-input" type="number" value={Ned} onChange={e => setNed(+e.target.value)} />
              </div>
              <div>
                <label className="rc-label">Moment, M ({momentUnit})</label>
                <input className="rc-input" type="number" value={Med} onChange={e => setMed(+e.target.value)} />
              </div>
            </div>

            <div style={{ width: '50%' }}>
              <label className="rc-label">Cover ({dimUnit})</label>
              <input className="rc-input" type="number" value={cover} onChange={e => setCover(+e.target.value)} />
            </div>
          </div>

          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '28px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '24px', color: '#ccc' }}>Design Results</h2>

            {result ? (
              <>
                <div className="result-row">
                  <span className="result-label">Required As</span>
                  <span className="result-value">{result.As_req.toFixed(1)} {areaUnit}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Minimum As</span>
                  <span className="result-value">{result.As_min.toFixed(1)} {areaUnit}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Maximum As</span>
                  <span className="result-value">{result.As_max.toFixed(1)} {areaUnit}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Provided As</span>
                  <span className="result-value" style={{ color: '#cc0000' }}>{result.As_provided.toFixed(1)} {areaUnit}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Steel ratio (ρ)</span>
                  <span className="result-value">{(result.rho * 100).toFixed(2)}%</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Bar arrangement</span>
                  <span className="result-value">{result.barArrangement}</span>
                </div>

                <div style={{ marginTop: '12px', background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Interaction Diagram</div>
                  {renderInteraction()}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <span className={result.pass ? 'pass-badge' : 'fail-badge'}>
                    {result.pass ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>
                <p style={{ fontSize: '14px' }}>Enter valid inputs to see results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
