import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RC Beam Design Calculator | EC2 & ACI 318 | Enginus',
  description:
    'Reinforced concrete beam design per Eurocode 2 and ACI 318. Calculate required reinforcement, check min/max steel ratios, and get bar arrangements.',
}

export default function RcBeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
