import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type SmartSecondBrainPlugin from './main';
import type { Settings } from './types';

/**
 * Default settings for the plugin
 * These are used on first install
 */
export const DEFAULT_SETTINGS: Settings = {
	// Provider
	activeProvider: 'ollama',

	// Ollama (local)
	ollamaUrl: 'http://localhost:11434',
	ollamaModel: 'llama3:latest',
	ollamaEmbeddingModel: 'snowflake-arctic-embed:335m',

	// OpenAI (cloud)
	openaiApiKey: '',
	openaiModel: 'gpt-4o',
	openaiEmbeddingModel: 'text-embedding-3-small',

	// Anthropic (cloud)
	anthropicApiKey: '',
	anthropicModel: 'claude-3-5-sonnet-20241022',

	// Voyage AI (for Anthropic embeddings)
	voyageApiKey: '',
	voyageEmbeddingModel: 'voyage-2',

	// RAG parameters
	searchMode: 'hybrid',
	similarityThreshold: 0.3,
	fulltextThreshold: 0,
	topK: 5,
	temperature: 0.7,
	hybridTextWeight: 0.8, // Favor keyword matches
	hybridVectorWeight: 0.2, // Secondary: semantic similarity

	// UI
	viewMode: 'comfy',
	chatFolder: 'Chats',

	// Privacy
	incognitoMode: false,

	// Exclusions
	excludePatterns: ['.obsidian/**', 'Archive/**', 'Templates/**', 'Prompts/**'],

	// Advanced
	verboseLogging: false,

	// Prompts
	activePromptTemplate: 'rag-default',

	// Opik (LLM Observability) - OFF by default
	opikEnabled: false,
	opikUrl: 'http://localhost:5173/api',
	opikApiKey: '',
	opikProjectName: 'smart-second-brain',
	opikWorkspaceName: '',
};

/**
 * Settings tab in Obsidian settings
 * This creates the UI for configuring the plugin
 */
export class SmartSecondBrainSettingTab extends PluginSettingTab {
	plugin: SmartSecondBrainPlugin;
	private ollamaModels: string[] = [];
	private ollamaEmbeddingModels: string[] = [];
	private statusInterval: number | null = null;
	private ollamaUrlDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private isInitialModelLoad = true;

	constructor(app: App, plugin: SmartSecondBrainPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide() {
		// Clean up interval when settings are closed
		if (this.statusInterval) {
			window.clearInterval(this.statusInterval);
			this.statusInterval = null;
		}
		if (this.ollamaUrlDebounceTimer) {
			clearTimeout(this.ollamaUrlDebounceTimer);
			this.ollamaUrlDebounceTimer = null;
			this.plugin.saveSettings().catch(console.error);
		}
	}

	async display(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();

		// Header
		containerEl.createEl('h2', { text: 'Smart Second Brain Settings' });

		// Load Ollama models in background (non-blocking)
		if (this.plugin.settings.activeProvider === 'ollama' && this.ollamaModels.length === 0) {
			const skipRefresh = this.isInitialModelLoad;
			this.isInitialModelLoad = false;
			this.loadOllamaModels().then(() => {
				// Only re-render if this wasn't the initial load (avoids stealing
				// focus from text inputs on mobile while the user may be editing)
				if (!skipRefresh && this.plugin.settings.activeProvider === 'ollama') {
					this.display();
				}
			});
		}

		// ====================================================================
		// Provider Selection
		// ====================================================================

		new Setting(containerEl)
			.setName('AI Provider')
			.setDesc('Choose your AI provider')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('ollama', 'Ollama (Local)')
					.addOption('openai', 'OpenAI')
					.addOption('anthropic', 'Anthropic Claude')
					.setValue(this.plugin.settings.activeProvider)
					.onChange(async (value) => {
						this.plugin.settings.activeProvider = value as 'ollama' | 'openai' | 'anthropic';
						await this.plugin.saveSettings();
						this.display(); // Refresh to show relevant settings
					})
			);

		// ====================================================================
		// Ollama Settings (only show if active)
		// ====================================================================

		if (this.plugin.settings.activeProvider === 'ollama') {
			containerEl.createEl('h3', { text: 'Ollama Settings' });

			// Ollama URL with reload button
			new Setting(containerEl)
				.setName('Ollama URL')
				.setDesc('URL of your Ollama server. Use http://localhost:11434 for local, or your server IP (e.g. http://192.168.1.x:11434) for remote.')
				.addText((text) =>
					text
						.setPlaceholder('http://192.168.1.x:11434')
						.setValue(this.plugin.settings.ollamaUrl)
						.onChange((value) => {
							this.plugin.settings.ollamaUrl = value;
							// Debounce the save so it doesn't fire on every keystroke,
							// which causes issues on mobile (lag, focus loss)
							if (this.ollamaUrlDebounceTimer) {
								clearTimeout(this.ollamaUrlDebounceTimer);
							}
							this.ollamaUrlDebounceTimer = setTimeout(async () => {
								await this.plugin.saveSettings();
								// Auto-reload models from the new URL
								this.ollamaModels = [];
								this.ollamaEmbeddingModels = [];
								await this.loadOllamaModels();
								this.display();
							}, 500);
						})
				)
				.addButton((button) =>
					button
						.setButtonText('Reload Models')
						.setTooltip('Refresh model list from Ollama')
						.onClick(async () => {
							button.setButtonText('Loading...');
							button.setDisabled(true);
							await this.loadOllamaModels();
							this.display(); // Refresh the entire settings UI
							button.setButtonText('Reload Models');
							button.setDisabled(false);
						})
				);

			// Generation Model dropdown
			new Setting(containerEl)
				.setName('Generation Model')
				.setDesc('Model for generating responses')
				.addDropdown((dropdown) => {
					// Add available models
					if (this.ollamaModels.length > 0) {
						this.ollamaModels.forEach((model) => {
							dropdown.addOption(model, model);
						});
					} else {
						// Fallback if no models loaded
						dropdown.addOption(this.plugin.settings.ollamaModel, this.plugin.settings.ollamaModel);
					}

					dropdown
						.setValue(this.plugin.settings.ollamaModel)
						.onChange(async (value) => {
							this.plugin.settings.ollamaModel = value;
							await this.plugin.saveSettings();
						});
				});

			// Embedding Model dropdown
			new Setting(containerEl)
				.setName('Embedding Model')
				.setDesc('Model for creating embeddings')
				.addDropdown((dropdown) => {
					// Add available embedding models
					if (this.ollamaEmbeddingModels.length > 0) {
						this.ollamaEmbeddingModels.forEach((model) => {
							dropdown.addOption(model, model);
						});
					} else {
						// Fallback if no models loaded
						dropdown.addOption(
							this.plugin.settings.ollamaEmbeddingModel,
							this.plugin.settings.ollamaEmbeddingModel
						);
					}

					dropdown
						.setValue(this.plugin.settings.ollamaEmbeddingModel)
						.onChange(async (value) => {
							this.plugin.settings.ollamaEmbeddingModel = value;
							await this.plugin.saveSettings();
						});
				});

			// Show helpful message if no models found
			if (this.ollamaModels.length === 0) {
				const noModelsEl = containerEl.createEl('p', {
					text: 'No models found. Make sure Ollama is running and models are installed.',
					cls: 'setting-item-description',
				});
				noModelsEl.style.color = 'var(--text-error)';
			}
		}

		// ====================================================================
		// OpenAI Settings (only show if active)
		// ====================================================================

		if (this.plugin.settings.activeProvider === 'openai') {
			containerEl.createEl('h3', { text: 'OpenAI Settings' });

			new Setting(containerEl)
				.setName('API Key')
				.setDesc('Your OpenAI API key (starts with sk-)')
				.addText((text) =>
					text
						.setPlaceholder('sk-...')
						.setValue(this.plugin.settings.openaiApiKey)
						.onChange(async (value) => {
							this.plugin.settings.openaiApiKey = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName('Model')
				.setDesc('OpenAI model to use')
				.addDropdown((dropdown) =>
					dropdown
						.addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
						.addOption('gpt-4', 'GPT-4')
						.addOption('gpt-4-turbo', 'GPT-4 Turbo')
						.addOption('gpt-4o', 'GPT-4o')
						.setValue(this.plugin.settings.openaiModel)
						.onChange(async (value) => {
							this.plugin.settings.openaiModel = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName('Embedding Model')
				.setDesc('Model for creating embeddings')
				.addDropdown((dropdown) =>
					dropdown
						.addOption('text-embedding-3-small', 'text-embedding-3-small (Recommended)')
						.addOption('text-embedding-3-large', 'text-embedding-3-large')
						.addOption('text-embedding-ada-002', 'text-embedding-ada-002 (Legacy)')
						.setValue(this.plugin.settings.openaiEmbeddingModel)
						.onChange(async (value) => {
							this.plugin.settings.openaiEmbeddingModel = value;
							await this.plugin.saveSettings();
						})
				);
		}

		// ====================================================================
		// Anthropic Settings (only show if active)
		// ====================================================================

		if (this.plugin.settings.activeProvider === 'anthropic') {
			containerEl.createEl('h3', { text: 'Anthropic Claude Settings' });

			new Setting(containerEl)
				.setName('API Key')
				.setDesc('Your Anthropic API key')
				.addText((text) =>
					text
						.setPlaceholder('sk-ant-...')
						.setValue(this.plugin.settings.anthropicApiKey)
						.onChange(async (value) => {
							this.plugin.settings.anthropicApiKey = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName('Model')
				.setDesc('Claude model to use')
				.addDropdown((dropdown) =>
					dropdown
						.addOption('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet (Recommended)')
						.addOption('claude-3-opus-20240229', 'Claude 3 Opus')
						.addOption('claude-3-haiku-20240307', 'Claude 3 Haiku')
						.setValue(this.plugin.settings.anthropicModel)
						.onChange(async (value) => {
							this.plugin.settings.anthropicModel = value;
							await this.plugin.saveSettings();
						})
				);

			containerEl.createEl('h4', { text: 'Voyage AI Embeddings' });
			containerEl.createEl('p', {
				text: 'Note: Anthropic does not provide embedding models. We use Voyage AI for embeddings.',
				cls: 'setting-item-description',
			});

			new Setting(containerEl)
				.setName('Voyage API Key')
				.setDesc('Your Voyage AI API key for embeddings')
				.addText((text) =>
					text
						.setPlaceholder('pa-...')
						.setValue(this.plugin.settings.voyageApiKey)
						.onChange(async (value) => {
							this.plugin.settings.voyageApiKey = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName('Embedding Model')
				.setDesc('Voyage AI embedding model')
				.addDropdown((dropdown) =>
					dropdown
						.addOption('voyage-2', 'voyage-2 (Recommended)')
						.addOption('voyage-large-2', 'voyage-large-2')
						.addOption('voyage-code-2', 'voyage-code-2')
						.setValue(this.plugin.settings.voyageEmbeddingModel)
						.onChange(async (value) => {
							this.plugin.settings.voyageEmbeddingModel = value;
							await this.plugin.saveSettings();
						})
				);
		}

		// ====================================================================
		// RAG Parameters
		// ====================================================================

		containerEl.createEl('h3', { text: 'RAG Parameters' });

		// Search Mode
		new Setting(containerEl)
			.setName('Search Mode')
			.setDesc('How to find relevant notes: Full-text (BM25), Vector (semantic), or Hybrid (both)')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('fulltext', 'Full-text (BM25) - Keyword matching')
					.addOption('vector', 'Vector - Semantic similarity')
					.addOption('hybrid', 'Hybrid - Best of both (Recommended)')
					.setValue(this.plugin.settings.searchMode)
					.onChange(async (value) => {
						this.plugin.settings.searchMode = value as 'fulltext' | 'vector' | 'hybrid';
						await this.plugin.saveSettings();
						this.display(); // Refresh to show/hide relevant settings
					})
			);

		// Show similarity threshold for vector/hybrid modes
		if (this.plugin.settings.searchMode === 'vector' || this.plugin.settings.searchMode === 'hybrid') {
			new Setting(containerEl)
				.setName('Similarity Threshold')
				.setDesc('Minimum similarity score for vector search (0-1, default 0.8)')
				.addSlider((slider) =>
					slider
						.setLimits(0, 1, 0.05)
						.setValue(this.plugin.settings.similarityThreshold)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.similarityThreshold = value;
							await this.plugin.saveSettings();
						})
				);
		}

		// Show fulltext threshold for fulltext/hybrid modes
		if (this.plugin.settings.searchMode === 'fulltext' || this.plugin.settings.searchMode === 'hybrid') {
			new Setting(containerEl)
				.setName('Full-text Match Threshold')
				.setDesc('Percentage of search terms that must match (0 = any term, 1 = all terms)')
				.addSlider((slider) =>
					slider
						.setLimits(0, 1, 0.1)
						.setValue(this.plugin.settings.fulltextThreshold)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.fulltextThreshold = value;
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl)
			.setName('Number of Results (k)')
			.setDesc('How many notes to retrieve (1-20)')
			.addSlider((slider) =>
				slider
					.setLimits(1, 20, 1)
					.setValue(this.plugin.settings.topK)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.topK = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('LLM creativity (0 = focused, 1 = creative, 2 = very creative)')
			.addSlider((slider) =>
				slider
					.setLimits(0, 2, 0.1)
					.setValue(this.plugin.settings.temperature)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.temperature = value;
						await this.plugin.saveSettings();
					})
			);

		// Hybrid Search Weights (only shown in hybrid mode)
		if (this.plugin.settings.searchMode === 'hybrid') {
			containerEl.createEl('h4', { text: 'Hybrid Search Weights' });

			new Setting(containerEl)
				.setName('Keyword Weight')
				.setDesc('Weight for keyword/BM25 search (0-1). Higher = prioritize exact matches.')
				.addSlider((slider) =>
					slider
						.setLimits(0, 1, 0.05)
						.setValue(this.plugin.settings.hybridTextWeight)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.hybridTextWeight = value;
							// Auto-adjust vector weight to sum to 1.0
							this.plugin.settings.hybridVectorWeight = Math.round((1 - value) * 100) / 100;
							await this.plugin.saveSettings();
							// Refresh display to show updated vector weight
							this.display();
						})
				);

			new Setting(containerEl)
				.setName('Vector Weight')
				.setDesc('Weight for semantic/vector search (0-1). Higher = prioritize meaning over exact words.')
				.addSlider((slider) =>
					slider
						.setLimits(0, 1, 0.05)
						.setValue(this.plugin.settings.hybridVectorWeight)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.hybridVectorWeight = value;
							// Auto-adjust text weight to sum to 1.0
							this.plugin.settings.hybridTextWeight = Math.round((1 - value) * 100) / 100;
							await this.plugin.saveSettings();
							// Refresh display to show updated text weight
							this.display();
						})
				);
		}

		// ====================================================================
		// Vector Store Management
		// ====================================================================

		containerEl.createEl('h3', { text: 'Vector Store Management' });

		// Show current index status with auto-update
		if (this.plugin.ragEngine) {
			const statusSetting = new Setting(containerEl)
				.setName('Index Status')
				.setClass('smart-brain-status');

			// Function to update status
			const updateStatus = () => {
				const status = this.plugin.ragEngine?.getStatus();
				if (!status) return;
				const statusDesc = status.isIndexing
					? `Currently indexing... (${status.documentCount} documents)`
					: status.isReady
						? `✅ Ready - ${status.documentCount} documents indexed`
						: 'Not ready';
				statusSetting.setDesc(statusDesc);
			};

			// Initial update
			updateStatus();

			// Update every 2 seconds while settings are open
			// Clear any existing interval first
			if (this.statusInterval) {
				window.clearInterval(this.statusInterval);
			}
			this.statusInterval = window.setInterval(updateStatus, 2000);
		}

		// Clear and rebuild index button
		new Setting(containerEl)
			.setName('Clear & Rebuild Index')
			.setDesc('Create a fresh vector store and rebuild from scratch')
			.addButton((button) =>
				button
					.setButtonText('Clear & Rebuild')
					.setWarning()
					.onClick(async () => {
						if (!this.plugin.ragEngine) {
							new Notice('❌ RAG Engine not available', 3000);
							return;
						}

						button.setButtonText('Rebuilding...');
						button.setDisabled(true);

						try {
							new Notice('🔄 Rebuilding vector store from scratch...', 3000);
							await this.plugin.ragEngine.rebuild();
							console.log('✅ Rebuild complete');
							new Notice('✅ Vector store rebuilt successfully!', 5000);
						} catch (error) {
							console.error('❌ Rebuild failed:', error);
							new Notice('❌ Error: ' + (error as Error).message, 5000);
						} finally {
							// Always restore button state
							button.setButtonText('Clear & Rebuild');
							button.setDisabled(false);
						}
					})
			);

		// Rebuild index button (quick rebuild without clearing)
		new Setting(containerEl)
			.setName('Rebuild Index')
			.setDesc('Rebuild the vector store (keeps existing file)')
			.addButton((button) =>
				button
					.setButtonText('Rebuild Now')
					.setCta()
					.onClick(async () => {
						if (!this.plugin.ragEngine) {
							new Notice('❌ RAG Engine not available', 3000);
							return;
						}

						button.setButtonText('Rebuilding...');
						button.setDisabled(true);

						try {
							await this.plugin.ragEngine.rebuild();
							new Notice('✅ Vector store rebuilt successfully!', 5000);
						} catch (error) {
							console.error('❌ Rebuild failed:', error);
							new Notice('❌ Error: ' + (error as Error).message, 5000);
						} finally {
							// Always restore button state
							button.setButtonText('Rebuild Now');
							button.setDisabled(false);
						}
					})
			);

		// Show vector store info button
		new Setting(containerEl)
			.setName('Vector Store Info')
			.setDesc('View detailed information about the vector store')
			.addButton((button) =>
				button.setButtonText('Show Info').onClick(async () => {
					if (!this.plugin.ragEngine) {
						new Notice('❌ RAG Engine not available', 3000);
						return;
					}
					const info = await this.plugin.ragEngine.vectorStore.exportInfo();
					new Notice(info || 'Vector store not ready', 10000);
					console.log(info);
				})
			);

		// ====================================================================
		// File Exclusions
		// ====================================================================

		containerEl.createEl('h3', { text: 'File Exclusions' });

		new Setting(containerEl)
			.setName('Exclude Patterns')
			.setDesc('Glob patterns for files to exclude (one per line). Note: .obsidian/** and Prompts/** are excluded by default.')
			.addTextArea((text) => {
				text.setPlaceholder('.obsidian/**\nArchive/**\nTemplates/**\nPrompts/**')
					.setValue(this.plugin.settings.excludePatterns.join('\n'))
					.onChange(async (value) => {
						this.plugin.settings.excludePatterns = value
							.split('\n')
							.map((p) => p.trim())
							.filter((p) => p.length > 0);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 4;
				text.inputEl.cols = 50;
			});

		// ====================================================================
		// UI Preferences
		// ====================================================================

		containerEl.createEl('h3', { text: 'UI Preferences' });

		new Setting(containerEl)
			.setName('View Mode')
			.setDesc('Chat interface display style')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('comfy', 'Comfy (Larger text, more spacing)')
					.addOption('compact', 'Compact (Dense, efficient)')
					.setValue(this.plugin.settings.viewMode)
					.onChange(async (value) => {
						this.plugin.settings.viewMode = value as 'comfy' | 'compact';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Chat Folder')
			.setDesc('Where to save chat histories')
			.addText((text) =>
				text
					.setPlaceholder('Chats')
					.setValue(this.plugin.settings.chatFolder)
					.onChange(async (value) => {
						this.plugin.settings.chatFolder = value;
						await this.plugin.saveSettings();
					})
			);

		// ====================================================================
		// Advanced
		// ====================================================================

		containerEl.createEl('h3', { text: 'Advanced' });

		new Setting(containerEl)
			.setName('Incognito Mode')
			.setDesc('Force local-only processing (even with cloud providers selected)')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.incognitoMode).onChange(async (value) => {
					this.plugin.settings.incognitoMode = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Verbose Logging')
			.setDesc('Enable detailed console logging for debugging')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.verboseLogging).onChange(async (value) => {
					this.plugin.settings.verboseLogging = value;
					await this.plugin.saveSettings();
				})
			);

		// ========================================================================
		// System Prompts
		// ========================================================================

		containerEl.createEl('h2', { text: 'System Prompts' });

		containerEl.createEl('p', {
			text: 'Customize how the AI assistant responds. Prompts are stored as markdown files in the prompts/ folder.',
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('Active Prompt Template')
			.setDesc('Select which prompt template to use for RAG queries')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('rag-default', 'Default (Helpful assistant)')
					.addOption('rag-technical', 'Technical (Code-focused)')
					.addOption('rag-creative', 'Creative (Storytelling)')
					.setValue(this.plugin.settings.activePromptTemplate)
					.onChange(async (value) => {
						this.plugin.settings.activePromptTemplate = value;
						await this.plugin.saveSettings();
						new Notice(`Switched to ${value} prompt template`);
					});
			});

		// Prompt preview
		const previewContainer = containerEl.createDiv({ cls: 'prompt-preview-container' });
		previewContainer.createEl('strong', { text: 'Preview:' });
		const previewEl = previewContainer.createEl('pre', {
			cls: 'prompt-preview',
			text: 'Loading preview...',
		});

		// Load preview asynchronously
		(async () => {
			try {
				const promptManager = this.plugin.ragEngine?.promptManager;
				if (promptManager) {
					const preview = await promptManager.getPromptPreview(
						this.plugin.settings.activePromptTemplate
					);
					previewEl.setText(preview);
				}
			} catch (error) {
				previewEl.setText('Error loading preview');
			}
		})();

		// Available variables
		const variablesContainer = containerEl.createDiv({ cls: 'prompt-variables' });
		variablesContainer.createEl('strong', { text: 'Available Variables:' });
		const variablesList = variablesContainer.createEl('ul');
		const variables = [
			'{context} - Retrieved documents from your notes',
			'{question} - User\'s question',
			'{history} - Conversation history',
			'{date} - Current date',
			'{vault} - Vault name',
		];
		variables.forEach(v => variablesList.createEl('li', { text: v }));

		// Edit prompt button - Opens file in Obsidian
		new Setting(containerEl)
			.setName('Edit Prompt File')
			.setDesc('Open the active prompt template in Obsidian to customize it')
			.addButton((button) =>
				button.setButtonText('Edit in Obsidian').onClick(async () => {
					const promptPath = `Prompts/${this.plugin.settings.activePromptTemplate}.md`;
					const file = this.plugin.app.vault.getAbstractFileByPath(promptPath);
					if (file) {
						const leaf = this.plugin.app.workspace.getLeaf(false);
						await leaf.openFile(file as any);
					} else {
						new Notice(`❌ Prompt file not found: ${promptPath}`);
					}
				})
			);

		// ========================================================================
		// Opik (LLM Observability)
		// ========================================================================

		containerEl.createEl('h2', { text: 'Opik (LLM Observability)' });

		containerEl.createEl('p', {
			text: 'Track and analyze your RAG queries, embeddings, and LLM calls. Supports local Opik installations or cloud at comet.com/opik',
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('Enable Opik Tracing')
			.setDesc('OFF by default. Turn on to send telemetry to Opik for debugging and monitoring.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.opikEnabled).onChange(async (value) => {
					this.plugin.settings.opikEnabled = value;
					await this.plugin.saveSettings();
					new Notice(`Opik tracing ${value ? 'enabled' : 'disabled'}`);
				})
			);

		new Setting(containerEl)
			.setName('Opik URL')
			.setDesc('URL for your Opik instance (local: http://localhost:5173/api, cloud: https://www.comet.com/opik/api)')
			.addText((text) =>
				text
					.setPlaceholder('http://localhost:5173/api')
					.setValue(this.plugin.settings.opikUrl)
					.onChange(async (value) => {
						this.plugin.settings.opikUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Opik API Key')
			.setDesc('Your Opik API key (may not be required for local installations)')
			.addText((text) =>
				text
					.setPlaceholder('Enter API key')
					.setValue(this.plugin.settings.opikApiKey)
					.onChange(async (value) => {
						this.plugin.settings.opikApiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Opik Project Name')
			.setDesc('Project name to organize your traces')
			.addText((text) =>
				text
					.setPlaceholder('smart-second-brain')
					.setValue(this.plugin.settings.opikProjectName)
					.onChange(async (value) => {
						this.plugin.settings.opikProjectName = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Opik Workspace Name')
			.setDesc('Optional: Workspace name (leave empty for default)')
			.addText((text) =>
				text
					.setPlaceholder('my-workspace')
					.setValue(this.plugin.settings.opikWorkspaceName)
					.onChange(async (value) => {
						this.plugin.settings.opikWorkspaceName = value;
						await this.plugin.saveSettings();
					})
			);
	}

	/**
	 * Load available models from Ollama
	 */
	private async loadOllamaModels(): Promise<void> {
		try {
			const response = await fetch(`${this.plugin.settings.ollamaUrl}/api/tags`);

			if (!response.ok) {
				new Notice(`Cannot reach Ollama at ${this.plugin.settings.ollamaUrl} — check the URL in settings.`, 6000);
				return;
			}

			const data = await response.json();
			const models = data.models || [];

			// Separate models into generation and embedding
			this.ollamaModels = [];
			this.ollamaEmbeddingModels = [];

			// Check each model using /api/show to get detailed info
			for (const model of models) {
				const modelName = model.name;

				try {
					const showResponse = await fetch(`${this.plugin.settings.ollamaUrl}/api/show`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							model: modelName,
						}),
					});

					if (!showResponse.ok) {
						// Fallback: use name-based detection
						const embeddingModelKeywords = ['embed', 'embedding'];
						const isEmbeddingModel = embeddingModelKeywords.some((keyword) =>
							modelName.toLowerCase().includes(keyword)
						);

						if (isEmbeddingModel) {
							this.ollamaEmbeddingModels.push(modelName);
						} else {
							this.ollamaModels.push(modelName);
						}
						continue;
					}

					const modelInfo = await showResponse.json();

					// Check model details to determine if it's an embedding model
					// Embedding models typically have "bert" family or "embed" in name
					const family = modelInfo.details?.family || '';
					const families = modelInfo.details?.families || [];
					const isEmbeddingModel =
						family === 'bert' ||
						families.includes('bert') ||
						modelName.toLowerCase().includes('embed');

					if (isEmbeddingModel) {
						this.ollamaEmbeddingModels.push(modelName);
					} else {
						this.ollamaModels.push(modelName);
					}
				} catch (error) {
					console.error(`Error getting info for model ${modelName}:`, error);
					// Fallback: add to generation models
					this.ollamaModels.push(modelName);
				}
			}

			// If saved model isn't on the server, auto-correct to first available
			if (!this.ollamaModels.includes(this.plugin.settings.ollamaModel)) {
				const first = this.ollamaModels[0];
				if (first) {
					new Notice(`Model '${this.plugin.settings.ollamaModel}' not found. Switching to '${first}'.`, 5000);
					this.plugin.settings.ollamaModel = first;
					await this.plugin.saveSettings();
				} else {
					this.ollamaModels.unshift(this.plugin.settings.ollamaModel);
				}
			}

			if (!this.ollamaEmbeddingModels.includes(this.plugin.settings.ollamaEmbeddingModel)) {
				const first = this.ollamaEmbeddingModels[0];
				if (first) {
					new Notice(`Embedding model '${this.plugin.settings.ollamaEmbeddingModel}' not found. Switching to '${first}'.`, 5000);
					this.plugin.settings.ollamaEmbeddingModel = first;
					await this.plugin.saveSettings();
				} else {
					this.ollamaEmbeddingModels.unshift(this.plugin.settings.ollamaEmbeddingModel);
				}
			}

			if (this.plugin.settings.verboseLogging) {
				console.log('Generation models:', this.ollamaModels);
				console.log('Embedding models:', this.ollamaEmbeddingModels);
			}
		} catch (error) {
			new Notice(`Cannot reach Ollama at ${this.plugin.settings.ollamaUrl} — check the URL in settings.`, 6000);
			console.error('Error loading Ollama models:', error);
		}
	}
}
