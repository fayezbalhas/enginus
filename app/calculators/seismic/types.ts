export type DesignCode = 'EC8' | 'ASCE7'
export type UnitSystem = 'SI' | 'Imperial'
export type PeriodMethod = 'approximate' | 'rayleigh'

export interface StepItem {
  clause: string
  description: string
  formula: string
  substitution: string
  result: string
}

// ── EC8 Ground Types (EN 1998-1 Table 3.1) ─────────────────────────────────

export interface EC8GroundType {
  label: string
  S: number
  TB: number
  TC: number
  TD: number
  description: string
}

export const EC8_GROUND_TYPES: EC8GroundType[] = [
  { label: 'A', S: 1.0,  TB: 0.15, TC: 0.4, TD: 2.0, description: 'Rock or rock-like' },
  { label: 'B', S: 1.2,  TB: 0.15, TC: 0.5, TD: 2.0, description: 'Very dense sand, gravel' },
  { label: 'C', S: 1.15, TB: 0.20, TC: 0.6, TD: 2.0, description: 'Dense or medium-dense sand' },
  { label: 'D', S: 1.35, TB: 0.20, TC: 0.8, TD: 2.0, description: 'Loose-to-medium cohesionless soil' },
  { label: 'E', S: 1.4,  TB: 0.15, TC: 0.5, TD: 2.0, description: 'Surface alluvium over rock' },
]

// ── EC8 Building Use / Importance (EN 1998-1 Table 4.3) ─────────────────────

export interface BuildingUse {
  label: string
  gammaI_EC8: number
  Ie_ASCE7: number
}

export const BUILDING_USES: BuildingUse[] = [
  { label: 'Residential',        gammaI_EC8: 1.0,  Ie_ASCE7: 1.0 },
  { label: 'Office',             gammaI_EC8: 1.0,  Ie_ASCE7: 1.0 },
  { label: 'Commercial',         gammaI_EC8: 1.0,  Ie_ASCE7: 1.0 },
  { label: 'Industrial',         gammaI_EC8: 1.2,  Ie_ASCE7: 1.25 },
  { label: 'Hospital / Essential', gammaI_EC8: 1.4, Ie_ASCE7: 1.5 },
]

// ── EC8 Structural Systems ──────────────────────────────────────────────────

export interface EC8System {
  label: string
  q_default: number
  Ct: number
  description: string
}

export const EC8_SYSTEMS: EC8System[] = [
  { label: 'Moment frame (steel)',    q_default: 6.5, Ct: 0.085, description: 'DCH steel MRF' },
  { label: 'Moment frame (concrete)', q_default: 5.85, Ct: 0.075, description: 'DCH concrete MRF' },
  { label: 'Shear wall (concrete)',   q_default: 4.4, Ct: 0.075, description: 'DCH concrete wall' },
  { label: 'Dual system',             q_default: 5.85, Ct: 0.075, description: 'Frame + wall' },
  { label: 'Braced frame',            q_default: 4.0, Ct: 0.050, description: 'Concentrically braced' },
  { label: 'Inverted pendulum',       q_default: 2.0, Ct: 0.050, description: 'Inverted pendulum' },
]

// ── ASCE 7-22 Site Classes ──────────────────────────────────────────────────

export interface ASCESiteClass {
  label: string
  description: string
}

export const ASCE_SITE_CLASSES: ASCESiteClass[] = [
  { label: 'A', description: 'Hard rock' },
  { label: 'B', description: 'Rock' },
  { label: 'C', description: 'Very dense soil / soft rock' },
  { label: 'D', description: 'Stiff soil (default)' },
  { label: 'E', description: 'Soft clay soil' },
  { label: 'F', description: 'Site-specific required' },
]

// ── ASCE 7-22 Structural Systems (Table 12.2-1) ────────────────────────────

export interface ASCESystem {
  label: string
  R: number
  Omega0: number
  Cd: number
  Ct: number
  x: number
}

export const ASCE_SYSTEMS: ASCESystem[] = [
  { label: 'Special moment frame (steel)',   R: 8,    Omega0: 3.0, Cd: 5.5,  Ct: 0.028, x: 0.8 },
  { label: 'Special moment frame (concrete)', R: 8,   Omega0: 3.0, Cd: 5.5,  Ct: 0.016, x: 0.9 },
  { label: 'Ordinary moment frame',          R: 3.5,  Omega0: 3.0, Cd: 3.0,  Ct: 0.016, x: 0.9 },
  { label: 'Special reinforced shear wall',  R: 5,    Omega0: 2.5, Cd: 5.0,  Ct: 0.02,  x: 0.75 },
  { label: 'Ordinary reinforced shear wall', R: 4,    Omega0: 2.5, Cd: 4.0,  Ct: 0.02,  x: 0.75 },
  { label: 'Special CBF',                    R: 6,    Omega0: 2.0, Cd: 5.0,  Ct: 0.02,  x: 0.75 },
  { label: 'Ordinary CBF',                   R: 3.25, Omega0: 2.0, Cd: 3.25, Ct: 0.02,  x: 0.75 },
  { label: 'EBF',                            R: 8,    Omega0: 2.0, Cd: 4.0,  Ct: 0.02,  x: 0.75 },
]

// ── Floor data ──────────────────────────────────────────────────────────────

export interface FloorData {
  weight: number  // kN or kip
  height: number  // m or ft (cumulative from base)
}

// ── Result interfaces ───────────────────────────────────────────────────────

export interface FloorForce {
  floor: number
  zi: number
  wi: number
  Cvx: number
  Fi: number
  Vi: number  // story shear (cumulative from top)
}

export interface SeismicResult {
  T1: number
  Se_T1: number
  Sd_T1: number
  baseShear: number
  W_total: number
  Cs: number   // base shear coefficient (V/W)
  lambda: number
  floors: FloorForce[]
  spectrumPoints: { T: number; Se: number; Sd: number }[]
  steps_period: StepItem[]
  steps_spectrum: StepItem[]
  steps_baseShear: StepItem[]
  steps_distribution: StepItem[]
}

// ── Utility ─────────────────────────────────────────────────────────────────

export function fmt(v: number, dp: number = 2): string { return v.toFixed(dp) }

// ── ASCE 7 Site Coefficients (simplified tables) ────────────────────────────

export function getFa(siteClass: string, Ss: number): number {
  if (siteClass === 'A') return 0.8
  if (siteClass === 'B') return 1.0
  if (siteClass === 'C') {
    if (Ss <= 0.25) return 1.2
    if (Ss <= 0.5) return 1.2
    if (Ss <= 0.75) return 1.1
    if (Ss <= 1.0) return 1.0
    return 1.0
  }
  if (siteClass === 'D') {
    if (Ss <= 0.25) return 1.6
    if (Ss <= 0.5) return 1.4
    if (Ss <= 0.75) return 1.2
    if (Ss <= 1.0) return 1.1
    if (Ss <= 1.25) return 1.0
    return 1.0
  }
  if (siteClass === 'E') {
    if (Ss <= 0.25) return 2.5
    if (Ss <= 0.5) return 1.7
    if (Ss <= 0.75) return 1.2
    if (Ss <= 1.0) return 0.9
    return 0.9
  }
  // F: site-specific
  return 1.0
}

export function getFv(siteClass: string, S1: number): number {
  if (siteClass === 'A') return 0.8
  if (siteClass === 'B') return 1.0
  if (siteClass === 'C') {
    if (S1 <= 0.1) return 1.7
    if (S1 <= 0.2) return 1.6
    if (S1 <= 0.3) return 1.5
    if (S1 <= 0.4) return 1.4
    if (S1 <= 0.5) return 1.3
    return 1.3
  }
  if (siteClass === 'D') {
    if (S1 <= 0.1) return 2.4
    if (S1 <= 0.2) return 2.0
    if (S1 <= 0.3) return 1.8
    if (S1 <= 0.4) return 1.6
    if (S1 <= 0.5) return 1.5
    return 1.5
  }
  if (siteClass === 'E') {
    if (S1 <= 0.1) return 3.5
    if (S1 <= 0.2) return 3.2
    if (S1 <= 0.3) return 2.8
    if (S1 <= 0.4) return 2.4
    if (S1 <= 0.5) return 2.4
    return 2.4
  }
  // F: site-specific
  return 1.0
}
