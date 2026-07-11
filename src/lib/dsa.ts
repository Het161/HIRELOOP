import type { CodeLanguage, DsaDifficulty, Role } from "@/types";

/* ============================================================ *
 * DSA / coding-interview configuration — difficulty bands, the
 * languages the editor supports, and starter templates.
 * ============================================================ */

export interface DsaDifficultyMeta {
  value: DsaDifficulty;
  title: string;
  /** Short label, e.g. "very easy". */
  label: string;
  blurb: string;
}

export const DSA_DIFFICULTIES: DsaDifficultyMeta[] = [
  {
    value: "very-easy",
    title: "very easy",
    label: "very easy",
    blurb: "warm-ups — loops, strings, simple array walks. FizzBuzz tier.",
  },
  {
    value: "easy",
    title: "easy",
    label: "easy",
    blurb: "LeetCode Easy — hash maps, two pointers, basic recursion.",
  },
  {
    value: "medium",
    title: "medium",
    label: "medium",
    blurb: "LeetCode Medium — trees, graphs, sliding window, intro DP.",
  },
  {
    value: "hard",
    title: "hard",
    label: "hard",
    blurb: "LeetCode Hard — advanced DP, graphs, tight edge cases.",
  },
];

export function getDifficulty(value: string): DsaDifficultyMeta | undefined {
  return DSA_DIFFICULTIES.find((d) => d.value === value);
}

export interface CodeLanguageMeta {
  value: CodeLanguage;
  /** Human label shown in the UI. */
  label: string;
  /** Fence tag used when handing the code to the LLM. */
  fence: string;
  /** Editor scaffold the candidate starts from. */
  starter: string;
}

export const CODE_LANGUAGES: CodeLanguageMeta[] = [
  {
    value: "python",
    label: "Python",
    fence: "python",
    starter: "def solution():\n    # write your solution here\n    pass\n",
  },
  {
    value: "javascript",
    label: "JavaScript",
    fence: "javascript",
    starter: "function solution() {\n  // write your solution here\n}\n",
  },
  {
    value: "typescript",
    label: "TypeScript",
    fence: "typescript",
    starter: "function solution(): void {\n  // write your solution here\n}\n",
  },
  {
    value: "java",
    label: "Java",
    fence: "java",
    starter:
      "class Solution {\n    // write your solution here\n    void solve() {\n\n    }\n}\n",
  },
  {
    value: "cpp",
    label: "C++",
    fence: "cpp",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\n\n// write your solution here\nint main() {\n    return 0;\n}\n",
  },
  {
    value: "go",
    label: "Go",
    fence: "go",
    starter: "package main\n\n// write your solution here\nfunc solution() {\n}\n",
  },
];

export function getLanguage(value: string): CodeLanguageMeta | undefined {
  return CODE_LANGUAGES.find((l) => l.value === value);
}

export function starterCode(language: CodeLanguage): string {
  return getLanguage(language)?.starter ?? "";
}

/**
 * Virtual "role" that stands in for a DSA interview so the report + session
 * plumbing (which expects a Role) keeps working without special-casing.
 * Not part of the browseable role catalog.
 */
export const DSA_ROLE: Role = {
  id: "dsa",
  name: "DSA / Coding",
  category: "specialized",
  description:
    "Data-structures & algorithms coding interview with a live code editor.",
  topics: [
    "Arrays & strings",
    "Hashing",
    "Two pointers & sliding window",
    "Stacks & queues",
    "Recursion & backtracking",
    "Trees & graphs",
    "Sorting & searching",
    "Dynamic programming",
    "Time & space complexity",
  ],
};
