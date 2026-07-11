import mongoose, { Schema, type Model } from "mongoose";
import type {
  CodeLanguage,
  DsaDifficulty,
  InterviewMode,
  InterviewType,
  Message,
  QuestionBreakdown,
  RecommendedResource,
  ReportScores,
  Seniority,
} from "@/types";

/* ============================================================ *
 * MongoDB connection (cached singleton) + Mongoose models.
 * ============================================================ */

const MONGODB_URI = process.env.MONGODB_URI;

/** True when a MongoDB connection string is configured. */
export function isDbConfigured(): boolean {
  return Boolean(MONGODB_URI && MONGODB_URI.trim().length > 0);
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

/* Reuse the connection across hot reloads / serverless invocations. */
declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache =
  globalThis._mongooseCache ?? { conn: null, promise: null };

if (!globalThis._mongooseCache) {
  globalThis._mongooseCache = cached;
}

/**
 * Connect to MongoDB using a cached singleton connection.
 * Throws if `MONGODB_URI` is not configured.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not defined — add it to .env.local (see .env.local.example).",
    );
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

/* ============================================================ *
 * Session model
 * ============================================================ */

export interface SessionDoc {
  id: string;
  roleId: string;
  seniority: Seniority;
  mode: InterviewMode;
  interviewType: InterviewType;
  dsaDifficulty?: DsaDifficulty;
  language?: CodeLanguage;
  durationMinutes: number;
  messages: Message[];
  startedAt: Date;
  endedAt: Date | null;
  isComplete: boolean;
  questionCount: number;
  tavusConversationId?: string;
  tavusConversationUrl?: string;
}

const MessageSchema = new Schema<Message>(
  {
    role: { type: String, enum: ["assistant", "user"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Number, required: true },
    questionIndex: { type: Number },
  },
  { _id: false },
);

const SessionSchema = new Schema<SessionDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    roleId: { type: String, required: true },
    seniority: {
      type: String,
      enum: ["junior", "mid", "senior"],
      required: true,
    },
    mode: { type: String, enum: ["voice", "text"], required: true },
    interviewType: {
      type: String,
      enum: ["role", "dsa"],
      required: true,
      default: "role",
    },
    dsaDifficulty: {
      type: String,
      enum: ["very-easy", "easy", "medium", "hard"],
    },
    language: {
      type: String,
      enum: ["python", "javascript", "typescript", "java", "cpp", "go"],
    },
    durationMinutes: { type: Number, required: true, default: 30 },
    messages: { type: [MessageSchema], default: [] },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
    isComplete: { type: Boolean, default: false },
    questionCount: { type: Number, default: 0 },
    tavusConversationId: { type: String },
    tavusConversationUrl: { type: String },
  },
  { id: false, timestamps: false },
);

export const SessionModel: Model<SessionDoc> =
  (mongoose.models.Session as Model<SessionDoc> | undefined) ??
  mongoose.model<SessionDoc>("Session", SessionSchema);

/* ============================================================ *
 * Report model
 * ============================================================ */

export interface ReportDoc {
  sessionId: string;
  roleId: string;
  seniority: Seniority;
  overallScore: number;
  scores: ReportScores;
  verdict: string;
  headline: string;
  questionBreakdown: QuestionBreakdown[];
  strengths: string[];
  improvements: string[];
  recommendedResources: RecommendedResource[];
  durationMinutes: number;
  generatedAt: Date;
}

const QuestionBreakdownSchema = new Schema<QuestionBreakdown>(
  {
    questionIndex: { type: Number, required: true },
    question: { type: String, required: true },
    yourAnswer: { type: String, required: true },
    score: { type: Number, required: true },
    feedback: { type: String, required: true },
    modelAnswer: { type: String, required: true },
    timestamp: { type: Number, required: true },
  },
  { _id: false },
);

const ResourceSchema = new Schema<RecommendedResource>(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { _id: false },
);

const ReportSchema = new Schema<ReportDoc>(
  {
    sessionId: { type: String, required: true, index: true },
    roleId: { type: String, required: true },
    seniority: {
      type: String,
      enum: ["junior", "mid", "senior"],
      required: true,
    },
    overallScore: { type: Number, required: true },
    scores: {
      technicalDepth: { type: Number, required: true },
      communicationClarity: { type: Number, required: true },
      problemSolving: { type: Number, required: true },
    },
    verdict: { type: String, required: true },
    headline: { type: String, required: true },
    questionBreakdown: { type: [QuestionBreakdownSchema], default: [] },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    recommendedResources: { type: [ResourceSchema], default: [] },
    durationMinutes: { type: Number, required: true, default: 0 },
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

export const ReportModel: Model<ReportDoc> =
  (mongoose.models.Report as Model<ReportDoc> | undefined) ??
  mongoose.model<ReportDoc>("Report", ReportSchema);
