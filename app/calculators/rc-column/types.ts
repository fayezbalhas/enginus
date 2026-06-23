export type DesignCode = 'EC2' | 'ACI'
export type UnitSystem = 'SI' | 'Imperial'
export type LimitState = 'ULS' | 'Slenderness' | 'Biaxial'
export type ColumnType = 'rectangular' | 'circular'

export interface ConcreteClass { label: string; fck: number; fctm: number; Ecm: number }
export interface SteelClass { label: string; fyk: number }
export interface ExposureClass { label: string; description: string; cmin_dur: number }
export interface AciConcreteOption { label: string; fc: number }
export interface AciSteelOption { label: string; fy: number }
export interface AciExposureOption { label: string; cover: number }

export interface StepItem {
  clause: string
  description: string
  formula: string
  substitution: string
  result: string
}

export interface InteractionPoint { N: number; M: number }

export interface SlendernessResult {
  lambda: number; lambda_lim: number; is_slender: boolean
  i: number; leff: number; steps: StepItem[]
}

export interface SecondOrderResult {
  M2: number; e2: number; MEd_total: number; NB: number
  Kr: number; Kphi: number; steps: StepItem[]
}

export interface InteractionResult {
  curve: InteractionPoint[]
  NEd: number; MEd: number; pass: boolean; utilization: number
  steps: StepItem[]
}

export interface BiaxialResult {
  check_value: number; exponent_a: number; pass: boolean; steps: StepItem[]
}

export interface ReinfResult {
  As_total: number; As_min: number; As_max: number; rho: number
  pass_min: boolean; pass_max: boolean; steps: StepItem[]
}

export interface LinkResult {
  dia_min: number; spacing_max: number
  pass_dia: boolean; pass_spacing: boolean; steps: StepItem[]
}

// ── Data Tables ───────────────────────────────────────────────────────────────

export const EC2_CONCRETE: ConcreteClass[] = [
  { label: 'C20/25', fck: 20, fctm: 2.2, Ecm: 30000 },
  { label: 'C25/30', fck: 25, fctm: 2.6, Ecm: 31000 },
  { label: 'C30/37', fck: 30, fctm: 2.9, Ecm: 33000 },
  { label: 'C35/45', fck: 35, fctm: 3.2, Ecm: 34000 },
  { label: 'C40/50', fck: 40, fctm: 3.5, Ecm: 35000 },
  { label: 'C45/55', fck: 45, fctm: 3.8, Ecm: 36000 },
  { label: 'C50/60', fck: 50, fctm: 4.1, Ecm: 37000 },
]

export const EC2_STEEL: SteelClass[] = [
  { label: 'B400S', fyk: 400 },
  { label: 'B500S', fyk: 500 },
  { label: 'B600S', fyk: 600 },
]

export const EC2_EXPOSURE: ExposureClass[] = [
  { label: 'XC1', description: 'Dry or permanently wet', cmin_dur: 15 },
  { label: 'XC2', description: 'Wet, rarely dry', cmin_dur: 25 },
  { label: 'XC3', description: 'Moderate humidity', cmin_dur: 25 },
  { label: 'XC4', description: 'Cyclic wet and dry', cmin_dur: 30 },
  { label: 'XD1', description: 'Moderate humidity + chlorides', cmin_dur: 40 },
  { label: 'XD2', description: 'Wet, rarely dry + chlorides', cmin_dur: 45 },
  { label: 'XD3', description: 'Cyclic wet/dry + chlorides', cmin_dur: 50 },
  { label: 'XS1', description: 'Exposed to airborne salt', cmin_dur: 40 },
  { label: 'XS2', description: 'Permanently submerged (sea)', cmin_dur: 45 },
  { label: 'XS3', description: 'Tidal, splash and spray zones', cmin_dur: 50 },
]

export const EC2_BAR_DIAMETERS = [12, 16, 20, 25, 32, 40]
export const EC2_BAR_LABELS = ['T12', 'T16', 'T20', 'T25', 'T32', 'T40']
export const EC2_LINK_DIAMETERS = [6, 8, 10]
export const EC2_LINK_LABELS = ['T6', 'T8', 'T10']

export const ACI_CONCRETE_SI: AciConcreteOption[] = [
  { label: '20 MPa', fc: 20 }, { label: '25 MPa', fc: 25 }, { label: '28 MPa', fc: 28 },
  { label: '30 MPa', fc: 30 }, { label: '35 MPa', fc: 35 }, { label: '40 MPa', fc: 40 },
]
export const ACI_CONCRETE_IMP: AciConcreteOption[] = [
  { label: '3000 psi', fc: 20.68 }, { label: '4000 psi', fc: 27.58 },
  { label: '5000 psi', fc: 34.47 }, { label: '6000 psi', fc: 41.37 },
]

export const ACI_STEEL: AciSteelOption[] = [
  { label: 'Grade 40 (280 MPa)', fy: 280 },
  { label: 'Grade 60 (420 MPa)', fy: 420 },
  { label: 'Grade 75 (520 MPa)', fy: 520 },
]

export const ACI_EXPOSURE: AciExposureOption[] = [
  { label: 'Not exposed to weather', cover: 40 },
  { label: 'Exposed to weather (#19 and smaller)', cover: 40 },
  { label: 'Exposed to weather (#22 and larger)', cover: 50 },
  { label: 'Cast against soil', cover: 75 },
]

export const ACI_BAR_DIAMETERS_MM = [12.7, 15.9, 19.1, 22.2, 25.4, 28.7, 32.3, 35.8]
export const ACI_BAR_LABELS = ['#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11']
export const ACI_TIE_DIAMETERS_MM = [9.5, 12.7]
export const ACI_TIE_LABELS = ['#3', '#4']

export const EFF_LEN_FACTORS = [
  { label: 'Fixed-Fixed: 0.5', value: 0.5 },
  { label: 'Fixed-Pin: 0.7', value: 0.7 },
  { label: 'Pin-Pin: 1.0', value: 1.0 },
  { label: 'Fixed-Free: 2.0', value: 2.0 },
]

export const BAR_COUNTS = [4, 6, 8, 10, 12, 14, 16, 20]

export function barArea(dia: number): number { return Math.PI * dia * dia / 4 }
export function fmt(v: number, dp: number = 2): string { return v.toFixed(dp) }

export function getBarPositions(
  colType: ColumnType, nBars: number, b: number, h: number, D: number, dPrime: number,
): { x: number; y: number }[] {
  if (colType === 'circular') {
    const r = D / 2 - dPrime
    if (r <= 0) return []
    return Array.from({ length: nBars }, (_, i) => {
      const a = (2 * Math.PI * i) / nBars - Math.PI / 2
      return { x: D / 2 + r * Math.cos(a), y: D / 2 + r * Math.sin(a) }
    })
  }

  if (nBars < 4) return []
  const pos: { x: number; y: number }[] = []
  const sideBars = nBars - 4
  const half = Math.round(sideBars / 2)
  const bI = b - 2 * dPrime
  const hI = h - 2 * dPrime
  const tot = bI + hI

  const nTM = tot > 0 ? Math.round(half * bI / tot) : Math.round(half / 2)
  const nRM = half - nTM < 0 ? 0 : half - nTM

  pos.push({ x: dPrime, y: dPrime })
  for (let i = 1; i <= nTM; i++) pos.push({ x: dPrime + i * bI / (nTM + 1), y: dPrime })
  pos.push({ x: b - dPrime, y: dPrime })
  for (let i = 1; i <= nRM; i++) pos.push({ x: b - dPrime, y: dPrime + i * hI / (nRM + 1) })
  pos.push({ x: b - dPrime, y: h - dPrime })
  for (let i = nTM; i >= 1; i--) pos.push({ x: dPrime + i * bI / (nTM + 1), y: h - dPrime })
  pos.push({ x: dPrime, y: h - dPrime })
  for (let i = nRM; i >= 1; i--) pos.push({ x: dPrime, y: dPrime + i * hI / (nRM + 1) })

  return pos
}

export function circularSegmentArea(R: number, a: number): { area: number; centroidFromTop: number } {
  if (a <= 0) return { area: 0, centroidFromTop: 0 }
  if (a >= 2 * R) return { area: Math.PI * R * R, centroidFromTop: R }
  const dc = R - a
  const theta = Math.acos(dc / R)
  const area = R * R * (theta - Math.sin(theta) * Math.cos(theta))
  if (area <= 0) return { area: 0, centroidFromTop: 0 }
  const yBar = (2 * R * Math.pow(Math.sin(theta), 3)) / (3 * (theta - Math.sin(theta) * Math.cos(theta)))
  return { area, centroidFromTop: R - yBar }
}
