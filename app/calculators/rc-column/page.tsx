'use client'

import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import ProGate from '../../components/ProGate'
import { ColumnSectionDrawing, InteractionDiagram } from './drawing'
import { ResultCard, SummaryTable, StepSection } from './results'
import {
  calcSlendernessEC2, calcSlendernessACI,
  calcSecondOrderEC2, calcMomentMagACI,
  calcInteractionEC2, calcInteractionACI,
  calcBiaxialEC2, calcBiaxialACI,
  calcReinfLimitsEC2, calcReinfLimitsACI,
  calcLinksEC2, calcTiesACI,
  calcMinEccentricity,
} from './calculations'
import {
  type DesignCode, type UnitSystem, type LimitState, type ColumnType,
  EC2_CONCRETE, EC2_STEEL, EC2_EXPOSURE,
  EC2_BAR_DIAMETERS, EC2_BAR_LABELS, EC2_LINK_DIAMETERS, EC2_LINK_LABELS,
  ACI_CONCRETE_SI, ACI_CONCRETE_IMP, ACI_STEEL, ACI_EXPOSURE,
  ACI_BAR_DIAMETERS_MM, ACI_BAR_LABELS, ACI_TIE_DIAMETERS_MM, ACI_TIE_LABELS,
  EFF_LEN_FACTORS, BAR_COUNTS,
  barArea, fmt, getBarPositions,
} from './types'

const ES = 200000

// ── UI Components ────────────────────────────────────────────────────────────

function Card({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666' }}>{title}</span>
        <span style={{ fontSize: '14px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#444' }}>▼</span>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  )
}

function NumInput({ label, value, onChange, unit }: { label: string; value: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div>
      <label className="rc-label">{label}{unit ? ` (${unit})` : ''}</label>
      <input className="rc-input" type="number" value={value} onChange={e => onChange(+e.target.value)} />
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
  return <span style={{ display: 'inline-block', fontSize: '10px', color: '#666', background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '2px 7px', borderRadius: '3px', margin: '2px', fontFamily: "'Space Grotesk', monospace" }}>{children}</span>
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="rc-label">{label}</label>
      <div className="rc-input" style={{ background: '#0a0a0a', cursor: 'default', color: '#888' }}>{value}</div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RcColumnPage() {
  const [code, setCode] = useState<DesignCode>('EC2')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const [tab, setTab] = useState<LimitState>('ULS')
  const [colType, setColType] = useState<ColumnType>('rectangular')

  // Geometry
  const [b, setB] = useState(400)
  const [h, setH] = useState(400)
  const [D, setD] = useState(500)
  const [l0, setL0] = useState(3.5)
  const [effLenIdx, setEffLenIdx] = useState(0)
  const [useCustomK, setUseCustomK] = useState(false)
  const [customK, setCustomK] = useState(0.75)

  // EC2 materials
  const [concreteIdx, setConcreteIdx] = useState(2)
  const [steelIdx, setSteelIdx] = useState(1)
  const [exposureIdx, setExposureIdx] = useState(0)
  const [gammaC, setGammaC] = useState(1.5)
  const [gammaS, setGammaS] = useState(1.15)
  const [cnomOverride, setCnomOverride] = useState(false)
  const [cnomManual, setCnomManual] = useState(30)
  const [phiEf, setPhiEf] = useState(0)

  // ACI materials
  const [aciConcreteIdx, setAciConcreteIdx] = useState(1)
  const [aciSteelIdx, setAciSteelIdx] = useState(1)
  const [aciExposureIdx, setAciExposureIdx] = useState(0)
  const [aciCoverOverride, setAciCoverOverride] = useState(false)
  const [aciCoverManual, setAciCoverManual] = useState(40)

  // Reinforcement
  const [nBars, setNBars] = useState(8)
  const [barDiaIdx, setBarDiaIdx] = useState(2)
  const [linkDiaIdx, setLinkDiaIdx] = useState(1)
  const [linkSpacing, setLinkSpacing] = useState(200)

  // Loading
  const [NEd, setNEd] = useState(1500)
  const [MyTop, setMyTop] = useState(120)
  const [MyBot, setMyBot] = useState(80)
  const [Mz, setMz] = useState(60)
  const [useLoadBreakdown, setUseLoadBreakdown] = useState(false)
  const [NGk, setNGk] = useState(800)
  const [NQk, setNQk] = useState(400)

  // Right col collapsible states
  const [stepsOpen, setStepsOpen] = useState<Record<string, boolean>>({
    eccentricity: true, slenderness: true, secondOrder: true,
    interaction: true, biaxial: true, reinf: true, links: true,
  })
  const toggleStep = (key: string) => setStepsOpen(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Derived values ──────────────────────────────────────────────────────────

  const ec2Concrete = EC2_CONCRETE[concreteIdx]
  const ec2Steel = EC2_STEEL[steelIdx]
  const ec2Exposure = EC2_EXPOSURE[exposureIdx]
  const aciConcreteList = units === 'SI' ? ACI_CONCRETE_SI : ACI_CONCRETE_IMP
  const aciConcrete = aciConcreteList[Math.min(aciConcreteIdx, aciConcreteList.length - 1)]
  const aciSteel = ACI_STEEL[aciSteelIdx]
  const aciExposure = ACI_EXPOSURE[aciExposureIdx]

  const barDiameters = code === 'EC2' ? EC2_BAR_DIAMETERS : ACI_BAR_DIAMETERS_MM
  const barLabels = code === 'EC2' ? EC2_BAR_LABELS : ACI_BAR_LABELS
  const linkDiameters = code === 'EC2' ? EC2_LINK_DIAMETERS : ACI_TIE_DIAMETERS_MM
  const linkLabels = code === 'EC2' ? EC2_LINK_LABELS : ACI_TIE_LABELS

  const cnom_auto = code === 'EC2' ? ec2Exposure.cmin_dur + 10 : aciExposure.cover
  const cnom = code === 'EC2' ? (cnomOverride ? cnomManual : cnom_auto) : (aciCoverOverride ? aciCoverManual : cnom_auto)

  const barDia = barDiameters[Math.min(barDiaIdx, barDiameters.length - 1)]
  const linkDia = linkDiameters[Math.min(linkDiaIdx, linkDiameters.length - 1)]

  const k = useCustomK ? customK : EFF_LEN_FACTORS[effLenIdx].value
  const l0_mm = l0 * 1000
  const leff = k * l0_mm

  const hEff = colType === 'rectangular' ? h : D
  const bEff = colType === 'rectangular' ? b : D
  const Ac = colType === 'rectangular' ? b * h : Math.PI * D * D / 4
  const dPrime = cnom + linkDia + barDia / 2
  const d = hEff - dPrime

  const barPositions = getBarPositions(colType, nBars, b, h, D, dPrime)
  const As_total = nBars * barArea(barDia)
  const rho = As_total / Ac

  const fck = code === 'EC2' ? ec2Concrete.fck : aciConcrete.fc
  const fyk = code === 'EC2' ? ec2Steel.fyk : aciSteel.fy
  const fcd = code === 'EC2' ? 0.85 * ec2Concrete.fck / gammaC : 0.85 * aciConcrete.fc
  const fyd = code === 'EC2' ? ec2Steel.fyk / gammaS : aciSteel.fy
  const Ecm = code === 'EC2' ? ec2Concrete.Ecm : 4700 * Math.sqrt(aciConcrete.fc)

  const NEd_calc = useLoadBreakdown ? 1.35 * NGk + 1.5 * NQk : NEd
  const M02 = Math.max(Math.abs(MyTop), Math.abs(MyBot))
  const M01_raw = Math.min(Math.abs(MyTop), Math.abs(MyBot))
  const singleCurvature = (MyTop >= 0 && MyBot >= 0) || (MyTop <= 0 && MyBot <= 0)
  const M01 = singleCurvature ? M01_raw : -M01_raw

  // ── Calculations ────────────────────────────────────────────────────────────

  const minEcc = useMemo(() => {
    if (Ac <= 0) return null
    return calcMinEccentricity(colType, h, D, NEd_calc, M02, code)
  }, [colType, h, D, NEd_calc, M02, code])

  const MEd_y = minEcc ? minEcc.MEd_design : M02

  const slenderness = useMemo(() => {
    if (Ac <= 0 || NEd_calc <= 0) return null
    if (code === 'EC2') {
      return calcSlendernessEC2(colType, b, h, D, leff, NEd_calc, fcd, fyd, As_total, Ac, phiEf, M01, M02)
    }
    return calcSlendernessACI(colType, h, D, k, l0_mm, M01, M02)
  }, [colType, b, h, D, leff, NEd_calc, fcd, fyd, As_total, Ac, phiEf, M01, M02, code, k, l0_mm])

  const secondOrder = useMemo(() => {
    if (!slenderness || !slenderness.is_slender || NEd_calc <= 0) return null
    const e0 = minEcc ? minEcc.e0 : Math.max(hEff / 30, 20)
    if (code === 'EC2') {
      return calcSecondOrderEC2(colType, b, h, D, leff, NEd_calc, fck, fcd, fyd, Ecm, As_total, Ac, slenderness.lambda, phiEf, M02, e0)
    }
    return calcMomentMagACI(colType, b, h, D, k, l0_mm, NEd_calc, fck, fyd, Ecm, As_total, M01, M02)
  }, [slenderness, colType, b, h, D, leff, NEd_calc, fck, fcd, fyd, Ecm, As_total, Ac, phiEf, M02, code, k, l0_mm, M01, minEcc, hEff])

  const MEd_design = secondOrder ? secondOrder.MEd_total : MEd_y

  const interactionY = useMemo(() => {
    if (Ac <= 0 || d <= 0 || barPositions.length === 0) return null
    if (code === 'EC2') {
      return calcInteractionEC2(colType, b, h, D, barPositions, barDia, fck, fyd, fcd, NEd_calc, MEd_design)
    }
    return calcInteractionACI(colType, b, h, D, barPositions, barDia, fck, fyd, NEd_calc, MEd_design)
  }, [colType, b, h, D, barPositions, barDia, fck, fyd, fcd, NEd_calc, MEd_design, code, Ac, d])

  const barPositionsZ = useMemo(() => {
    if (colType === 'circular') return barPositions
    return barPositions.map(p => ({ x: p.y, y: p.x }))
  }, [barPositions, colType])

  const interactionZ = useMemo(() => {
    if (Ac <= 0 || d <= 0 || barPositionsZ.length === 0 || tab !== 'Biaxial') return null
    const bZ = colType === 'rectangular' ? h : D
    const hZ = colType === 'rectangular' ? b : D
    if (code === 'EC2') {
      return calcInteractionEC2(colType, bZ, hZ, D, barPositionsZ, barDia, fck, fyd, fcd, NEd_calc, Math.abs(Mz))
    }
    return calcInteractionACI(colType, bZ, hZ, D, barPositionsZ, barDia, fck, fyd, NEd_calc, Math.abs(Mz))
  }, [colType, b, h, D, barPositionsZ, barDia, fck, fyd, fcd, NEd_calc, Mz, code, Ac, d, tab])

  const biaxial = useMemo(() => {
    if (tab !== 'Biaxial' || !interactionY || !interactionZ) return null
    const NRd = interactionY.curve.length > 0 ? interactionY.curve[0].N : 0
    if (code === 'EC2') {
      return calcBiaxialEC2(interactionY.curve, interactionZ.curve, NEd_calc, MEd_design, Mz, NRd)
    }
    const phiPn0 = interactionY.curve.length > 0 ? interactionY.curve[0].N : 0
    return calcBiaxialACI(interactionY.curve, interactionZ.curve, NEd_calc, MEd_design, Mz, phiPn0)
  }, [tab, interactionY, interactionZ, NEd_calc, MEd_design, Mz, code])

  const reinf = useMemo(() => {
    if (Ac <= 0) return null
    if (code === 'EC2') return calcReinfLimitsEC2(Ac, As_total, NEd_calc, fyd)
    return calcReinfLimitsACI(Ac, As_total)
  }, [Ac, As_total, NEd_calc, fyd, code])

  const links = useMemo(() => {
    if (code === 'EC2') return calcLinksEC2(barDia, b, h, l0_mm, linkDia, linkSpacing)
    return calcTiesACI(barDia, b, h, linkDia, linkSpacing)
  }, [barDia, b, h, l0_mm, linkDia, linkSpacing, code])

  // ── Summary rows ────────────────────────────────────────────────────────────

  const summaryRows = useMemo(() => {
    const rows: { check: string; required: string; provided: string; utilization: number; pass: boolean }[] = []

    if (slenderness) {
      rows.push({ check: `Slenderness λ`, required: `≤ ${fmt(slenderness.lambda_lim, 1)}`, provided: fmt(slenderness.lambda, 1), utilization: slenderness.lambda / Math.max(slenderness.lambda_lim, 1) * 100, pass: !slenderness.is_slender })
    }
    if (minEcc) {
      rows.push({ check: 'Min eccentricity', required: `${fmt(minEcc.MEd_min, 2)} kN·m`, provided: `${fmt(MEd_design, 2)} kN·m`, utilization: 0, pass: true })
    }
    if (interactionY) {
      rows.push({ check: 'N-M Interaction', required: '≤ 1.0', provided: fmt(interactionY.utilization, 2), utilization: interactionY.utilization * 100, pass: interactionY.pass })
    }
    if (biaxial) {
      rows.push({ check: 'Biaxial check', required: '≤ 1.0', provided: fmt(biaxial.check_value, 3), utilization: biaxial.check_value * 100, pass: biaxial.pass })
    }
    if (reinf) {
      rows.push({ check: 'As,min', required: `${fmt(reinf.As_min, 0)} mm²`, provided: `${fmt(reinf.As_total, 0)} mm²`, utilization: reinf.As_min / Math.max(reinf.As_total, 1) * 100, pass: reinf.pass_min })
      rows.push({ check: 'As,max', required: `≤ ${fmt(reinf.As_max, 0)} mm²`, provided: `${fmt(reinf.As_total, 0)} mm²`, utilization: reinf.As_total / Math.max(reinf.As_max, 1) * 100, pass: reinf.pass_max })
    }
    if (links) {
      rows.push({ check: code === 'EC2' ? 'Link spacing' : 'Tie spacing', required: `≤ ${fmt(links.spacing_max, 0)} mm`, provided: `${linkSpacing} mm`, utilization: linkSpacing / Math.max(links.spacing_max, 1) * 100, pass: links.pass_spacing })
    }
    return rows
  }, [slenderness, minEcc, MEd_design, interactionY, biaxial, reinf, links, code, linkSpacing])

  const handleExport = () => window.print()

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rc-input { background: #0d0d0d; border: 1px solid #1e1e1e; color: #f0f0f0; padding: 7px 10px; border-radius: 4px; font-size: 13px; width: 100%; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; -moz-appearance: textfield; }
        .rc-input:focus { border-color: #cc0000; }
        .rc-input::-webkit-inner-spin-button, .rc-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .rc-label { display: block; font-size: 10px; color: #777; margin-bottom: 3px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
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
            <button className={`tb-btn${code === 'EC2' ? ' on' : ''}`} onClick={() => setCode('EC2')}>EC2</button>
            <button className={`tb-btn${code === 'ACI' ? ' on' : ''}`} onClick={() => setCode('ACI')}>ACI 318</button>
          </div>
          <div className="tb-group">
            <button className={`tb-btn${units === 'SI' ? ' on' : ''}`} onClick={() => setUnits('SI')}>SI</button>
            <button className={`tb-btn${units === 'Imperial' ? ' on' : ''}`} onClick={() => setUnits('Imperial')}>Imperial</button>
          </div>
          <div className="tb-group">
            <button className={`tb-btn${colType === 'rectangular' ? ' on' : ''}`} onClick={() => setColType('rectangular')}>Rectangular</button>
            <button className={`tb-btn${colType === 'circular' ? ' on' : ''}`} onClick={() => setColType('circular')}>Circular</button>
          </div>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a' }}>
            <button className={`tab-btn${tab === 'ULS' ? ' on' : ''}`} onClick={() => setTab('ULS')}>ULS</button>
            <button className={`tab-btn${tab === 'Slenderness' ? ' on' : ''}`} onClick={() => setTab('Slenderness')}>Slenderness</button>
            <button className={`tab-btn${tab === 'Biaxial' ? ' on' : ''}`} onClick={() => setTab('Biaxial')}>Biaxial</button>
          </div>
          <button className="pdf-btn" onClick={handleExport}>Export PDF</button>
        </div>

        {/* ── Three-column layout ── */}
        <div className="three-col">

          {/* ═══════════ LEFT COLUMN: INPUTS ═══════════ */}
          <div className="no-print">

            {/* Geometry */}
            <Card title="Geometry">
              {colType === 'rectangular' ? (
                <div className="g2" style={{ marginBottom: '8px' }}>
                  <NumInput label="Width b" value={b} onChange={setB} unit="mm" />
                  <NumInput label="Height h" value={h} onChange={setH} unit="mm" />
                </div>
              ) : (
                <div style={{ marginBottom: '8px' }}>
                  <NumInput label="Diameter D" value={D} onChange={setD} unit="mm" />
                </div>
              )}
              <div className="g2" style={{ marginBottom: '8px' }}>
                <NumInput label="Clear height l₀" value={l0} onChange={setL0} unit="m" />
                <div>
                  <SelectInput label="Eff. length factor" options={[...EFF_LEN_FACTORS.map(f => f.label), 'Custom']} value={useCustomK ? EFF_LEN_FACTORS.length : effLenIdx} onChange={v => { if (v >= EFF_LEN_FACTORS.length) { setUseCustomK(true) } else { setUseCustomK(false); setEffLenIdx(v) } }} />
                </div>
              </div>
              {useCustomK && <NumInput label="Custom k factor" value={customK} onChange={setCustomK} />}
              <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '8px 10px', marginTop: '6px' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effective length</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#cc0000', marginTop: '2px' }}>
                  leff = {fmt(leff, 0)} mm
                </div>
                <div style={{ fontSize: '9px', color: '#444', marginTop: '2px' }}>= {fmt(k, 2)} × {fmt(l0_mm, 0)}</div>
              </div>
            </Card>

            {/* Materials */}
            <Card title="Materials">
              {code === 'EC2' ? (
                <>
                  <div className="g2" style={{ marginBottom: '6px' }}>
                    <SelectInput label="Concrete" options={EC2_CONCRETE.map(c => c.label)} value={concreteIdx} onChange={setConcreteIdx} />
                    <SelectInput label="Steel" options={EC2_STEEL.map(s => s.label)} value={steelIdx} onChange={setSteelIdx} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
                    <InfoChip>fck={ec2Concrete.fck}</InfoChip>
                    <InfoChip>fcd={fmt(fcd)}</InfoChip>
                    <InfoChip>fctm={ec2Concrete.fctm}</InfoChip>
                    <InfoChip>Ecm={ec2Concrete.Ecm}</InfoChip>
                    <InfoChip>fyk={ec2Steel.fyk}</InfoChip>
                    <InfoChip>fyd={fmt(fyd)}</InfoChip>
                  </div>
                  <div className="g3" style={{ marginBottom: '6px' }}>
                    <NumInput label="γc" value={gammaC} onChange={setGammaC} />
                    <NumInput label="γs" value={gammaS} onChange={setGammaS} />
                    <NumInput label="φef (creep)" value={phiEf} onChange={setPhiEf} />
                  </div>
                </>
              ) : (
                <>
                  <div className="g2" style={{ marginBottom: '6px' }}>
                    <SelectInput label="f'c" options={aciConcreteList.map(c => c.label)} value={Math.min(aciConcreteIdx, aciConcreteList.length - 1)} onChange={setAciConcreteIdx} />
                    <SelectInput label="Steel grade" options={ACI_STEEL.map(s => s.label)} value={aciSteelIdx} onChange={setAciSteelIdx} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
                    <InfoChip>f&apos;c={aciConcrete.fc} MPa</InfoChip>
                    <InfoChip>fy={aciSteel.fy} MPa</InfoChip>
                    <InfoChip>Es={ES} MPa</InfoChip>
                  </div>
                </>
              )}
            </Card>

            {/* Cover */}
            <Card title="Cover & Exposure">
              {code === 'EC2' ? (
                <>
                  <div style={{ marginBottom: '6px' }}>
                    <SelectInput label="Exposure class" options={EC2_EXPOSURE.map(e => `${e.label} — ${e.description}`)} value={exposureIdx} onChange={setExposureIdx} />
                  </div>
                  <ReadOnlyField label="cnom auto (mm)" value={`${cnom_auto}`} />
                  <label className="chk">
                    <input type="checkbox" checked={cnomOverride} onChange={e => setCnomOverride(e.target.checked)} />
                    Manual override
                  </label>
                  {cnomOverride && <NumInput label="cnom manual" value={cnomManual} onChange={setCnomManual} unit="mm" />}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '6px' }}>
                    <SelectInput label="Exposure" options={ACI_EXPOSURE.map(e => e.label)} value={aciExposureIdx} onChange={setAciExposureIdx} />
                  </div>
                  <ReadOnlyField label="Clear cover auto (mm)" value={`${cnom_auto}`} />
                  <label className="chk">
                    <input type="checkbox" checked={aciCoverOverride} onChange={e => setAciCoverOverride(e.target.checked)} />
                    Manual override
                  </label>
                  {aciCoverOverride && <NumInput label="Cover manual" value={aciCoverManual} onChange={setAciCoverManual} unit="mm" />}
                </>
              )}
            </Card>

            {/* Reinforcement */}
            <Card title="Reinforcement">
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Longitudinal Bars</div>
              <div className="g2" style={{ marginBottom: '6px' }}>
                <div>
                  <label className="rc-label">Number of bars</label>
                  <select className="rc-input" value={nBars} onChange={e => setNBars(+e.target.value)} style={{ cursor: 'pointer' }}>
                    {BAR_COUNTS.map(n => <option key={n} value={n} style={{ background: '#111' }}>{n}</option>)}
                  </select>
                </div>
                <SelectInput label="Bar diameter" options={barLabels} value={Math.min(barDiaIdx, barLabels.length - 1)} onChange={setBarDiaIdx} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                <InfoChip>As,total = {fmt(As_total, 0)} mm²</InfoChip>
                <InfoChip>ρ = {fmt(rho * 100, 2)}%</InfoChip>
              </div>

              <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid #1a1a1a', paddingTop: '8px' }}>
                {code === 'EC2' ? 'Links' : 'Ties'}
              </div>
              <div className="g2">
                <SelectInput label="Diameter" options={linkLabels} value={Math.min(linkDiaIdx, linkLabels.length - 1)} onChange={setLinkDiaIdx} />
                <NumInput label="Spacing" value={linkSpacing} onChange={setLinkSpacing} unit="mm" />
              </div>
            </Card>

            {/* Loading */}
            <Card title="Loading">
              <label className="chk" style={{ marginBottom: '6px' }}>
                <input type="checkbox" checked={useLoadBreakdown} onChange={e => setUseLoadBreakdown(e.target.checked)} />
                Use load breakdown (Gk, Qk)
              </label>
              {useLoadBreakdown ? (
                <>
                  <div className="g2" style={{ marginBottom: '4px' }}>
                    <NumInput label="NGk (permanent)" value={NGk} onChange={setNGk} unit="kN" />
                    <NumInput label="NQk (variable)" value={NQk} onChange={setNQk} unit="kN" />
                  </div>
                  <InfoChip>NEd = 1.35×{NGk} + 1.5×{NQk} = {fmt(1.35 * NGk + 1.5 * NQk, 1)} kN</InfoChip>
                </>
              ) : (
                <div style={{ marginBottom: '8px' }}>
                  <NumInput label={code === 'EC2' ? 'NEd (axial force)' : 'Pu (axial force)'} value={NEd} onChange={setNEd} unit="kN" />
                </div>
              )}

              <div className="g2" style={{ marginBottom: '4px' }}>
                <NumInput label="My,top" value={MyTop} onChange={setMyTop} unit="kN·m" />
                <NumInput label="My,bot" value={MyBot} onChange={setMyBot} unit="kN·m" />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '4px' }}>
                <InfoChip>M02 = {fmt(M02, 1)}</InfoChip>
                <InfoChip>M01 = {fmt(M01, 1)}</InfoChip>
                <InfoChip>{singleCurvature ? 'Single' : 'Double'} curvature</InfoChip>
              </div>

              {tab === 'Biaxial' && (
                <div style={{ marginTop: '8px', borderTop: '1px solid #1a1a1a', paddingTop: '8px' }}>
                  <NumInput label="Mz (out-of-plane)" value={Mz} onChange={setMz} unit="kN·m" />
                </div>
              )}
            </Card>
          </div>

          {/* ═══════════ MIDDLE COLUMN: DRAWING + RESULTS ═══════════ */}
          <div>
            {/* Section drawing */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <ColumnSectionDrawing
                colType={colType} b={b} h={h} D={D}
                cnom={cnom} linkDia={linkDia} barDia={barDia}
                barPositions={barPositions}
                code={code} nBars={nBars} NEd={NEd_calc}
              />
            </div>

            {/* Interaction diagram */}
            {interactionY && (
              <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
                  N-M Interaction Diagram {tab === 'Biaxial' ? '(Y-axis)' : ''}
                </div>
                <InteractionDiagram
                  curve={interactionY.curve}
                  NEd={NEd_calc} MEd={MEd_design}
                  pass={interactionY.pass}
                  momentUnit="kN·m" forceUnit="kN"
                />
              </div>
            )}

            {/* Z-axis interaction for biaxial */}
            {tab === 'Biaxial' && interactionZ && (
              <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
                  N-M Interaction Diagram (Z-axis)
                </div>
                <InteractionDiagram
                  curve={interactionZ.curve}
                  NEd={NEd_calc} MEd={Math.abs(Mz)}
                  pass={interactionZ.pass}
                  momentUnit="kN·m" forceUnit="kN"
                />
              </div>
            )}

            {/* Result cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {interactionY && (
                <ResultCard
                  title="N-M Interaction"
                  mainLabel="Utilization"
                  mainValue={fmt(interactionY.utilization * 100, 1)}
                  secondLabel=""
                  secondValue=""
                  unit="%"
                  utilization={interactionY.utilization * 100}
                  pass={interactionY.pass}
                />
              )}
              {slenderness && (
                <ResultCard
                  title="Slenderness"
                  mainLabel="λ"
                  mainValue={fmt(slenderness.lambda, 1)}
                  secondLabel="λlim"
                  secondValue={fmt(slenderness.lambda_lim, 1)}
                  utilization={slenderness.lambda / Math.max(slenderness.lambda_lim, 1) * 100}
                  pass={!slenderness.is_slender}
                />
              )}
              {reinf && (
                <ResultCard
                  title="Reinforcement"
                  mainLabel="As,prov"
                  mainValue={fmt(reinf.As_total, 0)}
                  secondLabel="As,min"
                  secondValue={fmt(reinf.As_min, 0)}
                  unit="mm²"
                  utilization={reinf.As_min / Math.max(reinf.As_total, 1) * 100}
                  pass={reinf.pass_min && reinf.pass_max}
                />
              )}
              {links && (
                <ResultCard
                  title={code === 'EC2' ? 'Link Design' : 'Tie Design'}
                  mainLabel="Spacing"
                  mainValue={`${linkSpacing}`}
                  secondLabel="s,max"
                  secondValue={fmt(links.spacing_max, 0)}
                  unit="mm"
                  utilization={linkSpacing / Math.max(links.spacing_max, 1) * 100}
                  pass={links.pass_dia && links.pass_spacing}
                />
              )}
            </div>

            {/* Biaxial result card */}
            {biaxial && (
              <div style={{ marginBottom: '12px' }}>
                <ResultCard
                  title="Biaxial Bending"
                  mainLabel="Check value"
                  mainValue={fmt(biaxial.check_value, 3)}
                  secondLabel="Limit"
                  secondValue="1.000"
                  utilization={biaxial.check_value * 100}
                  pass={biaxial.pass}
                />
              </div>
            )}

            {/* Summary table */}
            {summaryRows.length > 0 && <SummaryTable rows={summaryRows} />}
          </div>

          {/* ═══════════ RIGHT COLUMN: STEP-BY-STEP ═══════════ */}
          <div className="right-col">

            {/* Minimum eccentricity */}
            {minEcc && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('eccentricity')}>
                  <span className="right-step-title">Min Eccentricity {code === 'EC2' ? '[EC2 §6.1(4)]' : '[ACI §6.6.4]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.eccentricity ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.eccentricity && <div style={{ marginTop: '10px' }}><StepSection title="Minimum Eccentricity" steps={minEcc.steps} /></div>}
              </div>
            )}

            {/* Slenderness */}
            {slenderness && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('slenderness')}>
                  <span className="right-step-title">Slenderness {code === 'EC2' ? '[EC2 §5.8.3]' : '[ACI §6.2.5]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.slenderness ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.slenderness && <div style={{ marginTop: '10px' }}><StepSection title="Slenderness Check" steps={slenderness.steps} /></div>}
              </div>
            )}

            {/* Second order */}
            {secondOrder && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('secondOrder')}>
                  <span className="right-step-title">Second Order {code === 'EC2' ? '[EC2 §5.8.8]' : '[ACI §6.6.4]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.secondOrder ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.secondOrder && <div style={{ marginTop: '10px' }}><StepSection title={code === 'EC2' ? 'Nominal Curvature Method' : 'Moment Magnification'} steps={secondOrder.steps} /></div>}
              </div>
            )}

            {/* Interaction */}
            {interactionY && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('interaction')}>
                  <span className="right-step-title">N-M Interaction {code === 'EC2' ? '[EC2 §6.1]' : '[ACI §22.4]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.interaction ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.interaction && <div style={{ marginTop: '10px' }}><StepSection title="Interaction Diagram" steps={interactionY.steps} /></div>}
              </div>
            )}

            {/* Biaxial */}
            {biaxial && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('biaxial')}>
                  <span className="right-step-title">Biaxial {code === 'EC2' ? '[EC2 §5.8.9]' : '[ACI Bresler]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.biaxial ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.biaxial && <div style={{ marginTop: '10px' }}><StepSection title="Biaxial Bending Check" steps={biaxial.steps} /></div>}
              </div>
            )}

            {/* Reinforcement limits */}
            {reinf && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('reinf')}>
                  <span className="right-step-title">Reinforcement {code === 'EC2' ? '[EC2 §9.5.2]' : '[ACI §10.6]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.reinf ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.reinf && <div style={{ marginTop: '10px' }}><StepSection title="Reinforcement Limits" steps={reinf.steps} /></div>}
              </div>
            )}

            {/* Links/Ties */}
            {links && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('links')}>
                  <span className="right-step-title">{code === 'EC2' ? 'Links [EC2 §9.5.3]' : 'Ties [ACI §25.7.2]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.links ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.links && <div style={{ marginTop: '10px' }}><StepSection title={code === 'EC2' ? 'Link Design' : 'Tie Design'} steps={links.steps} /></div>}
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
