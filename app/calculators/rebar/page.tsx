'use client'

import { useState, useCallback } from 'react'
import Navbar from '../../components/Navbar'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
type UnitSystem = 'SI' | 'Imperial'
type DesignCode = 'EC' | 'ACI'
type TabId = 'bar-area' | 'slab' | 'beam' | 'dev-length'

interface BarDef {
  label: string
  diameter_mm: number
  diameter_in: number
}

/* ------------------------------------------------------------------ */
/*  Bar databases                                                     */
/* ------------------------------------------------------------------ */
const EC_BARS: BarDef[] = [
  { label: 'T6',  diameter_mm: 6,  diameter_in: 6 / 25.4 },
  { label: 'T8',  diameter_mm: 8,  diameter_in: 8 / 25.4 },
  { label: 'T10', diameter_mm: 10, diameter_in: 10 / 25.4 },
  { label: 'T12', diameter_mm: 12, diameter_in: 12 / 25.4 },
  { label: 'T16', diameter_mm: 16, diameter_in: 16 / 25.4 },
  { label: 'T20', diameter_mm: 20, diameter_in: 20 / 25.4 },
  { label: 'T25', diameter_mm: 25, diameter_in: 25 / 25.4 },
  { label: 'T32', diameter_mm: 32, diameter_in: 32 / 25.4 },
  { label: 'T40', diameter_mm: 40, diameter_in: 40 / 25.4 },
]

const ACI_BARS: BarDef[] = [
  { label: '#3',  diameter_mm: 9.525,  diameter_in: 0.375 },
  { label: '#4',  diameter_mm: 12.7,   diameter_in: 0.5 },
  { label: '#5',  diameter_mm: 15.875, diameter_in: 0.625 },
  { label: '#6',  diameter_mm: 19.05,  diameter_in: 0.75 },
  { label: '#7',  diameter_mm: 22.225, diameter_in: 0.875 },
  { label: '#8',  diameter_mm: 25.4,   diameter_in: 1.0 },
  { label: '#9',  diameter_mm: 28.651, diameter_in: 1.128 },
  { label: '#10', diameter_mm: 32.258, diameter_in: 1.27 },
  { label: '#11', diameter_mm: 35.814, diameter_in: 1.41 },
  { label: '#14', diameter_mm: 43.002, diameter_in: 1.693 },
  { label: '#18', diameter_mm: 57.328, diameter_in: 2.257 },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
const STEEL_DENSITY = 7850 // kg/m3

function barArea_mm2(d_mm: number): number {
  return (Math.PI / 4) * d_mm * d_mm
}

function barArea_in2(d_in: number): number {
  return (Math.PI / 4) * d_in * d_in
}

function barWeight_kgm(d_mm: number): number {
  return barArea_mm2(d_mm) * STEEL_DENSITY / 1e6
}

function barWeight_lbft(d_in: number): number {
  // 1 kg/m = 0.671969 lb/ft; area_in2 * density_lb/in3 * 12in/ft
  // density_lb/in3 = 7850 * 2.20462 / (39.3701^3) = 0.2836 lb/in3
  const area_in2 = barArea_in2(d_in)
  return area_in2 * 0.2836 * 12
}

/** Format a number nicely. */
function fmt(v: number, decimals?: number): string {
  if (!isFinite(v)) return '--'
  const abs = Math.abs(v)
  if (abs === 0) return '0'
  const d = decimals !== undefined
    ? decimals
    : abs >= 1000 ? 1 : abs >= 100 ? 2 : abs >= 1 ? 3 : abs >= 0.01 ? 4 : 6
  const s = v.toFixed(d)
  // strip trailing zeros after decimal point but keep at least one decimal
  if (s.indexOf('.') !== -1) {
    const trimmed = s.replace(/0+$/, '').replace(/\.$/, '')
    // if we trimmed everything, return at least one decimal
    if (trimmed === '' || trimmed === '-') return v.toFixed(1)
    return trimmed
  }
  return s
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function RebarCalculatorPage() {
  const [code, setCode] = useState<DesignCode>('EC')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const [activeTab, setActiveTab] = useState<TabId>('bar-area')
  const [copied, setCopied] = useState<string | null>(null)

  // Tab 1 - Bar Area
  const [tab1BarIdx, setTab1BarIdx] = useState(4) // T16 or #5
  const [tab1NumBars, setTab1NumBars] = useState('4')
  const [tab1ReqArea, setTab1ReqArea] = useState('1200')
  const [tab1Spacing, setTab1Spacing] = useState('150')

  // Tab 2 - Slab
  const [tab2BarIdx, setTab2BarIdx] = useState(4)
  const [tab2ReqAs, setTab2ReqAs] = useState('1000')
  const [tab2Spacing, setTab2Spacing] = useState('200')
  const [tab2Mode, setTab2Mode] = useState<'spacing' | 'area'>('spacing')

  // Tab 3 - Beam
  const [tab3Width, setTab3Width] = useState('300')
  const [tab3Depth, setTab3Depth] = useState('500')
  const [tab3ReqAs, setTab3ReqAs] = useState('1500')

  // Tab 4 - Development Length
  const [tab4BarIdx, setTab4BarIdx] = useState(4)
  const [tab4Fck, setTab4Fck] = useState('30')
  const [tab4Fy, setTab4Fy] = useState('500')
  const [tab4Bond, setTab4Bond] = useState<'good' | 'poor'>('good')

  const bars = code === 'EC' ? EC_BARS : ACI_BARS

  // When switching code, clamp bar index
  const handleCodeChange = useCallback((c: DesignCode) => {
    const newBars = c === 'EC' ? EC_BARS : ACI_BARS
    setCode(c)
    if (tab1BarIdx >= newBars.length) setTab1BarIdx(0)
    if (tab2BarIdx >= newBars.length) setTab2BarIdx(0)
    if (tab4BarIdx >= newBars.length) setTab4BarIdx(0)
    // Set default fy
    if (c === 'EC') {
      setTab4Fy('500')
      setTab4Fck('30')
    } else {
      setTab4Fy(units === 'SI' ? '420' : '60')
      setTab4Fck(units === 'SI' ? '28' : '4')
    }
  }, [tab1BarIdx, tab2BarIdx, tab4BarIdx, units])

  const handleUnitsChange = useCallback((u: UnitSystem) => {
    setUnits(u)
    // Convert default values
    if (u === 'Imperial' && units === 'SI') {
      setTab4Fy(code === 'EC' ? '72.5' : '60')
      setTab4Fck(code === 'EC' ? '4.35' : '4')
    } else if (u === 'SI' && units === 'Imperial') {
      setTab4Fy(code === 'EC' ? '500' : '420')
      setTab4Fck(code === 'EC' ? '30' : '28')
    }
  }, [units, code])

  const handleCopy = (label: string, value: string) => {
    copyToClipboard(value)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  const isSI = units === 'SI'

  function getBarDiam(bar: BarDef): number {
    return isSI ? bar.diameter_mm : bar.diameter_in
  }
  function getBarArea(bar: BarDef): number {
    return isSI ? barArea_mm2(bar.diameter_mm) : barArea_in2(bar.diameter_in)
  }
  function getBarWeight(bar: BarDef): number {
    return isSI ? barWeight_kgm(bar.diameter_mm) : barWeight_lbft(bar.diameter_in)
  }

  const diamUnit = isSI ? 'mm' : 'in'
  const areaUnit = isSI ? 'mm²' : 'in²'
  const areaPerLenUnit = isSI ? 'mm²/m' : 'in²/ft'
  const weightUnit = isSI ? 'kg/m' : 'lb/ft'
  const lengthUnit = isSI ? 'mm' : 'in'
  const stressUnit = isSI ? 'MPa' : 'ksi'

  /* ================================================================ */
  /*  TAB 1 - BAR AREA CALCULATOR                                     */
  /* ================================================================ */
  function renderTab1() {
    const bar = bars[tab1BarIdx] || bars[0]

    // Calculator 1: N bars -> total area
    const n1 = parseFloat(tab1NumBars) || 0
    const totalArea = n1 * getBarArea(bar)

    // Calculator 2: Required area -> min bars for each size
    const reqA = parseFloat(tab1ReqArea) || 0

    // Calculator 3: Spacing -> area per meter/foot width
    const sp = parseFloat(tab1Spacing) || 0
    const areaPerWidth = sp > 0 ? getBarArea(bar) * (isSI ? 1000 : 12) / sp : 0

    return (
      <>
        {/* Bar reference table */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title">
            <span className="accent">{code === 'EC' ? 'Eurocode' : 'ACI'}</span> Bar Reference
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Bar</th>
                  <th>Diameter ({diamUnit})</th>
                  <th>Area ({areaUnit})</th>
                  <th>Weight ({weightUnit})</th>
                </tr>
              </thead>
              <tbody>
                {bars.map((b, i) => (
                  <tr key={i} style={i === tab1BarIdx ? { background: 'rgba(204,0,0,0.08)' } : undefined}>
                    <td style={{ fontWeight: 600 }}>{b.label}</td>
                    <td>{fmt(getBarDiam(b))}</td>
                    <td>{fmt(getBarArea(b))}</td>
                    <td>{fmt(getBarWeight(b))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculator 1: Number of bars */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title">
            <span className="accent">1.</span> Total Area from Number of Bars
          </div>
          <div className="field-grid">
            <div className="field">
              <label className="field-label">Bar size</label>
              <select className="field-select" value={tab1BarIdx} onChange={e => setTab1BarIdx(Number(e.target.value))}>
                {bars.map((b, i) => (
                  <option key={i} value={i}>{b.label} ({fmt(getBarDiam(b))} {diamUnit})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Number of bars</label>
              <input className="field-input" type="number" min="1" step="1" value={tab1NumBars} onChange={e => setTab1NumBars(e.target.value)} />
            </div>
          </div>
          <div className="stat-row" style={{ marginTop: '16px' }}>
            <div className="stat-box">
              <div className="stat-label">Total area (As)</div>
              <div className="stat-value">{fmt(totalArea)} {areaUnit}
                <button className="copy-btn" onClick={() => handleCopy('t1-total', fmt(totalArea))} title="Copy">
                  {copied === 't1-total' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calculator 2: Required area -> number of bars */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title">
            <span className="accent">2.</span> Minimum Bars for Required Area
          </div>
          <div className="field" style={{ maxWidth: '300px' }}>
            <label className="field-label">Required area ({areaUnit})</label>
            <input className="field-input" type="number" min="0" step="1" value={tab1ReqArea} onChange={e => setTab1ReqArea(e.target.value)} />
          </div>
          {reqA > 0 && (
            <div style={{ overflowX: 'auto', marginTop: '14px' }}>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Bar</th>
                    <th>Bar area ({areaUnit})</th>
                    <th>Min. bars</th>
                    <th>Provided ({areaUnit})</th>
                  </tr>
                </thead>
                <tbody>
                  {bars.map((b, i) => {
                    const a = getBarArea(b)
                    const nBars = Math.ceil(reqA / a)
                    const provided = nBars * a
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{b.label}</td>
                        <td>{fmt(a)}</td>
                        <td style={{ fontWeight: 700, color: '#ff4444' }}>{nBars}</td>
                        <td>{fmt(provided)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Calculator 3: Spacing -> area per width */}
        <div className="card">
          <div className="card-title">
            <span className="accent">3.</span> Area per {isSI ? 'Meter' : 'Foot'} Width
          </div>
          <div className="field-grid">
            <div className="field">
              <label className="field-label">Bar size</label>
              <select className="field-select" value={tab1BarIdx} onChange={e => setTab1BarIdx(Number(e.target.value))}>
                {bars.map((b, i) => (
                  <option key={i} value={i}>{b.label} ({fmt(getBarDiam(b))} {diamUnit})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Spacing ({lengthUnit})</label>
              <input className="field-input" type="number" min="1" step="1" value={tab1Spacing} onChange={e => setTab1Spacing(e.target.value)} />
            </div>
          </div>
          <div className="stat-row" style={{ marginTop: '16px' }}>
            <div className="stat-box">
              <div className="stat-label">As per {isSI ? 'meter' : 'foot'} width</div>
              <div className="stat-value">{fmt(areaPerWidth)} {areaPerLenUnit}
                <button className="copy-btn" onClick={() => handleCopy('t1-apw', fmt(areaPerWidth))} title="Copy">
                  {copied === 't1-apw' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* ================================================================ */
  /*  TAB 2 - SLAB REINFORCEMENT                                      */
  /* ================================================================ */
  function renderTab2() {
    const bar = bars[tab2BarIdx] || bars[0]
    const bArea = getBarArea(bar)
    const reqAs = parseFloat(tab2ReqAs) || 0
    const spacing = parseFloat(tab2Spacing) || 0
    const widthFactor = isSI ? 1000 : 12 // 1000mm per m or 12in per ft

    const slabMode: string = tab2Mode
    if (slabMode === 'spacing') {
      // Given required As, find spacing
      const reqSpacing = reqAs > 0 ? bArea * widthFactor / reqAs : 0
      // Also show provided As at rounded-down spacing
      const roundedSpacing = reqSpacing > 0 ? Math.floor(reqSpacing / (isSI ? 25 : 0.5)) * (isSI ? 25 : 0.5) : 0
      const asProvided = roundedSpacing > 0 ? bArea * widthFactor / roundedSpacing : 0
      const pass = asProvided >= reqAs && reqAs > 0

      return (
        <div className="card">
          <div className="card-title">
            <span className="accent">Slab</span> Reinforcement - Find Spacing
          </div>
          <div className="field-grid">
            <div className="field">
              <label className="field-label">Bar size</label>
              <select className="field-select" value={tab2BarIdx} onChange={e => setTab2BarIdx(Number(e.target.value))}>
                {bars.map((b, i) => (
                  <option key={i} value={i}>{b.label} ({fmt(getBarDiam(b))} {diamUnit})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Required As ({areaPerLenUnit})</label>
              <input className="field-input" type="number" min="0" step="1" value={tab2ReqAs} onChange={e => setTab2ReqAs(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', marginBottom: '6px' }}>
            <button className={`filter-btn${tab2Mode === 'spacing' ? ' active' : ''}`} onClick={() => setTab2Mode('spacing')}>Find Spacing</button>
            <button className={`filter-btn${tab2Mode === 'area' ? ' active' : ''}`} onClick={() => setTab2Mode('area')}>Check Area</button>
          </div>

          {reqAs > 0 && (
            <div className="stat-grid" style={{ marginTop: '14px' }}>
              <div className="stat-box">
                <div className="stat-label">Required spacing (exact)</div>
                <div className="stat-value">{fmt(reqSpacing)} {lengthUnit}
                  <button className="copy-btn" onClick={() => handleCopy('t2-sp', fmt(reqSpacing))} title="Copy">
                    {copied === 't2-sp' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Rounded spacing</div>
                <div className="stat-value">{fmt(roundedSpacing)} {lengthUnit}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">As,provided at rounded spacing</div>
                <div className="stat-value">{fmt(asProvided)} {areaPerLenUnit}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">As,required</div>
                <div className="stat-value">{fmt(reqAs)} {areaPerLenUnit}</div>
              </div>
              <div className="stat-box" style={{ gridColumn: '1 / -1' }}>
                <div className="stat-label">Check</div>
                <div className="stat-value">
                  As,provided / As,required = {reqAs > 0 ? fmt(asProvided / reqAs, 3) : '--'}
                  {reqAs > 0 && (
                    <span className={pass ? 'badge-pass' : 'badge-fail'} style={{ marginLeft: '12px' }}>
                      {pass ? 'PASS' : 'FAIL'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Mode: check area from spacing
    const asProvided = spacing > 0 ? bArea * widthFactor / spacing : 0
    const pass = asProvided >= reqAs && reqAs > 0

    return (
      <div className="card">
        <div className="card-title">
          <span className="accent">Slab</span> Reinforcement - Check Area
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="field-label">Bar size</label>
            <select className="field-select" value={tab2BarIdx} onChange={e => setTab2BarIdx(Number(e.target.value))}>
              {bars.map((b, i) => (
                <option key={i} value={i}>{b.label} ({fmt(getBarDiam(b))} {diamUnit})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Required As ({areaPerLenUnit})</label>
            <input className="field-input" type="number" min="0" step="1" value={tab2ReqAs} onChange={e => setTab2ReqAs(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Spacing ({lengthUnit})</label>
            <input className="field-input" type="number" min="1" step="1" value={tab2Spacing} onChange={e => setTab2Spacing(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', marginBottom: '6px' }}>
          <button className={`filter-btn${slabMode === 'spacing' ? ' active' : ''}`} onClick={() => setTab2Mode('spacing')}>Find Spacing</button>
          <button className={`filter-btn${slabMode === 'area' ? ' active' : ''}`} onClick={() => setTab2Mode('area')}>Check Area</button>
        </div>

        <div className="stat-grid" style={{ marginTop: '14px' }}>
          <div className="stat-box">
            <div className="stat-label">As,provided</div>
            <div className="stat-value">{fmt(asProvided)} {areaPerLenUnit}
              <button className="copy-btn" onClick={() => handleCopy('t2-asp', fmt(asProvided))} title="Copy">
                {copied === 't2-asp' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">As,required</div>
            <div className="stat-value">{fmt(reqAs)} {areaPerLenUnit}</div>
          </div>
          <div className="stat-box" style={{ gridColumn: '1 / -1' }}>
            <div className="stat-label">Check</div>
            <div className="stat-value">
              As,provided / As,required = {reqAs > 0 ? fmt(asProvided / reqAs, 3) : '--'}
              {reqAs > 0 && (
                <span className={pass ? 'badge-pass' : 'badge-fail'} style={{ marginLeft: '12px' }}>
                  {pass ? 'PASS' : 'FAIL'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /*  TAB 3 - BEAM REINFORCEMENT                                      */
  /* ================================================================ */
  function renderTab3() {
    const b = parseFloat(tab3Width) || 0
    const d = parseFloat(tab3Depth) || 0
    const reqAs = parseFloat(tab3ReqAs) || 0

    const cover = code === 'EC' ? (isSI ? 40 : 40 / 25.4) : (isSI ? 38.1 : 1.5)

    interface BarOption {
      bar: BarDef
      nBars: number
      asProvided: number
      clearSpacing: number
      minSpacing: number
      spacingOk: boolean
      ratio: number
    }

    const options: BarOption[] = []

    if (b > 0 && d > 0 && reqAs > 0) {
      for (const bar of bars) {
        const bArea = getBarArea(bar)
        const bDiam = getBarDiam(bar)
        const nBars = Math.ceil(reqAs / bArea)
        if (nBars < 1 || nBars > 20) continue
        const asProvided = nBars * bArea
        const minSpacing = code === 'EC'
          ? Math.max(bDiam, isSI ? 25 : 1)
          : Math.max(bDiam, isSI ? 25.4 : 1)
        const clearSpacing = nBars > 1
          ? (b - 2 * cover - nBars * bDiam) / (nBars - 1)
          : b - 2 * cover - bDiam
        const spacingOk = clearSpacing >= minSpacing
        options.push({
          bar,
          nBars,
          asProvided,
          clearSpacing,
          minSpacing,
          spacingOk,
          ratio: asProvided / reqAs,
        })
      }
      // Sort by ratio closest to 1 (but >= 1 preferred)
      options.sort((a, o) => {
        if (a.spacingOk !== o.spacingOk) return a.spacingOk ? -1 : 1
        return a.ratio - o.ratio
      })
    }

    return (
      <div className="card">
        <div className="card-title">
          <span className="accent">Beam</span> Reinforcement Layout
        </div>
        <div className="field-grid cols-3">
          <div className="field">
            <label className="field-label">Beam width, b ({lengthUnit})</label>
            <input className="field-input" type="number" min="0" step="1" value={tab3Width} onChange={e => setTab3Width(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Effective depth, d ({lengthUnit})</label>
            <input className="field-input" type="number" min="0" step="1" value={tab3Depth} onChange={e => setTab3Depth(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Required As ({areaUnit})</label>
            <input className="field-input" type="number" min="0" step="1" value={tab3ReqAs} onChange={e => setTab3ReqAs(e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
          Cover = {fmt(cover)} {lengthUnit} ({code === 'EC' ? 'EC2 default' : 'ACI default'})
        </div>

        {options.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Bar</th>
                  <th>No. bars</th>
                  <th>As,prov ({areaUnit})</th>
                  <th>Ratio</th>
                  <th>Clear spacing ({lengthUnit})</th>
                  <th>Min spacing ({lengthUnit})</th>
                  <th>Fits?</th>
                </tr>
              </thead>
              <tbody>
                {options.map((opt, i) => (
                  <tr key={i} style={!opt.spacingOk ? { opacity: 0.6 } : undefined}>
                    <td style={{ fontWeight: 600 }}>{opt.bar.label}</td>
                    <td style={{ fontWeight: 700, color: '#ff4444' }}>{opt.nBars}</td>
                    <td>{fmt(opt.asProvided)}</td>
                    <td>{fmt(opt.ratio, 3)}</td>
                    <td>{fmt(opt.clearSpacing)}</td>
                    <td>{fmt(opt.minSpacing)}</td>
                    <td>
                      <span className={opt.spacingOk ? 'badge-pass' : 'badge-fail'}>
                        {opt.spacingOk ? 'OK' : 'NO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {b > 0 && d > 0 && reqAs > 0 && options.length === 0 && (
          <div style={{ color: '#ff4444', fontSize: '13px', marginTop: '16px' }}>
            No feasible bar arrangement found. Try a wider beam or reduce As.
          </div>
        )}
      </div>
    )
  }

  /* ================================================================ */
  /*  TAB 4 - DEVELOPMENT LENGTH                                      */
  /* ================================================================ */
  function renderTab4() {
    const bar = bars[tab4BarIdx] || bars[0]
    const fck = parseFloat(tab4Fck) || 0
    const fy = parseFloat(tab4Fy) || 0
    const isGood = tab4Bond === 'good'

    interface CalcStep {
      label: string
      formula: string
      value: string
    }

    const steps: CalcStep[] = []
    let result = 0

    if (code === 'EC') {
      // EC2 development length
      // All in SI (MPa, mm)
      const phi = bar.diameter_mm
      const fck_mpa = isSI ? fck : fck * 6.89476 // ksi -> MPa
      const fy_mpa = isSI ? fy : fy * 6.89476

      // fctk,0.05 = 0.7 * 0.3 * fck^(2/3) for fck <= 50 MPa
      const fctk005 = 0.7 * 0.3 * Math.pow(fck_mpa, 2 / 3)
      steps.push({
        label: 'Characteristic tensile strength',
        formula: 'fctk,0.05 = 0.7 x 0.3 x fck^(2/3)',
        value: `${fmt(fctk005)} MPa`,
      })

      // fctd = alpha_ct * fctk,0.05 / gamma_c = 1.0 * fctk / 1.5
      const fctd = 1.0 * fctk005 / 1.5
      steps.push({
        label: 'Design tensile strength',
        formula: 'fctd = 1.0 x fctk,0.05 / 1.5',
        value: `${fmt(fctd)} MPa`,
      })

      // eta1
      const eta1 = isGood ? 1.0 : 0.7
      steps.push({
        label: 'Bond condition factor',
        formula: isGood ? 'eta1 = 1.0 (good bond)' : 'eta1 = 0.7 (poor bond, >300mm concrete below)',
        value: fmt(eta1),
      })

      // eta2
      const eta2 = phi <= 32 ? 1.0 : (132 - phi) / 100
      steps.push({
        label: 'Bar diameter factor',
        formula: phi <= 32 ? 'eta2 = 1.0 (phi <= 32mm)' : `eta2 = (132 - ${phi}) / 100`,
        value: fmt(eta2),
      })

      // fbd = 2.25 * eta1 * eta2 * fctd
      const fbd = 2.25 * eta1 * eta2 * fctd
      steps.push({
        label: 'Design bond strength',
        formula: 'fbd = 2.25 x eta1 x eta2 x fctd',
        value: `${fmt(fbd)} MPa`,
      })

      // sigma_sd = fy / gamma_s = fy / 1.15
      const sigma_sd = fy_mpa / 1.15
      steps.push({
        label: 'Design stress in bar',
        formula: 'sigma_sd = fy / 1.15',
        value: `${fmt(sigma_sd)} MPa`,
      })

      // lb,rqd = (phi/4) * (sigma_sd / fbd)
      const lb_rqd = (phi / 4) * (sigma_sd / fbd)
      steps.push({
        label: 'Basic required anchorage length',
        formula: 'lb,rqd = (phi/4) x (sigma_sd / fbd)',
        value: `${fmt(lb_rqd)} mm`,
      })

      // lbd = alpha1 * lb,rqd (alpha1 = 1.0 simplified)
      const lbd_raw = 1.0 * lb_rqd
      steps.push({
        label: 'Design anchorage length (alpha1 = 1.0)',
        formula: 'lbd = alpha1 x lb,rqd',
        value: `${fmt(lbd_raw)} mm`,
      })

      // Minimum
      const lbd_min = Math.max(0.3 * lb_rqd, 10 * phi, 100)
      steps.push({
        label: 'Minimum anchorage length',
        formula: 'lbd,min = max(0.3 x lb,rqd, 10 x phi, 100mm)',
        value: `${fmt(lbd_min)} mm`,
      })

      result = Math.max(lbd_raw, lbd_min)
      steps.push({
        label: 'Design anchorage length',
        formula: 'lbd = max(lbd, lbd,min)',
        value: `${fmt(result)} mm`,
      })

      // Convert if Imperial
      if (!isSI) {
        const result_in = result / 25.4
        steps.push({
          label: 'Design anchorage length (converted)',
          formula: `${fmt(result)} mm / 25.4`,
          value: `${fmt(result_in)} in`,
        })
        result = result_in
      }
    } else {
      // ACI 318 development length
      const db_in = bar.diameter_in
      const fc_ksi = isSI ? fck / 6.89476 : fck
      const fy_psi = isSI ? fy * 145.038 : fy * 1000 // fy in ksi -> psi
      const fc_psi = fc_ksi * 1000

      // Bar number for size classification
      const barNum = parseInt(bar.label.replace('#', ''), 10)
      const isSmallBar = barNum <= 6

      // psi_t: top bar factor
      const psi_t = isGood ? 1.0 : 1.3
      steps.push({
        label: 'Top bar factor',
        formula: isGood ? 'psi_t = 1.0 (not top bar)' : 'psi_t = 1.3 (top bar, >12in concrete below)',
        value: fmt(psi_t),
      })

      // psi_e: coating factor (uncoated)
      const psi_e = 1.0
      steps.push({
        label: 'Coating factor',
        formula: 'psi_e = 1.0 (uncoated)',
        value: fmt(psi_e),
      })

      // psi_s: bar size factor
      const psi_s = isSmallBar ? 0.8 : 1.0
      steps.push({
        label: 'Bar size factor',
        formula: isSmallBar ? 'psi_s = 0.8 (#6 and smaller)' : 'psi_s = 1.0 (#7 and larger)',
        value: fmt(psi_s),
      })

      // lambda: lightweight factor
      const lambda = 1.0
      steps.push({
        label: 'Lightweight concrete factor',
        formula: 'lambda = 1.0 (normal weight)',
        value: fmt(lambda),
      })

      const sqrt_fc = Math.sqrt(fc_psi)
      steps.push({
        label: 'sqrt(f\'c)',
        formula: `sqrt(${fmt(fc_psi, 0)} psi)`,
        value: `${fmt(sqrt_fc)} psi^0.5`,
      })

      // ld in inches
      let ld_in: number
      if (isSmallBar) {
        // ld = (fy * psi_t * psi_e * psi_s) / (25 * lambda * sqrt(f'c)) * db
        ld_in = (fy_psi * psi_t * psi_e * psi_s) / (25 * lambda * sqrt_fc) * db_in
        steps.push({
          label: 'Development length formula',
          formula: 'ld = (fy x psi_t x psi_e x psi_s) / (25 x lambda x sqrt(f\'c)) x db',
          value: `${fmt(ld_in)} in`,
        })
      } else {
        // ld = (fy * psi_t * psi_e) / (20 * lambda * sqrt(f'c)) * db
        ld_in = (fy_psi * psi_t * psi_e) / (20 * lambda * sqrt_fc) * db_in
        steps.push({
          label: 'Development length formula',
          formula: 'ld = (fy x psi_t x psi_e) / (20 x lambda x sqrt(f\'c)) x db',
          value: `${fmt(ld_in)} in`,
        })
      }

      // Minimum
      const ld_min_in = Math.max(12, 12 * db_in)
      steps.push({
        label: 'Minimum development length',
        formula: 'ld,min = max(12 in, 12 x db)',
        value: `${fmt(ld_min_in)} in`,
      })

      const ld_final_in = Math.max(ld_in, ld_min_in)
      steps.push({
        label: 'Development length (governing)',
        formula: 'ld = max(ld, ld,min)',
        value: `${fmt(ld_final_in)} in`,
      })

      if (isSI) {
        const ld_mm = ld_final_in * 25.4
        steps.push({
          label: 'Development length (converted)',
          formula: `${fmt(ld_final_in)} in x 25.4`,
          value: `${fmt(ld_mm)} mm`,
        })
        result = ld_mm
      } else {
        result = ld_final_in
      }
    }

    const resultUnit = isSI ? 'mm' : 'in'

    return (
      <div className="card">
        <div className="card-title">
          <span className="accent">Development</span> Length - {code === 'EC' ? 'EC2 Anchorage' : 'ACI 318'}
        </div>
        <div className="field-grid cols-2">
          <div className="field">
            <label className="field-label">Bar size</label>
            <select className="field-select" value={tab4BarIdx} onChange={e => setTab4BarIdx(Number(e.target.value))}>
              {bars.map((b, i) => (
                <option key={i} value={i}>{b.label} ({fmt(getBarDiam(b))} {diamUnit})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Bond condition</label>
            <select className="field-select" value={tab4Bond} onChange={e => setTab4Bond(e.target.value as 'good' | 'poor')}>
              <option value="good">{code === 'EC' ? 'Good bond' : 'Bottom bar (not top)'}</option>
              <option value="poor">{code === 'EC' ? 'Poor bond (>300mm below)' : 'Top bar (>12in below)'}</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">{code === 'EC' ? 'fck' : "f'c"} ({stressUnit})</label>
            <input className="field-input" type="number" min="0" step="1" value={tab4Fck} onChange={e => setTab4Fck(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">fy ({stressUnit})</label>
            <input className="field-input" type="number" min="0" step="1" value={tab4Fy} onChange={e => setTab4Fy(e.target.value)} />
          </div>
        </div>

        {fck > 0 && fy > 0 && (
          <>
            {/* Step by step */}
            <div className="calc-steps" style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Step-by-step calculation
              </div>
              {steps.map((step, i) => (
                <div key={i} className="calc-step">
                  <div className="step-label">{step.label}</div>
                  <div className="step-formula">{step.formula}</div>
                  <div className="step-value">= {step.value}</div>
                </div>
              ))}
            </div>

            {/* Final result */}
            <div className="stat-row" style={{ marginTop: '16px' }}>
              <div className="stat-box" style={{ borderColor: '#cc0000' }}>
                <div className="stat-label">Required development length</div>
                <div className="stat-value" style={{ fontSize: '22px' }}>
                  {fmt(result)} {resultUnit}
                  <button className="copy-btn" onClick={() => handleCopy('t4-ld', fmt(result))} title="Copy">
                    {copied === 't4-ld' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  /* ================================================================ */
  /*  TABS config                                                     */
  /* ================================================================ */
  const tabs: { id: TabId; label: string }[] = [
    { id: 'bar-area', label: 'Bar Area' },
    { id: 'slab', label: 'Slab Reinforcement' },
    { id: 'beam', label: 'Beam Reinforcement' },
    { id: 'dev-length', label: 'Development Length' },
  ]

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; }

        .nav-link { color: #888; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #f0f0f0; }

        .filter-btn {
          background: transparent; color: #888; border: 1px solid #2a2a2a; padding: 8px 18px;
          font-size: 12px; font-weight: 600; border-radius: 4px; cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.04em; font-family: 'Inter', sans-serif;
        }
        .filter-btn:hover { border-color: #444; color: #ccc; }
        .filter-btn.active { background: #cc0000; border-color: #cc0000; color: #fff; }

        .card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 22px;
        }
        .card-title {
          font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; color: #f0f0f0;
          margin-bottom: 16px; letter-spacing: 0.01em; text-transform: uppercase;
        }
        .card-title .accent { color: #cc0000; }

        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 11px; color: #777; font-weight: 500; letter-spacing: 0.02em; }
        .field-input {
          background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 4px; color: #f0f0f0;
          padding: 9px 10px; font-size: 13px; font-family: 'Inter', sans-serif; width: 100%;
        }
        .field-input:focus { outline: none; border-color: #cc0000; }
        .field-input::-webkit-outer-spin-button, .field-input::-webkit-inner-spin-button { opacity: 0.4; }
        .field-select {
          background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 4px; color: #f0f0f0;
          padding: 9px 10px; font-size: 13px; font-family: 'Inter', sans-serif; width: 100%;
        }
        .field-select:focus { outline: none; border-color: #cc0000; }

        .field-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .field-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
        .field-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }

        .stat-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .stat-box { background: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 6px; padding: 12px 14px; }
        .stat-label { font-size: 11px; color: #666; font-weight: 500; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
        .stat-value { font-size: 16px; font-weight: 700; color: #f0f0f0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        .copy-btn {
          background: #1a1a1a; border: 1px solid #2a2a2a; color: #888; border-radius: 3px;
          padding: 3px 10px; font-size: 10px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; font-family: 'Inter', sans-serif; letter-spacing: 0.04em;
        }
        .copy-btn:hover { border-color: #cc0000; color: #ff4444; }

        .badge-pass {
          display: inline-block; background: rgba(46,204,113,0.12); border: 1px solid rgba(46,204,113,0.35);
          color: #2ecc71; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 3px;
          letter-spacing: 0.08em; text-transform: uppercase;
        }
        .badge-fail {
          display: inline-block; background: rgba(255,68,68,0.12); border: 1px solid rgba(255,68,68,0.35);
          color: #ff4444; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 3px;
          letter-spacing: 0.08em; text-transform: uppercase;
        }

        .results-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .results-table th {
          text-align: left; padding: 8px 10px; font-size: 10px; color: #666;
          text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #1e1e1e;
          font-weight: 600; white-space: nowrap;
        }
        .results-table td {
          padding: 7px 10px; border-bottom: 1px solid #141414; color: #ccc; white-space: nowrap;
        }
        .results-table tr:last-child td { border-bottom: none; }
        .results-table tr:hover td { background: rgba(204,0,0,0.04); }

        .calc-steps { display: flex; flex-direction: column; gap: 6px; }
        .calc-step {
          display: grid; grid-template-columns: 1fr 1.5fr auto; gap: 10px; align-items: baseline;
          padding: 6px 10px; border-radius: 4px; font-size: 12px;
          background: #0c0c0c; border: 1px solid #141414;
        }
        .step-label { color: #888; font-weight: 500; }
        .step-formula { color: #666; font-family: monospace; font-size: 11px; }
        .step-value { color: #f0f0f0; font-weight: 600; text-align: right; white-space: nowrap; }

        .tab-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 24px; }
        .tab-btn {
          background: transparent; color: #888; border: 1px solid #2a2a2a; padding: 10px 20px;
          font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer;
          transition: all 0.2s; font-family: 'Inter', sans-serif; letter-spacing: 0.02em;
        }
        .tab-btn:hover { border-color: #444; color: #ccc; }
        .tab-btn.active { background: #cc0000; border-color: #cc0000; color: #fff; }

        .toggle-group { display: flex; gap: 0; }
        .toggle-group .filter-btn { border-radius: 0; margin-left: -1px; }
        .toggle-group .filter-btn:first-child { border-radius: 4px 0 0 4px; margin-left: 0; }
        .toggle-group .filter-btn:last-child { border-radius: 0 4px 4px 0; }

        @media (max-width: 600px) {
          .field-grid { grid-template-columns: 1fr; }
          .field-grid.cols-3 { grid-template-columns: 1fr; }
          .field-grid.cols-2 { grid-template-columns: 1fr; }
          .stat-grid { grid-template-columns: 1fr; }
          .stat-row { flex-direction: column; }
          .calc-step { grid-template-columns: 1fr; gap: 2px; }
          .step-value { text-align: left; }
          .tab-bar { gap: 4px; }
          .tab-btn { padding: 8px 12px; font-size: 11px; }
          .filter-btn { padding: 8px 12px; font-size: 11px; min-height: 44px; }
          .field-input, .field-select { min-height: 44px; padding: 12px 10px; font-size: 16px; }
          .rebar-header { padding: 28px 16px 20px !important; }
          .rebar-body { padding: 0 16px 40px !important; }
          .header-controls { justify-content: flex-start !important; }
        }
      `}</style>

      <Navbar activePage="calculators" />

      {/* Header */}
      <section className="rebar-header" style={{ padding: '48px 48px 28px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <a href="/calculators" className="nav-link" style={{ fontSize: '13px' }}>&larr; All Calculators</a>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginTop: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '12px' }}>Structural Design</div>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
                Rebar Calculator
              </h1>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '8px', maxWidth: '560px', lineHeight: 1.6 }}>
                Calculate rebar areas, number of bars, spacing, beam layouts and development lengths for any bar size. Supports Eurocode and ACI bar designations with SI and Imperial units.
              </p>
            </div>
            <div className="header-controls" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <div className="toggle-group">
                <button className={`filter-btn${code === 'EC' ? ' active' : ''}`} onClick={() => handleCodeChange('EC')}>Eurocode</button>
                <button className={`filter-btn${code === 'ACI' ? ' active' : ''}`} onClick={() => handleCodeChange('ACI')}>ACI</button>
              </div>
              <div className="toggle-group">
                <button className={`filter-btn${units === 'SI' ? ' active' : ''}`} onClick={() => handleUnitsChange('SI')}>SI</button>
                <button className={`filter-btn${units === 'Imperial' ? ' active' : ''}`} onClick={() => handleUnitsChange('Imperial')}>Imperial</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="rebar-body" style={{ padding: '28px 48px 60px', maxWidth: '1180px', margin: '0 auto' }}>
        {/* Tab bar */}
        <div className="tab-bar">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'bar-area' && renderTab1()}
        {activeTab === 'slab' && renderTab2()}
        {activeTab === 'beam' && renderTab3()}
        {activeTab === 'dev-length' && renderTab4()}
      </section>
    </main>
  )
}
