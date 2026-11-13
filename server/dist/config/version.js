"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPT_VERSION = void 0;
const child_process_1 = require("child_process");
function getGitCommitSha() {
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
        const sha = (0, child_process_1.execSync)('git rev-parse --short HEAD', { encoding: 'utf-8', timeout: 1500 }).trim();
        if (sha)
            return sha;
    }
    catch { }
    return 'unknown';
}
function getFormattedDate() {
    try {
        return new Date().toISOString().slice(0, 10);
    }
    catch {
        return '2026-11-13';
    }
}
exports.PROMPT_VERSION = `${getFormattedDate()}.coach-context-v2.${getGitCommitSha()}`;
