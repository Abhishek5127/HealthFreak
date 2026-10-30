import {
  IVoiceProvider,
  ToolDefinition,
  AgentContext,
  ToolCallResult,
  VoiceProviderSession,
} from './VoiceProviderInterface.js';
import { config } from '../config/index.js';
import { executeCoachTool } from '../agent/coachTools.js';

export class GeminiRealtimeProvider implements IVoiceProvider {
  public readonly name = 'gemini' as const;
  public readonly model: string;
  public readonly isDirectApiKey = true; // Consumes Google Gemini direct free-tier allocation

  constructor() {
    this.model = config.gemini.model;
  }

  public async createSession(params: {
    roomName: string;
    participantIdentity: string;
    systemInstruction: string;
    tools: ToolDefinition[];
    context: AgentContext;
  }): Promise<VoiceProviderSession> {
    // Verifies direct Google Gemini API key is configured
    if (!config.gemini.apiKey) {
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

  public async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: AgentContext
  ): Promise<ToolCallResult> {
    // Executes shared business tools
    return executeCoachTool(toolName, args, context);
  }
}

