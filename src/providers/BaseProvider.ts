/**
 * Base provider interfaces
 * All LLM providers must implement these interfaces
 */

import type {
	LLMProvider,
	EmbeddingProvider,
	ProviderConfig,
	GenerateOptions,
	Model,
} from '../types';

/**
 * Base class for providers that implement both LLM and Embeddings
 * Most providers (Ollama, OpenAI) provide both
 */
export abstract class BaseFullProvider implements LLMProvider, EmbeddingProvider {
	abstract readonly name: string;
	abstract readonly type: 'local' | 'cloud';

	// LLMProvider methods
	abstract configure(config: ProviderConfig): void;
	abstract validate(): Promise<string | null>;
	abstract listModels(): Promise<Model[]>;
	abstract generateStream(
		prompt: string,
		context: string,
		options?: GenerateOptions
	): AsyncGenerator<string, void, unknown>;
	abstract generate(prompt: string, context: string, options?: GenerateOptions): Promise<string>;

	// EmbeddingProvider methods
	abstract embed(text: string): Promise<number[]>;
	abstract embedBatch(texts: string[]): Promise<number[][]>;
	abstract getDimensions(): number;

	/**
	 * Helper: Get default system prompt for RAG
	 */
	protected getDefaultSystemPrompt(): string {
		return `You are a helpful assistant that answers questions based on the user's personal notes.
Always cite the specific notes you reference using [[note name]] format.
If the answer isn't in the provided context, say so clearly.
Be concise but thorough in your responses.`;
	}

	/**
	 * Helper: Format prompt with context
	 */
	protected formatPrompt(systemPrompt: string, context: string, question: string): string {
		return `${systemPrompt}

Context from your notes:
${context}

Question: ${question}

Answer:`;
	}
}

/**
 * Export types for convenience
 */
export type { LLMProvider, EmbeddingProvider, ProviderConfig, GenerateOptions, Model };
