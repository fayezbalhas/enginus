'use client'

import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import { BuildingPressureDiagram, PressureProfilePlot } from './drawing'
import { ResultCard, SummaryTable, StepSection } from './results'
import { calcWindEC1, calcWindASCE7 } from './calculations'
import {
  type DesignCode, type UnitSystem, type EC1Enclosure, type ASCE7Enclosure,
  EC1_TERRAIN, ASCE7_EXPOSURES, ASCE7_RISK,
  EC1_CPE_WINDWARD, getEC1CpeLeeward, EC1_CPE_SIDE_A, EC1_CPE_SIDE_B,
  ASCE7_CP_WINDWARD, getASCE7CpLeeward, ASCE7_CP_SIDEWALL,
  getEC1Cpi, getASCE7GCpi,
  fmt, mphToMps, mpsToMph,
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
        <span style={{ fontSize: '14px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#444' }}>&#x25BC;</span>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  )
}

// ── Input helpers ─────────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, unit, red, step }: { label: string; value: number; onChange: (v: number) => void; unit?: string; red?: boolean; step?: number }) {
  return (
    <div>
      <label className="rc-label">{label}{unit ? ` (${unit})` : ''}</label>
      <input
        className="rc-input"
        type="number"
        value={value}
        step={step}
        onChange={e => onChange(+e.target.value)}
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="rc-label">{label}</label>
      <div className="rc-input" style={{ background: '#0a0a0a', cursor: 'default', color: '#888' }}>{value}</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WindPage() {
  const [code, setCode] = useState<DesignCode>('EC1')
  const [units, setUnits] = useState<UnitSystem>('SI')

  // Geometry
  const [h, setH] = useState(20)
  const [b, setB] = useState(30)
  const [d, setD] = useState(15)
  const [nZones, setNZones] = useState(5)

  // EC1 Wind data
  const [vb0, setVb0] = useState(26)
  const [cdir, setCdir] = useState(1.0)
  const [cseason, setCseason] = useState(1.0)

  // ASCE 7 Wind data
  const [V_mph, setV_mph] = useState(115)
  const [riskIdx, setRiskIdx] = useState(1)

  // Terrain
  const [ec1TerrainIdx, setEc1TerrainIdx] = useState(2)
  const [asce7ExposureIdx, setAsce7ExposureIdx] = useState(0)

  // EC1 Factors
  const [c0, setC0] = useState(1.0)
  const [cscd, setCscd] = useState(1.0)
  const [rho, setRho] = useState(1.25)

  // ASCE 7 Factors
  const [Kzt, setKzt] = useState(1.0)
  const [Kd, setKd] = useState(0.85)
  const [Ke, setKe] = useState(1.0)
  const [G, setG] = useState(0.85)

  // Pressure coefficients
  const [ec1Enclosure, setEc1Enclosure] = useState<EC1Enclosure>('closed')
  const [ec1CpiOverride, setEc1CpiOverride] = useState(false)
  const [ec1CpiManual, setEc1CpiManual] = useState(0.2)
  const [asce7Enclosure, setAsce7Enclosure] = useState<ASCE7Enclosure>('enclosed')

  // Right col collapsible states
  const [stepsOpen, setStepsOpen] = useState<Record<string, boolean>>({
    velocity: true, pressure: true, external: true, internal: true, forces: true,
  })
  const toggleStep = (key: string) => setStepsOpen(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Derived ────────────────────────────────────────────────────────────────

  const ec1Terrain = EC1_TERRAIN[ec1TerrainIdx]
  const asce7Exposure = ASCE7_EXPOSURES[asce7ExposureIdx]

  const vb_ec1 = cdir * cseason * vb0
  const V_ms = mphToMps(V_mph)
  const hd = h / Math.max(d, 0.01)
  const LB_asce = d / Math.max(b, 0.01)

  const ec1CpiVal = ec1CpiOverride ? ec1CpiManual : getEC1Cpi(ec1Enclosure)
  const asce7GCpiVal = getASCE7GCpi(asce7Enclosure)

  // ── Calculations ───────────────────────────────────────────────────────────

  const result = useMemo(() => {
    if (h <= 0 || b <= 0 || d <= 0) return null
    const nz = Math.max(1, Math.min(nZones, 10))
    if (code === 'EC1') {
      return calcWindEC1(h, b, d, nz, vb0, cdir, cseason, ec1Terrain, c0, cscd, rho, ec1CpiVal, ec1Enclosure)
    }
    return calcWindASCE7(h, b, d, nz, V_ms, asce7Exposure, Kzt, Kd, Ke, G, asce7GCpiVal, asce7Enclosure)
  }, [h, b, d, nZones, code, vb0, cdir, cseason, ec1Terrain, c0, cscd, rho, ec1CpiVal, ec1Enclosure, V_ms, asce7Exposure, Kzt, Kd, Ke, G, asce7GCpiVal, asce7Enclosure])

  // ── Summary rows ──────────────────────────────────────────────────────────

  const summaryRows = useMemo(() => {
    if (!result) return []
    const rows: { check: string; required: string; provided: string; utilization: number; pass: boolean }[] = []

    // All zones face pressures
    for (let i = 0; i < result.zones.length; i++) {
      const z = result.zones[i]
      rows.push({
        check: `Zone ${i + 1} (z=${fmt(z.z, 1)}m)`,
        required: `${code === 'EC1' ? 'qp' : 'qz'} = ${fmt(z.qp, 1)} Pa`,
        provided: `Fw = ${fmt(z.forceNet / 1000, 2)} kN`,
        utilization: (z.qp / Math.max(result.qpH, 1)) * 100,
        pass: true,
      })
    }

    rows.push({
      check: 'Total wind force',
      required: '-',
      provided: `${fmt(result.totalForce, 2)} kN`,
      utilization: 100,
      pass: true,
    })

    return rows
  }, [result, code])

  // ── PDF export ────────────────────────────────────────────────────────────

  const handleExport = () => window.print()

  // ── Render ────────────────────────────────────────────────────────────────

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
          <button className={`tb-btn${code === 'EC1' ? ' on' : ''}`} onClick={() => setCode('EC1')}>EC1</button>
          <button className={`tb-btn${code === 'ASCE7' ? ' on' : ''}`} onClick={() => setCode('ASCE7')}>ASCE 7</button>
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

          {/* Building Geometry */}
          <Card title="Building Geometry">
            <div className="g3" style={{ marginBottom: '8px' }}>
              <NumInput label="Height h" value={h} onChange={setH} unit={units === 'SI' ? 'm' : 'ft'} />
              <NumInput label="Width b" value={b} onChange={setB} unit={units === 'SI' ? 'm' : 'ft'} />
              <NumInput label="Depth d" value={d} onChange={setD} unit={units === 'SI' ? 'm' : 'ft'} />
            </div>
            <NumInput label="Height zones" value={nZones} onChange={v => setNZones(Math.max(1, Math.min(10, Math.round(v))))} />
            <div style={{ fontSize: '9px', color: '#444', marginTop: '4px' }}>b = perpendicular to wind, d = parallel to wind</div>
          </Card>

          {/* Wind Data */}
          <Card title="Wind Data">
            {code === 'EC1' ? (
              <>
                <NumInput label="Basic wind velocity vb,0" value={vb0} onChange={setVb0} unit="m/s" />
                <div className="g2" style={{ marginTop: '6px' }}>
                  <NumInput label="Directional cdir" value={cdir} onChange={setCdir} step={0.1} />
                  <NumInput label="Season cseason" value={cseason} onChange={setCseason} step={0.1} />
                </div>
                <div style={{ marginTop: '6px' }}>
                  <ReadOnlyField label="vb = cdir x cseason x vb,0" value={`${fmt(vb_ec1, 2)} m/s`} />
                </div>
              </>
            ) : (
              <>
                <NumInput label="Basic wind speed V" value={V_mph} onChange={setV_mph} unit="mph" />
                <div style={{ marginTop: '6px' }}>
                  <SelectInput label="Risk category" options={ASCE7_RISK.map(r => `${r.label} - ${r.description}`)} value={riskIdx} onChange={setRiskIdx} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '6px' }}>
                  <InfoChip>V = {fmt(V_ms, 1)} m/s</InfoChip>
                  <InfoChip>{fmt(V_mph, 0)} mph</InfoChip>
                </div>
              </>
            )}
          </Card>

          {/* Terrain */}
          <Card title="Terrain">
            {code === 'EC1' ? (
              <>
                <SelectInput label="Terrain category" options={EC1_TERRAIN.map(t => `${t.label} - ${t.description}`)} value={ec1TerrainIdx} onChange={setEc1TerrainIdx} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '6px' }}>
                  <InfoChip>z0 = {ec1Terrain.z0}</InfoChip>
                  <InfoChip>zmin = {ec1Terrain.zmin} m</InfoChip>
                  <InfoChip>kr = {ec1Terrain.kr}</InfoChip>
                </div>
              </>
            ) : (
              <>
                <SelectInput label="Exposure category" options={ASCE7_EXPOSURES.map(e => `${e.label} - ${e.description}`)} value={asce7ExposureIdx} onChange={setAsce7ExposureIdx} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '6px' }}>
                  <InfoChip>alpha = {asce7Exposure.alpha}</InfoChip>
                  <InfoChip>zg = {fmt(asce7Exposure.zg, 1)} m</InfoChip>
                </div>
              </>
            )}
          </Card>

          {/* Factors */}
          <Card title="Factors">
            {code === 'EC1' ? (
              <>
                <div className="g3">
                  <NumInput label="Orography c0" value={c0} onChange={setC0} step={0.1} />
                  <NumInput label="cscd" value={cscd} onChange={setCscd} step={0.1} />
                  <NumInput label="Air density" value={rho} onChange={setRho} unit="kg/m3" step={0.01} />
                </div>
              </>
            ) : (
              <>
                <div className="g3">
                  <NumInput label="Kzt (topo)" value={Kzt} onChange={setKzt} step={0.1} />
                  <NumInput label="Kd (dir)" value={Kd} onChange={setKd} step={0.05} />
                  <NumInput label="Ke (elev)" value={Ke} onChange={setKe} step={0.05} />
                </div>
                <div style={{ marginTop: '6px' }}>
                  <NumInput label="Gust factor G" value={G} onChange={setG} step={0.05} />
                </div>
              </>
            )}
          </Card>

          {/* Pressure Coefficients */}
          <Card title="Pressure Coefficients">
            {code === 'EC1' ? (
              <>
                <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>External cpe,10</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                  <InfoChip>Windward (D): +{fmt(EC1_CPE_WINDWARD, 1)}</InfoChip>
                  <InfoChip>Leeward (E): {fmt(getEC1CpeLeeward(hd), 2)}</InfoChip>
                  <InfoChip>Side A: {fmt(EC1_CPE_SIDE_A, 1)}</InfoChip>
                  <InfoChip>Side B: {fmt(EC1_CPE_SIDE_B, 1)}</InfoChip>
                </div>
                <InfoChip>h/d = {fmt(hd, 2)}</InfoChip>

                <div style={{ fontSize: '10px', color: '#555', marginTop: '10px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Internal cpi</div>
                <SelectInput label="Enclosure type" options={['Closed building (cpi = +/-0.2)', 'Dominant opening (cpi = +/-0.3)']} value={ec1Enclosure === 'closed' ? 0 : 1} onChange={v => setEc1Enclosure(v === 0 ? 'closed' : 'dominant_opening')} />
                <label className="chk">
                  <input type="checkbox" checked={ec1CpiOverride} onChange={e => setEc1CpiOverride(e.target.checked)} />
                  Override cpi manually
                </label>
                {ec1CpiOverride && <NumInput label="cpi (manual)" value={ec1CpiManual} onChange={setEc1CpiManual} step={0.05} />}
                <InfoChip>cpi = +/- {fmt(ec1CpiVal, 2)}</InfoChip>
              </>
            ) : (
              <>
                <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Wall Cp (MWFRS)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                  <InfoChip>Windward: +{fmt(ASCE7_CP_WINDWARD, 1)}</InfoChip>
                  <InfoChip>Leeward: {fmt(getASCE7CpLeeward(LB_asce), 2)}</InfoChip>
                  <InfoChip>Side walls: {fmt(ASCE7_CP_SIDEWALL, 1)}</InfoChip>
                </div>
                <InfoChip>L/B = {fmt(LB_asce, 2)}</InfoChip>

                <div style={{ fontSize: '10px', color: '#555', marginTop: '10px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Internal GCpi</div>
                <SelectInput label="Enclosure classification" options={['Enclosed (GCpi = +/-0.18)', 'Partially enclosed (GCpi = +/-0.55)']} value={asce7Enclosure === 'enclosed' ? 0 : 1} onChange={v => setAsce7Enclosure(v === 0 ? 'enclosed' : 'partially_enclosed')} />
                <InfoChip>GCpi = +/- {fmt(asce7GCpiVal, 2)}</InfoChip>

                <div style={{ marginTop: '8px' }}>
                  <InfoChip>G = {fmt(G, 2)} (rigid)</InfoChip>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ═══════════ MIDDLE COLUMN: DRAWING + RESULTS ═══════════ */}
        <div>
          {/* Building pressure diagram */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <BuildingPressureDiagram
              h={h} b={b} d={d}
              zones={result?.zones ?? []}
              code={code}
            />
          </div>

          {/* Pressure profile plot */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <PressureProfilePlot
              h={h}
              zones={result?.zones ?? []}
              code={code}
            />
          </div>

          {/* Result cards */}
          {result && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <ResultCard
                title={code === 'EC1' ? 'Peak Velocity Pressure' : 'Velocity Pressure'}
                mainLabel={code === 'EC1' ? 'qp(h)' : 'qh'}
                mainValue={fmt(result.qpH, 1)}
                unit="Pa"
                utilization={50}
                pass={true}
              />
              <ResultCard
                title="Total Wind Force"
                mainLabel="Fw"
                mainValue={fmt(result.totalForce, 2)}
                unit="kN"
                utilization={50}
                pass={true}
              />
              <ResultCard
                title="Windward Pressure (at h)"
                mainLabel="p,windward"
                mainValue={fmt(result.windwardPressureH, 1)}
                unit="Pa"
                utilization={50}
                pass={true}
              />
              <ResultCard
                title="Leeward Pressure"
                mainLabel="p,leeward"
                mainValue={fmt(result.leewardPressure, 1)}
                unit="Pa"
                utilization={50}
                pass={true}
              />
            </div>
          )}

          {/* Pressure table */}
          {result && result.zones.length > 0 && (
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#666', textTransform: 'uppercase', marginBottom: '10px' }}>Pressure Distribution</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <th style={{ textAlign: 'left', padding: '6px 6px', color: '#555', fontWeight: 600, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zone</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px', color: '#555', fontWeight: 600, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>z (m)</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px', color: '#555', fontWeight: 600, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{code === 'EC1' ? 'qp' : 'qz'} (Pa)</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px', color: '#555', fontWeight: 600, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Windward (Pa)</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px', color: '#555', fontWeight: 600, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leeward (Pa)</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px', color: '#555', fontWeight: 600, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net (Pa)</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px', color: '#555', fontWeight: 600, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Force (kN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.zones.map((z, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '5px 6px', color: '#aaa', fontFamily: "'Space Grotesk', monospace" }}>{i + 1}</td>
                        <td style={{ padding: '5px 6px', color: '#888', textAlign: 'right', fontFamily: "'Space Grotesk', monospace" }}>{fmt(z.z, 1)}</td>
                        <td style={{ padding: '5px 6px', color: '#f0f0f0', textAlign: 'right', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" }}>{fmt(z.qp, 1)}</td>
                        <td style={{ padding: '5px 6px', color: '#cc0000', textAlign: 'right', fontFamily: "'Space Grotesk', monospace" }}>{fmt(z.wNetWindward, 1)}</td>
                        <td style={{ padding: '5px 6px', color: '#4488cc', textAlign: 'right', fontFamily: "'Space Grotesk', monospace" }}>{fmt(z.wNetLeeward, 1)}</td>
                        <td style={{ padding: '5px 6px', color: '#f0f0f0', textAlign: 'right', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" }}>{fmt(z.wNetWindward + Math.abs(z.wNetLeeward), 1)}</td>
                        <td style={{ padding: '5px 6px', color: '#f0f0f0', textAlign: 'right', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" }}>{fmt(z.forceNet / 1000, 2)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '1px solid #333' }}>
                      <td colSpan={6} style={{ padding: '6px 6px', color: '#888', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", fontSize: '11px' }}>TOTAL</td>
                      <td style={{ padding: '6px 6px', color: '#cc0000', textAlign: 'right', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", fontSize: '12px' }}>{fmt(result.totalForce, 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary table */}
          {summaryRows.length > 0 && <SummaryTable rows={summaryRows} />}
        </div>

        {/* ═══════════ RIGHT COLUMN: STEP-BY-STEP ═══════════ */}
        <div className="right-col">

          {/* Wind Velocity steps */}
          {result && (
            <div className="right-step-section">
              <div className="right-step-header" onClick={() => toggleStep('velocity')}>
                <span className="right-step-title">Wind Velocity {code === 'EC1' ? '[EN 1991-1-4 §4.2]' : '[ASCE 7-22 §26.5]'}</span>
                <span className="right-step-arrow" style={{ transform: stepsOpen.velocity ? 'rotate(180deg)' : 'none' }}>&#x25BC;</span>
              </div>
              {stepsOpen.velocity && (
                <div style={{ marginTop: '10px' }}>
                  <StepSection title="Wind Velocity" steps={result.steps.filter(s =>
                    s.clause.includes('4.2') || s.clause.includes('4.3') || s.clause.includes('26.5') || s.description.toLowerCase().includes('wind velocity') || s.description.toLowerCase().includes('wind speed')
                  )} />
                </div>
              )}
            </div>
          )}

          {/* Velocity Pressure steps */}
          {result && (
            <div className="right-step-section">
              <div className="right-step-header" onClick={() => toggleStep('pressure')}>
                <span className="right-step-title">Velocity Pressure {code === 'EC1' ? '[EN 1991-1-4 §4.5]' : '[ASCE 7-22 §26.10]'}</span>
                <span className="right-step-arrow" style={{ transform: stepsOpen.pressure ? 'rotate(180deg)' : 'none' }}>&#x25BC;</span>
              </div>
              {stepsOpen.pressure && (
                <div style={{ marginTop: '10px' }}>
                  <StepSection title="Velocity Pressure" steps={result.steps.filter(s =>
                    s.clause.includes('4.4') || s.clause.includes('4.5') || s.clause.includes('26.10') || s.description.toLowerCase().includes('roughness') || s.description.toLowerCase().includes('turbulence') || s.description.toLowerCase().includes('velocity pressure') || s.description.toLowerCase().includes('exposure coefficient')
                  )} />
                </div>
              )}
            </div>
          )}

          {/* External Pressures steps */}
          {result && (
            <div className="right-step-section">
              <div className="right-step-header" onClick={() => toggleStep('external')}>
                <span className="right-step-title">External Pressures {code === 'EC1' ? '[EN 1991-1-4 §7.2]' : '[ASCE 7-22 Fig.27.3]'}</span>
                <span className="right-step-arrow" style={{ transform: stepsOpen.external ? 'rotate(180deg)' : 'none' }}>&#x25BC;</span>
              </div>
              {stepsOpen.external && (
                <div style={{ marginTop: '10px' }}>
                  <StepSection title="External Pressures" steps={result.steps.filter(s =>
                    s.clause.includes('Table 7') || s.clause.includes('Fig.27') || s.clause.includes('7.2') || s.description.toLowerCase().includes('external') || s.description.toLowerCase().includes('wall pressure') || s.description.toLowerCase().includes('gust')
                  )} />
                </div>
              )}
            </div>
          )}

          {/* Internal Pressures steps */}
          {result && (
            <div className="right-step-section">
              <div className="right-step-header" onClick={() => toggleStep('internal')}>
                <span className="right-step-title">Internal Pressures {code === 'EC1' ? '[EN 1991-1-4 §7.2.9]' : '[ASCE 7-22 §26.13]'}</span>
                <span className="right-step-arrow" style={{ transform: stepsOpen.internal ? 'rotate(180deg)' : 'none' }}>&#x25BC;</span>
              </div>
              {stepsOpen.internal && (
                <div style={{ marginTop: '10px' }}>
                  <StepSection title="Internal Pressures" steps={result.steps.filter(s =>
                    s.clause.includes('7.2.9') || s.clause.includes('26.13') || s.description.toLowerCase().includes('internal')
                  )} />
                </div>
              )}
            </div>
          )}

          {/* Net Forces steps */}
          {result && (
            <div className="right-step-section">
              <div className="right-step-header" onClick={() => toggleStep('forces')}>
                <span className="right-step-title">Net Forces {code === 'EC1' ? '[EN 1991-1-4 §5.3]' : '[ASCE 7-22 §27.2]'}</span>
                <span className="right-step-arrow" style={{ transform: stepsOpen.forces ? 'rotate(180deg)' : 'none' }}>&#x25BC;</span>
              </div>
              {stepsOpen.forces && (
                <div style={{ marginTop: '10px' }}>
                  <StepSection title="Net Forces" steps={result.steps.filter(s =>
                    s.clause.includes('5.3') || s.clause.includes('27.2') || s.description.toLowerCase().includes('net') || s.description.toLowerCase().includes('total') || s.description.toLowerCase().includes('wind pressure on') || s.description.toLowerCase().includes('design wind')
                  )} />
                </div>
              )}
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
