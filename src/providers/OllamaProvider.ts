/**
 * Ollama Provider - Local LLM and Embeddings
 * Runs completely offline on your machine
 *
 * API Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import { BaseFullProvider } from './BaseProvider';
import type { ProviderConfig, GenerateOptions, Model } from '../types';

/**
 * Context window sizes for common Ollama models
 */
const OLLAMA_MODEL_CONTEXT_WINDOWS: Record<string, number> = {
	llama2: 4096,
	'llama2:13b': 4096,
	'llama2:70b': 4096,
	mistral: 8192,
	'mistral:7b': 8192,
	phi: 2048,
	'phi:2.7b': 2048,
	gemma: 8192,
	'gemma:7b': 8192,
	'codellama': 16384,
	'codellama:34b': 16384,
};

// REMOVED: Static embedding dimensions lookup
// Dimensions should ALWAYS be fetched dynamically from Ollama API

export class OllamaProvider extends BaseFullProvider {
	readonly name = 'Ollama';
	readonly type = 'local' as const;

	private baseUrl: string = 'http://localhost:11434';
	private model: string = 'llama2';
	private embeddingModel: string = 'nomic-embed-text';
	private temperature: number = 0.7;
	private cachedDimensions: number | null = null;

	/**
	 * Configure the provider with user settings
	 */
	configure(config: ProviderConfig): void {
		if (config.baseUrl) this.baseUrl = config.baseUrl;
		if (config.model) this.model = config.model;

		// Clear cached dimensions if embedding model changes
		if (config.embeddingModel && config.embeddingModel !== this.embeddingModel) {
			console.log(`🔄 Embedding model changed: ${this.embeddingModel} → ${config.embeddingModel}`);
			this.cachedDimensions = null; // Force re-fetch
		}

		if (config.embeddingModel) this.embeddingModel = config.embeddingModel;
		if (config.temperature !== undefined) this.temperature = config.temperature;
	}

	/**
	 * Validate that Ollama is running and models are available
	 */
	async validate(): Promise<string | null> {
		try {
			// Check if Ollama is running
			const response = await fetch(`${this.baseUrl}/api/tags`, {
				method: 'GET',
			});

			if (!response.ok) {
				return 'Cannot connect to Ollama. Is it running?';
			}

			const data = await response.json();

			// Check if generation model exists
			const hasGenerationModel = data.models?.some(
				(m: { name: string }) => m.name === this.model || m.name.startsWith(this.model + ':')
			);

			if (!hasGenerationModel) {
				return `Model "${this.model}" not found. Pull it with: ollama pull ${this.model}`;
			}

			// Check if embedding model exists
			const hasEmbeddingModel = data.models?.some(
				(m: { name: string }) =>
					m.name === this.embeddingModel || m.name.startsWith(this.embeddingModel + ':')
			);

			if (!hasEmbeddingModel) {
				return `Embedding model "${this.embeddingModel}" not found. Pull it with: ollama pull ${this.embeddingModel}`;
			}

			return null; // All good!
		} catch (error) {
			return `Ollama not running. Start it with: ollama serve`;
		}
	}

	/**
	 * List available models
	 */
	async listModels(): Promise<Model[]> {
		try {
			const response = await fetch(`${this.baseUrl}/api/tags`);
			const data = await response.json();

			return (
				data.models?.map((m: { name: string }) => ({
					id: m.name,
					name: m.name,
					contextWindow: this.getContextWindow(m.name),
				})) || []
			);
		} catch (error) {
			console.error('Failed to list Ollama models:', error);
			return [];
		}
	}

	/**
	 * Generate response (streaming)
	 * This is the main method for chat responses
	 */
	async *generateStream(
		prompt: string,
		context: string,
		options?: GenerateOptions
	): AsyncGenerator<string, void, unknown> {
		// If a pre-rendered prompt is provided (from PromptManager), use it directly —
		// it already contains context, question, and instructions. Wrapping it again
		// via formatPrompt would duplicate context and question, confusing the model.
		const fullPrompt = options?.systemPrompt
			? options.systemPrompt
			: this.formatPrompt(this.getDefaultSystemPrompt(), context, prompt);

		try {
			// Use /api/chat so instruct/chat models apply their proper chat template.
			// Pass the rendered prompt as system and the question as the user turn.
			const response = await fetch(`${this.baseUrl}/api/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.model,
					messages: [
						{ role: 'system', content: fullPrompt },
						// /no_think disables reasoning tokens for qwen3 and compatible models;
						// non-qwen3 models silently ignore it
						{ role: 'user', content: prompt + '\n/no_think' },
					],
					temperature: options?.temperature ?? this.temperature,
					stream: true,
					think: false,
				}),
			});

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.statusText}`);
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error('No response body');

			const decoder = new TextDecoder();
			let buffer = '';
			let inThinkBlock = false;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });

				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.trim()) continue;

					try {
						const data = JSON.parse(line);
						// /api/chat streams content via message.content
						const text_raw = data.message?.content ?? '';
						if (text_raw) {
							let text = text_raw;
							if (text.includes('<think>')) inThinkBlock = true;
							if (inThinkBlock) {
								if (text.includes('</think>')) {
									inThinkBlock = false;
									text = text.split('</think>').pop() || '';
								} else {
									continue;
								}
							}
							if (text) yield text;
						}

						if (data.done) return;
					} catch (e) {
						console.error('Failed to parse Ollama response line:', line, e);
					}
				}
			}
		} catch (error) {
			console.error('Ollama streaming error:', error);
			throw error;
		}
	}

	/**
	 * Generate response (non-streaming)
	 * Collects all chunks and returns full response
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
			console.log('📡 Calling Ollama embed API:', {
				url: `${this.baseUrl}/api/embed`,
				model: this.embeddingModel,
				textLength: text.length
			});

			const response = await fetch(`${this.baseUrl}/api/embed`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.embeddingModel,
					input: text,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('❌ Ollama API error:', response.status, errorText);
				throw new Error(`Ollama embedding error: ${response.statusText}`);
			}

			const data = await response.json();
			console.log('📦 Ollama response structure:', {
				hasEmbedding: !!data.embedding,
				hasEmbeddings: !!data.embeddings,
				keys: Object.keys(data),
				embeddingType: typeof data.embedding,
				embeddingLength: data.embedding?.length,
				embeddingsLength: data.embeddings?.length
			});

			// Handle both singular and plural response formats
			const embedding = data.embedding || data.embeddings?.[0];

			if (!embedding) {
				console.error('❌ No embedding found in response:', data);
				throw new Error('No embedding returned from Ollama');
			}

			console.log('✅ Returning embedding, length:', embedding.length);
			return embedding;
		} catch (error) {
			console.error('Ollama embedding error:', error);
			throw error;
		}
	}

	/**
	 * Embed multiple texts (batch)
	 * Note: Ollama doesn't have native batch API, so we call embed() multiple times
	 */
	async embedBatch(texts: string[]): Promise<number[][]> {
		// Process in parallel for better performance
		const embeddings = await Promise.all(texts.map((text) => this.embed(text)));
		return embeddings;
	}

	/**
	 * Get embedding dimensions for configured model
	 * MUST call fetchDimensions() first to populate cache
	 */
	getDimensions(): number {
		if (this.cachedDimensions !== null) {
			return this.cachedDimensions;
		}
		console.warn('[OllamaProvider] getDimensions() called before fetchDimensions(). Returning fallback 768.');
		return 768;
	}

	/**
	 * Fetch embedding dimensions from Ollama API
	 * This MUST be called after configuration to get actual dimensions
	 */
	async fetchDimensions(): Promise<number> {
		try {
			console.log(`📏 Fetching dimensions for ${this.embeddingModel} from Ollama...`);

			const response = await fetch(`${this.baseUrl}/api/show`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.embeddingModel,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Failed to fetch model details from Ollama (${response.status}): ${errorText}. ` +
					`Ensure model "${this.embeddingModel}" is pulled: ollama pull ${this.embeddingModel}`
				);
			}

			const data = await response.json();

			// Get architecture from model_info (e.g., "bert", "llama", "gemma")
			const architecture = data.model_info?.['general.architecture'];
			console.log(`📐 Model architecture: ${architecture}`);

			// Try multiple paths to find embedding dimensions
			// Pattern: {architecture}.embedding_length (e.g., bert.embedding_length, llama.embedding_length)
			let dimensions: number | undefined;

			if (architecture) {
				// Try architecture-specific key first (e.g., bert.embedding_length)
				dimensions = data.model_info?.[`${architecture}.embedding_length`];
			}

			// Fallback paths for other model structures
			if (!dimensions) {
				dimensions =
					data.details?.embedding_length ||
					data.model_info?.['embedding.size'] ||
					data.model_info?.['embedding_length'];
			}

			if (!dimensions) {
				console.error('❌ Could not find embedding dimensions in model info:', {
					architecture,
					model_info_keys: Object.keys(data.model_info || {}),
					details: data.details
				});
				throw new Error(
					`Could not determine embedding dimensions for model "${this.embeddingModel}". ` +
					`Expected key "${architecture}.embedding_length" not found in model_info.`
				);
			}

			console.log(`✅ Found ${this.embeddingModel} dimensions: ${dimensions}D (from ${architecture}.embedding_length)`);

			this.cachedDimensions = dimensions;
			return dimensions;
		} catch (error) {
			console.error('❌ Failed to fetch dimensions from Ollama:', error);
			// Clear cache on error to force retry next time
			this.cachedDimensions = null;
			throw error;
		}
	}

	/**
	 * Helper: Get context window size for a model
	 */
	private getContextWindow(modelName: string): number {
		// Check exact match first
		if (OLLAMA_MODEL_CONTEXT_WINDOWS[modelName]) {
			return OLLAMA_MODEL_CONTEXT_WINDOWS[modelName];
		}

		// Check partial match (e.g., "llama2:13b" -> "llama2")
		const baseModel = modelName.split(':')[0] || '';
		return OLLAMA_MODEL_CONTEXT_WINDOWS[baseModel] || 4096;
	}
}
