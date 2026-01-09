/**
 * Provider factory and exports
 * Central place to create and manage providers
 */

import type { Settings } from '../types';
import type { LLMProvider, EmbeddingProvider } from './BaseProvider';
import { OllamaProvider } from './OllamaProvider';
// import { OpenAIProvider } from './OpenAIProvider'; // TODO: Phase 1, Step 11
// import { AnthropicProvider } from './AnthropicProvider'; // TODO: Phase 1, Step 11

/**
 * Create a provider based on settings
 */
export function createProvider(settings: Settings): LLMProvider & EmbeddingProvider {
	switch (settings.activeProvider) {
		case 'ollama': {
			const provider = new OllamaProvider();
			provider.configure({
				baseUrl: settings.ollamaUrl,
				model: settings.ollamaModel,
				embeddingModel: settings.ollamaEmbeddingModel,
				temperature: settings.temperature,
			});
			return provider;
		}

		case 'openai':
			// TODO: Implement in Step 11
			throw new Error('OpenAI provider not yet implemented');

		case 'anthropic':
			// TODO: Implement in Step 11
			throw new Error('Anthropic provider not yet implemented');

		default:
			throw new Error(`Unknown provider: ${settings.activeProvider}`);
	}
}

/**
 * Export providers for direct use
 */
export { OllamaProvider };
export { BaseFullProvider } from './BaseProvider';
export type { LLMProvider, EmbeddingProvider };
