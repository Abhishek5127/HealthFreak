"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceProviderFactory = void 0;
const GeminiRealtimeProvider_js_1 = require("./GeminiRealtimeProvider.js");
const OpenAIRealtimeProvider_js_1 = require("./OpenAIRealtimeProvider.js");
const index_js_1 = require("../config/index.js");
class VoiceProviderFactory {
    static geminiInstance = null;
    static openaiInstance = null;
    static getProvider(overrideProvider) {
        const selected = overrideProvider || index_js_1.config.voiceProvider;
        if (selected === 'openai') {
            if (!this.openaiInstance) {
                this.openaiInstance = new OpenAIRealtimeProvider_js_1.OpenAIRealtimeProvider();
            }
            return this.openaiInstance;
        }
        // Default to Gemini (Free-tier direct API)
        if (!this.geminiInstance) {
            this.geminiInstance = new GeminiRealtimeProvider_js_1.GeminiRealtimeProvider();
        }
        return this.geminiInstance;
    }
}
exports.VoiceProviderFactory = VoiceProviderFactory;
