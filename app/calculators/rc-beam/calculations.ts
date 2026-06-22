import {
  type FlexureResult, type ShearResult, type CrackResult, type DeflectionResult,
  type BarScheduleItem, type StepItem, type SupportCondition, type DesignCode, type UnitSystem,
  barArea, fmt, getKFactor, getAciMinThickness,
  EC2_BAR_DIAMETERS, EC2_BAR_LABELS, ACI_BAR_DIAMETERS_MM, ACI_BAR_LABELS,
} from './types'

// ── EC2 Flexure §6.1 ─────────────────────────────────────────────────────────

export function calcFlexureEC2(
  b: number, h: number, d: number, fck: number, fctm: number, fyk: number,
  MEd: number, As_prov_tension: number,
  hasCompression: boolean, As_prov_comp: number, d_prime: number,
  gamma_c: number, gamma_s: number,
): FlexureResult {
  const steps: StepItem[] = []
  const alpha_cc = 0.85
  const fcd = alpha_cc * fck / gamma_c
  const fyd = fyk / gamma_s
  const Es = 200000

  steps.push({ clause: 'EC2 §3.1.6(1)', description: 'Design concrete strength', formula: 'fcd = αcc · fck / γc', substitution: `fcd = ${alpha_cc} × ${fck} / ${gamma_c}`, result: `fcd = ${fmt(fcd)} MPa` })
  steps.push({ clause: 'EC2 §3.2.7(2)', description: 'Design steel strength', formula: 'fyd = fyk / γs', substitution: `fyd = ${fyk} / ${gamma_s}`, result: `fyd = ${fmt(fyd, 1)} MPa` })

  const MEd_Nmm = MEd * 1e6
  const K = MEd_Nmm / (b * d * d * fck)
  const Kbal = 0.167

  steps.push({ clause: 'EC2 §6.1(4)', description: 'Normalized moment coefficient', formula: 'K = MEd / (b · d² · fck)', substitution: `K = ${fmt(MEd_Nmm, 0)} / (${b} × ${fmt(d, 1)}² × ${fck})`, result: `K = ${fmt(K, 4)}` })

  const doubly_reinforced = K > Kbal
  let z: number, As_req: number, As2_req = 0, x: number

  if (!doubly_reinforced) {
    steps.push({ clause: 'EC2 §6.1(4)', description: 'Check: K ≤ Kbal', formula: `K = ${fmt(K, 4)} ≤ Kbal = ${Kbal}`, substitution: 'Singly reinforced design', result: '✓ Singly reinforced' })

    z = d * (0.5 + Math.sqrt(Math.max(0.25 - K / 1.134, 0)))
    z = Math.min(z, 0.95 * d)
    steps.push({ clause: 'EC2 §6.1(4)', description: 'Lever arm', formula: 'z = d · (0.5 + √(0.25 − K/1.134)) ≤ 0.95d', substitution: `z = ${fmt(d, 1)} × (0.5 + √(0.25 − ${fmt(K, 4)}/1.134))`, result: `z = ${fmt(z, 1)} mm` })

    As_req = MEd_Nmm / (fyd * z)
    steps.push({ clause: 'EC2 §6.1(4)', description: 'Required tension reinforcement', formula: 'As,req = MEd / (fyd · z)', substitution: `As,req = ${fmt(MEd_Nmm, 0)} / (${fmt(fyd, 1)} × ${fmt(z, 1)})`, result: `As,req = ${fmt(As_req, 0)} mm²` })

    x = (As_prov_tension * fyd - (hasCompression ? As_prov_comp * fyd : 0)) / (0.8 * b * fcd)
  } else {
    steps.push({ clause: 'EC2 §6.1(4)', description: 'Check: K > Kbal', formula: `K = ${fmt(K, 4)} > Kbal = ${Kbal}`, substitution: 'Doubly reinforced design required', result: '⚠ Doubly reinforced' })

    z = d * (0.5 + Math.sqrt(0.25 - Kbal / 1.134))
    steps.push({ clause: 'EC2 §6.1(4)', description: 'Lever arm (at balanced)', formula: 'z = d · (0.5 + √(0.25 − Kbal/1.134))', substitution: `z = ${fmt(d, 1)} × (0.5 + √(0.25 − ${Kbal}/1.134))`, result: `z = ${fmt(z, 1)} mm` })

    const M_bal = Kbal * b * d * d * fck
    const M_excess = MEd_Nmm - M_bal
    As2_req = M_excess / (fyd * (d - d_prime))
    steps.push({ clause: 'EC2 §6.1', description: 'Excess moment for compression steel', formula: "As2,req = (MEd − Kbal·b·d²·fck) / (fyd·(d−d'))", substitution: `As2,req = (${fmt(MEd_Nmm, 0)} − ${fmt(M_bal, 0)}) / (${fmt(fyd, 1)} × (${fmt(d, 1)} − ${fmt(d_prime, 1)}))`, result: `As2,req = ${fmt(As2_req, 0)} mm²` })

    const xbal = (d - z) / 0.4
    const eps_s2 = 0.0035 * (xbal - d_prime) / xbal
    const comp_yields = eps_s2 >= fyd / Es
    steps.push({ clause: 'EC2 §6.1', description: 'Check compression steel yields', formula: "ε's = εcu2·(x−d')/x ≥ fyd/Es", substitution: `ε's = 0.0035×(${fmt(xbal, 1)}−${fmt(d_prime, 1)})/${fmt(xbal, 1)} = ${fmt(eps_s2, 5)}`, result: `${comp_yields ? '✓ Yields' : '✗ Does not yield'} (fyd/Es = ${fmt(fyd / Es, 5)})` })

    As_req = M_bal / (fyd * z) + As2_req
    steps.push({ clause: 'EC2 §6.1', description: 'Total required tension steel', formula: 'As,req = Kbal·b·d²·fck/(fyd·z) + As2,req', substitution: `As,req = ${fmt(M_bal, 0)}/(${fmt(fyd, 1)}×${fmt(z, 1)}) + ${fmt(As2_req, 0)}`, result: `As,req = ${fmt(As_req, 0)} mm²` })

    x = (As_prov_tension * fyd - (hasCompression ? As_prov_comp * fyd : 0)) / (0.8 * b * fcd)
  }

  const xd_ratio = x / d
  steps.push({ clause: 'EC2 §5.5(4)', description: 'Neutral axis depth ratio', formula: 'x/d = (As·fyd − As2·fyd) / (0.8·b·fcd·d)', substitution: `x = ${fmt(x, 1)} mm`, result: `x/d = ${fmt(xd_ratio, 3)} ${xd_ratio <= 0.45 ? '✓' : '✗'} (limit 0.45)` })

  const As_min1 = 0.26 * (fctm / fyk) * b * d
  const As_min2 = 0.0013 * b * d
  const As_min = Math.max(As_min1, As_min2)
  steps.push({ clause: 'EC2 §9.2.1.1(1)', description: 'Minimum reinforcement', formula: 'As,min = max(0.26·fctm/fyk·b·d, 0.0013·b·d)', substitution: `As,min = max(0.26×${fctm}/${fyk}×${b}×${fmt(d, 1)}, 0.0013×${b}×${fmt(d, 1)})`, result: `As,min = ${fmt(As_min, 0)} mm²` })

  const As_max = 0.04 * b * h
  steps.push({ clause: 'EC2 §9.2.1.1(3)', description: 'Maximum reinforcement', formula: 'As,max = 0.04 · b · h', substitution: `As,max = 0.04 × ${b} × ${h}`, result: `As,max = ${fmt(As_max, 0)} mm²` })

  steps.push({ clause: '', description: 'Provided tension steel', formula: 'As,prov', substitution: '', result: `As,prov = ${fmt(As_prov_tension, 0)} mm²` })

  return {
    K, Kbal, z, As_req, As_min, As_max, As_prov: As_prov_tension, xd_ratio, x,
    doubly_reinforced, As2_req,
    pass_flexure: As_prov_tension >= Math.max(As_req, As_min),
    pass_min: As_prov_tension >= As_min,
    pass_max: As_prov_tension <= As_max,
    pass_xd: xd_ratio <= 0.45,
    steps,
  }
}

// ── ACI 318-19 Flexure ────────────────────────────────────────────────────────

export function calcFlexureACI(
  b: number, h: number, d: number, fc: number, fy: number,
  Mu: number, As_prov_tension: number,
  phi_flex: number,
): FlexureResult {
  const steps: StepItem[] = []

  const beta1 = fc <= 28 ? 0.85 : Math.max(0.85 - 0.05 * (fc - 28) / 7, 0.65)
  steps.push({ clause: 'ACI 22.2.2.4.3', description: 'Whitney stress block factor', formula: "β₁ = 0.85 − 0.05·(f'c − 28)/7 ≥ 0.65", substitution: `β₁ for f'c = ${fc} MPa`, result: `β₁ = ${fmt(beta1, 3)}` })

  const a = (As_prov_tension * fy) / (0.85 * fc * b)
  const c = a / beta1
  steps.push({ clause: 'ACI 22.2.2.4.1', description: 'Depth of equivalent stress block', formula: "a = As·fy / (0.85·f'c·b)", substitution: `a = ${fmt(As_prov_tension, 0)}×${fy} / (0.85×${fc}×${b})`, result: `a = ${fmt(a, 1)} mm` })
  steps.push({ clause: 'ACI 22.2.2.4.1', description: 'Neutral axis depth', formula: 'c = a / β₁', substitution: `c = ${fmt(a, 1)} / ${fmt(beta1, 3)}`, result: `c = ${fmt(c, 1)} mm` })

  const eps_t = ((d - c) / c) * 0.003
  steps.push({ clause: 'ACI 21.2.2', description: 'Net tensile strain', formula: 'εt = (d−c)/c × 0.003', substitution: `εt = (${fmt(d, 1)}−${fmt(c, 1)})/${fmt(c, 1)} × 0.003`, result: `εt = ${fmt(eps_t, 5)}` })

  const tension_controlled = eps_t >= 0.005
  const phi_actual = eps_t >= 0.005 ? 0.9 : (eps_t <= 0.002 ? 0.65 : 0.65 + (eps_t - 0.002) * (250 / 3))
  steps.push({ clause: 'ACI 21.2.2', description: 'Strength reduction factor', formula: 'φ = 0.90 if εt ≥ 0.005, transition zone otherwise', substitution: `εt = ${fmt(eps_t, 5)}`, result: `φ = ${fmt(phi_actual, 3)} (${tension_controlled ? 'tension controlled ✓' : 'transition zone ⚠'})` })

  const phi_Mn = phi_actual * As_prov_tension * fy * (d - a / 2) / 1e6
  steps.push({ clause: 'ACI 22.3.2.1', description: 'Design moment capacity', formula: 'φMn = φ·As·fy·(d − a/2)', substitution: `φMn = ${fmt(phi_actual, 3)}×${fmt(As_prov_tension, 0)}×${fy}×(${fmt(d, 1)}−${fmt(a, 1)}/2)`, result: `φMn = ${fmt(phi_Mn, 1)} kN·m` })

  const Mu_Nmm = Mu * 1e6
  const As_req = Mu_Nmm / (phi_flex * fy * (d - a / 2))
  steps.push({ clause: 'ACI 9.5.1.1', description: 'Required steel area', formula: 'As,req = Mu / (φ·fy·(d−a/2))', substitution: `As,req = ${fmt(Mu_Nmm, 0)} / (${phi_flex}×${fy}×(${fmt(d, 1)}−${fmt(a, 1)}/2))`, result: `As,req = ${fmt(As_req, 0)} mm²` })

  const As_min1 = (0.25 * Math.sqrt(fc) / fy) * b * d
  const As_min2 = (1.4 / fy) * b * d
  const As_min = Math.max(As_min1, As_min2)
  steps.push({ clause: 'ACI 9.6.1.2', description: 'Minimum reinforcement', formula: "As,min = max(0.25√f'c/fy·bw·d, 1.4/fy·bw·d)", substitution: `As,min = max(${fmt(As_min1, 0)}, ${fmt(As_min2, 0)})`, result: `As,min = ${fmt(As_min, 0)} mm²` })

  const As_max_rho = 0.85 * beta1 * (fc / fy) * (0.003 / (0.003 + 0.004))
  const As_max = As_max_rho * b * d

  return {
    K: 0, Kbal: 0, z: d - a / 2, As_req, As_min, As_max, As_prov: As_prov_tension,
    xd_ratio: c / d, x: c, a, c, eps_t, phi_Mn, tension_controlled,
    doubly_reinforced: false, As2_req: 0,
    pass_flexure: phi_Mn >= Mu,
    pass_min: As_prov_tension >= As_min,
    pass_max: As_prov_tension <= As_max,
    pass_xd: eps_t >= 0.004,
    steps,
  }
}

// ── EC2 Shear §6.2 ───────────────────────────────────────────────────────────

export function calcShearEC2(
  bw: number, d: number, fck: number, fyk: number, VEd: number,
  As_prov: number, stirrupDia: number, stirrupLegs: number, stirrupSpacing: number,
  gamma_c: number, gamma_s: number,
): ShearResult {
  const steps: StepItem[] = []
  const fyd = fyk / gamma_s

  const k = Math.min(1 + Math.sqrt(200 / d), 2.0)
  steps.push({ clause: 'EC2 §6.2.2(1)', description: 'Size effect factor', formula: 'k = min(1 + √(200/d), 2.0)', substitution: `k = min(1 + √(200/${fmt(d, 1)}), 2.0)`, result: `k = ${fmt(k, 3)}` })

  const rho_l = Math.min(As_prov / (bw * d), 0.02)
  const CRd_c = 0.12
  const VRd_c_1 = (CRd_c * k * Math.pow(100 * rho_l * fck, 1 / 3)) * bw * d / 1000
  const vmin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(fck)
  const VRd_c_2 = vmin * bw * d / 1000
  const VRd_c = Math.max(VRd_c_1, VRd_c_2)
  steps.push({ clause: 'EC2 §6.2.2(1)', description: 'Concrete shear resistance (no reinforcement)', formula: 'VRd,c = max[CRd,c·k·(100ρl·fck)^⅓·bw·d, vmin·bw·d]', substitution: `ρl=${fmt(rho_l, 5)}, vmin=${fmt(vmin, 3)}`, result: `VRd,c = ${fmt(VRd_c, 1)} kN` })

  const shear_reinf_required = VEd > VRd_c

  const cot_theta = 2.5
  const z = 0.9 * d
  const Asw_s_req = shear_reinf_required ? (VEd * 1000) / (z * fyd * cot_theta) : 0
  steps.push({ clause: 'EC2 §6.2.3(3)', description: 'Required shear reinforcement', formula: 'Asw/s = VEd / (z · fyd · cotθ)', substitution: `Asw/s = ${VEd}×1000 / (${fmt(z, 1)} × ${fmt(fyd, 1)} × ${cot_theta})`, result: `Asw/s,req = ${fmt(Asw_s_req, 3)} mm²/mm` })

  const Asw_prov = stirrupLegs * barArea(stirrupDia)
  const Asw_s_prov = Asw_prov / stirrupSpacing
  steps.push({ clause: '', description: 'Provided shear reinforcement', formula: 'Asw/s = nlegs · π·φ²/4 / s', substitution: `Asw/s = ${stirrupLegs}×${fmt(barArea(stirrupDia), 1)} / ${stirrupSpacing}`, result: `Asw/s,prov = ${fmt(Asw_s_prov, 3)} mm²/mm` })

  const v1 = 0.6 * (1 - fck / 250)
  const fcd = 0.85 * fck / gamma_c
  const VRd_max = v1 * fcd * bw * z / (cot_theta + 1 / cot_theta) / 1000
  steps.push({ clause: 'EC2 §6.2.3(3)', description: 'Maximum shear capacity (strut)', formula: 'VRd,max = ν₁·fcd·bw·z / (cotθ + tanθ)', substitution: `ν₁=${fmt(v1, 3)}, fcd=${fmt(fcd, 1)}`, result: `VRd,max = ${fmt(VRd_max, 1)} kN` })

  const rho_w_min = 0.08 * Math.sqrt(fck) / fyk
  const Asw_s_min = rho_w_min * bw
  steps.push({ clause: 'EC2 §9.2.2(5)', description: 'Minimum shear reinforcement', formula: 'ρw,min = 0.08·√fck/fyk', substitution: `ρw,min = 0.08×√${fck}/${fyk}`, result: `Asw/s,min = ${fmt(Asw_s_min, 3)} mm²/mm` })

  const s_max = Math.min(0.75 * d, 600)
  steps.push({ clause: 'EC2 §9.2.2(6)', description: 'Maximum stirrup spacing', formula: 'smax = min(0.75d, 600)', substitution: `smax = min(0.75×${fmt(d, 1)}, 600)`, result: `smax = ${fmt(s_max, 0)} mm ${stirrupSpacing <= s_max ? '✓' : '✗'}` })

  return {
    VRd_c, shear_reinf_required, Asw_s_req, Asw_s_prov, VRd_max, s_max,
    pass_shear: shear_reinf_required ? Asw_s_prov >= Asw_s_req : true,
    pass_max_shear: VEd <= VRd_max,
    pass_min_stirrups: Asw_s_prov >= Asw_s_min,
    steps,
  }
}

// ── ACI 318-19 Shear §22.5 ───────────────────────────────────────────────────

export function calcShearACI(
  bw: number, d: number, fc: number, fy: number, Vu: number,
  stirrupDia: number, stirrupLegs: number, stirrupSpacing: number,
  phi_shear: number,
): ShearResult {
  const steps: StepItem[] = []
  const lambda = 1.0

  const Vc = 0.17 * lambda * Math.sqrt(fc) * bw * d / 1000
  const phi_Vc = phi_shear * Vc
  steps.push({ clause: 'ACI 22.5.5.1', description: 'Concrete shear capacity (simplified)', formula: "Vc = 0.17·λ·√f'c·bw·d", substitution: `Vc = 0.17×${lambda}×√${fc}×${bw}×${fmt(d, 1)}/1000`, result: `Vc = ${fmt(Vc, 1)} kN, φVc = ${fmt(phi_Vc, 1)} kN` })

  const shear_reinf_required = Vu > phi_Vc / 2
  const Vs_req = Vu > phi_Vc ? (Vu / phi_shear - Vc) : 0
  steps.push({ clause: 'ACI 22.5.1.1', description: 'Required steel shear contribution', formula: 'Vs = Vu/φ − Vc', substitution: `Vs = ${fmt(Vu, 1)}/${phi_shear} − ${fmt(Vc, 1)}`, result: `Vs,req = ${fmt(Vs_req, 1)} kN` })

  const Asw_s_req = Vs_req > 0 ? (Vs_req * 1000) / (fy * d) : 0
  const Asw_s_prov = (stirrupLegs * barArea(stirrupDia)) / stirrupSpacing
  steps.push({ clause: 'ACI 22.5.10.5.3', description: 'Stirrup requirement', formula: 'Av/s = Vs / (fy·d)', substitution: `Av/s = ${fmt(Vs_req, 1)}×1000 / (${fy}×${fmt(d, 1)})`, result: `req = ${fmt(Asw_s_req, 3)}, prov = ${fmt(Asw_s_prov, 3)} mm²/mm` })

  const Asw_s_min = Math.max(0.062 * Math.sqrt(fc) * bw / fy, 0.35 * bw / fy)
  const Vs_max = 0.66 * Math.sqrt(fc) * bw * d / 1000
  const VRd_max = phi_shear * (Vc + Vs_max)
  const Vs_prov = Asw_s_prov * fy * d / 1000
  const s_max_shear = Vs_prov <= 0.33 * Math.sqrt(fc) * bw * d / 1000 ? Math.min(d / 2, 600) : Math.min(d / 4, 300)
  steps.push({ clause: 'ACI 9.7.6.2.2', description: 'Maximum stirrup spacing', formula: 'smax = d/2 ≤ 600mm (or d/4 if Vs large)', substitution: `Vs,prov = ${fmt(Vs_prov, 1)} kN`, result: `smax = ${fmt(s_max_shear, 0)} mm` })

  return {
    VRd_c: phi_Vc, shear_reinf_required, Asw_s_req, Asw_s_prov, VRd_max,
    Vc, phi_Vc, Vs_req, s_max: s_max_shear,
    pass_shear: Vu <= phi_shear * (Vc + Vs_prov),
    pass_max_shear: Vu <= VRd_max,
    pass_min_stirrups: !shear_reinf_required || Asw_s_prov >= Asw_s_min,
    steps,
  }
}

// ── EC2 Crack Width §7.3.4 ───────────────────────────────────────────────────

export function calcCrackEC2(
  b: number, h: number, d: number, fctm: number,
  Es: number, Ecm: number, M_service: number, As_prov: number,
  cover: number, barDia: number, wmax: number, kt: number,
): CrackResult {
  const steps: StepItem[] = []
  const alpha_e = Es / Ecm

  const hc_eff_1 = 2.5 * (h - d)
  const hc_eff_2 = (h - d * 2 / 3) / 3
  const hc_eff_3 = h / 2
  const hc_eff = Math.min(hc_eff_1, hc_eff_2, hc_eff_3)
  const Ac_eff = b * hc_eff
  const rho_p_eff = Math.max(As_prov / Ac_eff, 0.001)

  steps.push({ clause: 'EC2 §7.3.2(3)', description: 'Effective tension area', formula: 'hc,eff = min(2.5(h−d), (h−x)/3, h/2)', substitution: `hc,eff = min(${fmt(hc_eff_1, 1)}, ${fmt(hc_eff_2, 1)}, ${fmt(hc_eff_3, 1)})`, result: `Ac,eff = ${b} × ${fmt(hc_eff, 1)} = ${fmt(Ac_eff, 0)} mm², ρp,eff = ${fmt(rho_p_eff, 4)}` })

  const M_Nmm = M_service * 1e6
  const z_approx = 0.87 * d
  const sigma_s = M_Nmm / (As_prov * z_approx)
  steps.push({ clause: 'EC2 §7.3.4(2)', description: 'Steel stress under service load', formula: 'σs ≈ Ms / (As · 0.87d)', substitution: `σs = ${fmt(M_Nmm, 0)} / (${fmt(As_prov, 0)} × ${fmt(z_approx, 1)})`, result: `σs = ${fmt(sigma_s, 1)} MPa` })

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

  return { wk, wmax, sr_max, eps_diff: eps_sm_ecm, sigma_s, pass_crack: wk <= wmax, steps }
}

// ── ACI 318-19 Crack Control §24.3 ───────────────────────────────────────────

export function calcCrackACI(
  d: number, fy: number, cc: number, barDia: number, barCount: number, b: number,
  M_service: number, As_prov: number,
): CrackResult {
  const steps: StepItem[] = []
  const z_approx = 0.87 * d
  const fs = M_service * 1e6 / (As_prov * z_approx)
  steps.push({ clause: 'ACI 24.3.2', description: 'Estimated service steel stress', formula: 'fs ≈ Ms / (As · 0.87d)', substitution: `fs = ${fmt(M_service, 1)}×10⁶ / (${fmt(As_prov, 0)} × ${fmt(z_approx, 1)})`, result: `fs = ${fmt(fs, 1)} MPa` })

  const s_prov = barCount > 1 ? (b - 2 * cc - barDia) / (barCount - 1) : b - 2 * cc
  const s_max = Math.min(380 * (280 / fs) - 2.5 * cc, 300 * (280 / fs))
  steps.push({ clause: 'ACI 24.3.2', description: 'Maximum bar spacing for crack control', formula: 's ≤ min(380(280/fs)−2.5cc, 300(280/fs))', substitution: `s = min(380×(280/${fmt(fs, 1)})−2.5×${cc}, 300×(280/${fmt(fs, 1)}))`, result: `smax = ${fmt(s_max, 1)} mm, sprov = ${fmt(s_prov, 1)} mm ${s_prov <= s_max ? '✓' : '✗'}` })

  return { wk: 0, wmax: 0, sr_max: 0, eps_diff: 0, sigma_s: fs, s_max, s_prov, pass_crack: s_prov <= s_max, steps }
}

// ── EC2 Deflection §7.4 ──────────────────────────────────────────────────────

export function calcDeflectionEC2(
  b: number, d: number, fck: number, fyk: number,
  As_prov: number, As_req: number, As_prov_comp: number,
  span_mm: number, support: SupportCondition,
  bw: number, b_flange: number, isFlange: boolean,
): DeflectionResult {
  const steps: StepItem[] = []
  const rho = As_prov / (b * d)
  const rho_prime = As_prov_comp / (b * d)
  const rho_0 = 1e-3 * Math.sqrt(fck)
  const KK = getKFactor(support)

  steps.push({ clause: 'EC2 §7.4.2(2)', description: 'Reference reinforcement ratio', formula: 'ρ₀ = 10⁻³√fck', substitution: `ρ₀ = 10⁻³×√${fck}`, result: `ρ₀ = ${fmt(rho_0, 5)}` })
  steps.push({ clause: 'EC2 Table 7.4N', description: 'Structural system factor', formula: 'K per support type', substitution: `Support: ${support}`, result: `K = ${KK}` })

  let ld_ratio: number
  if (rho <= rho_0) {
    ld_ratio = KK * (11 + 1.5 * Math.sqrt(fck) * rho_0 / rho + 3.2 * Math.sqrt(fck) * Math.pow(rho_0 / rho - 1, 1.5))
    steps.push({ clause: 'EC2 Eq. 7.16a', description: 'Basic l/d ratio (ρ ≤ ρ₀)', formula: 'l/d = K·[11 + 1.5·√fck·ρ₀/ρ + 3.2·√fck·(ρ₀/ρ−1)^1.5]', substitution: `ρ=${fmt(rho, 5)}, ρ₀=${fmt(rho_0, 5)}`, result: `l/d basic = ${fmt(ld_ratio, 1)}` })
  } else {
    ld_ratio = KK * (11 + 1.5 * Math.sqrt(fck) * rho_0 / (rho - rho_prime) + (1 / 12) * Math.sqrt(fck) * Math.sqrt(rho_prime / rho_0))
    steps.push({ clause: 'EC2 Eq. 7.16b', description: 'Basic l/d ratio (ρ > ρ₀)', formula: "l/d = K·[11 + 1.5·√fck·ρ₀/(ρ−ρ') + √fck/12·√(ρ'/ρ₀)]", substitution: `ρ=${fmt(rho, 5)}, ρ'=${fmt(rho_prime, 5)}`, result: `l/d basic = ${fmt(ld_ratio, 1)}` })
  }

  let mod = Math.min(As_prov / Math.max(As_req, 1), 1.5)
  steps.push({ clause: 'EC2 §7.4.2(2)', description: 'Steel provision modification', formula: 'mod = min(As,prov/As,req, 1.5)', substitution: `mod = min(${fmt(As_prov, 0)}/${fmt(Math.max(As_req, 1), 0)}, 1.5)`, result: `mod = ${fmt(mod, 2)}` })

  let flange_mod = 1.0
  if (isFlange && b_flange / bw > 3) {
    flange_mod = 0.8
    steps.push({ clause: 'EC2 §7.4.2(2)', description: 'Flanged beam modification', formula: 'if b/bw > 3 → ×0.8', substitution: `b/bw = ${fmt(b_flange / bw, 1)}`, result: `Flange mod = 0.8` })
  }

  const span_m = span_mm / 1000
  let span_mod = 1.0
  if (span_m > 7) {
    span_mod = 7 / span_m
    steps.push({ clause: 'EC2 §7.4.2(2)', description: 'Long span modification', formula: 'if L > 7m → ×(7/L)', substitution: `L = ${fmt(span_m, 1)} m`, result: `Span mod = ${fmt(span_mod, 2)}` })
  }

  const allowable_ratio = ld_ratio * mod * flange_mod * span_mod
  const actual_ratio = span_mm / d
  steps.push({ clause: 'EC2 §7.4.2', description: 'Final span/depth check', formula: 'l/d allowable vs l/d actual', substitution: `allowable = ${fmt(ld_ratio, 1)} × ${fmt(mod, 2)} × ${fmt(flange_mod, 1)} × ${fmt(span_mod, 2)}`, result: `l/d allow = ${fmt(allowable_ratio, 1)}, l/d actual = ${fmt(actual_ratio, 1)} ${actual_ratio <= allowable_ratio ? '✓' : '✗'}` })

  return { allowable_ratio, actual_ratio, pass_deflection: actual_ratio <= allowable_ratio, steps }
}

// ── ACI 318-19 Deflection ────────────────────────────────────────────────────

export function calcDeflectionACI(
  h: number, span_mm: number, support: SupportCondition,
): DeflectionResult {
  const steps: StepItem[] = []
  const h_min = getAciMinThickness(support, span_mm)
  steps.push({ clause: 'ACI Table 9.3.1.1', description: 'Minimum beam depth for deflection', formula: 'hmin per support condition and span', substitution: `Support: ${support.replace(/_/g, ' ')}, L = ${span_mm} mm`, result: `hmin = ${fmt(h_min, 1)} mm, h = ${h} mm ${h >= h_min ? '✓' : '✗'}` })

  return {
    allowable_ratio: 0, actual_ratio: 0,
    h_min, h_actual: h,
    pass_deflection: h >= h_min,
    steps,
  }
}

// ── Bar Schedule Generator ───────────────────────────────────────────────────

export function getBarSchedule(As_req: number, code: DesignCode, units: UnitSystem): BarScheduleItem[] {
  const diameters = code === 'EC2' ? EC2_BAR_DIAMETERS : ACI_BAR_DIAMETERS_MM
  const labels = code === 'EC2' ? EC2_BAR_LABELS : ACI_BAR_LABELS
  const results: BarScheduleItem[] = []

  for (let i = 0; i < diameters.length; i++) {
    const area1 = barArea(diameters[i])
    if (area1 < 20) continue
    const count = Math.ceil(As_req / area1)
    if (count >= 2 && count <= 10) {
      results.push({
        label: `${count}${labels[i]}`,
        count,
        dia: diameters[i],
        As_prov: count * area1,
        sufficient: count * area1 >= As_req,
      })
    }
  }

  results.sort((a, b) => a.As_prov - b.As_prov)
  return results.slice(0, 6)
}
