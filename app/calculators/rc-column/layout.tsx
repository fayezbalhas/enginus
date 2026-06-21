import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RC Column Design Calculator | EC2 & ACI 318 | Enginus',
  description:
    'Reinforced concrete column design per Eurocode 2 and ACI 318. Axial load and moment interaction, required reinforcement, and pass/fail checks.',
}

export default function RcColumnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
