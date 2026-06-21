'use client'

import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import ProGate from '../../components/ProGate'

type DesignCode = 'EC2' | 'ACI'
type UnitSystem = 'SI' | 'Imperial'
type SlabType = 'one-way' | 'two-way'

const SI_DEFAULTS = { span: 5000, spanY: 5000, thickness: 200, fck: 30, fyk: 500, deadLoad: 5, liveLoad: 3, cover: 25 }
const IMP_DEFAULTS = { span: 16, spanY: 16, thickness: 8, fck: 4000, fyk: 60000, deadLoad: 100, liveLoad: 60, cover: 1 }

function designSlab(
  span: number, spanY: number, thickness: number, fck: number, fyk: number,
  deadLoad: number, liveLoad: number, cover: number,
  code: DesignCode, units: UnitSystem, slabType: SlabType
) {
  if (span <= 0 || thickness <= 0 || fck <= 0 || fyk <= 0) return null

  const barDia = units === 'SI' ? 12 : 0.5
  const d = units === 'SI' ? thickness - cover - barDia / 2 : thickness - cover - barDia / 2

  let wu: number, Md: number

  if (code === 'EC2') {
    wu = units === 'SI'
      ? (1.35 * deadLoad + 1.5 * liveLoad) * 1
      : (1.35 * deadLoad + 1.5 * liveLoad) * (1 / 12)
  } else {
    wu = units === 'SI'
      ? (1.2 * deadLoad + 1.6 * liveLoad) * 1
      : (1.2 * deadLoad + 1.6 * liveLoad) * (1 / 12)
  }

  const L = units === 'SI' ? span / 1000 : span

  if (slabType === 'one-way') {
    Md = (wu * L * L) / 8
  } else {
    const ratio = Math.max(span, spanY) / Math.min(span, spanY)
    if (ratio > 2) {
      Md = (wu * L * L) / 8
    } else {
      const alpha = 1 / (1 + Math.pow(span / spanY, 4))
      Md = alpha * (wu * L * L) / 8
    }
  }

  let As_req: number, As_min: number
  const bStrip = units === 'SI' ? 1000 : 12

  if (code === 'EC2') {
    const fcd = fck / 1.5
    const fyd = fyk / 1.15
    const Md_Nmm = units === 'SI' ? Md * 1e6 : Md * 12000

    const K = Md_Nmm / (fcd * bStrip * d * d)
    const z = d * Math.min(0.5 + Math.sqrt(0.25 - K / 1.134), 0.95)

    As_req = Md_Nmm / (fyd * z)

    const fctm = units === 'SI' ? 0.3 * Math.pow(fck, 2 / 3) : 0.3 * Math.pow(fck / 145, 2 / 3) * 145
    As_min = Math.max(0.26 * (fctm / fyk) * bStrip * d, 0.0013 * bStrip * d)
  } else {
    const phi = 0.9
    const Md_work = units === 'SI' ? Md * 1e6 : Md * 12000

    let As = Md_work / (phi * fyk * d * 0.9)
    for (let i = 0; i < 20; i++) {
      const a = (As * fyk) / (0.85 * fck * bStrip)
      As = Md_work / (phi * fyk * (d - a / 2))
    }
    As_req = As

    if (units === 'SI') {
      As_min = Math.max((0.25 * Math.sqrt(fck) / fyk) * bStrip * d, (1.4 / fyk) * bStrip * d)
    } else {
      As_min = Math.max((3 * Math.sqrt(fck) / fyk) * bStrip * d, (200 / fyk) * bStrip * d)
    }
  }

  const As_provided = Math.max(As_req, As_min)

  const barArea = units === 'SI' ? Math.PI * Math.pow(barDia, 2) / 4 : Math.PI * Math.pow(barDia, 2) / 4
  const spacing = (barArea / As_provided) * bStrip
  const maxSpacing = units === 'SI' ? Math.min(3 * thickness, 300) : Math.min(3 * thickness, 12)
  const spacingUsed = Math.min(Math.floor(spacing), maxSpacing)

  const spanD = (units === 'SI' ? span : span * 25.4) / (units === 'SI' ? d : d * 25.4)
  let allowedSpanD: number
  if (code === 'EC2') {
    allowedSpanD = slabType === 'one-way' ? 20 : 30
  } else {
    allowedSpanD = slabType === 'one-way' ? 24 : 33
  }
  const deflectionOk = spanD <= allowedSpanD

  const rho = As_provided / (bStrip * d)
  const rhoMax = code === 'EC2' ? 0.04 : 0.85 * 0.85 * (fck / fyk) * (0.003 / 0.008)
  const steelOk = rho <= rhoMax
  const allPass = deflectionOk && steelOk && spacingUsed > 0

  if (units === 'Imperial') {
    return {
      As_req: As_req / 645.16, As_min: As_min / 645.16, As_provided: As_provided / 645.16,
      spacing: spacingUsed, maxSpacing, spanD: spanD.toFixed(1), allowedSpanD,
      deflectionOk, steelOk, allPass,
      barLabel: `#4 @ ${spacingUsed}" c/c`,
    }
  }
  return {
    As_req, As_min, As_provided,
    spacing: spacingUsed, maxSpacing, spanD: spanD.toFixed(1), allowedSpanD,
    deflectionOk, steelOk, allPass,
    barLabel: `Ø${barDia} @ ${spacingUsed} mm c/c`,
  }
}

export default function RcSlabPage() {
  const [code, setCode] = useState<DesignCode>('EC2')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const [slabType, setSlabType] = useState<SlabType>('one-way')
  const defaults = units === 'SI' ? SI_DEFAULTS : IMP_DEFAULTS
  const [span, setSpan] = useState(defaults.span)
  const [spanY, setSpanY] = useState(defaults.spanY)
  const [thickness, setThickness] = useState(defaults.thickness)
  const [fck, setFck] = useState(defaults.fck)
  const [fyk, setFyk] = useState(defaults.fyk)
  const [deadLoad, setDeadLoad] = useState(defaults.deadLoad)
  const [liveLoad, setLiveLoad] = useState(defaults.liveLoad)
  const [cover, setCover] = useState(defaults.cover)

  const switchUnits = (u: UnitSystem) => {
    setUnits(u)
    const def = u === 'SI' ? SI_DEFAULTS : IMP_DEFAULTS
    setSpan(def.span); setSpanY(def.spanY); setThickness(def.thickness)
    setFck(def.fck); setFyk(def.fyk); setDeadLoad(def.deadLoad); setLiveLoad(def.liveLoad); setCover(def.cover)
  }

  const result = useMemo(
    () => designSlab(span, spanY, thickness, fck, fyk, deadLoad, liveLoad, cover, code, units, slabType),
    [span, spanY, thickness, fck, fyk, deadLoad, liveLoad, cover, code, units, slabType]
  )

  const dimUnit = units === 'SI' ? 'mm' : 'in'
  const stressUnit = units === 'SI' ? 'MPa' : 'psi'
  const loadUnit = units === 'SI' ? 'kN/m²' : 'psf'
  const areaUnit = units === 'SI' ? 'mm²/m' : 'in²/ft'

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
        .check-pass { color: #22c55e; font-size: 13px; font-weight: 600; }
        .check-fail { color: #ef4444; font-size: 13px; font-weight: 600; }
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

      <ProGate>
      <div className="calc-wrap">
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '12px' }}>Pro Calculator</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            RC Slab Design
          </h1>
          <p style={{ fontSize: '16px', color: '#666', lineHeight: 1.6 }}>Reinforced concrete slab design per {code === 'EC2' ? 'Eurocode 2' : 'ACI 318'}.</p>
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
          <div>
            <button className={`toggle-btn${slabType === 'one-way' ? ' active' : ''}`} onClick={() => setSlabType('one-way')}>One-Way</button>
            <button className={`toggle-btn${slabType === 'two-way' ? ' active' : ''}`} onClick={() => setSlabType('two-way')}>Two-Way</button>
          </div>
        </div>

        <div className="calc-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Inputs */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '28px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '24px', color: '#ccc' }}>Input Parameters</h2>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div>
                <label className="rc-label">Span, Lx ({dimUnit})</label>
                <input className="rc-input" type="number" value={span} onChange={e => setSpan(+e.target.value)} />
              </div>
              {slabType === 'two-way' && (
                <div>
                  <label className="rc-label">Span, Ly ({dimUnit})</label>
                  <input className="rc-input" type="number" value={spanY} onChange={e => setSpanY(+e.target.value)} />
                </div>
              )}
            </div>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div>
                <label className="rc-label">Thickness ({dimUnit})</label>
                <input className="rc-input" type="number" value={thickness} onChange={e => setThickness(+e.target.value)} />
              </div>
              <div>
                <label className="rc-label">Cover ({dimUnit})</label>
                <input className="rc-input" type="number" value={cover} onChange={e => setCover(+e.target.value)} />
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

            <div className="grid-2">
              <div>
                <label className="rc-label">Dead load ({loadUnit})</label>
                <input className="rc-input" type="number" value={deadLoad} onChange={e => setDeadLoad(+e.target.value)} />
              </div>
              <div>
                <label className="rc-label">Live load ({loadUnit})</label>
                <input className="rc-input" type="number" value={liveLoad} onChange={e => setLiveLoad(+e.target.value)} />
              </div>
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
                  <span className="result-label">Provided As</span>
                  <span className="result-value" style={{ color: '#cc0000' }}>{result.As_provided.toFixed(1)} {areaUnit}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Bar spacing</span>
                  <span className="result-value">{result.barLabel}</span>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid #1e1e1e', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Checks</h3>

                  <div className="result-row">
                    <span className="result-label">Deflection (L/d = {result.spanD})</span>
                    <span className={result.deflectionOk ? 'check-pass' : 'check-fail'}>
                      {result.deflectionOk ? `✓ ≤ ${result.allowedSpanD}` : `✗ > ${result.allowedSpanD}`}
                    </span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Steel ratio</span>
                    <span className={result.steelOk ? 'check-pass' : 'check-fail'}>
                      {result.steelOk ? '✓ OK' : '✗ Exceeds limit'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <span className={result.allPass ? 'pass-badge' : 'fail-badge'}>
                    {result.allPass ? 'ALL CHECKS PASS' : 'CHECK FAILED'}
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
      </ProGate>
    </main>
  )
}
