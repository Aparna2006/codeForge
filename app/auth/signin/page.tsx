'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { normalizeAuthError } from '@/lib/auth-errors'
import { signIn } from '@/lib/auth'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email || !password) {
      setError('Enter both email and password.')
      setLoading(false)
      return
    }

    const result = await signIn(email.trim(), password)
    if (!result.success) {
      const normalized = normalizeAuthError(result.error)
      setError(normalized.message)
      setLoading(false)
      return
    }

    const next = searchParams.get('next')
    router.replace(next && next.startsWith('/') ? next : '/dashboard')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 dark:from-black dark:to-gray-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-purple-100 opacity-30 blur-3xl dark:bg-purple-950/20"></div>
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-100 opacity-30 blur-3xl dark:bg-blue-950/20"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="group inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 font-bold text-white transition group-hover:bg-purple-500">
              CF
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">codeForge</span>
          </Link>
        </div>

        <Card className="border-gray-200 dark:border-white/10">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-2xl text-gray-900 dark:text-white">Welcome Back</CardTitle>
            <CardDescription>Sign in to continue your coding journey</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </p>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <div className="text-right text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2 bg-purple-600 py-6 text-white hover:bg-purple-700">
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
                Sign Up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
