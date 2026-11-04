"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiRealtimeProvider = void 0;
const index_js_1 = require("../config/index.js");
const coachTools_js_1 = require("../agent/coachTools.js");
class GeminiRealtimeProvider {
    name = 'gemini';
    model;
    isDirectApiKey = true; // Consumes Google Gemini direct free-tier allocation
    constructor() {
        this.model = index_js_1.config.gemini.model;
    }
    async createSession(params) {
        // Verifies direct Google Gemini API key is configured
        if (!index_js_1.config.gemini.apiKey) {
            throw new Error('GEMINI_API_KEY is required for GeminiRealtimeProvider');
        }
        return {
            providerName: 'gemini',
            model: this.model,
            isDirectApiKey: true,
            roomName: params.roomName,
            participantIdentity: params.participantIdentity,
            tools: params.tools,
            systemInstruction: params.systemInstruction,
        };
    }
    async executeTool(toolName, args, context) {
        // Executes shared business tools
        return (0, coachTools_js_1.executeCoachTool)(toolName, args, context);
    }
}
exports.GeminiRealtimeProvider = GeminiRealtimeProvider;
