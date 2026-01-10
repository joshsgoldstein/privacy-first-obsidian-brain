/**
 * Vector Store using Orama
 * Handles vector embeddings, full-text search, and hybrid search
 *
 * Orama Docs: https://docs.orama.com/
 */

import { create, insert, remove, search as oramaSearch, save, load, type Orama } from '@orama/orama';
import type { Document, VectorDocument, EmbeddingProvider, Settings } from '../types';
import { normalizePath, Notice } from 'obsidian';
import { chunkDocument } from '../utils/chunking';

export class VectorStore {
	private db: Orama<any> | null = null;
	private embeddings: EmbeddingProvider;
	private settings: Settings;
	private storePath: string;
	private isInitialized: boolean = false;

	constructor(embeddings: EmbeddingProvider, settings: Settings, dataPath: string) {
		this.embeddings = embeddings;
		this.settings = settings;
		this.storePath = normalizePath(`${dataPath}/vectorstore.json`);
	}

	/**
	 * Initialize the vector store
	 * Creates new DB or loads existing one
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		const dimensions = this.embeddings.getDimensions();

		this.db = await create({
			schema: {
				id: 'string', // Unique ID (path + chunk index)
				content: 'string', // Chunk text content (searchable for BM25)
				embedding: `vector[${dimensions}]` as any, // Vector embedding
				path: 'string', // Original file path (searchable)
				noteName: 'string', // Note title (searchable)
				mtime: 'number', // Last modified time
				chunkIndex: 'number', // Which chunk (0-based)
				totalChunks: 'number', // Total chunks for this document
				tags: 'string[]', // Tags from the note (searchable)
				frontmatter: 'string', // Frontmatter as JSON string (for metadata retrieval)
			},
			components: {
				tokenizer: {
					stemming: true, // Better full-text search
					stopWords: false, // Keep all words for better note search
				},
			},
		});

		this.isInitialized = true;

		if (this.settings.verboseLogging) {
			console.log(`Vector store initialized (${dimensions} dimensions)`);
		}
	}

	/**
	 * Add documents to the vector store
	 * Chunks documents and generates embeddings for each chunk
	 */
	async addDocuments(documents: Document[], onProgress?: (current: number, total: number) => void): Promise<void> {
		if (!this.db) {
			throw new Error('Vector store not initialized');
		}

		// Validate embedding dimensions match schema
		const expectedDimensions = this.embeddings.getDimensions();
		console.log(`📏 Expected embedding dimensions: ${expectedDimensions}`);

		const total = documents.length;

		for (let i = 0; i < documents.length; i++) {
			const doc = documents[i];
			if (!doc) continue;

			try {
				// Check if document already exists and if it's unchanged
				const existingChunks = await this.getDocumentChunks(doc.metadata.path);
				if (existingChunks.length > 0) {
					const existingMtime = existingChunks[0].mtime;
					if (existingMtime === doc.metadata.mtime) {
						// Document unchanged, skip re-embedding
						console.log(`⏭ Skipped (unchanged): ${doc.metadata.path}`);
						this.documentCount++;
						if (onProgress) {
							onProgress(i + 1, total);
						}
						continue;
					}
					// Document changed, remove old chunks
					await this.removeDocument(doc.metadata.path);
				}

				// Extract note name from path (filename without extension)
				const noteName = doc.metadata.path.split('/').pop()?.replace(/\.md$/, '') || doc.metadata.path;
				const tags = doc.metadata.tags || [];
				const frontmatter = JSON.stringify(doc.metadata.frontmatter || {});

				// Chunk the document
				const chunks = chunkDocument(doc.content, doc.metadata.path, {
					maxChunkSize: 1000, // ~250 tokens
					overlap: 200, // 20% overlap
				});

				if (this.settings.verboseLogging) {
					console.log(`Chunking ${doc.metadata.path}: ${chunks.length} chunks`);
				}

				// Embed and index each chunk
				for (const chunk of chunks) {
					const embedding = await this.embeddings.embed(chunk.content);

					// Validate embedding dimensions
					if (embedding.length !== expectedDimensions) {
						console.error(`❌ Dimension mismatch! Expected ${expectedDimensions}, got ${embedding.length}`);
						throw new Error(
							`Embedding dimension mismatch! Expected ${expectedDimensions}D, got ${embedding.length}D. ` +
							`Please rebuild the index with "Clear & Rebuild Index".`
						);
					}

					// Create unique ID for this chunk
					const chunkId = `${doc.metadata.path}#chunk${chunk.chunkIndex}`;

					await insert(this.db, {
						id: chunkId,
						content: chunk.content,
						embedding,
						path: doc.metadata.path,
						noteName,
						mtime: doc.metadata.mtime,
						chunkIndex: chunk.chunkIndex,
						totalChunks: chunk.totalChunks,
						tags,
						frontmatter,
					});
				}

				this.documentCount++;

				// Log completion
				console.log(`✓ Indexed: ${doc.metadata.path} (${chunks.length} chunk${chunks.length > 1 ? 's' : ''})`);

				// Progress callback
				if (onProgress) {
					onProgress(i + 1, total);
				}
			} catch (error) {
				console.error(`Failed to add document: ${doc.metadata.path}`, error);
			}
		}

		if (this.settings.verboseLogging) {
			console.log(`Added ${documents.length} documents to vector store`);
		}
	}

	/**
	 * Update a single document
	 * Removes all old chunks and adds new chunks
	 */
	async updateDocument(doc: Document): Promise<void> {
		if (!this.db) {
			throw new Error('Vector store not initialized');
		}

		try {
			// Remove all old chunks for this document
			await this.removeDocument(doc.metadata.path);

			// Extract note name and tags
			const noteName = doc.metadata.path.split('/').pop()?.replace(/\.md$/, '') || doc.metadata.path;
			const tags = doc.metadata.tags || [];
			const frontmatter = JSON.stringify(doc.metadata.frontmatter || {});

			// Chunk the document
			const chunks = chunkDocument(doc.content, doc.metadata.path, {
				maxChunkSize: 1000,
				overlap: 200,
			});

			// Add new chunks
			const expectedDimensions = this.embeddings.getDimensions();
			for (const chunk of chunks) {
				const embedding = await this.embeddings.embed(chunk.content);

				// Validate embedding dimensions
				if (embedding.length !== expectedDimensions) {
					console.error(`❌ Dimension mismatch! Expected ${expectedDimensions}, got ${embedding.length}`);
					throw new Error(
						`Embedding dimension mismatch! Expected ${expectedDimensions}D, got ${embedding.length}D. ` +
						`Please rebuild the index with "Clear & Rebuild Index".`
					);
				}

				const chunkId = `${doc.metadata.path}#chunk${chunk.chunkIndex}`;

				await insert(this.db, {
					id: chunkId,
					content: chunk.content,
					embedding,
					path: doc.metadata.path,
					noteName,
					mtime: doc.metadata.mtime,
					chunkIndex: chunk.chunkIndex,
					totalChunks: chunk.totalChunks,
					tags,
					frontmatter,
				});
			}

			this.documentCount++; // Increment since removeDocument decremented

			if (this.settings.verboseLogging) {
				console.log(`Updated document: ${doc.metadata.path} (${chunks.length} chunks)`);
			}
		} catch (error) {
			console.error(`Failed to update document: ${doc.metadata.path}`, error);
		}
	}

	/**
	 * Get all chunks for a document by path
	 */
	private async getDocumentChunks(path: string): Promise<any[]> {
		if (!this.db) {
			return [];
		}

		try {
			// Search for all chunks with this path
			const results = await oramaSearch(this.db, {
				term: path,
				properties: ['path'],
				limit: 1000, // Should be enough for any document
			});

			return results.hits.map((hit: any) => hit.document);
		} catch (error) {
			return [];
		}
	}

	/**
	 * Remove a document by path (removes all chunks)
	 */
	async removeDocument(path: string): Promise<void> {
		if (!this.db) {
			throw new Error('Vector store not initialized');
		}

		try {
			// Get all chunks for this document
			const chunks = await this.getDocumentChunks(path);

			// Remove each chunk
			for (const chunk of chunks) {
				await remove(this.db, chunk.id);
			}

			if (chunks.length > 0) {
				this.documentCount--;

				if (this.settings.verboseLogging) {
					console.log(`Removed document: ${path} (${chunks.length} chunks)`);
				}
			}
		} catch (error) {
			console.error(`Failed to remove document: ${path}`, error);
		}
	}

	/**
	 * Search using Orama's hybrid/vector/fulltext modes
	 * Returns documents sorted by relevance
	 */
	async similaritySearch(
		query: string,
		k: number = 5,
		options?: {
			mode?: 'fulltext' | 'vector' | 'hybrid';
			similarityThreshold?: number;
			fulltextThreshold?: number;
		}
	): Promise<VectorDocument[]> {
		if (!this.db) {
			throw new Error('Vector store not initialized');
		}

		const mode = options?.mode || this.settings.searchMode;
		const similarityThreshold = options?.similarityThreshold ?? this.settings.similarityThreshold;
		const fulltextThreshold = options?.fulltextThreshold ?? this.settings.fulltextThreshold;

		console.log(`🔍 Search mode: ${mode}, query: "${query}"`);

		try {
			let results: any;

			if (mode === 'vector') {
				// Pure vector search
				console.log('🔍 Generating embedding for query:', query);

				let queryEmbedding;
				try {
					queryEmbedding = await this.embeddings.embed(query);
					console.log('✅ Embedding generated:', {
						length: queryEmbedding?.length,
						type: typeof queryEmbedding,
						isArray: Array.isArray(queryEmbedding),
						firstValues: queryEmbedding?.slice(0, 3)
					});
				} catch (error) {
					console.error('❌ Failed to generate embedding:', error);
					return [];
				}

				if (!queryEmbedding || queryEmbedding.length === 0) {
					console.error('❌ Embedding is empty or undefined');
					return [];
				}

				console.log(`🔍 Performing vector search with ${queryEmbedding.length}D embedding`);

				results = await oramaSearch(this.db, {
					mode: 'vector',
					vector: {
						value: queryEmbedding,
						property: 'embedding',
					},
					similarity: similarityThreshold,
					includeVectors: false,
					limit: k,
				});

				console.log('✅ Vector search completed, results:', results.count);
			} else if (mode === 'fulltext') {
				// Pure full-text search (BM25)
				results = await oramaSearch(this.db, {
					term: query,
					properties: ['content', 'path', 'noteName', 'tags'],
					threshold: fulltextThreshold,
					includeVectors: false,
					limit: k,
					boost: {
						noteName: 3, // Highest boost for note title matches
						path: 2, // Boost matches in file path
						tags: 2, // Boost tag matches
						content: 1, // Base boost for content
					},
				});
			} else {
				// Hybrid search (combines both)
				const queryEmbedding = await this.embeddings.embed(query);

				if (!queryEmbedding || queryEmbedding.length === 0) {
					console.error('Failed to generate embedding for query:', query);
					// Fall back to fulltext only
					results = await oramaSearch(this.db, {
						term: query,
						properties: ['content', 'path', 'noteName', 'tags'],
						threshold: fulltextThreshold,
						includeVectors: false,
						limit: k,
						boost: {
							noteName: 3,
							path: 2,
							tags: 2,
							content: 1,
						},
					});
				} else {
					console.log(`Hybrid search with embedding dimensions: ${queryEmbedding.length}`);

					results = await oramaSearch(this.db, {
						mode: 'hybrid',
						term: query,
						vector: {
							value: queryEmbedding,
							property: 'embedding',
						},
						properties: ['content', 'path', 'noteName', 'tags'],
						similarity: similarityThreshold,
						threshold: fulltextThreshold,
						includeVectors: false,
						limit: k,
						boost: {
							noteName: 3,
							path: 2,
							tags: 2,
							content: 1,
						},
					});
				}
			}

			// Convert Orama results to VectorDocuments
			const documents: VectorDocument[] = results.hits.map((hit: any) => ({
				content: hit.document.content,
				metadata: {
					path: hit.document.path,
					mtime: hit.document.mtime,
				},
				embedding: hit.document.embedding,
				score: hit.score,
			}));

			if (this.settings.verboseLogging) {
				console.log(`Search (${mode}): Found ${documents.length} results for "${query}"`);
			}

			return documents;
		} catch (error) {
			console.error('Search error:', error);
			new Notice('Search failed. Check console for details.');
			return [];
		}
	}

	/**
	 * Save vector store to disk
	 */
	async save(fs: any): Promise<void> {
		if (!this.db) {
			throw new Error('Vector store not initialized');
		}

		try {
			const data = await save(this.db);
			const jsonData = JSON.stringify(data);

			// Write to file using Obsidian's adapter
			await fs.adapter.write(this.storePath, jsonData);

			if (this.settings.verboseLogging) {
				console.log(`Vector store saved to ${this.storePath}`);
			}
		} catch (error) {
			console.error('Failed to save vector store:', error);
		}
	}

	/**
	 * Load vector store from disk
	 * Returns true if loaded successfully
	 */
	async load(fs: any): Promise<boolean> {
		try {
			// Check if file exists
			const exists = await fs.adapter.exists(this.storePath);
			if (!exists) {
				return false;
			}

			// Read data
			const jsonData = await fs.adapter.read(this.storePath);
			const data = JSON.parse(jsonData);

			// Check if dimensions match
			const currentDimensions = this.embeddings.getDimensions();
			const storedDimensions = data.schema?.embedding?.match(/vector\[(\d+)\]/)?.[1];

			if (storedDimensions && parseInt(storedDimensions) !== currentDimensions) {
				console.warn(`⚠️ Dimension mismatch detected!`);
				console.warn(`   Stored: ${storedDimensions}D, Current model: ${currentDimensions}D`);
				new Notice(
					`⚠️ Vector store dimension mismatch!\n` +
					`Stored: ${storedDimensions}D, Current: ${currentDimensions}D\n` +
					`Please rebuild the index to use the new model.`,
					8000
				);
				return false;
			}

			// Restore Orama DB
			const dimensions = this.embeddings.getDimensions();

			this.db = await create({
				schema: {
					id: 'string',
					content: 'string',
					embedding: `vector[${dimensions}]` as any,
					path: 'string',
					noteName: 'string',
					mtime: 'number',
					chunkIndex: 'number',
					totalChunks: 'number',
					tags: 'string[]',
					frontmatter: 'string',
				},
				components: {
					tokenizer: {
						stemming: true,
						stopWords: false,
					},
				},
			});

			await load(this.db, data);

			this.isInitialized = true;

			// Count documents after loading
			// Get unique paths from the loaded data
			const uniquePaths = new Set<string>();
			if (data.docs) {
				for (const doc of Object.values(data.docs) as any[]) {
					if (doc?.path) {
						uniquePaths.add(doc.path);
					}
				}
			}
			this.documentCount = uniquePaths.size;

			console.log(`✅ Vector store loaded from ${this.storePath}`);
			console.log(`📊 Loaded ${this.documentCount} documents`);

			if (this.settings.verboseLogging) {
				console.log(`Vector store loaded from ${this.storePath}`);
			}

			return true;
		} catch (error) {
			console.error('Failed to load vector store:', error);
			return false;
		}
	}

	/**
	 * Get document count
	 */
	private documentCount: number = 0;

	getDocumentCount(): number {
		return this.documentCount;
	}

	/**
	 * Get vector store statistics
	 */
	async getStats(): Promise<{
		documentCount: number;
		isInitialized: boolean;
		storePath: string;
		embeddingDimensions: number;
	}> {
		return {
			documentCount: this.documentCount,
			isInitialized: this.isInitialized,
			storePath: this.storePath,
			embeddingDimensions: this.embeddings.getDimensions(),
		};
	}

	/**
	 * Export vector store info for debugging
	 */
	async exportInfo(): Promise<string> {
		const stats = await this.getStats();

		let info = '# Vector Store Info\n\n';
		info += `- Documents: ${stats.documentCount}\n`;
		info += `- Initialized: ${stats.isInitialized}\n`;
		info += `- Storage: ${stats.storePath}\n`;
		info += `- Dimensions: ${stats.embeddingDimensions}\n`;
		info += `- Search Mode: ${this.settings.searchMode}\n`;
		info += `- Similarity Threshold: ${this.settings.similarityThreshold}\n`;
		info += `- Fulltext Threshold: ${this.settings.fulltextThreshold}\n`;

		return info;
	}

	/**
	 * Clear all documents
	 */
	async clear(): Promise<void> {
		console.log('🗑️ Clearing vector store...');

		// Reinitialize to create fresh empty database
		this.isInitialized = false;
		await this.initialize();
		this.documentCount = 0;

		console.log('✅ Vector store cleared (in-memory)');

		if (this.settings.verboseLogging) {
			console.log('Vector store cleared');
		}
	}

	/**
	 * Update settings
	 */
	updateSettings(settings: Settings): void {
		this.settings = settings;
	}
}
