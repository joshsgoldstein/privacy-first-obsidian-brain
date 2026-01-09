import { Notice, Plugin, TFile } from 'obsidian';
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

		// Validate and fix provider setting (reset to ollama if not implemented)
		if (this.settings.activeProvider !== 'ollama') {
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
