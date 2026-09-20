"use client";

/* ============================================================ *
 * ReportPDF — @react-pdf/renderer document, terminal aesthetic.
 * Dark bg #0d0e0c, paper text #d4d4cf, green + terracotta accents.
 * JetBrains Mono (regular + medium) + IBM Plex Sans Italic from
 * Google Fonts .ttf via jsDelivr. Props + exported name unchanged.
 * ============================================================ */

import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatDate, scoreBand, titleCase } from "@/lib/utils";
import type { InterviewReport } from "@/types";

/* ------------------------------------------------------------------ *
 * Font registration — self-hosted .ttf files from /public/fonts.
 *
 * These were WOFF files loaded from a CDN, which broke PDF export
 * outright: react-pdf's font parser reads TTF only and threw
 * "Offset is outside the bounds of the DataView" on every download.
 * Serving TTFs from our own origin also means the export keeps working
 * on a venue network that blocks or throttles third-party CDNs.
 * ------------------------------------------------------------------ */

const FONT_BASE = "/fonts";

Font.register({
  family: "JetBrains Mono",
  fonts: [
    {
      src: `${FONT_BASE}/JetBrainsMono-Regular.ttf`,
      fontWeight: 400,
      fontStyle: "normal",
    },
    {
      src: `${FONT_BASE}/JetBrainsMono-Medium.ttf`,
      fontWeight: 500,
      fontStyle: "normal",
    },
  ],
});

Font.register({
  family: "IBM Plex Sans",
  fonts: [
    {
      src: `${FONT_BASE}/IBMPlexSans-Italic.ttf`,
      fontWeight: 400,
      fontStyle: "italic",
    },
  ],
});

// Disable hyphenation — cleaner terminal line breaks.
Font.registerHyphenationCallback((word) => [word]);

/* ------------------------------------------------------------------ *
 * Theme palette — terminal tokens
 * ------------------------------------------------------------------ */

const C = {
  bg: "#0d0e0c",
  surface: "#16181a",
  paper: "#d4d4cf",
  muted: "#6b7066",
  dim: "#3d423a",
  border: "#2a2d28",
  accent: "#7ec96f",
  accent2: "#d97757",
  danger: "#c8553d",
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function padIndex(i: number): string {
  return String(i + 1).padStart(2, "0");
}

const SEGS = 25;

function barChars(value: number): { filled: string; empty: string } {
  const fill = Math.round((value / 100) * SEGS);
  return {
    filled: "█".repeat(fill),
    empty: "░".repeat(SEGS - fill),
  };
}

function subScoreColor(score: number): string {
  if (score >= 80) return C.accent;
  if (score >= 60) return C.paper;
  return C.accent2;
}

function overallScoreColor(score: number): string {
  if (score >= 75) return C.accent;
  if (score >= 50) return C.accent2;
  return C.danger;
}

function qScoreColor(score: number): string {
  if (score >= 8) return C.accent;
  if (score >= 6) return C.paper;
  return C.accent2;
}

/* ------------------------------------------------------------------ *
 * Styles
 * ------------------------------------------------------------------ */

const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    color: C.paper,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
    fontFamily: "JetBrains Mono",
    fontSize: 10,
    lineHeight: 1.6,
  },

  /* Action bar */
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 10,
    marginBottom: 28,
  },
  actionBarLeft: {
    fontSize: 10,
    color: C.muted,
  },
  actionBarRight: {
    fontSize: 9,
    color: C.muted,
    letterSpacing: 1,
  },
  /* Logo in the action bar — height set, width follows the 1664:364 ratio. */
  brandMark: {
    height: 11,
    width: 50,
  },
  /* Larger logo lockup in the footer. */
  footerMark: {
    height: 14,
    width: 64,
  },

  /* Prompt line */
  promptLine: {
    fontSize: 10,
    color: C.dim,
    marginBottom: 18,
  },

  /* Score frame — double border simulation via thick border */
  scoreFrame: {
    borderWidth: 3,
    borderColor: C.border,
    borderStyle: "solid",
    maxWidth: 400,
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 32,
    marginBottom: 18,
  },
  scoreBig: {
    fontFamily: "JetBrains Mono",
    fontWeight: 500,
    fontSize: 72,
    lineHeight: 1,
  },
  scoreSlash: {
    fontFamily: "JetBrains Mono",
    fontSize: 24,
    color: C.dim,
  },
  scoreDivider: {
    fontSize: 10,
    color: C.dim,
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0,
  },
  scoreBand: {
    fontSize: 11,
    color: C.muted,
  },

  /* Editorial headline */
  heroHeadline: {
    fontFamily: "IBM Plex Sans",
    fontStyle: "italic",
    fontSize: 18,
    color: C.paper,
    textAlign: "center",
    lineHeight: 1.5,
    marginBottom: 24,
  },

  /* Divider */
  divider: {
    fontSize: 10,
    color: C.dim,
    marginVertical: 20,
    letterSpacing: 0,
  },

  /* Sub-scores section */
  promptLabel: {
    fontSize: 10,
    color: C.dim,
    marginBottom: 12,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  barLabel: {
    width: 110,
    fontSize: 10,
    color: C.muted,
  },
  barFilled: {
    fontSize: 10,
  },
  barEmpty: {
    fontSize: 10,
    color: C.dim,
  },
  barValue: {
    fontSize: 10,
    marginLeft: 6,
  },

  /* Section heading */
  sectionHeading: {
    fontSize: 11,
    color: C.paper,
    marginBottom: 12,
  },
  sectionDim: {
    fontSize: 11,
    color: C.dim,
  },

  /* Verdict */
  verdictBox: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  verdictTitle: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 8,
  },
  verdictText: {
    fontFamily: "IBM Plex Sans",
    fontStyle: "italic",
    fontSize: 13,
    color: C.paper,
    lineHeight: 1.55,
  },

  /* Strengths / Improvements */
  twoCol: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 4,
  },
  col: {
    flex: 1,
  },
  treeName: {
    fontSize: 10,
    marginBottom: 4,
  },
  treeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginBottom: 3,
  },
  treeBranch: {
    fontSize: 10,
    color: C.dim,
    width: 14,
  },
  treeIndex: {
    fontSize: 10,
    width: 16,
  },
  treeText: {
    flex: 1,
    fontSize: 10,
    color: C.muted,
    lineHeight: 1.5,
  },

  /* Question cards */
  qCard: {
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 8,
  },
  qHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  qLabel: {
    fontSize: 9,
    color: C.muted,
  },
  qScore: {
    fontSize: 9,
  },
  qQuestion: {
    fontSize: 11,
    color: C.accent2,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  qSubLabel: {
    fontSize: 8,
    color: C.dim,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  qAnswer: {
    fontSize: 10,
    color: C.muted,
    lineHeight: 1.5,
    marginBottom: 6,
    paddingLeft: 10,
  },
  qFeedback: {
    fontSize: 10,
    color: C.paper,
    lineHeight: 1.5,
    marginBottom: 6,
    paddingLeft: 10,
  },
  qModelBox: {
    borderLeftWidth: 1,
    borderLeftColor: C.border,
    paddingLeft: 10,
    marginTop: 4,
  },
  qModel: {
    fontSize: 10,
    color: C.muted,
    lineHeight: 1.5,
  },

  /* Resources */
  resourceRow: {
    marginBottom: 10,
  },
  resourceUrl: {
    fontSize: 10,
    color: C.paper,
    lineHeight: 1.4,
  },
  resourceReason: {
    fontSize: 9,
    color: C.muted,
    paddingLeft: 16,
    lineHeight: 1.4,
  },

  /* Footer */
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerBrand: {
    fontFamily: "JetBrains Mono",
    fontSize: 12,
    color: C.paper,
  },
  footerDate: {
    fontSize: 9,
    color: C.muted,
  },

  /* Page number */
  pageNum: {
    position: "absolute",
    bottom: 24,
    right: 52,
    fontSize: 8,
    color: C.muted,
  },
});

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export interface ReportPDFProps {
  report: InterviewReport;
  roleName: string;
}

export function ReportPDF({ report, roleName }: ReportPDFProps) {
  const subScores: { label: string; value: number }[] = [
    { label: "technical depth", value: report.scores.technicalDepth },
    { label: "communication", value: report.scores.communicationClarity },
    { label: "problem solving", value: report.scores.problemSolving },
  ];

  const band = scoreBand(report.overallScore).toLowerCase();
  const scoreColor = overallScoreColor(report.overallScore);

  return (
    <Document
      title={`HireLoop Debrief — ${roleName}`}
      author="HireLoop"
      subject={`Interview debrief for ${roleName} (${titleCase(report.seniority)})`}
    >
      <Page size="A4" style={s.page} wrap>
        {/* 1. Action bar */}
        <View style={s.actionBar}>
          <Text style={s.actionBarLeft}>
            ~/report · id: {report.sessionId}
          </Text>
          {/* The wordmark asset is keyed to transparency, so it sits on
              the page's dark field the same way it does in the app.
              This is react-pdf's Image, not an <img> — it has no alt prop. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/brand/wordmark.png" style={s.brandMark} />
        </View>

        {/* 2. Hero — prompt + score frame + headline */}
        <Text style={s.promptLine}>❯ cat report.json | parse</Text>

        {/* Score frame */}
        <View style={s.scoreFrame}>
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <Text style={[s.scoreBig, { color: scoreColor }]}>
              {report.overallScore}
            </Text>
            <Text style={s.scoreSlash}> / 100</Text>
          </View>
          <Text style={s.scoreDivider}>{"─".repeat(20)}</Text>
          <Text style={s.scoreBand}>{band}</Text>
        </View>

        {/* Editorial headline */}
        <Text style={s.heroHeadline}>{report.headline}</Text>

        {/* Divider */}
        <Text style={s.divider}>{"─".repeat(80)}</Text>

        {/* 3. Sub-scores */}
        <Text style={s.promptLabel}>❯ sub-scores</Text>
        {subScores.map((sub) => {
          const { filled, empty } = barChars(sub.value);
          const col = subScoreColor(sub.value);
          return (
            <View key={sub.label} style={s.barRow}>
              <Text style={s.barLabel}>{sub.label}</Text>
              <Text style={[s.barFilled, { color: col }]}>{filled}</Text>
              <Text style={s.barEmpty}>{empty}</Text>
              <Text style={[s.barValue, { color: col }]}>{sub.value}</Text>
            </View>
          );
        })}

        {/* Divider */}
        <Text style={s.divider}>{"─".repeat(80)}</Text>

        {/* 4. Verdict */}
        <Text style={s.promptLabel}>❯ verdict</Text>
        <View style={s.verdictBox}>
          <Text style={s.verdictTitle}>assessment</Text>
          <Text style={s.verdictText}>{report.verdict}</Text>
        </View>

        {/* Divider */}
        <Text style={s.divider}>{"─".repeat(80)}</Text>

        {/* 5. Strengths + Improvements */}
        <Text style={s.sectionHeading}>
          <Text style={s.sectionDim}>## </Text>
          <Text>{"strengths & improvements"}</Text>
        </Text>
        <View style={s.twoCol}>
          {/* Strengths */}
          <View style={s.col}>
            <Text style={[s.treeName, { color: C.accent }]}>strengths/</Text>
            {report.strengths.map((item, i) => {
              const isLast = i === report.strengths.length - 1;
              return (
                <View key={i} style={s.treeRow} wrap={false}>
                  <Text style={s.treeBranch}>{isLast ? "└─" : "├─"}</Text>
                  <Text style={[s.treeIndex, { color: C.accent }]}>
                    {padIndex(i)}
                  </Text>
                  <Text style={s.treeText}>{item}</Text>
                </View>
              );
            })}
          </View>

          {/* Improvements */}
          <View style={s.col}>
            <Text style={[s.treeName, { color: C.accent2 }]}>
              improvements/
            </Text>
            {report.improvements.map((item, i) => {
              const isLast = i === report.improvements.length - 1;
              return (
                <View key={i} style={s.treeRow} wrap={false}>
                  <Text style={s.treeBranch}>{isLast ? "└─" : "├─"}</Text>
                  <Text style={[s.treeIndex, { color: C.accent2 }]}>
                    {padIndex(i)}
                  </Text>
                  <Text style={s.treeText}>{item}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Divider */}
        <Text style={s.divider}>{"─".repeat(80)}</Text>

        {/* 6. Question breakdown */}
        <Text style={s.sectionHeading}>
          <Text style={s.sectionDim}>## </Text>
          <Text>question-by-question</Text>
        </Text>
        {report.questionBreakdown.map((q, i) => {
          const qColor = qScoreColor(q.score);
          const qLabel = `Q${String(i + 1).padStart(2, "0")}`;
          return (
            <View key={q.questionIndex} style={s.qCard} wrap={false}>
              <View style={s.qHeader}>
                <Text style={s.qLabel}>{qLabel}</Text>
                <Text style={[s.qScore, { color: qColor }]}>
                  score: {q.score}/10
                </Text>
              </View>
              <Text style={s.qQuestion}>{`❯ “${q.question}”`}</Text>
              <Text style={s.qSubLabel}>your answer:</Text>
              <Text style={s.qAnswer}>{q.yourAnswer}</Text>
              <Text style={s.qSubLabel}>feedback:</Text>
              <Text style={s.qFeedback}>{q.feedback}</Text>
              <View style={s.qModelBox}>
                <Text style={s.qSubLabel}>model answer:</Text>
                <Text style={s.qModel}>{q.modelAnswer}</Text>
              </View>
            </View>
          );
        })}

        {/* Divider */}
        <Text style={s.divider}>{"─".repeat(80)}</Text>

        {/* 7. Resources */}
        <Text style={s.sectionHeading}>
          <Text style={s.sectionDim}>## </Text>
          <Text>recommended-reading</Text>
        </Text>
        {report.recommendedResources.map((r, i) => (
          <View key={i} style={s.resourceRow}>
            <Text style={s.resourceUrl}>
              <Text style={{ color: C.accent2 }}>❯ open </Text>
              {r.url}
            </Text>
            <Text style={s.resourceReason}>→ {r.reason}</Text>
          </View>
        ))}

        {/* 8. Footer */}
        <View style={s.footer} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/brand/wordmark.png" style={s.footerMark} />
          <Text style={s.footerDate}>
            Generated {formatDate(report.generatedAt)}
          </Text>
        </View>

        {/* Page number — fixed on every page */}
        <Text
          style={s.pageNum}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export default ReportPDF;
