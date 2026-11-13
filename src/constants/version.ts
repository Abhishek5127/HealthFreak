export const PROMPT_VERSION =
  process.env.EXPO_PUBLIC_PROMPT_VERSION ||
  (process.env.EAS_BUILD_GIT_COMMIT_HASH
    ? `${new Date().toISOString().slice(0, 10)}.coach-context-v2.${process.env.EAS_BUILD_GIT_COMMIT_HASH.slice(0, 7)}`
    : '2026-11-13.coach-context-v2.unknown');

