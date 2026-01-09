# Smart Second Brain v2 - Technical Specification

**Version:** 2.0
**Date:** 2026-01-07
**Phase:** 1 (Foundation)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Obsidian Application                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Smart Second Brain Plugin                │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │           Svelte UI Components                  │  │  │
│  │  │  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │  │  │
│  │  │  │  Chat   │  │Settings │  │ Onboarding  │  │  │  │
│  │  │  └─────────┘  └──────────┘  └──────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │           State Management (Stores)             │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              Core Logic Layer                   │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │  │  │
│  │  │  │RAGEngine│  │VectorStore│  │DocLoader   │  │  │  │
│  │  │  └──────────┘  └──────────┘  └─────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │          Provider Abstraction Layer             │  │  │
│  │  │  ┌────────┐  ┌─────────┐  ┌──────────────┐   │  │  │
│  │  │  │Ollama │  │OpenAI  │  │ Anthropic   │   │  │  │
│  │  │  └────────┘  └─────────┘  └──────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │                │                 │
           ▼                ▼                 ▼
    ┌──────────┐    ┌──────────┐     ┌──────────────┐
    │  Ollama  │    │ OpenAI   │     │  Anthropic   │
    │  Local   │    │   API    │     │     API      │
    └──────────┘    └──────────┘     └──────────────┘
```

---

## Technology Stack

### Core Technologies

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| Language | TypeScript | 5.2+ | Type safety, better DX, Obsidian standard |
| UI Framework | Vanilla TS/HTML | Native | Simple, no framework complexity, standard for Obsidian |
| Build Tool | esbuild | 0.25+ | Fast, simple, standard for Obsidian plugins |
| Styling | CSS + Obsidian CSS Vars | Native | Native styling with Obsidian theme integration |
| Vector DB | Orama | 2.x | Pure JS, fast, serializable |
| **LLM (Phase 1)** | **Direct API Calls** | **Native** | **Learn fundamentals, no framework overhead** |
| **LLM (Phase 2)** | **LangChain.js** | **0.1+** | **Better abstractions, add when needed** |
| **Agents (Phase 3)** | **LangGraph.js** | **0.0.x** | **Multi-agent workflows, future** |
| State | Simple Class-based | Native | Lightweight, easy to understand |
| HTTP Client | Fetch API | Native | Built into Obsidian |
| IDs | nanoid | 5.x | Small, fast, collision-resistant |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| TypeScript | Type checking |
| Jest (optional) | Unit testing if needed |

---

## Module Architecture

### 1. Core Module (`src/core/`)

#### RAGEngine.ts
**Responsibility:** Orchestrate RAG pipeline

```typescript
export class RAGEngine {
  private vectorStore: VectorStore;
  private provider: LLMProvider;
  private embeddings: EmbeddingProvider;
  private loader: DocumentLoader;

  constructor(
    app: App,
    settings: Settings,
    provider: LLMProvider,
    embeddings: EmbeddingProvider
  ) {
    this.vectorStore = new VectorStore(embeddings);
    this.provider = provider;
    this.embeddings = embeddings;
    this.loader = new DocumentLoader(app, settings);
  }

  /**
   * Initialize: Load existing vector store or index vault
   */
  async initialize(): Promise<void> {
    const exists = await this.vectorStore.load();
    if (!exists) {
      await this.indexVault();
    }
  }

  /**
   * Index all documents in vault
   */
  async indexVault(): Promise<void> {
    const docs = await this.loader.loadAllDocuments();
    await this.vectorStore.addDocuments(docs);
    await this.vectorStore.save();
  }

  /**
   * Update a single document
   */
  async updateDocument(file: TFile): Promise<void> {
    const doc = await this.loader.loadDocument(file);
    await this.vectorStore.updateDocument(doc);
  }

  /**
   * Remove a document
   */
  async removeDocument(file: TFile): Promise<void> {
    await this.vectorStore.removeDocument(file.path);
  }

  /**
   * Query: Retrieve context and generate response
   */
  async *query(
    question: string,
    options: QueryOptions
  ): AsyncGenerator<StreamChunk> {
    // 1. Retrieve relevant documents
    const docs = await this.vectorStore.similaritySearch(
      question,
      options.topK,
      options.similarityThreshold
    );

    // 2. Format context
    const context = docs.map(d =>
      `File: ${d.metadata.path}\n\n${d.content}`
    ).join('\n\n---\n\n');

    // 3. Generate response (streaming)
    for await (const chunk of this.provider.generateStream(question, context)) {
      yield {
        type: 'content',
        content: chunk
      };
    }

    // 4. Return sources
    yield {
      type: 'sources',
      sources: docs.map(d => ({
        file: d.metadata.path,
        score: d.score,
        snippet: d.content.slice(0, 200)
      }))
    };
  }
}
```

#### VectorStore.ts
**Responsibility:** Manage vector embeddings and search

```typescript
export class VectorStore {
  private db: Orama;
  private embeddings: EmbeddingProvider;
  private storePath: string;

  constructor(embeddings: EmbeddingProvider) {
    this.embeddings = embeddings;
    this.db = create({
      schema: {
        id: 'string',
        content: 'string',
        embedding: 'vector[' + embeddings.getDimensions() + ']',
        path: 'string',
        mtime: 'number',
        tags: 'string[]'
      }
    });
  }

  /**
   * Add documents to vector store
   */
  async addDocuments(docs: Document[]): Promise<void> {
    for (const doc of docs) {
      const embedding = await this.embeddings.embed(doc.content);
      await insert(this.db, {
        id: doc.metadata.path,
        content: doc.content,
        embedding,
        path: doc.metadata.path,
        mtime: doc.metadata.mtime,
        tags: doc.metadata.tags || []
      });
    }
  }

  /**
   * Update a single document
   */
  async updateDocument(doc: Document): Promise<void> {
    await remove(this.db, doc.metadata.path);
    await this.addDocuments([doc]);
  }

  /**
   * Remove document by path
   */
  async removeDocument(path: string): Promise<void> {
    await remove(this.db, path);
  }

  /**
   * Similarity search
   */
  async similaritySearch(
    query: string,
    k: number = 5,
    threshold: number = 0.75
  ): Promise<ScoredDocument[]> {
    const queryEmbedding = await this.embeddings.embed(query);

    const results = await searchVector(this.db, {
      vector: queryEmbedding,
      property: 'embedding',
      similarity: 'cosine',
      limit: k
    });

    return results
      .filter(r => r.score >= threshold)
      .map(r => ({
        content: r.document.content,
        metadata: {
          path: r.document.path,
          mtime: r.document.mtime,
          tags: r.document.tags
        },
        score: r.score
      }));
  }

  /**
   * Save to disk
   */
  async save(): Promise<void> {
    const data = await persist(this.db, 'binary');
    // Write to .obsidian/plugins/smart-second-brain-v2/vectorstores/
    await writeFile(this.storePath, data);
  }

  /**
   * Load from disk
   */
  async load(): Promise<boolean> {
    try {
      const data = await readFile(this.storePath);
      this.db = await restore('binary', data);
      return true;
    } catch (e) {
      return false;
    }
  }
}
```

#### DocumentLoader.ts
**Responsibility:** Load and parse vault files

```typescript
export class DocumentLoader {
  private app: App;
  private settings: Settings;

  constructor(app: App, settings: Settings) {
    this.app = app;
    this.settings = settings;
  }

  /**
   * Load all documents from vault
   */
  async loadAllDocuments(): Promise<Document[]> {
    const files = this.app.vault.getMarkdownFiles();
    const docs: Document[] = [];

    for (const file of files) {
      if (this.shouldInclude(file)) {
        const doc = await this.loadDocument(file);
        if (doc) docs.push(doc);
      }
    }

    return docs;
  }

  /**
   * Load a single document
   */
  async loadDocument(file: TFile): Promise<Document | null> {
    if (!this.shouldInclude(file)) return null;

    const content = await this.app.vault.read(file);
    const cache = this.app.metadataCache.getFileCache(file);

    // Parse frontmatter
    const frontmatter = cache?.frontmatter || {};
    const tags = cache?.tags?.map(t => t.tag) || [];

    // Remove frontmatter from content
    const cleanContent = this.removeFrontmatter(content);

    return {
      content: cleanContent,
      metadata: {
        path: file.path,
        mtime: file.stat.mtime,
        tags,
        frontmatter
      }
    };
  }

  /**
   * Check if file should be included
   */
  private shouldInclude(file: TFile): boolean {
    // Check exclusion patterns
    for (const pattern of this.settings.excludePatterns) {
      if (minimatch(file.path, pattern)) {
        return false;
      }
    }

    // Check if in chat folder
    if (file.path.startsWith(this.settings.chatFolder)) {
      return false;
    }

    return true;
  }

  /**
   * Remove YAML frontmatter from content
   */
  private removeFrontmatter(content: string): string {
    const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
    return content.replace(frontmatterRegex, '').trim();
  }
}
```

---

### 2. Provider Module (`src/providers/`)

#### BaseProvider.ts
**Interface for all providers**

```typescript
export interface LLMProvider {
  /** Provider name */
  readonly name: string;

  /** Provider type */
  readonly type: 'local' | 'cloud';

  /**
   * Configure provider with settings
   */
  configure(config: ProviderConfig): void;

  /**
   * Validate configuration (e.g., API key, connection)
   */
  validate(): Promise<ValidationResult>;

  /**
   * List available models
   */
  listModels(): Promise<Model[]>;

  /**
   * Get default model
   */
  getDefaultModel(): Model;

  /**
   * Generate response (streaming)
   */
  generateStream(
    prompt: string,
    context: string,
    options?: GenerateOptions
  ): AsyncGenerator<string>;

  /**
   * Generate response (non-streaming)
   */
  generate(
    prompt: string,
    context: string,
    options?: GenerateOptions
  ): Promise<string>;
}

export interface EmbeddingProvider {
  /** Provider name */
  readonly name: string;

  /**
   * Embed single text
   */
  embed(text: string): Promise<number[]>;

  /**
   * Embed multiple texts (batch)
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Get embedding dimensions
   */
  getDimensions(): number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface Model {
  id: string;
  name: string;
  contextWindow: number;
  description?: string;
}
```

#### OllamaProvider.ts
**Ollama implementation**

```typescript
export class OllamaProvider implements LLMProvider, EmbeddingProvider {
  readonly name = 'Ollama';
  readonly type = 'local' as const;

  private baseUrl: string = 'http://localhost:11434';
  private model: string = 'llama2';
  private embeddingModel: string = 'nomic-embed-text';
  private temperature: number = 0.7;

  configure(config: ProviderConfig): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.model) this.model = config.model;
    if (config.temperature) this.temperature = config.temperature;
  }

  async validate(): Promise<ValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        return { valid: false, error: 'Cannot connect to Ollama' };
      }

      const data = await response.json();
      const hasModel = data.models.some((m: any) => m.name === this.model);

      if (!hasModel) {
        return {
          valid: false,
          error: `Model ${this.model} not found. Run: ollama pull ${this.model}`
        };
      }

      return { valid: true };
    } catch (e) {
      return {
        valid: false,
        error: 'Ollama not running. Start with: ollama serve'
      };
    }
  }

  async listModels(): Promise<Model[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();

    return data.models.map((m: any) => ({
      id: m.name,
      name: m.name,
      contextWindow: this.getContextWindow(m.name)
    }));
  }

  getDefaultModel(): Model {
    return {
      id: 'llama2',
      name: 'Llama 2',
      contextWindow: 4096
    };
  }

  async *generateStream(
    prompt: string,
    context: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const systemPrompt = options?.systemPrompt || this.getDefaultSystemPrompt();
    const fullPrompt = this.formatPrompt(systemPrompt, context, prompt);

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        temperature: options?.temperature || this.temperature,
        stream: true
      })
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        const data = JSON.parse(line);
        if (data.response) {
          yield data.response;
        }
      }
    }
  }

  async generate(
    prompt: string,
    context: string,
    options?: GenerateOptions
  ): Promise<string> {
    let result = '';
    for await (const chunk of this.generateStream(prompt, context, options)) {
      result += chunk;
    }
    return result;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: text
      })
    });

    const data = await response.json();
    return data.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  getDimensions(): number {
    // nomic-embed-text: 768, mxbai-embed-large: 1024
    return this.embeddingModel === 'nomic-embed-text' ? 768 : 1024;
  }

  private formatPrompt(system: string, context: string, question: string): string {
    return `${system}

Context from your notes:
${context}

Question: ${question}

Answer:`;
  }

  private getDefaultSystemPrompt(): string {
    return `You are a helpful assistant that answers questions based on the user's personal notes.
Always cite the specific notes you reference. If the answer isn't in the provided context, say so.`;
  }

  private getContextWindow(model: string): number {
    const windows: Record<string, number> = {
      'llama2': 4096,
      'mistral': 8192,
      'phi': 2048,
      'gemma': 8192
    };
    return windows[model] || 4096;
  }
}
```

#### OpenAIProvider.ts
**OpenAI implementation**

```typescript
export class OpenAIProvider implements LLMProvider, EmbeddingProvider {
  readonly name = 'OpenAI';
  readonly type = 'cloud' as const;

  private apiKey: string = '';
  private model: string = 'gpt-4o';
  private embeddingModel: string = 'text-embedding-3-small';
  private temperature: number = 0.7;

  configure(config: ProviderConfig): void {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.model) this.model = config.model;
    if (config.temperature) this.temperature = config.temperature;
  }

  async validate(): Promise<ValidationResult> {
    if (!this.apiKey) {
      return { valid: false, error: 'API key required' };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }

      if (!response.ok) {
        return { valid: false, error: 'OpenAI API error' };
      }

      return { valid: true };
    } catch (e) {
      return { valid: false, error: 'Cannot connect to OpenAI' };
    }
  }

  async listModels(): Promise<Model[]> {
    return [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385 },
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 }
    ];
  }

  getDefaultModel(): Model {
    return { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 };
  }

  async *generateStream(
    prompt: string,
    context: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const systemPrompt = options?.systemPrompt || this.getDefaultSystemPrompt();
    const messages = this.formatMessages(systemPrompt, context, prompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature || this.temperature,
        stream: true
      })
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.replace('data: ', '');
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  }

  async generate(
    prompt: string,
    context: string,
    options?: GenerateOptions
  ): Promise<string> {
    let result = '';
    for await (const chunk of this.generateStream(prompt, context, options)) {
      result += chunk;
    }
    return result;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text
      })
    });

    const data = await response.json();
    return data.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: texts
      })
    });

    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }

  getDimensions(): number {
    return this.embeddingModel === 'text-embedding-3-large' ? 3072 : 1536;
  }

  private formatMessages(system: string, context: string, question: string): any[] {
    return [
      { role: 'system', content: system },
      { role: 'user', content: `Context from my notes:\n\n${context}\n\nQuestion: ${question}` }
    ];
  }

  private getDefaultSystemPrompt(): string {
    return `You are a helpful assistant that answers questions based on the user's personal notes.
Always cite the specific notes you reference using [[note name]] format.
If the answer isn't in the provided context, say so clearly.`;
  }
}
```

#### AnthropicProvider.ts
**Anthropic Claude implementation**

```typescript
export class AnthropicProvider implements LLMProvider {
  readonly name = 'Anthropic';
  readonly type = 'cloud' as const;

  private apiKey: string = '';
  private model: string = 'claude-3-5-sonnet-20241022';
  private temperature: number = 0.7;

  configure(config: ProviderConfig): void {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.model) this.model = config.model;
    if (config.temperature) this.temperature = config.temperature;
  }

  async validate(): Promise<ValidationResult> {
    if (!this.apiKey) {
      return { valid: false, error: 'API key required' };
    }

    try {
      // Test with a minimal request
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }

      if (!response.ok && response.status !== 400) {
        return { valid: false, error: 'Anthropic API error' };
      }

      return { valid: true };
    } catch (e) {
      return { valid: false, error: 'Cannot connect to Anthropic' };
    }
  }

  async listModels(): Promise<Model[]> {
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        contextWindow: 200000
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        contextWindow: 200000
      }
    ];
  }

  getDefaultModel(): Model {
    return {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      contextWindow: 200000
    };
  }

  async *generateStream(
    prompt: string,
    context: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const systemPrompt = options?.systemPrompt || this.getDefaultSystemPrompt();
    const userMessage = this.formatMessage(context, prompt);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || this.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        stream: true
      })
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.replace('data: ', '');

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'content_block_delta') {
            const content = parsed.delta?.text;
            if (content) yield content;
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  }

  async generate(
    prompt: string,
    context: string,
    options?: GenerateOptions
  ): Promise<string> {
    let result = '';
    for await (const chunk of this.generateStream(prompt, context, options)) {
      result += chunk;
    }
    return result;
  }

  private formatMessage(context: string, question: string): string {
    return `Here is context from my personal notes:

<context>
${context}
</context>

Question: ${question}

Please answer based on the context provided. Cite specific notes using [[note name]] format.`;
  }

  private getDefaultSystemPrompt(): string {
    return `You are a helpful assistant that answers questions based on the user's personal notes in their Obsidian vault.

When answering:
- Base your answers on the provided context
- Cite specific notes using [[note name]] format
- If the answer isn't in the context, say so clearly
- Be concise but thorough
- Use markdown formatting for better readability`;
  }
}
```

---

### 3. UI Module (`src/ui/`)

#### ChatView.ts
**Responsibility:** Main chat interface using Obsidian's ItemView

```typescript
import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { RAGEngine } from '../core/RAGEngine';
import type { Message, Source } from '../types';

export const VIEW_TYPE_CHAT = 'smart-second-brain-chat';

export class ChatView extends ItemView {
  private ragEngine: RAGEngine;
  private messages: Message[] = [];
  private isStreaming = false;

  private messagesContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;

  constructor(leaf: WorkspaceLeaf, ragEngine: RAGEngine) {
    super(leaf);
    this.ragEngine = ragEngine;
  }

  getViewType(): string {
    return VIEW_TYPE_CHAT;
  }

  getDisplayText(): string {
    return 'Smart Second Brain';
  }

  getIcon(): string {
    return 'brain';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('smart-second-brain-chat');

    // Create header
    const header = container.createDiv({ cls: 'chat-header' });
    header.createEl('h2', { text: 'Smart Second Brain' });

    // Create messages container
    this.messagesContainer = container.createDiv({ cls: 'chat-messages' });

    // Create input container
    this.inputContainer = container.createDiv({ cls: 'chat-input-container' });

    this.inputEl = this.inputContainer.createEl('textarea', {
      cls: 'chat-input',
      attr: { placeholder: 'Ask a question about your notes...' }
    });

    this.sendButton = this.inputContainer.createEl('button', {
      cls: 'chat-send-button',
      text: 'Send'
    });

    // Event listeners
    this.sendButton.addEventListener('click', () => this.handleSend());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Load existing messages if any
    this.renderMessages();
  }

  async onClose(): Promise<void> {
    // Cleanup
  }

  private async handleSend(): Promise<void> {
    if (this.isStreaming) return;

    const text = this.inputEl.value.trim();
    if (!text) return;

    // Clear input
    this.inputEl.value = '';

    // Add user message
    this.addMessage({
      role: 'user',
      content: text
    });

    // Start streaming
    this.isStreaming = true;
    this.sendButton.disabled = true;

    let assistantMessage = '';
    let sources: Source[] = [];

    // Create assistant message element
    const messageEl = this.createMessageElement('assistant', '');

    try {
      for await (const chunk of this.ragEngine.query(text, {
        topK: 5,
        similarityThreshold: 0.75
      })) {
        if (chunk.type === 'content') {
          assistantMessage += chunk.content;
          this.updateMessageContent(messageEl, assistantMessage);
        } else if (chunk.type === 'sources') {
          sources = chunk.sources;
          this.addSourcesToMessage(messageEl, sources);
        }
      }

      // Save assistant message
      this.addMessage({
        role: 'assistant',
        content: assistantMessage,
        sources
      });
    } catch (error) {
      console.error('Query error:', error);
      this.updateMessageContent(
        messageEl,
        '❌ Error: ' + (error as Error).message
      );
    } finally {
      this.isStreaming = false;
      this.sendButton.disabled = false;
    }
  }

  private addMessage(message: Omit<Message, 'id' | 'timestamp'>): void {
    const fullMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    this.messages.push(fullMessage);
  }

  private createMessageElement(role: string, content: string): HTMLElement {
    const messageEl = this.messagesContainer.createDiv({
      cls: `chat-message chat-message-${role}`
    });

    const roleEl = messageEl.createDiv({ cls: 'chat-message-role' });
    roleEl.setText(role === 'user' ? 'You' : 'Assistant');

    const contentEl = messageEl.createDiv({ cls: 'chat-message-content' });

    // Render markdown
    if (content) {
      this.renderMarkdown(content, contentEl);
    }

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    return messageEl;
  }

  private updateMessageContent(messageEl: HTMLElement, content: string): void {
    const contentEl = messageEl.querySelector('.chat-message-content');
    if (contentEl) {
      contentEl.empty();
      this.renderMarkdown(content, contentEl as HTMLElement);
    }

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private addSourcesToMessage(messageEl: HTMLElement, sources: Source[]): void {
    if (sources.length === 0) return;

    const sourcesEl = messageEl.createDiv({ cls: 'chat-message-sources' });
    sourcesEl.createEl('strong', { text: 'Sources:' });

    const sourcesList = sourcesEl.createEl('ul');
    sources.forEach(source => {
      const li = sourcesList.createEl('li');
      const link = li.createEl('a', {
        cls: 'internal-link',
        text: source.file
      });

      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.app.workspace.openLinkText(source.file, '', false);
      });

      // Show similarity score
      li.createSpan({
        cls: 'chat-source-score',
        text: ` (${Math.round(source.score * 100)}%)`
      });
    });
  }

  private renderMarkdown(markdown: string, containerEl: HTMLElement): void {
    // Use Obsidian's markdown renderer
    const component = new (this.app as any).Component();
    (this.app as any).renderer.renderMarkdown(
      markdown,
      containerEl,
      '',
      component
    );
  }

  private renderMessages(): void {
    this.messagesContainer.empty();

    this.messages.forEach(message => {
      const messageEl = this.createMessageElement(message.role, message.content);
      if (message.sources && message.sources.length > 0) {
        this.addSourcesToMessage(messageEl, message.sources);
      }
    });
  }
}
```

#### components.ts
**Reusable UI helper functions**

```typescript
/**
 * Create a setting item (like in Settings tab)
 */
export function createSettingItem(
  containerEl: HTMLElement,
  options: {
    name: string;
    desc?: string;
  }
): HTMLElement {
  const settingItem = containerEl.createDiv({ cls: 'setting-item' });

  const info = settingItem.createDiv({ cls: 'setting-item-info' });
  info.createDiv({ cls: 'setting-item-name', text: options.name });
  if (options.desc) {
    info.createDiv({ cls: 'setting-item-description', text: options.desc });
  }

  const control = settingItem.createDiv({ cls: 'setting-item-control' });

  return control;
}

/**
 * Create a text input
 */
export function createTextInput(
  containerEl: HTMLElement,
  options: {
    placeholder?: string;
    value?: string;
    onChange: (value: string) => void;
  }
): HTMLInputElement {
  const input = containerEl.createEl('input', {
    type: 'text',
    cls: 'setting-input',
    attr: { placeholder: options.placeholder || '' }
  });

  if (options.value) {
    input.value = options.value;
  }

  input.addEventListener('change', () => {
    options.onChange(input.value);
  });

  return input;
}

/**
 * Create a dropdown
 */
export function createDropdown(
  containerEl: HTMLElement,
  options: {
    options: Array<{ value: string; label: string }>;
    value?: string;
    onChange: (value: string) => void;
  }
): HTMLSelectElement {
  const select = containerEl.createEl('select', { cls: 'dropdown' });

  options.options.forEach(opt => {
    const option = select.createEl('option', {
      value: opt.value,
      text: opt.label
    });
    if (opt.value === options.value) {
      option.selected = true;
    }
  });

  select.addEventListener('change', () => {
    options.onChange(select.value);
  });

  return select;
}

/**
 * Create a toggle
 */
export function createToggle(
  containerEl: HTMLElement,
  options: {
    value: boolean;
    onChange: (value: boolean) => void;
  }
): HTMLElement {
  const toggle = containerEl.createDiv({ cls: 'checkbox-container' });

  const checkbox = toggle.createEl('input', {
    type: 'checkbox',
    cls: 'task-list-item-checkbox'
  });

  checkbox.checked = options.value;

  checkbox.addEventListener('change', () => {
    options.onChange(checkbox.checked);
  });

  return toggle;
}
```

---

### 4. State Management (`src/utils/state.ts`)

#### Simple State Management (No Framework)

```typescript
import type { Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  activeProvider: 'ollama',

  // Ollama
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama2',
  ollamaEmbeddingModel: 'nomic-embed-text',

  // OpenAI
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  openaiEmbeddingModel: 'text-embedding-3-small',

  // Anthropic
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-sonnet-20241022',

  // RAG
  similarityThreshold: 0.75,
  topK: 5,
  temperature: 0.7,

  // UI
  viewMode: 'comfy',
  chatFolder: 'Chats',

  // Privacy
  incognitoMode: false,

  // Exclusions
  excludePatterns: ['Archive/**', 'Templates/**'],

  // Advanced
  verboseLogging: false
};

/**
 * Simple event emitter for state changes
 */
export class StateEmitter<T> {
  private listeners: Array<(state: T) => void> = [];
  private state: T;

  constructor(initialState: T) {
    this.state = initialState;
  }

  get(): T {
    return this.state;
  }

  set(newState: T): void {
    this.state = newState;
    this.emit();
  }

  update(updater: (state: T) => T): void {
    this.state = updater(this.state);
    this.emit();
  }

  subscribe(listener: (state: T) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}
```

---

## Build Configuration

### esbuild.config.mjs

```javascript
import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = process.argv[2] === 'production';

const context = await esbuild.context({
  banner: {
    js: banner,
  },
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

---

## API Contracts

### Query API

```typescript
interface QueryOptions {
  topK?: number;                   // Number of documents to retrieve
  similarityThreshold?: number;    // Minimum similarity score
  temperature?: number;            // LLM temperature
  systemPrompt?: string;           // Custom system prompt
}

interface StreamChunk {
  type: 'content' | 'sources';
  content?: string;                // Text chunk (if type=content)
  sources?: Source[];              // Sources (if type=sources)
}

interface Source {
  file: string;                    // File path
  score: number;                   // Similarity score (0-1)
  snippet: string;                 // Relevant excerpt
}
```

### Provider API

See `BaseProvider.ts` interface above.

---

## Performance Requirements

### Benchmarks

| Operation | Target | Measured | Status |
|-----------|--------|----------|--------|
| Plugin load | <2s | TBD | - |
| Initial index (1000 notes) | <60s | TBD | - |
| Incremental update | <500ms | TBD | - |
| Query (cloud) | <3s | TBD | - |
| Query (local) | <5s | TBD | - |
| Vector store save | <1s | TBD | - |
| Vector store load | <2s | TBD | - |

### Memory Targets

| Vault Size | Max Memory | Notes |
|------------|------------|-------|
| 1,000 notes | 100 MB | Baseline |
| 5,000 notes | 300 MB | Comfortable |
| 10,000 notes | 500 MB | Maximum supported |

---

## Security Considerations

### API Key Storage

```typescript
// Store in Obsidian's secure storage
await this.saveData({
  ...settings,
  openaiApiKey: encrypt(settings.openaiApiKey),
  anthropicApiKey: encrypt(settings.anthropicApiKey)
});

// Load and decrypt
const data = await this.loadData();
settings.openaiApiKey = decrypt(data.openaiApiKey);
settings.anthropicApiKey = decrypt(data.anthropicApiKey);
```

### Content Filtering

- Strip sensitive frontmatter fields (e.g., `api_keys`, `secrets`)
- Respect `private: true` frontmatter flag
- Don't embed password manager notes

### Rate Limiting

- Implement exponential backoff for API errors
- Queue requests to prevent API abuse
- Show cost warnings for expensive operations

---

## Testing Strategy

### Unit Tests

```typescript
// Example: VectorStore.test.ts
import { describe, it, expect } from 'vitest';
import { VectorStore } from '../core/VectorStore';
import { MockEmbeddingProvider } from './mocks';

describe('VectorStore', () => {
  it('should add documents', async () => {
    const embeddings = new MockEmbeddingProvider();
    const store = new VectorStore(embeddings);

    await store.addDocuments([
      { content: 'Test content', metadata: { path: 'test.md' } }
    ]);

    const results = await store.similaritySearch('Test', 1);
    expect(results).toHaveLength(1);
    expect(results[0].metadata.path).toBe('test.md');
  });

  it('should persist to disk', async () => {
    const embeddings = new MockEmbeddingProvider();
    const store = new VectorStore(embeddings);

    await store.addDocuments([
      { content: 'Test', metadata: { path: 'test.md' } }
    ]);

    await store.save();

    const newStore = new VectorStore(embeddings);
    const loaded = await newStore.load();
    expect(loaded).toBe(true);

    const results = await newStore.similaritySearch('Test', 1);
    expect(results).toHaveLength(1);
  });
});
```

### Integration Tests

- Test full RAG pipeline
- Test provider switching
- Test chat persistence
- Test vault synchronization

### Manual Testing

- Test on vaults of various sizes
- Test with different note structures
- Test on all supported OSes
- Test with all providers

---

## Deployment & Release

### Build Process

```bash
# Development (watch mode)
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Package for release (build + version bump)
npm run version
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "lint": "eslint src --ext .ts",
    "version": "node version-bump.mjs && git add manifest.json versions.json"
  }
}
```

### Release Checklist

1. Run all tests
2. Update version in `manifest.json` and `package.json`
3. Update `versions.json`
4. Build production bundle
5. Test in fresh vault
6. Create GitHub release with notes
7. Submit to Obsidian Community Plugins

---

## Monitoring & Telemetry

**Phase 1:** No telemetry

**Future:** Optional anonymous usage stats
- Query success rate
- Average query time
- Most common errors
- Provider distribution
- Vault size distribution

User must explicitly opt-in. No data sent by default.

---

## Appendix

### Glossary

- **RAG**: Retrieval-Augmented Generation
- **Embedding**: Vector representation of text
- **Vector Store**: Database of embeddings
- **Similarity Search**: Finding similar documents by vector distance
- **Streaming**: Sending response in chunks as generated
- **Provider**: LLM/embedding service (Ollama, OpenAI, etc.)

### Dependencies Reference

Full dependency tree: See `package.json`

Key licenses:
- Obsidian API: Proprietary (free for plugin use)
- Svelte: MIT
- LangChain: MIT
- Orama: Apache 2.0
- Tailwind CSS: MIT

---

*This specification is a living document and will be updated as development progresses.*
