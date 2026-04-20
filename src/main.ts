import { MarkdownRenderer, Modal, Notice, Plugin, Setting, TFile, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, SmartSecondBrainSettingTab } from './settings';
import { createProvider } from './providers';
import { RAGEngine } from './core/RAGEngine';
import { SearchModal } from './ui/SearchModal';
import { ChatView, CHAT_VIEW_TYPE } from './ui/ChatView';
import type { Settings } from './types';

/**
 * Smart Second Brain Plugin
 * Phase 1: Testing basic setup
 */
export default class SmartSecondBrainPlugin extends Plugin {
	settings: Settings;
	private statusBarItem: HTMLElement;
	ragEngine: RAGEngine; // Public so ChatView can access it
	private saveTimer: NodeJS.Timeout | null = null;
	private excludePatternsUpdated: boolean = false; // Track if we updated exclusions during load

	async onload() {
		console.log('Loading Smart Second Brain plugin...');

		// Load settings
		await this.loadSettings();

		// Register chat view
		this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this));

		// Add status bar item
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText('🧠 Initializing...');

		// Ensure prompts folder exists with default templates (in vault root)
		await this.ensurePromptsExist();

		// Check if we need to suggest index rebuild (after settings migration)
		const needsRebuild = await this.checkIfIndexNeedsRebuild();

		// Initialize RAG Engine (configDir is already .obsidian, just need /plugins/pluginId)
		// Get the actual plugin folder name from the manifest
		const pluginFolderName = this.manifest.dir || this.manifest.id;
		const pluginDir = `${this.app.vault.configDir}/plugins/${pluginFolderName}`;
		this.ragEngine = new RAGEngine(this.app, this.settings, pluginDir);
		try {
			await this.ragEngine.initialize();
		} catch (error) {
			console.error('Smart Second Brain: Failed to initialize RAG engine:', error);
			new Notice(
				'Smart Second Brain: Could not connect to AI provider. Check Settings to configure your provider.',
				10000
			);
		}

		// Show rebuild notice if needed
		if (needsRebuild) {
			new Notice('📝 Updated exclude patterns. Run "Rebuild Vector Store" command to remove system files from index.', 10000);
		}

		// Add ribbon icons
		// Brain icon - opens quick Q&A modal
		this.addRibbonIcon('brain', 'Ask a Question', async () => {
			const question = await this.promptForQuestion();
			if (question) {
				await this.showAnswerModal(question);
			}
		});

		// Chat icon - opens chat sidebar
		this.addRibbonIcon('message-circle', 'Open Chat', () => {
			this.activateChatView();
		});

		// Search icon - opens search modal (debugging)
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
				new Notice('Rebuilding vector store... This may take a while.', 5000);
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
				try {
					await this.ragEngine.save();
				} catch (error) {
					console.error('[AutoSave] Failed to save vector store:', error);
				}
			}, 5 * 60 * 1000) // 5 minutes
		);

		// Initial status update
		this.updateStatusBar();

		console.log('Smart Second Brain plugin loaded!');
	}

	async onunload() {
		console.log('Unloading Smart Second Brain plugin...');

		// Clear save timer
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}

		// Save vector store before unloading to prevent data loss
		if (this.ragEngine) {
			console.log('Saving vector store before plugin unload...');
			await this.ragEngine.save();
		}
	}

	/**
	 * Open or focus the chat view in right sidebar
	 */
	async activateChatView(): Promise<ChatView | null> {
		const { workspace } = this.app;

		// Check if view is already open
		const leaves = workspace.getLeavesOfType(CHAT_VIEW_TYPE);

		if (leaves.length > 0) {
			// View already exists, focus it
			const leaf = leaves[0];
			if (leaf) {
				workspace.revealLeaf(leaf);

				if (leaf.view instanceof ChatView) {
					return leaf.view;
				}
			}
		} else {
			// Create new view in right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: CHAT_VIEW_TYPE,
					active: true,
				});

				if (rightLeaf.view instanceof ChatView) {
					return rightLeaf.view;
				}
			}
		}

		return null;
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
					// Only process if RAG engine is ready
					const status = this.ragEngine.getStatus();
					if (status.isReady && !status.isIndexing) {
						this.ragEngine.updateDocument(file);
						this.debouncedSave();
					}
				}
			})
		);

		// Watch for file modification
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					// Only process if RAG engine is ready
					const status = this.ragEngine.getStatus();
					if (status.isReady && !status.isIndexing) {
						this.ragEngine.updateDocument(file);
						this.debouncedSave();
					}
				}
			})
		);

		// Watch for file deletion
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					// Only process if RAG engine is ready
					const status = this.ragEngine.getStatus();
					if (status.isReady && !status.isIndexing) {
						this.ragEngine.removeDocument(file);
						this.debouncedSave();
					}
				}
			})
		);

		// Watch for file rename (appears as delete + create)
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				if (file instanceof TFile && file.extension === 'md') {
					// Only process if RAG engine is ready
					const status = this.ragEngine.getStatus();
					if (status.isReady && !status.isIndexing) {
						// Remove old document
						this.ragEngine.removeDocument({ path: oldPath } as TFile);
						// Add new document
						this.ragEngine.updateDocument(file);
						this.debouncedSave();
					}
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

		const chatButton = leftButtons.createEl('button', { text: '💬 Continue in Chat' });
		chatButton.disabled = true; // Disable until answer is ready

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
			chatButton.disabled = false;

			// Add button click handlers
			saveButton.addEventListener('click', async () => {
				await this.saveAnswerAsNote(question, answer, sources);
				modal.close();
			});

			copyButton.addEventListener('click', () => {
				if (navigator.clipboard?.writeText) {
					navigator.clipboard.writeText(answer).catch(err => console.error('Copy failed:', err));
				} else {
					// Fallback: show a notice with the text to copy manually
					new Notice('Copy not supported on this platform', 3000);
				}
				new Notice('Answer copied to clipboard!');
			});

			chatButton.addEventListener('click', async () => {
				const chatView = await this.activateChatView();
				if (chatView) {
					await chatView.addModalQA(question, answer, sources);
					modal.close();
					new Notice('✅ Conversation started in chat!');
				} else {
					new Notice('❌ Failed to open chat view');
				}
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

		// Migration: Add Prompts/** to exclude patterns if missing
		const requiredExclusions = ['.obsidian/**', 'Prompts/**'];

		for (const pattern of requiredExclusions) {
			if (!this.settings.excludePatterns.includes(pattern)) {
				console.log(`Adding ${pattern} to exclude patterns`);
				this.settings.excludePatterns.push(pattern);
				this.excludePatternsUpdated = true;
			}
		}

		if (this.excludePatternsUpdated) {
			await this.saveData(this.settings);
			console.log('✅ Updated exclude patterns to include system folders');
		}
	}

	/**
	 * Check if index needs rebuild due to updated exclusions
	 */
	async checkIfIndexNeedsRebuild(): Promise<boolean> {
		return this.excludePatternsUpdated;
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
	 * Ensure prompts folder exists and contains default templates
	 * Creates prompts in vault root (Prompts/) for easy editing
	 */
	async ensurePromptsExist(): Promise<void> {
		const promptsFolder = 'Prompts';

		try {
			// Check if prompts folder exists
			const folder = this.app.vault.getAbstractFileByPath(promptsFolder);

			if (!folder) {
				console.log('📝 Prompts folder not found, creating with default templates...');

				// Create prompts folder in vault root
				await this.app.vault.createFolder(promptsFolder);

				// Create default prompt templates
				await this.createDefaultPromptsInVault(promptsFolder);

				console.log('✅ Default prompts created successfully in vault');
				new Notice('📝 Created Prompts folder with 3 templates - edit them to customize!', 5000);
			} else {
				// Folder exists, check if templates exist
				const requiredPrompts = ['rag-default.md', 'rag-technical.md', 'rag-creative.md'];
				let missingCount = 0;

				for (const promptFile of requiredPrompts) {
					const promptPath = `${promptsFolder}/${promptFile}`;
					const file = this.app.vault.getAbstractFileByPath(promptPath);

					if (!file) {
						console.log(`📝 Missing prompt template: ${promptFile}, creating...`);
						const content = this.getDefaultPromptContent(promptFile);
						await this.app.vault.create(promptPath, content);
						missingCount++;
					}
				}

				if (missingCount > 0) {
					console.log(`✅ Created ${missingCount} missing prompt template(s)`);
					new Notice(`📝 Created ${missingCount} missing prompt template(s)`, 3000);
				} else if (this.settings.verboseLogging) {
					console.log('✅ All prompt templates present');
				}
			}
		} catch (error) {
			console.error('Failed to ensure prompts exist:', error);
			new Notice('⚠️ Failed to create default prompts. Check console.', 5000);
		}
	}

	/**
	 * Create all default prompt templates in vault
	 */
	private async createDefaultPromptsInVault(promptsFolder: string): Promise<void> {
		const prompts = [
			{ file: 'rag-default.md', content: this.getDefaultPromptContent('rag-default.md') },
			{ file: 'rag-technical.md', content: this.getDefaultPromptContent('rag-technical.md') },
			{ file: 'rag-creative.md', content: this.getDefaultPromptContent('rag-creative.md') },
		];

		for (const prompt of prompts) {
			const path = `${promptsFolder}/${prompt.file}`;
			await this.app.vault.create(path, prompt.content);
			console.log(`Created: ${path}`);
		}
	}

	/**
	 * Get default content for a prompt template
	 */
	private getDefaultPromptContent(filename: string): string {
		if (filename === 'rag-default.md') {
			return `---
name: Default RAG Assistant
type: rag
description: Helpful assistant that answers questions using your personal notes
variables: [context, question, history, date, vault]
---

<!--
PROMPT TEMPLATE - Default RAG Assistant

Available variables:
- {context}  = Retrieved documents from vector search
- {question} = User's current question
- {history}  = Previous conversation messages (formatted as User:/Assistant:)
- {date}     = Current date (e.g., "1/11/2026")
- {vault}    = Name of the Obsidian vault

Edit this file to customize how the AI responds to your queries.
-->

You are a helpful assistant that answers questions based on the user's personal notes.

Current date: {date}
Vault: {vault}

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

Now answer the user's question following this format.

Context from your notes:
{context}

{history}

Question: {question}

Answer:
`;
		} else if (filename === 'rag-technical.md') {
			return `---
name: Technical Assistant
type: rag
description: Code-focused assistant for developers
variables: [context, question, history, date, vault]
---

<!--
PROMPT TEMPLATE - Technical Assistant

Available variables:
- {context}  = Retrieved documents from vector search
- {question} = User's current question
- {history}  = Previous conversation messages (formatted as User:/Assistant:)
- {date}     = Current date (e.g., "1/11/2026")
- {vault}    = Name of the Obsidian vault

This template is optimized for technical questions, code documentation, and developer workflows.
-->

You are a technical documentation expert who helps developers understand code and technical concepts.

Current date: {date}
Vault: {vault}

When answering technical questions:
- Be precise and concise
- Use code examples when relevant
- Reference specific files and line numbers if available
- Explain complex concepts clearly
- Provide actionable next steps

Citation format:
- Always cite source files: \`src/file.ts:42\`
- Include a "## Sources" section
- Link to relevant documentation

Context from codebase:
{context}

{history}

Question: {question}

Answer:
`;
		} else if (filename === 'rag-creative.md') {
			return `---
name: Creative Writing Assistant
type: rag
description: Expansive, creative assistant for storytelling and ideation
variables: [context, question, history, date, vault]
---

<!--
PROMPT TEMPLATE - Creative Writing Assistant

Available variables:
- {context}  = Retrieved documents from vector search
- {question} = User's current question
- {history}  = Previous conversation messages (formatted as User:/Assistant:)
- {date}     = Current date (e.g., "1/11/2026")
- {vault}    = Name of the Obsidian vault

This template is optimized for creative writing, storytelling, and imaginative exploration.
-->

You are a creative writing assistant who helps users explore ideas, tell stories, and think expansively.

Current date: {date}
Vault: {vault}

When responding:
- Be imaginative and expansive
- Draw connections between different ideas
- Suggest creative possibilities
- Use vivid language and metaphors
- Encourage exploration and experimentation

Citation format:
- Reference source material naturally within your narrative
- Include a "## Inspirations" section at the end
- Link to notes that sparked ideas

Context from your notes:
{context}

{history}

Question: {question}

Answer:
`;
		}

		// Fallback (should never reach here)
		return `---
name: Unknown Template
type: rag
description: Default template
variables: [context, question, history, date, vault]
---

{context}

{history}

Question: {question}

Answer:
`;
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
