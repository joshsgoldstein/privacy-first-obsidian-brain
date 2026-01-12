/**
 * Type definitions for Smart Second Brain plugin
 * Phase 1: Basic RAG with direct API calls
 */

// ============================================================================
// Settings
// ============================================================================

export interface Settings {
	// Provider selection
	activeProvider: 'ollama' | 'openai' | 'anthropic';

	// Ollama settings
	ollamaUrl: string;
	ollamaModel: string;
	ollamaEmbeddingModel: string;

	// OpenAI settings
	openaiApiKey: string;
	openaiModel: string;
	openaiEmbeddingModel: string;

	// Anthropic settings
	anthropicApiKey: string;
	anthropicModel: string;

	// Voyage AI settings (for Anthropic embeddings)
	voyageApiKey: string;
	voyageEmbeddingModel: string;

	// RAG parameters
	searchMode: 'fulltext' | 'vector' | 'hybrid'; // Orama search mode
	similarityThreshold: number; // 0-1, for vector/hybrid search (default 0.8)
	fulltextThreshold: number; // 0-1, percentage of terms that must match (default 0)
	topK: number; // How many documents to retrieve
	temperature: number; // LLM creativity (0-2)

	// UI preferences
	viewMode: 'comfy' | 'compact';
	chatFolder: string; // Where to save chats

	// Privacy
	incognitoMode: boolean; // Force local-only processing

	// File exclusions
	excludePatterns: string[]; // Glob patterns like "Archive/**"

	// Advanced
	verboseLogging: boolean;

	// Prompts
	activePromptTemplate: string; // Which prompt template to use (e.g., 'rag-default', 'rag-technical')

	// Opik (LLM Observability)
	opikEnabled: boolean; // Enable Opik tracing (off by default)
	opikUrl: string; // Opik URL (for local installations, e.g., http://localhost:5173/api)
	opikApiKey: string; // Opik API key
	opikProjectName: string; // Project name in Opik
	opikWorkspaceName: string; // Workspace name in Opik
}

// ============================================================================
// Chat Messages
// ============================================================================

export interface Message {
	id: string; // Unique ID (nanoid)
	role: 'user' | 'assistant';
	content: string; // Markdown text
	sources?: Source[]; // Only for assistant messages
	timestamp: number; // Unix timestamp
	model?: string; // Which model generated this
}

export interface Source {
	file: string; // File path
	score: number; // Similarity score (0-1)
	snippet: string; // Relevant excerpt from the file
}

// ============================================================================
// Documents & Embeddings
// ============================================================================

export interface Document {
	content: string; // Clean text content (no frontmatter)
	metadata: DocumentMetadata;
}

export interface DocumentMetadata {
	path: string; // File path in vault
	mtime: number; // Last modified time
	tags?: string[]; // Tags from frontmatter
	frontmatter?: Record<string, any>; // Full frontmatter object
}

export interface VectorDocument extends Document {
	embedding: number[]; // Vector representation
	score?: number; // Similarity score (only for search results)
}

// ============================================================================
// Provider Interfaces
// ============================================================================

/**
 * Base interface for all LLM providers
 * Providers handle both generation and embeddings
 */
export interface LLMProvider {
	/** Provider name (e.g., "Ollama", "OpenAI") */
	readonly name: string;

	/** Provider type */
	readonly type: 'local' | 'cloud';

	/**
	 * Configure the provider with user settings
	 */
	configure(config: ProviderConfig): void;

	/**
	 * Validate configuration (check API keys, connectivity, models)
	 * Returns error message if invalid, null if valid
	 */
	validate(): Promise<string | null>;

	/**
	 * List available models for generation
	 */
	listModels(): Promise<Model[]>;

	/**
	 * Generate response (streaming)
	 * Yields text chunks as they arrive
	 */
	generateStream(
		prompt: string,
		context: string,
		options?: GenerateOptions
	): AsyncGenerator<string, void, unknown>;

	/**
	 * Generate response (non-streaming)
	 * Returns full response
	 */
	generate(
		prompt: string,
		context: string,
		options?: GenerateOptions
	): Promise<string>;
}

/**
 * Embedding provider interface
 * Some providers (like Anthropic) don't provide embeddings
 */
export interface EmbeddingProvider {
	/** Provider name */
	readonly name: string;

	/**
	 * Embed a single text string
	 */
	embed(text: string): Promise<number[]>;

	/**
	 * Embed multiple texts in batch (more efficient)
	 */
	embedBatch(texts: string[]): Promise<number[][]>;

	/**
	 * Get embedding dimensions for this model
	 */
	getDimensions(): number;
}

/**
 * Configuration object passed to providers
 */
export interface ProviderConfig {
	apiKey?: string;
	baseUrl?: string;
	model?: string;
	embeddingModel?: string;
	embeddingApiKey?: string; // For providers that use separate embedding service (e.g., Anthropic + Voyage AI)
	temperature?: number;
	maxTokens?: number;
}

/**
 * Options for generation
 */
export interface GenerateOptions {
	temperature?: number; // Override default temperature
	maxTokens?: number; // Max tokens to generate
	systemPrompt?: string; // Custom system prompt
}

/**
 * Model information
 */
export interface Model {
	id: string; // Model ID (e.g., "gpt-4o")
	name: string; // Display name (e.g., "GPT-4o")
	contextWindow: number; // Max context tokens
	description?: string; // Optional description
}

// ============================================================================
// RAG Engine
// ============================================================================

/**
 * Query options for RAG
 */
export interface QueryOptions {
	topK?: number; // Number of documents to retrieve
	searchMode?: 'fulltext' | 'vector' | 'hybrid'; // Orama search mode
	similarityThreshold?: number; // For vector/hybrid: minimum similarity (0-1)
	fulltextThreshold?: number; // For fulltext/hybrid: % of terms that must match (0-1)
	temperature?: number; // LLM temperature
	systemPrompt?: string; // Custom system prompt
	conversationHistory?: Message[]; // Previous messages for multi-turn context
	skipSearch?: boolean; // If true, skip RAG search and just use LLM
}

/**
 * Streaming chunk types
 */
export type StreamChunk =
	| {
			type: 'content';
			content: string; // Text chunk
	  }
	| {
			type: 'sources';
			sources: Source[]; // Sources at the end
	  }
	| {
			type: 'status';
			status: 'searching' | 'generating'; // Pipeline status
	  }
	| {
			type: 'error';
			error: string; // Error message
	  };

// ============================================================================
// Events
// ============================================================================

/**
 * Events emitted by the plugin
 */
export type PluginEvent =
	| { type: 'indexing-started'; total: number }
	| { type: 'indexing-progress'; current: number; total: number; file: string }
	| { type: 'indexing-complete'; total: number; duration: number }
	| { type: 'indexing-error'; error: string }
	| { type: 'settings-changed'; settings: Settings }
	| { type: 'provider-changed'; provider: string };
