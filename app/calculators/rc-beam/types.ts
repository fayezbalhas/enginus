export type DesignCode = 'EC2' | 'ACI'
export type UnitSystem = 'SI' | 'Imperial'
export type LimitState = 'ULS' | 'SLS_FR' | 'SLS_QP' | 'SLS_DEFLECTION'
export type SectionType = 'rectangular' | 'T-beam' | 'L-beam'
export type SupportCondition = 'simply_supported' | 'end_span' | 'interior_span' | 'cantilever'

export interface ConcreteClass { label: string; fck: number; fctm: number; Ecm: number }
export interface SteelClass { label: string; fyk: number }
export interface ExposureClass { label: string; description: string; cmin_dur: number; wmax: number }
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

export interface FlexureResult {
  K: number; Kbal: number; z: number; As_req: number; As_min: number; As_max: number
  As_prov: number; xd_ratio: number; x: number
  pass_flexure: boolean; pass_min: boolean; pass_max: boolean; pass_xd: boolean
  steps: StepItem[]
  doubly_reinforced: boolean
  As2_req: number
  a?: number; c?: number; eps_t?: number; phi_Mn?: number; tension_controlled?: boolean
}

export interface ShearResult {
  VRd_c: number; shear_reinf_required: boolean
  Asw_s_req: number; Asw_s_prov: number; VRd_max: number
  pass_shear: boolean; pass_max_shear: boolean; pass_min_stirrups: boolean
  s_max: number
  steps: StepItem[]
  Vc?: number; phi_Vc?: number; Vs_req?: number
}

export interface CrackResult {
  wk: number; wmax: number; sr_max: number; eps_diff: number; sigma_s: number
  pass_crack: boolean; steps: StepItem[]
  s_max?: number; s_prov?: number
}

export interface DeflectionResult {
  allowable_ratio: number; actual_ratio: number
  pass_deflection: boolean; steps: StepItem[]
  h_min?: number; h_actual?: number
}

export interface BarScheduleItem {
  label: string; count: number; dia: number; As_prov: number; sufficient: boolean
}

export interface RebarLayer {
  diameter: number
  count: number
  diaIdx: number
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
  { label: 'XC1', description: 'Dry or permanently wet', cmin_dur: 15, wmax: 0.4 },
  { label: 'XC2', description: 'Wet, rarely dry', cmin_dur: 25, wmax: 0.3 },
  { label: 'XC3', description: 'Moderate humidity', cmin_dur: 25, wmax: 0.3 },
  { label: 'XC4', description: 'Cyclic wet and dry', cmin_dur: 30, wmax: 0.3 },
  { label: 'XD1', description: 'Moderate humidity + chlorides', cmin_dur: 40, wmax: 0.3 },
  { label: 'XD2', description: 'Wet, rarely dry + chlorides', cmin_dur: 45, wmax: 0.3 },
  { label: 'XD3', description: 'Cyclic wet/dry + chlorides', cmin_dur: 50, wmax: 0.2 },
  { label: 'XS1', description: 'Exposed to airborne salt', cmin_dur: 40, wmax: 0.3 },
  { label: 'XS2', description: 'Permanently submerged (sea)', cmin_dur: 45, wmax: 0.3 },
  { label: 'XS3', description: 'Tidal, splash and spray zones', cmin_dur: 50, wmax: 0.2 },
]

export const STRUCTURAL_CLASSES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
export const STRUCTURAL_CLASS_DELTA = [-1, -1, 0, 0, 1, 2]

export const EC2_BAR_DIAMETERS = [6, 8, 10, 12, 16, 20, 25, 32, 40]
export const EC2_BAR_LABELS = ['Ø6', 'Ø8', 'Ø10', 'Ø12', 'Ø16', 'Ø20', 'Ø25', 'Ø32', 'Ø40']
export const EC2_STIRRUP_DIAMETERS = [6, 8, 10, 12]
export const EC2_STIRRUP_LABELS = ['Ø6', 'Ø8', 'Ø10', 'Ø12']

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

export const ACI_BAR_DIAMETERS_MM = [9.5, 12.7, 15.9, 19.1, 22.2, 25.4, 28.7, 32.3, 35.8, 43.0, 57.3]
export const ACI_BAR_LABELS = ['#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11', '#13', '#18']
export const ACI_STIRRUP_DIAMETERS_MM = [9.5, 12.7, 15.9]
export const ACI_STIRRUP_LABELS = ['#3', '#4', '#5']

export function barArea(dia: number): number { return Math.PI * dia * dia / 4 }
export function fmt(v: number, dp: number = 2): string { return v.toFixed(dp) }

export function getKFactor(support: SupportCondition): number {
  switch (support) {
    case 'simply_supported': return 1.0
    case 'end_span': return 1.3
    case 'interior_span': return 1.5
    case 'cantilever': return 0.4
  }
}

export function getAciMinThickness(support: SupportCondition, L_mm: number): number {
  switch (support) {
    case 'simply_supported': return L_mm / 16
    case 'end_span': return L_mm / 18.5
    case 'interior_span': return L_mm / 21
    case 'cantilever': return L_mm / 8
  }
}
