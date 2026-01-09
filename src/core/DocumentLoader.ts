/**
 * Document Loader
 * Loads markdown files from the vault and prepares them for embedding
 */

import { App, TFile } from 'obsidian';
import type { Settings, Document } from '../types';

export class DocumentLoader {
	private app: App;
	private settings: Settings;

	constructor(app: App, settings: Settings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Load all documents from vault
	 * Excludes files based on settings patterns
	 */
	async loadAllDocuments(): Promise<Document[]> {
		const files = this.app.vault.getMarkdownFiles();
		const documents: Document[] = [];

		for (const file of files) {
			if (this.shouldInclude(file)) {
				const doc = await this.loadDocument(file);
				if (doc) {
					documents.push(doc);
				}
			}
		}

		if (this.settings.verboseLogging) {
			console.log(`Loaded ${documents.length} documents from ${files.length} total files`);
		}

		return documents;
	}

	/**
	 * Load a single document from a file
	 */
	async loadDocument(file: TFile): Promise<Document | null> {
		if (!this.shouldInclude(file)) {
			return null;
		}

		try {
			// Read file content
			const content = await this.app.vault.read(file);

			// Get metadata cache
			const cache = this.app.metadataCache.getFileCache(file);

			// Extract frontmatter
			const frontmatter = cache?.frontmatter || {};

			// Extract tags
			const tags = cache?.tags?.map((t) => t.tag) || [];

			// Remove frontmatter from content (we keep it in metadata)
			const cleanContent = this.removeFrontmatter(content);

			// Skip empty files
			if (!cleanContent.trim()) {
				if (this.settings.verboseLogging) {
					console.log(`Skipping empty file: ${file.path}`);
				}
				return null;
			}

			return {
				content: cleanContent,
				metadata: {
					path: file.path,
					mtime: file.stat.mtime,
					tags,
					frontmatter,
				},
			};
		} catch (error) {
			console.error(`Failed to load document: ${file.path}`, error);
			return null;
		}
	}

	/**
	 * Check if file should be included based on exclusion patterns
	 */
	private shouldInclude(file: TFile): boolean {
		const path = file.path;

		// Always exclude the chat folder to avoid recursion
		if (path.startsWith(this.settings.chatFolder + '/')) {
			return false;
		}

		// Check exclusion patterns
		for (const pattern of this.settings.excludePatterns) {
			if (this.matchesPattern(path, pattern)) {
				if (this.settings.verboseLogging) {
					console.log(`Excluding ${path} (matched pattern: ${pattern})`);
				}
				return false;
			}
		}

		return true;
	}

	/**
	 * Simple glob pattern matching
	 * Supports: * (any chars), ** (any path), ? (single char)
	 */
	private matchesPattern(path: string, pattern: string): boolean {
		// Convert glob pattern to regex
		let regex = pattern
			.replace(/\./g, '\\.') // Escape dots
			.replace(/\*\*/g, '§§') // Placeholder for **
			.replace(/\*/g, '[^/]*') // * matches anything except /
			.replace(/§§/g, '.*') // ** matches anything including /
			.replace(/\?/g, '.'); // ? matches single char

		// Match entire path
		regex = '^' + regex + '$';

		return new RegExp(regex).test(path);
	}

	/**
	 * Remove YAML frontmatter from content
	 */
	private removeFrontmatter(content: string): string {
		// Match frontmatter: ---\n...\n---
		const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
		return content.replace(frontmatterRegex, '').trim();
	}

	/**
	 * Get document count (without loading content)
	 * Useful for progress tracking
	 */
	getDocumentCount(): number {
		const files = this.app.vault.getMarkdownFiles();
		return files.filter((f) => this.shouldInclude(f)).length;
	}

	/**
	 * Update settings (e.g., when user changes exclusion patterns)
	 */
	updateSettings(settings: Settings): void {
		this.settings = settings;
	}
}
