import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'
import { CustomCursor } from '@/components/ui/CustomCursor'
import { PageTransitionProvider } from '@/components/ui/PageTransition'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Aurelia — Configure Your Ring',
  description: 'Two paths. One story. Design the ring that is entirely yours.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        {/* Preload heavy 3D assets — browser fetches in parallel with JS bundle */}
        <link rel="preload" href="/models/ring-parts.glb" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/models/stones.glb"     as="fetch" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <CustomCursor />
        <PageTransitionProvider>
          {children}
        </PageTransitionProvider>
        <div id="portal-root" />
      </body>
    </html>
  )
}
