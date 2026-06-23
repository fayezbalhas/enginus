import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Steel Beam Design Calculator | EC3 & AISC 360 | Enginus',
  description:
    'Steel beam design per Eurocode 3 and AISC 360-22. Section classification, bending, shear, lateral-torsional buckling, and deflection checks with step-by-step calculations.',
}

export default function SteelBeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
