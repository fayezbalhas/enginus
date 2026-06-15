// Elastic (Euler-Bernoulli) analysis for single-span beams under point loads,
// uniformly/trapezoidally distributed loads, and applied concentrated moments.
// All inputs/outputs use a single consistent set of units (e.g. kN, m, kN*m^2
// for EI) - unit handling lives in page.tsx.

export type BeamType = 'simply-supported' | 'cantilever' | 'fixed-fixed'

// Load-type tags used for load combinations: dead, live, wind, snow.
export type LoadType = 'G' | 'Q' | 'W' | 'S'

export type MomentDirection = 'CW' | 'CCW'

export interface PointLoad {
  id: string
  position: number // distance from left support, 0 <= position <= length
  magnitude: number // positive = downward
  label: string
  loadType: LoadType
}

export interface UDLLoad {
  id: string
  start: number
  end: number
  magnitude: number // force per unit length, positive = downward
  label: string
  loadType: LoadType
}

// A linearly-varying distributed load between `start` and `end`, with
// intensity `startMag` at `start` ramping to `endMag` at `end`. A UDL is the
// special case startMag === endMag.
export interface TrapezoidalLoad {
  id: string
  start: number
  end: number
  startMag: number
  endMag: number
  label: string
  loadType: LoadType
}

// A concentrated applied moment (couple). `direction` follows the standard
// math convention: CCW causes M(x) to jump up by `magnitude` when crossing
// the load position left-to-right, CW causes it to jump down.
export interface MomentLoad {
  id: string
  position: number
  magnitude: number // always positive; sign comes from `direction`
  direction: MomentDirection
  label: string
  loadType: LoadType
}

export interface Reactions {
  RA: number
  RB: number
  MA: number // reaction moment at left support (cantilever / fixed-fixed only)
  MB: number // reaction moment at right support (fixed-fixed only)
}

export interface ExtremePoint {
  value: number
  x: number
}

export interface KeyPoint {
  x: number
  V: number
  M: number
  delta: number
}

// Cross-section properties needed for a basic stress check. All units must
// be mutually consistent with the moment/shear values they are paired with
// (the page-level wrapper takes care of converting to MPa / ksi).
export interface SectionProps {
  h: number // overall depth
  I: number // second moment of area
  A: number // gross cross-sectional area
  tw: number // web thickness (used for I-sections; equals full width for rectangles)
  shape: 'rectangular' | 'i-section'
}

export interface StressResults {
  maxNormalStress: number
  maxShearStress: number
  position: number
}

export interface BeamSolution {
  reactions: Reactions
  x: number[]
  shear: number[]
  moment: number[]
  deflection: number[]
  maxShear: ExtremePoint
  minShear: ExtremePoint
  maxMoment: ExtremePoint
  minMoment: ExtremePoint
  maxDeflection: ExtremePoint
  keyPoints: KeyPoint[]
  stressResults: StressResults | null
}

const SEGMENTS = 240

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi)
}

// ---------------------------------------------------------------------------
// Internal representation of a distributed load: a linear ramp from
// `startMag` at x=start to `endMag` at x=end. UDLs and trapezoidal loads are
// both normalized to this shape.
// ---------------------------------------------------------------------------
interface DistLoad {
  start: number
  end: number
  startMag: number
  endMag: number
}

function toDistLoads(udls: UDLLoad[], trapezoidalLoads: TrapezoidalLoad[]): DistLoad[] {
  const fromUdl = udls.map((u) => ({ start: u.start, end: u.end, startMag: u.magnitude, endMag: u.magnitude }))
  const fromTrap = trapezoidalLoads.map((t) => ({ start: t.start, end: t.end, startMag: t.startMag, endMag: t.endMag }))
  return [...fromUdl, ...fromTrap]
}

// Resultant force of a distributed load (trapezoid area).
function distTotal(d: DistLoad): number {
  const len = d.end - d.start
  if (len <= 0) return 0
  return ((d.startMag + d.endMag) / 2) * len
}

// First moment of a distributed load about x = 0, i.e. integral of w(xi)*xi.
function distMomentAboutOrigin(d: DistLoad): number {
  const { start, end, startMag, endMag } = d
  const len = end - start
  if (len <= 0) return 0
  const slope = (endMag - startMag) / len
  return startMag * start * len + (startMag + slope * start) * (len * len) / 2 + (slope * len ** 3) / 3
}

// Force contributed by the portion of a distributed load to the left of x
// (i.e. its contribution to V(x), to be subtracted from RA).
function distShear(x: number, d: DistLoad): number {
  const { start, end, startMag, endMag } = d
  if (x <= start) return 0
  const len = end - start
  if (len <= 0) return 0
  const slope = (endMag - startMag) / len
  if (x <= end) {
    const L1 = x - start
    return startMag * L1 + (slope * L1 * L1) / 2
  }
  return ((startMag + endMag) / 2) * len
}

// Moment about x contributed by a distributed load (to be subtracted from
// M0 + RA*x).
function distMoment(x: number, d: DistLoad): number {
  const { start, end, startMag, endMag } = d
  if (x <= start) return 0
  const len = end - start
  if (len <= 0) return 0
  const slope = (endMag - startMag) / len
  if (x <= end) {
    const L1 = x - start
    return (startMag * L1 * L1) / 2 + (slope * L1 ** 3) / 6
  }
  const Wtot = ((startMag + endMag) / 2) * len
  const intWxi = startMag * start * len + (startMag + slope * start) * (len * len) / 2 + (slope * len ** 3) / 3
  return x * Wtot - intWxi
}

// Antiderivatives used for fixed-end moments. F/G integrate the point-load
// FEM kernels x(L-x)^2 and x^2(L-x); F2/G2 integrate x*[those kernels], which
// is what's needed for the linear (slope) term of a trapezoidal load.
function F(L: number, x: number): number {
  return (L * L * x * x) / 2 - (2 * L * x ** 3) / 3 + x ** 4 / 4
}
function G(L: number, x: number): number {
  return (L * x ** 3) / 3 - x ** 4 / 4
}
function F2(L: number, x: number): number {
  return (L * L * x ** 3) / 3 - (L * x ** 4) / 2 + x ** 5 / 5
}
function G2(L: number, x: number): number {
  return (L * x ** 4) / 4 - x ** 5 / 5
}

// Fixed-end moments contributed by a distributed load on a fixed-fixed beam.
function distFEM(d: DistLoad, length: number): { FEM_A: number; FEM_B: number } {
  const { start, end, startMag, endMag } = d
  const len = end - start
  if (len <= 0) return { FEM_A: 0, FEM_B: 0 }
  const slope = (endMag - startMag) / len
  const A0 = startMag - slope * start
  const L2 = length * length
  const FEM_A = (A0 / L2) * (F(length, end) - F(length, start)) + (slope / L2) * (F2(length, end) - F2(length, start))
  const FEM_B = (A0 / L2) * (G(length, end) - G(length, start)) + (slope / L2) * (G2(length, end) - G2(length, start))
  return { FEM_A, FEM_B }
}

// Signed magnitude of an applied moment in the M(x)-jump convention: CCW
// jumps M(x) up by `magnitude`, CW jumps it down.
function signedMoment(m: MomentLoad): number {
  return m.direction === 'CCW' ? m.magnitude : -m.magnitude
}

function totalLoad(pointLoads: PointLoad[], distLoads: DistLoad[]): number {
  const p = pointLoads.reduce((s, l) => s + l.magnitude, 0)
  const d = distLoads.reduce((s, l) => s + distTotal(l), 0)
  return p + d
}

// Sum of (load * distance from support A) - used to get the simply-supported
// reaction at B and the reaction moment of a cantilever.
function loadMomentAboutA(pointLoads: PointLoad[], distLoads: DistLoad[]): number {
  const p = pointLoads.reduce((s, l) => s + l.magnitude * l.position, 0)
  const d = distLoads.reduce((s, l) => s + distMomentAboutOrigin(l), 0)
  return p + d
}

export function computeReactions(
  type: BeamType,
  length: number,
  pointLoads: PointLoad[],
  udls: UDLLoad[],
  trapezoidalLoads: TrapezoidalLoad[] = [],
  momentLoads: MomentLoad[] = []
): Reactions {
  const distLoads = toDistLoads(udls, trapezoidalLoads)
  const Ftot = totalLoad(pointLoads, distLoads)
  const rawMomentAboutA = loadMomentAboutA(pointLoads, distLoads)
  const signedMSum = momentLoads.reduce((s, m) => s + signedMoment(m), 0)

  const RB0 = rawMomentAboutA / length
  const RA0 = Ftot - RB0
  // Simply-supported reactions, including the effect of applied moments.
  const RA_SS = RA0 - signedMSum / length
  const RB_SS = RB0 + signedMSum / length

  if (type === 'simply-supported') {
    return { RA: RA_SS, RB: RB_SS, MA: 0, MB: 0 }
  }

  if (type === 'cantilever') {
    return { RA: Ftot, RB: 0, MA: rawMomentAboutA + signedMSum, MB: 0 }
  }

  // fixed-fixed: superposition of fixed-end moments
  let MA = 0
  let MB = 0
  for (const p of pointLoads) {
    const a = clamp(p.position, 0, length)
    const b = length - a
    MA += (p.magnitude * a * b * b) / (length * length)
    MB += (p.magnitude * a * a * b) / (length * length)
  }
  for (const d of distLoads) {
    const { FEM_A, FEM_B } = distFEM(d, length)
    MA += FEM_A
    MB += FEM_B
  }
  for (const m of momentLoads) {
    const a = clamp(m.position, 0, length)
    const b = length - a
    const sM = signedMoment(m)
    MA += (sM * b * (length - 3 * a)) / (length * length)
    MB += (sM * a * (2 * length - 3 * a)) / (length * length)
  }
  const RA = RA_SS + (MA - MB) / length
  const RB = RB_SS - (MA - MB) / length
  return { RA, RB, MA, MB }
}

function shearAt(x: number, RA: number, pointLoads: PointLoad[], distLoads: DistLoad[]): number {
  let V = RA
  for (const d of distLoads) V -= distShear(x, d)
  for (const p of pointLoads) {
    if (p.position <= x) V -= p.magnitude
  }
  return V
}

function momentAt(
  x: number,
  M0: number,
  RA: number,
  pointLoads: PointLoad[],
  distLoads: DistLoad[],
  momentLoads: MomentLoad[]
): number {
  let M = M0 + RA * x
  for (const p of pointLoads) {
    if (p.position <= x) M -= p.magnitude * (x - p.position)
  }
  for (const d of distLoads) M -= distMoment(x, d)
  for (const m of momentLoads) {
    if (m.position < x) M += signedMoment(m)
  }
  return M
}

// Builds an x-grid that includes a uniform subdivision of the span plus the
// exact locations of every load. Point-load and applied-moment positions get
// an infinitesimal before/after pair so the shear / moment diagrams show a
// clean vertical jump.
function buildGrid(length: number, pointLoads: PointLoad[], distLoads: DistLoad[], momentLoads: MomentLoad[]): number[] {
  const points = new Set<number>()
  for (let i = 0; i <= SEGMENTS; i++) points.add((i * length) / SEGMENTS)
  for (const p of pointLoads) points.add(clamp(p.position, 0, length))
  for (const d of distLoads) {
    points.add(clamp(d.start, 0, length))
    points.add(clamp(d.end, 0, length))
  }
  for (const m of momentLoads) points.add(clamp(m.position, 0, length))

  const jumpPositions: number[] = []
  for (const p of pointLoads) jumpPositions.push(clamp(p.position, 0, length))
  for (const m of momentLoads) jumpPositions.push(clamp(m.position, 0, length))

  const sorted = Array.from(points).sort((a, b) => a - b)
  const eps = length * 1e-6
  const grid: number[] = []
  for (const x of sorted) {
    const isJump = jumpPositions.some((jp) => Math.abs(jp - x) < 1e-9)
    if (isJump && x > eps) grid.push(x - eps)
    grid.push(x)
    if (isJump && x < length - eps) grid.push(x + eps)
  }
  return grid
}

function findExtreme(x: number[], values: number[], mode: 'max' | 'min'): ExtremePoint {
  let best = values[0]
  let bestX = x[0]
  for (let i = 1; i < values.length; i++) {
    if ((mode === 'max' && values[i] > best) || (mode === 'min' && values[i] < best)) {
      best = values[i]
      bestX = x[i]
    }
  }
  return { value: best, x: bestX }
}

function findMaxAbs(x: number[], values: number[]): ExtremePoint {
  let best = values[0]
  let bestX = x[0]
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i]) > Math.abs(best)) {
      best = values[i]
      bestX = x[i]
    }
  }
  return { value: best, x: bestX }
}

// Linear interpolation of a sampled function at xq. When xq lands exactly on
// a jump (two consecutive samples at the same x), the value on the far side
// of the jump is returned.
function interpAt(xq: number, x: number[], values: number[]): number {
  const n = x.length
  if (xq <= x[0]) return values[0]
  if (xq >= x[n - 1]) return values[n - 1]
  let i = 1
  while (i < n - 1 && x[i] < xq - 1e-9) i++
  if (Math.abs(x[i] - xq) < 1e-6) {
    while (i + 1 < n && x[i + 1] - x[i] < 1e-9) i++
    return values[i]
  }
  const t = (xq - x[i - 1]) / (x[i] - x[i - 1])
  return values[i - 1] + t * (values[i] - values[i - 1])
}

function buildKeyPoints(
  x: number[],
  shear: number[],
  moment: number[],
  deflection: number[],
  length: number,
  pointLoads: PointLoad[],
  distLoads: DistLoad[],
  momentLoads: MomentLoad[],
  extremes: {
    maxShear: ExtremePoint
    minShear: ExtremePoint
    maxMoment: ExtremePoint
    minMoment: ExtremePoint
    maxDeflection: ExtremePoint
  }
): KeyPoint[] {
  const xsSet = new Set<number>()
  const add = (v: number) => xsSet.add(Math.round(clamp(v, 0, length) * 1e6) / 1e6)
  add(0)
  add(length / 4)
  add(length / 2)
  add((3 * length) / 4)
  add(length)
  for (const p of pointLoads) add(p.position)
  for (const d of distLoads) {
    add(d.start)
    add(d.end)
  }
  for (const m of momentLoads) add(m.position)
  add(extremes.maxShear.x)
  add(extremes.minShear.x)
  add(extremes.maxMoment.x)
  add(extremes.minMoment.x)
  add(extremes.maxDeflection.x)

  const xs = Array.from(xsSet).sort((a, b) => a - b)
  return xs.map((xi) => ({
    x: xi,
    V: interpAt(xi, x, shear),
    M: interpAt(xi, x, moment),
    delta: interpAt(xi, x, deflection),
  }))
}

// Basic normal/shear stress check at the location of maximum bending moment.
export function computeStressResults(
  maxMoment: ExtremePoint,
  minMoment: ExtremePoint,
  maxShear: ExtremePoint,
  minShear: ExtremePoint,
  section: SectionProps
): StressResults {
  const useMax = Math.abs(maxMoment.value) >= Math.abs(minMoment.value)
  const Mabs = useMax ? Math.abs(maxMoment.value) : Math.abs(minMoment.value)
  const Mpos = useMax ? maxMoment.x : minMoment.x
  const Vabs = Math.max(Math.abs(maxShear.value), Math.abs(minShear.value))

  const maxNormalStress = (Mabs * (section.h / 2)) / section.I
  const maxShearStress = section.shape === 'rectangular' ? (1.5 * Vabs) / section.A : Vabs / (section.tw * section.h)

  return { maxNormalStress, maxShearStress, position: Mpos }
}

export function solveBeam(
  type: BeamType,
  length: number,
  pointLoads: PointLoad[],
  udls: UDLLoad[],
  trapezoidalLoads: TrapezoidalLoad[],
  momentLoads: MomentLoad[],
  EI: number,
  section?: SectionProps
): BeamSolution {
  const distLoads = toDistLoads(udls, trapezoidalLoads)
  const reactions = computeReactions(type, length, pointLoads, udls, trapezoidalLoads, momentLoads)
  const { RA, MA } = reactions
  const M0 = type === 'simply-supported' ? 0 : -MA

  const x = buildGrid(length, pointLoads, distLoads, momentLoads)
  const shear = x.map((xi) => shearAt(xi, RA, pointLoads, distLoads))
  const moment = x.map((xi) => momentAt(xi, M0, RA, pointLoads, distLoads, momentLoads))

  // Double integration of M/EI (trapezoidal rule) to get slope and deflection,
  // starting from zero slope/deflection at x = 0.
  const n = x.length
  const thetaRaw = new Array(n).fill(0)
  const yRaw = new Array(n).fill(0)
  for (let i = 1; i < n; i++) {
    const dx = x[i] - x[i - 1]
    thetaRaw[i] = thetaRaw[i - 1] + ((moment[i - 1] + moment[i]) / 2 / EI) * dx
    yRaw[i] = yRaw[i - 1] + ((thetaRaw[i - 1] + thetaRaw[i]) / 2) * dx
  }

  // Cantilever: y(0) = y'(0) = 0 already satisfied. Otherwise enforce y(L) = 0
  // by adding a linear correction term.
  const C1 = type === 'cantilever' ? 0 : -yRaw[n - 1] / length
  const deflection = yRaw.map((y, i) => -(y + C1 * x[i]))

  const maxShear = findExtreme(x, shear, 'max')
  const minShear = findExtreme(x, shear, 'min')
  const maxMoment = findExtreme(x, moment, 'max')
  const minMoment = findExtreme(x, moment, 'min')
  const maxDeflection = findMaxAbs(x, deflection)

  const keyPoints = buildKeyPoints(x, shear, moment, deflection, length, pointLoads, distLoads, momentLoads, {
    maxShear,
    minShear,
    maxMoment,
    minMoment,
    maxDeflection,
  })

  const stressResults = section ? computeStressResults(maxMoment, minMoment, maxShear, minShear, section) : null

  return {
    reactions,
    x,
    shear,
    moment,
    deflection,
    maxShear,
    minShear,
    maxMoment,
    minMoment,
    maxDeflection,
    keyPoints,
    stressResults,
  }
}
