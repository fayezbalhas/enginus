import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Section Properties Calculator | Enginus',
  description:
    'Calculate section properties for common structural shapes. Area, moment of inertia, section modulus, radius of gyration for rectangles, circles, I-sections and more.',
}

export default function SectionPropertiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
