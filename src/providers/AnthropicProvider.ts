/**
 * Anthropic Provider
 * Cloud-based LLM using Anthropic Claude API
 * Note: Anthropic doesn't provide embeddings, so we use Voyage AI
 *
 * API Docs: https://docs.anthropic.com/claude/reference/getting-started-with-the-api
 */

import { BaseFullProvider } from './BaseProvider';
import type { ProviderConfig, GenerateOptions, Model } from '../types';

export class AnthropicProvider extends BaseFullProvider {
	readonly name = 'Anthropic';
	readonly type = 'cloud' as const;

	private apiKey: string = '';
	private baseUrl: string = 'https://api.anthropic.com/v1';
	private model: string = 'claude-3-5-sonnet-20241022';
	private embeddingApiKey: string = ''; // Voyage AI for embeddings
	private embeddingModel: string = 'voyage-2';
	private temperature: number = 0.7;

	/**
	 * Configure the provider with user settings
	 */
	configure(config: ProviderConfig): void {
		if (config.apiKey) this.apiKey = config.apiKey;
		if (config.baseUrl) this.baseUrl = config.baseUrl;
		if (config.model) this.model = config.model;
		if (config.embeddingApiKey) this.embeddingApiKey = config.embeddingApiKey;
		if (config.embeddingModel) this.embeddingModel = config.embeddingModel;
		if (config.temperature !== undefined) this.temperature = config.temperature;
	}

	/**
	 * Validate API key and connection
	 */
	async validate(): Promise<string | null> {
		if (!this.apiKey) {
			return 'Anthropic API key is required';
		}

		if (!this.embeddingApiKey) {
			return 'Voyage AI API key is required for embeddings (Anthropic does not provide embeddings)';
		}

		// Test Anthropic connection
		try {
			const response = await fetch(`${this.baseUrl}/messages`, {
				method: 'POST',
				headers: {
					'x-api-key': this.apiKey,
					'anthropic-version': '2023-06-01',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.model,
					max_tokens: 10,
					messages: [{ role: 'user', content: 'test' }],
				}),
			});

			if (!response.ok) {
				if (response.status === 401) {
					return 'Invalid Anthropic API key';
				}
				return `Anthropic API error: ${response.statusText}`;
			}
		} catch (error) {
			return `Anthropic connection failed: ${(error as Error).message}`;
		}

		// Test Voyage AI connection
		try {
			const response = await fetch('https://api.voyageai.com/v1/embeddings', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.embeddingApiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.embeddingModel,
					input: ['test'],
				}),
			});

			if (!response.ok) {
				if (response.status === 401) {
					return 'Invalid Voyage AI API key';
				}
				return `Voyage AI error: ${response.statusText}`;
			}
		} catch (error) {
			return `Voyage AI connection failed: ${(error as Error).message}`;
		}

		return null; // Valid
	}

	/**
	 * List available models
	 */
	async listModels(): Promise<Model[]> {
		// Anthropic doesn't have a models endpoint, return known models
		return [
			{
				id: 'claude-3-5-sonnet-20241022',
				name: 'Claude 3.5 Sonnet',
				contextWindow: 200000,
			},
			{
				id: 'claude-3-opus-20240229',
				name: 'Claude 3 Opus',
				contextWindow: 200000,
			},
			{
				id: 'claude-3-sonnet-20240229',
				name: 'Claude 3 Sonnet',
				contextWindow: 200000,
			},
			{
				id: 'claude-3-haiku-20240307',
				name: 'Claude 3 Haiku',
				contextWindow: 200000,
			},
		];
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
		const fullPrompt = options?.systemPrompt
			? prompt
			: this.formatPrompt('', context, prompt);

		try {
			const response = await fetch(`${this.baseUrl}/messages`, {
				method: 'POST',
				headers: {
					'x-api-key': this.apiKey,
					'anthropic-version': '2023-06-01',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.model,
					max_tokens: 4096,
					temperature: options?.temperature ?? this.temperature,
					system: systemPrompt,
					messages: [{ role: 'user', content: fullPrompt }],
					stream: true,
				}),
			});

			if (!response.ok) {
				throw new Error(`Anthropic API error: ${response.statusText}`);
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

					try {
						const parsed = JSON.parse(data);

						if (parsed.type === 'content_block_delta') {
							const content = parsed.delta?.text;
							if (content) {
								yield content;
							}
						}

						if (parsed.type === 'message_stop') {
							return;
						}
					} catch (e) {
						// Skip invalid JSON
					}
				}
			}
		} catch (error) {
			console.error('Anthropic streaming error:', error);
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
	 * Embed a single text using Voyage AI
	 */
	async embed(text: string): Promise<number[]> {
		try {
			const response = await fetch('https://api.voyageai.com/v1/embeddings', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.embeddingApiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.embeddingModel,
					input: [text],
				}),
			});

			if (!response.ok) {
				throw new Error(`Voyage AI embedding error: ${response.statusText}`);
			}

			const data = await response.json();
			return data.data[0].embedding;
		} catch (error) {
			console.error('Voyage AI embedding error:', error);
			throw error;
		}
	}

	/**
	 * Embed multiple texts (batch) using Voyage AI
	 */
	async embedBatch(texts: string[]): Promise<number[][]> {
		try {
			const response = await fetch('https://api.voyageai.com/v1/embeddings', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.embeddingApiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.embeddingModel,
					input: texts,
				}),
			});

			if (!response.ok) {
				throw new Error(`Voyage AI embedding error: ${response.statusText}`);
			}

			const data = await response.json();
			return data.data.map((item: any) => item.embedding);
		} catch (error) {
			console.error('Voyage AI batch embedding error:', error);
			throw error;
		}
	}

	/**
	 * Get embedding dimensions for configured model
	 */
	getDimensions(): number {
		const dimensions: Record<string, number> = {
			'voyage-2': 1024,
			'voyage-large-2': 1536,
			'voyage-code-2': 1536,
		};
		return dimensions[this.embeddingModel] || 1024;
	}
}
