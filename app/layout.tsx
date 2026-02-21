import type { Metadata } from 'next'

import AuthGate from '@/components/auth-gate'
import SiteFooter from '@/components/site-footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'codeForge - Competitive Coding Platform',
  description:
    'Master coding challenges, compete globally, and track your progress on codeForge - the ultimate competitive programming platform.',
  keywords: 'competitive programming, coding challenges, leetcode alternative, algorithm practice',
  openGraph: {
    title: 'codeForge - Competitive Coding Platform',
    description: 'Master coding challenges and compete globally',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased dark">
        <div className="min-h-screen bg-background text-foreground">
          <AuthGate>{children}</AuthGate>
          <SiteFooter />
        </div>
      </body>
    </html>
  )
}
