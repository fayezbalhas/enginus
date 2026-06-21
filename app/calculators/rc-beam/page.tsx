'use client'

import { useState, useMemo, useCallback } from 'react'
import Navbar from '../../components/Navbar'
import ProGate from '../../components/ProGate'

// ── Types ──────────────────────────────────────────────────────────────────────
type DesignCode = 'EC2' | 'ACI'
type UnitSystem = 'SI' | 'Imperial'
type LimitState = 'ULS' | 'SLS_CRACK' | 'SLS_DEFLECTION'
type SupportCondition = 'simply_supported' | 'end_span' | 'interior_span' | 'cantilever'

interface ConcreteClass { label: string; fck: number; fctm: number; Ecm: number }
interface SteelClass { label: string; fyk: number }
interface ExposureClass { label: string; cmin_dur: number }
interface AciConcreteOption { label: string; fc: number }
interface AciSteelOption { label: string; fy: number }

// ── EC2 Data Tables ────────────────────────────────────────────────────────────
const EC2_CONCRETE: ConcreteClass[] = [
  { label: 'C20/25', fck: 20, fctm: 2.2, Ecm: 30000 },
  { label: 'C25/30', fck: 25, fctm: 2.6, Ecm: 31000 },
  { label: 'C30/37', fck: 30, fctm: 2.9, Ecm: 33000 },
  { label: 'C35/45', fck: 35, fctm: 3.2, Ecm: 34000 },
  { label: 'C40/50', fck: 40, fctm: 3.5, Ecm: 35000 },
  { label: 'C45/55', fck: 45, fctm: 3.8, Ecm: 36000 },
  { label: 'C50/60', fck: 50, fctm: 4.1, Ecm: 37000 },
]

const EC2_STEEL: SteelClass[] = [
  { label: 'B500S', fyk: 500 },
  { label: 'B600S', fyk: 600 },
]

const EC2_EXPOSURE: ExposureClass[] = [
  { label: 'XC1', cmin_dur: 15 },
  { label: 'XC2', cmin_dur: 25 },
  { label: 'XC3', cmin_dur: 25 },
  { label: 'XC4', cmin_dur: 30 },
  { label: 'XD1', cmin_dur: 40 },
  { label: 'XD2', cmin_dur: 45 },
  { label: 'XD3', cmin_dur: 50 },
  { label: 'XS1', cmin_dur: 40 },
  { label: 'XS2', cmin_dur: 45 },
  { label: 'XS3', cmin_dur: 50 },
]

const EC2_BAR_DIAMETERS = [10, 12, 16, 20, 25, 32, 40]
const EC2_BAR_LABELS = ['T10', 'T12', 'T16', 'T20', 'T25', 'T32', 'T40']
const EC2_STIRRUP_DIAMETERS = [8, 10, 12]

// ── ACI Data Tables ────────────────────────────────────────────────────────────
const ACI_CONCRETE_SI: AciConcreteOption[] = [
  { label: '20 MPa', fc: 20 }, { label: '25 MPa', fc: 25 }, { label: '28 MPa', fc: 28 },
  { label: '30 MPa', fc: 30 }, { label: '35 MPa', fc: 35 }, { label: '40 MPa', fc: 40 },
]
const ACI_CONCRETE_IMP: AciConcreteOption[] = [
  { label: '3000 psi', fc: 20.68 }, { label: '4000 psi', fc: 27.58 },
  { label: '5000 psi', fc: 34.47 }, { label: '6000 psi', fc: 41.37 },
]

const ACI_STEEL: AciSteelOption[] = [
  { label: 'Grade 60 (420 MPa)', fy: 420 },
  { label: 'Grade 75 (520 MPa)', fy: 520 },
]

const ACI_BAR_DIAMETERS_MM = [9.5, 12.7, 15.9, 19.1, 22.2, 25.4, 28.7, 32.3, 35.8]
const ACI_BAR_DIAMETERS_IN = [0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.128, 1.27, 1.41]
const ACI_BAR_LABELS = ['#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11']
const ACI_STIRRUP_DIAMETERS_MM = [9.5, 12.7]
const ACI_STIRRUP_LABELS = ['#3', '#4']

// ── Helper ─────────────────────────────────────────────────────────────────────
function barArea(dia: number): number { return Math.PI * dia * dia / 4 }
function fmt(v: number, dp: number = 2): string { return v.toFixed(dp) }

function getKFactor(support: SupportCondition): number {
  switch (support) {
    case 'simply_supported': return 1.0
    case 'end_span': return 1.3
    case 'interior_span': return 1.5
    case 'cantilever': return 0.4
  }
}

function getAciMinThickness(support: SupportCondition, L_mm: number): number {
  switch (support) {
    case 'simply_supported': return L_mm / 16
    case 'end_span': return L_mm / 18.5
    case 'interior_span': return L_mm / 21
    case 'cantilever': return L_mm / 8
  }
}

// ── Calculation Interfaces ─────────────────────────────────────────────────────
interface FlexureResult {
  K: number; Kbal: number; z: number; As_req: number; As_min: number; As_max: number
  As_prov: number; xd_ratio: number; pass_flexure: boolean; pass_min: boolean
  pass_max: boolean; pass_xd: boolean
  steps: StepItem[]
  // ACI specific
  a?: number; c?: number; eps_t?: number; phi_Mn?: number
  tension_controlled?: boolean
}

interface ShearResult {
  VRd_c: number; shear_reinf_required: boolean
  Asw_s_req: number; Asw_s_prov: number; VRd_max: number
  pass_shear: boolean; pass_max_shear: boolean; pass_min_stirrups: boolean
  steps: StepItem[]
  // ACI specific
  Vc?: number; phi_Vc?: number; Vs_req?: number
}

interface CrackResult {
  wk: number; wmax: number; sr_max: number; eps_diff: number
  pass_crack: boolean; steps: StepItem[]
  // ACI specific
  s_max?: number; s_prov?: number
}

interface DeflectionResult {
  allowable_ratio: number; actual_ratio: number
  pass_deflection: boolean; steps: StepItem[]
  // ACI specific
  h_min?: number; h_actual?: number
}

interface StepItem { clause: string; description: string; formula: string; substitution: string; result: string }

interface BarScheduleItem { label: string; count: number; As_prov: number; fits: boolean }

// ── Main Calculation Engine ────────────────────────────────────────────────────
function calcFlexureEC2(
  b: number, h: number, d: number, fck: number, fctm: number, fyk: number,
  MEd: number, barDia: number, barCount: number,
  barDia2: number, barCount2: number, hasLayer2: boolean,
  compBarDia: number, compBarCount: number, hasCompression: boolean,
  d_prime: number
): FlexureResult {
  const steps: StepItem[] = []
  const gamma_c = 1.5
  const gamma_s = 1.15
  const alpha_cc = 0.85
  const fcd = alpha_cc * fck / gamma_c
  const fyd = fyk / gamma_s

  steps.push({ clause: 'EC2 §3.1.6', description: 'Design concrete strength', formula: 'fcd = αcc × fck / γc', substitution: `fcd = ${alpha_cc} × ${fck} / ${gamma_c}`, result: `${fmt(fcd)} MPa` })
  steps.push({ clause: 'EC2 §3.2.7', description: 'Design steel strength', formula: 'fyd = fyk / γs', substitution: `fyd = ${fyk} / ${gamma_s}`, result: `${fmt(fyd)} MPa` })

  const MEd_Nmm = MEd * 1e6
  const K = MEd_Nmm / (b * d * d * fck)
  const Kbal = 0.167
  steps.push({ clause: 'EC2 §6.1', description: 'Flexural coefficient K', formula: 'K = MEd / (b × d² × fck)', substitution: `K = ${fmt(MEd_Nmm, 0)} / (${b} × ${d}² × ${fck})`, result: `${fmt(K, 4)}` })

  const z_raw = d * (0.5 + Math.sqrt(Math.max(0.25 - K / 1.134, 0)))
  const z = Math.min(z_raw, 0.95 * d)
  steps.push({ clause: 'EC2 §6.1', description: 'Lever arm z', formula: 'z = d × min(0.5 + √(0.25 - K/1.134), 0.95)', substitution: `z = ${d} × min(0.5 + √(0.25 - ${fmt(K, 4)}/1.134), 0.95)`, result: `${fmt(z)} mm` })

  const As_req = MEd_Nmm / (fyd * z)
  steps.push({ clause: 'EC2 §6.1', description: 'Required tension steel', formula: 'As,req = MEd / (fyd × z)', substitution: `As,req = ${fmt(MEd_Nmm, 0)} / (${fmt(fyd)} × ${fmt(z)})`, result: `${fmt(As_req)} mm²` })

  const As_min1 = 0.26 * (fctm / fyk) * b * d
  const As_min2 = 0.0013 * b * d
  const As_min = Math.max(As_min1, As_min2)
  steps.push({ clause: 'EC2 §9.2.1.1', description: 'Minimum reinforcement', formula: 'As,min = max(0.26×fctm/fyk×b×d, 0.0013×b×d)', substitution: `As,min = max(0.26×${fctm}/${fyk}×${b}×${d}, 0.0013×${b}×${d})`, result: `${fmt(As_min)} mm²` })

  const As_max = 0.04 * b * h
  steps.push({ clause: 'EC2 §9.2.1.1', description: 'Maximum reinforcement', formula: 'As,max = 0.04 × b × h', substitution: `As,max = 0.04 × ${b} × ${h}`, result: `${fmt(As_max)} mm²` })

  let As_prov = barCount * barArea(barDia)
  if (hasLayer2) As_prov += barCount2 * barArea(barDia2)
  steps.push({ clause: '', description: 'Provided tension steel', formula: 'As,prov = n × π×φ²/4', substitution: `${barCount}×π×${barDia}²/4${hasLayer2 ? ` + ${barCount2}×π×${barDia2}²/4` : ''}`, result: `${fmt(As_prov)} mm²` })

  const x = (As_prov * fyd) / (0.8 * b * fcd)
  const xd_ratio = x / d
  steps.push({ clause: 'EC2 §6.1', description: 'Neutral axis depth ratio', formula: 'x/d = (As×fyd)/(0.8×b×fcd×d)', substitution: `x/d = ${fmt(x)}/${d}`, result: `${fmt(xd_ratio, 3)}` })

  return {
    K, Kbal, z, As_req, As_min, As_max, As_prov, xd_ratio,
    pass_flexure: As_prov >= Math.max(As_req, As_min),
    pass_min: As_prov >= As_min,
    pass_max: As_prov <= As_max,
    pass_xd: xd_ratio <= 0.45,
    steps,
  }
}

function calcFlexureACI(
  b: number, h: number, d: number, fc: number, fy: number,
  Mu: number, barDia: number, barCount: number,
  barDia2: number, barCount2: number, hasLayer2: boolean,
  units: UnitSystem
): FlexureResult {
  const steps: StepItem[] = []
  const phi = 0.9
  const fc_MPa = fc
  const fy_MPa = fy

  let As_prov = barCount * barArea(barDia)
  if (hasLayer2) As_prov += barCount2 * barArea(barDia2)

  const beta1 = fc_MPa <= 28 ? 0.85 : Math.max(0.85 - 0.05 * (fc_MPa - 28) / 7, 0.65)
  steps.push({ clause: 'ACI 22.2.2.4.3', description: 'Whitney stress block factor', formula: 'β1 = 0.85 - 0.05×(f\'c-28)/7 ≥ 0.65', substitution: `β1 for f'c = ${fc_MPa} MPa`, result: `${fmt(beta1, 3)}` })

  const Ec = 4700 * Math.sqrt(fc_MPa)
  steps.push({ clause: 'ACI 19.2.2', description: 'Concrete elastic modulus', formula: 'Ec = 4700√(f\'c)', substitution: `Ec = 4700×√(${fc_MPa})`, result: `${fmt(Ec, 0)} MPa` })

  const Mu_Nmm = Mu * 1e6
  const a = (As_prov * fy_MPa) / (0.85 * fc_MPa * b)
  const c = a / beta1
  steps.push({ clause: 'ACI 22.2', description: 'Depth of stress block', formula: 'a = As×fy / (0.85×f\'c×b)', substitution: `a = ${fmt(As_prov)}×${fy_MPa} / (0.85×${fc_MPa}×${b})`, result: `${fmt(a)} mm` })
  steps.push({ clause: 'ACI 22.2', description: 'Neutral axis depth', formula: 'c = a / β1', substitution: `c = ${fmt(a)} / ${fmt(beta1, 3)}`, result: `${fmt(c)} mm` })

  const eps_t = ((d - c) / c) * 0.003
  steps.push({ clause: 'ACI 21.2.2', description: 'Net tensile strain', formula: 'εt = (d-c)/c × 0.003', substitution: `εt = (${d}-${fmt(c)})/${fmt(c)} × 0.003`, result: `${fmt(eps_t, 5)}` })

  const tension_controlled = eps_t >= 0.005
  const phi_actual = eps_t >= 0.005 ? 0.9 : (eps_t <= 0.002 ? 0.65 : 0.65 + (eps_t - 0.002) * (250 / 3))
  const phi_Mn = phi_actual * As_prov * fy_MPa * (d - a / 2) / 1e6
  steps.push({ clause: 'ACI 21.2.1', description: 'Design moment capacity', formula: 'φMn = φ×As×fy×(d-a/2)', substitution: `φMn = ${fmt(phi_actual, 3)}×${fmt(As_prov)}×${fy_MPa}×(${d}-${fmt(a)}/2)`, result: `${fmt(phi_Mn)} kN·m` })

  const As_min1 = (0.25 * Math.sqrt(fc_MPa) / fy_MPa) * b * d
  const As_min2 = (1.4 / fy_MPa) * b * d
  const As_min = Math.max(As_min1, As_min2)
  steps.push({ clause: 'ACI 9.6.1.2', description: 'Minimum reinforcement', formula: 'As,min = max(0.25√f\'c/fy×bw×d, 1.4/fy×bw×d)', substitution: `As,min = max(${fmt(As_min1)}, ${fmt(As_min2)})`, result: `${fmt(As_min)} mm²` })

  const As_req = Mu_Nmm / (phi * fy_MPa * (d - a / 2))
  steps.push({ clause: 'ACI §9.3', description: 'Required steel area', formula: 'As,req = Mu / (φ×fy×(d-a/2))', substitution: `As,req = ${fmt(Mu_Nmm, 0)} / (${phi}×${fy_MPa}×(${d}-${fmt(a)}/2))`, result: `${fmt(As_req)} mm²` })

  const As_max_rho = 0.85 * beta1 * (fc_MPa / fy_MPa) * (0.003 / (0.003 + 0.004))
  const As_max = As_max_rho * b * d

  return {
    K: 0, Kbal: 0, z: d - a / 2, As_req, As_min, As_max, As_prov,
    xd_ratio: c / d, a, c, eps_t, phi_Mn, tension_controlled,
    pass_flexure: phi_Mn >= Mu,
    pass_min: As_prov >= As_min,
    pass_max: As_prov <= As_max,
    pass_xd: tension_controlled === true,
    steps,
  }
}

function calcShearEC2(
  b: number, d: number, fck: number, fyk: number, VEd: number,
  As_prov: number, stirrupDia: number, stirrupLegs: number, stirrupSpacing: number
): ShearResult {
  const steps: StepItem[] = []
  const gamma_c = 1.5
  const k = Math.min(1 + Math.sqrt(200 / d), 2.0)
  const rho_l = Math.min(As_prov / (b * d), 0.02)
  const vmin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(fck)
  const CRd_c = 0.12
  const k1_shear = 0.15

  const VRd_c_1 = (CRd_c * k * Math.pow(100 * rho_l * fck, 1 / 3)) * b * d / 1000
  const VRd_c_2 = vmin * b * d / 1000
  const VRd_c = Math.max(VRd_c_1, VRd_c_2)
  steps.push({ clause: 'EC2 §6.2.2', description: 'Concrete shear resistance', formula: 'VRd,c = max(CRd,c×k×(100ρl×fck)^(1/3)×bw×d, vmin×bw×d)', substitution: `k=${fmt(k, 3)}, ρl=${fmt(rho_l, 5)}, vmin=${fmt(vmin, 3)}`, result: `${fmt(VRd_c)} kN` })

  const shear_reinf_required = VEd > VRd_c

  const fyd = fyk / 1.15
  const cot_theta = 2.5
  const Asw_s_req = shear_reinf_required ? (VEd * 1000) / (0.9 * d * fyd * cot_theta) : 0
  steps.push({ clause: 'EC2 §6.2.3', description: 'Required shear reinforcement', formula: 'Asw/s = VEd / (0.9×d×fyd×cotθ)', substitution: `Asw/s = ${VEd}×1000 / (0.9×${d}×${fmt(fyd)}×${cot_theta})`, result: `${fmt(Asw_s_req, 3)} mm²/mm` })

  const Asw_s_prov = (stirrupLegs * barArea(stirrupDia)) / stirrupSpacing
  steps.push({ clause: '', description: 'Provided shear reinforcement', formula: 'Asw/s = legs × π×φ²/4 / s', substitution: `Asw/s = ${stirrupLegs}×${fmt(barArea(stirrupDia))} / ${stirrupSpacing}`, result: `${fmt(Asw_s_prov, 3)} mm²/mm` })

  const v_fck = fck > 60 ? 0.6 * (1 - fck / 250) : 0.6
  const VRd_max = (v_fck * fck / gamma_c) * b * 0.9 * d * (cot_theta / (1 + cot_theta * cot_theta)) / 1000
  steps.push({ clause: 'EC2 §6.2.3', description: 'Maximum shear resistance', formula: 'VRd,max = νfck/γc × bw × 0.9d × cotθ/(1+cot²θ)', substitution: `VRd,max with ν=${fmt(v_fck, 3)}`, result: `${fmt(VRd_max)} kN` })

  const rho_w_min = 0.08 * Math.sqrt(fck) / fyk
  const Asw_s_min = rho_w_min * b
  steps.push({ clause: 'EC2 §9.2.2', description: 'Minimum shear reinforcement', formula: 'ρw,min = 0.08√fck/fyk', substitution: `ρw,min = 0.08×√${fck}/${fyk}`, result: `Asw/s,min = ${fmt(Asw_s_min, 3)} mm²/mm` })

  return {
    VRd_c, shear_reinf_required, Asw_s_req, Asw_s_prov, VRd_max,
    pass_shear: shear_reinf_required ? Asw_s_prov >= Asw_s_req : true,
    pass_max_shear: VEd <= VRd_max,
    pass_min_stirrups: Asw_s_prov >= Asw_s_min,
    steps,
  }
}

function calcShearACI(
  b: number, d: number, fc: number, fy: number, Vu: number,
  stirrupDia: number, stirrupLegs: number, stirrupSpacing: number
): ShearResult {
  const steps: StepItem[] = []
  const phi = 0.75
  const lambda = 1.0

  const Vc = 0.17 * lambda * Math.sqrt(fc) * b * d / 1000
  const phi_Vc = phi * Vc
  steps.push({ clause: 'ACI 22.5.5.1', description: 'Concrete shear capacity', formula: 'Vc = 0.17λ√f\'c × bw × d', substitution: `Vc = 0.17×${lambda}×√${fc}×${b}×${d}/1000`, result: `Vc = ${fmt(Vc)} kN, φVc = ${fmt(phi_Vc)} kN` })

  const shear_reinf_required = Vu > phi_Vc / 2
  const Vs_req = Vu > phi_Vc ? (Vu / phi - Vc) : 0
  steps.push({ clause: 'ACI 22.5', description: 'Required steel shear capacity', formula: 'Vs = Vu/φ - Vc', substitution: `Vs = ${fmt(Vu)}/${phi} - ${fmt(Vc)}`, result: `${fmt(Vs_req)} kN` })

  const Asw_s_req = Vs_req > 0 ? (Vs_req * 1000) / (fy * d) : 0
  const Asw_s_prov = (stirrupLegs * barArea(stirrupDia)) / stirrupSpacing
  steps.push({ clause: 'ACI 22.5.10', description: 'Stirrup requirement', formula: 'Av/s = Vs / (fy × d)', substitution: `Av/s = ${fmt(Vs_req)}×1000 / (${fy}×${d})`, result: `req=${fmt(Asw_s_req, 3)}, prov=${fmt(Asw_s_prov, 3)} mm²/mm` })

  const Asw_s_min = Math.max(0.062 * Math.sqrt(fc) * b / fy, 0.35 * b / fy)
  const Vs_max = 0.66 * Math.sqrt(fc) * b * d / 1000
  const VRd_max = phi * (Vc + Vs_max)

  return {
    VRd_c: phi_Vc, shear_reinf_required, Asw_s_req, Asw_s_prov, VRd_max,
    Vc, phi_Vc, Vs_req,
    pass_shear: Vu <= phi * (Vc + (Asw_s_prov * fy * d / 1000)),
    pass_max_shear: Vu <= VRd_max,
    pass_min_stirrups: !shear_reinf_required || Asw_s_prov >= Asw_s_min,
    steps,
  }
}

function calcCrackEC2(
  b: number, h: number, d: number, fck: number, fctm: number, fyk: number,
  Es: number, Ecm: number, M_service: number, As_prov: number,
  cover: number, barDia: number, stirrupDia: number, exposure: string
): CrackResult {
  const steps: StepItem[] = []
  const alpha_e = Es / Ecm
  const d_mm = d
  const rho_eff_h = Math.min(2.5 * (h - d_mm), (h - d_mm / 3 + d_mm) / 3, h / 2)
  const Ac_eff = b * rho_eff_h
  const rho_p_eff = Math.max(As_prov / Ac_eff, 0.001)

  const M_Nmm = M_service * 1e6
  const sigma_s = M_Nmm / (As_prov * 0.87 * d_mm)
  steps.push({ clause: 'EC2 §7.3.4', description: 'Steel stress under service load', formula: 'σs ≈ Ms / (As × 0.87d)', substitution: `σs = ${fmt(M_Nmm, 0)} / (${fmt(As_prov)} × 0.87 × ${d_mm})`, result: `${fmt(sigma_s)} MPa` })

  const k1 = 0.8
  const k2 = 0.5
  const k3 = 3.4
  const k4 = 0.425
  const sr_max = k3 * cover + k4 * k1 * k2 * barDia / rho_p_eff
  steps.push({ clause: 'EC2 Eq 7.11', description: 'Maximum crack spacing', formula: 'sr,max = 3.4c + 0.425×k1×k2×φ/ρp,eff', substitution: `sr,max = 3.4×${cover} + 0.425×${k1}×${k2}×${barDia}/${fmt(rho_p_eff, 4)}`, result: `${fmt(sr_max)} mm` })

  const kt = 0.4
  const eps_sm_ecm = Math.max(
    (sigma_s - kt * fctm / rho_p_eff * (1 + alpha_e * rho_p_eff)) / Es,
    0.6 * sigma_s / Es
  )
  steps.push({ clause: 'EC2 Eq 7.9', description: 'Strain difference', formula: '(εsm - εcm) = max([σs - kt×fct,eff/ρp,eff×(1+αe×ρp,eff)]/Es, 0.6σs/Es)', substitution: `σs=${fmt(sigma_s)}, kt=${kt}, ρp,eff=${fmt(rho_p_eff, 4)}`, result: `${fmt(eps_sm_ecm * 1000, 4)} × 10⁻³` })

  const wk = sr_max * eps_sm_ecm
  steps.push({ clause: 'EC2 Eq 7.8', description: 'Calculated crack width', formula: 'wk = sr,max × (εsm - εcm)', substitution: `wk = ${fmt(sr_max)} × ${fmt(eps_sm_ecm, 6)}`, result: `${fmt(wk, 3)} mm` })

  let wmax = 0.3
  if (exposure.startsWith('XD') || exposure.startsWith('XS')) wmax = 0.2
  steps.push({ clause: 'EC2 Table 7.1N', description: 'Limiting crack width', formula: 'wmax per exposure class', substitution: `Exposure: ${exposure}`, result: `${wmax} mm` })

  return { wk, wmax, sr_max, eps_diff: eps_sm_ecm, pass_crack: wk <= wmax, steps }
}

function calcCrackACI(
  d: number, fs: number, cc: number, barDia: number, barCount: number, b: number
): CrackResult {
  const steps: StepItem[] = []
  const s_prov = (b - 2 * cc - 2 * barDia / 2) / Math.max(barCount - 1, 1)
  const s_max = Math.min(380 * (280 / fs) - 2.5 * cc, 300 * (280 / fs))
  steps.push({ clause: 'ACI 24.3.2', description: 'Bar spacing check for crack control', formula: 's ≤ 380(280/fs) - 2.5cc', substitution: `s ≤ 380×(280/${fmt(fs)}) - 2.5×${cc}`, result: `s,max = ${fmt(s_max)} mm, s,prov = ${fmt(s_prov)} mm` })
  return { wk: 0, wmax: 0, sr_max: 0, eps_diff: 0, s_max, s_prov, pass_crack: s_prov <= s_max, steps }
}

function calcDeflectionEC2(
  b: number, d: number, fck: number, fyk: number, As_prov: number, As_req: number,
  span: number, support: SupportCondition
): DeflectionResult {
  const steps: StepItem[] = []
  const rho = As_prov / (b * d)
  const rho_0 = 1e-3 * Math.sqrt(fck)
  const KK = getKFactor(support)
  steps.push({ clause: 'EC2 §7.4.2', description: 'Reference reinforcement ratio', formula: 'ρ0 = 10⁻³√fck', substitution: `ρ0 = 10⁻³×√${fck}`, result: `${fmt(rho_0, 5)}` })

  let ld_ratio: number
  if (rho <= rho_0) {
    ld_ratio = KK * (11 + 1.5 * Math.sqrt(fck) * rho_0 / rho + 3.2 * Math.sqrt(fck) * Math.pow(rho_0 / rho - 1, 1.5))
  } else {
    ld_ratio = KK * (11 + 1.5 * Math.sqrt(fck) * rho_0 / (rho - 0) + (1 / 12) * Math.sqrt(fck) * Math.sqrt(rho_0 / rho))
  }
  const modification = As_prov / Math.max(As_req, 1)
  const allowable_ratio = ld_ratio * Math.min(modification, 1.5)
  steps.push({ clause: 'EC2 Table 7.4N', description: 'Basic span/depth ratio', formula: 'l/d = K × [11 + 1.5√fck×ρ0/ρ + ...]', substitution: `K=${KK}, ρ=${fmt(rho, 5)}, mod=${fmt(modification, 2)}`, result: `l/d allowable = ${fmt(allowable_ratio)}` })

  const actual_ratio = span / d
  steps.push({ clause: 'EC2 §7.4.2', description: 'Actual span/depth ratio', formula: 'l/d actual = L / d', substitution: `l/d = ${span} / ${d}`, result: `${fmt(actual_ratio)}` })

  return { allowable_ratio, actual_ratio, pass_deflection: actual_ratio <= allowable_ratio, steps }
}

function calcDeflectionACI(
  h: number, span: number, support: SupportCondition
): DeflectionResult {
  const steps: StepItem[] = []
  const h_min = getAciMinThickness(support, span)
  steps.push({ clause: 'ACI Table 9.3.1.1', description: 'Minimum beam depth', formula: 'hmin per support condition', substitution: `Support: ${support}, L=${span} mm`, result: `h,min = ${fmt(h_min)} mm` })

  return {
    allowable_ratio: 0, actual_ratio: 0,
    h_min, h_actual: h,
    pass_deflection: h >= h_min,
    steps,
  }
}

function getBarSchedule(As_req: number, code: DesignCode, units: UnitSystem): BarScheduleItem[] {
  const diameters = code === 'EC2' ? EC2_BAR_DIAMETERS : (units === 'SI' ? ACI_BAR_DIAMETERS_MM : ACI_BAR_DIAMETERS_IN)
  const labels = code === 'EC2' ? EC2_BAR_LABELS : ACI_BAR_LABELS
  const results: BarScheduleItem[] = []
  for (let i = 0; i < diameters.length; i++) {
    const area1 = barArea(diameters[i])
    const count = Math.ceil(As_req / area1)
    if (count >= 2 && count <= 10) {
      results.push({ label: `${count}${labels[i]}`, count, As_prov: count * area1, fits: true })
    }
  }
  return results.slice(0, 5)
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function RcBeamPage() {
  // State: code and units
  const [code, setCode] = useState<DesignCode>('EC2')
  const [units, setUnits] = useState<UnitSystem>('SI')
  const [tab, setTab] = useState<LimitState>('ULS')

  // Geometry
  const [b, setB] = useState(300)
  const [h, setH] = useState(600)
  const [span, setSpan] = useState(6000)
  const [support, setSupport] = useState<SupportCondition>('simply_supported')

  // EC2 material indices
  const [concreteIdx, setConcreteIdx] = useState(2) // C30/37
  const [steelIdx, setSteelIdx] = useState(0) // B500S
  const [exposureIdx, setExposureIdx] = useState(0) // XC1

  // ACI material indices
  const [aciConcreteIdx, setAciConcreteIdx] = useState(1)
  const [aciSteelIdx, setAciSteelIdx] = useState(0)
  const [aciCover, setAciCover] = useState(40)

  // Cover / Reinforcement
  const [stirrupDiaIdx, setStirrupDiaIdx] = useState(0) // 8mm
  const [stirrupLegs, setStirrupLegs] = useState(2)
  const [stirrupSpacing, setStirrupSpacing] = useState(200)
  const [barDiaIdx, setBarDiaIdx] = useState(3) // T20
  const [barCount, setBarCount] = useState(3)
  const [hasLayer2, setHasLayer2] = useState(false)
  const [barDia2Idx, setBarDia2Idx] = useState(2) // T16
  const [barCount2, setBarCount2] = useState(2)
  const [hasCompression, setHasCompression] = useState(false)
  const [compBarDiaIdx, setCompBarDiaIdx] = useState(1)
  const [compBarCount, setCompBarCount] = useState(2)

  // ACI bar indices
  const [aciBarDiaIdx, setAciBarDiaIdx] = useState(3) // #6
  const [aciBarCount, setAciBarCount] = useState(3)
  const [aciBarDia2Idx, setAciBarDia2Idx] = useState(2)
  const [aciBarCount2, setAciBarCount2] = useState(2)

  // Loading
  const [MEd, setMEd] = useState(250)
  const [VEd, setVEd] = useState(150)
  const [Mservice, setMservice] = useState(170)

  // Collapsible sections
  const [showSteps, setShowSteps] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ── Derived values ───────────────────────────────────────────────────────────
  const ec2Concrete = EC2_CONCRETE[concreteIdx]
  const ec2Steel = EC2_STEEL[steelIdx]
  const ec2Exposure = EC2_EXPOSURE[exposureIdx]
  const aciConcreteList = units === 'SI' ? ACI_CONCRETE_SI : ACI_CONCRETE_IMP
  const aciConcrete = aciConcreteList[Math.min(aciConcreteIdx, aciConcreteList.length - 1)]
  const aciSteel = ACI_STEEL[aciSteelIdx]

  // Cover calculation
  const cnom = code === 'EC2'
    ? ec2Exposure.cmin_dur + 10
    : aciCover

  // Effective depth
  const stirrupDia = code === 'EC2' ? EC2_STIRRUP_DIAMETERS[stirrupDiaIdx] : ACI_STIRRUP_DIAMETERS_MM[Math.min(stirrupDiaIdx, ACI_STIRRUP_DIAMETERS_MM.length - 1)]
  const tensionBarDia = code === 'EC2'
    ? EC2_BAR_DIAMETERS[barDiaIdx]
    : (units === 'SI' ? ACI_BAR_DIAMETERS_MM[aciBarDiaIdx] : ACI_BAR_DIAMETERS_MM[aciBarDiaIdx])
  const d_eff = h - cnom - stirrupDia - tensionBarDia / 2
  const d_prime = cnom + stirrupDia + (code === 'EC2' ? EC2_BAR_DIAMETERS[compBarDiaIdx] : ACI_BAR_DIAMETERS_MM[Math.min(compBarDiaIdx, ACI_BAR_DIAMETERS_MM.length - 1)]) / 2

  const currentBarCount = code === 'EC2' ? barCount : aciBarCount
  const currentBarDia = tensionBarDia
  const currentBarCount2 = code === 'EC2' ? barCount2 : aciBarCount2
  const currentBarDia2 = code === 'EC2' ? EC2_BAR_DIAMETERS[barDia2Idx] : ACI_BAR_DIAMETERS_MM[Math.min(aciBarDia2Idx, ACI_BAR_DIAMETERS_MM.length - 1)]

  // ── Calculations ─────────────────────────────────────────────────────────────
  const flexure = useMemo(() => {
    if (b <= 0 || h <= 0 || d_eff <= 0) return null
    if (code === 'EC2') {
      return calcFlexureEC2(b, h, d_eff, ec2Concrete.fck, ec2Concrete.fctm, ec2Steel.fyk, MEd, currentBarDia, currentBarCount, currentBarDia2, currentBarCount2, hasLayer2, EC2_BAR_DIAMETERS[compBarDiaIdx], compBarCount, hasCompression, d_prime)
    } else {
      return calcFlexureACI(b, h, d_eff, aciConcrete.fc, aciSteel.fy, MEd, currentBarDia, currentBarCount, currentBarDia2, currentBarCount2, hasLayer2, units)
    }
  }, [b, h, d_eff, code, units, concreteIdx, steelIdx, aciConcreteIdx, aciSteelIdx, MEd, barDiaIdx, barCount, aciBarDiaIdx, aciBarCount, barDia2Idx, barCount2, aciBarDia2Idx, aciBarCount2, hasLayer2, compBarDiaIdx, compBarCount, hasCompression, d_prime, ec2Concrete.fck, ec2Concrete.fctm, ec2Steel.fyk, aciConcrete.fc, aciSteel.fy, currentBarDia, currentBarCount, currentBarDia2, currentBarCount2])

  const shear = useMemo(() => {
    if (b <= 0 || d_eff <= 0 || !flexure) return null
    if (code === 'EC2') {
      return calcShearEC2(b, d_eff, ec2Concrete.fck, ec2Steel.fyk, VEd, flexure.As_prov, stirrupDia, stirrupLegs, stirrupSpacing)
    } else {
      return calcShearACI(b, d_eff, aciConcrete.fc, aciSteel.fy, VEd, stirrupDia, stirrupLegs, stirrupSpacing)
    }
  }, [b, d_eff, code, VEd, flexure, stirrupDia, stirrupLegs, stirrupSpacing, ec2Concrete.fck, ec2Steel.fyk, aciConcrete.fc, aciSteel.fy])

  const crack = useMemo(() => {
    if (!flexure || b <= 0 || d_eff <= 0) return null
    if (code === 'EC2') {
      return calcCrackEC2(b, h, d_eff, ec2Concrete.fck, ec2Concrete.fctm, ec2Steel.fyk, 200000, ec2Concrete.Ecm, Mservice, flexure.As_prov, cnom, currentBarDia, stirrupDia, ec2Exposure.label)
    } else {
      const fs = Mservice * 1e6 / (flexure.As_prov * 0.87 * d_eff)
      return calcCrackACI(d_eff, fs, aciCover, currentBarDia, currentBarCount, b)
    }
  }, [b, h, d_eff, code, Mservice, flexure, cnom, currentBarDia, stirrupDia, ec2Concrete, ec2Steel.fyk, ec2Exposure.label, aciCover, currentBarCount, aciConcrete])

  const deflection = useMemo(() => {
    if (!flexure || d_eff <= 0) return null
    if (code === 'EC2') {
      return calcDeflectionEC2(b, d_eff, ec2Concrete.fck, ec2Steel.fyk, flexure.As_prov, Math.max(flexure.As_req, flexure.As_min), span, support)
    } else {
      return calcDeflectionACI(h, span, support)
    }
  }, [b, d_eff, h, code, span, support, flexure, ec2Concrete.fck, ec2Steel.fyk])

  const barSchedule = useMemo(() => {
    if (!flexure) return []
    return getBarSchedule(Math.max(flexure.As_req, flexure.As_min), code, units)
  }, [flexure, code, units])

  // ── Unit labels ──────────────────────────────────────────────────────────────
  const dimUnit = units === 'SI' ? 'mm' : 'in'
  const forceUnit = 'kN'
  const momentUnit = 'kN·m'
  const areaUnit = 'mm²'

  // ── SVG Cross-Section ────────────────────────────────────────────────────────
  const renderCrossSection = useCallback(() => {
    const svgW = 280
    const svgH = 320
    const margin = 45
    const drawW = svgW - 2 * margin
    const drawH = svgH - 2 * margin
    const scaleX = drawW / Math.max(b, 1)
    const scaleY = drawH / Math.max(h, 1)
    const scale = Math.min(scaleX, scaleY)
    const rectW = b * scale
    const rectH = h * scale
    const offsetX = (svgW - rectW) / 2
    const offsetY = (svgH - rectH) / 2 - 10

    const coverPx = cnom * scale
    const stirPx = stirrupDia * scale
    const barR = Math.max(currentBarDia * scale / 2, 3)
    const dLine = d_eff * scale

    const bars: { cx: number; cy: number }[] = []
    const barY = offsetY + rectH - coverPx - stirPx - barR
    const startX = offsetX + coverPx + stirPx + barR
    const endX = offsetX + rectW - coverPx - stirPx - barR
    for (let i = 0; i < currentBarCount; i++) {
      const cx = currentBarCount === 1 ? (startX + endX) / 2 : startX + (endX - startX) * i / (currentBarCount - 1)
      bars.push({ cx, cy: barY })
    }

    const compBars: { cx: number; cy: number }[] = []
    if (hasCompression) {
      const compBarR = Math.max((code === 'EC2' ? EC2_BAR_DIAMETERS[compBarDiaIdx] : ACI_BAR_DIAMETERS_MM[0]) * scale / 2, 2.5)
      const compY = offsetY + coverPx + stirPx + compBarR
      for (let i = 0; i < compBarCount; i++) {
        const cx = compBarCount === 1 ? (startX + endX) / 2 : startX + (endX - startX) * i / (compBarCount - 1)
        compBars.push({ cx, cy: compY })
      }
    }

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH + 30}`} style={{ width: '100%', maxWidth: '280px', height: 'auto' }}>
        {/* Beam outline */}
        <rect x={offsetX} y={offsetY} width={rectW} height={rectH} fill="none" stroke="#444" strokeWidth="2" />
        {/* Stirrup */}
        <rect x={offsetX + coverPx} y={offsetY + coverPx} width={rectW - 2 * coverPx} height={rectH - 2 * coverPx} fill="none" stroke="#666" strokeWidth="1.5" strokeDasharray="6,3" />
        {/* d line */}
        <line x1={offsetX} y1={offsetY + dLine} x2={offsetX + rectW} y2={offsetY + dLine} stroke="#cc0000" strokeWidth="1" strokeDasharray="4,2" opacity="0.5" />
        {/* Tension bars */}
        {bars.map((bar, i) => <circle key={`t${i}`} cx={bar.cx} cy={bar.cy} r={barR} fill="#cc0000" />)}
        {/* Compression bars */}
        {compBars.map((bar, i) => <circle key={`c${i}`} cx={bar.cx} cy={bar.cy} r={Math.max(barR * 0.7, 2)} fill="#666" />)}
        {/* Dimension: b */}
        <line x1={offsetX} y1={offsetY + rectH + 18} x2={offsetX + rectW} y2={offsetY + rectH + 18} stroke="#888" strokeWidth="0.8" />
        <line x1={offsetX} y1={offsetY + rectH + 14} x2={offsetX} y2={offsetY + rectH + 22} stroke="#888" strokeWidth="0.8" />
        <line x1={offsetX + rectW} y1={offsetY + rectH + 14} x2={offsetX + rectW} y2={offsetY + rectH + 22} stroke="#888" strokeWidth="0.8" />
        <text x={offsetX + rectW / 2} y={offsetY + rectH + 30} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">b={b}</text>
        {/* Dimension: h */}
        <line x1={offsetX + rectW + 14} y1={offsetY} x2={offsetX + rectW + 14} y2={offsetY + rectH} stroke="#888" strokeWidth="0.8" />
        <line x1={offsetX + rectW + 10} y1={offsetY} x2={offsetX + rectW + 18} y2={offsetY} stroke="#888" strokeWidth="0.8" />
        <line x1={offsetX + rectW + 10} y1={offsetY + rectH} x2={offsetX + rectW + 18} y2={offsetY + rectH} stroke="#888" strokeWidth="0.8" />
        <text x={offsetX + rectW + 28} y={offsetY + rectH / 2 + 4} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace" transform={`rotate(90, ${offsetX + rectW + 28}, ${offsetY + rectH / 2})`}>h={h}</text>
        {/* Dimension: d */}
        <line x1={offsetX - 14} y1={offsetY} x2={offsetX - 14} y2={offsetY + dLine} stroke="#cc0000" strokeWidth="0.8" opacity="0.6" />
        <line x1={offsetX - 18} y1={offsetY} x2={offsetX - 10} y2={offsetY} stroke="#cc0000" strokeWidth="0.8" opacity="0.6" />
        <line x1={offsetX - 18} y1={offsetY + dLine} x2={offsetX - 10} y2={offsetY + dLine} stroke="#cc0000" strokeWidth="0.8" opacity="0.6" />
        <text x={offsetX - 20} y={offsetY + dLine / 2 + 4} textAnchor="end" fill="#cc0000" fontSize="9" fontFamily="monospace">d={fmt(d_eff, 0)}</text>
        {/* Cover label */}
        <text x={offsetX + 4} y={offsetY + rectH - 4} fill="#555" fontSize="8" fontFamily="monospace">c={cnom}</text>
        {/* Bar label */}
        <text x={offsetX + rectW / 2} y={barY + barR + 12} textAnchor="middle" fill="#cc0000" fontSize="9" fontFamily="monospace">
          {currentBarCount}{code === 'EC2' ? EC2_BAR_LABELS[barDiaIdx] : ACI_BAR_LABELS[aciBarDiaIdx]}
        </text>
      </svg>
    )
  }, [b, h, d_eff, cnom, stirrupDia, currentBarDia, currentBarCount, hasCompression, compBarCount, compBarDiaIdx, code, barDiaIdx, aciBarDiaIdx])

  // ── Render helpers ───────────────────────────────────────────────────────────
  const renderCheckRow = (label: string, requirement: string, actual: string, pass: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a', gap: '8px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 140px', fontSize: '13px', color: '#999' }}>{label}</div>
      <div style={{ flex: '1 1 120px', fontSize: '12px', color: '#666', fontFamily: "'Space Grotesk', monospace" }}>{requirement}</div>
      <div style={{ flex: '1 1 120px', fontSize: '13px', fontWeight: 600, color: '#f0f0f0', fontFamily: "'Space Grotesk', monospace" }}>{actual}</div>
      <div style={{ width: '60px', textAlign: 'right' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px', background: pass ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: pass ? '#22c55e' : '#ef4444' }}>
          {pass ? 'PASS' : 'FAIL'}
        </span>
      </div>
    </div>
  )

  const renderSteps = (steps: StepItem[]) => (
    <div style={{ marginTop: '8px' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ padding: '10px 12px', borderLeft: '2px solid #222', marginBottom: '8px', background: '#0d0d0d', borderRadius: '0 4px 4px 0' }}>
          {s.clause && <span style={{ fontSize: '10px', fontWeight: 700, color: '#cc0000', background: 'rgba(204,0,0,0.1)', padding: '2px 6px', borderRadius: '3px', marginRight: '8px' }}>[{s.clause}]</span>}
          <span style={{ fontSize: '12px', color: '#888' }}>{s.description}</span>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontFamily: "'Space Grotesk', monospace" }}>{s.formula}</div>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px', fontFamily: "'Space Grotesk', monospace" }}>{s.substitution}</div>
          <div style={{ fontSize: '13px', color: '#f0f0f0', fontWeight: 600, marginTop: '2px', fontFamily: "'Space Grotesk', monospace" }}>{s.result}</div>
        </div>
      ))}
    </div>
  )

  // ── Input builder ────────────────────────────────────────────────────────────
  const inputField = (label: string, value: number, onChange: (v: number) => void, unit?: string) => (
    <div>
      <label className="rc-label">{label}{unit ? ` (${unit})` : ''}</label>
      <input className="rc-input" type="number" value={value} onChange={e => onChange(+e.target.value)} />
    </div>
  )

  const selectField = (label: string, options: string[], value: number, onChange: (v: number) => void) => (
    <div>
      <label className="rc-label">{label}</label>
      <select className="rc-input" value={value} onChange={e => onChange(+e.target.value)} style={{ cursor: 'pointer' }}>
        {options.map((o, i) => <option key={i} value={i} style={{ background: '#111' }}>{o}</option>)}
      </select>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rc-input { background: #111; border: 1px solid #222; color: #f0f0f0; padding: 8px 12px; border-radius: 4px; font-size: 13px; width: 100%; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; -moz-appearance: textfield; }
        .rc-input:focus { border-color: #cc0000; }
        .rc-input::-webkit-inner-spin-button, .rc-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .rc-label { display: block; font-size: 11px; color: #888; margin-bottom: 4px; font-weight: 500; letter-spacing: 0.03em; text-transform: uppercase; }
        .toggle-btn { padding: 8px 20px; border: 1px solid #222; background: transparent; color: #888; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .toggle-btn.active { background: #cc0000; border-color: #cc0000; color: #fff; }
        .toggle-btn:first-child { border-radius: 4px 0 0 4px; }
        .toggle-btn:last-child { border-radius: 0 4px 4px 0; }
        .tab-btn { padding: 10px 20px; border: none; background: transparent; color: #666; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; border-bottom: 2px solid transparent; }
        .tab-btn.active { color: #cc0000; border-bottom-color: #cc0000; }
        .tab-btn:hover { color: #f0f0f0; }
        .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #555; text-transform: uppercase; margin: 20px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #1a1a1a; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .info-chip { display: inline-block; font-size: 11px; color: #666; background: #111; border: 1px solid #1a1a1a; padding: 3px 8px; border-radius: 3px; margin: 2px; font-family: 'Space Grotesk', monospace; }
        .collapsible-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 12px 0; user-select: none; }
        .collapsible-header:hover { color: #cc0000; }
        .nav-link { color: #666; text-decoration: none; transition: color 0.2s; }
        .nav-link:hover { color: #f0f0f0; }
        select.rc-input option { background: #111; color: #f0f0f0; }
        @media print { .no-print { display: none !important; } }
        @media (max-width: 900px) { .calc-panels { grid-template-columns: 1fr !important; } .grid-3 { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 600px) { .grid-2 { grid-template-columns: 1fr; } .grid-3 { grid-template-columns: 1fr; } }
      `}</style>

      <Navbar activePage="calculators" />

      <ProGate>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '10px' }}>Pro Calculator</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '10px' }}>
            RC Beam Design
          </h1>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.6 }}>
            Reinforced concrete beam design per {code === 'EC2' ? 'EN 1992-1-1 (Eurocode 2)' : 'ACI 318-19'}. Flexure, shear, crack width, and deflection checks.
          </p>
        </div>

        {/* Code & Unit Toggles */}
        <div className="no-print" style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <button className={`toggle-btn${code === 'EC2' ? ' active' : ''}`} onClick={() => setCode('EC2')}>EC2</button>
            <button className={`toggle-btn${code === 'ACI' ? ' active' : ''}`} onClick={() => setCode('ACI')}>ACI 318</button>
          </div>
          <div>
            <button className={`toggle-btn${units === 'SI' ? ' active' : ''}`} onClick={() => setUnits('SI')}>SI (mm, kN, MPa)</button>
            <button className={`toggle-btn${units === 'Imperial' ? ' active' : ''}`} onClick={() => setUnits('Imperial')}>Imperial</button>
          </div>
        </div>

        {/* Limit State Tabs */}
        <div className="no-print" style={{ borderBottom: '1px solid #1a1a1a', marginBottom: '24px', display: 'flex', gap: '0', overflowX: 'auto' }}>
          <button className={`tab-btn${tab === 'ULS' ? ' active' : ''}`} onClick={() => setTab('ULS')}>ULS (Flexure + Shear)</button>
          <button className={`tab-btn${tab === 'SLS_CRACK' ? ' active' : ''}`} onClick={() => setTab('SLS_CRACK')}>SLS (Crack Width)</button>
          <button className={`tab-btn${tab === 'SLS_DEFLECTION' ? ' active' : ''}`} onClick={() => setTab('SLS_DEFLECTION')}>SLS (Deflection)</button>
        </div>

        {/* Two-column layout */}
        <div className="calc-panels" style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px', alignItems: 'start' }}>

          {/* ══════════════════════ LEFT: INPUTS ══════════════════════ */}
          <div className="no-print" style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '24px' }}>

            {/* GEOMETRY */}
            <div className="section-title">Geometry</div>
            <div className="grid-3" style={{ marginBottom: '12px' }}>
              {inputField('Width b', b, setB, dimUnit)}
              {inputField('Height h', h, setH, dimUnit)}
              {inputField('Span L', span, setSpan, dimUnit)}
            </div>
            <div style={{ marginBottom: '16px' }}>
              {selectField('Support Condition', ['Simply Supported', 'End Span', 'Interior Span', 'Cantilever'], ['simply_supported', 'end_span', 'interior_span', 'cantilever'].indexOf(support), (v) => setSupport((['simply_supported', 'end_span', 'interior_span', 'cantilever'] as SupportCondition[])[v]))}
            </div>

            {/* MATERIALS */}
            <div className="section-title">Materials{code === 'EC2' ? ' (EC2)' : ' (ACI)'}</div>
            {code === 'EC2' ? (
              <>
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                  {selectField('Concrete Class', EC2_CONCRETE.map(c => c.label), concreteIdx, setConcreteIdx)}
                  {selectField('Steel Class', EC2_STEEL.map(s => s.label), steelIdx, setSteelIdx)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                  <span className="info-chip">fck={ec2Concrete.fck}</span>
                  <span className="info-chip">fcd={fmt(0.85 * ec2Concrete.fck / 1.5)}</span>
                  <span className="info-chip">fctm={ec2Concrete.fctm}</span>
                  <span className="info-chip">Ecm={ec2Concrete.Ecm}</span>
                  <span className="info-chip">fyk={ec2Steel.fyk}</span>
                  <span className="info-chip">fyd={fmt(ec2Steel.fyk / 1.15)}</span>
                  <span className="info-chip">{'γ'}c=1.5</span>
                  <span className="info-chip">{'γ'}s=1.15</span>
                </div>
              </>
            ) : (
              <>
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                  {selectField("f'c", aciConcreteList.map(c => c.label), Math.min(aciConcreteIdx, aciConcreteList.length - 1), setAciConcreteIdx)}
                  {selectField('Steel Grade', ACI_STEEL.map(s => s.label), aciSteelIdx, setAciSteelIdx)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                  <span className="info-chip">f&apos;c={aciConcrete.fc} MPa</span>
                  <span className="info-chip">{'β'}1={fmt(aciConcrete.fc <= 28 ? 0.85 : Math.max(0.85 - 0.05 * (aciConcrete.fc - 28) / 7, 0.65), 3)}</span>
                  <span className="info-chip">Ec={fmt(4700 * Math.sqrt(aciConcrete.fc), 0)} MPa</span>
                  <span className="info-chip">fy={aciSteel.fy} MPa</span>
                  <span className="info-chip">{'φ'}flex=0.90</span>
                  <span className="info-chip">{'φ'}shear=0.75</span>
                </div>
              </>
            )}

            {/* COVER & REINFORCEMENT */}
            <div className="section-title">Cover &amp; Reinforcement</div>
            {code === 'EC2' ? (
              <>
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                  {selectField('Exposure Class', EC2_EXPOSURE.map(e => `${e.label} (cmin,dur=${e.cmin_dur})`), exposureIdx, setExposureIdx)}
                  <div>
                    <label className="rc-label">cnom (mm)</label>
                    <div className="rc-input" style={{ background: '#0d0d0d', cursor: 'default' }}>{cnom} <span style={{ fontSize: '10px', color: '#555' }}>= {ec2Exposure.cmin_dur} + 10</span></div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: '12px' }}>
                {inputField('Clear Cover', aciCover, setAciCover, 'mm')}
              </div>
            )}

            <div className="grid-3" style={{ marginBottom: '12px' }}>
              {selectField('Stirrup φ', code === 'EC2' ? EC2_STIRRUP_DIAMETERS.map(d => `φ${d}`) : ACI_STIRRUP_LABELS, stirrupDiaIdx, setStirrupDiaIdx)}
              {inputField('Legs', stirrupLegs, setStirrupLegs)}
              {inputField('Spacing s', stirrupSpacing, setStirrupSpacing, dimUnit)}
            </div>

            <div className="grid-2" style={{ marginBottom: '8px' }}>
              {code === 'EC2'
                ? selectField('Bar φ', EC2_BAR_LABELS, barDiaIdx, setBarDiaIdx)
                : selectField('Bar size', ACI_BAR_LABELS, aciBarDiaIdx, setAciBarDiaIdx)
              }
              {code === 'EC2'
                ? inputField('Count', barCount, setBarCount)
                : inputField('Count', aciBarCount, setAciBarCount)
              }
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" checked={hasLayer2} onChange={e => setHasLayer2(e.target.checked)} style={{ accentColor: '#cc0000' }} />
                Layer 2 tension bars
              </label>
            </div>
            {hasLayer2 && (
              <div className="grid-2" style={{ marginBottom: '8px' }}>
                {code === 'EC2'
                  ? selectField('Layer 2 φ', EC2_BAR_LABELS, barDia2Idx, setBarDia2Idx)
                  : selectField('Layer 2 size', ACI_BAR_LABELS, aciBarDia2Idx, setAciBarDia2Idx)
                }
                {code === 'EC2'
                  ? inputField('Count', barCount2, setBarCount2)
                  : inputField('Count', aciBarCount2, setAciBarCount2)
                }
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" checked={hasCompression} onChange={e => setHasCompression(e.target.checked)} style={{ accentColor: '#cc0000' }} />
                Compression reinforcement
              </label>
            </div>
            {hasCompression && (
              <div className="grid-2" style={{ marginBottom: '16px' }}>
                {code === 'EC2'
                  ? selectField('Comp φ', EC2_BAR_LABELS, compBarDiaIdx, setCompBarDiaIdx)
                  : selectField('Comp size', ACI_BAR_LABELS, compBarDiaIdx, (v) => setCompBarDiaIdx(v))
                }
                {inputField('Comp count', compBarCount, setCompBarCount)}
              </div>
            )}

            {/* Effective depth display */}
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effective Depth d</span>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#f0f0f0', marginTop: '2px' }}>
                {fmt(d_eff, 1)} {dimUnit}
                <span style={{ fontSize: '10px', color: '#555', marginLeft: '8px' }}>= {h} - {cnom} - {stirrupDia} - {currentBarDia}/2</span>
              </div>
            </div>

            {/* LOADING */}
            <div className="section-title">Loading</div>
            {tab === 'ULS' && (
              <div className="grid-2">
                {inputField(code === 'EC2' ? 'MEd' : 'Mu', MEd, setMEd, momentUnit)}
                {inputField(code === 'EC2' ? 'VEd' : 'Vu', VEd, setVEd, forceUnit)}
              </div>
            )}
            {tab === 'SLS_CRACK' && (
              <div>
                {inputField('Service Moment Ms', Mservice, setMservice, momentUnit)}
              </div>
            )}
            {tab === 'SLS_DEFLECTION' && (
              <div style={{ fontSize: '13px', color: '#666', padding: '12px 0' }}>
                Uses geometry and support condition above. {code === 'EC2' ? 'Span/depth ratio check per EC2 Table 7.4N.' : 'Minimum depth check per ACI Table 9.3.1.1.'}
              </div>
            )}

            {/* Cross-section SVG */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              {renderCrossSection()}
            </div>
          </div>

          {/* ══════════════════════ RIGHT: RESULTS ══════════════════════ */}
          <div>
            {/* ── ULS TAB ── */}
            {tab === 'ULS' && (
              <>
                {/* Flexure Results */}
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Flexure Check {code === 'EC2' ? '[EC2 §6.1]' : '[ACI §9.3]'}
                  </h3>
                  {flexure ? (
                    <>
                      {renderCheckRow('Required As', `≥ ${fmt(Math.max(flexure.As_req, flexure.As_min))} ${areaUnit}`, `${fmt(flexure.As_prov)} ${areaUnit}`, flexure.pass_flexure)}
                      {renderCheckRow('Minimum As', `≥ ${fmt(flexure.As_min)} ${areaUnit}`, `${fmt(flexure.As_prov)} ${areaUnit}`, flexure.pass_min)}
                      {renderCheckRow('Maximum As', `≤ ${fmt(flexure.As_max)} ${areaUnit}`, `${fmt(flexure.As_prov)} ${areaUnit}`, flexure.pass_max)}
                      {code === 'EC2'
                        ? renderCheckRow('x/d ratio', '≤ 0.450', fmt(flexure.xd_ratio, 3), flexure.pass_xd)
                        : renderCheckRow('Tension controlled', 'εt ≥ 0.005', fmt(flexure.eps_t || 0, 5), flexure.pass_xd)
                      }
                      {code === 'ACI' && flexure.phi_Mn !== undefined && (
                        renderCheckRow('Capacity', `φMn ≥ ${MEd} ${momentUnit}`, `${fmt(flexure.phi_Mn)} ${momentUnit}`, flexure.pass_flexure)
                      )}
                    </>
                  ) : (
                    <div style={{ color: '#444', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>Enter valid geometry to see results.</div>
                  )}
                </div>

                {/* Shear Results */}
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Shear Check {code === 'EC2' ? '[EC2 §6.2]' : '[ACI §22.5]'}
                  </h3>
                  {shear ? (
                    <>
                      {code === 'EC2' ? (
                        <>
                          {renderCheckRow('VRd,c (concrete)', `${fmt(shear.VRd_c)} kN`, `VEd = ${VEd} kN`, VEd <= shear.VRd_c)}
                          {shear.shear_reinf_required && renderCheckRow('Stirrup Asw/s', `≥ ${fmt(shear.Asw_s_req, 3)} mm²/mm`, `${fmt(shear.Asw_s_prov, 3)} mm²/mm`, shear.pass_shear)}
                          {renderCheckRow('VRd,max', `≥ ${VEd} kN`, `${fmt(shear.VRd_max)} kN`, shear.pass_max_shear)}
                          {renderCheckRow('Min stirrups', 'Provided ≥ min', shear.pass_min_stirrups ? 'OK' : 'Insufficient', shear.pass_min_stirrups)}
                        </>
                      ) : (
                        <>
                          {renderCheckRow('φVc', `${fmt(shear.phi_Vc || 0)} kN`, `Vu = ${VEd} kN`, VEd <= (shear.phi_Vc || 0))}
                          {shear.shear_reinf_required && renderCheckRow('Stirrup capacity', `Vu ≤ φ(Vc+Vs)`, shear.pass_shear ? 'OK' : 'Insufficient', shear.pass_shear)}
                          {renderCheckRow('Max shear', `Vu ≤ ${fmt(shear.VRd_max)} kN`, `${VEd} kN`, shear.pass_max_shear)}
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ color: '#444', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>Enter valid geometry to see results.</div>
                  )}
                </div>

                {/* Results summary */}
                {flexure && shear && (
                  <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>Summary</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ background: '#0d0d0d', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>As,req</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#cc0000' }}>{fmt(Math.max(flexure.As_req, flexure.As_min))}</div>
                        <div style={{ fontSize: '11px', color: '#555' }}>{areaUnit}</div>
                      </div>
                      <div style={{ background: '#0d0d0d', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>As,prov</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: flexure.pass_flexure ? '#22c55e' : '#ef4444' }}>{fmt(flexure.As_prov)}</div>
                        <div style={{ fontSize: '11px', color: '#555' }}>{areaUnit}</div>
                      </div>
                    </div>
                    {/* Utilization bar */}
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#666' }}>Utilization</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#f0f0f0', fontFamily: "'Space Grotesk', monospace" }}>
                          {fmt(Math.min(Math.max(flexure.As_req, flexure.As_min) / Math.max(flexure.As_prov, 1) * 100, 999))}%
                        </span>
                      </div>
                      <div style={{ background: '#1a1a1a', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(Math.max(flexure.As_req, flexure.As_min) / Math.max(flexure.As_prov, 1) * 100, 100)}%`,
                          height: '100%',
                          background: flexure.pass_flexure ? '#22c55e' : '#ef4444',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bar Schedule */}
                {barSchedule.length > 0 && (
                  <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', marginBottom: '12px', fontFamily: "'Space Grotesk', sans-serif" }}>Bar Schedule Suggestions</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {barSchedule.map((bs, i) => (
                        <div key={i} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '10px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#f0f0f0' }}>{bs.label}</div>
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{fmt(bs.As_prov)} {areaUnit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── SLS CRACK TAB ── */}
            {tab === 'SLS_CRACK' && (
              <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Crack Width Check {code === 'EC2' ? '[EC2 §7.3.4]' : '[ACI §24.3]'}
                </h3>
                {crack ? (
                  <>
                    {code === 'EC2' ? (
                      <>
                        {renderCheckRow('Crack width wk', `≤ ${crack.wmax} mm`, `${fmt(crack.wk, 3)} mm`, crack.pass_crack)}
                        {renderCheckRow('Max crack spacing sr,max', '', `${fmt(crack.sr_max)} mm`, true)}
                      </>
                    ) : (
                      renderCheckRow('Bar spacing', `≤ ${fmt(crack.s_max || 0)} mm`, `${fmt(crack.s_prov || 0)} mm`, crack.pass_crack)
                    )}
                  </>
                ) : (
                  <div style={{ color: '#444', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>Enter valid inputs to see results.</div>
                )}
              </div>
            )}

            {/* ── SLS DEFLECTION TAB ── */}
            {tab === 'SLS_DEFLECTION' && (
              <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Deflection Check {code === 'EC2' ? '[EC2 §7.4]' : '[ACI §24.2]'}
                </h3>
                {deflection ? (
                  <>
                    {code === 'EC2' ? (
                      <>
                        {renderCheckRow('Span/depth ratio', `≤ ${fmt(deflection.allowable_ratio)}`, fmt(deflection.actual_ratio), deflection.pass_deflection)}
                      </>
                    ) : (
                      renderCheckRow('Beam depth h', `≥ ${fmt(deflection.h_min || 0)} mm`, `${h} mm`, deflection.pass_deflection)
                    )}
                  </>
                ) : (
                  <div style={{ color: '#444', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>Enter valid inputs to see results.</div>
                )}
              </div>
            )}

            {/* ── Step-by-step Calculations (all tabs) ── */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
              <div className="collapsible-header no-print" onClick={() => setShowSteps(!showSteps)}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>Step-by-Step Calculations</h3>
                <span style={{ color: '#666', fontSize: '18px', transform: showSteps ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>{'▼'}</span>
              </div>
              {showSteps && (
                <>
                  {tab === 'ULS' && flexure && (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#cc0000', marginTop: '8px', marginBottom: '4px' }}>FLEXURE</div>
                      {renderSteps(flexure.steps)}
                      {shear && (
                        <>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#cc0000', marginTop: '16px', marginBottom: '4px' }}>SHEAR</div>
                          {renderSteps(shear.steps)}
                        </>
                      )}
                    </>
                  )}
                  {tab === 'SLS_CRACK' && crack && renderSteps(crack.steps)}
                  {tab === 'SLS_DEFLECTION' && deflection && renderSteps(deflection.steps)}
                </>
              )}
            </div>

            {/* ── Export ── */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button onClick={() => window.print()} style={{ background: '#cc0000', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                Export / Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '44px 48px', marginTop: '48px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '20px' }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              ENGI<span style={{ color: '#cc0000' }}>NUS</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' as const }}>
              <a href="/calculators" className="nav-link" style={{ fontSize: '13px' }}>Calculators</a>
              <a href="/pro" className="nav-link" style={{ fontSize: '13px' }}>Pro Tools</a>
              <a href="/about" className="nav-link" style={{ fontSize: '13px' }}>About</a>
              <a href="/privacy" className="nav-link" style={{ fontSize: '13px' }}>Privacy Policy</a>
              <a href="/terms" className="nav-link" style={{ fontSize: '13px' }}>Terms of Service</a>
              <a href="/disclaimer" className="nav-link" style={{ fontSize: '13px' }}>Disclaimer</a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#444' }}>&copy; 2026 Enginus. All rights reserved.</div>
            <div style={{ fontSize: '12px', color: '#444', fontStyle: 'italic' }}>Results are for educational purposes. Always verify with a licensed engineer.</div>
          </div>
        </div>
      </footer>
      </ProGate>
    </main>
  )
}
