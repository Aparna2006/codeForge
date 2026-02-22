type ProblemSeed = {
  title: string;
  slug: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  test_cases: Array<{ input: string; output: string }>;
  constraints: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  accepted_count: number;
  submission_count: number;
};

type StarterCodes = {
  python: string;
  c: string;
  cpp: string;
  java: string;
};

const TITLES = [
  'Two Sum',
  'Best Time to Buy and Sell Stock',
  'Contains Duplicate',
  'Product of Array Except Self',
  'Maximum Subarray',
  'Rotate Array',
  'Search in Rotated Sorted Array',
  'Container With Most Water',
  '3Sum',
  'Move Zeroes',
  'Valid Parentheses',
  'Reverse String',
  'Longest Substring Without Repeating',
  'Longest Palindromic Substring',
  'Valid Anagram',
  'Group Anagrams',
  'Implement strStr',
  'Backspace String Compare',
  'Decode String',
  'Longest Common Prefix',
  'Reverse Linked List',
  'Merge Two Sorted Lists',
  'Linked List Cycle',
  'Palindrome Linked List',
  'Middle of Linked List',
  'Add Two Numbers',
  'Sort List',
  'Merge k Sorted Lists',
  'Swap Nodes in Pairs',
  'Odd Even Linked List',
  'Maximum Depth of Binary Tree',
  'Balanced Binary Tree',
  'Invert Binary Tree',
  'Same Tree',
  'Symmetric Tree',
  'Path Sum',
  'Binary Tree Level Order',
  'Lowest Common Ancestor',
  'Validate Binary Search Tree',
  'Diameter of Binary Tree',
  'Kth Largest Element',
  'Top K Frequent Elements',
  'Merge Intervals',
  'First Missing Positive',
  'Jump Game',
  'Gas Station',
  'Word Ladder',
  'Minimum Window Substring',
  'Permutation in String',
  'Compare Version Numbers',
];

const CATEGORIES = ['Arrays', 'Strings', 'LinkedLists', 'Trees', 'Greedy', 'Math'];

const STARTER_CODES: StarterCodes = {
  python: `def solve():
    import sys
    data = sys.stdin.read().strip().split()
    # Write your logic
    print("")

if __name__ == "__main__":
    solve()`,
  c: `#include <stdio.h>

int main() {
  // Write your logic
  return 0;
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  // Write your logic
  return 0;
}`,
  java: `import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    // Write your logic
  }
}`,
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildTemplate(index: number) {
  const kind = index % 5;
  if (kind === 0) {
    return {
      description: 'Read n and then n integers. Print the sum of the array.',
      examples: [{ input: '5\n1 2 3 4 5', output: '15' }],
      test_cases: [
        { input: '4\n1 2 3 4', output: '10' },
        { input: '5\n10 20 30 40 50', output: '150' },
        { input: '3\n-1 2 7', output: '8' },
      ],
      constraints: '1 <= n <= 100000, -10^9 <= a[i] <= 10^9',
    };
  }
  if (kind === 1) {
    return {
      description: 'Read n and then n integers. Print the maximum element.',
      examples: [{ input: '5\n1 9 3 7 2', output: '9' }],
      test_cases: [
        { input: '4\n1 2 3 4', output: '4' },
        { input: '5\n-1 -7 -3 -9 -2', output: '-1' },
        { input: '3\n100 20 30', output: '100' },
      ],
      constraints: '1 <= n <= 100000, -10^9 <= a[i] <= 10^9',
    };
  }
  if (kind === 2) {
    return {
      description: 'Read n and then n integers. Print count of even numbers.',
      examples: [{ input: '6\n1 2 3 4 5 6', output: '3' }],
      test_cases: [
        { input: '4\n1 2 3 4', output: '2' },
        { input: '5\n1 3 5 7 9', output: '0' },
        { input: '5\n2 4 6 8 10', output: '5' },
      ],
      constraints: '1 <= n <= 100000, -10^9 <= a[i] <= 10^9',
    };
  }
  if (kind === 3) {
    return {
      description: 'Read n and then n integers. Print the minimum element.',
      examples: [{ input: '5\n1 9 3 7 2', output: '1' }],
      test_cases: [
        { input: '4\n1 2 3 4', output: '1' },
        { input: '5\n-1 -7 -3 -9 -2', output: '-9' },
        { input: '3\n100 20 30', output: '20' },
      ],
      constraints: '1 <= n <= 100000, -10^9 <= a[i] <= 10^9',
    };
  }
  return {
    description: 'Read n and then n integers. Print maximum absolute difference between adjacent elements.',
    examples: [{ input: '5\n1 8 3 10 2', output: '8' }],
    test_cases: [
      { input: '5\n1 8 3 10 2', output: '8' },
      { input: '4\n4 4 4 4', output: '0' },
      { input: '3\n10 1 20', output: '19' },
    ],
    constraints: '2 <= n <= 100000, -10^9 <= a[i] <= 10^9',
  };
}

export function getProblemCatalog(): ProblemSeed[] {
  return TITLES.map((title, idx) => {
    const template = buildTemplate(idx);
    const difficulty: 'Easy' | 'Medium' | 'Hard' =
      idx % 10 === 0 ? 'Hard' : idx % 3 === 0 ? 'Medium' : 'Easy';
    return {
      title,
      slug: slugify(title),
      description: template.description,
      difficulty,
      category: CATEGORIES[idx % CATEGORIES.length],
      examples: template.examples,
      test_cases: template.test_cases,
      constraints: template.constraints,
      time_limit_ms: 1000,
      memory_limit_mb: 256,
      accepted_count: 0,
      submission_count: 0,
    };
  });
}

export function getStarterCodes(): StarterCodes {
  return STARTER_CODES;
}
