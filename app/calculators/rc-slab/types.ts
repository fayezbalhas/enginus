export type DesignCode = 'EC2' | 'ACI'
export type UnitSystem = 'SI' | 'Imperial'
export type LimitState = 'ULS' | 'SLS_FR' | 'SLS_QP' | 'SLS_DEFLECTION'
export type SlabType = 'one-way' | 'two-way'
export type SupportCondition = 'simply_supported' | 'one_end_continuous' | 'both_ends_continuous' | 'cantilever'
export type PanelType = 'interior' | 'edge' | 'corner' | 'cantilever'
export type EdgeCondition = 'free' | 'simply_supported' | 'continuous'

export interface StepItem {
  clause: string
  description: string
  formula: string
  substitution: string
  result: string
}

export interface ConcreteClass { label: string; fck: number; fctm: number; Ecm: number }
export interface SteelClass { label: string; fyk: number }
export interface ExposureClass { label: string; description: string; cmin_dur: number; wmax: number }
export interface AciConcreteOption { label: string; fc: number }
export interface AciSteelOption { label: string; fy: number }
export interface AciExposureOption { label: string; cover: number }

export interface SlabFlexureResult {
  MEd_x: number
  MEd_y: number
  MEd_x_neg: number
  MEd_y_neg: number
  As_req_x: number
  As_req_y: number
  As_req_x_neg: number
  As_req_y_neg: number
  As_min_x: number
  As_min_y: number
  As_max: number
  As_prov_x: number
  As_prov_y: number
  dx: number
  dy: number
  K_x: number
  z_x: number
  K_y: number
  z_y: number
  pass_flexure_x: boolean
  pass_flexure_y: boolean
  pass_min_x: boolean
  pass_min_y: boolean
  pass_max_x: boolean
  pass_max_y: boolean
  steps: StepItem[]
}

export interface SlabShearResult {
  VEd: number
  VRd_c: number
  pass_shear: boolean
  steps: StepItem[]
  Vc?: number
  phi_Vc?: number
}

export interface SlabDeflectionResult {
  allowable_ratio: number
  actual_ratio: number
  pass_deflection: boolean
  steps: StepItem[]
  h_min?: number
}

export interface SlabCrackResult {
  wk: number
  wmax: number
  sr_max: number
  sigma_s: number
  pass_crack: boolean
  steps: StepItem[]
  s_prov?: number
  s_max?: number
}

export interface SlabSpacingResult {
  s_prov_x: number
  s_prov_y: number
  s_max_main: number
  s_max_secondary: number
  pass_x: boolean
  pass_y: boolean
  steps: StepItem[]
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

export const EC2_SLAB_BAR_DIAMETERS = [8, 10, 12, 16, 20]
export const EC2_SLAB_BAR_LABELS = ['T8', 'T10', 'T12', 'T16', 'T20']

export const ACI_SLAB_BAR_DIAMETERS_MM = [9.5, 12.7, 15.9, 19.1]
export const ACI_SLAB_BAR_LABELS = ['#3', '#4', '#5', '#6']

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
  { label: 'Not exposed to weather', cover: 20 },
  { label: 'Exposed to weather (#16 and smaller)', cover: 40 },
  { label: 'Exposed to weather (#19 and larger)', cover: 50 },
  { label: 'Cast against soil', cover: 75 },
]

export function barArea(dia: number): number { return Math.PI * dia * dia / 4 }
export function fmt(v: number, dp: number = 2): string { return v.toFixed(dp) }

export function areaPerMeter(dia: number, spacing: number): number {
  return barArea(dia) * (1000 / spacing)
}

// EC2/BS 8110 Two-way slab moment coefficients
// Simply supported on all four edges
export const SIMPLY_SUPPORTED_COEFFS: { ratio: number; asx: number; asy: number }[] = [
  { ratio: 1.0, asx: 0.062, asy: 0.062 },
  { ratio: 1.1, asx: 0.074, asy: 0.061 },
  { ratio: 1.2, asx: 0.084, asy: 0.059 },
  { ratio: 1.3, asx: 0.093, asy: 0.055 },
  { ratio: 1.4, asx: 0.099, asy: 0.051 },
  { ratio: 1.5, asx: 0.104, asy: 0.046 },
  { ratio: 1.75, asx: 0.113, asy: 0.037 },
  { ratio: 2.0, asx: 0.118, asy: 0.029 },
]

// BS 8110 Table 3.14 restrained slab coefficients
// [case][0]=short span positive, [case][1]=short span negative, [case][2]=long span positive, [case][3]=long span negative
// For each ly/lx ratio
export interface RestrainedCoeffs {
  ratio: number
  bsx_pos: number; bsx_neg: number
  bsy_pos: number; bsy_neg: number
}

// Case 1: Interior panel (4 edges continuous)
export const RESTRAINED_CASE1: RestrainedCoeffs[] = [
  { ratio: 1.0, bsx_pos: 0.024, bsx_neg: 0.031, bsy_pos: 0.024, bsy_neg: 0.031 },
  { ratio: 1.1, bsx_pos: 0.028, bsx_neg: 0.037, bsy_pos: 0.024, bsy_neg: 0.031 },
  { ratio: 1.2, bsx_pos: 0.032, bsx_neg: 0.042, bsy_pos: 0.024, bsy_neg: 0.031 },
  { ratio: 1.3, bsx_pos: 0.035, bsx_neg: 0.046, bsy_pos: 0.024, bsy_neg: 0.031 },
  { ratio: 1.4, bsx_pos: 0.037, bsx_neg: 0.050, bsy_pos: 0.024, bsy_neg: 0.031 },
  { ratio: 1.5, bsx_pos: 0.040, bsx_neg: 0.053, bsy_pos: 0.024, bsy_neg: 0.031 },
  { ratio: 1.75, bsx_pos: 0.044, bsx_neg: 0.059, bsy_pos: 0.024, bsy_neg: 0.031 },
  { ratio: 2.0, bsx_pos: 0.048, bsx_neg: 0.063, bsy_pos: 0.024, bsy_neg: 0.031 },
]

// Case 2: One short edge discontinuous
export const RESTRAINED_CASE2: RestrainedCoeffs[] = [
  { ratio: 1.0, bsx_pos: 0.029, bsx_neg: 0.037, bsy_pos: 0.029, bsy_neg: 0.037 },
  { ratio: 1.1, bsx_pos: 0.033, bsx_neg: 0.044, bsy_pos: 0.029, bsy_neg: 0.037 },
  { ratio: 1.2, bsx_pos: 0.037, bsx_neg: 0.049, bsy_pos: 0.029, bsy_neg: 0.037 },
  { ratio: 1.3, bsx_pos: 0.040, bsx_neg: 0.053, bsy_pos: 0.029, bsy_neg: 0.037 },
  { ratio: 1.4, bsx_pos: 0.043, bsx_neg: 0.057, bsy_pos: 0.029, bsy_neg: 0.037 },
  { ratio: 1.5, bsx_pos: 0.045, bsx_neg: 0.060, bsy_pos: 0.029, bsy_neg: 0.037 },
  { ratio: 1.75, bsx_pos: 0.049, bsx_neg: 0.065, bsy_pos: 0.029, bsy_neg: 0.037 },
  { ratio: 2.0, bsx_pos: 0.052, bsx_neg: 0.069, bsy_pos: 0.029, bsy_neg: 0.037 },
]

// Case 3: One long edge discontinuous
export const RESTRAINED_CASE3: RestrainedCoeffs[] = [
  { ratio: 1.0, bsx_pos: 0.029, bsx_neg: 0.037, bsy_pos: 0.029, bsy_neg: 0.037 },
  { ratio: 1.1, bsx_pos: 0.034, bsx_neg: 0.044, bsy_pos: 0.029, bsy_neg: 0.037 },
  { ratio: 1.2, bsx_pos: 0.039, bsx_neg: 0.051, bsy_pos: 0.028, bsy_neg: 0.036 },
  { ratio: 1.3, bsx_pos: 0.043, bsx_neg: 0.056, bsy_pos: 0.028, bsy_neg: 0.036 },
  { ratio: 1.4, bsx_pos: 0.047, bsx_neg: 0.061, bsy_pos: 0.027, bsy_neg: 0.035 },
  { ratio: 1.5, bsx_pos: 0.050, bsx_neg: 0.065, bsy_pos: 0.027, bsy_neg: 0.035 },
  { ratio: 1.75, bsx_pos: 0.055, bsx_neg: 0.072, bsy_pos: 0.026, bsy_neg: 0.034 },
  { ratio: 2.0, bsx_pos: 0.058, bsx_neg: 0.076, bsy_pos: 0.025, bsy_neg: 0.033 },
]

// Case 4: Two adjacent edges discontinuous (corner panel)
export const RESTRAINED_CASE4: RestrainedCoeffs[] = [
  { ratio: 1.0, bsx_pos: 0.033, bsx_neg: 0.044, bsy_pos: 0.033, bsy_neg: 0.044 },
  { ratio: 1.1, bsx_pos: 0.039, bsx_neg: 0.051, bsy_pos: 0.033, bsy_neg: 0.044 },
  { ratio: 1.2, bsx_pos: 0.044, bsx_neg: 0.058, bsy_pos: 0.033, bsy_neg: 0.043 },
  { ratio: 1.3, bsx_pos: 0.048, bsx_neg: 0.063, bsy_pos: 0.032, bsy_neg: 0.043 },
  { ratio: 1.4, bsx_pos: 0.052, bsx_neg: 0.068, bsy_pos: 0.032, bsy_neg: 0.042 },
  { ratio: 1.5, bsx_pos: 0.055, bsx_neg: 0.073, bsy_pos: 0.031, bsy_neg: 0.041 },
  { ratio: 1.75, bsx_pos: 0.060, bsx_neg: 0.079, bsy_pos: 0.030, bsy_neg: 0.039 },
  { ratio: 2.0, bsx_pos: 0.063, bsx_neg: 0.083, bsy_pos: 0.029, bsy_neg: 0.038 },
]

export function interpolateCoeffs(table: { ratio: number; asx?: number; asy?: number; bsx_pos?: number; bsx_neg?: number; bsy_pos?: number; bsy_neg?: number }[], ly_lx: number, field: string): number {
  const r = Math.min(Math.max(ly_lx, 1.0), 2.0)
  for (let i = 0; i < table.length - 1; i++) {
    if (r >= table[i].ratio && r <= table[i + 1].ratio) {
      const t = (r - table[i].ratio) / (table[i + 1].ratio - table[i].ratio)
      const v0 = (table[i] as Record<string, number>)[field] ?? 0
      const v1 = (table[i + 1] as Record<string, number>)[field] ?? 0
      return v0 + t * (v1 - v0)
    }
  }
  return (table[table.length - 1] as Record<string, number>)[field] ?? 0
}

export function getRestrainedTable(panelType: PanelType): RestrainedCoeffs[] {
  switch (panelType) {
    case 'interior': return RESTRAINED_CASE1
    case 'edge': return RESTRAINED_CASE2
    case 'corner': return RESTRAINED_CASE4
    default: return RESTRAINED_CASE3
  }
}

// EC2 deflection K factors for slabs
export function getSlabKFactor(support: SupportCondition): number {
  switch (support) {
    case 'simply_supported': return 1.0
    case 'one_end_continuous': return 1.3
    case 'both_ends_continuous': return 1.5
    case 'cantilever': return 0.4
  }
}

// ACI minimum slab thickness (Table 9.5.2.1 for one-way, Table 8.3.1.1 for two-way)
export function getAciMinSlabThickness(support: SupportCondition, L_mm: number): number {
  switch (support) {
    case 'simply_supported': return L_mm / 20
    case 'one_end_continuous': return L_mm / 24
    case 'both_ends_continuous': return L_mm / 28
    case 'cantilever': return L_mm / 10
  }
}

// EN 1990 combination factors
export const PSI_FACTORS: { category: string; psi0: number; psi1: number; psi2: number }[] = [
  { category: 'A — Domestic/Residential', psi0: 0.7, psi1: 0.5, psi2: 0.3 },
  { category: 'B — Office', psi0: 0.7, psi1: 0.5, psi2: 0.3 },
  { category: 'C — Congregation', psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  { category: 'D — Shopping', psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  { category: 'E — Storage', psi0: 1.0, psi1: 0.9, psi2: 0.8 },
  { category: 'F — Traffic (<30 kN)', psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  { category: 'H — Roofs', psi0: 0.7, psi1: 0.0, psi2: 0.0 },
]

// ACI moment coefficients for one-way slabs (ACI 6.5)
export interface AciMomentCoeffs {
  label: string
  positive_end_unrestrained: number
  positive_end_integral: number
  positive_interior: number
  negative_ext_unrestrained: number
  negative_ext_integral: number
  negative_interior_2spans: number
  negative_interior_3plus: number
}
