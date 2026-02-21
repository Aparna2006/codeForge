'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, type Problem } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2Icon, LockIcon } from 'lucide-react';

interface ProblemsGridProps {
  limit?: number;
}

const difficultyColors = {
  Easy: 'bg-green-500/10 text-green-700 dark:text-green-400',
  Medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  Hard: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export default function ProblemsGrid({ limit = 10 }: ProblemsGridProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('problems')
          .select('*')
          .limit(limit)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('[v0] Error fetching problems:', fetchError);
          // If tables don't exist, show setup message
          if (fetchError.code === 'PGRST205' || fetchError.message?.includes('Could not find the table')) {
            setError('Database not initialized. Visit /setup to initialize.');
          } else {
            setError('Failed to load problems');
          }
          return;
        }

        console.log('[v0] Fetched problems:', data);
        setProblems(data || []);
      } catch (err) {
        console.error('[v0] Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(limit)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    const isSetupError = error.includes('Database not initialized');
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-3">{error}</p>
        {isSetupError && (
          <a 
            href="/setup" 
            className="text-primary hover:underline text-sm font-medium"
          >
            Click here to initialize the database →
          </a>
        )}
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No problems available yet. Check back soon!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {problems.map((problem) => (
        <Link key={problem.id} href={`/problems/${problem.slug}`}>
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base line-clamp-2">{problem.title}</CardTitle>
                <Badge 
                  variant="secondary"
                  className={`shrink-0 ${difficultyColors[problem.difficulty as keyof typeof difficultyColors]}`}
                >
                  {problem.difficulty}
                </Badge>
              </div>
              {problem.category && (
                <CardDescription>{problem.category}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2Icon className="w-4 h-4" />
                    {problem.accepted_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <LockIcon className="w-4 h-4" />
                    {problem.submission_count}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
