import { execSync } from 'child_process';

function getGitCommitSha(): string {
  if (process.env.RENDER_GIT_COMMIT) {
    return process.env.RENDER_GIT_COMMIT.slice(0, 7);
  }
  if (process.env.EAS_BUILD_GIT_COMMIT_HASH) {
    return process.env.EAS_BUILD_GIT_COMMIT_HASH.slice(0, 7);
  }
  if (process.env.GIT_COMMIT) {
    return process.env.GIT_COMMIT.slice(0, 7);
  }
  try {
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', timeout: 1500 }).trim();
    if (sha) return sha;
  } catch {}
  return 'unknown';
}

function getFormattedDate(): string {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return '2026-11-13';
  }
}

export const PROMPT_VERSION = `${getFormattedDate()}.coach-context-v2.${getGitCommitSha()}`;

