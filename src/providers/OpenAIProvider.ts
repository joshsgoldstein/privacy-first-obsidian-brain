/**
 * OpenAI Provider
 * Cloud-based LLM and embeddings using OpenAI API
 *
 * API Docs: https://platform.openai.com/docs/api-reference
 */

import { BaseFullProvider } from './BaseProvider';
import type { ProviderConfig, GenerateOptions, Model } from '../types';

export class OpenAIProvider extends BaseFullProvider {
	readonly name = 'OpenAI';
	readonly type = 'cloud' as const;

	private apiKey: string = '';
	private baseUrl: string = 'https://api.openai.com/v1';
	private model: string = 'gpt-4-turbo-preview';
	private embeddingModel: string = 'text-embedding-3-small';
	private temperature: number = 0.7;

	/**
	 * Configure the provider with user settings
	 */
	configure(config: ProviderConfig): void {
		if (config.apiKey) this.apiKey = config.apiKey;
		if (config.baseUrl) this.baseUrl = config.baseUrl;
		if (config.model) this.model = config.model;
		if (config.embeddingModel) this.embeddingModel = config.embeddingModel;
		if (config.temperature !== undefined) this.temperature = config.temperature;
	}

	/**
	 * Validate API key and connection
	 */
	async validate(): Promise<string | null> {
		if (!this.apiKey) {
			return 'OpenAI API key is required';
		}

		try {
			const response = await fetch(`${this.baseUrl}/models`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				if (response.status === 401) {
					return 'Invalid API key';
				}
				return `API error: ${response.statusText}`;
			}

			return null; // Valid
		} catch (error) {
			return `Connection failed: ${(error as Error).message}`;
		}
	}

	/**
	 * List available models
	 */
	async listModels(): Promise<Model[]> {
		try {
			const response = await fetch(`${this.baseUrl}/models`, {
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
				},
			});

			if (!response.ok) {
				console.error('Failed to list OpenAI models:', response.statusText);
				return [];
			}

			const data = await response.json();

			// Filter for GPT models only
			const gptModels = data.data.filter((m: any) =>
				m.id.includes('gpt') && !m.id.includes('instruct')
			);

			return gptModels.map((m: any) => ({
				id: m.id,
				name: m.id,
				contextWindow: this.getContextWindow(m.id),
			}));
		} catch (error) {
			console.error('Failed to list OpenAI models:', error);
			return [];
		}
	}

	/**
	 * Generate response (streaming)
	 */
	async *generateStream(
		prompt: string,
		context: string,
		options?: GenerateOptions
	): AsyncGenerator<string, void, unknown> {
		const systemPrompt = options?.systemPrompt || this.getDefaultSystemPrompt();
		// When a pre-rendered systemPrompt is provided it already contains context and
		// history — send just the raw question as the user turn to avoid duplication.
		const userMessage = options?.systemPrompt
			? prompt
			: this.formatPrompt('', context, prompt);
		const messages = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userMessage },
		];

		try {
			const response = await fetch(`${this.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.model,
					messages,
					temperature: options?.temperature ?? this.temperature,
					stream: true,
				}),
			});

			if (!response.ok) {
				throw new Error(`OpenAI API error: ${response.statusText}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No response body');
			}

			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.trim() || !line.startsWith('data: ')) continue;

					const data = line.slice(6);
					if (data === '[DONE]') return;

					try {
						const parsed = JSON.parse(data);
						const content = parsed.choices[0]?.delta?.content;
						if (content) {
							yield content;
						}
					} catch (e) {
						// Skip invalid JSON
					}
				}
			}
		} catch (error) {
			console.error('OpenAI streaming error:', error);
			throw error;
		}
	}

	/**
	 * Generate response (non-streaming)
	 */
	async generate(prompt: string, context: string, options?: GenerateOptions): Promise<string> {
		let result = '';
		for await (const chunk of this.generateStream(prompt, context, options)) {
			result += chunk;
		}
		return result;
	}

	/**
	 * Embed a single text
	 */
	async embed(text: string): Promise<number[]> {
		try {
			const response = await fetch(`${this.baseUrl}/embeddings`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.embeddingModel,
					input: text,
				}),
			});

			if (!response.ok) {
				throw new Error(`OpenAI embedding error: ${response.statusText}`);
			}

			const data = await response.json();
			return data.data[0].embedding;
		} catch (error) {
			console.error('OpenAI embedding error:', error);
			throw error;
		}
	}

	/**
	 * Embed multiple texts (batch)
	 */
	async embedBatch(texts: string[]): Promise<number[][]> {
		try {
			const response = await fetch(`${this.baseUrl}/embeddings`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.embeddingModel,
					input: texts,
				}),
			});

			if (!response.ok) {
				throw new Error(`OpenAI embedding error: ${response.statusText}`);
			}

			const data = await response.json();
			return data.data.map((item: any) => item.embedding);
		} catch (error) {
			console.error('OpenAI batch embedding error:', error);
			throw error;
		}
	}

	/**
	 * Get embedding dimensions for configured model
	 */
	getDimensions(): number {
		const dimensions: Record<string, number> = {
			'text-embedding-3-small': 1536,
			'text-embedding-3-large': 3072,
			'text-embedding-ada-002': 1536,
		};
		return dimensions[this.embeddingModel] || 1536;
	}

	/**
	 * Helper: Get context window size for a model
	 */
	private getContextWindow(modelId: string): number {
		const windows: Record<string, number> = {
			'gpt-4-turbo-preview': 128000,
			'gpt-4-turbo': 128000,
			'gpt-4': 8192,
			'gpt-3.5-turbo': 16385,
			'gpt-3.5-turbo-16k': 16385,
		};

		// Check exact match
		if (windows[modelId]) return windows[modelId];

		// Check prefix match
		for (const [key, value] of Object.entries(windows)) {
			if (modelId.startsWith(key)) return value;
		}

		return 8192; // Default
	}
}
