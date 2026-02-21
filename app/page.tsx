'use client'

import Link from 'next/link'
import { ArrowRight, Braces, Code2, Flame, Trophy, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="group flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 text-white transition group-hover:shadow-lg group-hover:shadow-purple-500/50">
              <Braces className="h-5 w-5" />
            </div>
            <span className="hidden text-xl font-bold text-white sm:inline">codeForge</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="/auth/signin?next=%2Fproblems" className="font-medium text-gray-300 transition hover:text-purple-400">
              Problems
            </Link>
            <Link href="/auth/signin?next=%2Fleaderboard" className="font-medium text-gray-300 transition hover:text-purple-400">
              Leaderboard
            </Link>
            <Link href="/auth/signin?next=%2Fcontests" className="font-medium text-gray-300 transition hover:text-purple-400">
              Contests
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
              <Link href="/auth/signin">
                Sign In
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-purple-600 text-white hover:bg-purple-700">
              <Link href="/auth/signup">
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="px-6 pb-20 pt-32">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-600/40 bg-purple-600/20 px-4 py-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Code. Compete. Conquer.</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-7xl">
            Where Programmers
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
              Level Up &amp; Compete.
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-gray-400">
            Solve real-world coding problems, compete with developers worldwide, build your skills, and
            dominate the leaderboard on codeForge.
          </p>

          <div className="mb-20 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full gap-2 rounded-full bg-purple-600 px-8 text-lg text-white hover:bg-purple-700 sm:w-auto">
              <Link href="/auth/signup">
                Start Coding
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-full border-white/20 px-8 text-lg text-white hover:bg-white/10 sm:w-auto"
              >
              <Link href="/auth/signin?next=%2Fproblems">
                View Problems
              </Link>
            </Button>
          </div>

          <div className="mb-20 grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
              <div className="mb-2 text-3xl font-bold text-purple-400 md:text-4xl">100+</div>
              <div className="text-sm text-gray-400">Challenges</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
              <div className="mb-2 text-3xl font-bold text-purple-400 md:text-4xl">1K+</div>
              <div className="text-sm text-gray-400">Active Coders</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
              <div className="mb-2 text-3xl font-bold text-purple-400 md:text-4xl">8</div>
              <div className="text-sm text-gray-400">Languages</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
              <div className="mb-2 text-3xl font-bold text-purple-400 md:text-4xl">24/7</div>
              <div className="text-sm text-gray-400">Online Judge</div>
            </div>
          </div>

          <div className="mb-20 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-12 backdrop-blur">
            <h2 className="mb-12 text-3xl font-bold text-white">Why CodeForge?</h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="space-y-4 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-purple-600/40 bg-purple-600/20">
                  <Code2 className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Multi-Language</h3>
                <p className="text-sm text-gray-400">Code in Python, JavaScript, TypeScript, C, C++, Java, Go, or R</p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-purple-600/40 bg-purple-600/20">
                  <Trophy className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Compete &amp; Win</h3>
                <p className="text-sm text-gray-400">Real-time contests with thousands of developers worldwide</p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-purple-600/40 bg-purple-600/20">
                  <Flame className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Track Progress</h3>
                <p className="text-sm text-gray-400">Daily streaks, heatmaps, and comprehensive analytics</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
