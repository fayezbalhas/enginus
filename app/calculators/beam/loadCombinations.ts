// Load combination handling: scales tagged loads (G/Q/W/S) by factors
// before they're handed to solveBeam.

import type { PointLoad, UDLLoad, TrapezoidalLoad, MomentLoad, LoadType } from './calculations'

export type CombinationMode = 'manual' | 'auto-ec' | 'auto-aci'
export type DesignCode = 'EC' | 'ACI'

export type LoadFactors = Record<LoadType, number>

export interface LoadCombination {
  id: string
  label: string
  factors: LoadFactors
}

export const DEFAULT_MANUAL_GAMMA: Record<DesignCode, { gammaG: number; gammaQ: number }> = {
  EC: { gammaG: 1.35, gammaQ: 1.5 },
  ACI: { gammaG: 1.2, gammaQ: 1.6 },
}

export const EC_COMBINATIONS: LoadCombination[] = [
  { id: 'ec-1', label: '1.35G + 1.5Q', factors: { G: 1.35, Q: 1.5, W: 0, S: 0 } },
  { id: 'ec-2', label: '1.0G + 1.5Q', factors: { G: 1.0, Q: 1.5, W: 0, S: 0 } },
  { id: 'ec-3', label: '1.35G', factors: { G: 1.35, Q: 0, W: 0, S: 0 } },
]

export const ACI_COMBINATIONS: LoadCombination[] = [
  { id: 'aci-1', label: '1.2D + 1.6L', factors: { G: 1.2, Q: 1.6, W: 0, S: 0 } },
  { id: 'aci-2', label: '1.4D', factors: { G: 1.4, Q: 0, W: 0, S: 0 } },
  { id: 'aci-3', label: '0.9D + 1.0W', factors: { G: 0.9, Q: 0, W: 1.0, S: 0 } },
]

export function combinationsForCode(code: DesignCode): LoadCombination[] {
  return code === 'EC' ? EC_COMBINATIONS : ACI_COMBINATIONS
}

// Manual mode: gammaG applies to dead loads (G), gammaQ applies to all
// variable loads (Q/W/S).
export function manualFactors(gammaG: number, gammaQ: number): LoadFactors {
  return { G: gammaG, Q: gammaQ, W: gammaQ, S: gammaQ }
}

function factorFor(loadType: LoadType, factors: LoadFactors): number {
  return factors[loadType] ?? 1
}

export function applyFactorsToPointLoads(loads: PointLoad[], factors: LoadFactors): PointLoad[] {
  return loads.map((l) => ({ ...l, magnitude: l.magnitude * factorFor(l.loadType, factors) }))
}

export function applyFactorsToUDLs(loads: UDLLoad[], factors: LoadFactors): UDLLoad[] {
  return loads.map((l) => ({ ...l, magnitude: l.magnitude * factorFor(l.loadType, factors) }))
}

export function applyFactorsToTrapezoidal(loads: TrapezoidalLoad[], factors: LoadFactors): TrapezoidalLoad[] {
  return loads.map((l) => ({
    ...l,
    startMag: l.startMag * factorFor(l.loadType, factors),
    endMag: l.endMag * factorFor(l.loadType, factors),
  }))
}

export function applyFactorsToMoments(loads: MomentLoad[], factors: LoadFactors): MomentLoad[] {
  return loads.map((l) => ({ ...l, magnitude: l.magnitude * factorFor(l.loadType, factors) }))
}
