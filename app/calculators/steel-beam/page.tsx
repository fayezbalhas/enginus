'use client'

import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import ProGate from '../../components/ProGate'
import { SectionDrawing } from './drawing'
import { ResultCard, SummaryTable, StepSection } from './results'
import {
  classifyEC3, calcBendingEC3, calcShearEC3, calcLTB_EC3, calcDeflectionEC3,
  classifyAISC, calcBendingAISC, calcShearAISC, calcDeflectionAISC,
} from './calculations'
import {
  type DesignCode, type UnitSystem, type LimitState, type SupportType, type SectionFamily,
  EC3_STEEL_GRADES, AISC_STEEL_GRADES, E_STEEL, G_STEEL,
  getAllSections, getSectionFamilies, getMomentCoeff, getShearCoeff,
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

function NumInput({ label, value, onChange, unit, red }: { label: string; value: number; onChange: (v: number) => void; unit?: string; red?: boolean }) {
  return (
    <div>
      <label className="rc-label">{label}{unit ? ` (${unit})` : ''}</label>
      <input
        className="rc-input"
        type="number"
        value={value}
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SteelBeamPage() {
  const [code, setCode] = useState<DesignCode>('EC3')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const [tab, setTab] = useState<LimitState>('ULS')

  // Section
  const families = getSectionFamilies(code)
  const [familyIdx, setFamilyIdx] = useState(0)
  const family = families[Math.min(familyIdx, families.length - 1)]
  const sections = getAllSections(family)
  const [sectionIdx, setSectionIdx] = useState(6) // default ~IPE220 or W14x48
  const sec = sections[Math.min(sectionIdx, sections.length - 1)]

  // Material
  const gradeList = code === 'EC3' ? EC3_STEEL_GRADES : AISC_STEEL_GRADES
  const [gradeIdx, setGradeIdx] = useState(2) // S355 or A992
  const grade = gradeList[Math.min(gradeIdx, gradeList.length - 1)]
  const [gammaM0, setGammaM0] = useState(1.0)
  const [gammaM1, setGammaM1] = useState(1.0)

  // Span & supports
  const [spanM, setSpanM] = useState(6)
  const [support, setSupport] = useState<SupportType>('simply_supported')
  const [lcrM, setLcrM] = useState(6) // unbraced length for LTB
  const [lcrOverride, setLcrOverride] = useState(false)

  // Loading
  const [gk, setGk] = useState(10) // kN/m dead
  const [qk, setQk] = useState(15) // kN/m live
  const [hasPointLoad, setHasPointLoad] = useState(false)
  const [pointLoad, setPointLoad] = useState(50) // kN at mid-span

  // Right col collapsible states
  const [stepsOpen, setStepsOpen] = useState<Record<string, boolean>>({
    classification: true, bending: true, shear: true, ltb: true, deflection: true,
  })
  const toggleStep = (key: string) => setStepsOpen(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Derived values ──────────────────────────────────────────────────────────

  const Lcr = lcrOverride ? lcrM : spanM

  // ULS load combination
  const wEd = code === 'EC3' ? 1.35 * gk + 1.5 * qk : 1.2 * gk + 1.6 * qk
  const momentCoeff = getMomentCoeff(support)
  const shearCoeff = getShearCoeff(support)

  // UDL effects
  let MEd = wEd * spanM * spanM * momentCoeff
  let VEd = wEd * spanM * shearCoeff

  // Add point load effects at mid-span
  if (hasPointLoad) {
    const Pu = code === 'EC3' ? 1.5 * pointLoad : 1.6 * pointLoad
    if (support === 'simply_supported') {
      MEd += Pu * spanM / 4
      VEd += Pu / 2
    } else if (support === 'cantilever') {
      MEd += Pu * spanM
      VEd += Pu
    } else {
      MEd += Pu * spanM / 8
      VEd += Pu / 2
    }
  }

  // ── Calculations ────────────────────────────────────────────────────────────

  const classification = useMemo(() => {
    return code === 'EC3' ? classifyEC3(sec, grade) : classifyAISC(sec, grade)
  }, [sec, grade, code])

  const bending = useMemo(() => {
    if (code === 'EC3') {
      return calcBendingEC3(sec, grade, classification.sectionClass, MEd, gammaM0)
    }
    return calcBendingAISC(sec, grade, MEd, Lcr)
  }, [sec, grade, classification.sectionClass, MEd, code, gammaM0, Lcr])

  const shear = useMemo(() => {
    if (code === 'EC3') {
      return calcShearEC3(sec, grade, VEd, gammaM0)
    }
    return calcShearAISC(sec, grade, VEd)
  }, [sec, grade, VEd, code, gammaM0])

  const ltb = useMemo(() => {
    if (code === 'EC3') {
      return calcLTB_EC3(sec, grade, classification.sectionClass, MEd, Lcr, support, gammaM1)
    }
    return null // AISC flexure already includes LTB in calcBendingAISC
  }, [sec, grade, classification.sectionClass, MEd, Lcr, support, code, gammaM1])

  const deflection = useMemo(() => {
    if (code === 'EC3') {
      return calcDeflectionEC3(sec, spanM, gk, qk, support)
    }
    return calcDeflectionAISC(sec, spanM, gk, qk, support)
  }, [sec, spanM, gk, qk, support, code])

  // ── Summary rows ────────────────────────────────────────────────────────────

  const summaryRows = useMemo(() => {
    const rows: { check: string; required: string; provided: string; utilization: number; pass: boolean }[] = []

    rows.push({
      check: 'Classification',
      required: code === 'EC3' ? 'Class 1-3' : 'Compact',
      provided: code === 'EC3' ? `Class ${classification.sectionClass}` : (classification.sectionClass === 1 ? 'Compact' : classification.sectionClass === 2 ? 'Noncompact' : 'Slender'),
      utilization: code === 'EC3' ? classification.sectionClass / 3 * 100 : classification.sectionClass === 1 ? 33 : classification.sectionClass === 2 ? 66 : 100,
      pass: classification.sectionClass <= 3,
    })

    if (bending) {
      rows.push({
        check: code === 'EC3' ? 'Bending Mc,Rd' : 'Flexure phiMn',
        required: `MEd = ${fmt(MEd, 1)} kN.m`,
        provided: `${fmt(bending.McRd, 1)} kN.m`,
        utilization: bending.utilization,
        pass: bending.pass,
      })
    }

    if (shear) {
      rows.push({
        check: code === 'EC3' ? 'Shear Vpl,Rd' : 'Shear phiVn',
        required: `VEd = ${fmt(VEd, 1)} kN`,
        provided: `${fmt(shear.VplRd, 1)} kN`,
        utilization: shear.utilization,
        pass: shear.pass,
      })
    }

    if (ltb) {
      rows.push({
        check: 'LTB Mb,Rd',
        required: `MEd = ${fmt(MEd, 1)} kN.m`,
        provided: `${fmt(ltb.MbRd, 1)} kN.m`,
        utilization: ltb.utilization,
        pass: ltb.pass,
      })
    }

    if (deflection) {
      rows.push({
        check: 'Deflection (live)',
        required: `<= ${fmt(deflection.limit_live, 2)} mm`,
        provided: `${fmt(deflection.delta_live, 2)} mm`,
        utilization: deflection.delta_live / Math.max(deflection.limit_live, 0.01) * 100,
        pass: deflection.pass_live,
      })
      rows.push({
        check: 'Deflection (total)',
        required: `<= ${fmt(deflection.limit_total, 2)} mm`,
        provided: `${fmt(deflection.delta_total, 2)} mm`,
        utilization: deflection.delta_total / Math.max(deflection.limit_total, 0.01) * 100,
        pass: deflection.pass_total,
      })
    }

    return rows
  }, [classification, bending, shear, ltb, deflection, MEd, VEd, code])

  // ── PDF export ──────────────────────────────────────────────────────────────

  const handleExport = () => window.print()

  // ── Handle code switch ─────────────────────────────────────────────────────

  const handleCodeChange = (newCode: DesignCode) => {
    setCode(newCode)
    setFamilyIdx(0)
    setSectionIdx(newCode === 'EC3' ? 6 : 5)
    setGradeIdx(newCode === 'EC3' ? 2 : 2)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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
        .tab-btn { padding: 6px 14px; border: none; background: transparent; color: #555; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; border-bottom: 2px solid transparent; white-space: nowrap; }
        .tab-btn.on { color: #cc0000; border-bottom-color: #cc0000; }
        .tab-btn:hover { color: #f0f0f0; }
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

      <ProGate>
        {/* ── Top bar ── */}
        <div className="top-bar no-print">
          <div className="tb-group">
            <button className={`tb-btn${code === 'EC3' ? ' on' : ''}`} onClick={() => handleCodeChange('EC3')}>EC3</button>
            <button className={`tb-btn${code === 'AISC' ? ' on' : ''}`} onClick={() => handleCodeChange('AISC')}>AISC</button>
          </div>
          <div className="tb-group">
            <button className={`tb-btn${units === 'SI' ? ' on' : ''}`} onClick={() => setUnits('SI')}>SI</button>
            <button className={`tb-btn${units === 'Imperial' ? ' on' : ''}`} onClick={() => setUnits('Imperial')}>Imperial</button>
          </div>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a' }}>
            <button className={`tab-btn${tab === 'ULS' ? ' on' : ''}`} onClick={() => setTab('ULS')}>ULS</button>
            <button className={`tab-btn${tab === 'SLS' ? ' on' : ''}`} onClick={() => setTab('SLS')}>SLS</button>
          </div>
          <button className="pdf-btn" onClick={handleExport}>Export PDF</button>
        </div>

        {/* ── Three-column layout ── */}
        <div className="three-col">

          {/* ═══════════ LEFT COLUMN: INPUTS ═══════════ */}
          <div className="no-print">

            {/* Section */}
            <Card title="Section">
              <div className="g2" style={{ marginBottom: '8px' }}>
                <SelectInput
                  label="Family"
                  options={families}
                  value={Math.min(familyIdx, families.length - 1)}
                  onChange={v => { setFamilyIdx(v); setSectionIdx(0) }}
                />
                <SelectInput
                  label="Section"
                  options={sections.map(s => s.label)}
                  value={Math.min(sectionIdx, sections.length - 1)}
                  onChange={setSectionIdx}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '4px' }}>
                <InfoChip>h={sec.h}</InfoChip>
                <InfoChip>b={sec.b}</InfoChip>
                <InfoChip>tw={sec.tw}</InfoChip>
                <InfoChip>tf={sec.tf}</InfoChip>
                <InfoChip>r={sec.r}</InfoChip>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '4px' }}>
                <InfoChip>A={fmt(sec.A, 0)} mm2</InfoChip>
                <InfoChip>Iy={fmt(sec.Iy, 1)}e6</InfoChip>
                <InfoChip>Iz={fmt(sec.Iz, 2)}e6</InfoChip>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                <InfoChip>Wely={fmt(sec.Wely, 0)}e3</InfoChip>
                <InfoChip>Wply={fmt(sec.Wply, 0)}e3</InfoChip>
                <InfoChip>It={fmt(sec.It, 1)}e3</InfoChip>
                <InfoChip>Iw={fmt(sec.Iw, 4)}e9</InfoChip>
              </div>
            </Card>

            {/* Materials */}
            <Card title="Materials">
              <div style={{ marginBottom: '6px' }}>
                <SelectInput label="Steel grade" options={gradeList.map(g => g.label)} value={Math.min(gradeIdx, gradeList.length - 1)} onChange={setGradeIdx} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
                <InfoChip>fy={grade.fy} MPa</InfoChip>
                <InfoChip>fu={grade.fu} MPa</InfoChip>
                <InfoChip>E={E_STEEL} MPa</InfoChip>
                <InfoChip>G={G_STEEL} MPa</InfoChip>
              </div>
              {code === 'EC3' && (
                <div className="g2">
                  <NumInput label="gammaM0" value={gammaM0} onChange={setGammaM0} />
                  <NumInput label="gammaM1" value={gammaM1} onChange={setGammaM1} />
                </div>
              )}
            </Card>

            {/* Span & Supports */}
            <Card title="Span & Supports">
              <div className="g2" style={{ marginBottom: '8px' }}>
                <NumInput label="Span L" value={spanM} onChange={setSpanM} unit="m" />
                <SelectInput
                  label="Support"
                  options={['Simply Supported', 'Cantilever', 'Fixed-Fixed']}
                  value={['simply_supported', 'cantilever', 'fixed_fixed'].indexOf(support)}
                  onChange={v => setSupport((['simply_supported', 'cantilever', 'fixed_fixed'] as SupportType[])[v])}
                />
              </div>
              <label className="chk">
                <input type="checkbox" checked={lcrOverride} onChange={e => setLcrOverride(e.target.checked)} />
                Override unbraced length Lcr
              </label>
              {lcrOverride ? (
                <NumInput label="Lcr" value={lcrM} onChange={setLcrM} unit="m" red />
              ) : (
                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Lcr = L = {spanM} m (default)</div>
              )}
            </Card>

            {/* Loading */}
            <Card title="Loading">
              <div className="g2" style={{ marginBottom: '6px' }}>
                <NumInput label="Dead load gk" value={gk} onChange={setGk} unit="kN/m" />
                <NumInput label="Live load qk" value={qk} onChange={setQk} unit="kN/m" />
              </div>
              <label className="chk">
                <input type="checkbox" checked={hasPointLoad} onChange={e => setHasPointLoad(e.target.checked)} />
                Point load at mid-span
              </label>
              {hasPointLoad && (
                <NumInput label="P (unfactored)" value={pointLoad} onChange={setPointLoad} unit="kN" />
              )}
              <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '8px 10px', marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Factored ULS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                  <InfoChip>wEd = {fmt(wEd, 1)} kN/m</InfoChip>
                  <InfoChip>MEd = {fmt(MEd, 1)} kN.m</InfoChip>
                  <InfoChip>VEd = {fmt(VEd, 1)} kN</InfoChip>
                </div>
                <div style={{ fontSize: '9px', color: '#444', marginTop: '4px' }}>
                  {code === 'EC3' ? 'wEd = 1.35gk + 1.5qk' : 'wu = 1.2D + 1.6L'}
                </div>
              </div>
            </Card>
          </div>

          {/* ═══════════ MIDDLE COLUMN: DRAWING + RESULTS ═══════════ */}
          <div>
            {/* Section drawing */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <SectionDrawing section={sec} />
            </div>

            {/* Result cards */}
            {tab === 'ULS' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {bending && (
                  <ResultCard
                    title="Bending"
                    mainLabel={code === 'EC3' ? 'MEd' : 'Mu'}
                    mainValue={fmt(MEd, 1)}
                    secondLabel={code === 'EC3' ? 'Mc,Rd' : 'phiMn'}
                    secondValue={fmt(bending.McRd, 1)}
                    unit="kN.m"
                    utilization={bending.utilization}
                    pass={bending.pass}
                  />
                )}
                {shear && (
                  <ResultCard
                    title="Shear"
                    mainLabel={code === 'EC3' ? 'VEd' : 'Vu'}
                    mainValue={fmt(VEd, 1)}
                    secondLabel={code === 'EC3' ? 'Vpl,Rd' : 'phiVn'}
                    secondValue={fmt(shear.VplRd, 1)}
                    unit="kN"
                    utilization={shear.utilization}
                    pass={shear.pass}
                  />
                )}
                {ltb && (
                  <ResultCard
                    title="LTB"
                    mainLabel="MEd"
                    mainValue={fmt(MEd, 1)}
                    secondLabel="Mb,Rd"
                    secondValue={fmt(ltb.MbRd, 1)}
                    unit="kN.m"
                    utilization={ltb.utilization}
                    pass={ltb.pass}
                  />
                )}
                {deflection && (
                  <ResultCard
                    title="Deflection"
                    mainLabel="delta_live"
                    mainValue={fmt(deflection.delta_live, 2)}
                    secondLabel={code === 'EC3' ? 'L/300' : 'L/240'}
                    secondValue={fmt(deflection.limit_live, 2)}
                    unit="mm"
                    utilization={deflection.delta_live / Math.max(deflection.limit_live, 0.01) * 100}
                    pass={deflection.pass_live}
                  />
                )}
              </div>
            )}

            {tab === 'SLS' && deflection && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <ResultCard
                  title="Live Load Deflection"
                  mainLabel="delta_live"
                  mainValue={fmt(deflection.delta_live, 2)}
                  secondLabel={code === 'EC3' ? 'L/300' : 'L/240'}
                  secondValue={fmt(deflection.limit_live, 2)}
                  unit="mm"
                  utilization={deflection.delta_live / Math.max(deflection.limit_live, 0.01) * 100}
                  pass={deflection.pass_live}
                />
                <ResultCard
                  title="Total Deflection"
                  mainLabel="delta_total"
                  mainValue={fmt(deflection.delta_total, 2)}
                  secondLabel={code === 'EC3' ? 'L/250' : 'L/180'}
                  secondValue={fmt(deflection.limit_total, 2)}
                  unit="mm"
                  utilization={deflection.delta_total / Math.max(deflection.limit_total, 0.01) * 100}
                  pass={deflection.pass_total}
                />
              </div>
            )}

            {/* Summary table */}
            {summaryRows.length > 0 && <SummaryTable rows={summaryRows} />}
          </div>

          {/* ═══════════ RIGHT COLUMN: STEP-BY-STEP ═══════════ */}
          <div className="right-col">

            {/* Classification steps */}
            {classification && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('classification')}>
                  <span className="right-step-title">Classification {code === 'EC3' ? '[EC3 Table 5.2]' : '[AISC B4]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.classification ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
                </div>
                {stepsOpen.classification && <div style={{ marginTop: '10px' }}><StepSection title="Section Classification" steps={classification.steps} /></div>}
              </div>
            )}

            {/* Bending steps */}
            {bending && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('bending')}>
                  <span className="right-step-title">Bending {code === 'EC3' ? '[EC3 SS6.2.5]' : '[AISC F2]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.bending ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
                </div>
                {stepsOpen.bending && <div style={{ marginTop: '10px' }}><StepSection title="Flexural Design" steps={bending.steps} /></div>}
              </div>
            )}

            {/* Shear steps */}
            {shear && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('shear')}>
                  <span className="right-step-title">Shear {code === 'EC3' ? '[EC3 SS6.2.6]' : '[AISC G2]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.shear ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
                </div>
                {stepsOpen.shear && <div style={{ marginTop: '10px' }}><StepSection title="Shear Design" steps={shear.steps} /></div>}
              </div>
            )}

            {/* LTB steps */}
            {ltb && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('ltb')}>
                  <span className="right-step-title">LTB {code === 'EC3' ? '[EC3 SS6.3.2]' : '[AISC F2]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.ltb ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
                </div>
                {stepsOpen.ltb && <div style={{ marginTop: '10px' }}><StepSection title="Lateral-Torsional Buckling" steps={ltb.steps} /></div>}
              </div>
            )}

            {/* Deflection steps */}
            {deflection && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('deflection')}>
                  <span className="right-step-title">Deflection {code === 'EC3' ? '[EC3 SS7.2]' : '[AISC L]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.deflection ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
                </div>
                {stepsOpen.deflection && <div style={{ marginTop: '10px' }}><StepSection title="Deflection Check" steps={deflection.steps} /></div>}
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
      </ProGate>
    </main>
  )
}
