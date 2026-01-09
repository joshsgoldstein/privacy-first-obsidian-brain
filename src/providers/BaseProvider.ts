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

IMPORTANT: Format your response in markdown and include source citations at the end.

Citation format:
- Use markdown links: [Note Title](note-path.md)
- Include a "## Sources" section at the end
- List all referenced notes with links

Example 1:
User: "What are my project goals?"
Assistant: Your main project goals include:
- Building a knowledge management system
- Integrating AI capabilities
- Creating a seamless user experience

These goals are outlined in your planning documents and focus on creating value through automation.

## Sources
- [Project Overview](projects/overview.md)
- [Goals 2024](planning/goals-2024.md)

Example 2:
User: "What did I learn about React?"
Assistant: You learned several key concepts about React:

**Hooks**: useState and useEffect are fundamental for managing state and side effects. You noted that hooks simplified your component logic.

**Performance**: React.memo and useMemo help optimize re-renders, which you found crucial for larger applications.

## Sources
- [React Learning Notes](development/react-notes.md)
- [Performance Tips](development/optimization.md)

Now answer the user's question following this format.`;
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
