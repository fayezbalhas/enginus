import {
  type ColumnType, type StepItem, type InteractionPoint,
  type SlendernessResult, type SecondOrderResult, type InteractionResult,
  type BiaxialResult, type ReinfResult, type LinkResult,
  barArea, fmt, circularSegmentArea,
} from './types'

const ES = 200000 // MPa

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeForcesEC2(
  colType: ColumnType, b: number, h: number, D: number, x: number,
  barPositions: { x: number; y: number }[], Ab: number,
  fcd: number, fyd: number,
): { N: number; M: number } {
  const ecu2 = 0.0035
  const lam = 0.8
  const hEff = colType === 'rectangular' ? h : D

  let Nc: number, Mc: number
  if (colType === 'rectangular') {
    const a = Math.min(lam * x, h)
    Nc = fcd * a * b
    Mc = Nc * (h / 2 - a / 2)
  } else {
    const R = D / 2
    const a = Math.min(lam * x, D)
    const seg = circularSegmentArea(R, a)
    Nc = fcd * seg.area
    Mc = Nc * (R - seg.centroidFromTop)
  }

  let Ns = 0, Ms = 0
  for (const bar of barPositions) {
    const eps = ecu2 * (x - bar.y) / x
    const sig = Math.sign(eps) * Math.min(Math.abs(eps) * ES, fyd)
    const F = sig * Ab
    Ns += F
    Ms += F * (hEff / 2 - bar.y)
  }

  return { N: Nc + Ns, M: Mc + Ms }
}

function computeForcesACI(
  colType: ColumnType, b: number, h: number, D: number, c: number,
  barPositions: { x: number; y: number }[], Ab: number,
  fc: number, fy: number, beta1: number,
): { N: number; M: number; epsT: number } {
  const ecu = 0.003
  const hEff = colType === 'rectangular' ? h : D

  let Cc: number, Mc: number
  const a = Math.min(beta1 * c, hEff)
  if (colType === 'rectangular') {
    Cc = 0.85 * fc * a * b
    Mc = Cc * (h / 2 - a / 2)
  } else {
    const R = D / 2
    const seg = circularSegmentArea(R, a)
    Cc = 0.85 * fc * seg.area
    Mc = Cc * (R - seg.centroidFromTop)
  }

  let Ns = 0, Ms = 0, epsT = 0
  let maxDepth = 0
  for (const bar of barPositions) {
    if (bar.y > maxDepth) maxDepth = bar.y
    const eps = ecu * (c - bar.y) / c
    const sig = Math.sign(eps) * Math.min(Math.abs(eps) * ES, fy)
    const F = sig * Ab
    Ns += F
    Ms += F * (hEff / 2 - bar.y)
  }
  epsT = ecu * (maxDepth - c) / c

  return { N: Cc + Ns, M: Mc + Ms, epsT }
}

function getPhiACI(epsT: number, fy: number, isSpiral: boolean): number {
  const epsY = fy / ES
  const phiMin = isSpiral ? 0.75 : 0.65
  if (epsT <= epsY) return phiMin
  if (epsT >= 0.005) return 0.90
  return phiMin + (0.90 - phiMin) * (epsT - epsY) / (0.005 - epsY)
}

function getMRdAtN(curve: InteractionPoint[], targetN: number): number {
  for (let i = 0; i < curve.length - 1; i++) {
    const p1 = curve[i], p2 = curve[i + 1]
    if ((targetN <= p1.N && targetN >= p2.N) || (targetN >= p1.N && targetN <= p2.N)) {
      const t = Math.abs(p1.N - p2.N) < 0.001 ? 0.5 : (p1.N - targetN) / (p1.N - p2.N)
      return p1.M + t * (p2.M - p1.M)
    }
  }
  return 0
}

function isInsideCurve(curve: InteractionPoint[], N: number, M: number): { inside: boolean; utilization: number } {
  const mBoundary = getMRdAtN(curve, N)
  if (mBoundary <= 0) return { inside: false, utilization: 999 }
  const util = Math.abs(M) / mBoundary
  return { inside: util <= 1.0, utilization: util }
}

// ── EC2 Slenderness §5.8.3 ──────────────────────────────────────────────────

export function calcSlendernessEC2(
  colType: ColumnType, b: number, h: number, D: number,
  leff: number, NEd_kN: number, fcd: number, fyd: number,
  As: number, Ac: number, phiEf: number, M01: number, M02: number,
): SlendernessResult {
  const steps: StepItem[] = []

  const Ic = colType === 'rectangular' ? b * Math.pow(h, 3) / 12 : Math.PI * Math.pow(D, 4) / 64
  const i = Math.sqrt(Ic / Ac)
  steps.push({ clause: 'EC2 §5.8.3.2', description: 'Radius of gyration', formula: colType === 'rectangular' ? 'i = √(Ic/Ac) = √(b·h³/12 / (b·h))' : 'i = √(Ic/Ac) = √(πD⁴/64 / (πD²/4))', substitution: `Ic = ${fmt(Ic, 0)} mm⁴, Ac = ${fmt(Ac, 0)} mm²`, result: `i = ${fmt(i, 1)} mm` })

  const lambda = leff / i
  steps.push({ clause: 'EC2 §5.8.3.2', description: 'Slenderness ratio', formula: 'λ = leff / i', substitution: `λ = ${fmt(leff, 0)} / ${fmt(i, 1)}`, result: `λ = ${fmt(lambda, 1)}` })

  const A = phiEf > 0 ? 1 / (1 + 0.2 * phiEf) : 0.7
  const omega = As * fyd / (Ac * fcd)
  const B = Math.sqrt(1 + 2 * omega)
  const rm = Math.abs(M02) > 0.001 ? M01 / M02 : 0
  const C = 1.7 - rm
  const NEd_N = NEd_kN * 1000
  const n = NEd_N / (Ac * fcd)
  const lambda_lim = n > 0 ? 20 * A * B * C / Math.sqrt(n) : 999

  steps.push({ clause: 'EC2 §5.8.3.1', description: 'Limiting slenderness parameters', formula: 'A = 1/(1+0.2φef), B = √(1+2ω), C = 1.7 − rm', substitution: `A = ${fmt(A, 2)}, ω = ${fmt(omega, 3)}, B = ${fmt(B, 2)}, rm = ${fmt(rm, 2)}, C = ${fmt(C, 2)}, n = ${fmt(n, 3)}`, result: `λlim = 20×${fmt(A, 2)}×${fmt(B, 2)}×${fmt(C, 2)}/√${fmt(n, 3)} = ${fmt(lambda_lim, 1)}` })

  const is_slender = lambda > lambda_lim
  steps.push({ clause: 'EC2 §5.8.3.1', description: 'Slenderness classification', formula: 'λ ≤ λlim → Short column; λ > λlim → Slender column', substitution: `${fmt(lambda, 1)} ${is_slender ? '>' : '≤'} ${fmt(lambda_lim, 1)}`, result: is_slender ? '⚠ SLENDER — second order effects required' : '✓ SHORT COLUMN — no second order effects' })

  return { lambda, lambda_lim, is_slender, i, leff, steps }
}

// ── ACI 318-19 Slenderness §6.2.5 ───────────────────────────────────────────

export function calcSlendernessACI(
  colType: ColumnType, h: number, D: number,
  k: number, lu: number, M1: number, M2: number,
): SlendernessResult {
  const steps: StepItem[] = []
  const r = colType === 'rectangular' ? 0.3 * h : 0.25 * D
  const leff = k * lu
  const lambda = leff / r

  steps.push({ clause: 'ACI §6.2.5', description: 'Radius of gyration', formula: colType === 'rectangular' ? 'r = 0.3h' : 'r = 0.25D', substitution: colType === 'rectangular' ? `r = 0.3 × ${h}` : `r = 0.25 × ${D}`, result: `r = ${fmt(r, 1)} mm` })
  steps.push({ clause: 'ACI §6.2.5', description: 'Slenderness ratio', formula: 'klu/r', substitution: `${fmt(k, 2)} × ${fmt(lu, 0)} / ${fmt(r, 1)}`, result: `klu/r = ${fmt(lambda, 1)}` })

  const ratio = Math.abs(M2) > 0.001 ? M1 / M2 : 0
  const limit_braced = Math.min(34 - 12 * ratio, 40)

  steps.push({ clause: 'ACI §6.2.5', description: 'Slenderness limit (braced frame)', formula: 'klu/r ≤ 34 − 12(M1/M2) ≤ 40', substitution: `34 − 12×(${fmt(ratio, 2)}) = ${fmt(34 - 12 * ratio, 1)}, capped at 40`, result: `Limit = ${fmt(limit_braced, 1)}` })

  const is_slender = lambda > limit_braced
  steps.push({ clause: 'ACI §6.2.5', description: 'Slenderness classification', formula: `klu/r ${is_slender ? '>' : '≤'} limit`, substitution: `${fmt(lambda, 1)} ${is_slender ? '>' : '≤'} ${fmt(limit_braced, 1)}`, result: is_slender ? '⚠ SLENDER — moment magnification required' : '✓ SHORT COLUMN' })

  return { lambda, lambda_lim: limit_braced, is_slender, i: r, leff, steps }
}

// ── EC2 Second Order Effects §5.8.8 ─────────────────────────────────────────

export function calcSecondOrderEC2(
  colType: ColumnType, b: number, h: number, D: number,
  leff: number, NEd_kN: number, fck: number, fcd: number, fyd: number,
  Ecm: number, As: number, Ac: number, lambda: number,
  phiEf: number, M02: number, e0: number,
): SecondOrderResult {
  const steps: StepItem[] = []
  const NEd = NEd_kN * 1000
  const d = colType === 'rectangular' ? h - (h - (h - 2 * (h * 0.1))) / 2 : D * 0.8
  const dEff = colType === 'rectangular' ? 0.8 * h : 0.8 * D

  const omega = As * fyd / (Ac * fcd)
  const nu = 1 + omega
  const nbal = 0.4
  const n = NEd / (Ac * fcd)
  const Kr = Math.min((nu - n) / (nu - nbal), 1.0)

  steps.push({ clause: 'EC2 §5.8.8.3', description: 'Correction factor Kr', formula: 'Kr = (nu − n)/(nu − nbal) ≤ 1.0', substitution: `nu = 1+${fmt(omega, 3)} = ${fmt(nu, 3)}, n = ${fmt(n, 3)}, nbal = 0.4`, result: `Kr = ${fmt(Kr, 3)}` })

  const beta = 0.35 + fck / 200 - lambda / 150
  const Kphi = Math.max(1 + beta * phiEf, 1.0)
  steps.push({ clause: 'EC2 §5.8.8.3', description: 'Creep factor Kφ', formula: 'Kφ = 1 + β·φef ≥ 1.0, β = 0.35 + fck/200 − λ/150', substitution: `β = 0.35 + ${fck}/200 − ${fmt(lambda, 1)}/150 = ${fmt(beta, 4)}`, result: `Kφ = ${fmt(Kphi, 3)}` })

  const oneOverR = Kr * Kphi * fyd / (ES * 0.45 * dEff)
  const c = 10
  const e2 = oneOverR * leff * leff / c
  const M2 = NEd * e2 / 1e6

  steps.push({ clause: 'EC2 §5.8.8.3', description: 'Second order eccentricity', formula: 'e2 = (1/r)·leff²/c, 1/r = Kr·Kφ·fyd/(Es·0.45·d)', substitution: `1/r = ${fmt(Kr, 3)}×${fmt(Kphi, 3)}×${fmt(fyd, 1)}/(${ES}×0.45×${fmt(dEff, 1)}) = ${fmt(oneOverR, 8)}`, result: `e2 = ${fmt(e2, 1)} mm` })
  steps.push({ clause: 'EC2 §5.8.8.3', description: 'Second order moment', formula: 'M2 = NEd × e2', substitution: `M2 = ${fmt(NEd / 1000, 1)} × ${fmt(e2, 1)} / 1000`, result: `M2 = ${fmt(M2, 2)} kN·m` })

  const M0Ed = Math.max(Math.abs(M02), NEd_kN * e0 / 1000)
  const MEd_total = M0Ed + M2
  steps.push({ clause: 'EC2 §5.8.8.2', description: 'Total design moment', formula: 'MEd = M0Ed + M2', substitution: `MEd = ${fmt(M0Ed, 2)} + ${fmt(M2, 2)}`, result: `MEd = ${fmt(MEd_total, 2)} kN·m` })

  const Ecd = Ecm / 1.2
  const Ic = colType === 'rectangular' ? b * Math.pow(h, 3) / 12 : Math.PI * Math.pow(D, 4) / 64
  const k1 = Math.sqrt(fck / 20)
  const k2 = Math.min(n * lambda / 170, 0.20)
  const Kc = k1 * k2 / (1 + phiEf)
  const Is = As * Math.pow(dEff / 2 - (colType === 'rectangular' ? h : D) / 2, 2)
  const EI = Kc * Ecd * Ic + 1.0 * ES * Is
  const NB = Math.PI * Math.PI * EI / (leff * leff) / 1000

  steps.push({ clause: 'EC2 §5.8.7.2', description: 'Nominal stiffness & buckling load', formula: 'EI = Kc·Ecd·Ic + Ks·Es·Is, NB = π²EI/leff²', substitution: `Kc = ${fmt(Kc, 4)}, Ecd = ${fmt(Ecd, 0)}`, result: `NB = ${fmt(NB, 1)} kN` })

  return { M2, e2, MEd_total, NB, Kr, Kphi, steps }
}

// ── ACI Moment Magnification §6.6.4 ─────────────────────────────────────────

export function calcMomentMagACI(
  colType: ColumnType, b: number, h: number, D: number,
  k: number, lu: number, NEd_kN: number, fc: number, fy: number,
  Ec: number, As: number, M1: number, M2: number,
): SecondOrderResult {
  const steps: StepItem[] = []
  const r = colType === 'rectangular' ? 0.3 * h : 0.25 * D
  const leff = k * lu

  const Ig = colType === 'rectangular' ? b * Math.pow(h, 3) / 12 : Math.PI * Math.pow(D, 4) / 64
  const betaDns = 0.6
  const EI = (0.4 * Ec * Ig) / (1 + betaDns)
  const Pc = Math.PI * Math.PI * EI / (leff * leff) / 1000

  steps.push({ clause: 'ACI §6.6.4.4', description: 'Critical buckling load', formula: 'EI = 0.4·Ec·Ig/(1+βdns), Pc = π²EI/(klu)²', substitution: `EI = 0.4×${fmt(Ec, 0)}×${fmt(Ig, 0)}/(1+${betaDns})`, result: `Pc = ${fmt(Pc, 1)} kN` })

  const ratio = Math.abs(M2) > 0.001 ? M1 / M2 : 0
  const Cm = Math.max(0.6 + 0.4 * ratio, 0.4)
  const Pu = NEd_kN
  const denom = 1 - Pu / (0.75 * Pc)
  const deltaNs = denom > 0 ? Math.max(Cm / denom, 1.0) : 99

  steps.push({ clause: 'ACI §6.6.4.5', description: 'Moment magnification factor', formula: 'δns = Cm/(1−Pu/(0.75Pc)) ≥ 1.0', substitution: `Cm = ${fmt(Cm, 3)}, Pu/(0.75Pc) = ${fmt(Pu / (0.75 * Pc), 3)}`, result: `δns = ${fmt(deltaNs, 3)}` })

  const Mc = deltaNs * Math.abs(M2)
  const hEff = colType === 'rectangular' ? h : D
  const eMin = Math.max(hEff / 30, 15)
  const MMin = Pu * eMin / 1000
  const MEd_total = Math.max(Mc, MMin)

  steps.push({ clause: 'ACI §6.6.4', description: 'Design moment', formula: 'Mc = δns × M2', substitution: `Mc = ${fmt(deltaNs, 3)} × ${fmt(Math.abs(M2), 2)}`, result: `Mc = ${fmt(MEd_total, 2)} kN·m` })

  return { M2: Mc - Math.abs(M2), e2: 0, MEd_total, NB: Pc, Kr: 0, Kphi: deltaNs, steps }
}

// ── EC2 Interaction Diagram §6.1 ─────────────────────────────────────────────

export function calcInteractionEC2(
  colType: ColumnType, b: number, h: number, D: number,
  barPositions: { x: number; y: number }[], barDia: number,
  fck: number, fyd: number, fcd: number,
  NEd_kN: number, MEd_kNm: number,
): InteractionResult {
  const steps: StepItem[] = []
  const Ab = barArea(barDia)
  const hEff = colType === 'rectangular' ? h : D
  const Ac = colType === 'rectangular' ? b * h : Math.PI * D * D / 4
  const As = barPositions.length * Ab

  steps.push({ clause: 'EC2 §6.1', description: 'Section properties', formula: 'Ac = b×h, As = n×π×φ²/4', substitution: `Ac = ${fmt(Ac, 0)} mm², As = ${barPositions.length}×π×${barDia}²/4`, result: `As = ${fmt(As, 0)} mm²` })

  const curve: InteractionPoint[] = []
  const Nmax = (fcd * Ac + fyd * As) / 1000
  curve.push({ N: Nmax, M: 0 })
  steps.push({ clause: 'EC2 §6.1', description: 'Maximum axial capacity', formula: 'Nmax = fcd·Ac + fyd·As', substitution: `Nmax = ${fmt(fcd, 2)}×${fmt(Ac, 0)} + ${fmt(fyd, 1)}×${fmt(As, 0)}`, result: `Nmax = ${fmt(Nmax, 1)} kN` })

  for (let i = 1; i <= 50; i++) {
    const x = hEff * (3.0 * (1 - i / 50) + 0.01 * (i / 50))
    if (x <= 0) continue
    const { N, M } = computeForcesEC2(colType, b, h, D, x, barPositions, Ab, fcd, fyd)
    curve.push({ N: N / 1000, M: Math.abs(M) / 1e6 })
  }

  const Nt = -fyd * As / 1000
  curve.push({ N: Nt, M: 0 })
  curve.sort((a, bb) => bb.N - a.N)

  const { inside, utilization } = isInsideCurve(curve, NEd_kN, MEd_kNm)
  steps.push({ clause: 'EC2 §6.1', description: 'N-M interaction check', formula: 'Design point must lie within interaction curve', substitution: `(NEd, MEd) = (${fmt(NEd_kN, 1)}, ${fmt(MEd_kNm, 2)}) kN, kN·m`, result: `Utilization = ${fmt(utilization * 100, 1)}% — ${inside ? '✓ PASS' : '✗ FAIL'}` })

  return { curve, NEd: NEd_kN, MEd: MEd_kNm, pass: inside, utilization, steps }
}

// ── ACI Interaction Diagram ──────────────────────────────────────────────────

export function calcInteractionACI(
  colType: ColumnType, b: number, h: number, D: number,
  barPositions: { x: number; y: number }[], barDia: number,
  fc: number, fy: number,
  NEd_kN: number, MEd_kNm: number,
): InteractionResult {
  const steps: StepItem[] = []
  const Ab = barArea(barDia)
  const hEff = colType === 'rectangular' ? h : D
  const Ac = colType === 'rectangular' ? b * h : Math.PI * D * D / 4
  const As = barPositions.length * Ab
  const isSpiral = colType === 'circular'

  const beta1 = Math.max(0.65, Math.min(0.85, 0.85 - 0.05 * (fc - 28) / 7))
  steps.push({ clause: 'ACI §22.2.2.4', description: 'Stress block factor', formula: 'β1 = 0.85 − 0.05(f\'c−28)/7', substitution: `β1 = 0.85 − 0.05×(${fc}−28)/7`, result: `β1 = ${fmt(beta1, 3)}` })

  const curve: InteractionPoint[] = []

  const capFactor = isSpiral ? 0.85 : 0.80
  const phi0 = isSpiral ? 0.75 : 0.65
  const PnMax = 0.85 * fc * (Ac - As) + fy * As
  const phiPnMax = capFactor * phi0 * PnMax / 1000
  curve.push({ N: phiPnMax, M: 0 })

  steps.push({ clause: 'ACI §22.4.2', description: 'Maximum axial capacity', formula: `φPn,max = ${fmt(capFactor, 2)}·φ·[0.85f'c(Ag−Ast)+fy·Ast]`, substitution: `= ${fmt(capFactor, 2)}×${fmt(phi0, 2)}×(0.85×${fc}×${fmt(Ac - As, 0)}+${fy}×${fmt(As, 0)})`, result: `φPn,max = ${fmt(phiPnMax, 1)} kN` })

  for (let i = 1; i <= 50; i++) {
    const c = hEff * (3.0 * (1 - i / 50) + 0.01 * (i / 50))
    if (c <= 0) continue
    const { N, M, epsT } = computeForcesACI(colType, b, h, D, c, barPositions, Ab, fc, fy, beta1)
    const phi = getPhiACI(epsT, fy, isSpiral)
    const phiN = phi * N / 1000
    const phiM = phi * Math.abs(M) / 1e6
    const cappedN = Math.min(phiN, phiPnMax)
    curve.push({ N: cappedN, M: phiM })
  }

  const Nt = -0.9 * fy * As / 1000
  curve.push({ N: Nt, M: 0 })
  curve.sort((a, bb) => bb.N - a.N)

  const { inside, utilization } = isInsideCurve(curve, NEd_kN, MEd_kNm)
  steps.push({ clause: 'ACI §22.4', description: 'N-M interaction check', formula: 'Design point must lie within φ-factored interaction curve', substitution: `(Pu, Mu) = (${fmt(NEd_kN, 1)}, ${fmt(MEd_kNm, 2)}) kN, kN·m`, result: `Utilization = ${fmt(utilization * 100, 1)}% — ${inside ? '✓ PASS' : '✗ FAIL'}` })

  return { curve, NEd: NEd_kN, MEd: MEd_kNm, pass: inside, utilization, steps }
}

// ── Biaxial Bending ──────────────────────────────────────────────────────────

export function calcBiaxialEC2(
  curveY: InteractionPoint[], curveZ: InteractionPoint[],
  NEd: number, MEd_y: number, MEd_z: number, NRd: number,
): BiaxialResult {
  const steps: StepItem[] = []
  const MRd_y = getMRdAtN(curveY, NEd)
  const MRd_z = getMRdAtN(curveZ, NEd)

  steps.push({ clause: 'EC2 §5.8.9(4)', description: 'Moment capacities at NEd', formula: 'MRd from interaction curves at N = NEd', substitution: `NEd = ${fmt(NEd, 1)} kN`, result: `MRd,y = ${fmt(MRd_y, 2)} kN·m, MRd,z = ${fmt(MRd_z, 2)} kN·m` })

  const nRatio = NRd > 0 ? NEd / NRd : 0
  let a: number
  if (nRatio <= 0.1) a = 1.0
  else if (nRatio >= 1.0) a = 2.0
  else if (nRatio <= 0.7) a = 1.0 + (1.5 - 1.0) * (nRatio - 0.1) / (0.7 - 0.1)
  else a = 1.5 + (2.0 - 1.5) * (nRatio - 0.7) / (1.0 - 0.7)

  steps.push({ clause: 'EC2 §5.8.9(4)', description: 'Exponent a', formula: 'a interpolated from NEd/NRd table', substitution: `NEd/NRd = ${fmt(nRatio, 3)}`, result: `a = ${fmt(a, 2)}` })

  const ratioY = MRd_y > 0 ? Math.abs(MEd_y) / MRd_y : 999
  const ratioZ = MRd_z > 0 ? Math.abs(MEd_z) / MRd_z : 999
  const check = Math.pow(ratioY, a) + Math.pow(ratioZ, a)

  steps.push({ clause: 'EC2 §5.8.9(4)', description: 'Biaxial check', formula: '(MEd,y/MRd,y)^a + (MEd,z/MRd,z)^a ≤ 1.0', substitution: `(${fmt(Math.abs(MEd_y), 2)}/${fmt(MRd_y, 2)})^${fmt(a, 2)} + (${fmt(Math.abs(MEd_z), 2)}/${fmt(MRd_z, 2)})^${fmt(a, 2)}`, result: `${fmt(check, 3)} ${check <= 1.0 ? '✓ PASS' : '✗ FAIL'}` })

  return { check_value: check, exponent_a: a, pass: check <= 1.0, steps }
}

export function calcBiaxialACI(
  curveY: InteractionPoint[], curveZ: InteractionPoint[],
  NEd: number, MEd_y: number, MEd_z: number, phiPn0: number,
): BiaxialResult {
  const steps: StepItem[] = []
  const MRd_y = getMRdAtN(curveY, NEd)
  const MRd_z = getMRdAtN(curveZ, NEd)

  const phiPnx = getMRdAtN(curveY, NEd) > 0 ? NEd : 0
  const phiPny = getMRdAtN(curveZ, NEd) > 0 ? NEd : 0

  steps.push({ clause: 'ACI Bresler', description: 'Bresler reciprocal load method', formula: '1/φPn = 1/φPnx + 1/φPny − 1/φP0', substitution: `φP0 = ${fmt(phiPn0, 1)} kN`, result: `MRd,y = ${fmt(MRd_y, 2)}, MRd,z = ${fmt(MRd_z, 2)} kN·m` })

  const ratioY = MRd_y > 0 ? Math.abs(MEd_y) / MRd_y : 999
  const ratioZ = MRd_z > 0 ? Math.abs(MEd_z) / MRd_z : 999
  const check = Math.pow(ratioY, 2) + Math.pow(ratioZ, 2)

  steps.push({ clause: 'ACI §R22.4', description: 'Simplified biaxial check', formula: '(Mu,y/φMn,y)² + (Mu,z/φMn,z)² ≤ 1.0', substitution: `(${fmt(Math.abs(MEd_y), 2)}/${fmt(MRd_y, 2)})² + (${fmt(Math.abs(MEd_z), 2)}/${fmt(MRd_z, 2)})²`, result: `${fmt(check, 3)} ${check <= 1.0 ? '✓ PASS' : '✗ FAIL'}` })

  return { check_value: check, exponent_a: 2, pass: check <= 1.0, steps }
}

// ── Reinforcement Limits ─────────────────────────────────────────────────────

export function calcReinfLimitsEC2(
  Ac: number, As: number, NEd_kN: number, fyd: number,
): ReinfResult {
  const steps: StepItem[] = []
  const As_min1 = 0.1 * NEd_kN * 1000 / fyd
  const As_min2 = 0.002 * Ac
  const As_min = Math.max(As_min1, As_min2)
  const As_max = 0.04 * Ac

  steps.push({ clause: 'EC2 §9.5.2(2)', description: 'Minimum reinforcement', formula: 'As,min = max(0.1·NEd/fyd, 0.002·Ac)', substitution: `max(0.1×${fmt(NEd_kN * 1000, 0)}/${fmt(fyd, 1)}, 0.002×${fmt(Ac, 0)})`, result: `As,min = ${fmt(As_min, 0)} mm²` })
  steps.push({ clause: 'EC2 §9.5.2(3)', description: 'Maximum reinforcement', formula: 'As,max = 0.04·Ac (outside laps)', substitution: `As,max = 0.04 × ${fmt(Ac, 0)}`, result: `As,max = ${fmt(As_max, 0)} mm²` })

  const rho = As / Ac
  const pass_min = As >= As_min
  const pass_max = As <= As_max

  steps.push({ clause: 'EC2 §9.5.2', description: 'Check', formula: 'As,min ≤ As ≤ As,max', substitution: `${fmt(As_min, 0)} ≤ ${fmt(As, 0)} ≤ ${fmt(As_max, 0)}`, result: `ρ = ${fmt(rho * 100, 2)}% — ${pass_min && pass_max ? '✓ PASS' : '✗ FAIL'}` })

  return { As_total: As, As_min, As_max, rho, pass_min, pass_max, steps }
}

export function calcReinfLimitsACI(
  Ac: number, As: number,
): ReinfResult {
  const steps: StepItem[] = []
  const As_min = 0.01 * Ac
  const As_max = 0.08 * Ac

  steps.push({ clause: 'ACI §10.6.1.1', description: 'Reinforcement limits', formula: '0.01·Ag ≤ Ast ≤ 0.08·Ag', substitution: `0.01×${fmt(Ac, 0)} = ${fmt(As_min, 0)}, 0.08×${fmt(Ac, 0)} = ${fmt(As_max, 0)}`, result: `Ast = ${fmt(As, 0)} mm² — ${As >= As_min && As <= As_max ? '✓ PASS' : '✗ FAIL'}` })

  return { As_total: As, As_min, As_max, rho: As / Ac, pass_min: As >= As_min, pass_max: As <= As_max, steps }
}

// ── Link / Tie Design ────────────────────────────────────────────────────────

export function calcLinksEC2(
  barDiaMin: number, b: number, h: number, l0: number,
  linkDia: number, linkSpacing: number,
): LinkResult {
  const steps: StepItem[] = []
  const dia_min = Math.max(6, barDiaMin / 4)
  const s_max = Math.min(20 * barDiaMin, Math.min(b, h), 400)
  const lc = Math.max(h, b, l0 / 6, 450)

  steps.push({ clause: 'EC2 §9.5.3(1)', description: 'Minimum link diameter', formula: 'φlink,min = max(6mm, φbar/4)', substitution: `max(6, ${barDiaMin}/4)`, result: `φlink,min = ${fmt(dia_min, 0)} mm — ${linkDia >= dia_min ? '✓' : '✗'}` })
  steps.push({ clause: 'EC2 §9.5.3(3)', description: 'Maximum link spacing', formula: 'scl,max = min(20φbar, b, h, 400mm)', substitution: `min(${20 * barDiaMin}, ${b}, ${h}, 400)`, result: `scl,max = ${fmt(s_max, 0)} mm — ${linkSpacing <= s_max ? '✓' : '✗'}` })
  steps.push({ clause: 'EC2 §9.5.3(4)', description: 'Critical zone', formula: 'lc = max(h, b, l0/6, 450mm)', substitution: `max(${h}, ${b}, ${fmt(l0 / 6, 0)}, 450)`, result: `lc = ${fmt(lc, 0)} mm — spacing in zone = 0.6×${fmt(s_max, 0)} = ${fmt(0.6 * s_max, 0)} mm` })

  return { dia_min, spacing_max: s_max, pass_dia: linkDia >= dia_min, pass_spacing: linkSpacing <= s_max, steps }
}

export function calcTiesACI(
  barDiaMax: number, b: number, h: number,
  tieDia: number, tieSpacing: number,
): LinkResult {
  const steps: StepItem[] = []
  const dia_min = barDiaMax > 32.3 ? 12.7 : 9.5
  const diaLabel = barDiaMax > 32.3 ? '#4 for bars > #10' : '#3 for bars ≤ #10'
  const s_max = Math.min(16 * barDiaMax, 48 * tieDia, Math.min(b, h))

  steps.push({ clause: 'ACI §25.7.2.2', description: 'Minimum tie diameter', formula: diaLabel, substitution: `Bar dia = ${fmt(barDiaMax, 1)} mm`, result: `φtie,min = ${fmt(dia_min, 1)} mm — ${tieDia >= dia_min ? '✓' : '✗'}` })
  steps.push({ clause: 'ACI §25.7.2.1', description: 'Maximum tie spacing', formula: 's ≤ min(16φbar, 48φtie, least dim.)', substitution: `min(${fmt(16 * barDiaMax, 0)}, ${fmt(48 * tieDia, 0)}, ${Math.min(b, h)})`, result: `s_max = ${fmt(s_max, 0)} mm — ${tieSpacing <= s_max ? '✓' : '✗'}` })

  return { dia_min, spacing_max: s_max, pass_dia: tieDia >= dia_min, pass_spacing: tieSpacing <= s_max, steps }
}

// ── Minimum Eccentricity ─────────────────────────────────────────────────────

export function calcMinEccentricity(
  colType: ColumnType, h: number, D: number, NEd_kN: number, MEd: number, code: string,
): { e0: number; MEd_min: number; MEd_design: number; steps: StepItem[] } {
  const steps: StepItem[] = []
  const hEff = colType === 'rectangular' ? h : D

  if (code === 'EC2') {
    const e0 = Math.max(hEff / 30, 20)
    const MEd_min = NEd_kN * e0 / 1000
    const MEd_design = Math.max(Math.abs(MEd), MEd_min)
    steps.push({ clause: 'EC2 §6.1(4)', description: 'Minimum eccentricity', formula: 'e0 = max(h/30, 20mm)', substitution: `e0 = max(${fmt(hEff / 30, 1)}, 20)`, result: `e0 = ${fmt(e0, 1)} mm → MEd,min = ${fmt(MEd_min, 2)} kN·m` })
    steps.push({ clause: 'EC2 §6.1(4)', description: 'Design moment', formula: 'MEd = max(|MEd|, MEd,min)', substitution: `max(${fmt(Math.abs(MEd), 2)}, ${fmt(MEd_min, 2)})`, result: `MEd = ${fmt(MEd_design, 2)} kN·m` })
    return { e0, MEd_min, MEd_design, steps }
  }

  const e0 = Math.max(hEff / 30, 15)
  const MEd_min = NEd_kN * e0 / 1000
  const MEd_design = Math.max(Math.abs(MEd), MEd_min)
  steps.push({ clause: 'ACI §6.6.4.5.4', description: 'Minimum eccentricity', formula: 'emin = max(h/30, 15mm)', substitution: `emin = max(${fmt(hEff / 30, 1)}, 15)`, result: `emin = ${fmt(e0, 1)} mm → Mu,min = ${fmt(MEd_min, 2)} kN·m` })
  return { e0, MEd_min, MEd_design, steps }
}
