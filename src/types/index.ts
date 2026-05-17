/* ============================================================ *
 * HireLoop — shared type definitions (barrel module).
 * Every interface in the app is declared and exported here.
 * ============================================================ */

export type RoleCategory =
  | "engineering"
  | "data"
  | "product"
  | "design"
  | "specialized";

export type Seniority = "junior" | "mid" | "senior";

export type InterviewMode = "voice" | "text";

export interface Role {
  id: string;
  name: string;
  category: RoleCategory;
  /** What this role should be tested on. */
  topics: string[];
  description: string;
}

export interface Message {
  role: "assistant" | "user";
  content: string;
  /** Unix milliseconds. */
  timestamp: number;
  /** Which question this answer is for (0-indexed). */
  questionIndex?: number;
}

export interface InterviewSession {
  _id?: string;
  /** Public UUID. */
  id: string;
  roleId: string;
  seniority: Seniority;
  mode: InterviewMode;
  messages: Message[];
  startedAt: Date;
  endedAt: Date | null;
  isComplete: boolean;
  questionCount: number;
  /** Tavus CVI conversation id (video mode) — used for cleanup. */
  tavusConversationId?: string;
  /** Daily.co room URL the video client joins (video mode). */
  tavusConversationUrl?: string;
}

export interface QuestionBreakdown {
  questionIndex: number;
  question: string;
  yourAnswer: string;
  /** 0-10. */
  score: number;
  feedback: string;
  modelAnswer: string;
  /** Unix milliseconds, from the transcript. */
  timestamp: number;
}

export interface RecommendedResource {
  title: string;
  url: string;
  reason: string;
}

export interface ReportScores {
  technicalDepth: number;
  communicationClarity: number;
  problemSolving: number;
}

export interface InterviewReport {
  _id?: string;
  sessionId: string;
  roleId: string;
  seniority: Seniority;
  /** 0-100. */
  overallScore: number;
  scores: ReportScores;
  /** 1-2 sentence overall assessment. */
  verdict: string;
  /** 12-word-max magazine-style summary line. */
  headline: string;
  questionBreakdown: QuestionBreakdown[];
  /** 3-5 specific strengths. */
  strengths: string[];
  /** 3-5 concrete areas to improve. */
  improvements: string[];
  recommendedResources: RecommendedResource[];
  durationMinutes: number;
  generatedAt: Date;
}

/* ---- API payloads -------------------------------------------------- */

export interface StartInterviewRequest {
  roleId: string;
  seniority: Seniority;
  mode: InterviewMode;
}

export interface StartInterviewResponse {
  sessionId: string;
  /** Daily.co room URL when a Tavus video conversation was created. */
  tavusUrl?: string | null;
}

export interface SendMessageRequest {
  sessionId: string;
  userMessage: string;
}

export interface EndInterviewRequest {
  sessionId: string;
}

export interface EndInterviewResponse {
  reportId: string;
}

/** Server-Sent Event payload streamed from /api/interview/message. */
export interface StreamEvent {
  chunk?: string;
  done?: boolean;
  fullText?: string;
  isComplete?: boolean;
  error?: string;
}
