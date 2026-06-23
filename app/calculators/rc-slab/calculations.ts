import {
  type SlabFlexureResult, type SlabShearResult, type SlabDeflectionResult,
  type SlabCrackResult, type SlabSpacingResult, type StepItem,
  type SupportCondition, type SlabType, type PanelType,
  barArea, fmt, areaPerMeter, getSlabKFactor, getAciMinSlabThickness,
  interpolateCoeffs, SIMPLY_SUPPORTED_COEFFS, getRestrainedTable,
  EC2_SLAB_BAR_DIAMETERS, EC2_SLAB_BAR_LABELS, ACI_SLAB_BAR_DIAMETERS_MM, ACI_SLAB_BAR_LABELS,
} from './types'

// ── One-Way Slab Moment Coefficients ─────────────────────────────────────────

function getOneWayMomentCoeff(support: SupportCondition): { span: number; support_neg: number; label: string } {
  switch (support) {
    case 'simply_supported': return { span: 1 / 8, support_neg: 0, label: 'Simply supported: M = nL²/8' }
    case 'one_end_continuous': return { span: 1 / 10, support_neg: 1 / 9, label: 'One end continuous: +M=nL²/10, -M=nL²/9' }
    case 'both_ends_continuous': return { span: 1 / 12, support_neg: 1 / 9, label: 'Both ends continuous: +M=nL²/12, -M=nL²/9' }
    case 'cantilever': return { span: 1 / 2, support_neg: 0, label: 'Cantilever: M = nL²/2' }
  }
}

function getAciOneWayCoeffs(support: SupportCondition): { pos: number; neg: number } {
  switch (support) {
    case 'simply_supported': return { pos: 1 / 8, neg: 0 }
    case 'one_end_continuous': return { pos: 1 / 11, neg: 1 / 11 }
    case 'both_ends_continuous': return { pos: 1 / 16, neg: 1 / 11 }
    case 'cantilever': return { pos: 1 / 2, neg: 0 }
  }
}

// ── EC2 One-Way Slab Flexure ─────────────────────────────────────────────────

export function calcOneWayFlexureEC2(
  lx_m: number, h: number, dx: number, dy: number,
  fck: number, fctm: number, fyk: number,
  ned: number, b: number,
  support: SupportCondition,
  barDiaX: number, spacingX: number,
  barDiaY: number, spacingY: number,
  gammaC: number, gammaS: number,
): SlabFlexureResult {
  const steps: StepItem[] = []
  const fcd = 0.85 * fck / gammaC
  const fyd = fyk / gammaS

  steps.push({ clause: 'EC2 §3.1.6(1)', description: 'Design concrete strength', formula: 'fcd = 0.85·fck/γc', substitution: `fcd = 0.85 × ${fck} / ${gammaC}`, result: `fcd = ${fmt(fcd)} MPa` })
  steps.push({ clause: 'EC2 §3.2.7(2)', description: 'Design steel strength', formula: 'fyd = fyk/γs', substitution: `fyd = ${fyk} / ${gammaS}`, result: `fyd = ${fmt(fyd, 1)} MPa` })

  steps.push({ clause: '', description: 'Effective depths', formula: 'dx = h − cnom − φx/2; dy = h − cnom − φx − φy/2', substitution: '', result: `dx = ${fmt(dx, 1)} mm, dy = ${fmt(dy, 1)} mm` })

  const coeffs = getOneWayMomentCoeff(support)
  const MEd_x = coeffs.span * ned * lx_m * lx_m
  const MEd_x_neg = coeffs.support_neg * ned * lx_m * lx_m

  steps.push({ clause: 'EC2 Table', description: 'Design moment (span)', formula: `M⁺Ed = β × ned × lx²`, substitution: `M⁺Ed = ${fmt(coeffs.span, 4)} × ${fmt(ned, 2)} × ${fmt(lx_m, 3)}²`, result: `M⁺Ed = ${fmt(MEd_x, 2)} kN·m/m` })

  if (MEd_x_neg > 0) {
    steps.push({ clause: 'EC2 Table', description: 'Design moment (support)', formula: `M⁻Ed = β × ned × lx²`, substitution: `M⁻Ed = ${fmt(coeffs.support_neg, 4)} × ${fmt(ned, 2)} × ${fmt(lx_m, 3)}²`, result: `M⁻Ed = ${fmt(MEd_x_neg, 2)} kN·m/m` })
  }

  const MEd_Nmm = MEd_x * 1e6
  const K_x = MEd_Nmm / (b * dx * dx * fck)
  const z_x = dx * Math.min(0.5 + Math.sqrt(Math.max(0.25 - K_x / 1.134, 0)), 0.95)
  const As_req_x = MEd_Nmm / (fyd * z_x)

  steps.push({ clause: 'EC2 §6.1(4)', description: 'Flexural design (x-direction, span)', formula: 'K = MEd/(b·d²·fck)', substitution: `K = ${fmt(MEd_Nmm, 0)} / (${b} × ${fmt(dx, 1)}² × ${fck})`, result: `K = ${fmt(K_x, 4)}` })
  steps.push({ clause: 'EC2 §6.1(4)', description: 'Lever arm', formula: 'z = d·min(0.5+√(0.25−K/1.134), 0.95)', substitution: `z = ${fmt(dx, 1)} × min(0.5+√(0.25−${fmt(K_x, 4)}/1.134), 0.95)`, result: `z = ${fmt(z_x, 1)} mm` })
  steps.push({ clause: 'EC2 §6.1(4)', description: 'Required reinforcement (span)', formula: 'As,req = MEd/(fyd·z)', substitution: `As,req = ${fmt(MEd_Nmm, 0)} / (${fmt(fyd, 1)} × ${fmt(z_x, 1)})`, result: `As,req,x = ${fmt(As_req_x, 0)} mm²/m` })

  let As_req_x_neg = 0
  if (MEd_x_neg > 0) {
    const M_neg_Nmm = MEd_x_neg * 1e6
    const K_neg = M_neg_Nmm / (b * dx * dx * fck)
    const z_neg = dx * Math.min(0.5 + Math.sqrt(Math.max(0.25 - K_neg / 1.134, 0)), 0.95)
    As_req_x_neg = M_neg_Nmm / (fyd * z_neg)
    steps.push({ clause: 'EC2 §6.1(4)', description: 'Required reinforcement (support, hogging)', formula: 'As,req = M⁻Ed/(fyd·z)', substitution: `K=${fmt(K_neg, 4)}, z=${fmt(z_neg, 1)} mm`, result: `As,req,x(neg) = ${fmt(As_req_x_neg, 0)} mm²/m` })
  }

  const As_min1 = 0.26 * (fctm / fyk) * b * dx
  const As_min2 = 0.0013 * b * dx
  const As_min_x = Math.max(As_min1, As_min2)
  steps.push({ clause: 'EC2 §9.3.1.1(1)', description: 'Minimum main reinforcement', formula: 'As,min = max(0.26·fctm/fyk·b·d, 0.0013·b·d)', substitution: `As,min = max(0.26×${fctm}/${fyk}×${b}×${fmt(dx, 1)}, 0.0013×${b}×${fmt(dx, 1)})`, result: `As,min = ${fmt(As_min_x, 0)} mm²/m` })

  const As_secondary = 0.2 * Math.max(As_req_x, As_min_x)
  const As_min_y = Math.max(As_secondary, As_min2)
  steps.push({ clause: 'EC2 §9.3.1.1(2)', description: 'Secondary (transverse) reinforcement', formula: 'As,sec ≥ 0.2·As,main', substitution: `As,sec = 0.2 × ${fmt(Math.max(As_req_x, As_min_x), 0)}`, result: `As,min,y = ${fmt(As_min_y, 0)} mm²/m` })

  const As_max = 0.04 * b * h
  steps.push({ clause: 'EC2 §9.2.1.1(3)', description: 'Maximum reinforcement', formula: 'As,max = 0.04·b·h', substitution: `As,max = 0.04 × ${b} × ${h}`, result: `As,max = ${fmt(As_max, 0)} mm²/m` })

  const As_prov_x = areaPerMeter(barDiaX, spacingX)
  const As_prov_y = areaPerMeter(barDiaY, spacingY)
  steps.push({ clause: '', description: 'Provided reinforcement', formula: 'As,prov = π·φ²/4 × (1000/s)', substitution: '', result: `As,prov,x = ${fmt(As_prov_x, 0)} mm²/m, As,prov,y = ${fmt(As_prov_y, 0)} mm²/m` })

  return {
    MEd_x, MEd_y: 0, MEd_x_neg, MEd_y_neg: 0,
    As_req_x: Math.max(As_req_x, As_min_x), As_req_y: As_min_y,
    As_req_x_neg, As_req_y_neg: 0,
    As_min_x, As_min_y,
    As_max,
    As_prov_x, As_prov_y,
    dx, dy,
    K_x, z_x,
    K_y: 0, z_y: 0,
    pass_flexure_x: As_prov_x >= Math.max(As_req_x, As_min_x),
    pass_flexure_y: As_prov_y >= As_min_y,
    pass_min_x: As_prov_x >= As_min_x,
    pass_min_y: As_prov_y >= As_min_y,
    pass_max_x: As_prov_x <= As_max,
    pass_max_y: As_prov_y <= As_max,
    steps,
  }
}

// ── EC2 Two-Way Slab Flexure ─────────────────────────────────────────────────

export function calcTwoWayFlexureEC2(
  lx_m: number, ly_m: number, h: number, dx: number, dy: number,
  fck: number, fctm: number, fyk: number,
  ned: number, b: number,
  panelType: PanelType,
  barDiaX: number, spacingX: number,
  barDiaY: number, spacingY: number,
  gammaC: number, gammaS: number,
): SlabFlexureResult {
  const steps: StepItem[] = []
  const fcd = 0.85 * fck / gammaC
  const fyd = fyk / gammaS
  const ly_lx = ly_m / lx_m

  steps.push({ clause: 'EC2 §3.1.6', description: 'Design strengths', formula: 'fcd = 0.85·fck/γc, fyd = fyk/γs', substitution: '', result: `fcd = ${fmt(fcd)} MPa, fyd = ${fmt(fyd, 1)} MPa` })
  steps.push({ clause: '', description: 'Aspect ratio', formula: 'ly/lx', substitution: `${fmt(ly_m, 3)} / ${fmt(lx_m, 3)}`, result: `ly/lx = ${fmt(ly_lx, 2)}` })

  steps.push({ clause: '', description: 'Effective depths', formula: 'dx = h − cnom − φx/2; dy = h − cnom − φx − φy/2', substitution: '', result: `dx = ${fmt(dx, 1)} mm, dy = ${fmt(dy, 1)} mm` })

  let asx_pos: number, asx_neg: number, asy_pos: number, asy_neg: number

  if (panelType === 'interior' || panelType === 'edge' || panelType === 'corner') {
    const table = getRestrainedTable(panelType)
    asx_pos = interpolateCoeffs(table, ly_lx, 'bsx_pos')
    asx_neg = interpolateCoeffs(table, ly_lx, 'bsx_neg')
    asy_pos = interpolateCoeffs(table, ly_lx, 'bsy_pos')
    asy_neg = interpolateCoeffs(table, ly_lx, 'bsy_neg')

    const caseLabel = panelType === 'interior' ? 'Case 1: Interior panel' : panelType === 'edge' ? 'Case 2: Edge panel' : 'Case 4: Corner panel'
    steps.push({ clause: 'BS 8110 Table 3.14', description: `Restrained slab coefficients — ${caseLabel}`, formula: 'MEd = β × ned × lx²', substitution: `ly/lx = ${fmt(ly_lx, 2)}`, result: `βsx⁺=${fmt(asx_pos, 4)}, βsx⁻=${fmt(asx_neg, 4)}, βsy⁺=${fmt(asy_pos, 4)}, βsy⁻=${fmt(asy_neg, 4)}` })
  } else {
    asx_pos = interpolateCoeffs(SIMPLY_SUPPORTED_COEFFS, ly_lx, 'asx')
    asy_pos = interpolateCoeffs(SIMPLY_SUPPORTED_COEFFS, ly_lx, 'asy')
    asx_neg = 0
    asy_neg = 0

    steps.push({ clause: 'EC2/BS 8110 Table 3.13', description: 'Simply supported slab coefficients', formula: 'MEd = α × ned × lx²', substitution: `ly/lx = ${fmt(ly_lx, 2)}`, result: `αsx = ${fmt(asx_pos, 4)}, αsy = ${fmt(asy_pos, 4)}` })
  }

  const MEd_x = asx_pos * ned * lx_m * lx_m
  const MEd_y = asy_pos * ned * lx_m * lx_m
  const MEd_x_neg = asx_neg * ned * lx_m * lx_m
  const MEd_y_neg = asy_neg * ned * lx_m * lx_m

  steps.push({ clause: '', description: 'Design moments (positive)', formula: 'M⁺ = β⁺ × ned × lx²', substitution: '', result: `M⁺Ed,x = ${fmt(MEd_x, 2)} kN·m/m, M⁺Ed,y = ${fmt(MEd_y, 2)} kN·m/m` })

  if (MEd_x_neg > 0 || MEd_y_neg > 0) {
    steps.push({ clause: '', description: 'Design moments (negative)', formula: 'M⁻ = β⁻ × ned × lx²', substitution: '', result: `M⁻Ed,x = ${fmt(MEd_x_neg, 2)} kN·m/m, M⁻Ed,y = ${fmt(MEd_y_neg, 2)} kN·m/m` })
  }

  const designM_x = Math.max(MEd_x, MEd_x_neg)
  const designM_y = Math.max(MEd_y, MEd_y_neg)

  const MEd_x_Nmm = designM_x * 1e6
  const K_x = MEd_x_Nmm / (b * dx * dx * fck)
  const z_x = dx * Math.min(0.5 + Math.sqrt(Math.max(0.25 - K_x / 1.134, 0)), 0.95)
  const As_req_x = MEd_x_Nmm / (fyd * z_x)

  steps.push({ clause: 'EC2 §6.1(4)', description: 'Short span (x) flexural design', formula: 'K = MEd/(b·dx²·fck)', substitution: `K = ${fmt(MEd_x_Nmm, 0)} / (${b} × ${fmt(dx, 1)}² × ${fck})`, result: `K = ${fmt(K_x, 4)}, z = ${fmt(z_x, 1)} mm, As,req,x = ${fmt(As_req_x, 0)} mm²/m` })

  const MEd_y_Nmm = designM_y * 1e6
  const K_y = MEd_y_Nmm / (b * dy * dy * fck)
  const z_y = dy * Math.min(0.5 + Math.sqrt(Math.max(0.25 - K_y / 1.134, 0)), 0.95)
  const As_req_y = MEd_y_Nmm / (fyd * z_y)

  steps.push({ clause: 'EC2 §6.1(4)', description: 'Long span (y) flexural design', formula: 'K = MEd/(b·dy²·fck)', substitution: `K = ${fmt(MEd_y_Nmm, 0)} / (${b} × ${fmt(dy, 1)}² × ${fck})`, result: `K = ${fmt(K_y, 4)}, z = ${fmt(z_y, 1)} mm, As,req,y = ${fmt(As_req_y, 0)} mm²/m` })

  const As_min1 = 0.26 * (fctm / fyk) * b * dx
  const As_min2 = 0.0013 * b * dx
  const As_min_x = Math.max(As_min1, As_min2)
  const As_min_y = Math.max(0.26 * (fctm / fyk) * b * dy, 0.0013 * b * dy)

  steps.push({ clause: 'EC2 §9.3.1.1(1)', description: 'Minimum reinforcement', formula: 'As,min = max(0.26·fctm/fyk·b·d, 0.0013·b·d)', substitution: '', result: `As,min,x = ${fmt(As_min_x, 0)} mm²/m, As,min,y = ${fmt(As_min_y, 0)} mm²/m` })

  const As_max = 0.04 * b * h
  const As_prov_x = areaPerMeter(barDiaX, spacingX)
  const As_prov_y = areaPerMeter(barDiaY, spacingY)
  steps.push({ clause: '', description: 'Provided reinforcement', formula: '', substitution: '', result: `As,prov,x = ${fmt(As_prov_x, 0)} mm²/m, As,prov,y = ${fmt(As_prov_y, 0)} mm²/m` })

  const govAs_x = Math.max(As_req_x, As_min_x)
  const govAs_y = Math.max(As_req_y, As_min_y)

  return {
    MEd_x, MEd_y, MEd_x_neg, MEd_y_neg,
    As_req_x: govAs_x, As_req_y: govAs_y,
    As_req_x_neg: MEd_x_neg > 0 ? MEd_x_neg * 1e6 / (fyd * z_x) : 0,
    As_req_y_neg: MEd_y_neg > 0 ? MEd_y_neg * 1e6 / (fyd * z_y) : 0,
    As_min_x, As_min_y, As_max,
    As_prov_x, As_prov_y,
    dx, dy, K_x, z_x, K_y, z_y,
    pass_flexure_x: As_prov_x >= govAs_x,
    pass_flexure_y: As_prov_y >= govAs_y,
    pass_min_x: As_prov_x >= As_min_x,
    pass_min_y: As_prov_y >= As_min_y,
    pass_max_x: As_prov_x <= As_max,
    pass_max_y: As_prov_y <= As_max,
    steps,
  }
}

// ── ACI One-Way Slab Flexure ─────────────────────────────────────────────────

export function calcOneWayFlexureACI(
  ln_m: number, h: number, dx: number, dy: number,
  fc: number, fy: number,
  wu: number, b: number,
  support: SupportCondition,
  barDiaX: number, spacingX: number,
  barDiaY: number, spacingY: number,
  phiFlex: number,
): SlabFlexureResult {
  const steps: StepItem[] = []

  const coeffs = getAciOneWayCoeffs(support)
  const Mu_pos = coeffs.pos * wu * ln_m * ln_m
  const Mu_neg = coeffs.neg * wu * ln_m * ln_m

  steps.push({ clause: 'ACI 6.5', description: 'Design moment (positive)', formula: `M⁺u = ${fmt(coeffs.pos, 4)} × wu × ln²`, substitution: `M⁺u = ${fmt(coeffs.pos, 4)} × ${fmt(wu, 2)} × ${fmt(ln_m, 3)}²`, result: `M⁺u = ${fmt(Mu_pos, 2)} kN·m/m` })

  if (Mu_neg > 0) {
    steps.push({ clause: 'ACI 6.5', description: 'Design moment (negative)', formula: `M⁻u = ${fmt(coeffs.neg, 4)} × wu × ln²`, substitution: `M⁻u = ${fmt(coeffs.neg, 4)} × ${fmt(wu, 2)} × ${fmt(ln_m, 3)}²`, result: `M⁻u = ${fmt(Mu_neg, 2)} kN·m/m` })
  }

  const beta1 = fc <= 28 ? 0.85 : Math.max(0.85 - 0.05 * (fc - 28) / 7, 0.65)
  steps.push({ clause: 'ACI 22.2.2.4.3', description: 'Whitney stress block factor', formula: "β₁ for f'c", substitution: `f'c = ${fc} MPa`, result: `β₁ = ${fmt(beta1, 3)}` })

  const designM = Math.max(Mu_pos, Mu_neg)
  const Mu_Nmm = designM * 1e6
  let As_iter = Mu_Nmm / (phiFlex * fy * dx * 0.9)
  for (let i = 0; i < 20; i++) {
    const a = (As_iter * fy) / (0.85 * fc * b)
    As_iter = Mu_Nmm / (phiFlex * fy * (dx - a / 2))
  }
  const As_req_x = As_iter
  const a = (As_req_x * fy) / (0.85 * fc * b)

  steps.push({ clause: 'ACI 22.3', description: 'Required reinforcement (iterative)', formula: 'As = Mu/(φ·fy·(d−a/2))', substitution: `a = ${fmt(a, 1)} mm`, result: `As,req,x = ${fmt(As_req_x, 0)} mm²/m` })

  const As_min_shrinkage = fy >= 420 ? 0.0018 * b * h : 0.002 * b * h
  steps.push({ clause: 'ACI 7.6.1.1', description: 'Minimum reinforcement (shrinkage & temperature)', formula: fy >= 420 ? '0.0018·b·h' : '0.002·b·h', substitution: `${fy >= 420 ? '0.0018' : '0.002'} × ${b} × ${h}`, result: `As,min = ${fmt(As_min_shrinkage, 0)} mm²/m` })

  const As_min_flex1 = (0.25 * Math.sqrt(fc) / fy) * b * dx
  const As_min_flex2 = (1.4 / fy) * b * dx
  const As_min_flex = Math.max(As_min_flex1, As_min_flex2)
  const As_min_x = Math.max(As_min_shrinkage, As_min_flex)
  steps.push({ clause: 'ACI 7.6.1', description: 'Governing minimum reinforcement', formula: "max(shrinkage, 0.25√f'c/fy·b·d, 1.4/fy·b·d)", substitution: '', result: `As,min,x = ${fmt(As_min_x, 0)} mm²/m` })

  const As_min_y = As_min_shrinkage

  const As_max_rho = 0.85 * beta1 * (fc / fy) * (0.003 / (0.003 + 0.004))
  const As_max = As_max_rho * b * dx

  const As_prov_x = areaPerMeter(barDiaX, spacingX)
  const As_prov_y = areaPerMeter(barDiaY, spacingY)
  steps.push({ clause: '', description: 'Provided reinforcement', formula: '', substitution: '', result: `As,prov,x = ${fmt(As_prov_x, 0)} mm²/m, As,prov,y = ${fmt(As_prov_y, 0)} mm²/m` })

  const govAs_x = Math.max(As_req_x, As_min_x)

  return {
    MEd_x: Mu_pos, MEd_y: 0, MEd_x_neg: Mu_neg, MEd_y_neg: 0,
    As_req_x: govAs_x, As_req_y: As_min_y,
    As_req_x_neg: 0, As_req_y_neg: 0,
    As_min_x, As_min_y, As_max,
    As_prov_x, As_prov_y,
    dx, dy,
    K_x: Mu_Nmm / (b * dx * dx * fc), z_x: dx - a / 2,
    K_y: 0, z_y: 0,
    pass_flexure_x: As_prov_x >= govAs_x,
    pass_flexure_y: As_prov_y >= As_min_y,
    pass_min_x: As_prov_x >= As_min_x,
    pass_min_y: As_prov_y >= As_min_y,
    pass_max_x: As_prov_x <= As_max,
    pass_max_y: As_prov_y <= As_max,
    steps,
  }
}

// ── ACI Two-Way Slab Flexure (Direct Design Method §8.10) ───────────────────

export function calcTwoWayFlexureACI(
  lx_m: number, ly_m: number, h: number, dx: number, dy: number,
  fc: number, fy: number,
  wu: number, b: number,
  panelType: PanelType,
  barDiaX: number, spacingX: number,
  barDiaY: number, spacingY: number,
  phiFlex: number,
): SlabFlexureResult {
  const steps: StepItem[] = []
  const ly_lx = ly_m / lx_m

  steps.push({ clause: 'ACI §8.10', description: 'Direct Design Method', formula: 'Mo = wu·l₂·ln²/8', substitution: `ly/lx = ${fmt(ly_lx, 2)}`, result: 'Two-way slab analysis' })

  const ln_x = lx_m
  const Mo_x = wu * ly_m * ln_x * ln_x / 8
  steps.push({ clause: 'ACI §8.10.3.2', description: 'Total static moment (short direction)', formula: 'Mo,x = wu·ly·lnx²/8', substitution: `Mo,x = ${fmt(wu, 2)} × ${fmt(ly_m, 3)} × ${fmt(ln_x, 3)}² / 8`, result: `Mo,x = ${fmt(Mo_x, 2)} kN·m` })

  let fracPos_x: number, fracNeg_x: number
  switch (panelType) {
    case 'interior': fracPos_x = 0.35; fracNeg_x = 0.65; break
    case 'edge': fracPos_x = 0.52; fracNeg_x = 0.48; break
    case 'corner': fracPos_x = 0.52; fracNeg_x = 0.48; break
    default: fracPos_x = 0.35; fracNeg_x = 0.65;
  }

  const MEd_x = fracPos_x * Mo_x / ly_m
  const MEd_x_neg = fracNeg_x * Mo_x / ly_m

  steps.push({ clause: 'ACI Table 8.10.4.2', description: 'Moment distribution (short direction)', formula: `M⁺ = ${fmt(fracPos_x, 2)}·Mo/l₂, M⁻ = ${fmt(fracNeg_x, 2)}·Mo/l₂`, substitution: `Panel: ${panelType}`, result: `M⁺Ed,x = ${fmt(MEd_x, 2)} kN·m/m, M⁻Ed,x = ${fmt(MEd_x_neg, 2)} kN·m/m` })

  const ln_y = ly_m
  const Mo_y = wu * lx_m * ln_y * ln_y / 8
  const MEd_y = fracPos_x * Mo_y / lx_m
  const MEd_y_neg = fracNeg_x * Mo_y / lx_m

  steps.push({ clause: 'ACI §8.10', description: 'Long direction moments', formula: 'Mo,y = wu·lx·lny²/8', substitution: '', result: `M⁺Ed,y = ${fmt(MEd_y, 2)} kN·m/m, M⁻Ed,y = ${fmt(MEd_y_neg, 2)} kN·m/m` })

  const beta1 = fc <= 28 ? 0.85 : Math.max(0.85 - 0.05 * (fc - 28) / 7, 0.65)

  const designM_x = Math.max(MEd_x, MEd_x_neg)
  const Mu_x_Nmm = designM_x * 1e6
  let As_x = Mu_x_Nmm / (phiFlex * fy * dx * 0.9)
  for (let i = 0; i < 20; i++) {
    const ax = (As_x * fy) / (0.85 * fc * b)
    As_x = Mu_x_Nmm / (phiFlex * fy * (dx - ax / 2))
  }
  const a_x = (As_x * fy) / (0.85 * fc * b)

  steps.push({ clause: 'ACI 22.3', description: 'Required reinforcement (x-direction)', formula: 'As = Mu/(φ·fy·(d−a/2))', substitution: `a = ${fmt(a_x, 1)} mm`, result: `As,req,x = ${fmt(As_x, 0)} mm²/m` })

  const designM_y = Math.max(MEd_y, MEd_y_neg)
  const Mu_y_Nmm = designM_y * 1e6
  let As_y = Mu_y_Nmm / (phiFlex * fy * dy * 0.9)
  for (let i = 0; i < 20; i++) {
    const ay = (As_y * fy) / (0.85 * fc * b)
    As_y = Mu_y_Nmm / (phiFlex * fy * (dy - ay / 2))
  }
  const a_y = (As_y * fy) / (0.85 * fc * b)

  steps.push({ clause: 'ACI 22.3', description: 'Required reinforcement (y-direction)', formula: 'As = Mu/(φ·fy·(d−a/2))', substitution: `a = ${fmt(a_y, 1)} mm`, result: `As,req,y = ${fmt(As_y, 0)} mm²/m` })

  const As_min_sh = fy >= 420 ? 0.0018 * b * h : 0.002 * b * h
  const As_min_x = Math.max(As_min_sh, (0.25 * Math.sqrt(fc) / fy) * b * dx, (1.4 / fy) * b * dx)
  const As_min_y = Math.max(As_min_sh, (0.25 * Math.sqrt(fc) / fy) * b * dy, (1.4 / fy) * b * dy)
  steps.push({ clause: 'ACI 7.6.1', description: 'Minimum reinforcement', formula: '', substitution: '', result: `As,min,x = ${fmt(As_min_x, 0)} mm²/m, As,min,y = ${fmt(As_min_y, 0)} mm²/m` })

  const As_max_rho = 0.85 * beta1 * (fc / fy) * (0.003 / (0.003 + 0.004))
  const As_max = As_max_rho * b * dx

  const As_prov_x = areaPerMeter(barDiaX, spacingX)
  const As_prov_y = areaPerMeter(barDiaY, spacingY)

  const govAs_x = Math.max(As_x, As_min_x)
  const govAs_y = Math.max(As_y, As_min_y)

  return {
    MEd_x, MEd_y, MEd_x_neg, MEd_y_neg,
    As_req_x: govAs_x, As_req_y: govAs_y,
    As_req_x_neg: 0, As_req_y_neg: 0,
    As_min_x, As_min_y, As_max,
    As_prov_x, As_prov_y,
    dx, dy,
    K_x: Mu_x_Nmm / (b * dx * dx * fc), z_x: dx - a_x / 2,
    K_y: Mu_y_Nmm / (b * dy * dy * fc), z_y: dy - a_y / 2,
    pass_flexure_x: As_prov_x >= govAs_x,
    pass_flexure_y: As_prov_y >= govAs_y,
    pass_min_x: As_prov_x >= As_min_x,
    pass_min_y: As_prov_y >= As_min_y,
    pass_max_x: As_prov_x <= As_max,
    pass_max_y: As_prov_y <= As_max,
    steps,
  }
}

// ── Shear Check (EC2 §6.2.1) ────────────────────────────────────────────────

export function calcSlabShearEC2(
  dx: number, fck: number, ned: number, lx_m: number, b: number,
  As_prov: number, support: SupportCondition,
  gammaC: number,
): SlabShearResult {
  const steps: StepItem[] = []

  let VEd: number
  if (support === 'cantilever') {
    VEd = ned * lx_m
  } else if (support === 'simply_supported') {
    VEd = ned * lx_m / 2
  } else {
    VEd = 0.6 * ned * lx_m
  }

  steps.push({ clause: 'EC2 §6.2', description: 'Design shear force', formula: 'VEd per support type', substitution: `ned = ${fmt(ned, 2)} kN/m², lx = ${fmt(lx_m, 3)} m`, result: `VEd = ${fmt(VEd, 2)} kN/m` })

  const k = Math.min(1 + Math.sqrt(200 / dx), 2.0)
  const rho_l = Math.min(As_prov / (b * dx), 0.02)
  const CRd_c = 0.12
  const VRd_c_1 = (CRd_c * k * Math.pow(100 * rho_l * fck, 1 / 3)) * b * dx / 1000
  const vmin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(fck)
  const VRd_c_2 = vmin * b * dx / 1000
  const VRd_c = Math.max(VRd_c_1, VRd_c_2)

  steps.push({ clause: 'EC2 §6.2.2(1)', description: 'Size effect factor', formula: 'k = min(1 + √(200/d), 2.0)', substitution: `k = min(1 + √(200/${fmt(dx, 1)}), 2.0)`, result: `k = ${fmt(k, 3)}` })
  steps.push({ clause: 'EC2 §6.2.2(1)', description: 'Concrete shear resistance', formula: 'VRd,c = max[CRd,c·k·(100ρl·fck)^⅓·b·d, vmin·b·d]', substitution: `ρl = ${fmt(rho_l, 5)}, vmin = ${fmt(vmin, 3)}`, result: `VRd,c = ${fmt(VRd_c, 2)} kN/m` })

  const pass = VEd <= VRd_c
  steps.push({ clause: 'EC2 §6.2.1(4)', description: 'Shear check (no shear links typical for slabs)', formula: 'VEd ≤ VRd,c', substitution: `${fmt(VEd, 2)} ≤ ${fmt(VRd_c, 2)}`, result: pass ? '✓ No shear reinforcement needed' : '✗ Increase depth or add shear links' })

  return { VEd, VRd_c, pass_shear: pass, steps }
}

// ── Shear Check (ACI §22.5) ─────────────────────────────────────────────────

export function calcSlabShearACI(
  dx: number, fc: number, wu: number, ln_m: number, b: number,
  support: SupportCondition, phiShear: number,
): SlabShearResult {
  const steps: StepItem[] = []

  let Vu: number
  if (support === 'cantilever') {
    Vu = wu * ln_m
  } else if (support === 'simply_supported') {
    Vu = wu * ln_m / 2
  } else {
    Vu = 1.15 * wu * ln_m / 2
  }

  steps.push({ clause: 'ACI §5.3', description: 'Design shear force', formula: 'Vu per support type', substitution: `wu = ${fmt(wu, 2)} kN/m², ln = ${fmt(ln_m, 3)} m`, result: `Vu = ${fmt(Vu, 2)} kN/m` })

  const lambda = 1.0
  const Vc = 0.17 * lambda * Math.sqrt(fc) * b * dx / 1000
  const phi_Vc = phiShear * Vc

  steps.push({ clause: 'ACI 22.5.5.1', description: 'Concrete shear capacity', formula: "Vc = 0.17·λ·√f'c·b·d", substitution: `Vc = 0.17 × ${lambda} × √${fc} × ${b} × ${fmt(dx, 1)} / 1000`, result: `Vc = ${fmt(Vc, 2)} kN/m, φVc = ${fmt(phi_Vc, 2)} kN/m` })

  const pass = Vu <= phi_Vc
  steps.push({ clause: 'ACI 22.5.1.1', description: 'Shear check', formula: 'Vu ≤ φVc', substitution: `${fmt(Vu, 2)} ≤ ${fmt(phi_Vc, 2)}`, result: pass ? '✓ Adequate' : '✗ Increase slab depth' })

  return { VEd: Vu, VRd_c: phi_Vc, Vc, phi_Vc, pass_shear: pass, steps }
}

// ── Deflection Check EC2 §7.4.2 ─────────────────────────────────────────────

export function calcSlabDeflectionEC2(
  dx: number, fck: number, fyk: number,
  As_prov: number, As_req: number,
  lx_mm: number, support: SupportCondition,
  slabType: SlabType,
): SlabDeflectionResult {
  const steps: StepItem[] = []
  const rho = As_prov / (1000 * dx)
  const rho_0 = 1e-3 * Math.sqrt(fck)
  const KK = getSlabKFactor(support)

  steps.push({ clause: 'EC2 §7.4.2(2)', description: 'Reference reinforcement ratio', formula: 'ρ₀ = 10⁻³√fck', substitution: `ρ₀ = 10⁻³ × √${fck}`, result: `ρ₀ = ${fmt(rho_0, 5)}, ρ = ${fmt(rho, 5)}` })
  steps.push({ clause: 'EC2 Table 7.4N', description: 'Structural system factor', formula: 'K per support type', substitution: `Support: ${support.replace(/_/g, ' ')}`, result: `K = ${KK}` })

  let ld_ratio: number
  if (rho <= rho_0) {
    ld_ratio = KK * (11 + 1.5 * Math.sqrt(fck) * rho_0 / rho + 3.2 * Math.sqrt(fck) * Math.pow(rho_0 / rho - 1, 1.5))
    steps.push({ clause: 'EC2 Eq. 7.16a', description: 'Basic l/d ratio (ρ ≤ ρ₀)', formula: 'l/d = K·[11 + 1.5·√fck·ρ₀/ρ + 3.2·√fck·(ρ₀/ρ−1)^1.5]', substitution: `ρ=${fmt(rho, 5)}, ρ₀=${fmt(rho_0, 5)}`, result: `l/d basic = ${fmt(ld_ratio, 1)}` })
  } else {
    ld_ratio = KK * (11 + 1.5 * Math.sqrt(fck) * rho_0 / (rho))
    steps.push({ clause: 'EC2 Eq. 7.16b', description: 'Basic l/d ratio (ρ > ρ₀)', formula: 'l/d = K·[11 + 1.5·√fck·ρ₀/(ρ−ρ\')]', substitution: `ρ=${fmt(rho, 5)}`, result: `l/d basic = ${fmt(ld_ratio, 1)}` })
  }

  let mod = Math.min(As_prov / Math.max(As_req, 1), 1.5)
  steps.push({ clause: 'EC2 §7.4.2(2)', description: 'Steel provision modification', formula: 'mod = min(As,prov/As,req, 1.5)', substitution: `mod = min(${fmt(As_prov, 0)}/${fmt(Math.max(As_req, 1), 0)}, 1.5)`, result: `mod = ${fmt(mod, 2)}` })

  const span_m = lx_mm / 1000
  let span_mod = 1.0
  if (span_m > 7) {
    span_mod = 7 / span_m
    steps.push({ clause: 'EC2 §7.4.2(2)', description: 'Long span modification', formula: 'if L > 7m → ×(7/L)', substitution: `L = ${fmt(span_m, 1)} m`, result: `Span mod = ${fmt(span_mod, 2)}` })
  }

  const allowable_ratio = ld_ratio * mod * span_mod
  const actual_ratio = lx_mm / dx
  steps.push({ clause: 'EC2 §7.4.2', description: 'Final span/depth check', formula: 'l/d actual ≤ l/d allowable', substitution: '', result: `l/d allow = ${fmt(allowable_ratio, 1)}, l/d actual = ${fmt(actual_ratio, 1)} ${actual_ratio <= allowable_ratio ? '✓' : '✗'}` })

  return { allowable_ratio, actual_ratio, pass_deflection: actual_ratio <= allowable_ratio, steps }
}

// ── Deflection Check ACI ─────────────────────────────────────────────────────

export function calcSlabDeflectionACI(
  h: number, lx_mm: number, support: SupportCondition,
): SlabDeflectionResult {
  const steps: StepItem[] = []
  const h_min = getAciMinSlabThickness(support, lx_mm)

  steps.push({ clause: 'ACI Table 7.3.1.1', description: 'Minimum slab thickness for deflection', formula: 'hmin per support condition', substitution: `Support: ${support.replace(/_/g, ' ')}, L = ${lx_mm} mm`, result: `hmin = ${fmt(h_min, 1)} mm, h = ${h} mm ${h >= h_min ? '✓' : '✗'}` })

  return {
    allowable_ratio: 0, actual_ratio: 0,
    h_min,
    pass_deflection: h >= h_min,
    steps,
  }
}

// ── Crack Width EC2 §7.3 ────────────────────────────────────────────────────

export function calcSlabCrackEC2(
  h: number, dx: number, fctm: number,
  Ecm: number, M_service: number, As_prov: number,
  cover: number, barDia: number, wmax: number, kt: number, b: number,
): SlabCrackResult {
  const steps: StepItem[] = []
  const Es = 200000
  const alpha_e = Es / Ecm

  const hc_eff_1 = 2.5 * (h - dx)
  const hc_eff_2 = (h - dx * 2 / 3) / 3
  const hc_eff_3 = h / 2
  const hc_eff = Math.min(hc_eff_1, hc_eff_2, hc_eff_3)
  const Ac_eff = b * hc_eff
  const rho_p_eff = Math.max(As_prov / Ac_eff, 0.001)

  steps.push({ clause: 'EC2 §7.3.2(3)', description: 'Effective tension area', formula: 'hc,eff = min(2.5(h−d), (h−x)/3, h/2)', substitution: `hc,eff = min(${fmt(hc_eff_1, 1)}, ${fmt(hc_eff_2, 1)}, ${fmt(hc_eff_3, 1)})`, result: `hc,eff = ${fmt(hc_eff, 1)} mm, ρp,eff = ${fmt(rho_p_eff, 4)}` })

  const M_Nmm = M_service * 1e6
  const z_approx = 0.87 * dx
  const sigma_s = M_Nmm / (As_prov * z_approx)
  steps.push({ clause: 'EC2 §7.3.4(2)', description: 'Steel stress under service load', formula: 'σs ≈ Ms/(As·0.87d)', substitution: `σs = ${fmt(M_Nmm, 0)} / (${fmt(As_prov, 0)} × ${fmt(z_approx, 1)})`, result: `σs = ${fmt(sigma_s, 1)} MPa` })

  const k1 = 0.8
  const k2 = 0.5
  const sr_max = 3.4 * cover + 0.425 * k1 * k2 * barDia / rho_p_eff
  steps.push({ clause: 'EC2 Eq. 7.11', description: 'Maximum crack spacing', formula: 'sr,max = 3.4·c + 0.425·k₁·k₂·φ/ρp,eff', substitution: `sr,max = 3.4×${cover} + 0.425×${k1}×${k2}×${barDia}/${fmt(rho_p_eff, 4)}`, result: `sr,max = ${fmt(sr_max, 1)} mm` })

  const eps_sm_ecm = Math.max(
    (sigma_s - kt * fctm / rho_p_eff * (1 + alpha_e * rho_p_eff)) / Es,
    0.6 * sigma_s / Es
  )
  steps.push({ clause: 'EC2 Eq. 7.9', description: 'Mean strain difference', formula: '(εsm−εcm) = max([σs − kt·fct,eff·(1+αe·ρp,eff)/ρp,eff]/Es, 0.6σs/Es)', substitution: `kt=${kt}, αe=${fmt(alpha_e, 2)}`, result: `(εsm−εcm) = ${fmt(eps_sm_ecm * 1000, 4)} × 10⁻³` })

  const wk = sr_max * eps_sm_ecm
  steps.push({ clause: 'EC2 Eq. 7.8', description: 'Calculated crack width', formula: 'wk = sr,max · (εsm − εcm)', substitution: `wk = ${fmt(sr_max, 1)} × ${fmt(eps_sm_ecm, 6)}`, result: `wk = ${fmt(wk, 3)} mm ${wk <= wmax ? '✓' : '✗'} (limit: ${wmax} mm)` })

  return { wk, wmax, sr_max, sigma_s, pass_crack: wk <= wmax, steps }
}

// ── Crack Control ACI §24.3 ─────────────────────────────────────────────────

export function calcSlabCrackACI(
  dx: number, fy: number, cc: number, spacingX: number,
  M_service: number, As_prov: number, b: number,
): SlabCrackResult {
  const steps: StepItem[] = []
  const z_approx = 0.87 * dx
  const fs = M_service * 1e6 / (As_prov * z_approx)
  steps.push({ clause: 'ACI 24.3.2', description: 'Service steel stress', formula: 'fs ≈ Ms/(As·0.87d)', substitution: `fs = ${fmt(M_service, 1)}×10⁶ / (${fmt(As_prov, 0)} × ${fmt(z_approx, 1)})`, result: `fs = ${fmt(fs, 1)} MPa` })

  const s_max = Math.min(380 * (280 / fs) - 2.5 * cc, 300 * (280 / fs))
  steps.push({ clause: 'ACI 24.3.2', description: 'Maximum bar spacing for crack control', formula: 's ≤ min(380(280/fs)−2.5cc, 300(280/fs))', substitution: `fs = ${fmt(fs, 1)}, cc = ${cc}`, result: `smax = ${fmt(s_max, 0)} mm, sprov = ${spacingX} mm ${spacingX <= s_max ? '✓' : '✗'}` })

  return { wk: 0, wmax: 0, sr_max: 0, sigma_s: fs, s_prov: spacingX, s_max, pass_crack: spacingX <= s_max, steps }
}

// ── Bar Spacing Check ────────────────────────────────────────────────────────

export function calcSpacingCheck(
  h: number, spacingX: number, spacingY: number,
  code: 'EC2' | 'ACI', slabType: SlabType,
): SlabSpacingResult {
  const steps: StepItem[] = []

  let s_max_main: number
  let s_max_secondary: number

  if (code === 'EC2') {
    s_max_main = Math.min(3 * h, 400)
    s_max_secondary = Math.min(3.5 * h, 450)
    steps.push({ clause: 'EC2 §9.3.1.1(3)', description: 'Maximum main bar spacing', formula: 'smax = min(3h, 400mm)', substitution: `smax = min(3×${h}, 400)`, result: `smax,main = ${fmt(s_max_main, 0)} mm` })
    steps.push({ clause: 'EC2 §9.3.1.1(4)', description: 'Maximum secondary bar spacing', formula: 'smax = min(3.5h, 450mm)', substitution: `smax = min(3.5×${h}, 450)`, result: `smax,sec = ${fmt(s_max_secondary, 0)} mm` })
  } else {
    s_max_main = Math.min(3 * h, 450)
    s_max_secondary = Math.min(5 * h, 450)
    steps.push({ clause: 'ACI 7.7.2.3', description: 'Maximum main bar spacing', formula: 'smax = min(3h, 450mm)', substitution: `smax = min(3×${h}, 450)`, result: `smax,main = ${fmt(s_max_main, 0)} mm` })
    steps.push({ clause: 'ACI 7.7.2.4', description: 'Maximum secondary bar spacing', formula: 'smax = min(5h, 450mm)', substitution: `smax = min(5×${h}, 450)`, result: `smax,sec = ${fmt(s_max_secondary, 0)} mm` })
  }

  const pass_x = spacingX <= s_max_main
  const pass_y = slabType === 'two-way'
    ? spacingY <= s_max_main
    : spacingY <= s_max_secondary

  steps.push({ clause: '', description: 'Spacing check', formula: '', substitution: '', result: `sx = ${spacingX} mm ${pass_x ? '✓' : '✗'}, sy = ${spacingY} mm ${pass_y ? '✓' : '✗'}` })

  return { s_prov_x: spacingX, s_prov_y: spacingY, s_max_main, s_max_secondary, pass_x, pass_y, steps }
}

// ── Bar Schedule for Slabs ──────────────────────────────────────────────────

export interface SlabBarOption {
  label: string
  dia: number
  spacing: number
  As_prov: number
  sufficient: boolean
}

export function getSlabBarSchedule(As_req: number, code: 'EC2' | 'ACI'): SlabBarOption[] {
  const diameters = code === 'EC2' ? EC2_SLAB_BAR_DIAMETERS : ACI_SLAB_BAR_DIAMETERS_MM
  const labels = code === 'EC2' ? EC2_SLAB_BAR_LABELS : ACI_SLAB_BAR_LABELS
  const spacings = [100, 125, 150, 175, 200, 225, 250, 300]
  const results: SlabBarOption[] = []

  for (let i = 0; i < diameters.length; i++) {
    for (const s of spacings) {
      const As = areaPerMeter(diameters[i], s)
      if (As >= As_req * 0.85 && As <= As_req * 2.5) {
        const lbl = code === 'EC2' ? `${labels[i]}@${s}` : `${labels[i]}@${s}mm`
        results.push({ label: lbl, dia: diameters[i], spacing: s, As_prov: As, sufficient: As >= As_req })
      }
    }
  }

  results.sort((a, b) => a.As_prov - b.As_prov)
  return results.filter(r => r.sufficient).slice(0, 6)
}
