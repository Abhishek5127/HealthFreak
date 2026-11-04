"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIRealtimeProvider = void 0;
const index_js_1 = require("../config/index.js");
const coachTools_js_1 = require("../agent/coachTools.js");
class OpenAIRealtimeProvider {
    name = 'openai';
    model;
    isDirectApiKey = true;
    constructor() {
        this.model = index_js_1.config.openai.model;
    }
    async createSession(params) {
        return {
            providerName: 'openai',
            model: this.model,
            isDirectApiKey: true,
            roomName: params.roomName,
            participantIdentity: params.participantIdentity,
            tools: params.tools,
            systemInstruction: params.systemInstruction,
        };
    }
    async executeTool(toolName, args, context) {
        // Exactly identical business tools execution for multi-provider parity
        return (0, coachTools_js_1.executeCoachTool)(toolName, args, context);
    }
}
exports.OpenAIRealtimeProvider = OpenAIRealtimeProvider;
