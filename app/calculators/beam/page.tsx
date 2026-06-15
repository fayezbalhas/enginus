'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { BeamType, BeamSolution, ExtremePoint, PointLoad, UDLLoad, TrapezoidalLoad, MomentLoad, SectionProps } from './calculations'
import { solveBeam } from './calculations'
import {
  BeamDiagram,
  DiagramChart,
  DEFAULT_BEAM_LAYERS,
  DEFAULT_CHART_LAYERS,
  type BeamLayerOptions,
  type ChartLayerOptions,
} from './diagrams'
import {
  STEEL_SECTIONS,
  US_STEEL_SECTIONS,
  CONCRETE_RECT_SECTIONS,
  CONCRETE_GRADES_MPA,
  CM4_TO_IN4,
  CM2_TO_IN2,
  MPA_TO_KSI,
  sectionToUnits,
  selfWeightPerLength,
  concreteEGPa,
  computeTBeamSection,
  type SectionDef,
} from './sections'
import {
  DEFAULT_MANUAL_GAMMA,
  manualFactors,
  combinationsForCode,
  applyFactorsToPointLoads,
  applyFactorsToUDLs,
  applyFactorsToTrapezoidal,
  applyFactorsToMoments,
  type CombinationMode,
} from './loadCombinations'

type UnitSystem = 'SI' | 'Imperial'
type DesignCode = 'EC' | 'ACI'
type SectionCategory = 'manual' | 'steel-si' | 'steel-us' | 'concrete-rect' | 'concrete-tbeam'

type ChartVisibility = ChartLayerOptions & { sfd: boolean; bmd: boolean; deflection: boolean }

const DEFAULT_CHART_VISIBILITY: ChartVisibility = {
  ...DEFAULT_CHART_LAYERS,
  sfd: true,
  bmd: true,
  deflection: true,
}

const UNIT_LABELS: Record<UnitSystem, {
  length: string
  force: string
  udl: string
  moment: string
  E: string
  I: string
  deflection: string
  dim: string
  area: string
  stress: string
}> = {
  SI: { length: 'm', force: 'kN', udl: 'kN/m', moment: 'kN·m', E: 'GPa', I: 'cm⁴', deflection: 'mm', dim: 'mm', area: 'cm²', stress: 'MPa' },
  Imperial: { length: 'ft', force: 'kip', udl: 'kip/ft', moment: 'kip·ft', E: 'ksi', I: 'in⁴', deflection: 'in', dim: 'in', area: 'in²', stress: 'ksi' },
}

// Multiply an SI value by these to get the Imperial equivalent.
const TO_IMPERIAL = {
  length: 3.28084, // m -> ft
  force: 0.224809, // kN -> kip
  udl: 0.0685218, // kN/m -> kip/ft
  moment: 0.737562, // kN*m -> kip*ft
  E: 145.038, // GPa -> ksi
  I: 0.0240251, // cm^4 -> in^4
  dim: 1 / 25.4, // mm -> in
} as const

type ConvKey = keyof typeof TO_IMPERIAL

// Sub-unit display options layered on top of the SI/Imperial base units
// above. The math always runs in the base units; these only affect how
// values are formatted.
type UnitCategory = 'length' | 'force' | 'moment' | 'deflection'
type SubUnits = Record<UnitCategory, string>

const SI_SUBUNIT_OPTIONS: Record<UnitCategory, string[]> = {
  length: ['m', 'cm', 'mm'],
  force: ['kN', 'N', 'MN'],
  moment: ['kN·m', 'N·m', 'MN·m'],
  deflection: ['mm', 'cm', 'm'],
}

const IMPERIAL_SUBUNIT_OPTIONS: Record<UnitCategory, string[]> = {
  length: ['ft', 'in'],
  force: ['kip', 'lb'],
  moment: ['kip·ft', 'kip·in'],
  deflection: ['in', 'ft'],
}

const DEFAULT_SI_SUBUNITS: SubUnits = { length: 'm', force: 'kN', moment: 'kN·m', deflection: 'mm' }
const DEFAULT_IMPERIAL_SUBUNITS: SubUnits = { length: 'ft', force: 'kip', moment: 'kip·ft', deflection: 'in' }

// Multiply a value in the base SI/Imperial unit (UNIT_LABELS) by these to
// get the value in the selected display sub-unit.
const SI_SUBUNIT_FACTORS: Record<UnitCategory, Record<string, number>> = {
  length: { m: 1, cm: 100, mm: 1000 },
  force: { kN: 1, N: 1000, MN: 0.001 },
  moment: { 'kN·m': 1, 'N·m': 1000, 'MN·m': 0.001 },
  deflection: { mm: 1, cm: 0.1, m: 0.001 },
}

const IMPERIAL_SUBUNIT_FACTORS: Record<UnitCategory, Record<string, number>> = {
  length: { ft: 1, in: 12 },
  force: { kip: 1, lb: 1000 },
  moment: { 'kip·ft': 1, 'kip·in': 12 },
  deflection: { in: 1, ft: 1 / 12 },
}

const UNIT_CATEGORY_LABELS: Record<UnitCategory, string> = {
  length: 'Length',
  force: 'Force',
  moment: 'Moment',
  deflection: 'Deflection',
}

// Extra decimal places needed when a sub-unit shrinks the displayed number
// (e.g. kN -> MN), so small values don't round away to 0.00.
function extraDecimals(factor: number): number {
  return factor < 1 ? Math.ceil(-Math.log10(factor)) : 0
}

const BEAM_TYPES: { value: BeamType; label: string; desc: string }[] = [
  { value: 'simply-supported', label: 'Simply Supported', desc: 'Pin + roller supports' },
  { value: 'cantilever', label: 'Cantilever', desc: 'Fixed at A, free at B' },
  { value: 'fixed-fixed', label: 'Fixed-Fixed', desc: 'Fixed supports at A and B' },
]

function round(value: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

function convert(value: number, key: ConvKey, toImperial: boolean): number {
  const factor = TO_IMPERIAL[key]
  return round(toImperial ? value * factor : value / factor, 4)
}

function fmt(value: number, decimals = 2): string {
  const v = Math.abs(value) < 10 ** -(decimals + 2) ? 0 : value
  return v.toFixed(decimals)
}

let loadIdCounter = 100
function nextId(prefix: string): string {
  loadIdCounter += 1
  return `${prefix}-${loadIdCounter}`
}

// Converts a section's canonical (SI, mm/cm^4/cm^2) geometry into the units
// consistent with the EI used internally by `solve()`: meters for SI,
// inches for Imperial. The resulting stress comes out in kN/m^2 (SI,
// converted to MPa by `solve`) or directly in ksi (Imperial).
function sectionToProps(section: SectionDef, units: UnitSystem): SectionProps {
  if (units === 'SI') {
    return { h: section.h_mm / 1000, I: section.I_cm4 * 1e-8, A: section.A_cm2 * 1e-4, tw: section.tw_mm / 1000, shape: section.shape }
  }
  return { h: section.h_mm / 25.4, I: section.I_cm4 * CM4_TO_IN4, A: section.A_cm2 * CM2_TO_IN2, tw: section.tw_mm / 25.4, shape: section.shape }
}

// Converts the model (lengths in m / ft) into the units the math engine
// needs to produce EI-consistent results, then scales the solution back.
function solve(
  beamType: BeamType,
  units: UnitSystem,
  length: number,
  pointLoads: PointLoad[],
  udls: UDLLoad[],
  trapezoidalLoads: TrapezoidalLoad[],
  momentLoads: MomentLoad[],
  E: number,
  I: number,
  section: SectionProps | null
): BeamSolution {
  let calcLength = length
  let calcPointLoads = pointLoads
  let calcUdls = udls
  let calcTrapezoidal = trapezoidalLoads
  let calcMoments = momentLoads
  let EI: number
  let lengthScale = 1
  let momentScale = 1
  let deflectionScale = 1
  let stressScale = 1

  if (units === 'SI') {
    // E [GPa] * I [cm^4] -> EI [kN*m^2]; deflection comes out in m -> mm
    EI = E * I * 1e-2
    deflectionScale = 1000
    stressScale = 1e-3 // kN/m^2 -> MPa
  } else {
    // Work in inches so EI = E[ksi]*I[in^4] is consistent with kip*in^2
    const toIn = (v: number) => v * 12
    calcLength = toIn(length)
    calcPointLoads = pointLoads.map((p) => ({ ...p, position: toIn(p.position) }))
    calcUdls = udls.map((uu) => ({ ...uu, start: toIn(uu.start), end: toIn(uu.end), magnitude: uu.magnitude / 12 }))
    calcTrapezoidal = trapezoidalLoads.map((t) => ({
      ...t,
      start: toIn(t.start),
      end: toIn(t.end),
      startMag: t.startMag / 12,
      endMag: t.endMag / 12,
    }))
    calcMoments = momentLoads.map((m) => ({ ...m, position: toIn(m.position), magnitude: m.magnitude * 12 }))
    EI = E * I
    lengthScale = 1 / 12 // in -> ft
    momentScale = 1 / 12 // kip*in -> kip*ft
    deflectionScale = 1 // already inches
    stressScale = 1 // already ksi
  }

  const raw = solveBeam(
    beamType,
    Math.max(calcLength, 1e-6),
    calcPointLoads,
    calcUdls,
    calcTrapezoidal,
    calcMoments,
    Math.max(EI, 1e-9),
    section ?? undefined
  )

  const scaleX = (e: ExtremePoint): ExtremePoint => ({ value: e.value, x: e.x * lengthScale })
  const scaleM = (e: ExtremePoint): ExtremePoint => ({ value: e.value * momentScale, x: e.x * lengthScale })
  const scaleD = (e: ExtremePoint): ExtremePoint => ({ value: e.value * deflectionScale, x: e.x * lengthScale })

  return {
    reactions: {
      ...raw.reactions,
      MA: raw.reactions.MA * momentScale,
      MB: raw.reactions.MB * momentScale,
    },
    x: raw.x.map((xi) => xi * lengthScale),
    shear: raw.shear,
    moment: raw.moment.map((m) => m * momentScale),
    deflection: raw.deflection.map((d) => d * deflectionScale),
    maxShear: scaleX(raw.maxShear),
    minShear: scaleX(raw.minShear),
    maxMoment: scaleM(raw.maxMoment),
    minMoment: scaleM(raw.minMoment),
    maxDeflection: scaleD(raw.maxDeflection),
    keyPoints: raw.keyPoints.map((kp) => ({
      x: kp.x * lengthScale,
      V: kp.V,
      M: kp.M * momentScale,
      delta: kp.delta * deflectionScale,
    })),
    stressResults: raw.stressResults
      ? {
          maxNormalStress: raw.stressResults.maxNormalStress * stressScale,
          maxShearStress: raw.stressResults.maxShearStress * stressScale,
          position: raw.stressResults.position * lengthScale,
        }
      : null,
  }
}

function LayerToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`layer-toggle${active ? ' active' : ''}`} onClick={onClick}>
      <span className="layer-toggle-box">{active ? '✓' : ''}</span>
      {label}
    </button>
  )
}

function StatBox({ label, value, unit, sub }: { label: string; value: string; unit: string; sub?: string }) {
  return (
    <div className="stat-box">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value} <span className="stat-unit">{unit}</span>
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// Small to-scale SVG preview of the selected cross-section.
function SectionPreview({ section, units }: { section: SectionDef; units: UnitSystem }) {
  const v = sectionToUnits(section, units)
  const dimUnit = units === 'SI' ? 'mm' : 'in'
  const w = 84
  const ht = 84
  const scale = Math.min(w / v.b, ht / v.h) * 0.78
  const bw = v.b * scale
  const hh = v.h * scale
  const x0 = (w - bw) / 2
  const y0 = (ht - hh) / 2 - 4

  return (
    <svg viewBox={`0 0 ${w} ${ht}`} width={84} height={84} style={{ flexShrink: 0 }}>
      {section.shape === 'i-section' ? (
        <g fill="none" stroke="#ff4444" strokeWidth={1.5}>
          {(() => {
            const tf = Math.max(2, hh * 0.08)
            const twPx = Math.max(1.5, (v.tw / v.b) * bw)
            const xc = w / 2
            return (
              <>
                <rect x={x0} y={y0} width={bw} height={tf} />
                <rect x={x0} y={y0 + hh - tf} width={bw} height={tf} />
                <rect x={xc - twPx / 2} y={y0 + tf} width={twPx} height={hh - 2 * tf} />
              </>
            )
          })()}
        </g>
      ) : (
        <rect x={x0} y={y0} width={bw} height={hh} fill="none" stroke="#ff4444" strokeWidth={1.5} />
      )}
      <text x={w / 2} y={ht - 2} textAnchor="middle" fill="#666" fontSize={8} fontFamily="monospace">
        {fmt(v.b, 0)}&times;{fmt(v.h, 0)} {dimUnit}
      </text>
    </svg>
  )
}

export default function BeamCalculatorPage() {
  const [beamType, setBeamType] = useState<BeamType>('simply-supported')
  const [code, setCode] = useState<DesignCode>('EC')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const [siSubUnits, setSiSubUnits] = useState<SubUnits>(DEFAULT_SI_SUBUNITS)
  const [imperialSubUnits, setImperialSubUnits] = useState<SubUnits>(DEFAULT_IMPERIAL_SUBUNITS)
  const [unitsMenuOpen, setUnitsMenuOpen] = useState(false)
  const unitsMenuRef = useRef<HTMLDivElement>(null)

  const [length, setLength] = useState(6)
  const [E, setE] = useState(200)
  const [I, setI] = useState(8360)

  const [pointLoads, setPointLoads] = useState<PointLoad[]>([{ id: 'pl-1', position: 3, magnitude: 20, label: 'P1', loadType: 'Q' }])
  const [udls, setUdls] = useState<UDLLoad[]>([{ id: 'udl-1', start: 0, end: 6, magnitude: 10, label: 'w1', loadType: 'G' }])
  const [trapezoidalLoads, setTrapezoidalLoads] = useState<TrapezoidalLoad[]>([])
  const [momentLoads, setMomentLoads] = useState<MomentLoad[]>([])

  const [sectionCategory, setSectionCategory] = useState<SectionCategory>('manual')
  const [sectionId, setSectionId] = useState<string>(STEEL_SECTIONS[0].id)
  const [fck, setFck] = useState(30)
  const [fy, setFy] = useState(235)
  const [tbeam, setTbeam] = useState({ beff: 600, bw: 300, hf: 150, h: 500 })
  const [selfWeight, setSelfWeight] = useState(false)

  const [comboMode, setComboMode] = useState<CombinationMode>('manual')
  const [gammaG, setGammaG] = useState(DEFAULT_MANUAL_GAMMA.EC.gammaG)
  const [gammaQ, setGammaQ] = useState(DEFAULT_MANUAL_GAMMA.EC.gammaQ)
  const [comboId, setComboId] = useState(combinationsForCode('EC')[0].id)

  const [handCalcOpen, setHandCalcOpen] = useState(false)
  const [beamLayers, setBeamLayers] = useState<BeamLayerOptions>(DEFAULT_BEAM_LAYERS)
  const [chartVisibility, setChartVisibility] = useState<ChartVisibility>(DEFAULT_CHART_VISIBILITY)

  const u = UNIT_LABELS[units]

  // Sub-unit display preferences for the current SI/Imperial system.
  const subUnits = units === 'SI' ? siSubUnits : imperialSubUnits
  const subUnitOptions = units === 'SI' ? SI_SUBUNIT_OPTIONS : IMPERIAL_SUBUNIT_OPTIONS
  const subUnitFactors = units === 'SI' ? SI_SUBUNIT_FACTORS : IMPERIAL_SUBUNIT_FACTORS
  function setSubUnit(category: UnitCategory, value: string) {
    const setter = units === 'SI' ? setSiSubUnits : setImperialSubUnits
    setter((s) => ({ ...s, [category]: value }))
  }

  const lengthFactor = subUnitFactors.length[subUnits.length] ?? 1
  const forceFactor = subUnitFactors.force[subUnits.force] ?? 1
  const momentFactor = subUnitFactors.moment[subUnits.moment] ?? 1
  const deflectionFactor = subUnitFactors.deflection[subUnits.deflection] ?? 1
  const extraForce = extraDecimals(forceFactor)
  const extraMoment = extraDecimals(momentFactor)
  const extraDefl = extraDecimals(deflectionFactor)
  const extraBeam = Math.max(extraForce, extraMoment)

  // Display units: the base SI/Imperial labels with the length/force/moment/
  // deflection entries swapped for the selected sub-units.
  const du = { ...u, length: subUnits.length, force: subUnits.force, moment: subUnits.moment, deflection: subUnits.deflection }

  // Display-only formatters: scale a base-unit value to the selected
  // sub-unit and format it, adding precision when the sub-unit is larger
  // than the base unit (e.g. kN -> MN) so small values stay readable.
  const fmtL = (v: number, d = 2) => fmt(v * lengthFactor, d)
  const fmtF = (v: number, d = 2) => fmt(v * forceFactor, d + extraForce)
  const fmtM = (v: number, d = 2) => fmt(v * momentFactor, d + extraMoment)
  const fmtD = (v: number, d = 2) => fmt(v * deflectionFactor, d + extraDefl)
  const beamFmt = (v: number, d = 2) => fmt(v, d + extraBeam)

  const activeSection: SectionDef | null = useMemo(() => {
    switch (sectionCategory) {
      case 'manual':
        return null
      case 'steel-si':
        return STEEL_SECTIONS.find((s) => s.id === sectionId) ?? STEEL_SECTIONS[0]
      case 'steel-us':
        return US_STEEL_SECTIONS.find((s) => s.id === sectionId) ?? US_STEEL_SECTIONS[0]
      case 'concrete-rect': {
        const base = CONCRETE_RECT_SECTIONS.find((s) => s.id === sectionId) ?? CONCRETE_RECT_SECTIONS[0]
        return { ...base, E_GPa: concreteEGPa(fck, code) }
      }
      case 'concrete-tbeam': {
        const mm = units === 'SI' ? tbeam : { beff: tbeam.beff * 25.4, bw: tbeam.bw * 25.4, hf: tbeam.hf * 25.4, h: tbeam.h * 25.4 }
        return { ...computeTBeamSection(mm), E_GPa: concreteEGPa(fck, code) }
      }
    }
  }, [sectionCategory, sectionId, fck, code, tbeam, units])

  const sectionValues = activeSection ? sectionToUnits(activeSection, units) : null
  const effectiveE = sectionValues ? sectionValues.E : E
  const effectiveI = sectionValues ? sectionValues.I : I
  const sectionProps = activeSection ? sectionToProps(activeSection, units) : null

  const selfWeightUDL: UDLLoad | null = useMemo(() => {
    if (!selfWeight || !activeSection) return null
    return { id: '__self-weight__', start: 0, end: length, magnitude: selfWeightPerLength(activeSection, units), label: 'Self-weight', loadType: 'G' }
  }, [selfWeight, activeSection, units, length])

  function handleUnitsChange(next: UnitSystem) {
    if (next === units) return
    const toImperial = next === 'Imperial'
    setLength((v) => convert(v, 'length', toImperial))
    setE((v) => convert(v, 'E', toImperial))
    setI((v) => convert(v, 'I', toImperial))
    setPointLoads((list) =>
      list.map((p) => ({
        ...p,
        position: convert(p.position, 'length', toImperial),
        magnitude: convert(p.magnitude, 'force', toImperial),
      }))
    )
    setUdls((list) =>
      list.map((uu) => ({
        ...uu,
        start: convert(uu.start, 'length', toImperial),
        end: convert(uu.end, 'length', toImperial),
        magnitude: convert(uu.magnitude, 'udl', toImperial),
      }))
    )
    setTrapezoidalLoads((list) =>
      list.map((t) => ({
        ...t,
        start: convert(t.start, 'length', toImperial),
        end: convert(t.end, 'length', toImperial),
        startMag: convert(t.startMag, 'udl', toImperial),
        endMag: convert(t.endMag, 'udl', toImperial),
      }))
    )
    setMomentLoads((list) =>
      list.map((m) => ({
        ...m,
        position: convert(m.position, 'length', toImperial),
        magnitude: convert(m.magnitude, 'moment', toImperial),
      }))
    )
    setTbeam((t) => ({
      beff: convert(t.beff, 'dim', toImperial),
      bw: convert(t.bw, 'dim', toImperial),
      hf: convert(t.hf, 'dim', toImperial),
      h: convert(t.h, 'dim', toImperial),
    }))
    setUnits(next)
  }

  function handleCodeChange(next: DesignCode) {
    setCode(next)
    handleUnitsChange(next === 'EC' ? 'SI' : 'Imperial')
    setGammaG(DEFAULT_MANUAL_GAMMA[next].gammaG)
    setGammaQ(DEFAULT_MANUAL_GAMMA[next].gammaQ)
    setComboId(combinationsForCode(next)[0].id)
  }

  function handleSectionCategoryChange(next: SectionCategory) {
    setSectionCategory(next)
    if (next === 'steel-si') setSectionId(STEEL_SECTIONS[0].id)
    else if (next === 'steel-us') setSectionId(US_STEEL_SECTIONS[0].id)
    else if (next === 'concrete-rect') setSectionId(CONCRETE_RECT_SECTIONS[0].id)
  }

  function handleComboModeChange(next: CombinationMode) {
    setComboMode(next)
    if (next === 'auto-ec') setComboId(combinationsForCode('EC')[0].id)
    else if (next === 'auto-aci') setComboId(combinationsForCode('ACI')[0].id)
  }

  function updatePointLoad(id: string, patch: Partial<PointLoad>) {
    setPointLoads((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  function updateUdl(id: string, patch: Partial<UDLLoad>) {
    setUdls((list) => list.map((uu) => (uu.id === id ? { ...uu, ...patch } : uu)))
  }
  function updateTrapezoidal(id: string, patch: Partial<TrapezoidalLoad>) {
    setTrapezoidalLoads((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }
  function updateMomentLoad(id: string, patch: Partial<MomentLoad>) {
    setMomentLoads((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }
  function addPointLoad() {
    setPointLoads((list) => [
      ...list,
      { id: nextId('pl'), position: round(length / 2, 2), magnitude: units === 'SI' ? 10 : 2, label: `P${list.length + 1}`, loadType: 'Q' },
    ])
  }
  function addUdl() {
    setUdls((list) => [
      ...list,
      { id: nextId('udl'), start: 0, end: round(length, 2), magnitude: units === 'SI' ? 5 : 1, label: `w${list.length + 1}`, loadType: 'G' },
    ])
  }
  function addTrapezoidal() {
    setTrapezoidalLoads((list) => [
      ...list,
      {
        id: nextId('trap'),
        start: 0,
        end: round(length, 2),
        startMag: 0,
        endMag: units === 'SI' ? 5 : 1,
        label: `t${list.length + 1}`,
        loadType: 'G',
      },
    ])
  }
  function addMomentLoad() {
    setMomentLoads((list) => [
      ...list,
      { id: nextId('mom'), position: round(length / 2, 2), magnitude: units === 'SI' ? 10 : 7, direction: 'CCW', label: `M${list.length + 1}`, loadType: 'Q' },
    ])
  }
  function removePointLoad(id: string) {
    setPointLoads((list) => list.filter((p) => p.id !== id))
  }
  function removeUdl(id: string) {
    setUdls((list) => list.filter((uu) => uu.id !== id))
  }
  function removeTrapezoidal(id: string) {
    setTrapezoidalLoads((list) => list.filter((t) => t.id !== id))
  }
  function removeMomentLoad(id: string) {
    setMomentLoads((list) => list.filter((m) => m.id !== id))
  }

  function toggleBeamLayer(key: keyof BeamLayerOptions) {
    setBeamLayers((l) => ({ ...l, [key]: !l[key] }))
  }
  function toggleChartVisibility(key: keyof ChartVisibility) {
    setChartVisibility((l) => ({ ...l, [key]: !l[key] }))
  }

  useEffect(() => {
    if (!unitsMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (unitsMenuRef.current && !unitsMenuRef.current.contains(e.target as Node)) {
        setUnitsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [unitsMenuOpen])

  const comboCode: DesignCode = comboMode === 'auto-aci' ? 'ACI' : comboMode === 'auto-ec' ? 'EC' : code
  const combos = combinationsForCode(comboCode)
  const activeCombo = combos.find((c) => c.id === comboId) ?? combos[0]
  const activeFactors = comboMode === 'manual' ? manualFactors(gammaG, gammaQ) : activeCombo.factors

  const allUdls = selfWeightUDL ? [...udls, selfWeightUDL] : udls
  const factoredPointLoads = applyFactorsToPointLoads(pointLoads, activeFactors)
  const factoredUdls = applyFactorsToUDLs(allUdls, activeFactors)
  const factoredTrapezoidal = applyFactorsToTrapezoidal(trapezoidalLoads, activeFactors)
  const factoredMoments = applyFactorsToMoments(momentLoads, activeFactors)

  const result = solve(
    beamType,
    units,
    Math.max(length, 1e-6),
    factoredPointLoads,
    factoredUdls,
    factoredTrapezoidal,
    factoredMoments,
    Math.max(effectiveE, 1e-6),
    Math.max(effectiveI, 1e-6),
    sectionProps
  )

  const { reactions, x, shear, moment, deflection, maxShear, minShear, maxMoment, minMoment, maxDeflection, keyPoints, stressResults } = result
  const bmdFlip = code === 'EC'
  const deflDecimals = units === 'SI' ? 2 : 3
  const spanForRatio = units === 'SI' ? length * 1000 : length * 12
  const deflRatio = Math.abs(maxDeflection.value) > 1e-9 ? Math.round(spanForRatio / Math.abs(maxDeflection.value)) : null

  // Tags each key-point x position against the global extremes, for the results table.
  const xEps = Math.max(length, 1) * 1e-4
  function extremeTags(xv: number): string[] {
    const tags: string[] = []
    if (Math.abs(xv - maxShear.x) < xEps) tags.push('V_max')
    if (Math.abs(xv - minShear.x) < xEps) tags.push('V_min')
    if (Math.abs(xv - maxMoment.x) < xEps) tags.push('M_max')
    if (Math.abs(xv - minMoment.x) < xEps) tags.push('M_min')
    if (Math.abs(xv - maxDeflection.x) < xEps) tags.push('δ_max')
    return tags
  }

  // Stress check: bending stress vs fy (steel) or 0.45*fck (concrete).
  const stressLimitMPa = activeSection ? (activeSection.material === 'steel' ? fy : 0.45 * fck) : null
  const stressLimit = stressLimitMPa !== null ? (units === 'Imperial' ? stressLimitMPa * MPA_TO_KSI : stressLimitMPa) : null
  const stressPass = stressResults && stressLimit !== null ? Math.abs(stressResults.maxNormalStress) <= stressLimit : null

  // Totals of the factored loads fed into solve(), for the hand-calculation summary.
  const hcTotalPoint = factoredPointLoads.reduce((s, p) => s + p.magnitude, 0)
  const hcTotalUdl = factoredUdls.reduce((s, uu) => s + uu.magnitude * (uu.end - uu.start), 0)
  const hcTotalTrap = factoredTrapezoidal.reduce((s, t) => s + ((t.startMag + t.endMag) / 2) * (t.end - t.start), 0)
  const hcTotalLoad = hcTotalPoint + hcTotalUdl + hcTotalTrap
  const hcSignedMoments = factoredMoments.reduce((s, m) => s + (m.direction === 'CCW' ? m.magnitude : -m.magnitude), 0)

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; }

        .nav-link { color: #888; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #f0f0f0; }

        .btn-primary {
          background: #cc0000; color: #fff; border: none; padding: 10px 22px;
          font-size: 13px; font-weight: 600; border-radius: 4px; cursor: pointer;
          text-decoration: none; display: inline-block; transition: all 0.2s;
        }
        .btn-primary:hover { background: #e60000; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(204,0,0,0.35); }

        .filter-btn {
          background: transparent; color: #888; border: 1px solid #2a2a2a; padding: 8px 18px;
          font-size: 12px; font-weight: 600; border-radius: 4px; cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.04em; font-family: 'Inter', sans-serif;
        }
        .filter-btn:hover { border-color: #444; color: #ccc; }
        .filter-btn.active { background: #cc0000; border-color: #cc0000; color: #fff; }

        .toggle-group { display: inline-flex; gap: 6px; background: #111; padding: 5px; border-radius: 6px; border: 1px solid #1e1e1e; }

        .units-menu-wrap { position: relative; }
        .units-gear-btn {
          background: transparent; color: #888; border: 1px solid #2a2a2a; border-radius: 6px;
          width: 38px; height: 38px; cursor: pointer; font-size: 16px; line-height: 1; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .units-gear-btn:hover { border-color: #444; color: #ccc; }
        .units-gear-btn.active { border-color: #cc0000; color: #ff4444; background: rgba(204,0,0,0.08); }
        .units-menu {
          position: absolute; top: calc(100% + 8px); right: 0; z-index: 50; width: 240px;
          background: #111; border: 1px solid #2a2a2a; border-radius: 8px; padding: 14px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 12px;
        }
        .units-menu-title { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .units-menu-row { display: flex; flex-direction: column; gap: 6px; }
        .units-menu-label { font-size: 11px; color: #999; font-weight: 500; }
        .units-menu-options { display: flex; gap: 6px; }
        .units-menu-option {
          flex: 1; background: #0c0c0c; border: 1px solid #2a2a2a; color: #888; border-radius: 4px;
          padding: 6px 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s;
          font-family: 'Geist Mono', monospace; text-align: center;
        }
        .units-menu-option:hover { border-color: #444; color: #ccc; }
        .units-menu-option.active { background: rgba(204,0,0,0.12); border-color: #cc0000; color: #ff8888; }

        .layer-toggles { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .layer-toggle {
          display: inline-flex; align-items: center; gap: 6px; background: #0c0c0c; border: 1px solid #2a2a2a;
          color: #777; border-radius: 999px; padding: 5px 12px 5px 8px; font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.03em; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
        }
        .layer-toggle:hover { border-color: #444; color: #ccc; }
        .layer-toggle.active { background: rgba(204,0,0,0.1); border-color: #cc0000; color: #ff8888; }
        .layer-toggle-box {
          display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px;
          border: 1px solid #444; border-radius: 3px; font-size: 9px; line-height: 1; color: #ff4444; flex-shrink: 0;
        }
        .layer-toggle.active .layer-toggle-box { border-color: #cc0000; background: rgba(204,0,0,0.18); }

        .card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 22px;
        }
        .card-title {
          font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; color: #f0f0f0;
          margin-bottom: 16px; letter-spacing: 0.01em; text-transform: uppercase;
        }
        .card-title .accent { color: #cc0000; }

        .beam-type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .beam-type-card {
          background: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 6px; padding: 12px 8px;
          cursor: pointer; transition: all 0.2s; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .beam-type-card:hover { border-color: #444; }
        .beam-type-card.active { border-color: #cc0000; background: rgba(204,0,0,0.07); }
        .beam-type-card .name { font-size: 11px; font-weight: 600; color: #f0f0f0; }
        .beam-type-card .desc { font-size: 9.5px; color: #555; line-height: 1.3; }

        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 11px; color: #777; font-weight: 500; letter-spacing: 0.02em; }
        .field-input {
          background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 4px; color: #f0f0f0;
          padding: 9px 10px; font-size: 13px; font-family: 'Inter', sans-serif; width: 100%;
        }
        .field-input:focus { outline: none; border-color: #cc0000; }
        .field-input::-webkit-outer-spin-button, .field-input::-webkit-inner-spin-button { opacity: 0.4; }
        .field-input:disabled { opacity: 0.55; cursor: not-allowed; }
        .field-select {
          background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 4px; color: #f0f0f0;
          padding: 9px 10px; font-size: 13px; font-family: 'Inter', sans-serif; width: 100%;
        }
        .field-select:focus { outline: none; border-color: #cc0000; }

        .field-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .field-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }

        .field input[type="range"] { accent-color: #cc0000; width: 100%; cursor: pointer; }
        .field-label .slider-value { color: #f0f0f0; font-weight: 600; }
        .combo-summary { font-size: 11px; color: #777; line-height: 1.6; margin-top: 4px; }
        .combo-summary b { color: #ccc; }

        .load-section + .load-section { margin-top: 22px; }
        .load-row-header {
          display: grid; gap: 8px; font-size: 10px; color: #555; text-transform: uppercase;
          letter-spacing: 0.08em; margin-bottom: 8px; padding-right: 44px;
        }
        .load-row-header.pl { grid-template-columns: 1fr 1fr 1fr 0.7fr; }
        .load-row-header.udl { grid-template-columns: 1fr 1fr 1fr 1fr 0.7fr; }
        .load-row-header.trap { grid-template-columns: 1fr 1fr 1fr 1fr 1fr 0.7fr; }
        .load-row-header.mom { grid-template-columns: 1fr 1fr 1fr 0.7fr 0.7fr; }
        .load-row { display: grid; gap: 8px; align-items: center; margin-bottom: 8px; }
        .load-row.pl { grid-template-columns: 1fr 1fr 1fr 0.7fr auto; }
        .load-row.udl { grid-template-columns: 1fr 1fr 1fr 1fr 0.7fr auto; }
        .load-row.trap { grid-template-columns: 1fr 1fr 1fr 1fr 1fr 0.7fr auto; }
        .load-row.mom { grid-template-columns: 1fr 1fr 1fr 0.7fr 0.7fr auto; }

        .icon-btn {
          background: #1a1a1a; border: 1px solid #2a2a2a; color: #888; border-radius: 4px;
          width: 36px; height: 36px; cursor: pointer; font-size: 16px; line-height: 1; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .icon-btn:hover { border-color: #cc0000; color: #ff4444; background: rgba(204,0,0,0.08); }

        .btn-add {
          background: transparent; border: 1px dashed #2a2a2a; color: #888; border-radius: 4px;
          padding: 10px; font-size: 12px; font-weight: 500; cursor: pointer; width: 100%; transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .btn-add:hover { border-color: #cc0000; color: #ff4444; }
        .empty-note { font-size: 12px; color: #555; padding: 6px 0 10px; }

        .layout-grid { display: grid; grid-template-columns: 360px 1fr; gap: 22px; align-items: start; }
        .stack { display: flex; flex-direction: column; gap: 18px; }

        .unit-ref-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); gap: 8px; }
        .unit-ref-grid > div {
          display: flex; flex-direction: column; gap: 4px; background: #0c0c0c;
          border: 1px solid #1e1e1e; border-radius: 6px; padding: 8px 10px;
        }
        .unit-ref-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.06em; }
        .unit-ref-value { font-family: 'Geist Mono', monospace; font-size: 13px; color: #f0f0f0; font-weight: 600; }

        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; }
        .stat-box { background: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 6px; padding: 12px 14px; }
        .stat-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 19px; font-weight: 700; color: #f0f0f0; }
        .stat-value .stat-unit { font-size: 11px; font-weight: 500; color: #666; }
        .stat-sub { font-size: 10.5px; color: #555; margin-top: 4px; }

        .chart-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; gap: 6px; }
        .chart-title { font-size: 12px; font-weight: 700; color: #ccc; text-transform: uppercase; letter-spacing: 0.08em; }
        .chart-extremes { font-size: 11px; color: #777; font-family: 'Geist Mono', monospace; display: flex; gap: 14px; }
        .chart-extremes b { color: #ff4444; font-weight: 600; }
        .chart-caption { font-size: 11px; color: #555; margin-top: 8px; line-height: 1.5; }

        .method-note { font-size: 12px; color: #666; line-height: 1.7; }
        .method-note b { color: #999; }

        .results-table-wrap { overflow-x: auto; }
        .results-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 480px; }
        .results-table th, .results-table td {
          padding: 7px 10px; text-align: right; border-bottom: 1px solid #1e1e1e;
          font-family: 'Geist Mono', monospace; white-space: nowrap;
        }
        .results-table th:first-child, .results-table td:first-child { text-align: left; font-family: 'Inter', sans-serif; }
        .results-table th {
          color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
          font-weight: 600; border-bottom: 1px solid #2a2a2a;
        }
        .results-table tr.highlight td { color: #ff4444; font-weight: 600; background: rgba(204,0,0,0.06); }
        .results-table .tag { font-size: 9px; color: #cc0000; margin-left: 6px; letter-spacing: 0.04em; }

        .pass-fail { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; }
        .pass-fail.pass { background: rgba(46,204,113,0.12); color: #2ecc71; border: 1px solid rgba(46,204,113,0.3); }
        .pass-fail.fail { background: rgba(204,0,0,0.12); color: #ff4444; border: 1px solid rgba(204,0,0,0.35); }

        .collapsible-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
        .collapsible-toggle { font-size: 18px; color: #666; line-height: 1; font-weight: 400; }
        .hand-calc-body { margin-top: 14px; display: flex; flex-direction: column; gap: 14px; }
        .hand-calc-body.collapsed { display: none; }
        .hand-calc-step .step-title { font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .hand-calc-step .step-eq {
          font-family: 'Geist Mono', monospace; font-size: 12px; color: #ccc; line-height: 1.9;
          background: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 6px; padding: 10px 12px; overflow-x: auto;
        }
        .hand-calc-step .step-eq div { white-space: nowrap; }

        @media print {
          nav, .no-print, button, .toggle-group, .layer-toggles, .units-menu-wrap { display: none !important; }
          main { background: #fff !important; color: #000 !important; }
          section { padding: 0 !important; border: none !important; }
          .layout-grid { display: block !important; max-width: 100% !important; }
          .stack { display: block !important; }
          .card {
            break-inside: avoid; border: 1px solid #ddd !important; background: #fff !important;
            color: #000 !important; margin-bottom: 14px; box-shadow: none !important;
          }
          .card-title, .chart-title, .stat-value, .results-table th, .results-table td, h1 { color: #000 !important; }
          .stat-box, .results-table th, .hand-calc-step .step-eq { background: #f6f6f6 !important; border-color: #ddd !important; }
          .field-input, .field-select { background: #fff !important; color: #000 !important; border: 1px solid #ccc !important; }
          .hand-calc-body.collapsed { display: flex !important; }
          .pass-fail.pass { background: #eafaf0 !important; border-color: #bfe9cf !important; }
          .pass-fail.fail { background: #fdecec !important; border-color: #f5c2c2 !important; }
        }

        @media (max-width: 900px) {
          .layout-grid { grid-template-columns: 1fr; }
          .beam-type-grid { grid-template-columns: 1fr; }
          .field-grid.cols-3 { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .field-grid, .field-grid.cols-3 { grid-template-columns: 1fr; }
          .load-row.udl, .load-row-header.udl,
          .load-row.pl, .load-row-header.pl,
          .load-row.trap, .load-row-header.trap,
          .load-row.mom, .load-row-header.mom { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #1a1a1a', padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', textDecoration: 'none', color: '#f0f0f0' }}>
          ENGI<span style={{ color: '#cc0000' }}>NUS</span>
        </Link>
        <div style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          <a href="/calculators" className="nav-link" style={{ color: '#f0f0f0' }}>Calculators</a>
          <a href="/templates" className="nav-link">Templates</a>
          <a href="/about" className="nav-link">About</a>
          <a href="/templates" className="btn-primary">Get Templates</a>
        </div>
      </nav>

      {/* Header */}
      <section style={{ padding: '48px 48px 28px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <a href="/calculators" className="nav-link" style={{ fontSize: '13px' }}>&larr; All Calculators</a>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginTop: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '12px' }}>Structural Analysis</div>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
                Beam Calculator
              </h1>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '8px', maxWidth: '560px', lineHeight: 1.6 }}>
                Reactions, shear force, bending moment and deflection for simply supported, cantilever and fixed-fixed beams under point loads, UDLs, trapezoidal loads and applied moments.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="toggle-group">
                <button className={`filter-btn${code === 'EC' ? ' active' : ''}`} onClick={() => handleCodeChange('EC')}>Eurocode</button>
                <button className={`filter-btn${code === 'ACI' ? ' active' : ''}`} onClick={() => handleCodeChange('ACI')}>ACI</button>
              </div>
              <div className="toggle-group">
                <button className={`filter-btn${units === 'SI' ? ' active' : ''}`} onClick={() => handleUnitsChange('SI')}>SI</button>
                <button className={`filter-btn${units === 'Imperial' ? ' active' : ''}`} onClick={() => handleUnitsChange('Imperial')}>Imperial</button>
              </div>
              <div className="units-menu-wrap no-print" ref={unitsMenuRef}>
                <button
                  type="button"
                  className={`units-gear-btn${unitsMenuOpen ? ' active' : ''}`}
                  onClick={() => setUnitsMenuOpen((v) => !v)}
                  aria-label="Unit settings"
                  title="Unit settings"
                >
                  ⚙
                </button>
                {unitsMenuOpen && (
                  <div className="units-menu">
                    <div className="units-menu-title">Display Units</div>
                    {(Object.keys(subUnitOptions) as UnitCategory[]).map((cat) => (
                      <div className="units-menu-row" key={cat}>
                        <span className="units-menu-label">{UNIT_CATEGORY_LABELS[cat]}</span>
                        <div className="units-menu-options">
                          {subUnitOptions[cat].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className={`units-menu-option${subUnits[cat] === opt ? ' active' : ''}`}
                              onClick={() => setSubUnit(cat, opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn-primary no-print" onClick={() => window.print()}>Export PDF</button>
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <section style={{ padding: '32px 48px 100px' }}>
        <div className="layout-grid" style={{ maxWidth: '1180px', margin: '0 auto' }}>

          {/* ---------------- Inputs ---------------- */}
          <div className="stack">

            <div className="card">
              <div className="card-title">Unit <span className="accent">Reference</span></div>
              <div className="unit-ref-grid">
                <div><span className="unit-ref-label">Length</span><span className="unit-ref-value">{du.length}</span></div>
                <div><span className="unit-ref-label">Force</span><span className="unit-ref-value">{du.force}</span></div>
                <div><span className="unit-ref-label">UDL</span><span className="unit-ref-value">{u.udl}</span></div>
                <div><span className="unit-ref-label">Moment</span><span className="unit-ref-value">{du.moment}</span></div>
                <div><span className="unit-ref-label">E</span><span className="unit-ref-value">{u.E}</span></div>
                <div><span className="unit-ref-label">I</span><span className="unit-ref-value">{u.I}</span></div>
                <div><span className="unit-ref-label">Deflection</span><span className="unit-ref-value">{du.deflection}</span></div>
                <div><span className="unit-ref-label">Area</span><span className="unit-ref-value">{u.area}</span></div>
                <div><span className="unit-ref-label">Stress</span><span className="unit-ref-value">{u.stress}</span></div>
                <div><span className="unit-ref-label">Section dim</span><span className="unit-ref-value">{u.dim}</span></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Beam Type</div>
              <div className="beam-type-grid">
                {BEAM_TYPES.map((bt) => (
                  <div key={bt.value} className={`beam-type-card${beamType === bt.value ? ' active' : ''}`} onClick={() => setBeamType(bt.value)}>
                    <BeamTypeIcon type={bt.value} />
                    <div className="name">{bt.label}</div>
                    <div className="desc">{bt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-title">Span &amp; Section</div>
              <div className="field-grid">
                <label className="field">
                  <span className="field-label">Length L ({u.length})</span>
                  <input className="field-input" type="number" step="any" min={0.1} value={length} onChange={(e) => setLength(Number(e.target.value))} />
                </label>
                <label className="field">
                  <span className="field-label">Section</span>
                  <select className="field-select" value={sectionCategory} onChange={(e) => handleSectionCategoryChange(e.target.value as SectionCategory)}>
                    <option value="manual">Manual E / I</option>
                    <option value="steel-si">Steel (IPE / HEA / HEB)</option>
                    <option value="steel-us">Steel (US W-shapes)</option>
                    <option value="concrete-rect">Concrete (rectangular)</option>
                    <option value="concrete-tbeam">Concrete (T-beam, custom)</option>
                  </select>
                </label>
              </div>

              {sectionCategory === 'steel-si' && (
                <label className="field" style={{ marginTop: 12 }}>
                  <span className="field-label">Profile</span>
                  <select className="field-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                    {STEEL_SECTIONS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {sectionCategory === 'steel-us' && (
                <label className="field" style={{ marginTop: 12 }}>
                  <span className="field-label">Profile</span>
                  <select className="field-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                    {US_STEEL_SECTIONS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {sectionCategory === 'concrete-rect' && (
                <div className="field-grid" style={{ marginTop: 12 }}>
                  <label className="field">
                    <span className="field-label">Section (b &times; h)</span>
                    <select className="field-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                      {CONCRETE_RECT_SECTIONS.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">f_ck (MPa)</span>
                    <select className="field-select" value={fck} onChange={(e) => setFck(Number(e.target.value))}>
                      {CONCRETE_GRADES_MPA.map((g) => (
                        <option key={g} value={g}>C{g}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {sectionCategory === 'concrete-tbeam' && (
                <>
                  <div className="field-grid cols-3" style={{ marginTop: 12 }}>
                    <label className="field">
                      <span className="field-label">b_eff ({u.dim})</span>
                      <input className="field-input" type="number" step="any" min={0} value={tbeam.beff} onChange={(e) => setTbeam((t) => ({ ...t, beff: Number(e.target.value) }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">b_w ({u.dim})</span>
                      <input className="field-input" type="number" step="any" min={0} value={tbeam.bw} onChange={(e) => setTbeam((t) => ({ ...t, bw: Number(e.target.value) }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">h_f ({u.dim})</span>
                      <input className="field-input" type="number" step="any" min={0} value={tbeam.hf} onChange={(e) => setTbeam((t) => ({ ...t, hf: Number(e.target.value) }))} />
                    </label>
                  </div>
                  <div className="field-grid" style={{ marginTop: 12 }}>
                    <label className="field">
                      <span className="field-label">h ({u.dim})</span>
                      <input className="field-input" type="number" step="any" min={0} value={tbeam.h} onChange={(e) => setTbeam((t) => ({ ...t, h: Number(e.target.value) }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">f_ck (MPa)</span>
                      <select className="field-select" value={fck} onChange={(e) => setFck(Number(e.target.value))}>
                        {CONCRETE_GRADES_MPA.map((g) => (
                          <option key={g} value={g}>C{g}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              )}

              {activeSection?.material === 'steel' && (
                <label className="field" style={{ marginTop: 12 }}>
                  <span className="field-label">Yield strength f_y (MPa)</span>
                  <input className="field-input" type="number" step="any" min={0} value={fy} onChange={(e) => setFy(Number(e.target.value))} />
                </label>
              )}

              <div className="field-grid" style={{ marginTop: 12 }}>
                <label className="field">
                  <span className="field-label">Modulus E ({u.E})</span>
                  <input className="field-input" type="number" step="any" min={0} value={activeSection ? round(effectiveE, 4) : E} disabled={!!activeSection} onChange={(e) => setE(Number(e.target.value))} />
                </label>
                <label className="field">
                  <span className="field-label">Moment of Inertia I ({u.I})</span>
                  <input className="field-input" type="number" step="any" min={0} value={activeSection ? round(effectiveI, 4) : I} disabled={!!activeSection} onChange={(e) => setI(Number(e.target.value))} />
                </label>
              </div>

              {activeSection && sectionValues && (
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 14, padding: '12px', background: '#0c0c0c', border: '1px solid #1e1e1e', borderRadius: 6 }}>
                  <SectionPreview section={activeSection} units={units} />
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#ccc', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selfWeight} onChange={(e) => setSelfWeight(e.target.checked)} />
                      Include self-weight
                    </label>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 6, lineHeight: 1.6 }}>
                      A = {fmt(sectionValues.A, 2)} {u.area}<br />
                      self-weight = {fmt(selfWeightPerLength(activeSection, units), 3)} {u.udl}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">Loads</div>

              <div className="load-section">
                <div className="load-row-header pl">
                  <span>Label</span>
                  <span>Position ({u.length})</span>
                  <span>Force, &darr; ({u.force})</span>
                  <span>Type</span>
                </div>
                {pointLoads.map((p) => (
                  <div className="load-row pl" key={p.id}>
                    <input className="field-input" type="text" value={p.label} onChange={(e) => updatePointLoad(p.id, { label: e.target.value })} />
                    <input className="field-input" type="number" step="any" min={0} max={length} value={p.position}
                      onChange={(e) => updatePointLoad(p.id, { position: Number(e.target.value) })} />
                    <input className="field-input" type="number" step="any" value={p.magnitude}
                      onChange={(e) => updatePointLoad(p.id, { magnitude: Number(e.target.value) })} />
                    <select className="field-select" value={p.loadType} onChange={(e) => updatePointLoad(p.id, { loadType: e.target.value as PointLoad['loadType'] })}>
                      <option value="G">G</option>
                      <option value="Q">Q</option>
                      <option value="W">W</option>
                      <option value="S">S</option>
                    </select>
                    <button className="icon-btn" onClick={() => removePointLoad(p.id)} aria-label="Remove point load">&times;</button>
                  </div>
                ))}
                {pointLoads.length === 0 && <div className="empty-note">No point loads.</div>}
                <button className="btn-add" onClick={addPointLoad}>+ Add point load</button>
              </div>

              <div className="load-section">
                <div className="load-row-header udl">
                  <span>Label</span>
                  <span>Start ({u.length})</span>
                  <span>End ({u.length})</span>
                  <span>Load, &darr; ({u.udl})</span>
                  <span>Type</span>
                </div>
                {udls.map((uu) => (
                  <div className="load-row udl" key={uu.id}>
                    <input className="field-input" type="text" value={uu.label} onChange={(e) => updateUdl(uu.id, { label: e.target.value })} />
                    <input className="field-input" type="number" step="any" min={0} max={length} value={uu.start}
                      onChange={(e) => updateUdl(uu.id, { start: Number(e.target.value) })} />
                    <input className="field-input" type="number" step="any" min={0} max={length} value={uu.end}
                      onChange={(e) => updateUdl(uu.id, { end: Number(e.target.value) })} />
                    <input className="field-input" type="number" step="any" value={uu.magnitude}
                      onChange={(e) => updateUdl(uu.id, { magnitude: Number(e.target.value) })} />
                    <select className="field-select" value={uu.loadType} onChange={(e) => updateUdl(uu.id, { loadType: e.target.value as UDLLoad['loadType'] })}>
                      <option value="G">G</option>
                      <option value="Q">Q</option>
                      <option value="W">W</option>
                      <option value="S">S</option>
                    </select>
                    <button className="icon-btn" onClick={() => removeUdl(uu.id)} aria-label="Remove distributed load">&times;</button>
                  </div>
                ))}
                {udls.length === 0 && <div className="empty-note">No distributed loads.</div>}
                <button className="btn-add" onClick={addUdl}>+ Add distributed load</button>
              </div>

              <div className="load-section">
                <div className="load-row-header trap">
                  <span>Label</span>
                  <span>Start ({u.length})</span>
                  <span>End ({u.length})</span>
                  <span>w start ({u.udl})</span>
                  <span>w end ({u.udl})</span>
                  <span>Type</span>
                </div>
                {trapezoidalLoads.map((t) => (
                  <div className="load-row trap" key={t.id}>
                    <input className="field-input" type="text" value={t.label} onChange={(e) => updateTrapezoidal(t.id, { label: e.target.value })} />
                    <input className="field-input" type="number" step="any" min={0} max={length} value={t.start}
                      onChange={(e) => updateTrapezoidal(t.id, { start: Number(e.target.value) })} />
                    <input className="field-input" type="number" step="any" min={0} max={length} value={t.end}
                      onChange={(e) => updateTrapezoidal(t.id, { end: Number(e.target.value) })} />
                    <input className="field-input" type="number" step="any" value={t.startMag}
                      onChange={(e) => updateTrapezoidal(t.id, { startMag: Number(e.target.value) })} />
                    <input className="field-input" type="number" step="any" value={t.endMag}
                      onChange={(e) => updateTrapezoidal(t.id, { endMag: Number(e.target.value) })} />
                    <select className="field-select" value={t.loadType} onChange={(e) => updateTrapezoidal(t.id, { loadType: e.target.value as TrapezoidalLoad['loadType'] })}>
                      <option value="G">G</option>
                      <option value="Q">Q</option>
                      <option value="W">W</option>
                      <option value="S">S</option>
                    </select>
                    <button className="icon-btn" onClick={() => removeTrapezoidal(t.id)} aria-label="Remove trapezoidal load">&times;</button>
                  </div>
                ))}
                {trapezoidalLoads.length === 0 && <div className="empty-note">No trapezoidal loads.</div>}
                <button className="btn-add" onClick={addTrapezoidal}>+ Add trapezoidal load</button>
              </div>

              <div className="load-section">
                <div className="load-row-header mom">
                  <span>Label</span>
                  <span>Position ({u.length})</span>
                  <span>Moment ({u.moment})</span>
                  <span>Dir</span>
                  <span>Type</span>
                </div>
                {momentLoads.map((m) => (
                  <div className="load-row mom" key={m.id}>
                    <input className="field-input" type="text" value={m.label} onChange={(e) => updateMomentLoad(m.id, { label: e.target.value })} />
                    <input className="field-input" type="number" step="any" min={0} max={length} value={m.position}
                      onChange={(e) => updateMomentLoad(m.id, { position: Number(e.target.value) })} />
                    <input className="field-input" type="number" step="any" value={m.magnitude}
                      onChange={(e) => updateMomentLoad(m.id, { magnitude: Number(e.target.value) })} />
                    <select className="field-select" value={m.direction} onChange={(e) => updateMomentLoad(m.id, { direction: e.target.value as MomentLoad['direction'] })}>
                      <option value="CCW">CCW</option>
                      <option value="CW">CW</option>
                    </select>
                    <select className="field-select" value={m.loadType} onChange={(e) => updateMomentLoad(m.id, { loadType: e.target.value as MomentLoad['loadType'] })}>
                      <option value="G">G</option>
                      <option value="Q">Q</option>
                      <option value="W">W</option>
                      <option value="S">S</option>
                    </select>
                    <button className="icon-btn" onClick={() => removeMomentLoad(m.id)} aria-label="Remove moment load">&times;</button>
                  </div>
                ))}
                {momentLoads.length === 0 && <div className="empty-note">No applied moments.</div>}
                <button className="btn-add" onClick={addMomentLoad}>+ Add moment load</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Load <span className="accent">Combinations</span></div>
              <div className="toggle-group">
                <button className={`filter-btn${comboMode === 'manual' ? ' active' : ''}`} onClick={() => handleComboModeChange('manual')}>Manual</button>
                <button className={`filter-btn${comboMode === 'auto-ec' ? ' active' : ''}`} onClick={() => handleComboModeChange('auto-ec')}>Auto EC</button>
                <button className={`filter-btn${comboMode === 'auto-aci' ? ' active' : ''}`} onClick={() => handleComboModeChange('auto-aci')}>Auto ACI</button>
              </div>

              {comboMode === 'manual' ? (
                <div className="field-grid" style={{ marginTop: 14 }}>
                  <label className="field">
                    <span className="field-label">&gamma;<sub>G</sub> (dead) &mdash; <span className="slider-value">{fmt(gammaG, 2)}</span></span>
                    <input type="range" min={0.9} max={1.6} step={0.05} value={gammaG} onChange={(e) => setGammaG(Number(e.target.value))} />
                  </label>
                  <label className="field">
                    <span className="field-label">&gamma;<sub>Q</sub> (live/wind/snow) &mdash; <span className="slider-value">{fmt(gammaQ, 2)}</span></span>
                    <input type="range" min={0} max={1.8} step={0.05} value={gammaQ} onChange={(e) => setGammaQ(Number(e.target.value))} />
                  </label>
                </div>
              ) : (
                <label className="field" style={{ marginTop: 14 }}>
                  <span className="field-label">Combination</span>
                  <select className="field-select" value={comboId} onChange={(e) => setComboId(e.target.value)}>
                    {combos.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </label>
              )}

              <p className="combo-summary">
                Applied factors &mdash; <b>G</b>: {fmt(activeFactors.G, 2)},{' '}
                <b>Q</b>: {fmt(activeFactors.Q, 2)},{' '}
                <b>W</b>: {fmt(activeFactors.W, 2)},{' '}
                <b>S</b>: {fmt(activeFactors.S, 2)}.
                {selfWeightUDL ? ' Self-weight is treated as a G load.' : ''}
              </p>
            </div>

            <div className="card">
              <div className="card-title">Method <span className="accent">&amp; Assumptions</span></div>
              <p className="method-note">
                Reactions and internal forces follow classical elastic (Euler&ndash;Bernoulli) beam theory &mdash;
                statics for the simply supported and cantilever cases, and the fixed-end-moment / superposition
                method for the fixed-fixed case. Deflections assume a constant <b>EI</b> along the span. These
                results are independent of design code; the code toggle sets the default unit system and the
                bending-moment sign convention used below.
              </p>
            </div>
          </div>

          {/* ---------------- Results ---------------- */}
          <div className="stack">

            <div className="card">
              <div className="card-title">Beam Diagram</div>
              <div className="layer-toggles">
                <LayerToggle label="Point Loads" active={beamLayers.pointLoads} onClick={() => toggleBeamLayer('pointLoads')} />
                <LayerToggle label="UDL" active={beamLayers.udl} onClick={() => toggleBeamLayer('udl')} />
                <LayerToggle label="Trapezoidal" active={beamLayers.trapezoidal} onClick={() => toggleBeamLayer('trapezoidal')} />
                <LayerToggle label="Moments" active={beamLayers.moments} onClick={() => toggleBeamLayer('moments')} />
                <LayerToggle label="Reactions" active={beamLayers.reactions} onClick={() => toggleBeamLayer('reactions')} />
                <LayerToggle label="Dimensions" active={beamLayers.dimensions} onClick={() => toggleBeamLayer('dimensions')} />
                <LayerToggle label="Labels" active={beamLayers.labels} onClick={() => toggleBeamLayer('labels')} />
              </div>
              <BeamDiagram
                type={beamType}
                length={length * lengthFactor}
                pointLoads={pointLoads.map((p) => ({ ...p, position: p.position * lengthFactor, magnitude: p.magnitude * forceFactor }))}
                udls={udls.map((uu) => ({ ...uu, start: uu.start * lengthFactor, end: uu.end * lengthFactor }))}
                trapezoidalLoads={trapezoidalLoads.map((t) => ({ ...t, start: t.start * lengthFactor, end: t.end * lengthFactor }))}
                momentLoads={momentLoads.map((m) => ({ ...m, position: m.position * lengthFactor, magnitude: m.magnitude * momentFactor }))}
                reactions={{
                  RA: reactions.RA * forceFactor,
                  RB: reactions.RB * forceFactor,
                  MA: reactions.MA * momentFactor,
                  MB: reactions.MB * momentFactor,
                }}
                lengthUnit={du.length}
                forceUnit={du.force}
                udlUnit={u.udl}
                momentUnit={du.moment}
                fmt={beamFmt}
                layers={beamLayers}
              />
            </div>

            <div className="card">
              <div className="card-title">Reactions</div>
              <div className="stats-row">
                <StatBox label="Reaction R_A" value={fmtF(reactions.RA)} unit={du.force} />
                {beamType !== 'cantilever' && <StatBox label="Reaction R_B" value={fmtF(reactions.RB)} unit={du.force} />}
                {(beamType === 'cantilever' || beamType === 'fixed-fixed') && (
                  <StatBox label="Moment M_A" value={fmtM(reactions.MA)} unit={du.moment} />
                )}
                {beamType === 'fixed-fixed' && <StatBox label="Moment M_B" value={fmtM(reactions.MB)} unit={du.moment} />}
              </div>
            </div>

            {activeSection && stressResults && (
              <div className="card">
                <div className="card-title">Stress <span className="accent">Check</span></div>
                <div className="stats-row">
                  <StatBox
                    label="Max Normal Stress (σ)"
                    value={fmt(stressResults.maxNormalStress, units === 'SI' ? 1 : 2)}
                    unit={u.stress}
                    sub={`@ x = ${fmtL(stressResults.position)} ${du.length}`}
                  />
                  <StatBox
                    label="Max Shear Stress (τ)"
                    value={fmt(stressResults.maxShearStress, units === 'SI' ? 2 : 3)}
                    unit={u.stress}
                  />
                  {stressLimit !== null && (
                    <StatBox
                      label={activeSection.material === 'steel' ? 'Yield Strength f_y' : 'Allowable 0.45·f_ck'}
                      value={fmt(stressLimit, units === 'SI' ? 1 : 2)}
                      unit={u.stress}
                    />
                  )}
                </div>
                {stressPass !== null && (
                  <div style={{ marginTop: 14 }}>
                    <span className={`pass-fail ${stressPass ? 'pass' : 'fail'}`}>
                      {stressPass ? 'PASS' : 'FAIL'} &mdash; |σ| {stressPass ? '≤' : '>'} {activeSection.material === 'steel' ? 'f_y' : '0.45·f_ck'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="layer-toggles">
              <LayerToggle label="Shear Force Diagram" active={chartVisibility.sfd} onClick={() => toggleChartVisibility('sfd')} />
              <LayerToggle label="Bending Moment Diagram" active={chartVisibility.bmd} onClick={() => toggleChartVisibility('bmd')} />
              <LayerToggle label="Deflection" active={chartVisibility.deflection} onClick={() => toggleChartVisibility('deflection')} />
              <LayerToggle label="Key Points" active={chartVisibility.keyPoints} onClick={() => toggleChartVisibility('keyPoints')} />
              <LayerToggle label="Grid" active={chartVisibility.grid} onClick={() => toggleChartVisibility('grid')} />
              <LayerToggle label="Tooltips" active={chartVisibility.tooltip} onClick={() => toggleChartVisibility('tooltip')} />
            </div>

            {chartVisibility.sfd && (
              <div className="card">
                <div className="chart-header">
                  <div className="chart-title">Shear Force Diagram</div>
                  <div className="chart-extremes">
                    <span>V<sub>max</sub> = <b>{fmtF(maxShear.value)}</b> {du.force} @ x={fmtL(maxShear.x)}{du.length}</span>
                    <span>V<sub>min</sub> = <b>{fmtF(minShear.value)}</b> {du.force} @ x={fmtL(minShear.x)}{du.length}</span>
                  </div>
                </div>
                <DiagramChart
                  x={x.map((xi) => xi * lengthFactor)}
                  values={shear.map((v) => v * forceFactor)}
                  length={length * lengthFactor}
                  color="#ff4444"
                  unit={du.force}
                  lengthUnit={du.length}
                  valueLabel="V"
                  decimals={2 + extraForce}
                  fmt={fmt}
                  layers={chartVisibility}
                />
              </div>
            )}

            {chartVisibility.bmd && (
              <div className="card">
                <div className="chart-header">
                  <div className="chart-title">Bending Moment Diagram</div>
                  <div className="chart-extremes">
                    <span>M<sub>max</sub> = <b>{fmtM(maxMoment.value)}</b> {du.moment} @ x={fmtL(maxMoment.x)}{du.length}</span>
                    <span>M<sub>min</sub> = <b>{fmtM(minMoment.value)}</b> {du.moment} @ x={fmtL(minMoment.x)}{du.length}</span>
                  </div>
                </div>
                <DiagramChart
                  x={x.map((xi) => xi * lengthFactor)}
                  values={moment.map((v) => v * momentFactor)}
                  length={length * lengthFactor}
                  color="#cc0000"
                  flip={bmdFlip}
                  unit={du.moment}
                  lengthUnit={du.length}
                  valueLabel="M"
                  decimals={2 + extraMoment}
                  fmt={fmt}
                  layers={chartVisibility}
                />
                <p className="chart-caption">
                  Sign convention: sagging (positive) moment is plotted {bmdFlip ? 'below' : 'above'} the axis
                  {bmdFlip ? ' — Eurocode convention, matching the deflected shape below.' : ' — ACI / US convention.'}
                </p>
              </div>
            )}

            {chartVisibility.deflection && (
              <div className="card">
                <div className="chart-header">
                  <div className="chart-title">Deflection</div>
                  <div className="chart-extremes">
                    <span>
                      &delta;<sub>max</sub> = <b>{fmtD(maxDeflection.value, deflDecimals)}</b> {du.deflection} @ x={fmtL(maxDeflection.x)}{du.length}
                      {' '}({maxDeflection.value >= 0 ? 'downward' : 'upward'})
                    </span>
                    {deflRatio !== null && <span>L / &delta; = <b>{deflRatio}</b></span>}
                  </div>
                </div>
                <DiagramChart
                  x={x.map((xi) => xi * lengthFactor)}
                  values={deflection.map((v) => v * deflectionFactor)}
                  length={length * lengthFactor}
                  color="#4499ff"
                  flip
                  unit={du.deflection}
                  lengthUnit={du.length}
                  valueLabel="δ"
                  decimals={deflDecimals + extraDefl}
                  fmt={fmt}
                  layers={chartVisibility}
                />
              </div>
            )}

            <div className="card">
              <div className="card-title">Key <span className="accent">Results Table</span></div>
              <div className="results-table-wrap">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>x ({du.length})</th>
                      <th>V ({du.force})</th>
                      <th>M ({du.moment})</th>
                      <th>&delta; ({du.deflection})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyPoints.map((kp, i) => {
                      const tags = extremeTags(kp.x)
                      return (
                        <tr key={i} className={tags.length ? 'highlight' : ''}>
                          <td>
                            {fmtL(kp.x)}
                            {tags.length > 0 && <span className="tag">{tags.join(' · ')}</span>}
                          </td>
                          <td>{fmtF(kp.V)}</td>
                          <td>{fmtM(kp.M)}</td>
                          <td>{fmtD(kp.delta, deflDecimals)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="chart-caption">
                Highlighted rows mark the governing extremes: V<sub>max</sub>/V<sub>min</sub>, M<sub>max</sub>/M<sub>min</sub> and &delta;<sub>max</sub>.
              </p>
            </div>

            <div className="card">
              <div className="collapsible-header" onClick={() => setHandCalcOpen((v) => !v)}>
                <div className="card-title" style={{ marginBottom: 0 }}>Hand <span className="accent">Calculations</span></div>
                <span className="collapsible-toggle">{handCalcOpen ? '−' : '+'}</span>
              </div>
              <div className={`hand-calc-body${handCalcOpen ? '' : ' collapsed'}`}>
                <div className="hand-calc-step">
                  <div className="step-title">1. Applied Loads (after factoring)</div>
                  <div className="step-eq">
                    <div>&Sigma;F (point loads) = {fmtF(hcTotalPoint)} {du.force}</div>
                    <div>&Sigma;F (UDL + trapezoidal) = {fmtF(hcTotalUdl + hcTotalTrap)} {du.force}</div>
                    <div>W = &Sigma;F = {fmtF(hcTotalLoad)} {du.force}</div>
                    {factoredMoments.length > 0 && <div>&Sigma;M<sub>applied</sub> (CCW +) = {fmtM(hcSignedMoments)} {du.moment}</div>}
                  </div>
                </div>

                <div className="hand-calc-step">
                  <div className="step-title">2. Reactions (statics)</div>
                  <div className="step-eq">
                    {beamType === 'simply-supported' && (
                      <>
                        <div>&Sigma;M<sub>A</sub> = 0 &rarr; R_B = [&Sigma;(load &times; arm) + &Sigma;M<sub>applied</sub>] / L = {fmtF(reactions.RB)} {du.force}</div>
                        <div>&Sigma;F_y = 0 &rarr; R_A = W &minus; R_B = {fmtF(hcTotalLoad)} &minus; {fmtF(reactions.RB)} = {fmtF(reactions.RA)} {du.force}</div>
                      </>
                    )}
                    {beamType === 'cantilever' && (
                      <>
                        <div>&Sigma;F_y = 0 &rarr; R_A = W = {fmtF(reactions.RA)} {du.force}</div>
                        <div>&Sigma;M<sub>A</sub> = 0 &rarr; M_A = &Sigma;(load &times; arm) + &Sigma;M<sub>applied</sub> = {fmtM(reactions.MA)} {du.moment}</div>
                      </>
                    )}
                    {beamType === 'fixed-fixed' && (
                      <>
                        <div>Fixed-end moments (superposition over all loads):</div>
                        <div>&nbsp;&nbsp;M_A = {fmtM(reactions.MA)} {du.moment}, &nbsp; M_B = {fmtM(reactions.MB)} {du.moment}</div>
                        <div>R_A = R_A,simple + (M_A &minus; M_B) / L = {fmtF(reactions.RA)} {du.force}</div>
                        <div>R_B = R_B,simple &minus; (M_A &minus; M_B) / L = {fmtF(reactions.RB)} {du.force}</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="hand-calc-step">
                  <div className="step-title">3. Internal Forces</div>
                  <div className="step-eq">
                    <div>V(x), M(x) obtained by integrating equilibrium along the span (see diagrams above)</div>
                    <div>V<sub>max</sub> = {fmtF(maxShear.value)} {du.force} @ x = {fmtL(maxShear.x)}{du.length}, &nbsp; V<sub>min</sub> = {fmtF(minShear.value)} {du.force} @ x = {fmtL(minShear.x)}{du.length}</div>
                    <div>M<sub>max</sub> = {fmtM(maxMoment.value)} {du.moment} @ x = {fmtL(maxMoment.x)}{du.length}, &nbsp; M<sub>min</sub> = {fmtM(minMoment.value)} {du.moment} @ x = {fmtL(minMoment.x)}{du.length}</div>
                  </div>
                </div>

                <div className="hand-calc-step">
                  <div className="step-title">4. Deflection</div>
                  <div className="step-eq">
                    <div>&delta;(x) = &minus;&int;&int; [M(x)/EI] dx dx, &nbsp; with E = {fmt(effectiveE, 2)} {u.E}, I = {fmt(effectiveI, 2)} {u.I}</div>
                    <div>
                      Boundary conditions:{' '}
                      {beamType === 'simply-supported' && 'y(0) = 0, y(L) = 0'}
                      {beamType === 'cantilever' && "y(0) = 0, y'(0) = 0"}
                      {beamType === 'fixed-fixed' && "y(0) = y'(0) = y(L) = y'(L) = 0 — M_A, M_B already included in M(x)"}
                    </div>
                    <div>
                      &delta;<sub>max</sub> = {fmtD(maxDeflection.value, deflDecimals)} {du.deflection} @ x = {fmtL(maxDeflection.x)}{du.length}
                      {deflRatio !== null && <> &nbsp; (L / &delta; = {deflRatio})</>}
                    </div>
                  </div>
                </div>

                {activeSection && stressResults && stressLimit !== null && (
                  <div className="hand-calc-step">
                    <div className="step-title">5. Stress Check</div>
                    <div className="step-eq">
                      <div>&sigma; = M<sub>max</sub> &times; (h/2) / I = {fmt(stressResults.maxNormalStress, units === 'SI' ? 1 : 2)} {u.stress} @ x = {fmtL(stressResults.position)}{du.length}</div>
                      <div>&tau;<sub>max</sub> = {activeSection.shape === 'rectangular' ? '1.5 V / A' : 'V / (t_w · h)'} = {fmt(stressResults.maxShearStress, units === 'SI' ? 2 : 3)} {u.stress}</div>
                      <div>
                        Limit: {activeSection.material === 'steel' ? 'f_y' : '0.45 f_ck'} = {fmt(stressLimit, units === 'SI' ? 1 : 2)} {u.stress} &rarr;{' '}
                        <span className={`pass-fail ${stressPass ? 'pass' : 'fail'}`}>{stressPass ? 'PASS' : 'FAIL'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  )
}

function BeamTypeIcon({ type }: { type: BeamType }) {
  const leftFixed = type !== 'simply-supported'
  const rightFixed = type === 'fixed-fixed'
  return (
    <svg viewBox="0 0 80 36" width="60" height="27">
      <line x1="10" y1="14" x2="70" y2="14" stroke="#888" strokeWidth="2.5" strokeLinecap="round" />
      {leftFixed ? (
        <>
          <line x1="10" y1="3" x2="10" y2="25" stroke="#cc0000" strokeWidth="3" />
          {[-1, 0, 1].map((i) => (
            <line key={i} x1="10" y1={14 + i * 7} x2="3" y2={14 + i * 7 + 7} stroke="#555" strokeWidth="1.5" />
          ))}
        </>
      ) : (
        <polygon points="4,28 16,28 10,14" fill="none" stroke="#cc0000" strokeWidth="1.5" />
      )}
      {rightFixed ? (
        <>
          <line x1="70" y1="3" x2="70" y2="25" stroke="#cc0000" strokeWidth="3" />
          {[-1, 0, 1].map((i) => (
            <line key={i} x1="70" y1={14 + i * 7} x2="77" y2={14 + i * 7 + 7} stroke="#555" strokeWidth="1.5" />
          ))}
        </>
      ) : type === 'simply-supported' ? (
        <>
          <polygon points="64,26 76,26 70,14" fill="none" stroke="#cc0000" strokeWidth="1.5" />
          <circle cx="66" cy="30" r="2" fill="none" stroke="#cc0000" strokeWidth="1.5" />
          <circle cx="74" cy="30" r="2" fill="none" stroke="#cc0000" strokeWidth="1.5" />
        </>
      ) : null}
    </svg>
  )
}
