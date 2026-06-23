export type DesignCode = 'EC3' | 'AISC'
export type UnitSystem = 'SI' | 'Imperial'
export type LimitState = 'ULS' | 'SLS'
export type SupportType = 'simply_supported' | 'cantilever' | 'fixed_fixed'
export type SectionFamily = 'IPE' | 'HEA' | 'HEB' | 'W'

export interface StepItem {
  clause: string
  description: string
  formula: string
  substitution: string
  result: string
}

export interface SteelSection {
  label: string
  family: SectionFamily
  h: number       // mm - overall depth
  b: number       // mm - flange width
  tw: number      // mm - web thickness
  tf: number      // mm - flange thickness
  r: number       // mm - root fillet radius
  A: number       // mm² - cross-section area
  Iy: number      // mm⁴ × 10⁶ - second moment about strong axis
  Iz: number      // mm⁴ × 10⁶ - second moment about weak axis
  Wely: number    // mm³ × 10³ - elastic section modulus (strong)
  Wply: number    // mm³ × 10³ - plastic section modulus (strong)
  Welz: number    // mm³ × 10³ - elastic section modulus (weak)
  Wplz: number    // mm³ × 10³ - plastic section modulus (weak)
  iy: number      // mm - radius of gyration (strong)
  iz: number      // mm - radius of gyration (weak)
  It: number      // mm⁴ × 10³ - torsion constant
  Iw: number      // mm⁶ × 10⁹ - warping constant
}

export interface SteelGrade {
  label: string
  fy: number    // MPa
  fu: number    // MPa
}

export interface ClassificationResult {
  flangeClass: number
  webClass: number
  sectionClass: number
  epsilon: number
  flangeRatio: number
  webRatio: number
  steps: StepItem[]
}

export interface BendingResult {
  McRd: number       // kN·m
  MEd: number        // kN·m
  utilization: number
  pass: boolean
  steps: StepItem[]
}

export interface ShearResult {
  VplRd: number      // kN
  VEd: number        // kN
  utilization: number
  pass: boolean
  Av: number         // mm²
  steps: StepItem[]
}

export interface LTBResult {
  MbRd: number       // kN·m
  MEd: number        // kN·m
  Mcr: number        // kN·m
  chiLT: number
  lambdaLT: number
  utilization: number
  pass: boolean
  steps: StepItem[]
}

export interface DeflectionResult {
  delta_dead: number    // mm
  delta_live: number    // mm
  delta_total: number   // mm
  limit_live: number    // mm
  limit_total: number   // mm
  pass_live: boolean
  pass_total: boolean
  pass: boolean
  steps: StepItem[]
}

// ── Steel Grades ─────────────────────────────────────────────────────────────

export const EC3_STEEL_GRADES: SteelGrade[] = [
  { label: 'S235', fy: 235, fu: 360 },
  { label: 'S275', fy: 275, fu: 430 },
  { label: 'S355', fy: 355, fu: 510 },
  { label: 'S420', fy: 420, fu: 520 },
  { label: 'S460', fy: 460, fu: 540 },
]

export const AISC_STEEL_GRADES: SteelGrade[] = [
  { label: 'A36', fy: 250, fu: 400 },
  { label: 'A572 Gr.50', fy: 345, fu: 450 },
  { label: 'A992', fy: 345, fu: 450 },
]

export const E_STEEL = 210000  // MPa
export const G_STEEL = 80770   // MPa

// ── Section Database ─────────────────────────────────────────────────────────

export const IPE_SECTIONS: SteelSection[] = [
  { label: 'IPE100', family: 'IPE', h: 100, b: 55, tw: 4.1, tf: 5.7, r: 7, A: 1032, Iy: 1.71, Iz: 0.159, Wely: 34.2, Wply: 39.4, Welz: 5.79, Wplz: 9.15, iy: 40.7, iz: 12.4, It: 1.2, Iw: 0.00035 },
  { label: 'IPE120', family: 'IPE', h: 120, b: 64, tw: 4.4, tf: 6.3, r: 7, A: 1321, Iy: 3.18, Iz: 0.277, Wely: 52.96, Wply: 60.73, Welz: 8.65, Wplz: 13.58, iy: 49.0, iz: 14.5, It: 1.74, Iw: 0.00089 },
  { label: 'IPE140', family: 'IPE', h: 140, b: 73, tw: 4.7, tf: 6.9, r: 7, A: 1643, Iy: 5.41, Iz: 0.449, Wely: 77.32, Wply: 88.34, Welz: 12.31, Wplz: 19.25, iy: 57.4, iz: 16.5, It: 2.45, Iw: 0.00199 },
  { label: 'IPE160', family: 'IPE', h: 160, b: 82, tw: 5.0, tf: 7.4, r: 9, A: 2009, Iy: 8.69, Iz: 0.683, Wely: 108.7, Wply: 123.9, Welz: 16.66, Wplz: 26.10, iy: 65.8, iz: 18.4, It: 3.6, Iw: 0.00396 },
  { label: 'IPE180', family: 'IPE', h: 180, b: 91, tw: 5.3, tf: 8.0, r: 9, A: 2395, Iy: 13.17, Iz: 1.009, Wely: 146.3, Wply: 166.4, Welz: 22.16, Wplz: 34.60, iy: 74.2, iz: 20.5, It: 4.79, Iw: 0.00713 },
  { label: 'IPE200', family: 'IPE', h: 200, b: 100, tw: 5.6, tf: 8.5, r: 12, A: 2848, Iy: 19.43, Iz: 1.424, Wely: 194.3, Wply: 220.6, Welz: 28.47, Wplz: 44.61, iy: 82.6, iz: 22.4, It: 6.98, Iw: 0.01299 },
  { label: 'IPE220', family: 'IPE', h: 220, b: 110, tw: 5.9, tf: 9.2, r: 12, A: 3337, Iy: 27.72, Iz: 2.049, Wely: 252.0, Wply: 285.4, Welz: 37.25, Wplz: 58.11, iy: 91.1, iz: 24.8, It: 9.07, Iw: 0.02220 },
  { label: 'IPE240', family: 'IPE', h: 240, b: 120, tw: 6.2, tf: 9.8, r: 15, A: 3912, Iy: 38.92, Iz: 2.836, Wely: 324.3, Wply: 366.6, Welz: 47.27, Wplz: 73.92, iy: 99.7, iz: 26.9, It: 12.88, Iw: 0.03744 },
  { label: 'IPE270', family: 'IPE', h: 270, b: 135, tw: 6.6, tf: 10.2, r: 15, A: 4594, Iy: 57.90, Iz: 4.199, Wely: 428.9, Wply: 484.0, Welz: 62.20, Wplz: 96.95, iy: 112.3, iz: 30.2, It: 15.94, Iw: 0.07078 },
  { label: 'IPE300', family: 'IPE', h: 300, b: 150, tw: 7.1, tf: 10.7, r: 15, A: 5381, Iy: 83.56, Iz: 6.038, Wely: 557.1, Wply: 628.4, Welz: 80.50, Wplz: 125.2, iy: 124.6, iz: 33.5, It: 20.12, Iw: 0.1257 },
  { label: 'IPE330', family: 'IPE', h: 330, b: 160, tw: 7.5, tf: 11.5, r: 18, A: 6261, Iy: 117.7, Iz: 7.881, Wely: 713.1, Wply: 804.3, Welz: 98.52, Wplz: 153.7, iy: 137.1, iz: 35.5, It: 26.12, Iw: 0.1987 },
  { label: 'IPE360', family: 'IPE', h: 360, b: 170, tw: 8.0, tf: 12.7, r: 18, A: 7273, Iy: 162.7, Iz: 10.43, Wely: 903.6, Wply: 1019, Welz: 122.8, Wplz: 191.1, iy: 149.5, iz: 37.9, It: 37.32, Iw: 0.3134 },
  { label: 'IPE400', family: 'IPE', h: 400, b: 180, tw: 8.6, tf: 13.5, r: 21, A: 8446, Iy: 231.3, Iz: 13.18, Wely: 1156, Wply: 1307, Welz: 146.4, Wplz: 229.0, iy: 165.5, iz: 39.5, It: 51.08, Iw: 0.4902 },
  { label: 'IPE450', family: 'IPE', h: 450, b: 190, tw: 9.4, tf: 14.6, r: 21, A: 9882, Iy: 337.4, Iz: 16.76, Wely: 1500, Wply: 1702, Welz: 176.4, Wplz: 276.4, iy: 184.8, iz: 41.2, It: 66.87, Iw: 0.7914 },
  { label: 'IPE500', family: 'IPE', h: 500, b: 200, tw: 10.2, tf: 16.0, r: 21, A: 11550, Iy: 482.0, Iz: 21.37, Wely: 1928, Wply: 2194, Welz: 214.2, Wplz: 335.9, iy: 204.3, iz: 43.1, It: 89.29, Iw: 1.249 },
  { label: 'IPE550', family: 'IPE', h: 550, b: 210, tw: 11.1, tf: 17.2, r: 24, A: 13440, Iy: 671.2, Iz: 26.68, Wely: 2441, Wply: 2787, Welz: 254.1, Wplz: 400.5, iy: 223.5, iz: 44.5, It: 123.2, Iw: 1.884 },
  { label: 'IPE600', family: 'IPE', h: 600, b: 220, tw: 12.0, tf: 19.0, r: 24, A: 15600, Iy: 920.8, Iz: 33.87, Wely: 3069, Wply: 3512, Welz: 307.9, Wplz: 485.6, iy: 243.0, iz: 46.6, It: 165.4, Iw: 2.846 },
]

export const HEA_SECTIONS: SteelSection[] = [
  { label: 'HEA100', family: 'HEA', h: 96, b: 100, tw: 5.0, tf: 8.0, r: 12, A: 2124, Iy: 3.49, Iz: 1.34, Wely: 72.76, Wply: 83.01, Welz: 26.76, Wplz: 41.14, iy: 40.5, iz: 25.1, It: 5.24, Iw: 0.00236 },
  { label: 'HEA120', family: 'HEA', h: 114, b: 120, tw: 5.0, tf: 8.0, r: 12, A: 2534, Iy: 6.06, Iz: 2.31, Wely: 106.3, Wply: 119.5, Welz: 38.48, Wplz: 58.85, iy: 48.9, iz: 30.2, It: 5.99, Iw: 0.00606 },
  { label: 'HEA140', family: 'HEA', h: 133, b: 140, tw: 5.5, tf: 8.5, r: 12, A: 3142, Iy: 10.33, Iz: 3.89, Wely: 155.4, Wply: 173.5, Welz: 55.62, Wplz: 84.85, iy: 57.3, iz: 35.2, It: 8.13, Iw: 0.01554 },
  { label: 'HEA160', family: 'HEA', h: 152, b: 160, tw: 6.0, tf: 9.0, r: 15, A: 3877, Iy: 16.73, Iz: 6.16, Wely: 220.1, Wply: 245.1, Welz: 77.03, Wplz: 117.6, iy: 65.7, iz: 39.8, It: 12.19, Iw: 0.03156 },
  { label: 'HEA200', family: 'HEA', h: 190, b: 200, tw: 6.5, tf: 10.0, r: 18, A: 5383, Iy: 36.92, Iz: 13.36, Wely: 388.6, Wply: 429.5, Welz: 133.6, Wplz: 203.8, iy: 82.8, iz: 49.8, It: 20.98, Iw: 0.1081 },
  { label: 'HEA240', family: 'HEA', h: 230, b: 240, tw: 7.5, tf: 12.0, r: 21, A: 7684, Iy: 77.63, Iz: 27.69, Wely: 675.1, Wply: 744.6, Welz: 230.7, Wplz: 351.7, iy: 100.5, iz: 60.0, It: 41.55, Iw: 0.3288 },
  { label: 'HEA260', family: 'HEA', h: 250, b: 260, tw: 7.5, tf: 12.5, r: 24, A: 8682, Iy: 104.5, Iz: 36.68, Wely: 836.4, Wply: 919.8, Welz: 282.1, Wplz: 430.2, iy: 109.7, iz: 65.0, It: 52.37, Iw: 0.5132 },
  { label: 'HEA300', family: 'HEA', h: 290, b: 300, tw: 8.5, tf: 14.0, r: 27, A: 11253, Iy: 182.6, Iz: 63.07, Wely: 1260, Wply: 1383, Welz: 420.6, Wplz: 641.2, iy: 127.4, iz: 74.9, It: 85.16, Iw: 1.200 },
  { label: 'HEA320', family: 'HEA', h: 310, b: 300, tw: 9.0, tf: 15.5, r: 27, A: 12440, Iy: 229.3, Iz: 69.85, Wely: 1479, Wply: 1628, Welz: 465.7, Wplz: 709.7, iy: 135.8, iz: 74.9, It: 108.2, Iw: 1.512 },
  { label: 'HEA360', family: 'HEA', h: 350, b: 300, tw: 10.0, tf: 17.5, r: 27, A: 14286, Iy: 330.9, Iz: 78.52, Wely: 1891, Wply: 2088, Welz: 523.5, Wplz: 800.7, iy: 152.2, iz: 74.1, It: 149.3, Iw: 2.177 },
  { label: 'HEA400', family: 'HEA', h: 390, b: 300, tw: 11.0, tf: 19.0, r: 27, A: 15898, Iy: 450.7, Iz: 85.64, Wely: 2311, Wply: 2562, Welz: 570.9, Wplz: 873.9, iy: 168.4, iz: 73.4, It: 189.1, Iw: 2.942 },
  { label: 'HEA450', family: 'HEA', h: 440, b: 300, tw: 11.5, tf: 21.0, r: 27, A: 17800, Iy: 637.4, Iz: 94.52, Wely: 2896, Wply: 3216, Welz: 630.1, Wplz: 965.5, iy: 189.2, iz: 72.9, It: 244.5, Iw: 4.148 },
  { label: 'HEA500', family: 'HEA', h: 490, b: 300, tw: 12.0, tf: 23.0, r: 27, A: 19780, Iy: 869.7, Iz: 103.8, Wely: 3550, Wply: 3949, Welz: 691.8, Wplz: 1059, iy: 209.7, iz: 72.4, It: 309.8, Iw: 5.643 },
]

export const HEB_SECTIONS: SteelSection[] = [
  { label: 'HEB100', family: 'HEB', h: 100, b: 100, tw: 6.0, tf: 10.0, r: 12, A: 2604, Iy: 4.49, Iz: 1.67, Wely: 89.91, Wply: 104.2, Welz: 33.45, Wplz: 51.42, iy: 41.6, iz: 25.3, It: 9.25, Iw: 0.00335 },
  { label: 'HEB120', family: 'HEB', h: 120, b: 120, tw: 6.5, tf: 11.0, r: 12, A: 3401, Iy: 8.64, Iz: 3.18, Wely: 144.1, Wply: 165.2, Welz: 52.92, Wplz: 80.97, iy: 50.4, iz: 30.6, It: 13.84, Iw: 0.00936 },
  { label: 'HEB140', family: 'HEB', h: 140, b: 140, tw: 7.0, tf: 12.0, r: 12, A: 4296, Iy: 15.09, Iz: 5.50, Wely: 215.6, Wply: 245.4, Welz: 78.52, Wplz: 119.8, iy: 59.3, iz: 35.8, It: 20.06, Iw: 0.02244 },
  { label: 'HEB160', family: 'HEB', h: 160, b: 160, tw: 8.0, tf: 13.0, r: 15, A: 5425, Iy: 24.92, Iz: 8.89, Wely: 311.5, Wply: 354.0, Welz: 111.2, Wplz: 169.8, iy: 67.8, iz: 40.5, It: 31.24, Iw: 0.04737 },
  { label: 'HEB200', family: 'HEB', h: 200, b: 200, tw: 9.0, tf: 15.0, r: 18, A: 7808, Iy: 56.96, Iz: 20.03, Wely: 569.6, Wply: 642.5, Welz: 200.3, Wplz: 305.8, iy: 85.4, iz: 50.7, It: 59.28, Iw: 0.1710 },
  { label: 'HEB240', family: 'HEB', h: 240, b: 240, tw: 10.0, tf: 17.0, r: 21, A: 10600, Iy: 112.6, Iz: 39.23, Wely: 938.3, Wply: 1053, Welz: 326.9, Wplz: 498.4, iy: 103.1, iz: 60.8, It: 102.7, Iw: 0.4868 },
  { label: 'HEB260', family: 'HEB', h: 260, b: 260, tw: 10.0, tf: 17.5, r: 24, A: 11840, Iy: 149.2, Iz: 51.37, Wely: 1148, Wply: 1283, Welz: 395.1, Wplz: 602.2, iy: 112.2, iz: 65.9, It: 123.8, Iw: 0.7530 },
  { label: 'HEB300', family: 'HEB', h: 300, b: 300, tw: 11.0, tf: 19.0, r: 27, A: 14910, Iy: 251.7, Iz: 85.63, Wely: 1678, Wply: 1869, Welz: 570.9, Wplz: 870.1, iy: 129.9, iz: 75.8, It: 185.0, Iw: 1.688 },
  { label: 'HEB320', family: 'HEB', h: 320, b: 300, tw: 11.5, tf: 20.5, r: 27, A: 16130, Iy: 308.2, Iz: 92.09, Wely: 1926, Wply: 2149, Welz: 613.9, Wplz: 939.1, iy: 138.2, iz: 75.6, It: 225.1, Iw: 2.069 },
  { label: 'HEB360', family: 'HEB', h: 360, b: 300, tw: 12.5, tf: 22.5, r: 27, A: 18060, Iy: 431.9, Iz: 101.4, Wely: 2400, Wply: 2683, Welz: 676.1, Wplz: 1032, iy: 154.6, iz: 74.9, It: 292.5, Iw: 2.880 },
  { label: 'HEB400', family: 'HEB', h: 400, b: 300, tw: 13.5, tf: 24.0, r: 27, A: 19780, Iy: 576.8, Iz: 108.2, Wely: 2884, Wply: 3232, Welz: 721.3, Wplz: 1104, iy: 170.7, iz: 73.9, It: 355.7, Iw: 3.695 },
]

export const W_SECTIONS: SteelSection[] = [
  { label: 'W8x31', family: 'W', h: 203, b: 203, tw: 7.2, tf: 11.1, r: 10, A: 5890, Iy: 43.1, Iz: 14.5, Wely: 424.6, Wply: 476.2, Welz: 142.9, Wplz: 218.3, iy: 85.6, iz: 49.6, It: 23.8, Iw: 0.125 },
  { label: 'W10x33', family: 'W', h: 247, b: 202, tw: 7.4, tf: 11.2, r: 10, A: 6260, Iy: 56.0, Iz: 15.3, Wely: 453.4, Wply: 510.3, Welz: 151.5, Wplz: 231.4, iy: 94.6, iz: 49.4, It: 25.3, Iw: 0.168 },
  { label: 'W10x49', family: 'W', h: 253, b: 254, tw: 8.6, tf: 14.2, r: 10, A: 9290, Iy: 93.1, Iz: 30.7, Wely: 736.0, Wply: 818.5, Welz: 241.7, Wplz: 368.7, iy: 100.1, iz: 57.5, It: 56.9, Iw: 0.420 },
  { label: 'W12x40', family: 'W', h: 304, b: 203, tw: 7.5, tf: 13.1, r: 10, A: 7610, Iy: 97.0, Iz: 17.7, Wely: 638.2, Wply: 719.0, Welz: 174.4, Wplz: 266.3, iy: 112.9, iz: 48.2, It: 36.4, Iw: 0.304 },
  { label: 'W12x53', family: 'W', h: 307, b: 254, tw: 8.8, tf: 14.6, r: 10, A: 10100, Iy: 135.2, Iz: 39.2, Wely: 880.8, Wply: 984.4, Welz: 308.7, Wplz: 471.0, iy: 115.8, iz: 62.3, It: 65.6, Iw: 0.614 },
  { label: 'W14x48', family: 'W', h: 351, b: 203, tw: 7.9, tf: 13.5, r: 10, A: 9100, Iy: 145.5, Iz: 18.9, Wely: 829.1, Wply: 937.7, Welz: 186.2, Wplz: 285.1, iy: 126.5, iz: 45.5, It: 42.8, Iw: 0.434 },
  { label: 'W14x68', family: 'W', h: 356, b: 254, tw: 10.5, tf: 18.8, r: 10, A: 12900, Iy: 229.1, Iz: 48.5, Wely: 1287, Wply: 1432, Welz: 381.9, Wplz: 583.0, iy: 133.3, iz: 61.3, It: 132.0, Iw: 0.924 },
  { label: 'W14x82', family: 'W', h: 363, b: 257, tw: 12.8, tf: 21.7, r: 10, A: 15500, Iy: 285.3, Iz: 58.2, Wely: 1572, Wply: 1756, Welz: 453.3, Wplz: 694.8, iy: 135.7, iz: 61.3, It: 193.0, Iw: 1.170 },
  { label: 'W16x50', family: 'W', h: 413, b: 178, tw: 9.7, tf: 16.3, r: 10, A: 9480, Iy: 178.3, Iz: 12.2, Wely: 863.2, Wply: 990.6, Welz: 137.1, Wplz: 213.5, iy: 137.2, iz: 35.9, It: 56.9, Iw: 0.447 },
  { label: 'W16x67', family: 'W', h: 419, b: 254, tw: 10.9, tf: 19.1, r: 10, A: 12700, Iy: 268.3, Iz: 49.6, Wely: 1281, Wply: 1435, Welz: 390.6, Wplz: 598.8, iy: 145.3, iz: 62.5, It: 131.0, Iw: 1.070 },
  { label: 'W18x55', family: 'W', h: 457, b: 190, tw: 9.0, tf: 16.0, r: 10, A: 10500, Iy: 228.5, Iz: 18.3, Wely: 1000, Wply: 1136, Welz: 192.6, Wplz: 297.2, iy: 147.6, iz: 41.7, It: 59.5, Iw: 0.620 },
  { label: 'W18x76', family: 'W', h: 462, b: 267, tw: 10.9, tf: 21.6, r: 10, A: 14500, Iy: 357.5, Iz: 67.3, Wely: 1547, Wply: 1735, Welz: 504.1, Wplz: 773.3, iy: 157.0, iz: 68.1, It: 180.0, Iw: 1.610 },
  { label: 'W21x62', family: 'W', h: 533, b: 210, tw: 10.2, tf: 15.6, r: 10, A: 11800, Iy: 334.6, Iz: 24.0, Wely: 1256, Wply: 1428, Welz: 228.6, Wplz: 352.6, iy: 168.4, iz: 45.1, It: 69.0, Iw: 0.930 },
  { label: 'W21x83', family: 'W', h: 541, b: 211, tw: 12.8, tf: 21.2, r: 10, A: 15800, Iy: 471.5, Iz: 33.0, Wely: 1743, Wply: 1982, Welz: 312.8, Wplz: 483.3, iy: 172.8, iz: 45.7, It: 139.0, Iw: 1.370 },
  { label: 'W24x76', family: 'W', h: 608, b: 229, tw: 11.2, tf: 17.3, r: 10, A: 14500, Iy: 504.4, Iz: 34.6, Wely: 1659, Wply: 1889, Welz: 302.2, Wplz: 465.2, iy: 186.5, iz: 48.8, It: 101.0, Iw: 1.470 },
  { label: 'W24x104', family: 'W', h: 612, b: 328, tw: 12.7, tf: 19.1, r: 10, A: 19800, Iy: 728.4, Iz: 113.7, Wely: 2380, Wply: 2672, Welz: 693.3, Wplz: 1062, iy: 191.8, iz: 75.8, It: 197.0, Iw: 4.140 },
  { label: 'W27x94', family: 'W', h: 684, b: 254, tw: 11.7, tf: 18.9, r: 10, A: 17900, Iy: 724.2, Iz: 48.9, Wely: 2118, Wply: 2409, Welz: 385.0, Wplz: 592.7, iy: 201.2, iz: 52.3, It: 139.0, Iw: 2.480 },
  { label: 'W30x116', family: 'W', h: 762, b: 267, tw: 14.0, tf: 21.6, r: 10, A: 22100, Iy: 1110, Iz: 67.3, Wely: 2913, Wply: 3330, Welz: 504.1, Wplz: 779.3, iy: 224.1, iz: 55.2, It: 225.0, Iw: 4.380 },
  { label: 'W33x130', family: 'W', h: 841, b: 292, tw: 14.7, tf: 21.2, r: 10, A: 24700, Iy: 1490, Iz: 87.3, Wely: 3544, Wply: 4047, Welz: 598.0, Wplz: 919.7, iy: 245.7, iz: 59.5, It: 239.0, Iw: 6.560 },
  { label: 'W36x150', family: 'W', h: 912, b: 305, tw: 15.9, tf: 23.9, r: 10, A: 28600, Iy: 2140, Iz: 113.7, Wely: 4693, Wply: 5370, Welz: 745.6, Wplz: 1148, iy: 273.6, iz: 63.1, It: 347.0, Iw: 10.70 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export function fmt(v: number, dp: number = 2): string { return v.toFixed(dp) }

export function getAllSections(family: SectionFamily): SteelSection[] {
  switch (family) {
    case 'IPE': return IPE_SECTIONS
    case 'HEA': return HEA_SECTIONS
    case 'HEB': return HEB_SECTIONS
    case 'W': return W_SECTIONS
  }
}

export function getSectionFamilies(code: DesignCode): SectionFamily[] {
  return code === 'EC3' ? ['IPE', 'HEA', 'HEB'] : ['W']
}

export function getC1(support: SupportType): number {
  switch (support) {
    case 'simply_supported': return 1.132
    case 'cantilever': return 1.0
    case 'fixed_fixed': return 2.578
  }
}

export function getMomentCoeff(support: SupportType): number {
  switch (support) {
    case 'simply_supported': return 1 / 8
    case 'cantilever': return 1 / 2
    case 'fixed_fixed': return 1 / 12
  }
}

export function getShearCoeff(support: SupportType): number {
  switch (support) {
    case 'simply_supported': return 1 / 2
    case 'cantilever': return 1
    case 'fixed_fixed': return 1 / 2
  }
}

export function getDeflCoeff(support: SupportType): number {
  switch (support) {
    case 'simply_supported': return 5 / 384
    case 'cantilever': return 1 / 8
    case 'fixed_fixed': return 1 / 384
  }
}
