// Section property library for the beam calculator.
//
// All catalog data is stored in canonical SI engineering units:
//   E in GPa, I in cm^4, h/b/tw in mm, A in cm^2.
// `sectionToUnits` converts a catalog entry into the units the page's E/I
// state already uses (GPa/cm^4 for SI, ksi/in^4 for Imperial), matching the
// TO_IMPERIAL factors in page.tsx.

export type UnitSystem = 'SI' | 'Imperial'
export type DesignCode = 'EC' | 'ACI'
export type SectionMaterial = 'steel' | 'concrete'
export type SectionShape = 'rectangular' | 'i-section'

export interface SectionDef {
  id: string
  name: string
  material: SectionMaterial
  shape: SectionShape
  E_GPa: number
  I_cm4: number
  h_mm: number
  b_mm: number
  A_cm2: number
  tw_mm: number
}

export interface SectionValues {
  E: number
  I: number
  h: number
  b: number
  A: number
  tw: number
}

// Unit weights (kN/m^3) used for self-weight UDL = A * gamma.
export const STEEL_GAMMA = 78.5
export const CONCRETE_GAMMA = 25

// Conversion factors (exact, derived from 1 in = 25.4 mm and 1 lb = 4.4482216 N).
const MM_TO_IN = 1 / 25.4
export const CM4_TO_IN4 = 0.0240251
export const CM2_TO_IN2 = 1 / 6.4516
export const GPA_TO_KSI = 145.038
export const MPA_TO_KSI = 0.145038
const KNM_TO_KIPFT = 0.0685218 // kN/m -> kip/ft (matches page.tsx TO_IMPERIAL.udl)

function inToMm(v: number): number {
  return v * 25.4
}
function in4ToCm4(v: number): number {
  return v / CM4_TO_IN4
}
function in2ToCm2(v: number): number {
  return v / CM2_TO_IN2
}
function ksiToGPa(v: number): number {
  return v / GPA_TO_KSI
}

// ---------------------------------------------------------------------------
// Steel sections (European IPE / HEA / HEB), E = 200 GPa.
// ---------------------------------------------------------------------------
export const STEEL_SECTIONS: SectionDef[] = [
  { id: 'ipe160', name: 'IPE 160', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 869, h_mm: 160, b_mm: 82, A_cm2: 20.1, tw_mm: 5.0 },
  { id: 'ipe200', name: 'IPE 200', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 1943, h_mm: 200, b_mm: 100, A_cm2: 28.5, tw_mm: 5.6 },
  { id: 'ipe240', name: 'IPE 240', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 3892, h_mm: 240, b_mm: 120, A_cm2: 39.1, tw_mm: 6.2 },
  { id: 'ipe300', name: 'IPE 300', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 8356, h_mm: 300, b_mm: 150, A_cm2: 53.8, tw_mm: 7.1 },
  { id: 'ipe400', name: 'IPE 400', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 23130, h_mm: 400, b_mm: 180, A_cm2: 84.5, tw_mm: 8.6 },
  { id: 'ipe500', name: 'IPE 500', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 48200, h_mm: 500, b_mm: 200, A_cm2: 115.5, tw_mm: 10.2 },
  { id: 'hea200', name: 'HEA 200', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 3692, h_mm: 190, b_mm: 200, A_cm2: 53.8, tw_mm: 6.5 },
  { id: 'hea300', name: 'HEA 300', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 18260, h_mm: 290, b_mm: 300, A_cm2: 112.5, tw_mm: 8.5 },
  { id: 'heb200', name: 'HEB 200', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 5696, h_mm: 200, b_mm: 200, A_cm2: 78.1, tw_mm: 9.0 },
  { id: 'heb300', name: 'HEB 300', material: 'steel', shape: 'i-section', E_GPa: 200, I_cm4: 25170, h_mm: 300, b_mm: 300, A_cm2: 149.1, tw_mm: 11.0 },
]

// ---------------------------------------------------------------------------
// US steel sections (AISC W-shapes), native units in -> stored as SI.
// ---------------------------------------------------------------------------
const US_STEEL_RAW = [
  { id: 'w8x31', name: 'W8x31', I_in4: 110, h_in: 8.0, b_in: 8.0, A_in2: 9.13, tw_in: 0.285 },
  { id: 'w10x49', name: 'W10x49', I_in4: 272, h_in: 10.0, b_in: 10.0, A_in2: 14.4, tw_in: 0.34 },
  { id: 'w12x53', name: 'W12x53', I_in4: 425, h_in: 12.0, b_in: 10.0, A_in2: 15.6, tw_in: 0.345 },
]

export const US_STEEL_SECTIONS: SectionDef[] = US_STEEL_RAW.map((s) => ({
  id: s.id,
  name: s.name,
  material: 'steel',
  shape: 'i-section',
  E_GPa: ksiToGPa(29000),
  I_cm4: in4ToCm4(s.I_in4),
  h_mm: inToMm(s.h_in),
  b_mm: inToMm(s.b_in),
  A_cm2: in2ToCm2(s.A_in2),
  tw_mm: inToMm(s.tw_in),
}))

// ---------------------------------------------------------------------------
// Concrete rectangular sections (b x h, cm). E depends on fck and code.
// ---------------------------------------------------------------------------
const CONCRETE_RECT_RAW = [
  { id: 'rect-20x40', b_cm: 20, h_cm: 40 },
  { id: 'rect-25x50', b_cm: 25, h_cm: 50 },
  { id: 'rect-30x60', b_cm: 30, h_cm: 60 },
  { id: 'rect-40x80', b_cm: 40, h_cm: 80 },
  { id: 'rect-50x100', b_cm: 50, h_cm: 100 },
]

export const CONCRETE_RECT_SECTIONS: SectionDef[] = CONCRETE_RECT_RAW.map((s) => ({
  id: s.id,
  name: `${s.b_cm} x ${s.h_cm} cm`,
  material: 'concrete',
  shape: 'rectangular',
  E_GPa: 30, // placeholder, overwritten via concreteEGPa() once fck/code are known
  I_cm4: (s.b_cm * s.h_cm ** 3) / 12,
  h_mm: s.h_cm * 10,
  b_mm: s.b_cm * 10,
  A_cm2: s.b_cm * s.h_cm,
  tw_mm: s.b_cm * 10,
}))

// Common concrete grades (fck in MPa) offered in the picker.
export const CONCRETE_GRADES_MPA = [20, 25, 30, 35, 40, 45, 50]

// ---------------------------------------------------------------------------
// Concrete elastic modulus, in MPa, given fck in MPa.
// ---------------------------------------------------------------------------
export function concreteEMPa(fck: number, code: DesignCode): number {
  if (code === 'EC') return 22000 * Math.pow(fck / 10, 0.3)
  return 4700 * Math.sqrt(fck)
}

export function concreteEGPa(fck: number, code: DesignCode): number {
  return concreteEMPa(fck, code) / 1000
}

// ---------------------------------------------------------------------------
// Custom T-beam section. beff/bw/hf/h all in mm.
// `h` returned is 2 * (distance from centroid to the farthest fiber), so
// that bending stress sigma = M * (h/2) / I gives the correct extreme-fiber
// stress for this (generally asymmetric) section.
// ---------------------------------------------------------------------------
export interface TBeamInputs {
  beff: number
  bw: number
  hf: number
  h: number
}

export function computeTBeamSection(inputs: TBeamInputs): SectionDef {
  const { beff, bw, hf, h } = inputs
  const hw = Math.max(h - hf, 0)

  const Aflange = beff * hf
  const Aweb = bw * hw
  const yFlange = h - hf / 2 // centroid of flange, measured from bottom
  const yWeb = hw / 2 // centroid of web, measured from bottom

  const Atotal = Aflange + Aweb
  const ybar = Atotal > 0 ? (Aflange * yFlange + Aweb * yWeb) / Atotal : 0

  const Iflange = (beff * hf ** 3) / 12 + Aflange * (yFlange - ybar) ** 2
  const Iweb = (bw * hw ** 3) / 12 + Aweb * (yWeb - ybar) ** 2
  const Itotal = Iflange + Iweb

  const yBottom = ybar
  const yTop = h - ybar
  const cMax = Math.max(yTop, yBottom)

  return {
    id: 'tbeam-custom',
    name: 'T-beam (custom)',
    material: 'concrete',
    shape: 'rectangular',
    E_GPa: 30,
    I_cm4: Itotal / 1e4,
    h_mm: 2 * cMax,
    b_mm: beff,
    A_cm2: Atotal / 100,
    tw_mm: bw,
  }
}

// ---------------------------------------------------------------------------
// Convert a canonical (SI) SectionDef into the units the page's E/I/h/b/A/tw
// state should use for the given unit system.
// ---------------------------------------------------------------------------
export function sectionToUnits(section: SectionDef, units: UnitSystem): SectionValues {
  if (units === 'SI') {
    return { E: section.E_GPa, I: section.I_cm4, h: section.h_mm, b: section.b_mm, A: section.A_cm2, tw: section.tw_mm }
  }
  return {
    E: section.E_GPa * GPA_TO_KSI,
    I: section.I_cm4 * CM4_TO_IN4,
    h: section.h_mm * MM_TO_IN,
    b: section.b_mm * MM_TO_IN,
    A: section.A_cm2 * CM2_TO_IN2,
    tw: section.tw_mm * MM_TO_IN,
  }
}

// Self-weight UDL (w = A * gamma), in kN/m (SI) or kip/ft (Imperial).
export function selfWeightPerLength(section: SectionDef, units: UnitSystem): number {
  const gamma = section.material === 'steel' ? STEEL_GAMMA : CONCRETE_GAMMA
  const A_m2 = section.A_cm2 * 1e-4
  const w_kNm = A_m2 * gamma
  return units === 'SI' ? w_kNm : w_kNm * KNM_TO_KIPFT
}
