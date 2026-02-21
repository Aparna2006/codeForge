'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { updatePassword } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingRecovery, setCheckingRecovery] = useState(true)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    const initRecovery = async () => {
      setCheckingRecovery(true)
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!setSessionError && mounted) {
            setRecoveryReady(true)
            setMessage('Recovery verified. Set your new password.')
            return
          }
        }

        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        if (tokenHash && type === 'recovery') {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })
          if (!otpError && mounted) {
            setRecoveryReady(true)
            setMessage('Recovery verified. Set your new password.')
            return
          }
        }

        const code = searchParams.get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (!exchangeError && mounted) {
            setRecoveryReady(true)
            setMessage('Recovery verified. Set your new password.')
            return
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (mounted && session) {
          setRecoveryReady(true)
        }
      } finally {
        if (mounted) setCheckingRecovery(false)
      }
    }

    void initRecovery()
    return () => {
      mounted = false
    }
  }, [searchParams])

  const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (!email || !otp) {
      setError('Enter email and OTP.')
      setLoading(false)
      return
    }

    const { error: otpError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'recovery',
    })
    if (otpError) {
      setError(otpError.message || 'Invalid OTP.')
      setLoading(false)
      return
    }

    setRecoveryReady(true)
    setMessage('OTP verified. Set your new password.')
    setLoading(false)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (!password || !confirmPassword) {
      setError('Complete both password fields.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const result = await updatePassword(password)
    if (!result.success) {
      setError(result.error || 'Unable to reset password.')
      setLoading(false)
      return
    }

    setMessage('Password updated successfully. Redirecting to sign in...')
    setTimeout(() => router.replace('/auth/signin'), 1500)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 dark:from-black dark:to-gray-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-purple-100 opacity-30 blur-3xl dark:bg-purple-950/20"></div>
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-100 opacity-30 blur-3xl dark:bg-blue-950/20"></div>
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-gray-200 dark:border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">Reset Password</CardTitle>
            <CardDescription>
              {recoveryReady ? 'Set a new password for your account' : 'Verify recovery and then set a new password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checkingRecovery ? (
              <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                Validating reset link...
              </p>
            ) : null}
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-400">
                {message}
              </p>
            ) : null}

            {!checkingRecovery && !recoveryReady ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">OTP</label>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP from email"
                    disabled={loading}
                    className="border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-purple-600 text-white hover:bg-purple-700">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </form>
            ) : null}

            {recoveryReady ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    className="border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    className="border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-purple-600 text-white hover:bg-purple-700">
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            ) : null}

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              Back to{' '}
              <Link href="/auth/signin" className="font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
