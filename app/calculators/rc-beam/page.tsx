'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import Navbar from '../../components/Navbar'
import ProGate from '../../components/ProGate'
import { SectionDrawing } from './drawing'
import { ResultCard, SummaryTable, StepSection, BarSchedulePanel } from './results'
import {
  calcFlexureEC2, calcFlexureACI, calcShearEC2, calcShearACI,
  calcCrackEC2, calcCrackACI, calcDeflectionEC2, calcDeflectionACI, getBarSchedule,
} from './calculations'
import {
  type DesignCode, type UnitSystem, type LimitState, type SectionType, type SupportCondition,
  EC2_CONCRETE, EC2_STEEL, EC2_EXPOSURE, STRUCTURAL_CLASSES,
  EC2_BAR_DIAMETERS, EC2_BAR_LABELS, EC2_STIRRUP_DIAMETERS, EC2_STIRRUP_LABELS,
  ACI_CONCRETE_SI, ACI_CONCRETE_IMP, ACI_STEEL, ACI_EXPOSURE,
  ACI_BAR_DIAMETERS_MM, ACI_BAR_LABELS, ACI_STIRRUP_DIAMETERS_MM, ACI_STIRRUP_LABELS,
  barArea, fmt,
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
        <span style={{ fontSize: '14px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#444' }}>▼</span>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="rc-label">{label}</label>
      <div className="rc-input" style={{ background: '#0a0a0a', cursor: 'default', color: '#888' }}>{value}</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RcBeamPage() {
  const [code, setCode] = useState<DesignCode>('EC2')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const [tab, setTab] = useState<LimitState>('ULS')

  // Geometry
  const [sectionType, setSectionType] = useState<SectionType>('rectangular')
  const [b, setB] = useState(300)
  const [h, setH] = useState(600)
  const [beff, setBeff] = useState(800)
  const [bw, setBw] = useState(300)
  const [hf, setHf] = useState(150)
  const [spanM, setSpanM] = useState(6)
  const [support, setSupport] = useState<SupportCondition>('simply_supported')

  // EC2 materials
  const [concreteIdx, setConcreteIdx] = useState(2)
  const [steelIdx, setSteelIdx] = useState(1)
  const [exposureIdx, setExposureIdx] = useState(0)
  const [structClassIdx, setStructClassIdx] = useState(3)
  const [gammaC, setGammaC] = useState(1.5)
  const [gammaS, setGammaS] = useState(1.15)
  const [cnomOverride, setCnomOverride] = useState(false)
  const [cnomManual, setCnomManual] = useState(30)

  // ACI materials
  const [aciConcreteIdx, setAciConcreteIdx] = useState(1)
  const [aciSteelIdx, setAciSteelIdx] = useState(1)
  const [aciExposureIdx, setAciExposureIdx] = useState(0)
  const [phiFlex, setPhiFlex] = useState(0.9)
  const [phiShear, setPhiShear] = useState(0.75)
  const [aciCoverOverride, setAciCoverOverride] = useState(false)
  const [aciCoverManual, setAciCoverManual] = useState(40)

  // Stirrups
  const [stirrupDiaIdx, setStirrupDiaIdx] = useState(1)
  const [stirrupLegs, setStirrupLegs] = useState(2)
  const [stirrupSpacing, setStirrupSpacing] = useState(200)

  // Tension rebar layer 1
  const [bar1DiaIdx, setBar1DiaIdx] = useState(5)
  const [bar1Count, setBar1Count] = useState(3)
  // Layer 2
  const [hasLayer2, setHasLayer2] = useState(false)
  const [bar2DiaIdx, setBar2DiaIdx] = useState(4)
  const [bar2Count, setBar2Count] = useState(2)
  // Layer 3
  const [hasLayer3, setHasLayer3] = useState(false)
  const [bar3DiaIdx, setBar3DiaIdx] = useState(4)
  const [bar3Count, setBar3Count] = useState(2)
  // d override
  const [dOverride, setDOverride] = useState(false)
  const [dManual, setDManual] = useState(540)

  // Compression
  const [hasCompression, setHasCompression] = useState(false)
  const [compDiaIdx, setCompDiaIdx] = useState(3)
  const [compCount, setCompCount] = useState(2)

  // Loading
  const [MEd, setMEd] = useState(250)
  const [VEd, setVEd] = useState(150)
  const [NEd, setNEd] = useState(0)
  const [useLoadBreakdown, setUseLoadBreakdown] = useState(false)
  const [Gk, setGk] = useState(0)
  const [Qk, setQk] = useState(0)

  // SLS
  const [Mk, setMk] = useState(170)
  const [Mfr, setMfr] = useState(140)
  const [Mqp, setMqp] = useState(100)
  const [psi2, setPsi2] = useState(0.3)

  // Right col collapsible states
  const [stepsOpen, setStepsOpen] = useState<Record<string, boolean>>({
    flexure: true, shear: true, crack: true, deflection: true, schedule: true,
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
  const stirrupDiameters = code === 'EC2' ? EC2_STIRRUP_DIAMETERS : ACI_STIRRUP_DIAMETERS_MM
  const stirrupLabels = code === 'EC2' ? EC2_STIRRUP_LABELS : ACI_STIRRUP_LABELS

  const cnom_auto = code === 'EC2' ? ec2Exposure.cmin_dur + 10 : aciExposure.cover
  const cnom = code === 'EC2'
    ? (cnomOverride ? cnomManual : cnom_auto)
    : (aciCoverOverride ? aciCoverManual : cnom_auto)

  const stirrupDia = stirrupDiameters[Math.min(stirrupDiaIdx, stirrupDiameters.length - 1)]
  const bar1Dia = barDiameters[Math.min(bar1DiaIdx, barDiameters.length - 1)]
  const bar2Dia = barDiameters[Math.min(bar2DiaIdx, barDiameters.length - 1)]
  const bar3Dia = barDiameters[Math.min(bar3DiaIdx, barDiameters.length - 1)]
  const compDia = barDiameters[Math.min(compDiaIdx, barDiameters.length - 1)]

  const scl = Math.max(20, bar1Dia, 25)

  const d_auto = (() => {
    let d1 = h - cnom - stirrupDia - bar1Dia / 2
    if (hasLayer2) {
      const d2 = h - cnom - stirrupDia - bar1Dia - scl - bar2Dia / 2
      const A1 = bar1Count * barArea(bar1Dia)
      const A2 = bar2Count * barArea(bar2Dia)
      d1 = (d1 * A1 + d2 * A2) / (A1 + A2)
      if (hasLayer3) {
        const d3 = h - cnom - stirrupDia - bar1Dia - scl - bar2Dia - scl - bar3Dia / 2
        const A3 = bar3Count * barArea(bar3Dia)
        d1 = (d1 * (A1 + A2) + d3 * A3) / (A1 + A2 + A3)
      }
    }
    return d1
  })()

  const d_eff = dOverride ? dManual : d_auto
  const d_prime = cnom + stirrupDia + compDia / 2

  const effectiveB = sectionType === 'rectangular' ? b : bw
  const span_mm = spanM * 1000

  const As_prov_tension = bar1Count * barArea(bar1Dia)
    + (hasLayer2 ? bar2Count * barArea(bar2Dia) : 0)
    + (hasLayer3 ? bar3Count * barArea(bar3Dia) : 0)
  const As_prov_comp = hasCompression ? compCount * barArea(compDia) : 0

  const bar1Spacing = bar1Count > 1
    ? (effectiveB - 2 * cnom - 2 * stirrupDia - bar1Dia) / (bar1Count - 1)
    : effectiveB - 2 * cnom - 2 * stirrupDia

  const tensionLayers = [
    { dia: bar1Dia, count: bar1Count, diaIdx: bar1DiaIdx },
    ...(hasLayer2 ? [{ dia: bar2Dia, count: bar2Count, diaIdx: bar2DiaIdx }] : []),
    ...(hasLayer3 ? [{ dia: bar3Dia, count: bar3Count, diaIdx: bar3DiaIdx }] : []),
  ]

  // Load breakdown
  const MEdCalc = useLoadBreakdown ? 1.35 * Gk + 1.5 * Qk : MEd
  const serviceMoment = tab === 'SLS_FR' ? Mfr : tab === 'SLS_QP' ? Mqp : Mk

  // ── Calculations ────────────────────────────────────────────────────────────

  const flexure = useMemo(() => {
    if (effectiveB <= 0 || h <= 0 || d_eff <= 0) return null
    if (code === 'EC2') {
      return calcFlexureEC2(effectiveB, h, d_eff, ec2Concrete.fck, ec2Concrete.fctm, ec2Steel.fyk, MEdCalc, As_prov_tension, hasCompression, As_prov_comp, d_prime, gammaC, gammaS)
    }
    return calcFlexureACI(effectiveB, h, d_eff, aciConcrete.fc, aciSteel.fy, MEdCalc, As_prov_tension, phiFlex)
  }, [effectiveB, h, d_eff, code, ec2Concrete, ec2Steel, aciConcrete, aciSteel, MEdCalc, As_prov_tension, hasCompression, As_prov_comp, d_prime, gammaC, gammaS, phiFlex])

  const shear = useMemo(() => {
    if (effectiveB <= 0 || d_eff <= 0 || !flexure) return null
    if (code === 'EC2') {
      return calcShearEC2(effectiveB, d_eff, ec2Concrete.fck, ec2Steel.fyk, VEd, flexure.As_prov, stirrupDia, stirrupLegs, stirrupSpacing, gammaC, gammaS)
    }
    return calcShearACI(effectiveB, d_eff, aciConcrete.fc, aciSteel.fy, VEd, stirrupDia, stirrupLegs, stirrupSpacing, phiShear)
  }, [effectiveB, d_eff, code, VEd, flexure, stirrupDia, stirrupLegs, stirrupSpacing, ec2Concrete, ec2Steel, aciConcrete, aciSteel, gammaC, gammaS, phiShear])

  const crack = useMemo(() => {
    if (!flexure || effectiveB <= 0 || d_eff <= 0) return null
    if (code === 'EC2') {
      const kt = tab === 'SLS_QP' ? 0.4 : 0.6
      return calcCrackEC2(effectiveB, h, d_eff, ec2Concrete.fctm, 200000, ec2Concrete.Ecm, serviceMoment, flexure.As_prov, cnom, bar1Dia, ec2Exposure.wmax, kt)
    }
    return calcCrackACI(d_eff, aciSteel.fy, cnom, bar1Dia, bar1Count, effectiveB, serviceMoment, flexure.As_prov)
  }, [effectiveB, h, d_eff, code, tab, serviceMoment, flexure, cnom, bar1Dia, bar1Count, ec2Concrete, ec2Exposure.wmax, aciSteel.fy])

  const deflection = useMemo(() => {
    if (!flexure || d_eff <= 0) return null
    if (code === 'EC2') {
      return calcDeflectionEC2(
        effectiveB, d_eff, ec2Concrete.fck, ec2Steel.fyk,
        flexure.As_prov, Math.max(flexure.As_req, flexure.As_min), As_prov_comp,
        span_mm, support, effectiveB, beff, sectionType !== 'rectangular',
      )
    }
    return calcDeflectionACI(h, span_mm, support)
  }, [effectiveB, d_eff, h, code, span_mm, support, flexure, ec2Concrete, ec2Steel, As_prov_comp, beff, sectionType])

  const barSchedule = useMemo(() => {
    if (!flexure) return []
    return getBarSchedule(Math.max(flexure.As_req, flexure.As_min), code, units)
  }, [flexure, code, units])

  // ── Summary rows ────────────────────────────────────────────────────────────

  const summaryRows = useMemo(() => {
    const rows: { check: string; required: string; provided: string; utilization: number; pass: boolean }[] = []
    if (flexure) {
      const req = Math.max(flexure.As_req, flexure.As_min)
      rows.push({ check: 'Flexure As', required: `${fmt(req, 0)} mm²`, provided: `${fmt(flexure.As_prov, 0)} mm²`, utilization: req / Math.max(flexure.As_prov, 1) * 100, pass: flexure.pass_flexure })
      rows.push({ check: 'As,min', required: `${fmt(flexure.As_min, 0)} mm²`, provided: `${fmt(flexure.As_prov, 0)} mm²`, utilization: flexure.As_min / Math.max(flexure.As_prov, 1) * 100, pass: flexure.pass_min })
      rows.push({ check: 'As,max', required: `≤ ${fmt(flexure.As_max, 0)} mm²`, provided: `${fmt(flexure.As_prov, 0)} mm²`, utilization: flexure.As_prov / Math.max(flexure.As_max, 1) * 100, pass: flexure.pass_max })
      if (code === 'EC2') {
        rows.push({ check: 'x/d ratio', required: '≤ 0.450', provided: fmt(flexure.xd_ratio, 3), utilization: flexure.xd_ratio / 0.45 * 100, pass: flexure.pass_xd })
      } else {
        rows.push({ check: 'Tension control', required: 'εt ≥ 0.005', provided: fmt(flexure.eps_t ?? 0, 5), utilization: 0.005 / Math.max(flexure.eps_t ?? 0.005, 0.001) * 100, pass: flexure.pass_xd })
      }
    }
    if (shear) {
      if (code === 'EC2') {
        rows.push({ check: 'VRd,c', required: `VEd = ${VEd} kN`, provided: `${fmt(shear.VRd_c, 1)} kN`, utilization: VEd / Math.max(shear.VRd_c, 1) * 100, pass: VEd <= shear.VRd_c })
        if (shear.shear_reinf_required) {
          rows.push({ check: 'Stirrup Asw/s', required: `${fmt(shear.Asw_s_req, 3)}`, provided: `${fmt(shear.Asw_s_prov, 3)} mm²/mm`, utilization: shear.Asw_s_req / Math.max(shear.Asw_s_prov, 0.001) * 100, pass: shear.pass_shear })
        }
        rows.push({ check: 'VRd,max', required: `VEd = ${VEd} kN`, provided: `${fmt(shear.VRd_max, 1)} kN`, utilization: VEd / Math.max(shear.VRd_max, 1) * 100, pass: shear.pass_max_shear })
      } else {
        rows.push({ check: 'φVc', required: `Vu = ${VEd} kN`, provided: `${fmt(shear.phi_Vc ?? 0, 1)} kN`, utilization: VEd / Math.max(shear.phi_Vc ?? 1, 1) * 100, pass: VEd <= (shear.phi_Vc ?? 0) })
        rows.push({ check: 'Shear capacity', required: `Vu = ${VEd} kN`, provided: `${fmt(shear.VRd_max, 1)} kN`, utilization: VEd / Math.max(shear.VRd_max, 1) * 100, pass: shear.pass_max_shear })
      }
    }
    if (crack) {
      if (code === 'EC2') {
        rows.push({ check: 'Crack width wk', required: `≤ ${crack.wmax} mm`, provided: `${fmt(crack.wk, 3)} mm`, utilization: crack.wk / Math.max(crack.wmax, 0.01) * 100, pass: crack.pass_crack })
      } else {
        rows.push({ check: 'Bar spacing', required: `≤ ${fmt(crack.s_max ?? 0, 0)} mm`, provided: `${fmt(crack.s_prov ?? 0, 0)} mm`, utilization: (crack.s_prov ?? 0) / Math.max(crack.s_max ?? 1, 1) * 100, pass: crack.pass_crack })
      }
    }
    if (deflection) {
      if (code === 'EC2') {
        rows.push({ check: 'Span/depth l/d', required: `≤ ${fmt(deflection.allowable_ratio, 1)}`, provided: fmt(deflection.actual_ratio, 1), utilization: deflection.actual_ratio / Math.max(deflection.allowable_ratio, 1) * 100, pass: deflection.pass_deflection })
      } else {
        rows.push({ check: 'Beam depth', required: `≥ ${fmt(deflection.h_min ?? 0, 0)} mm`, provided: `${h} mm`, utilization: (deflection.h_min ?? 0) / Math.max(h, 1) * 100, pass: deflection.pass_deflection })
      }
    }
    return rows
  }, [flexure, shear, crack, deflection, code, VEd, h])

  // ── PDF export ──────────────────────────────────────────────────────────────

  const handleExport = () => window.print()

  // ── Render ──────────────────────────────────────────────────────────────────

  const flexureUtil = flexure ? Math.max(flexure.As_req, flexure.As_min) / Math.max(flexure.As_prov, 1) * 100 : 0

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
            <button className={`tb-btn${code === 'EC2' ? ' on' : ''}`} onClick={() => setCode('EC2')}>EC2</button>
            <button className={`tb-btn${code === 'ACI' ? ' on' : ''}`} onClick={() => setCode('ACI')}>ACI 318</button>
          </div>
          <div className="tb-group">
            <button className={`tb-btn${units === 'SI' ? ' on' : ''}`} onClick={() => setUnits('SI')}>SI</button>
            <button className={`tb-btn${units === 'Imperial' ? ' on' : ''}`} onClick={() => setUnits('Imperial')}>Imperial</button>
          </div>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a' }}>
            <button className={`tab-btn${tab === 'ULS' ? ' on' : ''}`} onClick={() => setTab('ULS')}>ULS</button>
            <button className={`tab-btn${tab === 'SLS_FR' ? ' on' : ''}`} onClick={() => setTab('SLS_FR')}>SLS-fr</button>
            <button className={`tab-btn${tab === 'SLS_QP' ? ' on' : ''}`} onClick={() => setTab('SLS_QP')}>SLS-qp</button>
            <button className={`tab-btn${tab === 'SLS_DEFLECTION' ? ' on' : ''}`} onClick={() => setTab('SLS_DEFLECTION')}>Deflection</button>
          </div>
          <button className="pdf-btn" onClick={handleExport}>Export PDF</button>
        </div>

        {/* ── Three-column layout ── */}
        <div className="three-col">

          {/* ═══════════ LEFT COLUMN: INPUTS ═══════════ */}
          <div className="no-print">

            {/* Geometry */}
            <Card title="Geometry">
              <div style={{ marginBottom: '8px' }}>
                <SelectInput label="Section type" options={['Rectangular', 'T-beam', 'L-beam']} value={['rectangular', 'T-beam', 'L-beam'].indexOf(sectionType)} onChange={v => setSectionType((['rectangular', 'T-beam', 'L-beam'] as SectionType[])[v])} />
              </div>
              <div className="g2" style={{ marginBottom: '8px' }}>
                <NumInput label="b" value={b} onChange={setB} unit="mm" />
                <NumInput label="h" value={h} onChange={setH} unit="mm" />
              </div>
              {sectionType !== 'rectangular' && (
                <div className="g3" style={{ marginBottom: '8px' }}>
                  <NumInput label="beff" value={beff} onChange={setBeff} unit="mm" />
                  <NumInput label="bw" value={bw} onChange={setBw} unit="mm" />
                  <NumInput label="hf" value={hf} onChange={setHf} unit="mm" />
                </div>
              )}
              <div className="g2">
                <NumInput label="Span L" value={spanM} onChange={setSpanM} unit="m" />
                <SelectInput label="Support" options={['Simply supported', 'End span', 'Interior span', 'Cantilever']} value={['simply_supported', 'end_span', 'interior_span', 'cantilever'].indexOf(support)} onChange={v => setSupport((['simply_supported', 'end_span', 'interior_span', 'cantilever'] as SupportCondition[])[v])} />
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
                    <InfoChip>fcd={fmt(0.85 * ec2Concrete.fck / gammaC)}</InfoChip>
                    <InfoChip>fctm={ec2Concrete.fctm}</InfoChip>
                    <InfoChip>Ecm={ec2Concrete.Ecm}</InfoChip>
                    <InfoChip>fyk={ec2Steel.fyk}</InfoChip>
                    <InfoChip>fyd={fmt(ec2Steel.fyk / gammaS)}</InfoChip>
                  </div>
                  <div className="g2">
                    <NumInput label="γc" value={gammaC} onChange={setGammaC} />
                    <NumInput label="γs" value={gammaS} onChange={setGammaS} />
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
                    <InfoChip>β₁={fmt(aciConcrete.fc <= 28 ? 0.85 : Math.max(0.85 - 0.05 * (aciConcrete.fc - 28) / 7, 0.65), 3)}</InfoChip>
                    <InfoChip>fy={aciSteel.fy} MPa</InfoChip>
                    <InfoChip>Es=200000 MPa</InfoChip>
                  </div>
                  <div className="g2">
                    <NumInput label="φ flexure" value={phiFlex} onChange={setPhiFlex} />
                    <NumInput label="φ shear" value={phiShear} onChange={setPhiShear} />
                  </div>
                </>
              )}
            </Card>

            {/* Cover & Exposure */}
            <Card title="Cover & Exposure">
              {code === 'EC2' ? (
                <>
                  <div style={{ marginBottom: '6px' }}>
                    <SelectInput label="Exposure class" options={EC2_EXPOSURE.map(e => `${e.label} — ${e.description}`)} value={exposureIdx} onChange={setExposureIdx} />
                  </div>
                  <div className="g2" style={{ marginBottom: '6px' }}>
                    <SelectInput label="Structural class" options={STRUCTURAL_CLASSES} value={structClassIdx} onChange={setStructClassIdx} />
                    <ReadOnlyField label="cnom auto (mm)" value={`${cnom_auto}`} />
                  </div>
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

            {/* Stirrups */}
            <Card title="Stirrups">
              <div className="g3">
                <SelectInput label="Diameter" options={stirrupLabels} value={Math.min(stirrupDiaIdx, stirrupLabels.length - 1)} onChange={setStirrupDiaIdx} />
                <NumInput label="Legs" value={stirrupLegs} onChange={setStirrupLegs} />
                <NumInput label="Spacing s" value={stirrupSpacing} onChange={setStirrupSpacing} unit="mm" />
              </div>
            </Card>

            {/* Tension Reinforcement */}
            <Card title="Tension Reinforcement">
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px' }}>Layer 1</div>
              <div className="g2" style={{ marginBottom: '4px' }}>
                <SelectInput label="Diameter" options={barLabels} value={Math.min(bar1DiaIdx, barLabels.length - 1)} onChange={setBar1DiaIdx} />
                <NumInput label="Count" value={bar1Count} onChange={v => setBar1Count(Math.max(1, Math.min(12, v)))} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <InfoChip>As1 = {fmt(bar1Count * barArea(bar1Dia), 0)} mm²</InfoChip>
                <InfoChip>spacing = {fmt(bar1Spacing, 0)} mm</InfoChip>
              </div>

              <label className="chk">
                <input type="checkbox" checked={hasLayer2} onChange={e => { setHasLayer2(e.target.checked); if (!e.target.checked) setHasLayer3(false) }} />
                + Add Layer 2
              </label>
              {hasLayer2 && (
                <>
                  <div className="g2" style={{ marginBottom: '4px' }}>
                    <SelectInput label="Layer 2 dia" options={barLabels} value={Math.min(bar2DiaIdx, barLabels.length - 1)} onChange={setBar2DiaIdx} />
                    <NumInput label="Count" value={bar2Count} onChange={v => setBar2Count(Math.max(1, Math.min(12, v)))} />
                  </div>
                  <InfoChip>As2 = {fmt(bar2Count * barArea(bar2Dia), 0)} mm²</InfoChip>

                  <label className="chk">
                    <input type="checkbox" checked={hasLayer3} onChange={e => setHasLayer3(e.target.checked)} />
                    + Add Layer 3
                  </label>
                  {hasLayer3 && (
                    <div className="g2" style={{ marginBottom: '4px' }}>
                      <SelectInput label="Layer 3 dia" options={barLabels} value={Math.min(bar3DiaIdx, barLabels.length - 1)} onChange={setBar3DiaIdx} />
                      <NumInput label="Count" value={bar3Count} onChange={v => setBar3Count(Math.max(1, Math.min(12, v)))} />
                    </div>
                  )}
                </>
              )}

              {/* d display */}
              <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '8px 10px', marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effective depth d</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#cc0000', marginTop: '2px' }}>
                  {fmt(d_eff, 1)} mm
                </div>
                <div style={{ fontSize: '9px', color: '#444', marginTop: '2px' }}>= {h} − {cnom} − {stirrupDia} − {bar1Dia}/2{hasLayer2 ? ' (weighted avg)' : ''}</div>
              </div>
              <label className="chk">
                <input type="checkbox" checked={dOverride} onChange={e => setDOverride(e.target.checked)} />
                Override d manually
              </label>
              {dOverride && <NumInput label="d manual" value={dManual} onChange={setDManual} unit="mm" red />}
            </Card>

            {/* Compression Reinforcement */}
            <Card title="Compression Reinforcement" defaultOpen={false}>
              <label className="chk">
                <input type="checkbox" checked={hasCompression} onChange={e => setHasCompression(e.target.checked)} />
                Include top steel
              </label>
              {hasCompression && (
                <>
                  <div className="g2" style={{ marginBottom: '4px' }}>
                    <SelectInput label="Diameter" options={barLabels} value={Math.min(compDiaIdx, barLabels.length - 1)} onChange={setCompDiaIdx} />
                    <NumInput label="Count" value={compCount} onChange={v => setCompCount(Math.max(1, Math.min(8, v)))} />
                  </div>
                  <InfoChip>As&apos; = {fmt(As_prov_comp, 0)} mm²</InfoChip>
                  <InfoChip>d&apos; = {fmt(d_prime, 1)} mm</InfoChip>
                </>
              )}
            </Card>

            {/* Loading */}
            <Card title="Loading">
              {tab === 'ULS' && (
                <>
                  <label className="chk" style={{ marginBottom: '6px' }}>
                    <input type="checkbox" checked={useLoadBreakdown} onChange={e => setUseLoadBreakdown(e.target.checked)} />
                    Use load breakdown (Gk, Qk)
                  </label>
                  {useLoadBreakdown ? (
                    <>
                      <div className="g2" style={{ marginBottom: '4px' }}>
                        <NumInput label="Gk (permanent)" value={Gk} onChange={setGk} unit="kN·m" />
                        <NumInput label="Qk (variable)" value={Qk} onChange={setQk} unit="kN·m" />
                      </div>
                      <InfoChip>MEd = 1.35×{Gk} + 1.5×{Qk} = {fmt(1.35 * Gk + 1.5 * Qk, 1)} kN·m</InfoChip>
                    </>
                  ) : (
                    <div className="g3">
                      <NumInput label={code === 'EC2' ? 'MEd' : 'Mu'} value={MEd} onChange={setMEd} unit="kN·m" />
                      <NumInput label={code === 'EC2' ? 'VEd' : 'Vu'} value={VEd} onChange={setVEd} unit="kN" />
                      <NumInput label={code === 'EC2' ? 'NEd' : 'Nu'} value={NEd} onChange={setNEd} unit="kN" />
                    </div>
                  )}
                </>
              )}
              {(tab === 'SLS_FR' || tab === 'SLS_QP') && (
                <div className="g2">
                  <NumInput label="Mk (char.)" value={Mk} onChange={setMk} unit="kN·m" />
                  {tab === 'SLS_FR' && <NumInput label="Mfr (frequent)" value={Mfr} onChange={setMfr} unit="kN·m" />}
                  {tab === 'SLS_QP' && <NumInput label="Mqp (quasi-perm)" value={Mqp} onChange={setMqp} unit="kN·m" />}
                </div>
              )}
              {tab === 'SLS_DEFLECTION' && (
                <div style={{ fontSize: '12px', color: '#555', padding: '8px 0' }}>
                  {code === 'EC2' ? 'Span/depth ratio check per EC2 Table 7.4N.' : 'Minimum depth check per ACI Table 9.3.1.1.'}
                </div>
              )}
            </Card>
          </div>

          {/* ═══════════ MIDDLE COLUMN: DRAWING + RESULTS ═══════════ */}
          <div>
            {/* Section drawing */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <SectionDrawing
                b={b} h={h} d={d_eff} d_prime={d_prime} cnom={cnom}
                stirrupDia={stirrupDia}
                sectionType={sectionType} beff={beff} bw={bw} hf={hf}
                tensionBars={tensionLayers}
                compressionBars={hasCompression ? { dia: compDia, count: compCount } : null}
                code={code}
              />
            </div>

            {/* Result cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {flexure && (
                <ResultCard
                  title="Flexure"
                  mainLabel="As,req"
                  mainValue={fmt(Math.max(flexure.As_req, flexure.As_min), 0)}
                  secondLabel="As,prov"
                  secondValue={fmt(flexure.As_prov, 0)}
                  unit="mm²"
                  utilization={flexureUtil}
                  pass={flexure.pass_flexure}
                />
              )}
              {shear && (
                <ResultCard
                  title="Shear"
                  mainLabel={code === 'EC2' ? 'VEd' : 'Vu'}
                  mainValue={`${VEd}`}
                  secondLabel={code === 'EC2' ? 'VRd,c' : 'φVc'}
                  secondValue={fmt(code === 'EC2' ? shear.VRd_c : (shear.phi_Vc ?? 0), 1)}
                  unit="kN"
                  utilization={VEd / Math.max(code === 'EC2' ? shear.VRd_max : shear.VRd_max, 1) * 100}
                  pass={shear.pass_shear && shear.pass_max_shear}
                />
              )}
              {crack && (tab === 'SLS_FR' || tab === 'SLS_QP' || tab === 'ULS') && (
                <ResultCard
                  title="Crack Width"
                  mainLabel={code === 'EC2' ? 'wk' : 'spacing'}
                  mainValue={code === 'EC2' ? fmt(crack.wk, 3) : fmt(crack.s_prov ?? 0, 0)}
                  secondLabel={code === 'EC2' ? 'wmax' : 'smax'}
                  secondValue={code === 'EC2' ? `${crack.wmax}` : fmt(crack.s_max ?? 0, 0)}
                  unit={code === 'EC2' ? 'mm' : 'mm'}
                  utilization={code === 'EC2' ? crack.wk / Math.max(crack.wmax, 0.01) * 100 : (crack.s_prov ?? 0) / Math.max(crack.s_max ?? 1, 1) * 100}
                  pass={crack.pass_crack}
                />
              )}
              {deflection && (
                <ResultCard
                  title="Deflection"
                  mainLabel={code === 'EC2' ? 'l/d actual' : 'h'}
                  mainValue={code === 'EC2' ? fmt(deflection.actual_ratio, 1) : `${h}`}
                  secondLabel={code === 'EC2' ? 'l/d allow' : 'hmin'}
                  secondValue={code === 'EC2' ? fmt(deflection.allowable_ratio, 1) : fmt(deflection.h_min ?? 0, 0)}
                  unit={code === 'EC2' ? '' : 'mm'}
                  utilization={code === 'EC2' ? deflection.actual_ratio / Math.max(deflection.allowable_ratio, 1) * 100 : (deflection.h_min ?? 0) / Math.max(h, 1) * 100}
                  pass={deflection.pass_deflection}
                />
              )}
            </div>

            {/* Summary table */}
            {summaryRows.length > 0 && <SummaryTable rows={summaryRows} />}
          </div>

          {/* ═══════════ RIGHT COLUMN: STEP-BY-STEP ═══════════ */}
          <div className="right-col">

            {/* Flexure steps */}
            {flexure && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('flexure')}>
                  <span className="right-step-title">Flexure {code === 'EC2' ? '[EC2 §6.1]' : '[ACI §22.3]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.flexure ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.flexure && <div style={{ marginTop: '10px' }}><StepSection title="Flexural Design" steps={flexure.steps} /></div>}
              </div>
            )}

            {/* Shear steps */}
            {shear && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('shear')}>
                  <span className="right-step-title">Shear {code === 'EC2' ? '[EC2 §6.2]' : '[ACI §22.5]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.shear ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.shear && <div style={{ marginTop: '10px' }}><StepSection title="Shear Design" steps={shear.steps} /></div>}
              </div>
            )}

            {/* Crack steps */}
            {crack && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('crack')}>
                  <span className="right-step-title">Crack Width {code === 'EC2' ? '[EC2 §7.3]' : '[ACI §24.3]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.crack ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.crack && <div style={{ marginTop: '10px' }}><StepSection title="Crack Control" steps={crack.steps} /></div>}
              </div>
            )}

            {/* Deflection steps */}
            {deflection && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('deflection')}>
                  <span className="right-step-title">Deflection {code === 'EC2' ? '[EC2 §7.4]' : '[ACI §24.2]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.deflection ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.deflection && <div style={{ marginTop: '10px' }}><StepSection title="Deflection Check" steps={deflection.steps} /></div>}
              </div>
            )}

            {/* Bar schedule */}
            {barSchedule.length > 0 && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('schedule')}>
                  <span className="right-step-title">Bar Schedule</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.schedule ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.schedule && flexure && (
                  <div style={{ marginTop: '10px' }}>
                    <BarSchedulePanel items={barSchedule} As_req={Math.max(flexure.As_req, flexure.As_min)} />
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
      </ProGate>
    </main>
  )
}
