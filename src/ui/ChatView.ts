/**
 * Chat View - Right sidebar panel for multi-turn conversations
 * Shows conversation history and allows follow-up questions
 */

import { ItemView, WorkspaceLeaf, MarkdownRenderer, Notice, Modal, TFile } from 'obsidian';
import type SmartSecondBrainPlugin from '../main';
import type { Message } from '../types';

export const CHAT_VIEW_TYPE = 'smart-brain-chat-view';

export class ChatView extends ItemView {
	private plugin: SmartSecondBrainPlugin;
	private messages: Message[] = [];
	private messagesContainer: HTMLElement;
	private inputContainer: HTMLElement;
	private inputEl: HTMLTextAreaElement;
	private sendButton: HTMLButtonElement;
	private isStreaming: boolean = false;
	private currentChatFile: string | null = null; // Path to current chat file for auto-saving
	private menuOpen: boolean = false;
	private statsEl: HTMLElement | null = null;
	private statsUpdateInterval: number | null = null;
	private useRAG: boolean = true; // Toggle for searching notes vs just using LLM
	private ragToggleButton: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: SmartSecondBrainPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return CHAT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return '🧠 Smart Brain Chat';
	}

	getIcon(): string {
		return 'message-circle';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		if (!container) return;

		container.empty();
		container.addClass('smart-brain-chat-container');

		// Header
		const header = container.createDiv('chat-header');

		const headerTop = header.createDiv('chat-header-top');

		const headerTitle = headerTop.createEl('h4', { text: '🧠 Smart Second Brain' });

		// Hamburger menu button (shows on small screens)
		const hamburgerButton = headerTop.createEl('button', {
			cls: 'chat-hamburger-button',
			attr: { 'aria-label': 'Menu' },
		});
		hamburgerButton.innerHTML = '☰';
		hamburgerButton.addEventListener('click', () => this.toggleMenu());

		// Header buttons container (regular buttons + dropdown menu)
		const headerButtons = headerTop.createDiv('chat-header-buttons');

		// Regular buttons (visible on larger screens)
		const regularButtons = headerButtons.createDiv('chat-regular-buttons');

		const newChatButton = regularButtons.createEl('button', {
			text: '🆕 New',
			cls: 'chat-header-button',
		});
		newChatButton.addEventListener('click', () => this.startNewChat());

		const saveChatButton = regularButtons.createEl('button', {
			text: '💾 Save',
			cls: 'chat-header-button',
		});
		saveChatButton.addEventListener('click', () => this.saveChat());

		// Dropdown menu (visible when hamburger is clicked)
		const dropdownMenu = headerButtons.createDiv('chat-dropdown-menu');
		dropdownMenu.style.display = 'none';

		const newChatMenuItem = dropdownMenu.createEl('button', {
			text: '🆕 New Chat',
			cls: 'chat-menu-item',
		});
		newChatMenuItem.addEventListener('click', () => {
			this.startNewChat();
			this.toggleMenu();
		});

		const saveChatMenuItem = dropdownMenu.createEl('button', {
			text: '💾 Save Chat',
			cls: 'chat-menu-item',
		});
		saveChatMenuItem.addEventListener('click', () => {
			this.saveChat();
			this.toggleMenu();
		});

		const clearChatMenuItem = dropdownMenu.createEl('button', {
			text: '🗑️ Clear Chat',
			cls: 'chat-menu-item',
		});
		clearChatMenuItem.addEventListener('click', () => {
			this.clearChat();
			this.toggleMenu();
		});

		const loadChatMenuItem = dropdownMenu.createEl('button', {
			text: '📂 Load Chat',
			cls: 'chat-menu-item',
		});
		loadChatMenuItem.addEventListener('click', () => {
			this.loadChat();
			this.toggleMenu();
		});

		// Store reference for toggling
		(header as any).dropdownMenu = dropdownMenu;

		const subtitle = header.createDiv('chat-subtitle');
		subtitle.setText('Ask questions about your notes');

		// Stats display
		this.statsEl = header.createDiv('chat-stats');
		this.updateStats();

		// Update stats every 5 seconds
		this.statsUpdateInterval = window.setInterval(() => {
			this.updateStats();
		}, 5000);

		// Messages container (scrollable)
		this.messagesContainer = container.createDiv('chat-messages');

		// Show welcome message if no messages
		if (this.messages.length === 0) {
			this.showWelcomeMessage();
		} else {
			this.renderMessages();
		}

		// Input container (fixed at bottom)
		this.inputContainer = container.createDiv('chat-input-container');

		// Control buttons row (save, RAG toggle, delete)
		const controlsRow = this.inputContainer.createDiv('chat-controls-row');

		const saveButton = controlsRow.createEl('button', {
			cls: 'chat-control-button',
			attr: { 'aria-label': 'Save chat' },
		});
		saveButton.innerHTML = '💾';
		saveButton.addEventListener('click', () => this.saveChat());

		this.ragToggleButton = controlsRow.createEl('button', {
			cls: 'chat-rag-toggle active',
			attr: { 'aria-label': 'Toggle search notes' },
		});
		this.ragToggleButton.innerHTML = '🐙';
		this.ragToggleButton.addEventListener('click', () => this.toggleRAG());

		const deleteButton = controlsRow.createEl('button', {
			cls: 'chat-control-button',
			attr: { 'aria-label': 'Clear chat' },
		});
		deleteButton.innerHTML = '🗑️';
		deleteButton.addEventListener('click', () => this.clearChat());

		// Input row (textarea + send button)
		const inputRow = this.inputContainer.createDiv('chat-input-row');

		// Textarea for input
		this.inputEl = inputRow.createEl('textarea', {
			cls: 'chat-input',
			attr: {
				placeholder: 'Ask a question about your notes...',
				rows: '3',
			},
		});

		// Send button
		this.sendButton = inputRow.createEl('button', {
			text: 'Send',
			cls: 'chat-send-button',
		});

		// Event listeners
		this.inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.handleSend();
			}
		});

		this.sendButton.addEventListener('click', () => {
			this.handleSend();
		});
	}

	async onClose(): Promise<void> {
		// Clear stats update interval
		if (this.statsUpdateInterval) {
			window.clearInterval(this.statsUpdateInterval);
			this.statsUpdateInterval = null;
		}
	}

	/**
	 * Update index statistics display
	 */
	private updateStats(): void {
		if (!this.statsEl) return;

		const status = this.plugin.ragEngine.getStatus();
		const providerName =
			this.plugin.settings.activeProvider === 'ollama'
				? 'Ollama'
				: this.plugin.settings.activeProvider === 'openai'
					? 'OpenAI'
					: 'Claude';

		const searchMode = this.plugin.settings.searchMode;
		const searchModeLabel =
			searchMode === 'hybrid' ? 'Hybrid' :
			searchMode === 'vector' ? 'Vector' :
			'Full-text';

		if (status.isIndexing) {
			this.statsEl.setText(`📊 Indexing... | ${providerName} | ${searchModeLabel}`);
			this.statsEl.addClass('chat-stats-indexing');
		} else if (status.isReady) {
			this.statsEl.setText(`📊 ${status.documentCount} docs | ${providerName} | ${searchModeLabel}`);
			this.statsEl.removeClass('chat-stats-indexing');
		} else {
			this.statsEl.setText(`📊 Not ready | ${providerName} | ${searchModeLabel}`);
			this.statsEl.removeClass('chat-stats-indexing');
		}
	}

	/**
	 * Show welcome message for new chats
	 */
	private showWelcomeMessage(): void {
		const welcome = this.messagesContainer.createDiv('chat-welcome');
		welcome.createEl('p', { text: '👋 Welcome!' });
		welcome.createEl('p', {
			text: 'Ask me anything about your notes. I can help you find information, connect ideas, and explore your knowledge base.',
		});

		const examples = welcome.createDiv('chat-examples');
		examples.createEl('h5', { text: 'Try asking:' });
		const examplesList = examples.createEl('ul');
		examplesList.createEl('li', { text: '"What are my project goals?"' });
		examplesList.createEl('li', { text: '"Summarize my meeting notes from this week"' });
		examplesList.createEl('li', { text: '"What did I learn about React?"' });
	}

	/**
	 * Render all messages in the conversation
	 */
	private async renderMessages(): Promise<void> {
		this.messagesContainer.empty();

		for (const message of this.messages) {
			await this.renderMessage(message);
		}

		// Scroll to bottom
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	/**
	 * Render a single message
	 */
	private async renderMessage(message: Message): Promise<void> {
		const messageEl = this.messagesContainer.createDiv(`chat-message chat-message-${message.role}`);

		// Message header (avatar + timestamp)
		const header = messageEl.createDiv('chat-message-header');
		const avatar = header.createSpan('chat-message-avatar');
		avatar.setText(message.role === 'user' ? '👤' : '🤖');

		const timestamp = header.createSpan('chat-message-timestamp');
		timestamp.setText(new Date(message.timestamp).toLocaleTimeString());

		// Message content
		const content = messageEl.createDiv('chat-message-content');

		if (message.role === 'user') {
			// User message - plain text
			content.setText(message.content);
		} else {
			// Assistant message - render markdown
			await MarkdownRenderer.render(this.app, message.content, content, '', this.plugin);

			// Add sources if present
			if (message.sources && message.sources.length > 0) {
				const sourcesEl = messageEl.createDiv('chat-message-sources');
				sourcesEl.createEl('strong', { text: 'Sources:' });

				const sourcesList = sourcesEl.createEl('ul');
				for (const source of message.sources) {
					const sourceItem = sourcesList.createEl('li');
					const sourceLink = sourceItem.createEl('a', {
						text: `${source.file} (${(source.score * 100).toFixed(0)}%)`,
						cls: 'chat-source-link',
					});

					sourceLink.addEventListener('click', (e) => {
						e.preventDefault();
						this.app.workspace.openLinkText(source.file, '', false);
					});
				}
			}
		}
	}

	/**
	 * Handle send button click
	 */
	private async handleSend(): Promise<void> {
		const question = this.inputEl.value.trim();
		if (!question || this.isStreaming) return;

		// Clear input
		this.inputEl.value = '';
		this.isStreaming = true;
		this.sendButton.disabled = true;
		this.inputEl.disabled = true;

		// Add user message
		const userMessage: Message = {
			id: this.generateId(),
			role: 'user',
			content: question,
			timestamp: Date.now(),
		};
		this.messages.push(userMessage);
		await this.renderMessage(userMessage);

		// Add assistant message placeholder
		const assistantMessage: Message = {
			id: this.generateId(),
			role: 'assistant',
			content: '',
			timestamp: Date.now(),
			sources: [],
		};
		this.messages.push(assistantMessage);

		// Create message element for streaming
		const messageEl = this.messagesContainer.createDiv('chat-message chat-message-assistant');

		// Header
		const header = messageEl.createDiv('chat-message-header');
		header.createSpan('chat-message-avatar').setText('🤖');
		header.createSpan('chat-message-timestamp').setText(new Date().toLocaleTimeString());

		// Content
		const content = messageEl.createDiv('chat-message-content');
		content.setText('Thinking...');

		// Scroll to bottom
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

		// Stream response
		try {
			let answer = '';
			let sources: any[] = [];

			// Get conversation history (exclude current user message and placeholder assistant message)
			const conversationHistory = this.messages.slice(0, -2);

			// Query with conversation history for multi-turn context
			// Skip search if RAG toggle is off
			for await (const chunk of this.plugin.ragEngine.query(question, {
				conversationHistory,
				skipSearch: !this.useRAG,
			})) {
				if (chunk.type === 'status') {
					if (chunk.status === 'generating') {
						content.setText('Generating answer...');
					}
				} else if (chunk.type === 'content') {
					answer += chunk.content;
					assistantMessage.content = answer;

					// Re-render markdown
					content.empty();
					await MarkdownRenderer.render(this.app, answer, content, '', this.plugin);

					// Scroll to bottom
					this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
				} else if (chunk.type === 'sources') {
					sources = chunk.sources;
					assistantMessage.sources = sources;

					// Add sources
					const sourcesEl = messageEl.createDiv('chat-message-sources');
					sourcesEl.createEl('strong', { text: 'Sources:' });

					const sourcesList = sourcesEl.createEl('ul');
					for (const source of sources) {
						const sourceItem = sourcesList.createEl('li');
						const sourceLink = sourceItem.createEl('a', {
							text: `${source.file} (${(source.score * 100).toFixed(0)}%)`,
							cls: 'chat-source-link',
						});

						sourceLink.addEventListener('click', (e) => {
							e.preventDefault();
							this.app.workspace.openLinkText(source.file, '', false);
						});
					}
				} else if (chunk.type === 'error') {
					content.empty();
					content.createEl('p', {
						text: `Error: ${chunk.error}`,
						cls: 'chat-error',
					});
				}
			}
		} catch (error) {
			console.error('Chat query error:', error);
			content.empty();
			content.createEl('p', {
				text: `Error: ${(error as Error).message}`,
				cls: 'chat-error',
			});
		}

		// Re-enable input
		this.isStreaming = false;
		this.sendButton.disabled = false;
		this.inputEl.disabled = false;
		this.inputEl.focus();

		// Auto-save after response completes
		await this.autoSaveChat();
	}

	/**
	 * Add a Q&A pair from the modal to start a conversation
	 */
	async addModalQA(question: string, answer: string, sources: any[]): Promise<void> {
		// Add user message
		const userMessage: Message = {
			id: this.generateId(),
			role: 'user',
			content: question,
			timestamp: Date.now(),
		};
		this.messages.push(userMessage);

		// Add assistant message
		const assistantMessage: Message = {
			id: this.generateId(),
			role: 'assistant',
			content: answer,
			timestamp: Date.now(),
			sources,
		};
		this.messages.push(assistantMessage);

		// Re-render
		await this.renderMessages();

		// Auto-save the transferred conversation
		await this.autoSaveChat();
	}

	/**
	 * Clear chat history
	 */
	clearChat(): void {
		this.messages = [];
		this.currentChatFile = null;
		this.messagesContainer.empty();
		this.showWelcomeMessage();
		new Notice('✨ Chat cleared');
	}

	/**
	 * Toggle hamburger menu
	 */
	private toggleMenu(): void {
		const header = this.containerEl.querySelector('.chat-header') as HTMLElement;
		const dropdown = header?.querySelector('.chat-dropdown-menu') as HTMLElement;

		if (!dropdown) return;

		this.menuOpen = !this.menuOpen;

		if (this.menuOpen) {
			dropdown.style.display = 'block';
		} else {
			dropdown.style.display = 'none';
		}
	}

	/**
	 * Toggle RAG search on/off
	 */
	private toggleRAG(): void {
		this.useRAG = !this.useRAG;

		if (this.ragToggleButton) {
			if (this.useRAG) {
				this.ragToggleButton.addClass('active');
				this.ragToggleButton.setAttribute('aria-label', 'Search notes: ON');
				new Notice('🐙 Searching your notes');
			} else {
				this.ragToggleButton.removeClass('active');
				this.ragToggleButton.setAttribute('aria-label', 'Search notes: OFF');
				new Notice('💭 Using general knowledge only');
			}
		}
	}

	/**
	 * Start a new chat conversation
	 */
	async startNewChat(): Promise<void> {
		if (this.messages.length > 0) {
			// Prompt to save current chat
			const save = confirm('Save current chat before starting new one?');
			if (save) {
				await this.saveChat();
			}
		}

		// Reset chat
		this.messages = [];
		this.currentChatFile = null;
		this.messagesContainer.empty();
		this.showWelcomeMessage();
		new Notice('✨ Started new chat');
	}

	/**
	 * Auto-save chat after each message
	 */
	private async autoSaveChat(): Promise<void> {
		if (this.messages.length === 0) return;

		try {
			// If we have an existing chat file, update it
			if (this.currentChatFile) {
				const content = this.formatChatForSave();
				const file = this.app.vault.getAbstractFileByPath(this.currentChatFile);

				if (file && file instanceof TFile) {
					await this.app.vault.modify(file, content);
					if (this.plugin.settings.verboseLogging) {
						console.log(`Auto-saved chat to ${this.currentChatFile}`);
					}
				} else {
					// File was deleted or moved, create new one
					await this.createNewChatFile();
				}
			} else {
				// First save - create new chat file
				await this.createNewChatFile();
			}
		} catch (error) {
			console.error('Auto-save failed:', error);
			// Don't show notice for auto-save failures to avoid interrupting user
		}
	}

	/**
	 * Create a new chat file
	 */
	private async createNewChatFile(): Promise<void> {
		// Generate filename from first user message
		const firstUserMessage = this.messages.find((m) => m.role === 'user');
		const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
		const questionSlug = firstUserMessage
			? firstUserMessage.content
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '')
					.substring(0, 50)
			: 'chat';
		const filename = `${timestamp}-${questionSlug}.md`;

		// Format chat content
		const content = this.formatChatForSave();

		// Determine save location (Chats folder)
		const folder = 'Chats';
		const filePath = `${folder}/${filename}`;

		// Create Chats folder if it doesn't exist
		const folderExists = this.app.vault.getAbstractFileByPath(folder);
		if (!folderExists) {
			await this.app.vault.createFolder(folder);
		}

		// Create the note
		await this.app.vault.create(filePath, content);

		// Store the file path for future auto-saves
		this.currentChatFile = filePath;

		if (this.plugin.settings.verboseLogging) {
			console.log(`Created new chat file: ${filePath}`);
		}
	}

	/**
	 * Generate unique ID for messages
	 */
	private generateId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Load a saved chat from the vault
	 */
	async loadChat(): Promise<void> {
		try {
			// Get all files in Chats folder
			const chatsFolder = 'Chats';
			const folder = this.app.vault.getAbstractFileByPath(chatsFolder);

			if (!folder || !(folder instanceof this.app.vault.adapter.constructor)) {
				new Notice('No saved chats found. Chats folder does not exist.');
				return;
			}

			// Get all markdown files in Chats folder
			const files = this.app.vault.getMarkdownFiles()
				.filter(file => file.path.startsWith(chatsFolder + '/'))
				.sort((a, b) => b.stat.mtime - a.stat.mtime); // Sort by most recent first

			if (files.length === 0) {
				new Notice('No saved chats found.');
				return;
			}

			// Show file picker modal
			const modal = new Modal(this.app);
			modal.titleEl.setText('Load Chat');

			const container = modal.contentEl.createDiv();
			container.style.maxHeight = '400px';
			container.style.overflowY = 'auto';

			const fileList = container.createEl('div');
			fileList.style.display = 'flex';
			fileList.style.flexDirection = 'column';
			fileList.style.gap = '8px';

			for (const file of files) {
				const fileButton = fileList.createEl('button');
				fileButton.style.padding = '12px';
				fileButton.style.textAlign = 'left';
				fileButton.style.border = '1px solid var(--background-modifier-border)';
				fileButton.style.borderRadius = '6px';
				fileButton.style.background = 'var(--background-secondary)';
				fileButton.style.cursor = 'pointer';
				fileButton.style.transition = 'all 0.2s ease';

				const fileName = fileButton.createEl('div');
				fileName.style.fontWeight = '600';
				fileName.setText(file.basename);

				const fileDate = fileButton.createEl('div');
				fileDate.style.fontSize = '0.85em';
				fileDate.style.color = 'var(--text-muted)';
				fileDate.setText(new Date(file.stat.mtime).toLocaleString());

				fileButton.addEventListener('mouseenter', () => {
					fileButton.style.background = 'var(--background-modifier-hover)';
				});

				fileButton.addEventListener('mouseleave', () => {
					fileButton.style.background = 'var(--background-secondary)';
				});

				fileButton.addEventListener('click', async () => {
					modal.close();
					await this.loadChatFromFile(file);
				});
			}

			modal.open();
		} catch (error) {
			console.error('Failed to load chat:', error);
			new Notice(`❌ Failed to load chats: ${(error as Error).message}`);
		}
	}

	/**
	 * Load chat from a specific file
	 */
	private async loadChatFromFile(file: TFile): Promise<void> {
		try {
			const content = await this.app.vault.read(file);

			// Parse the chat format back into messages
			const messages: Message[] = [];
			const lines = content.split('\n');

			let currentRole: 'user' | 'assistant' | null = null;
			let currentContent: string[] = [];
			let currentSources: any[] = [];
			let inKnowledge = false;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];

				if (line === 'User') {
					// Save previous message if exists
					if (currentRole && currentContent.length > 0) {
						messages.push({
							id: this.generateId(),
							role: currentRole,
							content: currentContent.join('\n').trim(),
							timestamp: Date.now(),
							sources: currentRole === 'assistant' ? currentSources : undefined,
						});
					}
					currentRole = 'user';
					currentContent = [];
					currentSources = [];
					inKnowledge = false;
				} else if (line === 'Assistant') {
					// Save previous message if exists
					if (currentRole && currentContent.length > 0) {
						messages.push({
							id: this.generateId(),
							role: currentRole,
							content: currentContent.join('\n').trim(),
							timestamp: Date.now(),
							sources: currentRole === 'assistant' ? currentSources : undefined,
						});
					}
					currentRole = 'assistant';
					currentContent = [];
					currentSources = [];
					inKnowledge = false;
				} else if (line === '<knowledge>') {
					inKnowledge = true;
				} else if (line === '</knowledge>') {
					inKnowledge = false;
				} else if (line === '- - - - -') {
					// Message separator - ignore
					continue;
				} else if (inKnowledge) {
					// Parse sources from knowledge block
					if (line.startsWith('File: [[') && line.endsWith(']]')) {
						const file = line.slice(8, -2);
						currentSources.push({ file, score: 0.5, snippet: '' });
					}
				} else if (currentRole && line.trim()) {
					currentContent.push(line);
				}
			}

			// Save last message
			if (currentRole && currentContent.length > 0) {
				messages.push({
					id: this.generateId(),
					role: currentRole,
					content: currentContent.join('\n').trim(),
					timestamp: Date.now(),
					sources: currentRole === 'assistant' ? currentSources : undefined,
				});
			}

			// Load messages into chat
			this.messages = messages;
			this.currentChatFile = file.path;
			await this.renderMessages();

			new Notice(`✅ Loaded chat: ${file.basename}`);
		} catch (error) {
			console.error('Failed to load chat file:', error);
			new Notice(`❌ Failed to load chat: ${(error as Error).message}`);
		}
	}

	/**
	 * Save chat to vault as markdown file
	 */
	async saveChat(): Promise<void> {
		if (this.messages.length === 0) {
			new Notice('No messages to save!');
			return;
		}

		// Generate filename from first user message
		const firstUserMessage = this.messages.find((m) => m.role === 'user');
		const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
		const questionSlug = firstUserMessage
			? firstUserMessage.content
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '')
					.substring(0, 50)
			: 'chat';
		const defaultName = `${timestamp}-${questionSlug}`;

		// Prompt for filename
		const filename = await this.promptForFilename(defaultName);
		if (!filename) return;

		// Format chat content
		const content = this.formatChatForSave();

		// Determine save location (Chats folder)
		const folder = 'Chats';
		const filePath = `${folder}/${filename}.md`;

		try {
			// Create Chats folder if it doesn't exist
			const folderExists = this.app.vault.getAbstractFileByPath(folder);
			if (!folderExists) {
				await this.app.vault.createFolder(folder);
			}

			// Create the note
			await this.app.vault.create(filePath, content);

			// Show success message
			new Notice(`✅ Chat saved to ${filePath}`);
		} catch (error) {
			console.error('Failed to save chat:', error);
			new Notice(`❌ Failed to save: ${(error as Error).message}`);
		}
	}

	/**
	 * Format chat messages for saving to vault
	 */
	private formatChatForSave(): string {
		const lines: string[] = [];

		for (const message of this.messages) {
			if (message.role === 'user') {
				lines.push('User');
				lines.push(message.content);
				lines.push('- - - - -');
			} else {
				lines.push('Assistant');

				// Add sources as <knowledge> block if present
				if (message.sources && message.sources.length > 0) {
					lines.push('<knowledge>');
					for (const source of message.sources) {
						lines.push(`<note>`);
						lines.push(`File: [[${source.file}]]`);
						lines.push(`Score: ${(source.score * 100).toFixed(0)}%`);
						lines.push(`Snippet: ${source.snippet}`);
						lines.push(`</note>`);
					}
					lines.push('</knowledge>');
					lines.push('');
				}

				// Add message content
				lines.push(message.content);
				lines.push('- - - - -');
			}
		}

		return lines.join('\n');
	}

	/**
	 * Prompt user for a filename
	 */
	private async promptForFilename(defaultName: string): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Save Chat');

			const container = modal.contentEl.createDiv();
			container.createEl('p', {
				text: 'Enter a name for this chat (without .md extension)',
			});

			const input = container.createEl('input', {
				type: 'text',
				value: defaultName,
			});
			input.style.width = '100%';
			input.style.padding = '8px';
			input.style.marginBottom = '12px';

			const buttonContainer = container.createDiv();
			buttonContainer.style.display = 'flex';
			buttonContainer.style.gap = '8px';
			buttonContainer.style.justifyContent = 'flex-end';

			const saveButton = buttonContainer.createEl('button', { text: 'Save' });
			saveButton.style.padding = '8px 16px';
			saveButton.addEventListener('click', () => {
				const filename = input.value.trim();
				modal.close();
				resolve(filename || null);
			});

			const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
			cancelButton.style.padding = '8px 16px';
			cancelButton.addEventListener('click', () => {
				modal.close();
				resolve(null);
			});

			// Submit on Enter
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					const filename = input.value.trim();
					modal.close();
					resolve(filename || null);
				}
			});

			modal.open();

			// Auto-focus and select all
			setTimeout(() => {
				input.focus();
				input.select();
			}, 10);
		});
	}
}
