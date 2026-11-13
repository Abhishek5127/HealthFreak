"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentenceTTSBuffer = exports.SarvamService = void 0;
exports.stripFormulaicOpener = stripFormulaicOpener;
const index_js_1 = require("../config/index.js");
const openerBudget_js_1 = require("../coach/style/openerBudget.js");
function stripFormulaicOpener(text, userName) {
    if (!text)
        return '';
    const det = (0, openerBudget_js_1.detectLeadingOpener)(text, userName);
    return det.hasOpener ? det.remainingText : text.trim();
}
class SarvamService {
    static getApiKey() {
        return (process.env.SARVAM_API_KEY || index_js_1.config.sarvam?.apiKey || '').trim();
    }
    static isConfigured() {
        return !!this.getApiKey();
    }
    /**
     * Transcribes Indian spoken audio (Hindi, English, Hinglish) using Sarvam AI Saaras v3.
     */
    static async transcribeAudio(audioBuffer, mimeType = 'audio/wav') {
        const apiKey = this.getApiKey();
        if (!apiKey || !audioBuffer || audioBuffer.length === 0)
            return '';
        try {
            const cleanMime = (mimeType || 'audio/wav').split(';')[0].trim().toLowerCase();
            let extension = 'audio.wav';
            if (cleanMime.includes('webm')) {
                extension = 'audio.webm';
            }
            else if (cleanMime.includes('mp4') || cleanMime.includes('m4a')) {
                extension = 'audio.m4a';
            }
            else if (cleanMime.includes('mpeg') || cleanMime.includes('mp3')) {
                extension = 'audio.mp3';
            }
            else if (cleanMime.includes('ogg') || cleanMime.includes('opus')) {
                extension = 'audio.ogg';
            }
            else if (cleanMime.includes('aac')) {
                extension = 'audio.aac';
            }
            const form = new FormData();
            form.append('file', new Blob([audioBuffer], { type: cleanMime }), extension);
            form.append('model', 'saaras:v3');
            const response = await fetch('https://api.sarvam.ai/speech-to-text', {
                method: 'POST',
                headers: {
                    'api-subscription-key': apiKey,
                },
                body: form,
            });
            if (!response.ok) {
                const errText = await response.text();
                console.warn(`[SarvamService] STT error (${response.status}):`, errText);
                return '';
            }
            const data = await response.json();
            return (data?.transcript || '').trim();
        }
        catch (err) {
            console.warn('[SarvamService] STT exception:', err?.message || err);
            return '';
        }
    }
    /**
     * Normalizes raw LLM output text for clean, natural phonetic pronunciation by Sarvam Bulbul TTS.
     * Strips markdown, expands measurement units and ranges into spoken words.
     */
    static normalizeForSpokenTTS(raw) {
        if (!raw)
            return '';
        return raw
            // Remove prefixes like "Coach Mack: " or "Assistant: "
            .replace(/^(Coach\s*Mack|Coach\s*Alex|Mack|Alex|Coach|Assistant):\s*/gi, '')
            // Remove markdown asterisks, hashes, backticks, tildes, brackets
            .replace(/[*_#`~[\]]/g, '')
            // Convert number ranges (e.g. "10-12" or "10 - 12") to "10 to 12"
            .replace(/(\d+)\s*[-–—]\s*(\d+)/g, '$1 to $2')
            // Expand common units to natural spoken forms
            .replace(/(\d+)\s*g\b/gi, '$1 grams')
            .replace(/(\d+)\s*kg\b/gi, '$1 kilograms')
            .replace(/(\d+)\s*ml\b/gi, '$1 milliliters')
            .replace(/(\d+)\s*km\b/gi, '$1 kilometers')
            .replace(/(\d+)\s*kcal\b/gi, '$1 calories')
            .replace(/(\d+)\s*min\b/gi, '$1 minutes')
            .replace(/(\d+)\s*sec\b/gi, '$1 seconds')
            // Clean duplicate whitespace and orphan punctuation
            .replace(/\s+/g, ' ')
            .trim();
    }
    /**
     * Generates a conversational Hinglish reply using Sarvam AI's 105B Conversations model.
     */
    static async generateChatReply(params) {
        const apiKey = this.getApiKey();
        if (!apiKey)
            return null;
        const { message, userName = 'friend', conditions = [], memorySnippet = '', activitySnippet = '', synthesizeVoice = true, sessionId, history, } = params;
        const sessionKey = sessionId || 'default';
        const state = openerBudget_js_1.OpenerBudget.getState(sessionKey);
        const openerAllowed = openerBudget_js_1.OpenerBudget.isOpenerAllowed(sessionKey);
        const recentOpeners = state.lastOpenerUsed ? `"${state.lastOpenerUsed}"` : 'none';
        const nameHint = openerAllowed && userName && userName.toLowerCase() !== 'friend'
            ? `\nThis turn you may open with the user's first name (${userName}) or a very short interjection if natural.`
            : '';
        const systemPrompt = `You are Coach Mack, an elite AI Health and Wellness Coach at HealthFreak.
User Profile:
- Known conditions/injuries: ${conditions.join(', ') || 'None'}
- Memory facts: ${memorySnippet || 'None'}
- Physical activity today: ${activitySnippet || 'Not synced'}

Rules:
1. Start directly with the answer. A very short natural interjection or the user's first name may open a reply only rarely, and never in two replies in a row. Recently used openers (vary, reuse rarely): ${recentOpeners}.${nameHint}
2. Length & style: Keep ordinary conversation short (2 to 3 sentences). When user asks for an exercise, routine, or what to do, give a concrete prescription immediately: 3 to 4 exercises with sets and reps/duration plus rest, home-only (up to 5 short sentences allowed).
3. Safety: Urgent-care advice ONLY for red flags (chest pain, breathlessness, fainting, numbness/tingling radiating down an arm or leg, sudden severe pain, trauma). For mild muscle strain or soreness, give safe mobility and strengthening guidance.
4. Suggest 3 short relevant follow-up actions (under 4 words each).
5. Do NOT use emojis, asterisks, bullet points or markdown. Plain spoken conversational text only.`;
        const cleanHistory = history && history.length > 0
            ? openerBudget_js_1.OpenerBudget.sanitizeHistory(history.slice(-10), userName)
                .map((h) => ({
                role: h.role === 'coach' ? 'assistant' : h.role,
                content: (h.content || h.text || '').trim(),
            }))
                .filter((h) => h.content.length > 0)
            : [];
        try {
            const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': apiKey,
                },
                body: JSON.stringify({
                    model: index_js_1.config.sarvam?.chatModel || 'sarvam-105b-conversations',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...cleanHistory,
                        { role: 'user', content: message },
                    ],
                    temperature: 0.6,
                    max_tokens: 320,
                }),
            });
            if (!response.ok) {
                const errText = await response.text();
                console.warn(`[SarvamService] Chat error (status ${response.status}):`, errText);
                return null;
            }
            const data = await response.json();
            const rawReply = data?.choices?.[0]?.message?.content?.trim();
            if (!rawReply)
                return null;
            const normalizedReply = this.normalizeForSpokenTTS(rawReply);
            const processed = openerBudget_js_1.OpenerBudget.processReply({
                sessionId: sessionKey,
                text: normalizedReply,
                userName,
                path: '/chat',
                lang: 'hi',
            });
            const cleanReply = processed.cleanedText;
            const suggestions = this.generateSuggestions(message);
            let audioBase64;
            if (synthesizeVoice) {
                audioBase64 = await this.synthesizeSpeech(cleanReply);
            }
            return {
                text: cleanReply,
                suggestions,
                audioBase64,
            };
        }
        catch (err) {
            console.warn('[SarvamService] Chat completion exception:', err?.message || err);
            return null;
        }
    }
    /**
     * Genuine Server-Sent Events (SSE) streaming chat completion with Sarvam 105B Conversations.
     */
    static async streamChatCompletion(params) {
        const apiKey = this.getApiKey();
        if (!apiKey)
            throw new Error('Sarvam API key not configured');
        const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': apiKey,
            },
            body: JSON.stringify({
                model: index_js_1.config.sarvam?.chatModel || 'sarvam-105b-conversations',
                messages: params.messages,
                temperature: 0.6,
                max_tokens: params.maxTokens || 320,
                stream: true,
            }),
            signal: params.abortSignal,
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Sarvam streaming error (${response.status}): ${errText}`);
        }
        if (!response.body) {
            throw new Error('Sarvam streaming response body is empty');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let buffer = '';
        try {
            while (true) {
                if (params.abortSignal?.aborted) {
                    await reader.cancel();
                    break;
                }
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:'))
                        continue;
                    const dataPayload = trimmed.slice(5).trim();
                    if (dataPayload === '[DONE]')
                        continue;
                    try {
                        const parsed = JSON.parse(dataPayload);
                        const delta = parsed.choices?.[0]?.delta?.content || '';
                        if (delta) {
                            fullText += delta;
                            params.onToken(delta);
                        }
                    }
                    catch {
                        // Partial JSON chunk, will be resolved with next line
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
        return fullText;
    }
    /**
     * Synthesizes audio using Sarvam AI Bulbul neural TTS (single consistent identity: Shubh).
     */
    static async synthesizeSpeech(text, speaker) {
        const apiKey = this.getApiKey();
        if (!apiKey || !text || !text.trim())
            return undefined;
        const spokenText = this.normalizeForSpokenTTS(text);
        if (!spokenText)
            return undefined;
        try {
            const response = await fetch('https://api.sarvam.ai/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': apiKey,
                },
                body: JSON.stringify({
                    inputs: [spokenText],
                    target_language_code: 'hi-IN',
                    speaker: speaker || index_js_1.config.sarvam?.speaker || 'shubh',
                    pitch: 0,
                    pace: 1.0,
                    loudness: 1.5,
                    speech_sample_rate: 22050,
                    enable_preprocessing: true,
                    model: index_js_1.config.sarvam?.ttsModel || 'bulbul:v3',
                }),
            });
            if (!response.ok) {
                const errText = await response.text();
                console.warn(`[SarvamService] TTS error (${response.status}):`, errText);
                return undefined;
            }
            const data = await response.json();
            if (data?.audios && Array.isArray(data.audios) && data.audios.length > 0) {
                return data.audios[0];
            }
        }
        catch (err) {
            console.warn('[SarvamService] TTS synthesis exception:', err?.message || err);
        }
        return undefined;
    }
    /**
     * Generates contextual follow-up chips based on user query topic.
     */
    static generateSuggestions(message) {
        const lower = message.toLowerCase();
        if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
            return ['Gentle leg stretch', 'Rest day routine', 'Log pain severity'];
        }
        if (lower.includes('dinner') || lower.includes('khana') || lower.includes('diet') || lower.includes('eat')) {
            return ['High protein dinner', 'Low carb ideas', 'Log my dinner'];
        }
        if (lower.includes('workout') || lower.includes('exercise') || lower.includes('gym')) {
            return ['20 min brisk walk', 'Mobility routine', 'Log workout'];
        }
        if (lower.includes('sleep') || lower.includes('tired') || lower.includes('thak')) {
            return ['Sleep meditation', 'Set wake-up goal', 'Log bedtime'];
        }
        return ['Check my workout plan', 'Log today meal', 'Hydration target'];
    }
}
exports.SarvamService = SarvamService;
/**
 * Sentence-aware TTS Buffer.
 * Collects incoming tokens and splits along natural punctuation boundaries (6-12 words).
 * Dispatches each complete sentence to Bulbul TTS immediately so chunk 0 plays with minimal TTFA.
 */
class SentenceTTSBuffer {
    buffer = '';
    sequence = 0;
    isFinished = false;
    onChunkReady;
    speaker;
    constructor(onChunkReady, speaker = 'shubh') {
        this.onChunkReady = onChunkReady;
        this.speaker = speaker;
    }
    /**
     * Feeds a newly arrived text token into the buffer.
     */
    async addToken(token) {
        if (this.isFinished)
            return;
        this.buffer += token;
        // Check for natural sentence boundaries
        const sentence = this.extractNextSentence();
        if (sentence) {
            await this.synthesizeAndEmit(sentence);
        }
    }
    /**
     * Finalizes the buffer when LLM generation completes, synthesizing any remaining text.
     */
    async flush() {
        this.isFinished = true;
        const remaining = this.buffer.trim();
        this.buffer = '';
        if (remaining) {
            await this.synthesizeAndEmit(remaining);
        }
    }
    extractNextSentence() {
        // Natural punctuation boundaries: '.', '!', '?', '।', or newline
        const match = this.buffer.match(/^(.*?[.!?।\n])\s+/s);
        if (match) {
            const sentence = match[1].trim();
            this.buffer = this.buffer.slice(match[0].length);
            return sentence;
        }
        // Secondary boundary: comma or semicolon with >= 8 words buffered
        const words = this.buffer.trim().split(/\s+/);
        if (words.length >= 8) {
            const commaMatch = this.buffer.match(/^(.*?[,;])\s+/s);
            if (commaMatch) {
                const sentence = commaMatch[1].trim();
                this.buffer = this.buffer.slice(commaMatch[0].length);
                return sentence;
            }
        }
        return null;
    }
    async synthesizeAndEmit(text) {
        const currentSeq = this.sequence++;
        const normalized = SarvamService.normalizeForSpokenTTS(text);
        if (!normalized)
            return;
        try {
            const audioBase64 = await SarvamService.synthesizeSpeech(normalized, this.speaker);
            this.onChunkReady({
                sequence: currentSeq,
                text: normalized,
                audioBase64,
                mimeType: 'audio/wav',
                sampleRate: 22050,
            });
        }
        catch (err) {
            console.warn(`[SentenceTTSBuffer] Chunk ${currentSeq} synthesis failed:`, err?.message || err);
            // Emit text chunk even if voice synthesis fails
            this.onChunkReady({
                sequence: currentSeq,
                text: normalized,
                mimeType: 'audio/wav',
                sampleRate: 22050,
            });
        }
    }
}
exports.SentenceTTSBuffer = SentenceTTSBuffer;
