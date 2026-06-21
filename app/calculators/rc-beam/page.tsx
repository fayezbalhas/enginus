'use client'

import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'

type DesignCode = 'EC2' | 'ACI'
type UnitSystem = 'SI' | 'Imperial'

const SI_DEFAULTS = { b: 300, d: 500, fck: 30, fyk: 500, Md: 200 }
const IMP_DEFAULTS = { b: 12, d: 20, fck: 4000, fyk: 60000, Md: 150 }

const barDiameters: Record<UnitSystem, number[]> = {
  SI: [10, 12, 16, 20, 25, 32],
  Imperial: [0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.128, 1.27],
}
const barAreas: Record<UnitSystem, number[]> = {
  SI: [78.5, 113.1, 201.1, 314.2, 490.9, 804.2],
  Imperial: [0.11, 0.20, 0.31, 0.44, 0.60, 0.79, 1.00, 1.27],
}
const barNames: Record<UnitSystem, string[]> = {
  SI: ['Ø10', 'Ø12', 'Ø16', 'Ø20', 'Ø25', 'Ø32'],
  Imperial: ['#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10'],
}

function designBeam(b: number, d: number, fck: number, fyk: number, Md: number, code: DesignCode, units: UnitSystem) {
  if (b <= 0 || d <= 0 || fck <= 0 || fyk <= 0 || Md <= 0) return null

  let As_req: number, As_min: number, As_max: number, utilization: number, Mu_cap: number

  if (code === 'EC2') {
    const fcd = units === 'SI' ? fck / 1.5 : (fck * 0.85) / 1.5
    const fyd = fyk / 1.15
    const Md_Nmm = units === 'SI' ? Md * 1e6 : Md * 12000

    const K = Md_Nmm / (fcd * b * d * d)
    const K_lim = 0.167
    const K_used = Math.min(K, K_lim)

    const z = d * (0.5 + Math.sqrt(0.25 - K_used / 1.134))
    const z_capped = Math.min(z, 0.95 * d)

    As_req = Md_Nmm / (fyd * z_capped)

    const fctm = units === 'SI' ? 0.3 * Math.pow(fck, 2 / 3) : 0.3 * Math.pow(fck / 145, 2 / 3) * 145
    As_min = Math.max(0.26 * (fctm / fyk) * b * d, 0.0013 * b * d)
    As_max = 0.04 * b * d

    const As_final = Math.max(As_req, As_min)
    const z2 = Math.min(d * (0.5 + Math.sqrt(0.25 - (As_final * fyd) / (1.134 * fcd * b * d * d) )), 0.95 * d)
    Mu_cap = As_final * fyd * z2
    utilization = Md_Nmm / Mu_cap

    if (units === 'Imperial') {
      As_req /= 645.16
      As_min /= 645.16
      As_max /= 645.16
    }
  } else {
    const fc = units === 'SI' ? fck : fck
    const fy = units === 'SI' ? fyk : fyk
    const phi = 0.9
    const Md_work = units === 'SI' ? Md * 1e6 : Md * 12000

    const a_guess = d * 0.1
    As_req = Md_work / (phi * fy * (d - a_guess / 2))
    for (let i = 0; i < 20; i++) {
      const a = (As_req * fy) / (0.85 * fc * b)
      As_req = Md_work / (phi * fy * (d - a / 2))
    }

    if (units === 'SI') {
      As_min = Math.max((0.25 * Math.sqrt(fck) / fyk) * b * d, (1.4 / fyk) * b * d)
    } else {
      As_min = Math.max((3 * Math.sqrt(fc) / fy) * b * d, (200 / fy) * b * d)
    }

    const rho_max = 0.85 * 0.85 * (fc / fy) * (0.003 / (0.003 + 0.005))
    As_max = rho_max * b * d

    const As_final = Math.max(As_req, As_min)
    const a_final = (As_final * fy) / (0.85 * fc * b)
    Mu_cap = phi * As_final * fy * (d - a_final / 2)
    utilization = Md_work / Mu_cap

    if (units === 'Imperial') {
      As_req /= 645.16
      As_min /= 645.16
      As_max /= 645.16
    }
  }

  const As_final = Math.max(As_req, As_min)
  const pass = As_final <= As_max && utilization <= 1.05

  const diams = barDiameters[units]
  const areas = barAreas[units]
  let bestBar = barNames[units][0]
  let bestCount = 99
  for (let i = 0; i < diams.length; i++) {
    const count = Math.ceil(As_final / areas[i])
    if (count >= 2 && count < bestCount) {
      bestCount = count
      bestBar = barNames[units][i]
    }
  }

  return {
    As_req: Math.max(As_req, 0),
    As_min,
    As_max,
    As_provided: As_final,
    utilization: Math.min(utilization, 9.99),
    pass,
    barArrangement: `${bestCount}${bestBar}`,
    barCount: bestCount,
    barName: bestBar,
  }
}

export default function RcBeamPage() {
  const [code, setCode] = useState<DesignCode>('EC2')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const defaults = units === 'SI' ? SI_DEFAULTS : IMP_DEFAULTS
  const [b, setB] = useState(defaults.b)
  const [d, setD] = useState(defaults.d)
  const [fck, setFck] = useState(defaults.fck)
  const [fyk, setFyk] = useState(defaults.fyk)
  const [Md, setMd] = useState(defaults.Md)

  const switchUnits = (u: UnitSystem) => {
    setUnits(u)
    const def = u === 'SI' ? SI_DEFAULTS : IMP_DEFAULTS
    setB(def.b); setD(def.d); setFck(def.fck); setFyk(def.fyk); setMd(def.Md)
  }

  const result = useMemo(() => designBeam(b, d, fck, fyk, Md, code, units), [b, d, fck, fyk, Md, code, units])

  const dimUnit = units === 'SI' ? 'mm' : 'in'
  const stressUnit = units === 'SI' ? 'MPa' : 'psi'
  const momentUnit = units === 'SI' ? 'kN·m' : 'kip·ft'
  const areaUnit = units === 'SI' ? 'mm²' : 'in²'

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rc-input { background: #111; border: 1px solid #222; color: #f0f0f0; padding: 10px 14px; border-radius: 4px; font-size: 14px; width: 100%; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; }
        .rc-input:focus { border-color: #cc0000; }
        .rc-label { display: block; font-size: 12px; color: #888; margin-bottom: 6px; font-weight: 500; letter-spacing: 0.03em; }
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
            RC Beam Design
          </h1>
          <p style={{ fontSize: '16px', color: '#666', lineHeight: 1.6 }}>Reinforced concrete beam flexural design per {code === 'EC2' ? 'Eurocode 2' : 'ACI 318'}.</p>
        </div>

        {/* Toggles */}
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
          {/* Inputs */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '28px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '24px', color: '#ccc' }}>Input Parameters</h2>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div>
                <label className="rc-label">Width, b ({dimUnit})</label>
                <input className="rc-input" type="number" value={b} onChange={e => setB(+e.target.value)} />
              </div>
              <div>
                <label className="rc-label">Effective depth, d ({dimUnit})</label>
                <input className="rc-input" type="number" value={d} onChange={e => setD(+e.target.value)} />
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

            <div>
              <label className="rc-label">Design moment, Md ({momentUnit})</label>
              <input className="rc-input" type="number" value={Md} onChange={e => setMd(+e.target.value)} />
            </div>

            {/* Section SVG */}
            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center' }}>
              <svg viewBox="0 0 200 260" style={{ width: '160px', height: 'auto' }}>
                <rect x="40" y="20" width="120" height="220" fill="none" stroke="#333" strokeWidth="2" />
                <line x1="40" y1="200" x2="160" y2="200" stroke="#cc0000" strokeWidth="1" strokeDasharray="4" />
                {/* b dimension */}
                <line x1="40" y1="250" x2="160" y2="250" stroke="#666" strokeWidth="1" />
                <line x1="40" y1="245" x2="40" y2="255" stroke="#666" strokeWidth="1" />
                <line x1="160" y1="245" x2="160" y2="255" stroke="#666" strokeWidth="1" />
                <text x="100" y="263" textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">b</text>
                {/* d dimension */}
                <line x1="175" y1="20" x2="175" y2="200" stroke="#666" strokeWidth="1" />
                <line x1="170" y1="20" x2="180" y2="20" stroke="#666" strokeWidth="1" />
                <line x1="170" y1="200" x2="180" y2="200" stroke="#666" strokeWidth="1" />
                <text x="190" y="115" textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">d</text>
                {/* Rebar dots */}
                <circle cx="70" cy="210" r="5" fill="#cc0000" opacity="0.7" />
                <circle cx="100" cy="210" r="5" fill="#cc0000" opacity="0.7" />
                <circle cx="130" cy="210" r="5" fill="#cc0000" opacity="0.7" />
              </svg>
            </div>
          </div>

          {/* Results */}
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
                  <span className="result-label">Bar arrangement</span>
                  <span className="result-value">{result.barArrangement}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Utilization ratio</span>
                  <span className="result-value">{(result.utilization * 100).toFixed(1)}%</span>
                </div>

                {/* Utilization bar */}
                <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                  <div style={{ background: '#1a1a1a', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(result.utilization * 100, 100)}%`,
                      height: '100%',
                      background: result.utilization <= 0.9 ? '#22c55e' : result.utilization <= 1.0 ? '#eab308' : '#ef4444',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
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
