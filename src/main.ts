import { MarkdownRenderer, Modal, Notice, Plugin, Setting, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, SmartSecondBrainSettingTab } from './settings';
import { createProvider } from './providers';
import { RAGEngine } from './core/RAGEngine';
import { SearchModal } from './ui/SearchModal';
import type { Settings } from './types';

/**
 * Smart Second Brain Plugin
 * Phase 1: Testing basic setup
 */
export default class SmartSecondBrainPlugin extends Plugin {
	settings: Settings;
	private statusBarItem: HTMLElement;
	private ragEngine: RAGEngine;
	private saveTimer: NodeJS.Timeout | null = null;

	async onload() {
		console.log('Loading Smart Second Brain plugin...');

		// Load settings
		await this.loadSettings();

		// Add status bar item
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText('🧠 Initializing...');

		// Initialize RAG Engine
		// Use the actual plugin folder (obsidian-sample-plugin) not the manifest ID
		const pluginDir = this.app.vault.configDir + '/plugins/obsidian-sample-plugin';
		this.ragEngine = new RAGEngine(this.app, this.settings, pluginDir);
		await this.ragEngine.initialize();

		// Add ribbon icons
		// Brain icon - shows status
		this.addRibbonIcon('brain', 'Smart Second Brain Status', () => {
			const status = this.ragEngine.getStatus();
			new Notice(
				`Smart Second Brain\n` +
					`Documents: ${status.documentCount}\n` +
					`Status: ${status.isIndexing ? 'Indexing...' : status.isReady ? 'Ready' : 'Not ready'}`,
				5000
			);
		});

		// Search icon - opens search modal
		this.addRibbonIcon('search', 'Search Knowledge Base', () => {
			new SearchModal(this.app, this.ragEngine).open();
		});

		// Add settings tab
		this.addSettingTab(new SmartSecondBrainSettingTab(this.app, this));

		// Setup file change listeners for automatic indexing
		this.setupFileWatchers();

		// Add commands
		this.addCommand({
			id: 'test-provider',
			name: 'Test Provider Connection',
			callback: async () => {
				await this.testProvider();
			},
		});

		this.addCommand({
			id: 'ask-question',
			name: 'Ask a Question',
			callback: async () => {
				// Prompt for question
				const question = await this.promptForQuestion();
				if (!question) return;

				// Open answer modal and stream response
				await this.showAnswerModal(question);
			},
		});

		this.addCommand({
			id: 'rebuild-index',
			name: 'Rebuild Vector Store',
			callback: async () => {
				await this.ragEngine.rebuild();
			},
		});

		this.addCommand({
			id: 'show-vector-store-info',
			name: 'Show Vector Store Info',
			callback: async () => {
				const info = await this.ragEngine.vectorStore.exportInfo();
				new Notice(info, 10000);
				console.log(info);
			},
		});

		this.addCommand({
			id: 'test-search',
			name: 'Test Search Query',
			callback: () => {
				new SearchModal(this.app, this.ragEngine).open();
			},
		});

		this.addCommand({
			id: 'switch-to-fulltext',
			name: 'Switch Search Mode to Full-text (BM25)',
			callback: async () => {
				this.settings.searchMode = 'fulltext';
				await this.saveSettings();
				new Notice('✅ Search mode: Full-text (BM25)', 3000);
			},
		});

		this.addCommand({
			id: 'switch-to-vector',
			name: 'Switch Search Mode to Vector (Semantic)',
			callback: async () => {
				this.settings.searchMode = 'vector';
				await this.saveSettings();
				new Notice('✅ Search mode: Vector (Semantic)', 3000);
			},
		});

		this.addCommand({
			id: 'switch-to-hybrid',
			name: 'Switch Search Mode to Hybrid (BM25 + Vector)',
			callback: async () => {
				this.settings.searchMode = 'hybrid';
				await this.saveSettings();
				new Notice('✅ Search mode: Hybrid (BM25 + Vector)', 3000);
			},
		});

		// Update status bar periodically
		this.registerInterval(
			window.setInterval(() => {
				this.updateStatusBar();
			}, 5000) // Update every 5 seconds
		);

		// Auto-save vector store every 5 minutes
		this.registerInterval(
			window.setInterval(async () => {
				await this.ragEngine.save();
			}, 5 * 60 * 1000) // 5 minutes
		);

		// Initial status update
		this.updateStatusBar();

		console.log('Smart Second Brain plugin loaded!');
	}

	onunload() {
		console.log('Unloading Smart Second Brain plugin...');

		// Clear save timer
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}
	}

	/**
	 * Update status bar with current state
	 */
	private updateStatusBar(): void {
		if (!this.ragEngine) {
			this.statusBarItem.setText('🧠 Initializing...');
			return;
		}

		const status = this.ragEngine.getStatus();
		const providerName =
			this.settings.activeProvider === 'ollama'
				? 'Ollama'
				: this.settings.activeProvider === 'openai'
					? 'OpenAI'
					: 'Claude';

		if (status.isIndexing) {
			this.statusBarItem.setText(`🧠 Indexing... (${providerName})`);
		} else if (status.isReady) {
			this.statusBarItem.setText(`🧠 ${status.documentCount} docs (${providerName})`);
		} else {
			this.statusBarItem.setText(`🧠 Not ready (${providerName})`);
		}

		// Click to show detailed info
		this.statusBarItem.onclick = async () => {
			const info = await this.ragEngine.vectorStore.exportInfo();
			new Notice(info, 10000);
		};
	}

	/**
	 * Setup file change listeners for automatic indexing
	 */
	private setupFileWatchers(): void {
		// Watch for file creation
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.ragEngine.updateDocument(file);
					this.debouncedSave();
				}
			})
		);

		// Watch for file modification
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.ragEngine.updateDocument(file);
					this.debouncedSave();
				}
			})
		);

		// Watch for file deletion
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.ragEngine.removeDocument(file);
					this.debouncedSave();
				}
			})
		);

		// Watch for file rename (appears as delete + create)
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				if (file instanceof TFile && file.extension === 'md') {
					// Remove old document
					this.ragEngine.removeDocument({ path: oldPath } as TFile);
					// Add new document
					this.ragEngine.updateDocument(file);
					this.debouncedSave();
				}
			})
		);
	}

	/**
	 * Show answer modal with streaming response
	 */
	private async showAnswerModal(question: string): Promise<void> {
		const modal = new Modal(this.app);
		modal.titleEl.setText('🧠 Smart Second Brain');

		// Add styling
		modal.modalEl.addClass('rag-answer-modal');

		// Fixed Question section at top
		const questionSection = modal.contentEl.createDiv('rag-question-section');
		const questionEl = questionSection.createDiv('rag-question');
		questionEl.createEl('h3', { text: 'Question' });
		questionEl.createDiv({ text: question, cls: 'rag-question-text' });

		// Scrollable Answer section in middle
		const scrollableContent = modal.contentEl.createDiv('rag-scrollable-content');
		const answerContainer = scrollableContent.createDiv('rag-answer');
		const answerEl = answerContainer.createDiv('rag-answer-content');

		// Stage 1: Searching the index
		answerEl.setText('🔍 Searching through your notes...');

		// Create fixed button footer with buttons visible immediately
		const buttonFooter = modal.contentEl.createDiv('rag-button-footer');

		// Left side buttons
		const leftButtons = buttonFooter.createDiv('rag-button-left');
		const saveButton = leftButtons.createEl('button', { text: '💾 Save as Note' });
		saveButton.disabled = true; // Disable until answer is ready

		// Right side buttons
		const rightButtons = buttonFooter.createDiv('rag-button-right');
		const copyButton = rightButtons.createEl('button', { text: '📋 Copy' });
		copyButton.disabled = true; // Disable until answer is ready

		const closeButton = rightButtons.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => modal.close());

		modal.open();

		try {
			let answer = '';
			let sources: any[] = [];
			let hasStartedStreaming = false;

			// Run RAG pipeline (retrieve + generate)
			for await (const chunk of this.ragEngine.query(question)) {
				if (chunk.type === 'status') {
					// Status update from RAG engine
					if (chunk.status === 'generating') {
						answerEl.setText('🤔 Thinking about your question...');
					}
				} else if (chunk.type === 'content') {
					// Clear status message on first content chunk
					if (!hasStartedStreaming) {
						answerEl.empty();
						hasStartedStreaming = true;
					}

					answer += chunk.content;

					// Render markdown (re-render on each chunk for streaming effect)
					answerEl.empty();
					await MarkdownRenderer.render(
						this.app,
						answer,
						answerEl,
						'',
						this
					);
				} else if (chunk.type === 'sources') {
					sources = chunk.sources;
				} else if (chunk.type === 'error') {
					answerEl.empty();
					answerEl.createEl('p', {
						text: `❌ Error: ${chunk.error}`,
						cls: 'rag-error',
					});
					return;
				}
			}

			// Enable buttons now that answer is complete
			saveButton.disabled = false;
			copyButton.disabled = false;

			// Add button click handlers
			saveButton.addEventListener('click', async () => {
				await this.saveAnswerAsNote(question, answer, sources);
				modal.close();
			});

			copyButton.addEventListener('click', () => {
				navigator.clipboard.writeText(answer);
				new Notice('Answer copied to clipboard!');
			});
		} catch (error) {
			console.error('RAG query error:', error);
			answerEl.empty();
			answerEl.createEl('p', {
				text: `❌ Failed: ${(error as Error).message}`,
				cls: 'rag-error',
			});
		}
	}

	/**
	 * Save RAG answer as a note in the vault
	 */
	private async saveAnswerAsNote(question: string, answer: string, sources: any[]): Promise<void> {
		// Generate default filename from question (sanitize for file system)
		const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
		const questionSlug = question
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.substring(0, 50);
		const defaultName = `${timestamp}-${questionSlug}`;

		// Prompt for filename
		const filename = await this.promptForFilename(defaultName);
		if (!filename) return;

		// Format note content with YAML frontmatter
		const now = new Date();
		const noteContent = `---
title: "${question}"
type: rag-answer
tags:
  - smart-brain
  - ai-generated
provider: ${this.settings.activeProvider}
search_mode: ${this.settings.searchMode}
created: ${now.toISOString()}
sources: ${sources.length}
---

# ${question}

${answer}
`;

		// Determine save location (QnA folder)
		const folder = 'QnA';
		const filePath = `${folder}/${filename}.md`;

		try {
			// Create QnA folder if it doesn't exist
			const folderExists = this.app.vault.getAbstractFileByPath(folder);
			if (!folderExists) {
				await this.app.vault.createFolder(folder);
			}

			// Create the note
			const file = await this.app.vault.create(filePath, noteContent);

			// Show success message and open the note
			new Notice(`✅ Saved to ${filePath}`);
			await this.app.workspace.openLinkText(filePath, '', false);
		} catch (error) {
			console.error('Failed to save note:', error);
			new Notice(`❌ Failed to save: ${(error as Error).message}`);
		}
	}

	/**
	 * Prompt user for a filename
	 */
	private async promptForFilename(defaultName: string): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Save Answer as Note');

			let inputEl: HTMLInputElement;

			new Setting(modal.contentEl)
				.setName('Filename')
				.setDesc('Enter a name for this note (without .md extension)')
				.addText((text) => {
					text.setValue(defaultName);
					inputEl = text.inputEl;

					// Submit on Enter
					text.inputEl.addEventListener('keydown', (e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							const filename = inputEl.value.trim();
							modal.close();
							resolve(filename || null);
						}
					});

					// Auto-focus and select all
					setTimeout(() => {
						text.inputEl.focus();
						text.inputEl.select();
					}, 10);
				})
				.addButton((button) =>
					button
						.setButtonText('Save')
						.setCta()
						.onClick(() => {
							const filename = inputEl.value.trim();
							modal.close();
							resolve(filename || null);
						})
				);

			// Cancel button
			new Setting(modal.contentEl).addButton((button) =>
				button.setButtonText('Cancel').onClick(() => {
					modal.close();
					resolve(null);
				})
			);

			modal.open();
		});
	}

	/**
	 * Prompt user for a question using a modal
	 */
	private async promptForQuestion(): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Ask a Question');

			let inputEl: HTMLInputElement;

			new Setting(modal.contentEl)
				.setName('Your question')
				.setDesc('Ask anything about your notes')
				.addText((text) => {
					text.setPlaceholder('e.g., What are my main project goals?');

					// Store reference to input element
					inputEl = text.inputEl;

					// Submit on Enter
					text.inputEl.addEventListener('keydown', (e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							const question = inputEl.value.trim();
							modal.close();
							resolve(question || null);
						}
					});

					// Auto-focus
					setTimeout(() => text.inputEl.focus(), 10);
				})
				.addButton((button) =>
					button
						.setButtonText('Ask')
						.setCta()
						.onClick(() => {
							const question = inputEl.value.trim();
							modal.close();
							resolve(question || null);
						})
				);

			// Cancel button
			new Setting(modal.contentEl).addButton((button) =>
				button.setButtonText('Cancel').onClick(() => {
					modal.close();
					resolve(null);
				})
			);

			modal.open();
		});
	}

	/**
	 * Debounced save for vector store
	 * Waits 30 seconds after last change before saving
	 */
	private debouncedSave(): void {
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}

		this.saveTimer = setTimeout(async () => {
			await this.ragEngine.save();
			this.saveTimer = null;
		}, 30000); // 30 seconds
	}

	/**
	 * Load settings from disk
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Validate provider setting
		const validProviders = ['ollama', 'openai', 'anthropic'];
		if (!validProviders.includes(this.settings.activeProvider)) {
			console.log(`Invalid provider '${this.settings.activeProvider}' detected, resetting to Ollama`);
			this.settings.activeProvider = 'ollama';
			await this.saveData(this.settings);
		}

		// Fix common embedding model issues
		if (this.settings.ollamaEmbeddingModel === 'nomic-embed-text') {
			console.log('Updating embedding model from nomic-embed-text to snowflake-arctic-embed:335m');
			this.settings.ollamaEmbeddingModel = 'snowflake-arctic-embed:335m';
			await this.saveData(this.settings);
		}
	}

	/**
	 * Save settings to disk
	 */
	async saveSettings() {
		await this.saveData(this.settings);

		// Update RAG Engine with new settings
		if (this.ragEngine) {
			await this.ragEngine.updateSettings(this.settings);
		}
	}

	/**
	 * Test provider connection
	 * This is useful for debugging
	 */
	async testProvider() {
		new Notice(`Testing ${this.settings.activeProvider} connection...`);

		try {
			// Create provider based on current settings
			const provider = createProvider(this.settings);

			// Validate connection
			const error = await provider.validate();

			if (error) {
				new Notice(`❌ Error: ${error}`, 10000);
				console.error('Provider validation failed:', error);
				return;
			}

			new Notice(`✅ ${provider.name} connected successfully!`, 5000);

			// List available models
			const models = await provider.listModels();
			console.log('Available models:', models);

			if (models.length > 0) {
				new Notice(`Found ${models.length} models`, 3000);
			}

			// Test embedding (if you have Ollama running)
			if (this.settings.activeProvider === 'ollama') {
				new Notice('Testing embedding...', 2000);
				const embedding = await provider.embed('Hello world');
				console.log('Embedding dimensions:', embedding.length);
				new Notice(`✅ Embedding works! (${embedding.length} dimensions)`, 3000);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			new Notice(`❌ Provider test failed: ${errorMessage}`, 10000);
			console.error('Provider test error:', error);
		}
	}
}
