/**
 * Shared Gemini client adapter using Google's OpenAI-compatible endpoint.
 * Backed by centralized geminiService to ensure unified configuration,
 * token safeguarding, and error handling across all callers.
 */
const geminiService = require('../services/geminiService');

function getApiKey() {
  return geminiService.getApiKey();
}

function getModel() {
  return geminiService.getModel();
}

function getOpenAI() {
  const rawClient = geminiService.getClient();

  // Return a proxy that intercepts chat.completions.create to enforce model selection
  // and ensure Gemini reasoning models always have sufficient token headroom.
  return new Proxy(rawClient, {
    get(target, prop) {
      if (prop === 'chat') {
        return {
          ...target.chat,
          completions: {
            ...target.chat.completions,
            create: async function (params, ...rest) {
              const modelToUse = params.model || getModel();
              const requestedTokens = params.max_tokens || params.max_completion_tokens;
              const safeMaxTokens = requestedTokens ? Math.max(1000, requestedTokens) : 2048;

              const response = await target.chat.completions.create(
                {
                  ...params,
                  model: modelToUse,
                  max_tokens: safeMaxTokens,
                },
                ...rest
              );

              const content = response?.choices?.[0]?.message?.content;
              if (typeof content !== 'string' || !content.trim()) {
                const finishReason = response?.choices?.[0]?.finish_reason;
                const err = new Error(
                  `Gemini returned empty message content (finish_reason: ${finishReason || 'unknown'}). This may indicate the token limit was consumed by reasoning.`
                );
                err.statusCode = 502;
                err.code = 'EMPTY_AI_RESPONSE';
                err.finishReason = finishReason;
                throw err;
              }
              return response;
            },
          },
        };
      }
      return target[prop];
    },
  });
}

/** Proxy so existing `openai.chat.completions.create(...)` call sites keep working seamlessly. */
const openai = new Proxy(
  {},
  {
    get(_target, prop) {
      return getOpenAI()[prop];
    },
  }
);

module.exports = { getOpenAI, openai, getApiKey, getModel };
