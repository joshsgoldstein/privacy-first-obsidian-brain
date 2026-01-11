/**
 * RAG Engine
 * Orchestrates the entire RAG pipeline:
 * - Document loading
 * - Embedding generation
 * - Vector storage
 * - Retrieval + Generation
 */

import { App, TFile, Notice } from 'obsidian';
import { DocumentLoader } from './DocumentLoader';
import { VectorStore } from './VectorStore';
import { createProvider } from '../providers';
import type { Settings, StreamChunk, QueryOptions, LLMProvider, EmbeddingProvider, Message } from '../types';

export class RAGEngine {
	private app: App;
	private settings: Settings;
	private dataPath: string;

	private documentLoader: DocumentLoader;
	public vectorStore: VectorStore;
	private provider: LLMProvider & EmbeddingProvider;

	private isIndexing: boolean = false;
	private isReady: boolean = false;

	constructor(app: App, settings: Settings, dataPath: string) {
		this.app = app;
		this.settings = settings;
		this.dataPath = dataPath;

		// Create provider (will be updated when settings change)
		this.provider = createProvider(settings);

		// Create document loader
		this.documentLoader = new DocumentLoader(app, settings);

		// Create vector store
		this.vectorStore = new VectorStore(this.provider, settings, dataPath);
	}

	/**
	 * Initialize the RAG engine
	 * Loads existing vector store or triggers indexing
	 */
	async initialize(): Promise<void> {
		if (this.isReady) return;

		try {
			// Fetch dimensions from provider if available
			if ('fetchDimensions' in this.provider && typeof this.provider.fetchDimensions === 'function') {
				await (this.provider as any).fetchDimensions();
			}

			// Initialize vector store
			await this.vectorStore.initialize();

			// Try to load existing vector store
			const loaded = await this.vectorStore.load(this.app.vault);

			if (loaded) {
				this.isReady = true;
				const stats = await this.vectorStore.getStats();

				if (this.settings.verboseLogging) {
					console.log('RAG Engine initialized with existing vector store');
					console.log('Stats:', stats);
				}

				new Notice(`Smart Second Brain ready! ${stats.documentCount} documents indexed.`, 5000);
			} else {
				// No existing store, need to index
				if (this.settings.verboseLogging) {
					console.log('No existing vector store found. Indexing required.');
				}

				new Notice('First time setup: Indexing your vault...', 5000);
				await this.indexVault();
			}
		} catch (error) {
			console.error('Failed to initialize RAG Engine:', error);
			new Notice('Failed to initialize Smart Second Brain. Check console.', 10000);
		}
	}

	/**
	 * Index the entire vault
	 * Called on first run or when user requests rebuild
	 */
	async indexVault(): Promise<void> {
		if (this.isIndexing) {
			new Notice('Already indexing...', 3000);
			return;
		}

		this.isIndexing = true;

		try {
			// Get document count for progress
			const totalDocs = this.documentLoader.getDocumentCount();

			if (totalDocs === 0) {
				new Notice('No documents to index!', 3000);
				this.isIndexing = false;
				return;
			}

			new Notice(`Indexing ${totalDocs} documents...`, 3000);

			// Load all documents
			const documents = await this.documentLoader.loadAllDocuments();

			if (documents.length === 0) {
				new Notice('No documents loaded. Check exclusion patterns.', 5000);
				this.isIndexing = false;
				return;
			}

			// Add documents to vector store with progress tracking
			let lastNoticeTime = Date.now();
			await this.vectorStore.addDocuments(documents, (current, total) => {
				// Show progress notice every 5 seconds
				const now = Date.now();
				if (now - lastNoticeTime > 5000) {
					new Notice(`Indexing: ${current}/${total} documents...`, 2000);
					lastNoticeTime = now;
				}
			});

			// Save vector store to disk
			await this.vectorStore.save(this.app.vault);

			this.isReady = true;
			this.isIndexing = false;

			new Notice(`✅ Indexing complete! ${documents.length} documents indexed.`, 5000);

			if (this.settings.verboseLogging) {
				console.log(`Indexing complete: ${documents.length} documents`);
			}
		} catch (error) {
			console.error('Indexing failed:', error);
			new Notice(`Indexing failed: ${(error as Error).message}`, 10000);
			this.isIndexing = false;
		}
	}

	/**
	 * Query the RAG system
	 * Retrieves relevant documents and generates a response
	 */
	async *query(question: string, options?: QueryOptions): AsyncGenerator<StreamChunk, void, unknown> {
		if (!this.isReady) {
			yield {
				type: 'error',
				error: 'RAG Engine not ready. Please wait for indexing to complete.',
			};
			return;
		}

		try {
			// Merge options with settings
			const searchMode = options?.searchMode || this.settings.searchMode;
			const topK = options?.topK || this.settings.topK;
			const similarityThreshold = options?.similarityThreshold ?? this.settings.similarityThreshold;
			const fulltextThreshold = options?.fulltextThreshold ?? this.settings.fulltextThreshold;
			const temperature = options?.temperature ?? this.settings.temperature;
			const skipSearch = options?.skipSearch || false;

			console.log(`🔍 Query options - skipSearch: ${skipSearch}, useRAG: ${!skipSearch}`);

			let results: any[] = [];
			let context = '';

			// 1. Retrieve relevant documents (unless skipped)
			if (!skipSearch) {
				console.log('🔎 Performing vector search...');
				results = await this.vectorStore.similaritySearch(question, topK, {
					mode: searchMode,
					similarityThreshold,
					fulltextThreshold,
				});
			} else {
				console.log('⏭️ Skipping vector search (RAG disabled by user)');
			}

			// 2. Format context from retrieved documents (or empty if none found/skipped)
			if (results.length > 0) {
				context = this.formatContext(results);
			} else if (skipSearch) {
				// User explicitly disabled search
				context = "The user has disabled note search. Answer using your general knowledge.";
			} else {
				// No documents found, but we'll still answer the question
				context = "No relevant documents were found in the knowledge base. Answer the question using your general knowledge, and mention that you couldn't find specific information in the user's notes.";
			}

			// 3. Add conversation history if present
			if (options?.conversationHistory && options.conversationHistory.length > 0) {
				const history = this.formatConversationHistory(options.conversationHistory);
				context = history + '\n\n' + context;
			}

			if (this.settings.verboseLogging) {
				console.log(`Query: "${question}"`);
				console.log(`Retrieved ${results.length} documents`);
				if (results.length > 0) {
					console.log('Scores:', results.map((r) => r.score));
				}
				console.log(`Conversation history: ${options?.conversationHistory?.length || 0} messages`);
			}

			// Yield status: search complete, now generating
			yield {
				type: 'status',
				status: 'generating',
			};

			// 4. Generate response (streaming)
			for await (const chunk of this.provider.generateStream(question, context, {
				temperature,
				systemPrompt: options?.systemPrompt,
			})) {
				yield {
					type: 'content',
					content: chunk,
				};
			}

			// 5. Yield sources at the end (if any)
			if (results.length > 0) {
				yield {
					type: 'sources',
					sources: results.map((r) => ({
						file: r.metadata.path,
						score: r.score || 0,
						snippet: r.content.substring(0, 200) + '...',
					})),
				};
			}
		} catch (error) {
			console.error('Query error:', error);
			yield {
				type: 'error',
				error: (error as Error).message,
			};
		}
	}

	/**
	 * Format retrieved documents as context for the LLM
	 */
	private formatContext(results: Array<{ content: string; metadata: { path: string } }>): string {
		return results
			.map((doc, i) => {
				return `Document ${i + 1}: ${doc.metadata.path}\n\n${doc.content}`;
			})
			.join('\n\n---\n\n');
	}

	/**
	 * Format conversation history for multi-turn context
	 */
	private formatConversationHistory(history: Message[]): string {
		if (!history || history.length === 0) return '';

		const formatted = history
			.map((msg) => {
				if (msg.role === 'user') {
					return `User: ${msg.content}`;
				} else {
					return `Assistant: ${msg.content}`;
				}
			})
			.join('\n\n');

		return `\nPrevious conversation:\n${formatted}\n`;
	}

	/**
	 * Update a single document (called when file changes)
	 */
	async updateDocument(file: TFile): Promise<void> {
		if (!this.isReady || this.isIndexing) return;

		try {
			const doc = await this.documentLoader.loadDocument(file);
			if (doc) {
				await this.vectorStore.updateDocument(doc);

				if (this.settings.verboseLogging) {
					console.log(`Updated: ${file.path}`);
				}

				// Auto-save periodically (debounced by caller)
			}
		} catch (error) {
			console.error(`Failed to update document: ${file.path}`, error);
		}
	}

	/**
	 * Remove a document (called when file is deleted)
	 */
	async removeDocument(file: TFile): Promise<void> {
		if (!this.isReady || this.isIndexing) return;

		try {
			await this.vectorStore.removeDocument(file.path);

			if (this.settings.verboseLogging) {
				console.log(`Removed: ${file.path}`);
			}
		} catch (error) {
			console.error(`Failed to remove document: ${file.path}`, error);
		}
	}

	/**
	 * Save vector store to disk
	 */
	async save(): Promise<void> {
		if (!this.isReady) return;

		try {
			await this.vectorStore.save(this.app.vault);

			if (this.settings.verboseLogging) {
				console.log('Vector store saved');
			}
		} catch (error) {
			console.error('Failed to save vector store:', error);
		}
	}

	/**
	 * Update settings and reinitialize if needed
	 */
	async updateSettings(settings: Settings): Promise<void> {
		const oldProvider = this.settings.activeProvider;
		this.settings = settings;

		// Update all components
		this.documentLoader.updateSettings(settings);
		this.vectorStore.updateSettings(settings);

		// Check if provider actually changed (by comparing settings, not objects)
		const providerChanged = oldProvider !== settings.activeProvider;

		if (providerChanged) {
			console.log(`Provider changed from ${oldProvider} to ${settings.activeProvider}`);

			// Save current vector store before switching
			if (this.isReady) {
				console.log('Saving current vector store before provider switch...');
				await this.save();
			}

			try {
				this.provider = createProvider(settings);
				this.vectorStore = new VectorStore(this.provider, settings, this.dataPath);
				this.isReady = false;

				new Notice('Provider changed. Reindexing required.', 5000);
				await this.initialize();
			} catch (error) {
				// Provider not implemented, reset to Ollama
				console.error('Provider error:', error);
				new Notice('Selected provider not available. Reverting to Ollama.', 5000);
				this.settings.activeProvider = 'ollama';
				const fallbackProvider = createProvider(this.settings);
				this.provider = fallbackProvider;
			}
		} else {
			// Same provider, just settings changed - no need to reinitialize
			if (this.settings.verboseLogging) {
				console.log('Settings updated, provider unchanged. No reindexing needed.');
			}
		}
	}

	/**
	 * Get current status
	 */
	getStatus(): {
		isReady: boolean;
		isIndexing: boolean;
		documentCount: number;
	} {
		return {
			isReady: this.isReady,
			isIndexing: this.isIndexing,
			documentCount: this.vectorStore.getDocumentCount(),
		};
	}

	/**
	 * Clear all data and reinitialize
	 */
	async rebuild(): Promise<void> {
		await this.vectorStore.clear();
		this.isReady = false;
		await this.indexVault();
	}
}
