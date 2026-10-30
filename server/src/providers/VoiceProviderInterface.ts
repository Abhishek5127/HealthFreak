export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AgentContext {
  userId: string;
  callId: string;
  roomName: string;
}

export interface ToolCallResult {
  toolName: string;
  output: any;
  error?: string;
}

export interface VoiceProviderSession {
  providerName: string;
  model: string;
  isDirectApiKey: boolean; // Confirms Google's direct free-tier key is used
  roomName: string;
  participantIdentity: string;
  tools: ToolDefinition[];
  systemInstruction: string;
}

export interface IVoiceProvider {
  readonly name: 'gemini' | 'openai';
  readonly model: string;
  readonly isDirectApiKey: boolean;

  createSession(params: {
    roomName: string;
    participantIdentity: string;
    systemInstruction: string;
    tools: ToolDefinition[];
    context: AgentContext;
  }): Promise<VoiceProviderSession>;

  executeTool(
    toolName: string,
    args: Record<string, any>,
    context: AgentContext
  ): Promise<ToolCallResult>;
}

