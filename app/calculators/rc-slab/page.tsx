'use client'

import { useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import ProGate from '../../components/ProGate'
import { SlabDrawing } from './drawing'
import { ResultCard, SummaryTable, StepSection, SlabBarSchedulePanel } from './results'
import {
  calcOneWayFlexureEC2, calcTwoWayFlexureEC2,
  calcOneWayFlexureACI, calcTwoWayFlexureACI,
  calcSlabShearEC2, calcSlabShearACI,
  calcSlabDeflectionEC2, calcSlabDeflectionACI,
  calcSlabCrackEC2, calcSlabCrackACI,
  calcSpacingCheck,
  getSlabBarSchedule, type SlabBarOption,
} from './calculations'
import {
  type DesignCode, type UnitSystem, type LimitState, type SlabType,
  type SupportCondition, type PanelType,
  EC2_CONCRETE, EC2_STEEL, EC2_EXPOSURE, STRUCTURAL_CLASSES,
  EC2_SLAB_BAR_DIAMETERS, EC2_SLAB_BAR_LABELS,
  ACI_CONCRETE_SI, ACI_CONCRETE_IMP, ACI_STEEL, ACI_EXPOSURE,
  ACI_SLAB_BAR_DIAMETERS_MM, ACI_SLAB_BAR_LABELS,
  PSI_FACTORS,
  barArea, fmt, areaPerMeter,
} from './types'

// ── Shared UI components ─────────────────────────────────────────────────────

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

function NumInput({ label, value, onChange, unit, red, disabled }: { label: string; value: number; onChange: (v: number) => void; unit?: string; red?: boolean; disabled?: boolean }) {
  return (
    <div>
      <label className="rc-label">{label}{unit ? ` (${unit})` : ''}</label>
      <input
        className="rc-input"
        type="number"
        value={value}
        onChange={e => onChange(+e.target.value)}
        style={red ? { color: '#cc0000', fontWeight: 700 } : disabled ? { opacity: 0.5 } : undefined}
        disabled={disabled}
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

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RcSlabPage() {
  const [code, setCode] = useState<DesignCode>('EC2')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const [slabType, setSlabType] = useState<SlabType>('one-way')
  const [tab, setTab] = useState<LimitState>('ULS')

  // Geometry
  const [lx, setLx] = useState(5000)
  const [ly, setLy] = useState(6000)
  const [h, setH] = useState(200)
  const [b, setB] = useState(1000)
  const [support, setSupport] = useState<SupportCondition>('simply_supported')
  const [panelType, setPanelType] = useState<PanelType>('interior')

  // EC2 materials
  const [concreteIdx, setConcreteIdx] = useState(2)
  const [steelIdx, setSteelIdx] = useState(1)
  const [exposureIdx, setExposureIdx] = useState(0)
  const [structClassIdx, setStructClassIdx] = useState(3)
  const [gammaC, setGammaC] = useState(1.5)
  const [gammaS, setGammaS] = useState(1.15)
  const [cnomOverride, setCnomOverride] = useState(false)
  const [cnomManual, setCnomManual] = useState(25)

  // ACI materials
  const [aciConcreteIdx, setAciConcreteIdx] = useState(1)
  const [aciSteelIdx, setAciSteelIdx] = useState(1)
  const [aciExposureIdx, setAciExposureIdx] = useState(0)
  const [phiFlex, setPhiFlex] = useState(0.9)
  const [phiShear, setPhiShear] = useState(0.75)
  const [aciCoverOverride, setAciCoverOverride] = useState(false)
  const [aciCoverManual, setAciCoverManual] = useState(20)

  // Loading
  const [selfWeight, setSelfWeight] = useState(5.0)
  const [selfWeightAuto, setSelfWeightAuto] = useState(true)
  const [addDead, setAddDead] = useState(1.5)
  const [liveLoad, setLiveLoad] = useState(3.0)
  const [psiCategoryIdx, setPsiCategoryIdx] = useState(0)
  const [psi1, setPsi1] = useState(0.5)
  const [psi2, setPsi2] = useState(0.3)

  // Reinforcement
  const [barDiaXIdx, setBarDiaXIdx] = useState(1)
  const [spacingX, setSpacingX] = useState(200)
  const [barDiaYIdx, setBarDiaYIdx] = useState(1)
  const [spacingY, setSpacingY] = useState(250)
  const [autoDesign, setAutoDesign] = useState(false)

  // Steps collapse
  const [stepsOpen, setStepsOpen] = useState<Record<string, boolean>>({
    flexure: true, shear: true, deflection: true, crack: true, spacing: true, schedule: true,
  })
  const toggleStep = (key: string) => setStepsOpen(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Derived values ────────────────────────────────────────────────────────

  const ec2Concrete = EC2_CONCRETE[concreteIdx]
  const ec2Steel = EC2_STEEL[steelIdx]
  const ec2Exposure = EC2_EXPOSURE[exposureIdx]
  const aciConcreteList = units === 'SI' ? ACI_CONCRETE_SI : ACI_CONCRETE_IMP
  const aciConcrete = aciConcreteList[Math.min(aciConcreteIdx, aciConcreteList.length - 1)]
  const aciSteel = ACI_STEEL[aciSteelIdx]
  const aciExposure = ACI_EXPOSURE[aciExposureIdx]

  const barDiameters = code === 'EC2' ? EC2_SLAB_BAR_DIAMETERS : ACI_SLAB_BAR_DIAMETERS_MM
  const barLabels = code === 'EC2' ? EC2_SLAB_BAR_LABELS : ACI_SLAB_BAR_LABELS

  const cnom_auto = code === 'EC2' ? ec2Exposure.cmin_dur + 10 : aciExposure.cover
  const cnom = code === 'EC2'
    ? (cnomOverride ? cnomManual : cnom_auto)
    : (aciCoverOverride ? aciCoverManual : cnom_auto)

  const barDiaX = barDiameters[Math.min(barDiaXIdx, barDiameters.length - 1)]
  const barDiaY = barDiameters[Math.min(barDiaYIdx, barDiameters.length - 1)]

  const dx = h - cnom - barDiaX / 2
  const dy = h - cnom - barDiaX - barDiaY / 2

  const sw = selfWeightAuto ? 25 * h / 1000 : selfWeight
  const gk = sw + addDead
  const qk = liveLoad

  const ned = code === 'EC2'
    ? 1.35 * gk + 1.5 * qk
    : 1.2 * gk + 1.6 * qk

  const M_sls_fr = gk + psi1 * qk
  const M_sls_qp = gk + psi2 * qk

  const lx_m = lx / 1000
  const ly_m = ly / 1000
  const ly_lx = ly_m / lx_m

  const barLabelX = code === 'EC2'
    ? `${EC2_SLAB_BAR_LABELS[Math.min(barDiaXIdx, EC2_SLAB_BAR_LABELS.length - 1)]}@${spacingX}`
    : `${ACI_SLAB_BAR_LABELS[Math.min(barDiaXIdx, ACI_SLAB_BAR_LABELS.length - 1)]}@${spacingX}mm`
  const barLabelY = code === 'EC2'
    ? `${EC2_SLAB_BAR_LABELS[Math.min(barDiaYIdx, EC2_SLAB_BAR_LABELS.length - 1)]}@${spacingY}`
    : `${ACI_SLAB_BAR_LABELS[Math.min(barDiaYIdx, ACI_SLAB_BAR_LABELS.length - 1)]}@${spacingY}mm`

  const As_prov_x = areaPerMeter(barDiaX, spacingX)
  const As_prov_y = areaPerMeter(barDiaY, spacingY)

  const fck = code === 'EC2' ? ec2Concrete.fck : aciConcrete.fc
  const fyk = code === 'EC2' ? ec2Steel.fyk : aciSteel.fy

  // ── Calculations ──────────────────────────────────────────────────────────

  const flexure = useMemo(() => {
    if (lx <= 0 || h <= 0 || dx <= 0) return null
    if (slabType === 'one-way') {
      if (code === 'EC2') {
        return calcOneWayFlexureEC2(lx_m, h, dx, dy, ec2Concrete.fck, ec2Concrete.fctm, ec2Steel.fyk, ned, b, support, barDiaX, spacingX, barDiaY, spacingY, gammaC, gammaS)
      }
      return calcOneWayFlexureACI(lx_m, h, dx, dy, aciConcrete.fc, aciSteel.fy, ned, b, support, barDiaX, spacingX, barDiaY, spacingY, phiFlex)
    }
    if (ly <= 0 || dy <= 0) return null
    if (code === 'EC2') {
      return calcTwoWayFlexureEC2(lx_m, ly_m, h, dx, dy, ec2Concrete.fck, ec2Concrete.fctm, ec2Steel.fyk, ned, b, panelType, barDiaX, spacingX, barDiaY, spacingY, gammaC, gammaS)
    }
    return calcTwoWayFlexureACI(lx_m, ly_m, h, dx, dy, aciConcrete.fc, aciSteel.fy, ned, b, panelType, barDiaX, spacingX, barDiaY, spacingY, phiFlex)
  }, [slabType, code, lx_m, ly_m, h, dx, dy, ned, b, support, panelType, barDiaX, spacingX, barDiaY, spacingY, ec2Concrete, ec2Steel, aciConcrete, aciSteel, gammaC, gammaS, phiFlex])

  const shear = useMemo(() => {
    if (!flexure || dx <= 0) return null
    if (code === 'EC2') {
      return calcSlabShearEC2(dx, ec2Concrete.fck, ned, lx_m, b, As_prov_x, support, gammaC)
    }
    return calcSlabShearACI(dx, aciConcrete.fc, ned, lx_m, b, support, phiShear)
  }, [flexure, code, dx, ned, lx_m, b, As_prov_x, support, ec2Concrete, aciConcrete, gammaC, phiShear])

  const deflection = useMemo(() => {
    if (!flexure || dx <= 0) return null
    if (code === 'EC2') {
      return calcSlabDeflectionEC2(dx, ec2Concrete.fck, ec2Steel.fyk, As_prov_x, flexure.As_req_x, lx, support, slabType)
    }
    return calcSlabDeflectionACI(h, lx, support)
  }, [flexure, code, dx, h, lx, support, slabType, As_prov_x, ec2Concrete, ec2Steel])

  const crack = useMemo(() => {
    if (!flexure || dx <= 0) return null
    const M_svc = tab === 'SLS_QP' ? M_sls_qp * lx_m * lx_m / 8 : M_sls_fr * lx_m * lx_m / 8
    if (code === 'EC2') {
      const kt = tab === 'SLS_QP' ? 0.4 : 0.6
      return calcSlabCrackEC2(h, dx, ec2Concrete.fctm, ec2Concrete.Ecm, M_svc, As_prov_x, cnom, barDiaX, ec2Exposure.wmax, kt, b)
    }
    return calcSlabCrackACI(dx, aciSteel.fy, cnom, spacingX, M_svc, As_prov_x, b)
  }, [flexure, code, dx, h, tab, M_sls_fr, M_sls_qp, lx_m, As_prov_x, cnom, barDiaX, spacingX, ec2Concrete, ec2Exposure, aciSteel, b])

  const spacing = useMemo(() => {
    return calcSpacingCheck(h, spacingX, spacingY, code, slabType)
  }, [h, spacingX, spacingY, code, slabType])

  const barScheduleX = useMemo(() => {
    if (!flexure) return []
    return getSlabBarSchedule(flexure.As_req_x, code)
  }, [flexure, code])

  const barScheduleY = useMemo(() => {
    if (!flexure || (slabType === 'one-way' && flexure.As_req_y <= 0)) return []
    return getSlabBarSchedule(flexure.As_req_y, code)
  }, [flexure, code, slabType])

  // ── Summary rows ──────────────────────────────────────────────────────────

  const summaryRows = useMemo(() => {
    const rows: { check: string; direction?: string; required: string; provided: string; utilization: number; pass: boolean }[] = []
    if (flexure) {
      rows.push({
        check: 'Flexure As', direction: 'x',
        required: `${fmt(flexure.As_req_x, 0)} mm²/m`, provided: `${fmt(flexure.As_prov_x, 0)} mm²/m`,
        utilization: flexure.As_req_x / Math.max(flexure.As_prov_x, 1) * 100,
        pass: flexure.pass_flexure_x,
      })
      if (slabType === 'two-way') {
        rows.push({
          check: 'Flexure As', direction: 'y',
          required: `${fmt(flexure.As_req_y, 0)} mm²/m`, provided: `${fmt(flexure.As_prov_y, 0)} mm²/m`,
          utilization: flexure.As_req_y / Math.max(flexure.As_prov_y, 1) * 100,
          pass: flexure.pass_flexure_y,
        })
      }
      rows.push({
        check: 'As,min', direction: 'x',
        required: `${fmt(flexure.As_min_x, 0)} mm²/m`, provided: `${fmt(flexure.As_prov_x, 0)} mm²/m`,
        utilization: flexure.As_min_x / Math.max(flexure.As_prov_x, 1) * 100,
        pass: flexure.pass_min_x,
      })
      if (slabType === 'one-way') {
        rows.push({
          check: 'Secondary As', direction: 'y',
          required: `${fmt(flexure.As_req_y, 0)} mm²/m`, provided: `${fmt(flexure.As_prov_y, 0)} mm²/m`,
          utilization: flexure.As_req_y / Math.max(flexure.As_prov_y, 1) * 100,
          pass: flexure.pass_flexure_y,
        })
      }
    }
    if (spacing) {
      rows.push({
        check: 'Bar spacing', direction: 'x',
        required: `≤ ${fmt(spacing.s_max_main, 0)} mm`, provided: `${spacingX} mm`,
        utilization: spacingX / Math.max(spacing.s_max_main, 1) * 100,
        pass: spacing.pass_x,
      })
      rows.push({
        check: 'Bar spacing', direction: 'y',
        required: `≤ ${fmt(slabType === 'two-way' ? spacing.s_max_main : spacing.s_max_secondary, 0)} mm`, provided: `${spacingY} mm`,
        utilization: spacingY / Math.max(slabType === 'two-way' ? spacing.s_max_main : spacing.s_max_secondary, 1) * 100,
        pass: spacing.pass_y,
      })
    }
    if (shear) {
      rows.push({
        check: code === 'EC2' ? 'Shear VRd,c' : 'Shear φVc', direction: '—',
        required: `VEd = ${fmt(shear.VEd, 1)} kN/m`, provided: `${fmt(shear.VRd_c, 1)} kN/m`,
        utilization: shear.VEd / Math.max(shear.VRd_c, 1) * 100,
        pass: shear.pass_shear,
      })
    }
    if (deflection) {
      if (code === 'EC2') {
        rows.push({
          check: 'Deflection l/d', direction: 'x',
          required: `≤ ${fmt(deflection.allowable_ratio, 1)}`, provided: fmt(deflection.actual_ratio, 1),
          utilization: deflection.actual_ratio / Math.max(deflection.allowable_ratio, 1) * 100,
          pass: deflection.pass_deflection,
        })
      } else {
        rows.push({
          check: 'Min. thickness', direction: '—',
          required: `≥ ${fmt(deflection.h_min ?? 0, 0)} mm`, provided: `${h} mm`,
          utilization: (deflection.h_min ?? 0) / Math.max(h, 1) * 100,
          pass: deflection.pass_deflection,
        })
      }
    }
    if (crack) {
      if (code === 'EC2') {
        rows.push({
          check: 'Crack width wk', direction: '—',
          required: `≤ ${crack.wmax} mm`, provided: `${fmt(crack.wk, 3)} mm`,
          utilization: crack.wk / Math.max(crack.wmax, 0.01) * 100,
          pass: crack.pass_crack,
        })
      } else {
        rows.push({
          check: 'Crack spacing', direction: '—',
          required: `≤ ${fmt(crack.s_max ?? 0, 0)} mm`, provided: `${fmt(crack.s_prov ?? 0, 0)} mm`,
          utilization: (crack.s_prov ?? 0) / Math.max(crack.s_max ?? 1, 1) * 100,
          pass: crack.pass_crack,
        })
      }
    }
    return rows
  }, [flexure, shear, deflection, crack, spacing, code, slabType, spacingX, spacingY, h])

  const handleExport = () => window.print()

  const psiCat = PSI_FACTORS[psiCategoryIdx]

  // ── Render ────────────────────────────────────────────────────────────────

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
            <button className={`tb-btn${slabType === 'one-way' ? ' on' : ''}`} onClick={() => setSlabType('one-way')}>One-Way</button>
            <button className={`tb-btn${slabType === 'two-way' ? ' on' : ''}`} onClick={() => setSlabType('two-way')}>Two-Way</button>
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
              <div className="g2" style={{ marginBottom: '8px' }}>
                <NumInput label={slabType === 'one-way' ? 'Clear span lx' : 'Short span lx'} value={lx} onChange={setLx} unit="mm" />
                {slabType === 'two-way' && (
                  <NumInput label="Long span ly" value={ly} onChange={setLy} unit="mm" />
                )}
              </div>
              <div className="g2" style={{ marginBottom: '8px' }}>
                <NumInput label="Thickness h" value={h} onChange={setH} unit="mm" />
                <NumInput label="Design strip width b" value={b} onChange={setB} unit="mm" />
              </div>

              {slabType === 'two-way' && (
                <>
                  <ReadOnlyField label="Aspect ratio ly/lx" value={fmt(ly_lx, 2)} />
                  <div style={{ marginTop: '8px' }}>
                    <SelectInput label="Panel type" options={['Interior panel', 'Edge panel', 'Corner panel', 'Cantilever']} value={['interior', 'edge', 'corner', 'cantilever'].indexOf(panelType)} onChange={v => setPanelType((['interior', 'edge', 'corner', 'cantilever'] as PanelType[])[v])} />
                  </div>
                </>
              )}

              {slabType === 'one-way' && (
                <div style={{ marginTop: '8px' }}>
                  <SelectInput label="Support conditions" options={['Simply supported', 'One end continuous', 'Both ends continuous', 'Cantilever']} value={['simply_supported', 'one_end_continuous', 'both_ends_continuous', 'cantilever'].indexOf(support)} onChange={v => setSupport((['simply_supported', 'one_end_continuous', 'both_ends_continuous', 'cantilever'] as SupportCondition[])[v])} />
                </div>
              )}
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

            {/* Cover */}
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

              <div style={{ marginTop: '6px', fontSize: '10px', color: '#555' }}>
                x-bars placed first (bottom), y-bars on top
              </div>
            </Card>

            {/* Loading */}
            <Card title="Loading">
              <div className="g2" style={{ marginBottom: '6px' }}>
                <div>
                  <label className="rc-label">Self-weight (kN/m²)</label>
                  <input
                    className="rc-input"
                    type="number"
                    value={selfWeightAuto ? fmt(sw, 2) : selfWeight}
                    onChange={e => { setSelfWeightAuto(false); setSelfWeight(+e.target.value) }}
                    style={selfWeightAuto ? { color: '#888' } : undefined}
                  />
                </div>
                <NumInput label="Added dead gk" value={addDead} onChange={setAddDead} unit="kN/m²" />
              </div>
              <label className="chk" style={{ marginBottom: '6px' }}>
                <input type="checkbox" checked={selfWeightAuto} onChange={e => setSelfWeightAuto(e.target.checked)} />
                Auto (25 × h)
              </label>
              <NumInput label="Live load qk" value={liveLoad} onChange={setLiveLoad} unit="kN/m²" />

              <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '8px 10px', marginTop: '8px' }}>
                <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Load Summary</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                  <InfoChip>gk = {fmt(gk, 2)} kN/m²</InfoChip>
                  <InfoChip>qk = {fmt(qk, 2)} kN/m²</InfoChip>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#cc0000', marginTop: '4px' }}>
                  {code === 'EC2' ? 'ned' : 'wu'} = {fmt(ned, 2)} kN/m²
                </div>
                <div style={{ fontSize: '9px', color: '#444', marginTop: '2px' }}>
                  {code === 'EC2' ? `1.35 × ${fmt(gk, 2)} + 1.5 × ${fmt(qk, 2)}` : `1.2 × ${fmt(gk, 2)} + 1.6 × ${fmt(qk, 2)}`}
                </div>
              </div>

              {code === 'EC2' && (
                <div style={{ marginTop: '8px' }}>
                  <SelectInput label="Load category (ψ factors)" options={PSI_FACTORS.map(p => p.category)} value={psiCategoryIdx} onChange={v => { setPsiCategoryIdx(v); setPsi1(PSI_FACTORS[v].psi1); setPsi2(PSI_FACTORS[v].psi2) }} />
                  <div className="g2" style={{ marginTop: '6px' }}>
                    <NumInput label="ψ₁ (frequent)" value={psi1} onChange={setPsi1} />
                    <NumInput label="ψ₂ (quasi-perm)" value={psi2} onChange={setPsi2} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                    <InfoChip>SLS-fr = {fmt(M_sls_fr, 2)} kN/m²</InfoChip>
                    <InfoChip>SLS-qp = {fmt(M_sls_qp, 2)} kN/m²</InfoChip>
                  </div>
                </div>
              )}
            </Card>

            {/* Reinforcement */}
            <Card title="Reinforcement">
              <div style={{ fontSize: '10px', color: '#cc0000', fontWeight: 600, marginBottom: '6px' }}>X-direction (main/bottom)</div>
              <div className="g2" style={{ marginBottom: '4px' }}>
                <SelectInput label="Bar diameter" options={barLabels} value={Math.min(barDiaXIdx, barLabels.length - 1)} onChange={setBarDiaXIdx} />
                <NumInput label="Spacing" value={spacingX} onChange={setSpacingX} unit="mm" />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <InfoChip>As,x = {fmt(As_prov_x, 0)} mm²/m</InfoChip>
                <InfoChip>dx = {fmt(dx, 1)} mm</InfoChip>
              </div>

              <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, marginBottom: '6px' }}>Y-direction {slabType === 'one-way' ? '(secondary/transverse)' : '(long span)'}</div>
              <div className="g2" style={{ marginBottom: '4px' }}>
                <SelectInput label="Bar diameter" options={barLabels} value={Math.min(barDiaYIdx, barLabels.length - 1)} onChange={setBarDiaYIdx} />
                <NumInput label="Spacing" value={spacingY} onChange={setSpacingY} unit="mm" />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <InfoChip>As,y = {fmt(As_prov_y, 0)} mm²/m</InfoChip>
                <InfoChip>dy = {fmt(dy, 1)} mm</InfoChip>
              </div>

              <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effective depths</div>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#cc0000', marginTop: '2px' }}>
                  dx = {fmt(dx, 1)} mm
                </div>
                <div style={{ fontSize: '9px', color: '#444', marginTop: '1px' }}>= {h} − {cnom} − {barDiaX}/2</div>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#888', marginTop: '4px' }}>
                  dy = {fmt(dy, 1)} mm
                </div>
                <div style={{ fontSize: '9px', color: '#444', marginTop: '1px' }}>= {h} − {cnom} − {barDiaX} − {barDiaY}/2</div>
              </div>
            </Card>

          </div>

          {/* ═══════════ MIDDLE COLUMN: DRAWING + RESULTS ═══════════ */}
          <div>
            {/* Drawing */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <SlabDrawing
                slabType={slabType}
                lx={lx} ly={ly} h={h} dx={dx} dy={dy} cnom={cnom}
                barDiaX={barDiaX} spacingX={spacingX}
                barDiaY={barDiaY} spacingY={spacingY}
                support={support} panelType={panelType}
                code={code}
                barLabelX={barLabelX} barLabelY={barLabelY}
              />
            </div>

            {/* Result cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {flexure && (
                <ResultCard
                  title="Flexure (x)"
                  mainLabel="As,req"
                  mainValue={fmt(flexure.As_req_x, 0)}
                  secondLabel="As,prov"
                  secondValue={fmt(flexure.As_prov_x, 0)}
                  unit="mm²/m"
                  utilization={flexure.As_req_x / Math.max(flexure.As_prov_x, 1) * 100}
                  pass={flexure.pass_flexure_x}
                />
              )}
              {flexure && slabType === 'two-way' && (
                <ResultCard
                  title="Flexure (y)"
                  mainLabel="As,req"
                  mainValue={fmt(flexure.As_req_y, 0)}
                  secondLabel="As,prov"
                  secondValue={fmt(flexure.As_prov_y, 0)}
                  unit="mm²/m"
                  utilization={flexure.As_req_y / Math.max(flexure.As_prov_y, 1) * 100}
                  pass={flexure.pass_flexure_y}
                />
              )}
              {shear && (
                <ResultCard
                  title="Shear"
                  mainLabel={code === 'EC2' ? 'VEd' : 'Vu'}
                  mainValue={fmt(shear.VEd, 1)}
                  secondLabel={code === 'EC2' ? 'VRd,c' : 'φVc'}
                  secondValue={fmt(shear.VRd_c, 1)}
                  unit="kN/m"
                  utilization={shear.VEd / Math.max(shear.VRd_c, 1) * 100}
                  pass={shear.pass_shear}
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
              {crack && (tab === 'SLS_FR' || tab === 'SLS_QP' || tab === 'ULS') && (
                <ResultCard
                  title="Crack Width"
                  mainLabel={code === 'EC2' ? 'wk' : 'spacing'}
                  mainValue={code === 'EC2' ? fmt(crack.wk, 3) : fmt(crack.s_prov ?? 0, 0)}
                  secondLabel={code === 'EC2' ? 'wmax' : 'smax'}
                  secondValue={code === 'EC2' ? `${crack.wmax}` : fmt(crack.s_max ?? 0, 0)}
                  unit="mm"
                  utilization={code === 'EC2' ? crack.wk / Math.max(crack.wmax, 0.01) * 100 : (crack.s_prov ?? 0) / Math.max(crack.s_max ?? 1, 1) * 100}
                  pass={crack.pass_crack}
                />
              )}
            </div>

            {/* Summary table */}
            {summaryRows.length > 0 && <SummaryTable rows={summaryRows} />}

            {/* Practical bar schedule */}
            {flexure && (barScheduleX.length > 0 || barScheduleY.length > 0) && (
              <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Practical Bar Schedule
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '8px 14px' }}>
                    <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', marginBottom: '2px' }}>X-direction</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: flexure.pass_flexure_x ? '#22c55e' : '#ef4444' }}>
                      {barLabelX}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '1px' }}>As = {fmt(As_prov_x, 0)} mm²/m {flexure.pass_flexure_x ? '✓' : '✗'}</div>
                  </div>
                  <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '8px 14px' }}>
                    <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', marginBottom: '2px' }}>Y-direction</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: flexure.pass_flexure_y ? '#22c55e' : '#ef4444' }}>
                      {barLabelY}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '1px' }}>As = {fmt(As_prov_y, 0)} mm²/m {flexure.pass_flexure_y ? '✓' : '✗'}</div>
                  </div>
                </div>
              </div>
            )}
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
                {stepsOpen.shear && <div style={{ marginTop: '10px' }}><StepSection title="Shear Check" steps={shear.steps} /></div>}
              </div>
            )}

            {/* Spacing steps */}
            {spacing && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('spacing')}>
                  <span className="right-step-title">Bar Spacing {code === 'EC2' ? '[EC2 §9.3]' : '[ACI §7.7]'}</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.spacing ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.spacing && <div style={{ marginTop: '10px' }}><StepSection title="Spacing Check" steps={spacing.steps} /></div>}
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

            {/* Bar schedule suggestions */}
            {(barScheduleX.length > 0 || barScheduleY.length > 0) && flexure && (
              <div className="right-step-section">
                <div className="right-step-header" onClick={() => toggleStep('schedule')}>
                  <span className="right-step-title">Suggested Bar Arrangements</span>
                  <span className="right-step-arrow" style={{ transform: stepsOpen.schedule ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
                {stepsOpen.schedule && (
                  <div style={{ marginTop: '10px' }}>
                    {barScheduleX.length > 0 && (
                      <SlabBarSchedulePanel items={barScheduleX} As_req={flexure.As_req_x} direction="X-direction (main)" />
                    )}
                    {barScheduleY.length > 0 && (
                      <SlabBarSchedulePanel items={barScheduleY} As_req={flexure.As_req_y} direction={slabType === 'two-way' ? 'Y-direction (long span)' : 'Y-direction (secondary)'} />
                    )}
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
