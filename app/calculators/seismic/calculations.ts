import {
  type StepItem, type SeismicResult, type FloorData, type FloorForce,
  type EC8GroundType, type ASCESystem, type PeriodMethod,
  fmt, getFa, getFv,
} from './types'

// ── EC8 Elastic Response Spectrum Se(T) ─────────────────────────────────────

function ec8Se(T: number, ag: number, S: number, TB: number, TC: number, TD: number, eta: number): number {
  if (T <= 0) return ag * S * (1 + 0 * (eta * 2.5 - 1))
  if (T <= TB) return ag * S * (1 + (T / TB) * (eta * 2.5 - 1))
  if (T <= TC) return ag * S * eta * 2.5
  if (T <= TD) return ag * S * eta * 2.5 * (TC / T)
  return ag * S * eta * 2.5 * (TC * TD) / (T * T)
}

// ── EC8 Design Spectrum Sd(T) ───────────────────────────────────────────────

function ec8Sd(T: number, ag: number, S: number, TB: number, TC: number, TD: number, eta: number, q: number, beta: number): number {
  const se = ec8Se(T, ag, S, TB, TC, TD, eta)
  return Math.max(se / q, ag * beta)
}

// ── EC8 Full Calculation ────────────────────────────────────────────────────

export function calcEC8(
  ground: EC8GroundType,
  ag: number,         // design PGA in g
  damping: number,    // damping ratio in %
  q: number,          // behavior factor
  Ct: number,         // period coefficient
  H: number,          // total height (m)
  W_total: number,    // total weight (kN)
  nFloors: number,
  floors: FloorData[] | null,  // null = use equal weights
  periodMethod: PeriodMethod,
  gammaI: number,
): SeismicResult {
  const steps_period: StepItem[] = []
  const steps_spectrum: StepItem[] = []
  const steps_baseShear: StepItem[] = []
  const steps_distribution: StepItem[] = []

  const { S, TB, TC, TD } = ground
  const ag_design = ag * gammaI  // importance-adjusted PGA

  steps_spectrum.push({
    clause: 'EC8 §4.2.2',
    description: 'Importance-adjusted PGA',
    formula: 'ag,d = ag × γI',
    substitution: `ag,d = ${fmt(ag, 3)} × ${fmt(gammaI, 2)}`,
    result: `ag,d = ${fmt(ag_design, 4)} g`,
  })

  // Damping correction
  const eta = Math.max(Math.sqrt(10 / (5 + damping)), 0.55)
  steps_spectrum.push({
    clause: 'EC8 §3.2.2.2',
    description: 'Damping correction factor',
    formula: 'η = max(√(10/(5+ξ)), 0.55)',
    substitution: `η = max(√(10/(5+${damping})), 0.55)`,
    result: `η = ${fmt(eta, 3)}`,
  })

  steps_spectrum.push({
    clause: 'EC8 Table 3.1',
    description: 'Ground type parameters',
    formula: `Type ${ground.label}: S, TB, TC, TD`,
    substitution: `S=${S}, TB=${TB}s, TC=${TC}s, TD=${TD}s`,
    result: `Ground type ${ground.label} - ${ground.description}`,
  })

  // Period calculation
  const T_approx = Ct * Math.pow(H, 0.75)
  steps_period.push({
    clause: 'EC8 §4.3.3.2.2',
    description: 'Approximate fundamental period',
    formula: 'T1 = Ct × H^(3/4)',
    substitution: `T1 = ${Ct} × ${fmt(H, 1)}^0.75`,
    result: `T1 = ${fmt(T_approx, 3)} s`,
  })

  let T1 = T_approx

  // Rayleigh method if per-floor data available
  if (periodMethod === 'rayleigh' && floors && floors.length > 0) {
    // Approximate deflections: linear distribution delta_i = zi/H
    let sumMiDi2 = 0
    let sumFiDi = 0
    for (const f of floors) {
      const delta_i = f.height / H
      const mi = f.weight / 9.81  // kN to mass (kN*s^2/m)
      const Fi_approx = f.weight * f.height / H  // approximate lateral force
      sumMiDi2 += mi * delta_i * delta_i
      sumFiDi += Fi_approx * delta_i
    }
    if (sumFiDi > 0) {
      const T_rayleigh = 2 * Math.PI * Math.sqrt(sumMiDi2 / sumFiDi)
      steps_period.push({
        clause: 'EC8 §4.3.3.2.2',
        description: 'Rayleigh method period',
        formula: 'T1 = 2π√(Σ(mi·δi²) / Σ(Fi·δi))',
        substitution: `Σ(mi·δi²) = ${fmt(sumMiDi2, 2)}, Σ(Fi·δi) = ${fmt(sumFiDi, 2)}`,
        result: `T1 (Rayleigh) = ${fmt(T_rayleigh, 3)} s`,
      })
      T1 = T_rayleigh
    }
  }

  steps_period.push({
    clause: '',
    description: 'Adopted fundamental period',
    formula: '',
    substitution: '',
    result: `T1 = ${fmt(T1, 3)} s`,
  })

  // Spectral values at T1
  const Se_T1 = ec8Se(T1, ag_design, S, TB, TC, TD, eta)
  const beta = 0.2
  const Sd_T1 = ec8Sd(T1, ag_design, S, TB, TC, TD, eta, q, beta)

  steps_spectrum.push({
    clause: 'EC8 §3.2.2.2',
    description: 'Elastic spectral acceleration at T1',
    formula: T1 <= TB ? 'Se(T) = ag·S·[1 + T/TB·(η·2.5 - 1)]'
      : T1 <= TC ? 'Se(T) = ag·S·η·2.5'
      : T1 <= TD ? 'Se(T) = ag·S·η·2.5·TC/T'
      : 'Se(T) = ag·S·η·2.5·TC·TD/T²',
    substitution: `Se(${fmt(T1, 3)}) with ag=${fmt(ag_design, 3)}g, S=${S}`,
    result: `Se(T1) = ${fmt(Se_T1, 4)} g`,
  })

  steps_spectrum.push({
    clause: 'EC8 §3.2.2.5',
    description: 'Design spectral acceleration',
    formula: 'Sd(T) = Se(T) / q ≥ ag·β',
    substitution: `Sd = ${fmt(Se_T1, 4)} / ${fmt(q, 2)} = ${fmt(Se_T1 / q, 4)}, min = ${fmt(ag_design * beta, 4)}`,
    result: `Sd(T1) = ${fmt(Sd_T1, 4)} g`,
  })

  // Lambda factor
  const lambda = (T1 <= 2 * TC && nFloors > 2) ? 0.85 : 1.0
  steps_baseShear.push({
    clause: 'EC8 §4.3.3.2.2',
    description: 'Correction factor λ',
    formula: 'λ = 0.85 if T1 ≤ 2·TC and stories > 2, else 1.0',
    substitution: `T1=${fmt(T1, 3)}s, 2TC=${fmt(2 * TC, 2)}s, stories=${nFloors}`,
    result: `λ = ${fmt(lambda, 2)}`,
  })

  // Base shear
  const Fb = Sd_T1 * W_total * lambda * 9.81 / 9.81  // Sd in g units, W in kN -> Fb in kN
  // Actually: Sd(T1) is in units of g. Fb = Sd(T1) * m * g = Sd(T1) * W (since W = m*g)
  const baseShear = Sd_T1 * W_total * lambda
  const Cs = baseShear / W_total

  steps_baseShear.push({
    clause: 'EC8 §4.3.3.2.2',
    description: 'Seismic base shear',
    formula: 'Fb = Sd(T1) × W × λ',
    substitution: `Fb = ${fmt(Sd_T1, 4)} × ${fmt(W_total, 1)} × ${fmt(lambda, 2)}`,
    result: `Fb = ${fmt(baseShear, 1)} kN (${fmt(Cs * 100, 2)}% of W)`,
  })

  // Vertical distribution
  const floorForces: FloorForce[] = []
  let floorDataArr: FloorData[]

  if (floors && floors.length > 0) {
    floorDataArr = floors
  } else {
    // Equal floor weights, linear height distribution
    const wi = W_total / nFloors
    floorDataArr = []
    for (let i = 1; i <= nFloors; i++) {
      floorDataArr.push({ weight: wi, height: (i / nFloors) * H })
    }
  }

  const sumZiWi = floorDataArr.reduce((s, f) => s + f.height * f.weight, 0)

  steps_distribution.push({
    clause: 'EC8 §4.3.3.2.3',
    description: 'Vertical force distribution',
    formula: 'Fi = Fb × (zi·wi) / Σ(zj·wj)',
    substitution: `Σ(zj·wj) = ${fmt(sumZiWi, 1)}`,
    result: `Distributing Fb = ${fmt(baseShear, 1)} kN over ${floorDataArr.length} floors`,
  })

  for (let i = 0; i < floorDataArr.length; i++) {
    const f = floorDataArr[i]
    const Cvx = sumZiWi > 0 ? (f.height * f.weight) / sumZiWi : 0
    const Fi = baseShear * Cvx
    floorForces.push({
      floor: i + 1,
      zi: f.height,
      wi: f.weight,
      Cvx,
      Fi,
      Vi: 0, // computed below
    })
  }

  // Story shears (cumulative from top)
  let cumShear = 0
  for (let i = floorForces.length - 1; i >= 0; i--) {
    cumShear += floorForces[i].Fi
    floorForces[i].Vi = cumShear
  }

  // Generate spectrum points
  const spectrumPoints: { T: number; Se: number; Sd: number }[] = []
  for (let t = 0; t <= 4.0; t += 0.02) {
    spectrumPoints.push({
      T: t,
      Se: ec8Se(t, ag_design, S, TB, TC, TD, eta),
      Sd: ec8Sd(t, ag_design, S, TB, TC, TD, eta, q, beta),
    })
  }

  return {
    T1,
    Se_T1,
    Sd_T1,
    baseShear,
    W_total,
    Cs,
    lambda,
    floors: floorForces,
    spectrumPoints,
    steps_period,
    steps_spectrum,
    steps_baseShear,
    steps_distribution,
  }
}

// ── ASCE 7-22 Full Calculation ──────────────────────────────────────────────

export function calcASCE7(
  siteClass: string,
  Ss: number,
  S1: number,
  TL: number,
  system: ASCESystem,
  R: number,
  Ie: number,
  H: number,           // total height (m for SI, ft for Imperial)
  W_total: number,     // total weight (kN for SI, kip for Imperial)
  nFloors: number,
  floors: FloorData[] | null,
  units: 'SI' | 'Imperial',
): SeismicResult {
  const steps_period: StepItem[] = []
  const steps_spectrum: StepItem[] = []
  const steps_baseShear: StepItem[] = []
  const steps_distribution: StepItem[] = []

  const heightUnit = units === 'SI' ? 'm' : 'ft'
  const forceUnit = units === 'SI' ? 'kN' : 'kip'

  // Site coefficients
  const Fa = getFa(siteClass, Ss)
  const Fv = getFv(siteClass, S1)

  steps_spectrum.push({
    clause: 'ASCE 7 Table 11.4-1/2',
    description: 'Site coefficients',
    formula: 'Fa, Fv from site class and Ss, S1',
    substitution: `Site ${siteClass}: Ss=${fmt(Ss, 3)}g, S1=${fmt(S1, 3)}g`,
    result: `Fa = ${fmt(Fa, 2)}, Fv = ${fmt(Fv, 2)}`,
  })

  const SMS = Fa * Ss
  const SM1 = Fv * S1
  steps_spectrum.push({
    clause: 'ASCE 7 §11.4.3',
    description: 'MCE spectral accelerations',
    formula: 'SMS = Fa·Ss, SM1 = Fv·S1',
    substitution: `SMS = ${fmt(Fa, 2)}×${fmt(Ss, 3)}, SM1 = ${fmt(Fv, 2)}×${fmt(S1, 3)}`,
    result: `SMS = ${fmt(SMS, 4)}g, SM1 = ${fmt(SM1, 4)}g`,
  })

  const SDS = (2 / 3) * SMS
  const SD1 = (2 / 3) * SM1
  steps_spectrum.push({
    clause: 'ASCE 7 §11.4.4',
    description: 'Design spectral accelerations',
    formula: 'SDS = 2/3·SMS, SD1 = 2/3·SM1',
    substitution: `SDS = 2/3×${fmt(SMS, 4)}, SD1 = 2/3×${fmt(SM1, 4)}`,
    result: `SDS = ${fmt(SDS, 4)}g, SD1 = ${fmt(SD1, 4)}g`,
  })

  // Period
  const Ct = system.Ct
  const x = system.x
  // For ASCE 7, height must be in feet for the period formula
  const hn_ft = units === 'SI' ? H * 3.281 : H
  const Ta = Ct * Math.pow(hn_ft, x)

  steps_period.push({
    clause: 'ASCE 7 §12.8.2.1',
    description: 'Approximate fundamental period',
    formula: 'Ta = Ct × hn^x',
    substitution: `Ta = ${Ct} × ${fmt(hn_ft, 1)}^${x}`,
    result: `Ta = ${fmt(Ta, 3)} s`,
  })

  const T1 = Ta

  steps_period.push({
    clause: '',
    description: 'Adopted fundamental period',
    formula: '',
    substitution: '',
    result: `T = ${fmt(T1, 3)} s`,
  })

  // Base shear coefficient Cs
  let Cs = SDS / (R / Ie)
  steps_baseShear.push({
    clause: 'ASCE 7 Eq. 12.8-2',
    description: 'Seismic response coefficient (initial)',
    formula: 'Cs = SDS / (R/Ie)',
    substitution: `Cs = ${fmt(SDS, 4)} / (${fmt(R, 2)}/${fmt(Ie, 2)})`,
    result: `Cs = ${fmt(Cs, 5)}`,
  })

  // Upper limit
  const Cs_upper = T1 <= TL
    ? SD1 / (T1 * (R / Ie))
    : SD1 * TL / (T1 * T1 * (R / Ie))

  steps_baseShear.push({
    clause: T1 <= TL ? 'ASCE 7 Eq. 12.8-3' : 'ASCE 7 Eq. 12.8-4',
    description: 'Upper limit on Cs',
    formula: T1 <= TL ? 'Cs ≤ SD1 / (T·R/Ie)' : 'Cs ≤ SD1·TL / (T²·R/Ie)',
    substitution: T1 <= TL
      ? `Cs,max = ${fmt(SD1, 4)} / (${fmt(T1, 3)}×${fmt(R / Ie, 2)})`
      : `Cs,max = ${fmt(SD1, 4)}×${fmt(TL, 1)} / (${fmt(T1, 3)}²×${fmt(R / Ie, 2)})`,
    result: `Cs,max = ${fmt(Cs_upper, 5)}`,
  })

  if (Cs > Cs_upper) Cs = Cs_upper

  // Lower limits
  const Cs_min1 = 0.044 * SDS * Ie
  const Cs_min2 = 0.01
  let Cs_min = Math.max(Cs_min1, Cs_min2)

  steps_baseShear.push({
    clause: 'ASCE 7 Eq. 12.8-5',
    description: 'Lower limit on Cs',
    formula: 'Cs ≥ max(0.044·SDS·Ie, 0.01)',
    substitution: `Cs,min = max(0.044×${fmt(SDS, 4)}×${fmt(Ie, 2)}, 0.01) = max(${fmt(Cs_min1, 5)}, ${Cs_min2})`,
    result: `Cs,min = ${fmt(Cs_min, 5)}`,
  })

  if (S1 >= 0.6) {
    const Cs_min_s1 = 0.5 * S1 / (R / Ie)
    steps_baseShear.push({
      clause: 'ASCE 7 Eq. 12.8-6',
      description: 'Additional lower limit (S1 ≥ 0.6g)',
      formula: 'Cs ≥ 0.5·S1 / (R/Ie)',
      substitution: `Cs,min,S1 = 0.5×${fmt(S1, 3)} / (${fmt(R / Ie, 2)})`,
      result: `Cs,min,S1 = ${fmt(Cs_min_s1, 5)}`,
    })
    Cs_min = Math.max(Cs_min, Cs_min_s1)
  }

  if (Cs < Cs_min) Cs = Cs_min

  steps_baseShear.push({
    clause: 'ASCE 7 §12.8.1',
    description: 'Final seismic response coefficient',
    formula: 'Cs,min ≤ Cs ≤ Cs,max',
    substitution: `${fmt(Cs_min, 5)} ≤ Cs ≤ ${fmt(Cs_upper, 5)}`,
    result: `Cs = ${fmt(Cs, 5)}`,
  })

  const V = Cs * W_total

  steps_baseShear.push({
    clause: 'ASCE 7 Eq. 12.8-1',
    description: 'Seismic base shear',
    formula: 'V = Cs × W',
    substitution: `V = ${fmt(Cs, 5)} × ${fmt(W_total, 1)}`,
    result: `V = ${fmt(V, 1)} ${forceUnit} (${fmt(Cs * 100, 2)}% of W)`,
  })

  // Vertical distribution (ASCE 7 §12.8.3)
  let k: number
  if (T1 <= 0.5) k = 1
  else if (T1 >= 2.5) k = 2
  else k = 1 + (T1 - 0.5) / 2

  steps_distribution.push({
    clause: 'ASCE 7 §12.8.3',
    description: 'Vertical distribution exponent',
    formula: 'k = 1 for T≤0.5s, k=2 for T≥2.5s, interpolate',
    substitution: `T = ${fmt(T1, 3)} s`,
    result: `k = ${fmt(k, 3)}`,
  })

  let floorDataArr: FloorData[]
  if (floors && floors.length > 0) {
    floorDataArr = floors
  } else {
    const wi = W_total / nFloors
    floorDataArr = []
    for (let i = 1; i <= nFloors; i++) {
      floorDataArr.push({ weight: wi, height: (i / nFloors) * H })
    }
  }

  const sumWiHik = floorDataArr.reduce((s, f) => s + f.weight * Math.pow(f.height, k), 0)

  steps_distribution.push({
    clause: 'ASCE 7 Eq. 12.8-12',
    description: 'Vertical force distribution',
    formula: 'Cvx = wx·hx^k / Σ(wi·hi^k)',
    substitution: `Σ(wi·hi^k) = ${fmt(sumWiHik, 1)}`,
    result: `Distributing V = ${fmt(V, 1)} ${forceUnit} over ${floorDataArr.length} floors`,
  })

  const floorForces: FloorForce[] = []
  for (let i = 0; i < floorDataArr.length; i++) {
    const f = floorDataArr[i]
    const Cvx = sumWiHik > 0 ? (f.weight * Math.pow(f.height, k)) / sumWiHik : 0
    const Fi = V * Cvx
    floorForces.push({
      floor: i + 1,
      zi: f.height,
      wi: f.weight,
      Cvx,
      Fi,
      Vi: 0,
    })
  }

  // Story shears (cumulative from top)
  let cumShear = 0
  for (let i = floorForces.length - 1; i >= 0; i--) {
    cumShear += floorForces[i].Fi
    floorForces[i].Vi = cumShear
  }

  // Generate spectrum points for ASCE 7
  const T0 = 0.2 * SD1 / SDS
  const Ts = SD1 / SDS
  const spectrumPoints: { T: number; Se: number; Sd: number }[] = []
  for (let t = 0; t <= 4.0; t += 0.02) {
    let Sa: number
    if (t <= T0) {
      Sa = SDS * (0.4 + 0.6 * t / T0)
    } else if (t <= Ts) {
      Sa = SDS
    } else if (t <= TL) {
      Sa = SD1 / t
    } else {
      Sa = SD1 * TL / (t * t)
    }
    spectrumPoints.push({ T: t, Se: Sa, Sd: Sa })
  }

  // Spectral acceleration at T1
  let Sa_T1: number
  if (T1 <= T0) Sa_T1 = SDS * (0.4 + 0.6 * T1 / T0)
  else if (T1 <= Ts) Sa_T1 = SDS
  else if (T1 <= TL) Sa_T1 = SD1 / T1
  else Sa_T1 = SD1 * TL / (T1 * T1)

  return {
    T1,
    Se_T1: Sa_T1,
    Sd_T1: Cs,  // For ASCE 7, design Cs is the effective spectral acceleration coefficient
    baseShear: V,
    W_total,
    Cs,
    lambda: 1.0,
    floors: floorForces,
    spectrumPoints,
    steps_period,
    steps_spectrum,
    steps_baseShear,
    steps_distribution,
  }
}
