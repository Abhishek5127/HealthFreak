import { IVoiceProvider } from './VoiceProviderInterface.js';
import { GeminiRealtimeProvider } from './GeminiRealtimeProvider.js';
import { OpenAIRealtimeProvider } from './OpenAIRealtimeProvider.js';
import { config } from '../config/index.js';

export class VoiceProviderFactory {
  private static geminiInstance: GeminiRealtimeProvider | null = null;
  private static openaiInstance: OpenAIRealtimeProvider | null = null;

  public static getProvider(overrideProvider?: 'gemini' | 'openai'): IVoiceProvider {
    const selected = overrideProvider || config.voiceProvider;

    if (selected === 'openai') {
      if (!this.openaiInstance) {
        this.openaiInstance = new OpenAIRealtimeProvider();
      }
      return this.openaiInstance;
    }

    // Default to Gemini (Free-tier direct API)
    if (!this.geminiInstance) {
      this.geminiInstance = new GeminiRealtimeProvider();
    }
    return this.geminiInstance;
  }
}

