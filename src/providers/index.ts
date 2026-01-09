/**
 * Provider factory and exports
 * Central place to create and manage providers
 */

import type { Settings } from '../types';
import type { LLMProvider, EmbeddingProvider } from './BaseProvider';
import { OllamaProvider } from './OllamaProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';

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

		case 'openai': {
			const provider = new OpenAIProvider();
			provider.configure({
				apiKey: settings.openaiApiKey,
				model: settings.openaiModel,
				embeddingModel: settings.openaiEmbeddingModel,
				temperature: settings.temperature,
			});
			return provider;
		}

		case 'anthropic': {
			const provider = new AnthropicProvider();
			provider.configure({
				apiKey: settings.anthropicApiKey,
				model: settings.anthropicModel,
				embeddingApiKey: settings.voyageApiKey,
				embeddingModel: settings.voyageEmbeddingModel,
				temperature: settings.temperature,
			});
			return provider;
		}

		default:
			throw new Error(`Unknown provider: ${settings.activeProvider}`);
	}
}

/**
 * Export providers for direct use
 */
export { OllamaProvider, OpenAIProvider, AnthropicProvider };
export { BaseFullProvider } from './BaseProvider';
export type { LLMProvider, EmbeddingProvider };
