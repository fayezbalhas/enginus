export type DesignCode = 'EC1' | 'ASCE7'
export type UnitSystem = 'SI' | 'Imperial'

export interface StepItem {
  clause: string
  description: string
  formula: string
  substitution: string
  result: string
}

// ── EC1 Terrain Categories ───────────────────────────────────────────────────

export interface EC1TerrainCategory {
  label: string
  description: string
  z0: number    // roughness length (m)
  zmin: number  // minimum height (m)
  kr: number    // terrain factor
}

export const EC1_TERRAIN: EC1TerrainCategory[] = [
  { label: '0', description: 'Sea / coastal area', z0: 0.003, zmin: 1, kr: 0.156 },
  { label: 'I', description: 'Lakes / flat country', z0: 0.01, zmin: 1, kr: 0.17 },
  { label: 'II', description: 'Farmland with hedges', z0: 0.05, zmin: 2, kr: 0.19 },
  { label: 'III', description: 'Suburban / industrial', z0: 0.3, zmin: 5, kr: 0.215 },
  { label: 'IV', description: 'Urban centres', z0: 1.0, zmin: 10, kr: 0.234 },
]

// ── ASCE 7 Exposure Categories ───────────────────────────────────────────────

export interface ASCE7Exposure {
  label: string
  description: string
  alpha: number
  zg: number  // gradient height in metres
}

export const ASCE7_EXPOSURES: ASCE7Exposure[] = [
  { label: 'B', description: 'Urban / suburban', alpha: 7.0, zg: 365.76 },
  { label: 'C', description: 'Open terrain', alpha: 9.5, zg: 274.32 },
  { label: 'D', description: 'Flat / unobstructed water', alpha: 11.5, zg: 213.36 },
]

// ── ASCE 7 Risk Categories ──────────────────────────────────────────────────

export interface RiskCategory {
  label: string
  description: string
}

export const ASCE7_RISK: RiskCategory[] = [
  { label: 'I', description: 'Low hazard to human life' },
  { label: 'II', description: 'Standard occupancy (default)' },
  { label: 'III', description: 'Substantial hazard' },
  { label: 'IV', description: 'Essential facilities' },
]

// ── EC1 Pressure Coefficients ────────────────────────────────────────────────

export function getEC1CpeLeeward(hd: number): number {
  // cpe,10 for leeward wall (zone E) per EC1 Table 7.1
  if (hd <= 0.25) return -0.7
  if (hd >= 5) return -0.7
  if (hd <= 1) {
    // interpolate between h/d=0.25 (-0.7) and h/d=1 (-0.5)
    return -0.7 + (hd - 0.25) / (1 - 0.25) * (-0.5 - (-0.7))
  }
  // interpolate between h/d=1 (-0.5) and h/d=5 (-0.7)
  return -0.5 + (hd - 1) / (5 - 1) * (-0.7 - (-0.5))
}

export const EC1_CPE_WINDWARD = 0.8
export const EC1_CPE_SIDE_A = -1.2
export const EC1_CPE_SIDE_B = -0.8

// ── ASCE 7 Pressure Coefficients ────────────────────────────────────────────

export const ASCE7_CP_WINDWARD = 0.8

export function getASCE7CpLeeward(LB: number): number {
  // Cp leeward by L/B ratio per ASCE 7 Figure 27.3-1
  if (LB <= 1) return -0.5
  if (LB <= 2) return -0.5 + (LB - 1) / (2 - 1) * (-0.3 - (-0.5))
  if (LB <= 4) return -0.3 + (LB - 2) / (4 - 2) * (-0.2 - (-0.3))
  return -0.2
}

export const ASCE7_CP_SIDEWALL = -0.7

// ── Internal Pressure Coefficients ──────────────────────────────────────────

export type EC1Enclosure = 'closed' | 'dominant_opening'
export type ASCE7Enclosure = 'enclosed' | 'partially_enclosed'

export function getEC1Cpi(enclosure: EC1Enclosure): number {
  return enclosure === 'closed' ? 0.2 : 0.3
}

export function getASCE7GCpi(enclosure: ASCE7Enclosure): number {
  return enclosure === 'enclosed' ? 0.18 : 0.55
}

// ── Height Zone ─────────────────────────────────────────────────────────────

export interface HeightZone {
  zBot: number
  zTop: number
  zMid: number
  height: number  // zone height
  area: number    // zone area (height * width)
}

// ── Results ─────────────────────────────────────────────────────────────────

export interface ZonePressureResult {
  z: number            // height at zone mid
  qp: number           // peak velocity pressure (EC1) or velocity pressure qz (ASCE7)
  weWindward: number   // external windward pressure
  weLeeward: number    // external leeward pressure
  wNetWindward: number // net windward pressure (incl. internal)
  wNetLeeward: number  // net leeward pressure (incl. internal)
  forceWindward: number // force on windward zone
  forceLeeward: number  // force on leeward zone
  forceNet: number      // net force on zone
  area: number          // zone area
}

export interface WindResult {
  vb: number               // basic wind velocity
  qpH: number              // peak velocity pressure at top
  totalForce: number       // total net wind force
  windwardPressureH: number // windward pressure at top
  leewardPressure: number   // leeward pressure
  zones: ZonePressureResult[]
  steps: StepItem[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function fmt(v: number, dp: number = 2): string { return v.toFixed(dp) }

export function mToFt(m: number): number { return m * 3.28084 }
export function ftToM(ft: number): number { return ft / 3.28084 }
export function mpsToMph(mps: number): number { return mps * 2.23694 }
export function mphToMps(mph: number): number { return mph / 2.23694 }
export function paToKnm2(pa: number): number { return pa / 1000 }
export function paToPsf(pa: number): number { return pa * 0.020886 }
export function nToKn(n: number): number { return n / 1000 }
