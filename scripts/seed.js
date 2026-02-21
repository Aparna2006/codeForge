import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[v0] Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SAMPLE_PROBLEMS = [
  {
    title: 'Two Sum',
    slug: 'two-sum',
    description: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume each input has exactly one solution, and you cannot use the same element twice.',
    difficulty: 'Easy',
    category: 'Array',
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] == 9' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: 'nums[1] + nums[2] == 6' },
    ],
    test_cases: [
      { input: '2\n7\n11\n15\n9', output: '0\n1' },
      { input: '3\n2\n4\n6', output: '1\n2' },
    ],
    constraints: '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9',
    time_limit_ms: 1000,
    memory_limit_mb: 256,
  },
  {
    title: 'Reverse String',
    slug: 'reverse-string',
    description: 'Write a function that reverses a string. The input string is given as an array of characters.',
    difficulty: 'Easy',
    category: 'String',
    examples: [
      { input: '"hello"', output: '"olleh"', explanation: 'Reversed the string' },
      { input: '"world"', output: '"dlrow"', explanation: 'Reversed the string' },
    ],
    test_cases: [
      { input: 'hello', output: 'olleh' },
      { input: 'world', output: 'dlrow' },
      { input: 'a', output: 'a' },
    ],
    constraints: '1 <= s.length <= 10^5',
    time_limit_ms: 1000,
    memory_limit_mb: 256,
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    description: 'Given a string s, find the length of the longest substring without repeating characters.',
    difficulty: 'Medium',
    category: 'String',
    examples: [
      { input: '"abcabcbb"', output: '3', explanation: 'The answer is "abc"' },
      { input: '"bbbbb"', output: '1', explanation: 'The answer is "b"' },
      { input: '"pwwkew"', output: '3', explanation: 'The answer is "wke"' },
    ],
    test_cases: [
      { input: 'abcabcbb', output: '3' },
      { input: 'bbbbb', output: '1' },
      { input: 'pwwkew', output: '3' },
    ],
    constraints: '0 <= s.length <= 5 * 10^4',
    time_limit_ms: 2000,
    memory_limit_mb: 256,
  },
  {
    title: 'Median of Two Sorted Arrays',
    slug: 'median-of-two-sorted-arrays',
    description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.',
    difficulty: 'Hard',
    category: 'Array',
    examples: [
      { input: 'nums1 = [1,3], nums2 = [2]', output: '2.0', explanation: 'The median is 2' },
      { input: 'nums1 = [1,2], nums2 = [3,4]', output: '2.5', explanation: 'The median is (2 + 3) / 2' },
    ],
    test_cases: [
      { input: '2\n1\n3\n1\n2', output: '2' },
      { input: '2\n1\n2\n2\n3\n4', output: '2.5' },
    ],
    constraints: 'nums1.length == m, nums2.length == n, 0 <= m, n <= 1000',
    time_limit_ms: 2000,
    memory_limit_mb: 256,
  },
  {
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    description: 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water.',
    difficulty: 'Medium',
    category: 'Array',
    examples: [
      { input: '[1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'The vertical lines at indices 1 and 8 have area 49' },
      { input: '[1,1]', output: '1', explanation: 'The vertical lines have area 1' },
    ],
    test_cases: [
      { input: '1\n8\n6\n2\n5\n4\n8\n3\n7', output: '49' },
      { input: '1\n1', output: '1' },
    ],
    constraints: 'n == height.length, 2 <= n <= 10^5, 0 <= height[i] <= 10^4',
    time_limit_ms: 2000,
    memory_limit_mb: 256,
  },
];

const SAMPLE_USERS = [
  { email: 'alice@example.com', username: 'alice', full_name: 'Alice Johnson' },
  { email: 'bob@example.com', username: 'bob', full_name: 'Bob Smith' },
  { email: 'charlie@example.com', username: 'charlie', full_name: 'Charlie Brown' },
];

async function seed() {
  console.log('[v0] Starting database seed...');

  try {
    // Insert sample problems
    console.log('[v0] Inserting sample problems...');
    const { data: problemsData, error: problemsError } = await supabase
      .from('problems')
      .insert(SAMPLE_PROBLEMS)
      .select();

    if (problemsError) {
      console.error('[v0] Error inserting problems:', problemsError);
    } else {
      console.log('[v0] Successfully inserted', problemsData?.length || 0, 'problems');
    }

    // Insert sample users
    console.log('[v0] Inserting sample users...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .insert(SAMPLE_USERS)
      .select();

    if (usersError) {
      console.error('[v0] Error inserting users:', usersError);
    } else {
      console.log('[v0] Successfully inserted', usersData?.length || 0, 'users');

      // Insert sample stats for each user
      if (usersData && usersData.length > 0) {
        const stats = usersData.map((user, idx) => ({
          user_id: user.id,
          total_submissions: (idx + 1) * 10,
          total_accepted: (idx + 1) * 7,
          easy_solved: (idx + 1) * 3,
          medium_solved: (idx + 1) * 2,
          hard_solved: (idx + 1) * 2,
          acceptance_rate: 70 + idx * 5,
          ranking: idx + 1,
        }));

        const { error: statsError } = await supabase
          .from('user_stats')
          .insert(stats);

        if (statsError) {
          console.error('[v0] Error inserting stats:', statsError);
        } else {
          console.log('[v0] Successfully inserted user stats');
        }
      }
    }

    console.log('[v0] Database seed completed successfully!');
  } catch (error) {
    console.error('[v0] Seed error:', error);
    process.exit(1);
  }
}

seed();
