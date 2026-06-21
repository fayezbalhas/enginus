import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rebar Calculator | Bar Area & Development Length | Enginus',
  description:
    'Free rebar calculator for structural engineers. Bar areas, slab reinforcement, beam design and development length per Eurocode and ACI 318.',
}

export default function RebarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
