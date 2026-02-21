'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

const PUBLIC_PATHS = new Set([
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
])

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  const isPublicRoute = useMemo(() => {
    if (!pathname) return true
    if (pathname.startsWith('/api')) return true
    return PUBLIC_PATHS.has(pathname)
  }, [pathname])

  useEffect(() => {
    let mounted = true

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!mounted) return
      setAuthenticated(Boolean(session))
      setReady(true)

      if (!session && !isPublicRoute) {
        router.replace(`/auth/signin?next=${encodeURIComponent(pathname || '/')}`)
      }
    }

    syncSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const isAuthed = Boolean(session)
      setAuthenticated(isAuthed)

      if (!isAuthed && !isPublicRoute) {
        router.replace(`/auth/signin?next=${encodeURIComponent(pathname || '/')}`)
      }
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [isPublicRoute, pathname, router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!authenticated && !isPublicRoute) {
    return null
  }

  return <>{children}</>
}
