import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json(
        { error: 'Missing Supabase credentials in environment. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('[v0] Starting database setup...');

    // Insert sample problems (upsert to handle duplicates)
    try {
      console.log('[v0] Inserting sample problems...');
      const { error: insertError } = await supabase.from('problems').upsert([
        {
          title: 'Two Sum',
          slug: 'two-sum',
          description:
            'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume each input has exactly one solution, and you cannot use the same element twice.',
          difficulty: 'Easy',
          category: 'Array',
          examples: [
            {
              input: '[2,7,11,15], target = 9',
              output: '[0,1]',
              explanation: 'nums[0] + nums[1] == 9, so we return [0, 1].',
            },
          ],
          test_cases: [
            { input: '[2,7,11,15]\n9', output: '[0,1]' },
            { input: '[3,2,4]\n6', output: '[1,2]' },
            { input: '[3,3]\n6', output: '[0,1]' },
          ],
          constraints:
            '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9',
          time_limit_ms: 1000,
          memory_limit_mb: 256,
          accepted_count: 0,
          submission_count: 0,
        },
        {
          title: 'Reverse String',
          slug: 'reverse-string',
          description:
            'Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.',
          difficulty: 'Easy',
          category: 'String',
          examples: [
            {
              input: '["h","e","l","l","o"]',
              output: '["o","l","l","e","h"]',
              explanation: 'The string "hello" becomes "olleh".',
            },
          ],
          test_cases: [
            { input: '["h","e","l","l","o"]', output: '["o","l","l","e","h"]' },
            { input: '["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' },
          ],
          constraints: '1 <= s.length <= 10^5, s[i] is a printable ascii character.',
          time_limit_ms: 1000,
          memory_limit_mb: 256,
          accepted_count: 0,
          submission_count: 0,
        },
        {
          title: 'Longest Substring Without Repeating Characters',
          slug: 'longest-substring-without-repeating-characters',
          description:
            'Given a string s, find the length of the longest substring without repeating characters.',
          difficulty: 'Medium',
          category: 'String',
          examples: [
            {
              input: '"abcabcbb"',
              output: '3',
              explanation: 'The answer is "abc", with the length of 3.',
            },
          ],
          test_cases: [
            { input: '"abcabcbb"', output: '3' },
            { input: '"bbbbb"', output: '1' },
            { input: '"pwwkew"', output: '3' },
          ],
          constraints: '0 <= s.length <= 5 * 10^4, s consists of English letters, digits, symbols and spaces.',
          time_limit_ms: 2000,
          memory_limit_mb: 256,
          accepted_count: 0,
          submission_count: 0,
        },
      ], {
        onConflict: 'slug',
        ignoreDuplicates: false,
      });

      if (insertError) {
        console.error('[v0] Upsert error:', insertError);
      } else {
        console.log('[v0] Sample problems inserted/updated successfully');
      }

      const { data: seededProblems } = await supabase
        .from('problems')
        .select('id')
        .in('slug', ['two-sum', 'reverse-string', 'longest-substring-without-repeating-characters']);

      if (seededProblems && seededProblems.length > 0) {
        const starterRows: Array<{ problem_id: string; language: string; starter_code: string }> = [];
        for (const p of seededProblems) {
          starterRows.push(
            {
              problem_id: p.id,
              language: 'python',
              starter_code: `def solve():\n    import sys\n    data = sys.stdin.read().strip()\n    # Write your logic\n    print("")\n\nif __name__ == "__main__":\n    solve()`,
            },
            {
              problem_id: p.id,
              language: 'c',
              starter_code: `#include <stdio.h>\n\nint main() {\n  // Write your logic\n  return 0;\n}`,
            },
            {
              problem_id: p.id,
              language: 'cpp',
              starter_code: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  // Write your logic\n  return 0;\n}`,
            },
            {
              problem_id: p.id,
              language: 'java',
              starter_code: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    // Write your logic\n  }\n}`,
            }
          );
        }

        const { error: starterErr } = await supabase
          .from('problem_starter_codes')
          .upsert(starterRows, { onConflict: 'problem_id,language', ignoreDuplicates: false });
        if (starterErr) {
          console.warn('[v0] Starter code seed warning:', starterErr.message);
        }
      }
    } catch (setupError) {
      console.error('[v0] Setup error during insertion:', setupError);
    }

    return Response.json(
      { 
        message: 'Database setup completed! Sample problems have been added. Visit /problems to start solving challenges.',
        success: true 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Setup error:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred during setup',
      },
      { status: 500 }
    );
  }
}
