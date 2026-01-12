/**
 * PromptManager - Manages system prompts with markdown files and variable substitution
 *
 * Loads prompts from markdown files in the prompts/ directory.
 * Supports frontmatter metadata and variable substitution.
 */

import { App, normalizePath } from 'obsidian';
import type { Settings } from '../types';

/**
 * Prompt metadata from frontmatter
 */
interface PromptMetadata {
	name: string;
	type: string;
	description: string;
	variables: string[];
}

/**
 * Parsed prompt with metadata and content
 */
interface ParsedPrompt {
	metadata: PromptMetadata;
	content: string;
}

/**
 * Variables available for prompt substitution
 */
export interface PromptVariables {
	context: string;
	question: string;
	history: string;
	date: string;
	vault: string;
}

/**
 * PromptManager - Loads and renders prompts with variable substitution
 */
export class PromptManager {
	private app: App;
	private settings: Settings;
	private pluginDir: string;

	constructor(app: App, settings: Settings, pluginDir: string) {
		this.app = app;
		this.settings = settings;
		this.pluginDir = pluginDir;
	}

	/**
	 * Get the active prompt content
	 */
	async getSystemPrompt(): Promise<string> {
		const promptName = this.settings.activePromptTemplate || 'rag-default';
		const promptPath = normalizePath(`${this.pluginDir}/prompts/${promptName}.md`);

		try {
			const file = this.app.vault.getAbstractFileByPath(promptPath);
			if (!file) {
				console.warn(`Prompt file not found: ${promptPath}, using fallback`);
				return this.getFallbackPrompt();
			}

			const content = await this.app.vault.read(file as any);
			const parsed = this.parsePrompt(content);
			return parsed.content;
		} catch (error) {
			console.error('Failed to load prompt:', error);
			return this.getFallbackPrompt();
		}
	}

	/**
	 * Render prompt with variable substitution
	 */
	renderPrompt(template: string, variables: Partial<PromptVariables>): string {
		let rendered = template;

		// Substitute each variable
		const vars: PromptVariables = {
			context: variables.context || '',
			question: variables.question || '',
			history: variables.history || '',
			date: variables.date || new Date().toLocaleDateString(),
			vault: variables.vault || this.app.vault.getName(),
		};

		for (const [key, value] of Object.entries(vars)) {
			const placeholder = `{${key}}`;
			rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
		}

		return rendered;
	}

	/**
	 * List available prompt templates
	 */
	async listPrompts(): Promise<Array<{ name: string; metadata: PromptMetadata }>> {
		const promptsDir = normalizePath(`${this.pluginDir}/prompts`);
		const dir = this.app.vault.getAbstractFileByPath(promptsDir);

		if (!dir) {
			return [];
		}

		const files = (dir as any).children || [];
		const prompts: Array<{ name: string; metadata: PromptMetadata }> = [];

		for (const file of files) {
			if (file.extension === 'md') {
				try {
					const content = await this.app.vault.read(file);
					const parsed = this.parsePrompt(content);
					prompts.push({
						name: file.basename,
						metadata: parsed.metadata,
					});
				} catch (error) {
					console.error(`Failed to parse prompt ${file.name}:`, error);
				}
			}
		}

		return prompts;
	}

	/**
	 * Get prompt preview for settings UI
	 */
	async getPromptPreview(promptName: string): Promise<string> {
		const promptPath = normalizePath(`${this.pluginDir}/prompts/${promptName}.md`);

		try {
			const file = this.app.vault.getAbstractFileByPath(promptPath);
			if (!file) {
				return 'Prompt not found';
			}

			const content = await this.app.vault.read(file as any);
			const parsed = this.parsePrompt(content);

			// Return first 500 chars as preview
			return parsed.content.substring(0, 500) + (parsed.content.length > 500 ? '...' : '');
		} catch (error) {
			return 'Error loading prompt';
		}
	}

	/**
	 * Update settings
	 */
	updateSettings(settings: Settings): void {
		this.settings = settings;
	}

	/**
	 * Parse markdown prompt file with frontmatter
	 */
	private parsePrompt(content: string): ParsedPrompt {
		// Match frontmatter: ---\n...yaml...\n---
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			// No frontmatter, return as-is with default metadata
			return {
				metadata: {
					name: 'Unknown',
					type: 'rag',
					description: '',
					variables: [],
				},
				content: content.trim(),
			};
		}

		const frontmatter = match[1] || '';
		const body = match[2] || '';

		// Parse frontmatter (simple YAML parser for our use case)
		const metadata: PromptMetadata = {
			name: this.extractYamlValue(frontmatter, 'name') || 'Unknown',
			type: (this.extractYamlValue(frontmatter, 'type') as 'rag' | 'custom') || 'rag',
			description: this.extractYamlValue(frontmatter, 'description') || '',
			variables: this.extractYamlArray(frontmatter, 'variables'),
		};

		return {
			metadata,
			content: body.trim(),
		};
	}

	/**
	 * Extract a single value from YAML frontmatter
	 */
	private extractYamlValue(yaml: string, key: string): string | null {
		const regex = new RegExp(`^${key}:\\s*(.+)$`, 'm');
		const match = yaml.match(regex);
		return match?.[1]?.trim() || null;
	}

	/**
	 * Extract an array from YAML frontmatter
	 */
	private extractYamlArray(yaml: string, key: string): string[] {
		const regex = new RegExp(`^${key}:\\s*\\[(.+)\\]$`, 'm');
		const match = yaml.match(regex);
		if (!match?.[1]) return [];

		return match[1].split(',').map(s => s.trim());
	}

	/**
	 * Fallback prompt if file loading fails
	 */
	private getFallbackPrompt(): string {
		return `You are a helpful assistant that answers questions based on the user's personal notes.

Context from your notes:
{context}

{history}

Question: {question}

Answer:`;
	}
}
