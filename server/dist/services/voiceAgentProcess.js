"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceAgentProcess = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class VoiceAgentProcess {
    static workerChild = null;
    static consoleChild = null;
    static consoleStartedAt = null;
    static isConsoleShuttingDown = false;
    static recentTranscriptEvents = [];
    static lastReadOffset = 0;
    /**
     * Resolves the voice-agent directory reliably across dev (src) and prod (dist) environments.
     */
    static getVoiceAgentDir() {
        const candidates = [
            path_1.default.resolve(__dirname, '../../voice-agent'),
            path_1.default.resolve(__dirname, '../voice-agent'),
            path_1.default.resolve(process.cwd(), 'voice-agent'),
            path_1.default.resolve(process.cwd(), 'server/voice-agent'),
        ];
        for (const dir of candidates) {
            if (fs_1.default.existsSync(path_1.default.join(dir, 'agent.py'))) {
                return dir;
            }
        }
        return null;
    }
    /**
     * Starts the background LiveKit worker daemon (`uv run agent.py dev`).
     */
    static start() {
        if (this.workerChild && !this.workerChild.killed) {
            console.log('[VoiceAgentProcess] Background worker daemon is already running (PID:', this.workerChild.pid, ')');
            return;
        }
        const agentDir = this.getVoiceAgentDir();
        if (!agentDir) {
            console.warn('[VoiceAgentProcess] Could not locate server/voice-agent directory. Skipping worker daemon.');
            return;
        }
        const livekitUrl = process.env.LIVEKIT_URL;
        const sarvamKey = process.env.SARVAM_API_KEY;
        if (!livekitUrl || !sarvamKey) {
            console.warn('[VoiceAgentProcess] LIVEKIT_URL or SARVAM_API_KEY missing in environment.');
            return;
        }
        console.log(`[VoiceAgentProcess] Launching LiveKit + Sarvam AI background worker in ${agentDir}...`);
        try {
            this.workerChild = (0, child_process_1.spawn)('uv', ['run', 'agent.py', 'dev'], {
                cwd: agentDir,
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1',
                },
                shell: process.platform === 'win32',
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            console.log(`[VoiceAgentProcess] Worker daemon spawned (PID: ${this.workerChild.pid})`);
            this.workerChild.stdout?.on('data', (data) => {
                const lines = data.toString().trim().split('\n');
                for (const line of lines) {
                    if (line.trim())
                        console.log(`[LiveKit-Worker] ${line.trim()}`);
                }
            });
            this.workerChild.stderr?.on('data', (data) => {
                const text = data.toString().trim();
                if (text)
                    console.log(`[LiveKit-Worker] ${text}`);
            });
            this.workerChild.on('close', () => {
                this.workerChild = null;
            });
        }
        catch (err) {
            console.error('[VoiceAgentProcess] Failed to launch worker daemon:', err?.message || err);
        }
    }
    /**
     * Starts the LiveKit + Sarvam AI Voice Agent in direct CONSOLE mode (`uv run agent.py console`).
     * Triggered automatically when the mic button AI call is pressed in HealthFreak.
     * Directly captures audio from the system microphone and streams Sarvam AI responses to speakers with sub-second latency!
     */
    static startConsole() {
        if (this.consoleChild && !this.consoleChild.killed) {
            console.log(`[VoiceAgentProcess] Console AI Agent is already running (PID: ${this.consoleChild.pid})`);
            return {
                success: true,
                pid: this.consoleChild.pid,
                message: 'Console AI Agent is already active',
            };
        }
        const agentDir = this.getVoiceAgentDir();
        if (!agentDir) {
            return {
                success: false,
                message: 'server/voice-agent directory not found',
            };
        }
        console.log(`\n============================================================`);
        console.log(`[MIC BUTTON PRESSED]: Launching Standalone LiveKit + Sarvam AI Console Agent...`);
        console.log(`Directory: ${agentDir}`);
        console.log(`Command: uv run agent.py console`);
        console.log(`============================================================\n`);
        this.isConsoleShuttingDown = false;
        this.consoleStartedAt = Date.now();
        try {
            this.consoleChild = (0, child_process_1.spawn)('uv', ['run', 'agent.py', 'console'], {
                cwd: agentDir,
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1',
                },
                shell: process.platform === 'win32',
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            const pid = this.consoleChild.pid;
            console.log(`[VoiceAgentProcess] Console AI Agent started successfully with PID ${pid}`);
            this.consoleChild.stdout?.on('data', (data) => {
                const lines = data.toString().trim().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        console.log(`[Console-Agent] ${line.trim()}`);
                        this.parseOutputForTranscripts(line.trim());
                    }
                }
            });
            this.consoleChild.stderr?.on('data', (data) => {
                const text = data.toString().trim();
                if (text) {
                    console.log(`[Console-Agent] ${text}`);
                    this.parseOutputForTranscripts(text);
                }
            });
            this.consoleChild.on('close', (code, signal) => {
                if (!this.isConsoleShuttingDown) {
                    console.warn(`[VoiceAgentProcess] Console Agent ended (code: ${code}, signal: ${signal})`);
                }
                else {
                    console.log(`[VoiceAgentProcess] Console Agent closed cleanly.`);
                }
                this.consoleChild = null;
                this.consoleStartedAt = null;
            });
            return {
                success: true,
                pid,
                message: 'LiveKit + Sarvam AI Console Agent launched successfully',
            };
        }
        catch (err) {
            console.error('[VoiceAgentProcess] Error starting console agent:', err?.message || err);
            return {
                success: false,
                message: err?.message || 'Failed to start console agent',
            };
        }
    }
    /**
     * Stops the active Console AI Agent process immediately and frees audio devices.
     */
    static stopConsole() {
        if (!this.consoleChild) {
            return { success: true, message: 'No console agent was running' };
        }
        this.isConsoleShuttingDown = true;
        const pid = this.consoleChild.pid;
        console.log(`[VoiceAgentProcess] Terminating Console AI Agent (PID: ${pid})...`);
        try {
            if (process.platform === 'win32' && pid) {
                (0, child_process_1.spawn)('taskkill', ['/pid', String(pid), '/f', '/t'], { stdio: 'ignore' });
            }
            else {
                this.consoleChild.kill('SIGTERM');
            }
        }
        catch (err) {
            console.warn('[VoiceAgentProcess] Termination note:', err?.message || err);
        }
        this.consoleChild = null;
        this.consoleStartedAt = null;
        return { success: true, message: 'Console AI Agent terminated cleanly' };
    }
    /**
     * Reads latest transcripts from `transcripts.jsonl` written by `agent.py`.
     */
    static getLatestTranscripts(since = 0) {
        const agentDir = this.getVoiceAgentDir();
        if (!agentDir)
            return this.recentTranscriptEvents;
        const logPath = path_1.default.join(agentDir, 'transcripts.jsonl');
        if (!fs_1.default.existsSync(logPath))
            return this.recentTranscriptEvents;
        try {
            const content = fs_1.default.readFileSync(logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(Boolean);
            const events = [];
            // Read entries and filter by since
            const recentLines = lines.slice(-25);
            for (const line of recentLines) {
                try {
                    const parsed = JSON.parse(line);
                    if (!since || (parsed.timestamp && parsed.timestamp > since)) {
                        events.push(parsed);
                    }
                }
                catch { }
            }
            return events;
        }
        catch {
            return this.recentTranscriptEvents;
        }
    }
    static parseOutputForTranscripts(text) {
        // Detect assistant or user transcripts logged to console
        if (text.includes('user_transcript') || text.includes('user:')) {
            try {
                const match = text.match(/"user_transcript":\s*"([^"]+)"/);
                if (match && match[1]) {
                    this.recentTranscriptEvents.push({
                        timestamp: Date.now() / 1000,
                        user_transcript: match[1],
                    });
                }
            }
            catch { }
        }
    }
    /**
     * Returns current process status for health and status endpoints.
     */
    static getStatus() {
        return {
            workerRunning: Boolean(this.workerChild && !this.workerChild.killed),
            workerPid: this.workerChild?.pid,
            consoleRunning: Boolean(this.consoleChild && !this.consoleChild.killed),
            consolePid: this.consoleChild?.pid,
            consoleUptimeSec: this.consoleStartedAt ? Math.round((Date.now() - this.consoleStartedAt) / 1000) : 0,
        };
    }
    /**
     * Cleanup on server shutdown.
     */
    static stopAll() {
        this.stopConsole();
        if (this.workerChild) {
            try {
                if (process.platform === 'win32' && this.workerChild.pid) {
                    (0, child_process_1.spawn)('taskkill', ['/pid', String(this.workerChild.pid), '/f', '/t'], { stdio: 'ignore' });
                }
                else {
                    this.workerChild.kill('SIGTERM');
                }
            }
            catch { }
            this.workerChild = null;
        }
    }
}
exports.VoiceAgentProcess = VoiceAgentProcess;
// Global cleanup hooks
process.once('exit', () => VoiceAgentProcess.stopAll());
process.once('SIGINT', () => {
    VoiceAgentProcess.stopAll();
    process.exit(0);
});
process.once('SIGTERM', () => {
    VoiceAgentProcess.stopAll();
    process.exit(0);
});
