'use client'

import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import { SpectrumPlot, BuildingElevation } from './drawing'
import { ResultCard, StepSection } from './results'
import { calcEC8, calcASCE7 } from './calculations'
import {
  type DesignCode, type UnitSystem, type PeriodMethod, type FloorData,
  EC8_GROUND_TYPES, BUILDING_USES, EC8_SYSTEMS,
  ASCE_SITE_CLASSES, ASCE_SYSTEMS,
  fmt,
} from './types'

// ── Collapsible card ──────────────────────────────────────────────────────────

function Card({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#999',
        }}
      >
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666' }}>{title}</span>
        <span style={{ fontSize: '14px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#444' }}>&#9660;</span>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  )
}

// ── Input helpers ─────────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, unit, red, min, max, step }: { label: string; value: number; onChange: (v: number) => void; unit?: string; red?: boolean; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <label className="rc-label">{label}{unit ? ` (${unit})` : ''}</label>
      <input
        className="rc-input"
        type="number"
        value={value}
        onChange={e => onChange(+e.target.value)}
        min={min}
        max={max}
        step={step}
        style={red ? { color: '#cc0000', fontWeight: 700 } : undefined}
      />
    </div>
  )
}

function SelectInput({ label, options, value, onChange }: { label: string; options: string[]; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="rc-label">{label}</label>
      <select className="rc-input" value={value} onChange={e => onChange(+e.target.value)} style={{ cursor: 'pointer' }}>
        {options.map((o, i) => <option key={i} value={i} style={{ background: '#111' }}>{o}</option>)}
      </select>
    </div>
  )
}

function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-block', fontSize: '10px', color: '#666', background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '2px 7px', borderRadius: '3px', margin: '2px', fontFamily: "'Space Grotesk', monospace" }}>
      {children}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SeismicPage() {
  const [code, setCode] = useState<DesignCode>('EC8')
  const [units, setUnits] = useState<UnitSystem>('SI')

  // Building
  const [buildingUseIdx, setBuildingUseIdx] = useState(0)
  const [nFloors, setNFloors] = useState(5)
  const [totalH, setTotalH] = useState(15)
  const [totalW, setTotalW] = useState(5000)
  const [usePerFloor, setUsePerFloor] = useState(false)
  const [floorData, setFloorData] = useState<FloorData[]>(() => {
    const arr: FloorData[] = []
    for (let i = 1; i <= 5; i++) {
      arr.push({ weight: 1000, height: i * 3 })
    }
    return arr
  })

  // EC8 Site
  const [groundTypeIdx, setGroundTypeIdx] = useState(1)
  const [ag, setAg] = useState(0.25)
  const [damping, setDamping] = useState(5)

  // ASCE 7 Site
  const [siteClassIdx, setSiteClassIdx] = useState(3)
  const [Ss, setSs] = useState(1.0)
  const [S1, setS1] = useState(0.4)
  const [TL, setTL] = useState(8)

  // EC8 Structural System
  const [ec8SystemIdx, setEc8SystemIdx] = useState(1)
  const [qFactor, setQFactor] = useState(5.85)
  const [periodMethod, setPeriodMethod] = useState<PeriodMethod>('approximate')

  // ASCE 7 Structural System
  const [asceSystemIdx, setAsceSystemIdx] = useState(1)
  const [rFactor, setRFactor] = useState(8)

  // Right col collapsible states
  const [stepsOpen, setStepsOpen] = useState<Record<string, boolean>>({
    period: true, spectrum: true, baseShear: true, distribution: true,
  })

  const toggleStep = (key: string) => setStepsOpen(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Sync floor data when nFloors changes ──────────────────────────────────

  const syncFloors = (newCount: number) => {
    setNFloors(newCount)
    const clamped = Math.max(1, Math.min(20, newCount))
    setFloorData(prev => {
      const arr: FloorData[] = []
      for (let i = 0; i < clamped; i++) {
        if (i < prev.length) {
          arr.push(prev[i])
        } else {
          arr.push({ weight: 1000, height: ((i + 1) / clamped) * totalH })
        }
      }
      return arr
    })
  }

  const updateFloor = (idx: number, field: 'weight' | 'height', value: number) => {
    setFloorData(prev => {
      const arr = [...prev]
      arr[idx] = { ...arr[idx], [field]: value }
      return arr
    })
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const buildingUse = BUILDING_USES[buildingUseIdx]
  const ec8Ground = EC8_GROUND_TYPES[groundTypeIdx]
  const ec8System = EC8_SYSTEMS[ec8SystemIdx]
  const asceSystem = ASCE_SYSTEMS[asceSystemIdx]
  const asceSiteClass = ASCE_SITE_CLASSES[siteClassIdx]

  const heightUnit = units === 'SI' ? 'm' : 'ft'
  const forceUnit = units === 'SI' ? 'kN' : 'kip'

  // ── Calculations ──────────────────────────────────────────────────────────

  const result = useMemo(() => {
    if (totalH <= 0 || totalW <= 0 || nFloors < 1) return null

    const effectiveFloors = usePerFloor ? floorData.slice(0, nFloors) : null
    const effectiveW = usePerFloor
      ? floorData.slice(0, nFloors).reduce((s, f) => s + f.weight, 0)
      : totalW

    if (code === 'EC8') {
      return calcEC8(
        ec8Ground,
        ag,
        damping,
        qFactor,
        ec8System.Ct,
        totalH,
        effectiveW,
        nFloors,
        effectiveFloors,
        periodMethod,
        buildingUse.gammaI_EC8,
      )
    } else {
      return calcASCE7(
        asceSiteClass.label,
        Ss,
        S1,
        TL,
        asceSystem,
        rFactor,
        buildingUse.Ie_ASCE7,
        totalH,
        effectiveW,
        nFloors,
        effectiveFloors,
        units,
      )
    }
  }, [code, units, buildingUseIdx, nFloors, totalH, totalW, usePerFloor, floorData,
      groundTypeIdx, ag, damping, ec8SystemIdx, qFactor, periodMethod,
      siteClassIdx, Ss, S1, TL, asceSystemIdx, rFactor,
      ec8Ground, ec8System, asceSystem, asceSiteClass, buildingUse])

  // ── PDF export ────────────────────────────────────────────────────────────

  const handleExport = () => window.print()

  // ── Render ────────────────────────────────────────────────────────────────

  const maxFloorForce = result ? Math.max(...result.floors.map(f => f.Fi)) : 0

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rc-input { background: #0d0d0d; border: 1px solid #1e1e1e; color: #f0f0f0; padding: 7px 10px; border-radius: 4px; font-size: 13px; width: 100%; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; -moz-appearance: textfield; }
        .rc-input:focus { border-color: #cc0000; }
        .rc-input::-webkit-inner-spin-button, .rc-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .rc-label { display: block; font-size: 10px; color: '#777'; margin-bottom: 3px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
        select.rc-input option { background: #111; color: #f0f0f0; }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

        .top-bar { position: sticky; top: 64px; z-index: 50; background: rgba(10,10,10,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid #1a1a1a; padding: 8px 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .tb-group { display: flex; gap: 0; }
        .tb-btn { padding: 6px 16px; border: 1px solid #222; background: transparent; color: #777; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; white-space: nowrap; }
        .tb-btn:first-child { border-radius: 4px 0 0 4px; }
        .tb-btn:last-child { border-radius: 0 4px 4px 0; }
        .tb-btn.on { background: #cc0000; border-color: #cc0000; color: #fff; }
        .pdf-btn { padding: 6px 18px; background: #cc0000; color: #fff; border: none; font-size: 12px; font-weight: 600; cursor: pointer; border-radius: 4px; font-family: 'Inter', sans-serif; transition: all 0.2s; margin-left: auto; }
        .pdf-btn:hover { background: #e60000; }

        .three-col { display: grid; grid-template-columns: 280px 1fr 320px; gap: 16px; align-items: start; padding: 16px 24px 48px; max-width: 1440px; margin: 0 auto; }

        .chk { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; cursor: pointer; margin: 6px 0; }
        .chk input { accent-color: #cc0000; }

        .nav-link { color: #555; text-decoration: none; transition: color 0.2s; font-size: 13px; }
        .nav-link:hover { color: #f0f0f0; }

        .right-step-section { background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 14px; margin-bottom: 8px; }
        .right-step-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .right-step-header:hover span:first-child { color: #cc0000; }
        .right-step-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #666; transition: color 0.15s; }
        .right-step-arrow { font-size: 12px; color: #444; transition: transform 0.2s; }

        @media print {
          .no-print { display: none !important; }
          .three-col { grid-template-columns: 1fr 1fr !important; }
          .top-bar { position: static !important; }
        }
        @media (max-width: 1100px) {
          .three-col { grid-template-columns: 280px 1fr !important; }
          .right-col { grid-column: 1 / -1; }
        }
        @media (max-width: 768px) {
          .three-col { grid-template-columns: 1fr !important; padding: 12px 16px 48px; }
          .top-bar { padding: 8px 16px; gap: 8px; top: 56px; }
          .g3 { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <Navbar activePage="calculators" />

      {/* ── Top bar ── */}
      <div className="top-bar no-print">
        <div className="tb-group">
          <button className={`tb-btn${code === 'EC8' ? ' on' : ''}`} onClick={() => { setCode('EC8'); setQFactor(EC8_SYSTEMS[ec8SystemIdx].q_default) }}>EC8</button>
          <button className={`tb-btn${code === 'ASCE7' ? ' on' : ''}`} onClick={() => { setCode('ASCE7'); setRFactor(ASCE_SYSTEMS[asceSystemIdx].R) }}>ASCE 7</button>
        </div>
        <div className="tb-group">
          <button className={`tb-btn${units === 'SI' ? ' on' : ''}`} onClick={() => setUnits('SI')}>SI</button>
          <button className={`tb-btn${units === 'Imperial' ? ' on' : ''}`} onClick={() => setUnits('Imperial')}>Imperial</button>
        </div>
        <button className="pdf-btn" onClick={handleExport}>Export PDF</button>
      </div>

      {/* ── Three-column layout ── */}
      <div className="three-col">

        {/* ═══════════ LEFT COLUMN: INPUTS ═══════════ */}
        <div className="no-print">

          {/* Building */}
          <Card title="Building">
            <div style={{ marginBottom: '8px' }}>
              <SelectInput
                label="Building use"
                options={BUILDING_USES.map(u => u.label)}
                value={buildingUseIdx}
                onChange={setBuildingUseIdx}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
              {code === 'EC8'
                ? <InfoChip>&#947;I = {buildingUse.gammaI_EC8}</InfoChip>
                : <InfoChip>Ie = {buildingUse.Ie_ASCE7}</InfoChip>
              }
            </div>
            <div className="g3" style={{ marginBottom: '8px' }}>
              <NumInput label="Stories" value={nFloors} onChange={v => syncFloors(Math.max(1, Math.min(20, Math.round(v))))} min={1} max={20} />
              <NumInput label={`Height H`} value={totalH} onChange={setTotalH} unit={heightUnit} />
              {!usePerFloor && <NumInput label="Weight W" value={totalW} onChange={setTotalW} unit={forceUnit} />}
            </div>

            <label className="chk">
              <input type="checkbox" checked={usePerFloor} onChange={e => setUsePerFloor(e.target.checked)} />
              Per-floor weight input
            </label>

            {usePerFloor && (
              <div style={{ maxHeight: '240px', overflowY: 'auto', marginTop: '6px', paddingRight: '4px' }}>
                {floorData.slice(0, nFloors).map((f, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '6px', alignItems: 'end', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#555', fontWeight: 600, paddingBottom: '8px', minWidth: '24px' }}>F{i + 1}</span>
                    <NumInput label={`wi (${forceUnit})`} value={f.weight} onChange={v => updateFloor(i, 'weight', v)} />
                    <NumInput label={`zi (${heightUnit})`} value={f.height} onChange={v => updateFloor(i, 'height', v)} />
                  </div>
                ))}
                <div style={{ marginTop: '4px' }}>
                  <InfoChip>W total = {fmt(floorData.slice(0, nFloors).reduce((s, f) => s + f.weight, 0), 0)} {forceUnit}</InfoChip>
                </div>
              </div>
            )}
          </Card>

          {/* Site & Ground */}
          <Card title="Site & Ground">
            {code === 'EC8' ? (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <SelectInput
                    label="Ground type"
                    options={EC8_GROUND_TYPES.map(g => `${g.label} - ${g.description}`)}
                    value={groundTypeIdx}
                    onChange={setGroundTypeIdx}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                  <InfoChip>S={ec8Ground.S}</InfoChip>
                  <InfoChip>TB={ec8Ground.TB}s</InfoChip>
                  <InfoChip>TC={ec8Ground.TC}s</InfoChip>
                  <InfoChip>TD={ec8Ground.TD}s</InfoChip>
                </div>
                <div className="g2">
                  <NumInput label="PGA ag" value={ag} onChange={setAg} unit="g" step={0.05} />
                  <NumInput label="Damping ξ" value={damping} onChange={setDamping} unit="%" />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <SelectInput
                    label="Site class"
                    options={ASCE_SITE_CLASSES.map(s => `${s.label} - ${s.description}`)}
                    value={siteClassIdx}
                    onChange={setSiteClassIdx}
                  />
                </div>
                <div className="g2" style={{ marginBottom: '8px' }}>
                  <NumInput label="Ss (short)" value={Ss} onChange={setSs} unit="g" step={0.05} />
                  <NumInput label="S1 (1-sec)" value={S1} onChange={setS1} unit="g" step={0.05} />
                </div>
                <NumInput label="TL (long-period)" value={TL} onChange={setTL} unit="s" />
              </>
            )}
          </Card>

          {/* Structural System */}
          <Card title="Structural System">
            {code === 'EC8' ? (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <SelectInput
                    label="System type"
                    options={EC8_SYSTEMS.map(s => s.label)}
                    value={ec8SystemIdx}
                    onChange={v => { setEc8SystemIdx(v); setQFactor(EC8_SYSTEMS[v].q_default) }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                  <InfoChip>q default = {EC8_SYSTEMS[ec8SystemIdx].q_default}</InfoChip>
                  <InfoChip>Ct = {EC8_SYSTEMS[ec8SystemIdx].Ct}</InfoChip>
                </div>
                <NumInput label="Behavior factor q" value={qFactor} onChange={setQFactor} step={0.1} red />
                <div style={{ marginTop: '8px' }}>
                  <label className="rc-label">Period calculation</label>
                  <div className="tb-group" style={{ marginTop: '4px' }}>
                    <button
                      className={`tb-btn${periodMethod === 'approximate' ? ' on' : ''}`}
                      onClick={() => setPeriodMethod('approximate')}
                      style={{ fontSize: '11px', padding: '4px 12px' }}
                    >Approximate</button>
                    <button
                      className={`tb-btn${periodMethod === 'rayleigh' ? ' on' : ''}`}
                      onClick={() => setPeriodMethod('rayleigh')}
                      style={{ fontSize: '11px', padding: '4px 12px' }}
                    >Rayleigh</button>
                  </div>
                  {periodMethod === 'rayleigh' && !usePerFloor && (
                    <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px' }}>
                      Enable per-floor input for Rayleigh method
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <SelectInput
                    label="System type"
                    options={ASCE_SYSTEMS.map(s => s.label)}
                    value={asceSystemIdx}
                    onChange={v => { setAsceSystemIdx(v); setRFactor(ASCE_SYSTEMS[v].R) }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                  <InfoChip>R = {ASCE_SYSTEMS[asceSystemIdx].R}</InfoChip>
                  <InfoChip>&#937;0 = {ASCE_SYSTEMS[asceSystemIdx].Omega0}</InfoChip>
                  <InfoChip>Cd = {ASCE_SYSTEMS[asceSystemIdx].Cd}</InfoChip>
                  <InfoChip>Ct = {ASCE_SYSTEMS[asceSystemIdx].Ct}</InfoChip>
                  <InfoChip>x = {ASCE_SYSTEMS[asceSystemIdx].x}</InfoChip>
                </div>
                <NumInput label="Response modification R" value={rFactor} onChange={setRFactor} step={0.5} red />
              </>
            )}
          </Card>
        </div>

        {/* ═══════════ MIDDLE COLUMN: DRAWINGS + RESULTS ═══════════ */}
        <div>
          {/* Response spectrum plot */}
          {result && (
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <SpectrumPlot result={result} code={code} />
            </div>
          )}

          {/* Building elevation */}
          {result && (
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <BuildingElevation result={result} nFloors={nFloors} H={totalH} units={units} />
            </div>
          )}

          {/* Result cards 2x2 */}
          {result && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <ResultCard
                title="Base Shear V"
                mainLabel="V"
                mainValue={fmt(result.baseShear, 1)}
                secondLabel="% of W"
                secondValue={fmt(result.Cs * 100, 2) + '%'}
                unit={forceUnit}
                accent
              />
              <ResultCard
                title="Period T1"
                mainLabel="T1"
                mainValue={fmt(result.T1, 3)}
                unit="s"
              />
              <ResultCard
                title={code === 'EC8' ? 'Design Sd(T1)' : 'Seismic Cs'}
                mainLabel={code === 'EC8' ? 'Sd(T1)' : 'Cs'}
                mainValue={fmt(result.Sd_T1, 4)}
                unit={code === 'EC8' ? 'g' : ''}
              />
              <ResultCard
                title="Max Story Force"
                mainLabel={`Floor ${result.floors.length}`}
                mainValue={fmt(maxFloorForce, 1)}
                unit={forceUnit}
              />
            </div>
          )}

          {/* Floor force distribution table */}
          {result && result.floors.length > 0 && (
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#666', textTransform: 'uppercase', marginBottom: '10px' }}>Floor Force Distribution</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Floor</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>zi ({heightUnit})</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>wi ({forceUnit})</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cvx</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fi ({forceUnit})</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vi ({forceUnit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.floors.slice().reverse().map((f, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '7px 8px', color: '#aaa', fontFamily: "'Space Grotesk', monospace" }}>{f.floor}</td>
                        <td style={{ padding: '7px 8px', color: '#666', textAlign: 'right', fontFamily: "'Space Grotesk', monospace" }}>{fmt(f.zi, 1)}</td>
                        <td style={{ padding: '7px 8px', color: '#666', textAlign: 'right', fontFamily: "'Space Grotesk', monospace" }}>{fmt(f.wi, 0)}</td>
                        <td style={{ padding: '7px 8px', color: '#888', textAlign: 'right', fontFamily: "'Space Grotesk', monospace" }}>{fmt(f.Cvx, 4)}</td>
                        <td style={{ padding: '7px 8px', color: '#f0f0f0', textAlign: 'right', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" }}>{fmt(f.Fi, 1)}</td>
                        <td style={{ padding: '7px 8px', color: '#cc0000', textAlign: 'right', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" }}>{fmt(f.Vi, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════ RIGHT COLUMN: STEP-BY-STEP ═══════════ */}
        <div className="right-col">

          {/* Period steps */}
          {result && (
            <div className="right-step-section">
              <div className="right-step-header" onClick={() => toggleStep('period')}>
                <span className="right-step-title">Period {code === 'EC8' ? '[EC8 §4.3.3]' : '[ASCE 7 §12.8.2]'}</span>
                <span className="right-step-arrow" style={{ transform: stepsOpen.period ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
              </div>
              {stepsOpen.period && <div style={{ marginTop: '10px' }}><StepSection title="Fundamental Period" steps={result.steps_period} /></div>}
            </div>
          )}

          {/* Spectrum steps */}
          {result && (
            <div className="right-step-section">
              <div className="right-step-header" onClick={() => toggleStep('spectrum')}>
                <span className="right-step-title">Spectrum {code === 'EC8' ? '[EC8 §3.2.2]' : '[ASCE 7 §11.4]'}</span>
                <span className="right-step-arrow" style={{ transform: stepsOpen.spectrum ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
              </div>
              {stepsOpen.spectrum && <div style={{ marginTop: '10px' }}><StepSection title="Response Spectrum" steps={result.steps_spectrum} /></div>}
            </div>
          )}

          {/* Base shear steps */}
          {result && (
            <div className="right-step-section">
              <div className="right-step-header" onClick={() => toggleStep('baseShear')}>
                <span className="right-step-title">Base Shear {code === 'EC8' ? '[EC8 §4.3.3]' : '[ASCE 7 §12.8.1]'}</span>
                <span className="right-step-arrow" style={{ transform: stepsOpen.baseShear ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
              </div>
              {stepsOpen.baseShear && <div style={{ marginTop: '10px' }}><StepSection title="Base Shear Calculation" steps={result.steps_baseShear} /></div>}
            </div>
          )}

          {/* Distribution steps */}
          {result && (
            <div className="right-step-section">
              <div className="right-step-header" onClick={() => toggleStep('distribution')}>
                <span className="right-step-title">Distribution {code === 'EC8' ? '[EC8 §4.3.3]' : '[ASCE 7 §12.8.3]'}</span>
                <span className="right-step-arrow" style={{ transform: stepsOpen.distribution ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
              </div>
              {stepsOpen.distribution && <div style={{ marginTop: '10px' }}><StepSection title="Vertical Distribution" steps={result.steps_distribution} /></div>}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '32px 48px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              ENGI<span style={{ color: '#cc0000' }}>NUS</span>
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' as const }}>
              <a href="/calculators" className="nav-link">Calculators</a>
              <a href="/pro" className="nav-link">Pro Tools</a>
              <a href="/about" className="nav-link">About</a>
              <a href="/privacy" className="nav-link">Privacy Policy</a>
              <a href="/terms" className="nav-link">Terms of Service</a>
              <a href="/disclaimer" className="nav-link">Disclaimer</a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#444' }}>&copy; 2026 Enginus. All rights reserved.</div>
            <div style={{ fontSize: '11px', color: '#444', fontStyle: 'italic' }}>Results are for educational purposes. Always verify with a licensed engineer.</div>
          </div>
        </div>
      </footer>
    </main>
  )
}
