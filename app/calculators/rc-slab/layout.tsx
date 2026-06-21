import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RC Slab Design Calculator | EC2 & ACI 318 | Enginus',
  description:
    'Reinforced concrete slab design per Eurocode 2 and ACI 318. One-way and two-way slabs, required reinforcement, deflection checks, and bar spacing.',
}

export default function RcSlabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
