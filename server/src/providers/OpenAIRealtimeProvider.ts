import {
  IVoiceProvider,
  ToolDefinition,
  AgentContext,
  ToolCallResult,
  VoiceProviderSession,
} from './VoiceProviderInterface.js';
import { config } from '../config/index.js';
import { executeCoachTool } from '../agent/coachTools.js';

export class OpenAIRealtimeProvider implements IVoiceProvider {
  public readonly name = 'openai' as const;
  public readonly model: string;
  public readonly isDirectApiKey = true;

  constructor() {
    this.model = config.openai.model;
  }

  public async createSession(params: {
    roomName: string;
    participantIdentity: string;
    systemInstruction: string;
    tools: ToolDefinition[];
    context: AgentContext;
  }): Promise<VoiceProviderSession> {
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

  public async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: AgentContext
  ): Promise<ToolCallResult> {
    // Exactly identical business tools execution for multi-provider parity
    return executeCoachTool(toolName, args, context);
  }
}

