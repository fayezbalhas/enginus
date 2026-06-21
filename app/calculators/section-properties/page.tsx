'use client'

import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import ProGate from '../../components/ProGate'

type ShapeType = 'rectangle' | 'circle' | 'i-section' | 't-section' | 'hollow-rect' | 'hollow-circle'
type DimUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft'

const shapes: { id: ShapeType; name: string; icon: string }[] = [
  { id: 'rectangle', name: 'Rectangle', icon: '▬' },
  { id: 'circle', name: 'Circle', icon: '●' },
  { id: 'i-section', name: 'I-Section', icon: 'Ⅱ' },
  { id: 't-section', name: 'T-Section', icon: '⊤' },
  { id: 'hollow-rect', name: 'Hollow Rectangle', icon: '▢' },
  { id: 'hollow-circle', name: 'Hollow Circle', icon: '◎' },
]

const dimUnits: DimUnit[] = ['mm', 'cm', 'm', 'in', 'ft']
const unitToMm: Record<DimUnit, number> = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 }

interface SectionResult {
  A: number; Ix: number; Iy: number; Sx: number; Sy: number; rx: number; ry: number
}

function computeProps(shape: ShapeType, dims: Record<string, number>, unit: DimUnit): SectionResult | null {
  const s = unitToMm[unit]
  const conv = (v: number) => v * s

  switch (shape) {
    case 'rectangle': {
      const b = conv(dims.b || 0), h = conv(dims.h || 0)
      if (b <= 0 || h <= 0) return null
      const A = b * h
      const Ix = (b * h * h * h) / 12
      const Iy = (h * b * b * b) / 12
      return { A, Ix, Iy, Sx: Ix / (h / 2), Sy: Iy / (b / 2), rx: Math.sqrt(Ix / A), ry: Math.sqrt(Iy / A) }
    }
    case 'circle': {
      const d = conv(dims.d || 0)
      if (d <= 0) return null
      const r = d / 2
      const A = Math.PI * r * r
      const I = (Math.PI * Math.pow(d, 4)) / 64
      return { A, Ix: I, Iy: I, Sx: I / r, Sy: I / r, rx: d / 4, ry: d / 4 }
    }
    case 'i-section': {
      const bf = conv(dims.bf || 0), tf = conv(dims.tf || 0)
      const hw = conv(dims.hw || 0), tw = conv(dims.tw || 0)
      if (bf <= 0 || tf <= 0 || hw <= 0 || tw <= 0) return null
      const H = hw + 2 * tf
      const A = 2 * bf * tf + hw * tw
      const Ix = (bf * Math.pow(H, 3) - (bf - tw) * Math.pow(hw, 3)) / 12
      const Iy = (2 * tf * Math.pow(bf, 3) + hw * Math.pow(tw, 3)) / 12
      return { A, Ix, Iy, Sx: Ix / (H / 2), Sy: Iy / (bf / 2), rx: Math.sqrt(Ix / A), ry: Math.sqrt(Iy / A) }
    }
    case 't-section': {
      const bf = conv(dims.bf || 0), tf = conv(dims.tf || 0)
      const hw = conv(dims.hw || 0), tw = conv(dims.tw || 0)
      if (bf <= 0 || tf <= 0 || hw <= 0 || tw <= 0) return null
      const H = hw + tf
      const A = bf * tf + hw * tw
      const ybar = (bf * tf * (H - tf / 2) + hw * tw * (hw / 2)) / A
      const Ix = (bf * Math.pow(tf, 3)) / 12 + bf * tf * Math.pow(H - tf / 2 - ybar, 2)
        + (tw * Math.pow(hw, 3)) / 12 + hw * tw * Math.pow(hw / 2 - ybar, 2)
      const Iy = (tf * Math.pow(bf, 3) + hw * Math.pow(tw, 3)) / 12
      const yt = H - ybar, yb = ybar
      return { A, Ix, Iy, Sx: Ix / Math.max(yt, yb), Sy: Iy / (bf / 2), rx: Math.sqrt(Ix / A), ry: Math.sqrt(Iy / A) }
    }
    case 'hollow-rect': {
      const bo = conv(dims.bo || 0), ho = conv(dims.ho || 0)
      const bi = conv(dims.bi || 0), hi = conv(dims.hi || 0)
      if (bo <= 0 || ho <= 0 || bi >= bo || hi >= ho || bi <= 0 || hi <= 0) return null
      const A = bo * ho - bi * hi
      const Ix = (bo * Math.pow(ho, 3) - bi * Math.pow(hi, 3)) / 12
      const Iy = (ho * Math.pow(bo, 3) - hi * Math.pow(bi, 3)) / 12
      return { A, Ix, Iy, Sx: Ix / (ho / 2), Sy: Iy / (bo / 2), rx: Math.sqrt(Ix / A), ry: Math.sqrt(Iy / A) }
    }
    case 'hollow-circle': {
      const Do = conv(dims.Do || 0), Di = conv(dims.Di || 0)
      if (Do <= 0 || Di >= Do || Di <= 0) return null
      const A = Math.PI * (Do * Do - Di * Di) / 4
      const I = Math.PI * (Math.pow(Do, 4) - Math.pow(Di, 4)) / 64
      return { A, Ix: I, Iy: I, Sx: I / (Do / 2), Sy: I / (Do / 2), rx: Math.sqrt(I / A), ry: Math.sqrt(I / A) }
    }
  }
}

function renderShapeSvg(shape: ShapeType) {
  const W = 200, H = 180
  switch (shape) {
    case 'rectangle':
      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <rect x="40" y="20" width="120" height="140" fill="none" stroke="#cc0000" strokeWidth="2" />
          <line x1="40" y1="170" x2="160" y2="170" stroke="#666" strokeWidth="1" />
          <text x="100" y={H - 2} textAnchor="middle" fill="#888" fontSize="11" fontFamily="monospace">b</text>
          <line x1="170" y1="20" x2="170" y2="160" stroke="#666" strokeWidth="1" />
          <text x="182" y="95" textAnchor="middle" fill="#888" fontSize="11" fontFamily="monospace">h</text>
        </svg>
      )
    case 'circle':
      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <circle cx="100" cy="90" r="65" fill="none" stroke="#cc0000" strokeWidth="2" />
          <line x1="100" y1="90" x2="165" y2="90" stroke="#666" strokeWidth="1" />
          <text x="132" y="82" textAnchor="middle" fill="#888" fontSize="11" fontFamily="monospace">d/2</text>
        </svg>
      )
    case 'i-section':
      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <polygon points="35,15 165,15 165,35 110,35 110,130 165,130 165,150 35,150 35,130 90,130 90,35 35,35" fill="none" stroke="#cc0000" strokeWidth="2" />
          <text x="100" y={H - 2} textAnchor="middle" fill="#888" fontSize="9" fontFamily="monospace">bf, tf, hw, tw</text>
        </svg>
      )
    case 't-section':
      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <polygon points="35,15 165,15 165,40 110,40 110,155 90,155 90,40 35,40" fill="none" stroke="#cc0000" strokeWidth="2" />
          <text x="100" y={H - 2} textAnchor="middle" fill="#888" fontSize="9" fontFamily="monospace">bf, tf, hw, tw</text>
        </svg>
      )
    case 'hollow-rect':
      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <rect x="30" y="15" width="140" height="145" fill="none" stroke="#cc0000" strokeWidth="2" />
          <rect x="55" y="35" width="90" height="105" fill="none" stroke="#cc0000" strokeWidth="1.5" strokeDasharray="4" />
          <text x="100" y={H - 2} textAnchor="middle" fill="#888" fontSize="9" fontFamily="monospace">outer & inner</text>
        </svg>
      )
    case 'hollow-circle':
      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <circle cx="100" cy="88" r="65" fill="none" stroke="#cc0000" strokeWidth="2" />
          <circle cx="100" cy="88" r="45" fill="none" stroke="#cc0000" strokeWidth="1.5" strokeDasharray="4" />
          <text x="100" y={H - 2} textAnchor="middle" fill="#888" fontSize="9" fontFamily="monospace">Do, Di</text>
        </svg>
      )
  }
}

function getInputFields(shape: ShapeType, unit: DimUnit): { key: string; label: string }[] {
  const u = unit
  switch (shape) {
    case 'rectangle': return [{ key: 'b', label: `Width, b (${u})` }, { key: 'h', label: `Height, h (${u})` }]
    case 'circle': return [{ key: 'd', label: `Diameter, d (${u})` }]
    case 'i-section': return [
      { key: 'bf', label: `Flange width, bf (${u})` }, { key: 'tf', label: `Flange thickness, tf (${u})` },
      { key: 'hw', label: `Web height, hw (${u})` }, { key: 'tw', label: `Web thickness, tw (${u})` },
    ]
    case 't-section': return [
      { key: 'bf', label: `Flange width, bf (${u})` }, { key: 'tf', label: `Flange thickness, tf (${u})` },
      { key: 'hw', label: `Web height, hw (${u})` }, { key: 'tw', label: `Web thickness, tw (${u})` },
    ]
    case 'hollow-rect': return [
      { key: 'bo', label: `Outer width, Bo (${u})` }, { key: 'ho', label: `Outer height, Ho (${u})` },
      { key: 'bi', label: `Inner width, Bi (${u})` }, { key: 'hi', label: `Inner height, Hi (${u})` },
    ]
    case 'hollow-circle': return [
      { key: 'Do', label: `Outer diameter, Do (${u})` }, { key: 'Di', label: `Inner diameter, Di (${u})` },
    ]
  }
}

function getDefaultDims(shape: ShapeType, unit: DimUnit): Record<string, number> {
  const si = ['mm', 'cm', 'm'].includes(unit)
  switch (shape) {
    case 'rectangle': return si ? { b: unit === 'mm' ? 300 : unit === 'cm' ? 30 : 0.3, h: unit === 'mm' ? 500 : unit === 'cm' ? 50 : 0.5 } : { b: unit === 'in' ? 12 : 1, h: unit === 'in' ? 20 : 1.67 }
    case 'circle': return si ? { d: unit === 'mm' ? 400 : unit === 'cm' ? 40 : 0.4 } : { d: unit === 'in' ? 16 : 1.33 }
    case 'i-section': return si ? { bf: unit === 'mm' ? 200 : 20, tf: unit === 'mm' ? 15 : 1.5, hw: unit === 'mm' ? 300 : 30, tw: unit === 'mm' ? 10 : 1 } : { bf: 8, tf: 0.6, hw: 12, tw: 0.4 }
    case 't-section': return si ? { bf: unit === 'mm' ? 300 : 30, tf: unit === 'mm' ? 20 : 2, hw: unit === 'mm' ? 250 : 25, tw: unit === 'mm' ? 12 : 1.2 } : { bf: 12, tf: 0.8, hw: 10, tw: 0.5 }
    case 'hollow-rect': return si ? { bo: unit === 'mm' ? 300 : 30, ho: unit === 'mm' ? 300 : 30, bi: unit === 'mm' ? 260 : 26, hi: unit === 'mm' ? 260 : 26 } : { bo: 12, ho: 12, bi: 10.4, hi: 10.4 }
    case 'hollow-circle': return si ? { Do: unit === 'mm' ? 400 : 40, Di: unit === 'mm' ? 350 : 35 } : { Do: 16, Di: 14 }
  }
}

function formatNum(v: number): string {
  if (Math.abs(v) >= 1e9) return v.toExponential(3)
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + '×10⁶'
  if (Math.abs(v) >= 1e3) return v.toFixed(1)
  return v.toFixed(2)
}

export default function SectionPropertiesPage() {
  const [shape, setShape] = useState<ShapeType>('rectangle')
  const [unit, setUnit] = useState<DimUnit>('mm')
  const [dims, setDims] = useState<Record<string, number>>(getDefaultDims('rectangle', 'mm'))

  const changeShape = (s: ShapeType) => {
    setShape(s)
    setDims(getDefaultDims(s, unit))
  }
  const changeUnit = (u: DimUnit) => {
    setUnit(u)
    setDims(getDefaultDims(shape, u))
  }

  const result = useMemo(() => computeProps(shape, dims, unit), [shape, dims, unit])
  const fields = getInputFields(shape, unit)
  const outUnit = unit

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rc-input { background: #111; border: 1px solid #222; color: #f0f0f0; padding: 10px 14px; border-radius: 4px; font-size: 14px; width: 100%; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; }
        .rc-input:focus { border-color: #cc0000; }
        .rc-label { display: block; font-size: 12px; color: #888; margin-bottom: 6px; font-weight: 500; }
        .toggle-btn { padding: 8px 16px; border: 1px solid #222; background: transparent; color: #888; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .toggle-btn.active { background: #cc0000; border-color: #cc0000; color: #fff; }
        .toggle-btn:first-child { border-radius: 4px 0 0 4px; }
        .toggle-btn:last-child { border-radius: 0 4px 4px 0; }
        .result-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #1a1a1a; }
        .result-label { font-size: 14px; color: #888; }
        .result-value { font-size: 14px; font-weight: 600; color: #f0f0f0; font-family: 'Space Grotesk', monospace; }
        .shape-btn {
          background: #111; border: 1px solid #1e1e1e; border-radius: 6px; padding: 14px 16px;
          cursor: pointer; text-align: center; transition: all 0.25s; color: #888;
          font-family: 'Inter', sans-serif; font-size: 13px;
        }
        .shape-btn:hover { border-color: #444; color: #ccc; }
        .shape-btn.active { border-color: #cc0000; color: #f0f0f0; background: #151515; }
        .calc-wrap { max-width: 960px; margin: 0 auto; padding: 48px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 768px) {
          .calc-wrap { padding: 24px 20px; }
          .grid-2 { grid-template-columns: 1fr; }
          .calc-panels { grid-template-columns: 1fr !important; }
          .shape-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      <Navbar activePage="calculators" />

      <ProGate>
      <div className="calc-wrap">
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '12px' }}>Calculator</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Section Properties
          </h1>
          <p style={{ fontSize: '16px', color: '#666', lineHeight: 1.6 }}>Calculate geometric properties for common structural cross-sections.</p>
        </div>

        {/* Shape selector */}
        <div className="shape-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {shapes.map(s => (
            <button key={s.id} className={`shape-btn${shape === s.id ? ' active' : ''}`} onClick={() => changeShape(s.id)}>
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '11px' }}>{s.name}</div>
            </button>
          ))}
        </div>

        {/* Unit selector */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex' }}>
            {dimUnits.map(u => (
              <button key={u} className={`toggle-btn${unit === u ? ' active' : ''}`} onClick={() => changeUnit(u)}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="calc-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Inputs + Shape drawing */}
          <div>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '28px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '24px', color: '#ccc' }}>Dimensions</h2>
              <div className="grid-2">
                {fields.map(f => (
                  <div key={f.key}>
                    <label className="rc-label">{f.label}</label>
                    <input className="rc-input" type="number" step="any" value={dims[f.key] ?? ''} onChange={e => setDims(prev => ({ ...prev, [f.key]: +e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '20px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '180px' }}>{renderShapeSvg(shape)}</div>
            </div>
          </div>

          {/* Results */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '28px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '24px', color: '#ccc' }}>Properties</h2>

            {result ? (
              <>
                <div className="result-row">
                  <span className="result-label">Area, A</span>
                  <span className="result-value">{formatNum(result.A)} {outUnit}²</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Ix (strong axis)</span>
                  <span className="result-value">{formatNum(result.Ix)} {outUnit}⁴</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Iy (weak axis)</span>
                  <span className="result-value">{formatNum(result.Iy)} {outUnit}⁴</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Sx (section mod.)</span>
                  <span className="result-value">{formatNum(result.Sx)} {outUnit}³</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Sy (section mod.)</span>
                  <span className="result-value">{formatNum(result.Sy)} {outUnit}³</span>
                </div>
                <div className="result-row">
                  <span className="result-label">rx (radius gyr.)</span>
                  <span className="result-value">{formatNum(result.rx)} {outUnit}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">ry (radius gyr.)</span>
                  <span className="result-value">{formatNum(result.ry)} {outUnit}</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>
                <p style={{ fontSize: '14px' }}>Enter valid dimensions to see results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </ProGate>
    </main>
  )
}
