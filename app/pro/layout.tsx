import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Enginus Pro | Professional Structural Design Tools',
  description:
    'Upgrade to Enginus Pro for professional RC and steel design calculators. RC beam, slab, column and foundation design tools.',
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
