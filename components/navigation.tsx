import Link from 'next/link';
import { CodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Navigation() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg group">
          <div className="p-1.5 bg-primary rounded-lg group-hover:bg-primary/90 transition-colors">
            <CodeIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <span>codeForge</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link 
            href="/problems" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Problems
          </Link>
          <Link 
            href="/dashboard" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link 
            href="/leaderboard" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Leaderboard
          </Link>
          <Link 
            href="/discuss" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Discuss
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/signin">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm">Sign Up</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
