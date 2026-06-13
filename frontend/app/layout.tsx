import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AuthPass — AI Prior Auth for Legion Health',
  description: 'Real-time prior authorization decision support powered by xAI Grok',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
