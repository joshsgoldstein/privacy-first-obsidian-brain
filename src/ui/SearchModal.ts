/**
 * Simple modal for search input and results
 */

import { App, Modal, Notice, Setting } from 'obsidian';
import type { RAGEngine } from '../core/RAGEngine';
import type { VectorDocument } from '../types';

export class SearchModal extends Modal {
	private ragEngine: RAGEngine;
	private query: string = '';
	private resultsContainer: HTMLElement | null = null;

	constructor(app: App, ragEngine: RAGEngine) {
		super(app);
		this.ragEngine = ragEngine;
	}

	onOpen() {
		const { contentEl, modalEl } = this;
		contentEl.empty();

		// Add class to modal element for styling
		modalEl.addClass('smart-brain-search-modal');

		contentEl.createEl('h2', { text: 'Test Search Query' });

		// Search input
		new Setting(contentEl)
			.setName('Query')
			.setDesc('Enter your search query')
			.addText((text) =>
				text
					.setPlaceholder('e.g., meeting notes about project')
					.setValue(this.query)
					.onChange((value) => {
						this.query = value;
					})
					.inputEl.addEventListener('keydown', (e) => {
						if (e.key === 'Enter') {
							this.handleSearch();
						}
					})
			)
			.addButton((button) =>
				button
					.setButtonText('Search')
					.setCta()
					.onClick(() => this.handleSearch())
			);

		// Results container
		this.resultsContainer = contentEl.createDiv('search-results-container');
	}

	private async handleSearch() {
		if (!this.query.trim()) {
			new Notice('Please enter a search query', 3000);
			return;
		}

		await this.performSearch(this.query);
	}

	onClose() {
		const { contentEl, modalEl } = this;
		contentEl.empty();
		// Clean up classes
		modalEl.removeClass('smart-brain-search-modal');
		modalEl.removeClass('has-results');
	}

	private async performSearch(query: string) {
		if (!this.resultsContainer) return;

		// Show loading
		this.resultsContainer.empty();
		this.resultsContainer.createEl('p', { text: 'Searching...', cls: 'search-loading' });

		console.log(`\n🔍 Searching for: "${query}"\n`);

		try {
			// Search the vector store using same settings as RAG
			const settings = this.ragEngine.getSettings();
			const results = await this.ragEngine.vectorStore.similaritySearch(query, settings.topK, {
				mode: settings.searchMode,
				similarityThreshold: settings.similarityThreshold,
				fulltextThreshold: settings.fulltextThreshold,
			});

			console.log(`Found ${results.length} results:\n`);
			results.forEach((result, i) => {
				console.log(`${i + 1}. ${result.metadata.path} (score: ${result.score?.toFixed(3)})`);
				console.log(`   Content: ${result.content.substring(0, 150)}...\n`);
			});

			// Display results
			this.displayResults(results);
		} catch (error) {
			console.error('Search error:', error);
			this.resultsContainer.empty();
			this.resultsContainer.createEl('p', {
				text: `Search failed: ${(error as Error).message}`,
				cls: 'search-error',
			});
		}
	}

	private displayResults(results: VectorDocument[]) {
		if (!this.resultsContainer) return;

		this.resultsContainer.empty();

		if (results.length === 0) {
			this.resultsContainer.createEl('p', {
				text: 'No results found. Try a different query or check your search settings.',
				cls: 'search-no-results',
			});
			// Remove expanded class when no results
			this.modalEl.removeClass('has-results');
			return;
		}

		// Add expanded class when results are shown
		this.modalEl.addClass('has-results');

		// Header
		const header = this.resultsContainer.createEl('h3', {
			text: `Found ${results.length} result${results.length > 1 ? 's' : ''}`,
		});

		// Results list
		const resultsList = this.resultsContainer.createDiv('search-results-list');

		results.forEach((result, i) => {
			const resultItem = resultsList.createDiv('search-result-item');

			// Result header (file path + score)
			const resultHeader = resultItem.createDiv('search-result-header');
			resultHeader.createEl('span', {
				text: `${i + 1}. ${result.metadata.path}`,
				cls: 'search-result-path',
			});

			if (result.score !== undefined) {
				resultHeader.createEl('span', {
					text: `${(result.score * 100).toFixed(1)}%`,
					cls: 'search-result-score',
				});
			}

			// Content preview
			const preview = result.content.substring(0, 200);
			resultItem.createEl('p', {
				text: preview + (result.content.length > 200 ? '...' : ''),
				cls: 'search-result-content',
			});

			// Click to open file
			resultItem.addEventListener('click', () => {
				const file = this.app.vault.getAbstractFileByPath(result.metadata.path);
				if (file) {
					this.app.workspace.openLinkText(result.metadata.path, '', false);
					this.close();
				}
			});
		});
	}
}
