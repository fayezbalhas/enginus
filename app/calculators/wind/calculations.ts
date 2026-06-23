import {
  type StepItem, type WindResult, type ZonePressureResult, type HeightZone,
  type EC1Enclosure, type ASCE7Enclosure,
  type EC1TerrainCategory, type ASCE7Exposure,
  EC1_CPE_WINDWARD, getEC1CpeLeeward, getEC1Cpi,
  ASCE7_CP_WINDWARD, getASCE7CpLeeward, getASCE7GCpi,
  fmt,
} from './types'

// ── Height zone builder ─────────────────────────────────────────────────────

function buildZones(h: number, b: number, nZones: number): HeightZone[] {
  const zones: HeightZone[] = []
  const dz = h / nZones
  for (let i = 0; i < nZones; i++) {
    const zBot = i * dz
    const zTop = (i + 1) * dz
    const zMid = (zBot + zTop) / 2
    zones.push({ zBot, zTop, zMid, height: dz, area: dz * b })
  }
  return zones
}

// ══════════════════════════════════════════════════════════════════════════════
// EC1 EN 1991-1-4 Calculations
// ══════════════════════════════════════════════════════════════════════════════

export function calcWindEC1(
  h: number, b: number, d: number, nZones: number,
  vb0: number, cdir: number, cseason: number,
  terrain: EC1TerrainCategory,
  c0: number, cscd: number, rho: number,
  cpi: number,
  enclosure: EC1Enclosure,
): WindResult {
  const steps: StepItem[] = []
  const { z0, zmin, kr } = terrain

  // ── Basic wind velocity ────────────────────────────────────────────────────
  const vb = cdir * cseason * vb0
  steps.push({
    clause: 'EN 1991-1-4 §4.2(2)',
    description: 'Basic wind velocity',
    formula: 'vb = cdir x cseason x vb,0',
    substitution: `vb = ${fmt(cdir)} x ${fmt(cseason)} x ${fmt(vb0, 1)}`,
    result: `vb = ${fmt(vb, 2)} m/s`,
  })

  // ── Build height zones ─────────────────────────────────────────────────────
  const zones = buildZones(h, b, nZones)
  const zoneResults: ZonePressureResult[] = []

  // ── Compute cr, vm, Iv, qp at roof height for reference ────────────────────
  const zRef = Math.max(h, zmin)
  const cr_h = kr * Math.log(zRef / z0)
  const vm_h = cr_h * c0 * vb
  const Iv_h = 1.0 / (c0 * Math.log(zRef / z0))
  const qp_h = (1 + 7 * Iv_h) * 0.5 * rho * vm_h * vm_h

  steps.push({
    clause: 'EN 1991-1-4 §4.3.2',
    description: 'Roughness factor at height h',
    formula: 'cr(z) = kr x ln(z/z0)',
    substitution: `cr(${fmt(h, 1)}) = ${fmt(kr, 3)} x ln(${fmt(zRef, 1)}/${fmt(z0, 3)})`,
    result: `cr = ${fmt(cr_h, 4)}`,
  })

  steps.push({
    clause: 'EN 1991-1-4 §4.3.1',
    description: 'Mean wind velocity at height h',
    formula: 'vm(z) = cr(z) x c0 x vb',
    substitution: `vm = ${fmt(cr_h, 4)} x ${fmt(c0)} x ${fmt(vb, 2)}`,
    result: `vm(h) = ${fmt(vm_h, 2)} m/s`,
  })

  steps.push({
    clause: 'EN 1991-1-4 §4.4(1)',
    description: 'Turbulence intensity at height h',
    formula: 'Iv(z) = kI / (c0 x ln(z/z0))',
    substitution: `Iv = 1.0 / (${fmt(c0)} x ln(${fmt(zRef, 1)}/${fmt(z0, 3)}))`,
    result: `Iv(h) = ${fmt(Iv_h, 4)}`,
  })

  steps.push({
    clause: 'EN 1991-1-4 §4.5(1)',
    description: 'Peak velocity pressure at height h',
    formula: 'qp(z) = [1 + 7 x Iv(z)] x 0.5 x rho x vm(z)^2',
    substitution: `qp = [1 + 7 x ${fmt(Iv_h, 4)}] x 0.5 x ${fmt(rho, 2)} x ${fmt(vm_h, 2)}^2`,
    result: `qp(h) = ${fmt(qp_h, 2)} Pa = ${fmt(qp_h / 1000, 3)} kN/m^2`,
  })

  // ── Pressure coefficients ──────────────────────────────────────────────────
  const hd = h / Math.max(d, 0.01)
  const cpe_windward = EC1_CPE_WINDWARD
  const cpe_leeward = getEC1CpeLeeward(hd)
  const cpi_val = cpi

  steps.push({
    clause: 'EN 1991-1-4 Table 7.1',
    description: 'External pressure coefficient (windward, zone D)',
    formula: 'cpe,10 = +0.8',
    substitution: '',
    result: `cpe,windward = ${fmt(cpe_windward, 2)}`,
  })

  steps.push({
    clause: 'EN 1991-1-4 Table 7.1',
    description: 'External pressure coefficient (leeward, zone E)',
    formula: 'cpe,10 depends on h/d ratio',
    substitution: `h/d = ${fmt(h, 1)} / ${fmt(d, 1)} = ${fmt(hd, 2)}`,
    result: `cpe,leeward = ${fmt(cpe_leeward, 2)}`,
  })

  steps.push({
    clause: 'EN 1991-1-4 §7.2.9',
    description: 'Internal pressure coefficient',
    formula: `cpi = +/- ${fmt(Math.abs(cpi_val), 1)}`,
    substitution: `Enclosure: ${enclosure === 'closed' ? 'closed building' : 'dominant opening'}`,
    result: `cpi = +/- ${fmt(Math.abs(cpi_val), 1)}`,
  })

  // ── Zone-by-zone calculations ──────────────────────────────────────────────
  let totalForceWindward = 0
  let totalForceLeeward = 0

  for (const zone of zones) {
    const z = Math.max(zone.zMid, zmin)
    const cr_z = kr * Math.log(z / z0)
    const vm_z = cr_z * c0 * vb
    const Iv_z = 1.0 / (c0 * Math.log(z / z0))
    const qp_z = (1 + 7 * Iv_z) * 0.5 * rho * vm_z * vm_z

    const weWindward = qp_z * cpe_windward
    const weLeeward = qp_h * cpe_leeward // leeward uses qp at h

    // Worst case: windward with -cpi, leeward with +cpi
    const wNetWindward = weWindward - (-Math.abs(cpi_val)) * qp_z
    const wNetLeeward = weLeeward - Math.abs(cpi_val) * qp_h

    const forceWindward = wNetWindward * zone.area
    const forceLeeward = Math.abs(wNetLeeward) * zone.area
    const forceNet = forceWindward + forceLeeward

    totalForceWindward += forceWindward
    totalForceLeeward += forceLeeward

    zoneResults.push({
      z: zone.zMid,
      qp: qp_z,
      weWindward, weLeeward,
      wNetWindward, wNetLeeward,
      forceWindward, forceLeeward, forceNet,
      area: zone.area,
    })
  }

  const totalForce = cscd * (totalForceWindward + totalForceLeeward)

  steps.push({
    clause: 'EN 1991-1-4 §5.3',
    description: 'Wind pressure on surfaces',
    formula: 'we = qp(ze) x cpe, wi = qp(zi) x cpi',
    substitution: `Windward: we = qp x ${fmt(cpe_windward, 1)}, Leeward: we = qp(h) x ${fmt(cpe_leeward, 2)}`,
    result: `At h: we,windward = ${fmt(qp_h * cpe_windward, 1)} Pa, we,leeward = ${fmt(qp_h * cpe_leeward, 1)} Pa`,
  })

  steps.push({
    clause: 'EN 1991-1-4 §5.3(3)',
    description: 'Net wind pressure (worst-case cpi)',
    formula: 'wnet = we - wi (using worst-case +/- cpi)',
    substitution: `Windward: wnet = we - (-cpi x qp), Leeward: wnet = we - (+cpi x qp)`,
    result: `At h: wnet,windward = ${fmt(qp_h * cpe_windward + Math.abs(cpi_val) * qp_h, 1)} Pa, wnet,leeward = ${fmt(Math.abs(qp_h * cpe_leeward) + Math.abs(cpi_val) * qp_h, 1)} Pa`,
  })

  steps.push({
    clause: 'EN 1991-1-4 §5.3(4)',
    description: 'Total wind force',
    formula: 'Fw = cscd x Sum(wnet,i x Aref,i)',
    substitution: `Fw = ${fmt(cscd)} x (${fmt(totalForceWindward / 1000, 2)} + ${fmt(totalForceLeeward / 1000, 2)}) kN`,
    result: `Fw = ${fmt(totalForce / 1000, 2)} kN`,
  })

  // Windward pressure at h
  const windwardPressureH = qp_h * cpe_windward + Math.abs(cpi_val) * qp_h
  const leewardPressure = Math.abs(qp_h * cpe_leeward) + Math.abs(cpi_val) * qp_h

  return {
    vb,
    qpH: qp_h,
    totalForce: totalForce / 1000, // kN
    windwardPressureH: windwardPressureH,
    leewardPressure: leewardPressure,
    zones: zoneResults,
    steps,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ASCE 7-22 Calculations (Ch.26-27)
// ══════════════════════════════════════════════════════════════════════════════

export function calcWindASCE7(
  h: number, b: number, d: number, nZones: number,
  V: number, // basic wind speed in m/s
  exposure: ASCE7Exposure,
  Kzt: number, Kd: number, Ke: number,
  G: number,
  GCpi: number,
  enclosure: ASCE7Enclosure,
): WindResult {
  const steps: StepItem[] = []
  const { alpha, zg } = exposure

  steps.push({
    clause: 'ASCE 7-22 §26.5',
    description: 'Basic wind speed',
    formula: 'V (3-second gust)',
    substitution: '',
    result: `V = ${fmt(V, 1)} m/s (${fmt(V * 2.23694, 1)} mph)`,
  })

  // ── Build height zones ─────────────────────────────────────────────────────
  const zones = buildZones(h, b, nZones)
  const zoneResults: ZonePressureResult[] = []

  // ── Kz at roof height ──────────────────────────────────────────────────────
  const zRef_h = Math.max(h, 4.6)
  const Kz_h = 2.01 * Math.pow(zRef_h / zg, 2 / alpha)

  steps.push({
    clause: 'ASCE 7-22 §26.10.1',
    description: 'Velocity pressure exposure coefficient at h',
    formula: 'Kz = 2.01 x (z/zg)^(2/alpha)',
    substitution: `Kz = 2.01 x (${fmt(zRef_h, 1)} / ${fmt(zg, 1)})^(2/${fmt(alpha, 1)})`,
    result: `Kz(h) = ${fmt(Kz_h, 4)}`,
  })

  // ── Velocity pressure at h ─────────────────────────────────────────────────
  const qh = 0.613 * Kz_h * Kzt * Kd * Ke * V * V

  steps.push({
    clause: 'ASCE 7-22 §26.10.2',
    description: 'Velocity pressure at mean roof height',
    formula: 'qh = 0.613 x Kz x Kzt x Kd x Ke x V^2',
    substitution: `qh = 0.613 x ${fmt(Kz_h, 4)} x ${fmt(Kzt)} x ${fmt(Kd)} x ${fmt(Ke)} x ${fmt(V, 1)}^2`,
    result: `qh = ${fmt(qh, 2)} Pa = ${fmt(qh / 1000, 3)} kN/m^2`,
  })

  // ── Pressure coefficients ──────────────────────────────────────────────────
  const LB = d / Math.max(b, 0.01)
  const Cp_windward = ASCE7_CP_WINDWARD
  const Cp_leeward = getASCE7CpLeeward(LB)
  const GCpi_val = GCpi

  steps.push({
    clause: 'ASCE 7-22 Fig.27.3-1',
    description: 'Wall pressure coefficients',
    formula: 'Cp,windward = +0.8, Cp,leeward by L/B',
    substitution: `L/B = ${fmt(d, 1)} / ${fmt(b, 1)} = ${fmt(LB, 2)}`,
    result: `Cp,windward = ${fmt(Cp_windward, 1)}, Cp,leeward = ${fmt(Cp_leeward, 2)}`,
  })

  steps.push({
    clause: 'ASCE 7-22 §26.13',
    description: 'Internal pressure coefficient',
    formula: `GCpi = +/- ${fmt(GCpi_val, 2)}`,
    substitution: `Enclosure: ${enclosure}`,
    result: `GCpi = +/- ${fmt(GCpi_val, 2)}`,
  })

  steps.push({
    clause: 'ASCE 7-22 §26.11',
    description: 'Gust-effect factor',
    formula: 'G (rigid structure)',
    substitution: '',
    result: `G = ${fmt(G, 2)}`,
  })

  // ── Zone-by-zone calculations ──────────────────────────────────────────────
  let totalForceWindward = 0
  let totalForceLeeward = 0

  for (const zone of zones) {
    const z = Math.max(zone.zMid, 4.6)
    const Kz_z = 2.01 * Math.pow(z / zg, 2 / alpha)
    const qz = 0.613 * Kz_z * Kzt * Kd * Ke * V * V

    // Windward: uses qz at each height
    const pWindward = qz * G * Cp_windward - (-GCpi_val) * qh  // worst case: +GCpi on leeward side
    // Leeward: uses qh
    const pLeeward = qh * G * Cp_leeward - GCpi_val * qh  // worst case: -GCpi for more negative

    const forceWindward = pWindward * zone.area
    const forceLeeward = Math.abs(pLeeward) * zone.area
    const forceNet = forceWindward + forceLeeward

    totalForceWindward += forceWindward
    totalForceLeeward += forceLeeward

    zoneResults.push({
      z: zone.zMid,
      qp: qz,
      weWindward: qz * G * Cp_windward,
      weLeeward: qh * G * Cp_leeward,
      wNetWindward: pWindward,
      wNetLeeward: pLeeward,
      forceWindward,
      forceLeeward,
      forceNet,
      area: zone.area,
    })
  }

  const totalForce = totalForceWindward + totalForceLeeward

  steps.push({
    clause: 'ASCE 7-22 §27.2',
    description: 'Design wind pressure',
    formula: 'Windward: p = qz x G x Cp - qi x (-GCpi), Leeward: p = qh x G x Cp - qi x GCpi',
    substitution: `At h: windward = ${fmt(qh * G * Cp_windward + GCpi_val * qh, 1)} Pa, leeward = ${fmt(qh * G * Cp_leeward - GCpi_val * qh, 1)} Pa`,
    result: `Net pressures at h: windward = ${fmt(qh * G * Cp_windward + GCpi_val * qh, 1)} Pa, leeward = ${fmt(Math.abs(qh * G * Cp_leeward - GCpi_val * qh), 1)} Pa`,
  })

  steps.push({
    clause: 'ASCE 7-22 §27.2',
    description: 'Total wind force on MWFRS',
    formula: 'F = Sum(p x A) for all faces',
    substitution: `F = ${fmt(totalForceWindward / 1000, 2)} + ${fmt(totalForceLeeward / 1000, 2)} kN`,
    result: `Fw = ${fmt(totalForce / 1000, 2)} kN`,
  })

  const windwardPressureH = qh * G * Cp_windward + GCpi_val * qh
  const leewardPressure = Math.abs(qh * G * Cp_leeward - GCpi_val * qh)

  return {
    vb: V,
    qpH: qh,
    totalForce: totalForce / 1000, // kN
    windwardPressureH,
    leewardPressure,
    zones: zoneResults,
    steps,
  }
}
