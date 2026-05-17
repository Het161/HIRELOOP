import { buildInterviewerSystemPrompt } from "@/lib/prompts";
import { GROQ_MODEL } from "@/services/ai.service";
import type { Role, Seniority } from "@/types";

/* ============================================================ *
 * Tavus CVI integration — a real-time photorealistic video
 * interviewer. Tavus handles the face + voice + WebRTC; HireLoop's
 * Groq (Llama 3.3) brain is plugged in via Tavus's custom-LLM
 * feature, which lives on the PERSONA's `layers.llm` (verified
 * against the live Tavus API — it is not a conversation property).
 * ============================================================ */

const TAVUS_API = "https://tavusapi.com/v2";

export interface TavusConversation {
  conversationId: string;
  conversationUrl: string;
  status: string;
}

interface CreateConversationParams {
  role: Role;
  seniority: Seniority;
  /** Public URL Tavus calls for each interview turn (our Groq endpoint). */
  customLlmUrl: string;
}

/**
 * Create a per-interview persona wired to our Groq custom-LLM endpoint.
 * A fresh persona per interview is required so Tavus routes each
 * conversation's LLM calls to that session's endpoint.
 */
async function createPersona(
  apiKey: string,
  replicaId: string,
  params: CreateConversationParams,
): Promise<string> {
  const res = await fetch(`${TAVUS_API}/personas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      persona_name: `HireLoop · ${params.role.name} · ${params.seniority}`,
      pipeline_mode: "full",
      system_prompt: buildInterviewerSystemPrompt(params.role, params.seniority),
      default_replica_id: replicaId,
      layers: {
        llm: {
          model: GROQ_MODEL,
          base_url: params.customLlmUrl,
          api_key: "unused", // our endpoint does not validate
          speculative_inference: true, // Tavus renders video before the LLM finishes
        },
        // Snappy turn-taking — reply quickly once the candidate pauses
        // (the default patience adds several seconds of dead air).
        conversational_flow: {
          turn_taking_patience: "low",
          turn_detection_model: "sparrow-1",
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Tavus persona create failed: ${await res.text()}`);
  }
  const data = (await res.json()) as { persona_id?: string };
  if (!data.persona_id) {
    throw new Error("Tavus persona response missing persona_id");
  }
  return data.persona_id;
}

/** Create a Tavus video conversation. Returns the Daily.co room URL. */
export async function createTavusConversation(
  params: CreateConversationParams,
): Promise<TavusConversation> {
  const apiKey = process.env.TAVUS_API_KEY;
  const replicaId = process.env.TAVUS_REPLICA_ID;
  if (!apiKey) throw new Error("TAVUS_API_KEY not configured");
  if (!replicaId) throw new Error("TAVUS_REPLICA_ID not configured");

  const personaId = await createPersona(apiKey, replicaId, params);

  const res = await fetch(`${TAVUS_API}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      replica_id: replicaId,
      persona_id: personaId,
      conversation_name: `HireLoop · ${params.role.name} · ${params.seniority}`,
      conversational_context: `You are conducting a ${params.seniority}-level ${params.role.name} interview. The candidate is about to join — begin warmly when they appear on camera.`,
      custom_greeting: `Hi, thanks for joining. I'll be running your ${params.role.name} interview today. Whenever you're ready, let's get started.`,
      properties: {
        max_call_duration: 1800,
        participant_left_timeout: 30,
        participant_absent_timeout: 60,
        enable_recording: false,
        enable_closed_captions: true,
        apply_greenscreen: false,
        language: "english",
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Tavus conversation create failed: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    conversation_id?: string;
    conversation_url?: string;
    status?: string;
  };
  if (!data.conversation_id || !data.conversation_url) {
    throw new Error("Tavus conversation response missing id/url");
  }
  return {
    conversationId: data.conversation_id,
    conversationUrl: data.conversation_url,
    status: data.status ?? "active",
  };
}

/** End a Tavus conversation — frees the Daily room and the quota. */
export async function endTavusConversation(
  conversationId: string,
): Promise<void> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) return;
  await fetch(`${TAVUS_API}/conversations/${conversationId}/end`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
  }).catch(() => {
    /* best-effort cleanup */
  });
}
