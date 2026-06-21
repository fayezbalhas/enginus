import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Beam Calculator | Shear Force & Bending Moment | Enginus',
  description:
    'Free online beam calculator. Calculate reactions, shear force diagram, bending moment diagram and deflection for any beam. Eurocode and ACI support.',
}

export default function BeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
