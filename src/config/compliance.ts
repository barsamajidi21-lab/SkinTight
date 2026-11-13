/**
 * Compliance and Clinical Safety Configuration Flags
 * 
 * PHASE 3.5 COMPLIANCE SAFETY SWITCH:
 * AI_SUMMARY_ENABLED controls whether pre-visit intake text summaries are
 * generated via Vertex AI (true) or via the local deterministic template (false).
 * 
 * Default: false (Safety switch engaged until Vertex AI verification is finalized).
 */
export const AI_SUMMARY_ENABLED = false;

/**
 * Google Cloud Vertex AI Configuration
 * Region: us-central1
 * Project: gen-lang-client-0650598239
 */
export const VERTEX_AI_CONFIG = {
  projectId: "gen-lang-client-0650598239",
  location: "us-central1",
  model: "gemini-2.5-flash",
  // Prompt/context caching explicitly disabled
  disableDataCaching: true,
};
