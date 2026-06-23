import {
  type StepItem, type SteelSection, type SteelGrade, type SupportType,
  type ClassificationResult, type BendingResult, type ShearResult, type LTBResult, type DeflectionResult,
  fmt, E_STEEL, G_STEEL, getC1, getMomentCoeff, getShearCoeff, getDeflCoeff,
} from './types'

// ── EC3 Section Classification (Table 5.2) ───────────────────────────────────

export function classifyEC3(
  sec: SteelSection, grade: SteelGrade,
): ClassificationResult {
  const steps: StepItem[] = []
  const fy = grade.fy
  const epsilon = Math.sqrt(235 / fy)

  steps.push({
    clause: 'EC3 Table 5.2',
    description: 'Material factor epsilon',
    formula: 'epsilon = sqrt(235 / fy)',
    substitution: `epsilon = sqrt(235 / ${fy})`,
    result: `epsilon = ${fmt(epsilon, 3)}`,
  })

  // Flange classification (outstand flange)
  const c_f = (sec.b - sec.tw - 2 * sec.r) / 2
  const flangeRatio = c_f / sec.tf

  steps.push({
    clause: 'EC3 Table 5.2',
    description: 'Flange outstand',
    formula: 'c = (b - tw - 2r) / 2',
    substitution: `c = (${sec.b} - ${sec.tw} - 2x${sec.r}) / 2`,
    result: `c = ${fmt(c_f, 1)} mm, c/tf = ${fmt(flangeRatio, 2)}`,
  })

  let flangeClass: number
  if (flangeRatio <= 9 * epsilon) flangeClass = 1
  else if (flangeRatio <= 10 * epsilon) flangeClass = 2
  else if (flangeRatio <= 14 * epsilon) flangeClass = 3
  else flangeClass = 4

  steps.push({
    clause: 'EC3 Table 5.2',
    description: 'Flange classification',
    formula: `Limits: Class 1 <= ${fmt(9 * epsilon, 2)}, Class 2 <= ${fmt(10 * epsilon, 2)}, Class 3 <= ${fmt(14 * epsilon, 2)}`,
    substitution: `c/tf = ${fmt(flangeRatio, 2)}`,
    result: `Flange: Class ${flangeClass}`,
  })

  // Web classification (internal part in bending)
  const d_w = sec.h - 2 * sec.tf - 2 * sec.r
  const webRatio = d_w / sec.tw

  steps.push({
    clause: 'EC3 Table 5.2',
    description: 'Web depth (clear between flanges)',
    formula: 'd = h - 2tf - 2r',
    substitution: `d = ${sec.h} - 2x${sec.tf} - 2x${sec.r}`,
    result: `d = ${fmt(d_w, 1)} mm, d/tw = ${fmt(webRatio, 2)}`,
  })

  let webClass: number
  if (webRatio <= 72 * epsilon) webClass = 1
  else if (webRatio <= 83 * epsilon) webClass = 2
  else if (webRatio <= 124 * epsilon) webClass = 3
  else webClass = 4

  steps.push({
    clause: 'EC3 Table 5.2',
    description: 'Web classification',
    formula: `Limits: Class 1 <= ${fmt(72 * epsilon, 1)}, Class 2 <= ${fmt(83 * epsilon, 1)}, Class 3 <= ${fmt(124 * epsilon, 1)}`,
    substitution: `d/tw = ${fmt(webRatio, 2)}`,
    result: `Web: Class ${webClass}`,
  })

  const sectionClass = Math.max(flangeClass, webClass)
  steps.push({
    clause: 'EC3 §5.5.2',
    description: 'Overall section class',
    formula: 'Section class = max(flange class, web class)',
    substitution: `max(${flangeClass}, ${webClass})`,
    result: `Section Class ${sectionClass}`,
  })

  return { flangeClass, webClass, sectionClass, epsilon, flangeRatio, webRatio, steps }
}

// ── EC3 Bending Resistance (SS6.2.5) ─────────────────────────────────────────

export function calcBendingEC3(
  sec: SteelSection, grade: SteelGrade, sectionClass: number,
  MEd: number, gammaM0: number,
): BendingResult {
  const steps: StepItem[] = []
  const fy = grade.fy

  const W = sectionClass <= 2 ? sec.Wply : sec.Wely
  const Wlabel = sectionClass <= 2 ? 'Wpl,y' : 'Wel,y'

  steps.push({
    clause: 'EC3 §6.2.5',
    description: `Section modulus (Class ${sectionClass})`,
    formula: `${Wlabel} for Class ${sectionClass <= 2 ? '1,2' : '3'}`,
    substitution: `${Wlabel} = ${fmt(W, 1)} x 10^3 mm^3`,
    result: `${Wlabel} = ${fmt(W * 1e3, 0)} mm^3`,
  })

  const McRd = W * 1e3 * fy / gammaM0 / 1e6
  steps.push({
    clause: 'EC3 §6.2.5(2)',
    description: 'Design bending resistance',
    formula: `Mc,Rd = ${Wlabel} x fy / gammaM0`,
    substitution: `Mc,Rd = ${fmt(W * 1e3, 0)} x ${fy} / ${gammaM0}`,
    result: `Mc,Rd = ${fmt(McRd, 1)} kN.m`,
  })

  const utilization = MEd / McRd * 100
  steps.push({
    clause: 'EC3 §6.2.5',
    description: 'Bending check',
    formula: 'MEd / Mc,Rd <= 1.0',
    substitution: `${fmt(MEd, 1)} / ${fmt(McRd, 1)}`,
    result: `Ratio = ${fmt(MEd / McRd, 3)} ${MEd <= McRd ? '< 1.0 OK' : '> 1.0 FAIL'}`,
  })

  return {
    McRd, MEd, utilization,
    pass: MEd <= McRd,
    steps,
  }
}

// ── EC3 Shear Resistance (SS6.2.6) ───────────────────────────────────────────

export function calcShearEC3(
  sec: SteelSection, grade: SteelGrade,
  VEd: number, gammaM0: number,
): ShearResult {
  const steps: StepItem[] = []
  const fy = grade.fy

  // Shear area for rolled I/H sections loaded parallel to web
  const Av = sec.A - 2 * sec.b * sec.tf + (sec.tw + 2 * sec.r) * sec.tf
  const Av_min = 1.0 * sec.h * sec.tw // eta * hw * tw

  const AvUsed = Math.max(Av, Av_min)

  steps.push({
    clause: 'EC3 §6.2.6(3)',
    description: 'Shear area for rolled I-section',
    formula: 'Av = A - 2*b*tf + (tw + 2*r)*tf',
    substitution: `Av = ${sec.A} - 2x${sec.b}x${sec.tf} + (${sec.tw} + 2x${sec.r})x${sec.tf}`,
    result: `Av = ${fmt(AvUsed, 0)} mm^2`,
  })

  const VplRd = AvUsed * (fy / Math.sqrt(3)) / gammaM0 / 1000
  steps.push({
    clause: 'EC3 §6.2.6(2)',
    description: 'Plastic shear resistance',
    formula: 'Vpl,Rd = Av x (fy / sqrt(3)) / gammaM0',
    substitution: `Vpl,Rd = ${fmt(AvUsed, 0)} x (${fy} / sqrt(3)) / ${gammaM0}`,
    result: `Vpl,Rd = ${fmt(VplRd, 1)} kN`,
  })

  const utilization = VEd / VplRd * 100
  steps.push({
    clause: 'EC3 §6.2.6',
    description: 'Shear check',
    formula: 'VEd / Vpl,Rd <= 1.0',
    substitution: `${fmt(VEd, 1)} / ${fmt(VplRd, 1)}`,
    result: `Ratio = ${fmt(VEd / VplRd, 3)} ${VEd <= VplRd ? '< 1.0 OK' : '> 1.0 FAIL'}`,
  })

  return {
    VplRd, VEd, Av: AvUsed, utilization,
    pass: VEd <= VplRd,
    steps,
  }
}

// ── EC3 Lateral-Torsional Buckling (SS6.3.2) ─────────────────────────────────

export function calcLTB_EC3(
  sec: SteelSection, grade: SteelGrade, sectionClass: number,
  MEd: number, Lcr: number, support: SupportType,
  gammaM1: number,
): LTBResult {
  const steps: StepItem[] = []
  const fy = grade.fy
  const C1 = getC1(support)

  steps.push({
    clause: 'EC3 §6.3.2.2',
    description: 'Moment distribution factor',
    formula: 'C1 depends on moment diagram',
    substitution: `Support: ${support.replace(/_/g, ' ')}`,
    result: `C1 = ${fmt(C1, 3)}`,
  })

  // Convert section properties from stored units
  const Iz = sec.Iz * 1e6     // mm^4
  const It = sec.It * 1e3     // mm^4
  const Iw = sec.Iw * 1e9    // mm^6

  const Lcr_mm = Lcr * 1000

  // Elastic critical moment Mcr
  const pi2EIz = Math.PI * Math.PI * E_STEEL * Iz
  const term1 = Iw / Iz
  const term2 = Lcr_mm * Lcr_mm * G_STEEL * It / (pi2EIz)
  const Mcr = C1 * pi2EIz / (Lcr_mm * Lcr_mm) * Math.sqrt(term1 + term2) / 1e6

  steps.push({
    clause: 'EC3 §6.3.2.2',
    description: 'Elastic critical moment for LTB',
    formula: 'Mcr = C1 * pi^2*E*Iz/Lcr^2 * sqrt(Iw/Iz + Lcr^2*G*It/(pi^2*E*Iz))',
    substitution: `Iz=${fmt(Iz / 1e6, 2)}x10^6, It=${fmt(It / 1e3, 2)}x10^3, Iw=${fmt(Iw / 1e9, 4)}x10^9, Lcr=${Lcr_mm} mm`,
    result: `Mcr = ${fmt(Mcr, 1)} kN.m`,
  })

  // Non-dimensional slenderness
  const W = sectionClass <= 2 ? sec.Wply * 1e3 : sec.Wely * 1e3
  const lambdaLT = Math.sqrt(W * fy / (Mcr * 1e6))

  steps.push({
    clause: 'EC3 §6.3.2.2',
    description: 'Non-dimensional slenderness',
    formula: 'lambdaLT = sqrt(Wy * fy / Mcr)',
    substitution: `lambdaLT = sqrt(${fmt(W, 0)} x ${fy} / ${fmt(Mcr * 1e6, 0)})`,
    result: `lambdaLT = ${fmt(lambdaLT, 3)}`,
  })

  // Imperfection factor (rolled sections)
  const hb_ratio = sec.h / sec.b
  const alphaLT = hb_ratio <= 2 ? 0.34 : 0.49

  steps.push({
    clause: 'EC3 Table 6.5',
    description: 'LTB imperfection factor',
    formula: 'alphaLT from buckling curve (h/b ratio)',
    substitution: `h/b = ${fmt(hb_ratio, 2)} ${hb_ratio <= 2 ? '<= 2 -> curve b' : '> 2 -> curve c'}`,
    result: `alphaLT = ${fmt(alphaLT, 2)}`,
  })

  // Reduction factor (method for rolled sections EC3 §6.3.2.3)
  const lambdaLT_0 = 0.4
  const beta = 0.75
  const phiLT = 0.5 * (1 + alphaLT * (lambdaLT - lambdaLT_0) + beta * lambdaLT * lambdaLT)

  steps.push({
    clause: 'EC3 §6.3.2.3',
    description: 'LTB parameter phi',
    formula: 'phiLT = 0.5 * [1 + alphaLT*(lambdaLT - 0.4) + 0.75*lambdaLT^2]',
    substitution: `phiLT = 0.5 * [1 + ${fmt(alphaLT, 2)}*(${fmt(lambdaLT, 3)} - 0.4) + 0.75*${fmt(lambdaLT, 3)}^2]`,
    result: `phiLT = ${fmt(phiLT, 4)}`,
  })

  let chiLT = 1 / (phiLT + Math.sqrt(phiLT * phiLT - beta * lambdaLT * lambdaLT))
  chiLT = Math.min(chiLT, 1.0)
  chiLT = Math.min(chiLT, 1 / (lambdaLT * lambdaLT))
  if (lambdaLT <= lambdaLT_0) chiLT = 1.0

  steps.push({
    clause: 'EC3 §6.3.2.3',
    description: 'LTB reduction factor',
    formula: 'chiLT = 1 / (phiLT + sqrt(phiLT^2 - 0.75*lambdaLT^2)) <= 1.0',
    substitution: `chiLT = 1 / (${fmt(phiLT, 4)} + sqrt(${fmt(phiLT, 4)}^2 - 0.75*${fmt(lambdaLT, 3)}^2))`,
    result: `chiLT = ${fmt(chiLT, 4)}`,
  })

  // Design buckling resistance
  const MbRd = chiLT * W * fy / gammaM1 / 1e6

  steps.push({
    clause: 'EC3 §6.3.2.1',
    description: 'Design LTB resistance',
    formula: 'Mb,Rd = chiLT * Wy * fy / gammaM1',
    substitution: `Mb,Rd = ${fmt(chiLT, 4)} x ${fmt(W, 0)} x ${fy} / ${gammaM1}`,
    result: `Mb,Rd = ${fmt(MbRd, 1)} kN.m`,
  })

  const utilization = MEd / MbRd * 100
  steps.push({
    clause: 'EC3 §6.3.2.1',
    description: 'LTB check',
    formula: 'MEd / Mb,Rd <= 1.0',
    substitution: `${fmt(MEd, 1)} / ${fmt(MbRd, 1)}`,
    result: `Ratio = ${fmt(MEd / MbRd, 3)} ${MEd <= MbRd ? '< 1.0 OK' : '> 1.0 FAIL'}`,
  })

  return {
    MbRd, MEd, Mcr, chiLT, lambdaLT, utilization,
    pass: MEd <= MbRd,
    steps,
  }
}

// ── EC3 Deflection ───────────────────────────────────────────────────────────

export function calcDeflectionEC3(
  sec: SteelSection, L: number, gk: number, qk: number, support: SupportType,
): DeflectionResult {
  const steps: StepItem[] = []
  const L_mm = L * 1000
  const Iy = sec.Iy * 1e6 // mm^4
  const coeff = getDeflCoeff(support)

  steps.push({
    clause: 'EC3 §7.2.1',
    description: 'Deflection coefficient',
    formula: `Coefficient for ${support.replace(/_/g, ' ')} beam`,
    substitution: `k = ${support === 'cantilever' ? '1/8' : support === 'fixed_fixed' ? '1/384' : '5/384'}`,
    result: `k = ${fmt(coeff, 6)}`,
  })

  const gk_Nmm = gk // kN/m -> N/mm = kN/m (numerically same since 1 kN/m = 1 N/mm)
  const qk_Nmm = qk

  const delta_dead = coeff * gk_Nmm * Math.pow(L_mm, 4) / (E_STEEL * Iy)
  steps.push({
    clause: '',
    description: 'Dead load deflection',
    formula: 'delta_dead = k * gk * L^4 / (E * Iy)',
    substitution: `delta_dead = ${fmt(coeff, 6)} x ${gk} x ${L_mm}^4 / (${E_STEEL} x ${fmt(Iy, 0)})`,
    result: `delta_dead = ${fmt(delta_dead, 2)} mm`,
  })

  const delta_live = coeff * qk_Nmm * Math.pow(L_mm, 4) / (E_STEEL * Iy)
  steps.push({
    clause: '',
    description: 'Live load deflection',
    formula: 'delta_live = k * qk * L^4 / (E * Iy)',
    substitution: `delta_live = ${fmt(coeff, 6)} x ${qk} x ${L_mm}^4 / (${E_STEEL} x ${fmt(Iy, 0)})`,
    result: `delta_live = ${fmt(delta_live, 2)} mm`,
  })

  const delta_total = delta_dead + delta_live
  steps.push({
    clause: '',
    description: 'Total deflection',
    formula: 'delta_total = delta_dead + delta_live',
    substitution: `delta_total = ${fmt(delta_dead, 2)} + ${fmt(delta_live, 2)}`,
    result: `delta_total = ${fmt(delta_total, 2)} mm`,
  })

  const limit_live = L_mm / 300
  const limit_total = L_mm / 250

  steps.push({
    clause: 'EC3 §7.2.1',
    description: 'Deflection limits',
    formula: 'Live: L/300, Total: L/250',
    substitution: `L = ${L_mm} mm`,
    result: `Limit live = ${fmt(limit_live, 2)} mm, Limit total = ${fmt(limit_total, 2)} mm`,
  })

  const pass_live = delta_live <= limit_live
  const pass_total = delta_total <= limit_total

  steps.push({
    clause: 'EC3 §7.2.1',
    description: 'Deflection check',
    formula: 'delta_live <= L/300 AND delta_total <= L/250',
    substitution: `${fmt(delta_live, 2)} vs ${fmt(limit_live, 2)}, ${fmt(delta_total, 2)} vs ${fmt(limit_total, 2)}`,
    result: `Live: ${pass_live ? 'OK' : 'FAIL'}, Total: ${pass_total ? 'OK' : 'FAIL'}`,
  })

  return {
    delta_dead, delta_live, delta_total,
    limit_live, limit_total,
    pass_live, pass_total,
    pass: pass_live && pass_total,
    steps,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AISC 360-22
// ═══════════════════════════════════════════════════════════════════════════════

// ── AISC Compact Check ───────────────────────────────────────────────────────

export function classifyAISC(
  sec: SteelSection, grade: SteelGrade,
): ClassificationResult {
  const steps: StepItem[] = []
  const Fy = grade.fy
  const epsilon = Math.sqrt(E_STEEL / Fy)

  // Flange compactness
  const lambda_f = sec.b / (2 * sec.tf)
  const lambda_pf = 0.38 * Math.sqrt(E_STEEL / Fy)
  const lambda_rf = 1.0 * Math.sqrt(E_STEEL / Fy)

  steps.push({
    clause: 'AISC Table B4.1b',
    description: 'Flange slenderness',
    formula: 'lambda_f = bf / (2*tf)',
    substitution: `lambda_f = ${sec.b} / (2 x ${sec.tf})`,
    result: `lambda_f = ${fmt(lambda_f, 2)}`,
  })

  steps.push({
    clause: 'AISC Table B4.1b',
    description: 'Flange compact limit',
    formula: 'lambda_pf = 0.38 * sqrt(E/Fy)',
    substitution: `lambda_pf = 0.38 x sqrt(${E_STEEL}/${Fy})`,
    result: `lambda_pf = ${fmt(lambda_pf, 2)}`,
  })

  let flangeClass: number
  if (lambda_f <= lambda_pf) flangeClass = 1
  else if (lambda_f <= lambda_rf) flangeClass = 2
  else flangeClass = 3

  const flangeLabel = flangeClass === 1 ? 'Compact' : flangeClass === 2 ? 'Noncompact' : 'Slender'
  steps.push({
    clause: 'AISC B4',
    description: 'Flange classification',
    formula: `lambda_f = ${fmt(lambda_f, 2)} vs lambda_pf = ${fmt(lambda_pf, 2)}`,
    substitution: '',
    result: `Flange: ${flangeLabel}`,
  })

  // Web compactness
  const hw = sec.h - 2 * sec.tf
  const lambda_w = hw / sec.tw
  const lambda_pw = 3.76 * Math.sqrt(E_STEEL / Fy)
  const lambda_rw = 5.70 * Math.sqrt(E_STEEL / Fy)

  steps.push({
    clause: 'AISC Table B4.1b',
    description: 'Web slenderness',
    formula: 'lambda_w = h_w / tw',
    substitution: `lambda_w = ${fmt(hw, 1)} / ${sec.tw}`,
    result: `lambda_w = ${fmt(lambda_w, 2)}`,
  })

  steps.push({
    clause: 'AISC Table B4.1b',
    description: 'Web compact limit',
    formula: 'lambda_pw = 3.76 * sqrt(E/Fy)',
    substitution: `lambda_pw = 3.76 x sqrt(${E_STEEL}/${Fy})`,
    result: `lambda_pw = ${fmt(lambda_pw, 2)}`,
  })

  let webClass: number
  if (lambda_w <= lambda_pw) webClass = 1
  else if (lambda_w <= lambda_rw) webClass = 2
  else webClass = 3

  const webLabel = webClass === 1 ? 'Compact' : webClass === 2 ? 'Noncompact' : 'Slender'
  steps.push({
    clause: 'AISC B4',
    description: 'Web classification',
    formula: `lambda_w = ${fmt(lambda_w, 2)} vs lambda_pw = ${fmt(lambda_pw, 2)}`,
    substitution: '',
    result: `Web: ${webLabel}`,
  })

  const sectionClass = Math.max(flangeClass, webClass)
  const overall = sectionClass === 1 ? 'Compact' : sectionClass === 2 ? 'Noncompact' : 'Slender'
  steps.push({
    clause: 'AISC B4',
    description: 'Overall section classification',
    formula: 'Section = max(flange, web)',
    substitution: `max(${flangeLabel}, ${webLabel})`,
    result: `Section: ${overall}`,
  })

  return {
    flangeClass, webClass, sectionClass, epsilon,
    flangeRatio: lambda_f, webRatio: lambda_w,
    steps,
  }
}

// ── AISC Flexure (Chapter F2) ────────────────────────────────────────────────

export function calcBendingAISC(
  sec: SteelSection, grade: SteelGrade,
  MEd: number, Lb: number,
): BendingResult {
  const steps: StepItem[] = []
  const Fy = grade.fy
  const phi = 0.9

  // Zx = Wply (in mm^3 x 10^3, so Zx in mm^3 = Wply * 1e3)
  // Sx = Wely
  const Zx = sec.Wply * 1e3  // mm^3
  const Sx = sec.Wely * 1e3  // mm^3
  const ry = sec.iz           // radius of gyration about weak axis for LTB = iz

  const Mp = Fy * Zx / 1e6   // kN.m

  steps.push({
    clause: 'AISC F2.1',
    description: 'Plastic moment',
    formula: 'Mp = Fy x Zx',
    substitution: `Mp = ${Fy} x ${fmt(Zx, 0)}`,
    result: `Mp = ${fmt(Mp, 1)} kN.m`,
  })

  // Lp
  const Lb_mm = Lb * 1000
  const Lp = 1.76 * ry * Math.sqrt(E_STEEL / Fy)

  steps.push({
    clause: 'AISC F2-5',
    description: 'Limiting unbraced length Lp',
    formula: 'Lp = 1.76 * ry * sqrt(E/Fy)',
    substitution: `Lp = 1.76 x ${fmt(ry, 1)} x sqrt(${E_STEEL}/${Fy})`,
    result: `Lp = ${fmt(Lp, 0)} mm = ${fmt(Lp / 1000, 2)} m`,
  })

  // Lr calculation
  const Iy_mm4 = sec.Iy * 1e6
  const Iz_mm4 = sec.Iz * 1e6
  const Cw = sec.Iw * 1e9     // mm^6
  const J = sec.It * 1e3      // mm^4
  const ho = sec.h - sec.tf   // distance between flange centroids
  const rts2 = Math.sqrt(Math.sqrt(Iz_mm4 * Cw)) / Math.sqrt(Sx)
  const rts = Math.sqrt(Iz_mm4 * ho / (2 * Sx))

  const c_coeff = 1.0 // for doubly symmetric I-shapes

  const term_a = (0.7 * Fy * Sx * ho) / (E_STEEL * J)
  const Lr = 1.95 * rts * (E_STEEL / (0.7 * Fy)) * Math.sqrt(J / (Sx * ho) + Math.sqrt((J / (Sx * ho)) * (J / (Sx * ho)) + 6.76 * Math.pow(0.7 * Fy / E_STEEL, 2)))

  steps.push({
    clause: 'AISC F2-6',
    description: 'Limiting unbraced length Lr',
    formula: 'Lr = 1.95*rts*(E/(0.7Fy))*sqrt(J/(Sx*ho) + sqrt((J/(Sx*ho))^2 + 6.76*(0.7Fy/E)^2))',
    substitution: `rts=${fmt(rts, 1)}, J=${fmt(J, 0)}, ho=${fmt(ho, 1)}`,
    result: `Lr = ${fmt(Lr, 0)} mm = ${fmt(Lr / 1000, 2)} m`,
  })

  let Mn: number
  const Cb = 1.0 // conservative for general loading

  if (Lb_mm <= Lp) {
    Mn = Mp
    steps.push({
      clause: 'AISC F2.1',
      description: 'Yielding (Lb <= Lp)',
      formula: 'Mn = Mp (full plastic capacity)',
      substitution: `Lb = ${fmt(Lb_mm, 0)} mm <= Lp = ${fmt(Lp, 0)} mm`,
      result: `Mn = ${fmt(Mn, 1)} kN.m`,
    })
  } else if (Lb_mm <= Lr) {
    Mn = Math.min(Cb * (Mp - (Mp - 0.7 * Fy * Sx / 1e6) * (Lb_mm - Lp) / (Lr - Lp)), Mp)
    steps.push({
      clause: 'AISC F2-2',
      description: 'Inelastic LTB (Lp < Lb <= Lr)',
      formula: 'Mn = Cb*[Mp - (Mp - 0.7*Fy*Sx)*(Lb-Lp)/(Lr-Lp)] <= Mp',
      substitution: `Lb = ${fmt(Lb_mm, 0)} mm, Cb = ${fmt(Cb, 2)}`,
      result: `Mn = ${fmt(Mn, 1)} kN.m`,
    })
  } else {
    const Fcr = Cb * Math.PI * Math.PI * E_STEEL / ((Lb_mm / rts) * (Lb_mm / rts)) * Math.sqrt(1 + 0.078 * J / (Sx * ho) * (Lb_mm / rts) * (Lb_mm / rts))
    Mn = Math.min(Fcr * Sx / 1e6, Mp)
    steps.push({
      clause: 'AISC F2-3, F2-4',
      description: 'Elastic LTB (Lb > Lr)',
      formula: 'Fcr = Cb*pi^2*E/(Lb/rts)^2 * sqrt(1 + 0.078*J/(Sx*ho)*(Lb/rts)^2)',
      substitution: `Fcr = ${fmt(Fcr, 1)} MPa`,
      result: `Mn = ${fmt(Mn, 1)} kN.m`,
    })
  }

  const phiMn = phi * Mn
  steps.push({
    clause: 'AISC F1',
    description: 'Design flexural strength',
    formula: 'phiMn = 0.9 x Mn',
    substitution: `phiMn = 0.9 x ${fmt(Mn, 1)}`,
    result: `phiMn = ${fmt(phiMn, 1)} kN.m`,
  })

  const utilization = MEd / phiMn * 100
  steps.push({
    clause: 'AISC F1',
    description: 'Flexure check',
    formula: 'Mu / phiMn <= 1.0',
    substitution: `${fmt(MEd, 1)} / ${fmt(phiMn, 1)}`,
    result: `Ratio = ${fmt(MEd / phiMn, 3)} ${MEd <= phiMn ? '< 1.0 OK' : '> 1.0 FAIL'}`,
  })

  return {
    McRd: phiMn, MEd, utilization,
    pass: MEd <= phiMn,
    steps,
  }
}

// ── AISC Shear (Chapter G2) ─────────────────────────────────────────────────

export function calcShearAISC(
  sec: SteelSection, grade: SteelGrade,
  VEd: number,
): ShearResult {
  const steps: StepItem[] = []
  const Fy = grade.fy

  const hw = sec.h - 2 * sec.tf
  const Aw = hw * sec.tw

  steps.push({
    clause: 'AISC G2.1',
    description: 'Web area',
    formula: 'Aw = (h - 2*tf) * tw',
    substitution: `Aw = (${sec.h} - 2x${sec.tf}) x ${sec.tw}`,
    result: `Aw = ${fmt(Aw, 0)} mm^2`,
  })

  // Check if h/tw <= 2.24*sqrt(E/Fy)
  const htw = hw / sec.tw
  const limit_htw = 2.24 * Math.sqrt(E_STEEL / Fy)
  const Cv1 = 1.0 // for most hot-rolled I-shapes with h/tw <= 2.24*sqrt(E/Fy)
  const phiV = htw <= limit_htw ? 1.0 : 0.9

  steps.push({
    clause: 'AISC G2.1',
    description: 'Web slenderness check',
    formula: 'h/tw <= 2.24*sqrt(E/Fy)?',
    substitution: `${fmt(htw, 1)} vs ${fmt(limit_htw, 1)}`,
    result: `${htw <= limit_htw ? 'Yes -> phiV = 1.0, Cv1 = 1.0' : 'No -> phiV = 0.9'}`,
  })

  const Vn = 0.6 * Fy * Aw * Cv1 / 1000
  steps.push({
    clause: 'AISC G2-1',
    description: 'Nominal shear strength',
    formula: 'Vn = 0.6 * Fy * Aw * Cv1',
    substitution: `Vn = 0.6 x ${Fy} x ${fmt(Aw, 0)} x ${Cv1}`,
    result: `Vn = ${fmt(Vn, 1)} kN`,
  })

  const phiVn = phiV * Vn
  steps.push({
    clause: 'AISC G1',
    description: 'Design shear strength',
    formula: `phiVn = ${phiV} x Vn`,
    substitution: `phiVn = ${phiV} x ${fmt(Vn, 1)}`,
    result: `phiVn = ${fmt(phiVn, 1)} kN`,
  })

  const utilization = VEd / phiVn * 100
  steps.push({
    clause: 'AISC G1',
    description: 'Shear check',
    formula: 'Vu / phiVn <= 1.0',
    substitution: `${fmt(VEd, 1)} / ${fmt(phiVn, 1)}`,
    result: `Ratio = ${fmt(VEd / phiVn, 3)} ${VEd <= phiVn ? '< 1.0 OK' : '> 1.0 FAIL'}`,
  })

  return {
    VplRd: phiVn, VEd, Av: Aw, utilization,
    pass: VEd <= phiVn,
    steps,
  }
}

// ── AISC Deflection ──────────────────────────────────────────────────────────

export function calcDeflectionAISC(
  sec: SteelSection, L: number, gk: number, qk: number, support: SupportType,
): DeflectionResult {
  const steps: StepItem[] = []
  const L_mm = L * 1000
  const Iy = sec.Iy * 1e6  // mm^4 (strong axis - Ix in AISC notation)
  const coeff = getDeflCoeff(support)

  steps.push({
    clause: 'AISC L1',
    description: 'Deflection coefficient',
    formula: `Coefficient for ${support.replace(/_/g, ' ')} beam`,
    substitution: `k = ${support === 'cantilever' ? '1/8' : support === 'fixed_fixed' ? '1/384' : '5/384'}`,
    result: `k = ${fmt(coeff, 6)}`,
  })

  const delta_dead = coeff * gk * Math.pow(L_mm, 4) / (E_STEEL * Iy)
  steps.push({
    clause: '',
    description: 'Dead load deflection',
    formula: 'delta_D = k * wD * L^4 / (E * Ix)',
    substitution: `delta_D = ${fmt(coeff, 6)} x ${gk} x ${L_mm}^4 / (${E_STEEL} x ${fmt(Iy, 0)})`,
    result: `delta_D = ${fmt(delta_dead, 2)} mm`,
  })

  const delta_live = coeff * qk * Math.pow(L_mm, 4) / (E_STEEL * Iy)
  steps.push({
    clause: '',
    description: 'Live load deflection',
    formula: 'delta_L = k * wL * L^4 / (E * Ix)',
    substitution: `delta_L = ${fmt(coeff, 6)} x ${qk} x ${L_mm}^4 / (${E_STEEL} x ${fmt(Iy, 0)})`,
    result: `delta_L = ${fmt(delta_live, 2)} mm`,
  })

  const delta_total = delta_dead + delta_live
  steps.push({
    clause: '',
    description: 'Total deflection',
    formula: 'delta_total = delta_D + delta_L',
    substitution: `delta_total = ${fmt(delta_dead, 2)} + ${fmt(delta_live, 2)}`,
    result: `delta_total = ${fmt(delta_total, 2)} mm`,
  })

  const limit_live = L_mm / 240
  const limit_total = L_mm / 180

  steps.push({
    clause: 'AISC Table 1604.3',
    description: 'Deflection limits',
    formula: 'Live: L/240, Total: L/180',
    substitution: `L = ${L_mm} mm`,
    result: `Limit live = ${fmt(limit_live, 2)} mm, Limit total = ${fmt(limit_total, 2)} mm`,
  })

  const pass_live = delta_live <= limit_live
  const pass_total = delta_total <= limit_total

  steps.push({
    clause: 'AISC L',
    description: 'Deflection check',
    formula: 'delta_L <= L/240 AND delta_total <= L/180',
    substitution: `${fmt(delta_live, 2)} vs ${fmt(limit_live, 2)}, ${fmt(delta_total, 2)} vs ${fmt(limit_total, 2)}`,
    result: `Live: ${pass_live ? 'OK' : 'FAIL'}, Total: ${pass_total ? 'OK' : 'FAIL'}`,
  })

  return {
    delta_dead, delta_live, delta_total,
    limit_live, limit_total,
    pass_live, pass_total,
    pass: pass_live && pass_total,
    steps,
  }
}
