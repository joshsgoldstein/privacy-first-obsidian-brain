# Smart Second Brain - Product Requirements Document

**Version:** 2.0 (Enhanced Fork)
**Date:** 2026-01-07
**Status:** Phase 1 - Foundation

---

## Executive Summary

An Obsidian plugin that transforms your personal knowledge base into an intelligent AI assistant using Retrieval-Augmented Generation (RAG). This enhanced version builds upon Smart2Brain's foundation while adding extensible architecture and support for multiple AI providers.

### Vision Statement
Enable users to have natural conversations with their notes using local or cloud AI models, with automatic source attribution and a privacy-first approach.

---

## Product Overview

### What It Is
A desktop-only Obsidian plugin that:
- Embeds your vault's markdown files as semantic vectors
- Retrieves contextually relevant notes based on natural language queries
- Uses Large Language Models (LLMs) to generate answers grounded in your knowledge
- Automatically links responses back to source notes
- Supports both offline (local) and online (cloud) AI providers

### What It Is NOT
- Not a replacement for thinking or writing
- Not a cloud-sync service for notes
- Not a general-purpose chatbot (it's grounded in your vault)
- Not an "AI everywhere" solution (intentional, purposeful AI usage)

---

## Target Users

### Primary Personas

1. **Privacy-Conscious Knowledge Worker**
   - Uses Obsidian for personal knowledge management
   - Wants AI assistance but concerned about data privacy
   - Prefers local processing when possible
   - Willing to trade some performance for privacy

2. **Research Professional**
   - Large vault (1000+ notes)
   - Needs to quickly surface relevant information
   - Values accurate source attribution
   - Uses both personal and professional notes

3. **Developer/Technical User**
   - Comfortable with API keys and local model setup
   - Wants extensibility and customization
   - May contribute code or create integrations
   - Values open-source and transparency

### User Needs
- Quick answers without manual searching
- Source attribution for fact-checking
- Privacy control (local vs cloud processing)
- Fast, responsive chat interface
- Minimal setup friction

---

## Core Features

### Phase 1 (Foundation) - CURRENT SCOPE

#### 1. RAG Pipeline
**Description:** Core retrieval and generation system
- Load all markdown files from vault
- Convert documents to embeddings using selected model
- Store embeddings in local vector database
- On query: retrieve similar documents, inject as context for LLM
- Return generated response with source links

**Success Criteria:**
- Retrieves relevant notes 80%+ of the time
- Generates responses within 5 seconds (local) / 3 seconds (cloud)
- Properly attributes sources with clickable links
- Handles vaults up to 10,000 notes

#### 2. Multi-Provider AI Support
**Description:** Extensible architecture for multiple LLM providers

**Phase 1 Providers:**
- **Ollama (Local)**
  - Generation: llama2, mistral, phi, gemma
  - Embedding: nomic-embed-text, mxbai-embed-large
  - Completely offline, no API key required

- **OpenAI (Cloud)**
  - Generation: GPT-3.5-Turbo, GPT-4, GPT-4o
  - Embedding: text-embedding-3-small, text-embedding-3-large
  - Requires API key

- **Anthropic Claude (Cloud)** - NEW
  - Generation: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
  - Embedding: Use OpenAI embeddings (Claude has no embedding API)
  - Requires API key

**Architecture:**
- Provider abstraction layer for easy extension
- Per-provider configuration
- Graceful fallback on provider failure
- Unified interface for all providers

**Success Criteria:**
- Switch providers without re-indexing (when using same embeddings)
- Add new provider in <200 lines of code
- Each provider works independently
- Settings UI supports multiple providers

#### 3. Chat Interface
**Description:** User-facing conversation UI

**Features:**
- Streaming responses (show text as it arrives)
- Message history persistence (save as markdown)
- Edit previous messages
- Regenerate responses
- Copy messages to clipboard
- Obsidian markdown rendering (links, tags, code blocks, etc.)
- Source note previews on hover

**Settings:**
- View mode: Comfy (larger font, spaced) or Compact
- Temperature control for generation
- Similarity threshold for retrieval
- Number of documents to retrieve (k parameter)

**Success Criteria:**
- Responds to 95% of queries without errors
- Renders markdown perfectly
- Sources are clickable and accurate
- Chat history persists across sessions

#### 4. Settings & Configuration
**Description:** User-configurable options

**Core Settings:**
- Provider selection (Ollama, OpenAI, Anthropic)
- Model selection (per provider)
- API keys (secure storage)
- Privacy mode toggle ("Incognito" for local-only)
- File/folder exclusions (wildcard patterns)
- Target folder for saved chats
- RAG parameters (k, similarity threshold, temperature)

**Success Criteria:**
- All settings persist correctly
- API keys stored securely (Obsidian's secure storage)
- Changes take effect without restart
- Clear validation messages for invalid settings

#### 5. Vector Store Management
**Description:** Automatic embedding index maintenance

**Features:**
- Auto-detects vault changes (create, edit, delete, rename)
- Updates embeddings incrementally
- Saves to disk periodically (every 30s with activity)
- Separate stores per embedding model
- Lazy loading on startup

**Storage:**
- Binary `.bin` format for efficiency
- Location: `.obsidian/plugins/smart-second-brain-v2/vectorstores/`
- Excludable from Obsidian Sync

**Success Criteria:**
- Syncs with vault changes within 5 seconds
- Handles 10,000+ notes without lag
- Doesn't block UI during indexing
- Recovers gracefully from corrupted stores

#### 6. Onboarding Experience
**Description:** First-run setup wizard

**Steps:**
1. Welcome screen
2. Choose provider (Ollama or Cloud)
3. If Ollama: detect OS, guide installation
4. If Cloud: collect API key, test connection
5. Select default models
6. Optional: configure exclusions
7. Start initial indexing

**Success Criteria:**
- <5 minutes from install to first chat
- Clear instructions for each OS
- Validates API keys before proceeding
- Shows progress during initial indexing

---

## Technical Architecture

### Tech Stack (Phase 1)

#### Framework & Build
- **Language:** TypeScript 5.2+
- **UI Framework:** Svelte 4.x (reactive components)
- **Build Tool:** Vite 4.x (fast HMR, better than esbuild for Svelte)
- **Bundler:** Rollup (via Vite)
- **CSS Framework:** Tailwind CSS 3.x
- **Package Manager:** npm or bun

**Why Svelte?**
- Reactive state management out of the box
- Compiles to vanilla JS (no runtime overhead)
- Excellent DX with stores for global state
- Small bundle size

**Why Vite?**
- Fast HMR for rapid development
- Better Svelte integration than esbuild
- Modern, well-maintained tooling
- Tree-shaking and optimization built-in

#### AI & RAG Stack
- **LLM Orchestration:** LangChain.js
- **Vector Database:** Orama (in-memory, fast, pure JS)
- **Embeddings:** Provider-dependent (Ollama, OpenAI)
- **HTTP Client:** Built-in fetch (Obsidian API)

**Why LangChain?**
- Standard interface for multiple LLM providers
- Built-in RAG patterns
- Active community and maintenance
- Chain composition for complex workflows

**Why Orama?**
- Pure JavaScript (no WASM/native dependencies)
- Fast in-memory search
- Easy serialization to disk
- Works in Obsidian's constrained environment

#### Core Dependencies
```json
{
  "dependencies": {
    "obsidian": "^1.5.0",
    "svelte": "^4.2.0",
    "langchain": "^0.1.0",
    "@orama/orama": "^2.0.0",
    "nanoid": "^5.0.0",
    "monkey-around": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^8.0.0"
  }
}
```

### Architecture Patterns

#### 1. Plugin Structure
```
smart-second-brain-v2/
├── src/
│   ├── main.ts                      # Plugin entry (extends Plugin)
│   ├── core/
│   │   ├── RAGEngine.ts             # Core RAG orchestration
│   │   ├── VectorStore.ts           # Vector DB management
│   │   └── DocumentLoader.ts        # Vault file loading
│   ├── providers/
│   │   ├── BaseProvider.ts          # Abstract provider interface
│   │   ├── OllamaProvider.ts        # Ollama implementation
│   │   ├── OpenAIProvider.ts        # OpenAI implementation
│   │   └── AnthropicProvider.ts     # Anthropic implementation
│   ├── components/
│   │   ├── Chat/                    # Chat UI components
│   │   ├── Settings/                # Settings UI
│   │   ├── Onboarding/              # Setup wizard
│   │   └── base/                    # Reusable components
│   ├── views/
│   │   ├── ChatView.ts              # Custom TextFileView
│   │   └── OnboardingView.ts        # Setup view
│   ├── stores/
│   │   ├── settings.ts              # Settings store
│   │   ├── chat.ts                  # Chat history store
│   │   └── indexing.ts              # Indexing state store
│   └── types/
│       └── index.ts                 # TypeScript types
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

#### 2. Provider Abstraction
```typescript
interface LLMProvider {
  name: string;
  type: 'local' | 'cloud';

  // Generation
  generateStream(prompt: string, context: string[]): AsyncGenerator<string>;
  generate(prompt: string, context: string[]): Promise<string>;

  // Configuration
  configure(config: ProviderConfig): void;
  validate(): Promise<boolean>;

  // Models
  listModels(): Promise<Model[]>;
  getDefaultModel(): Model;
}

interface EmbeddingProvider {
  name: string;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}
```

#### 3. State Management
```typescript
// Svelte stores for reactive state
export const settingsStore = writable<Settings>({...});
export const chatHistoryStore = writable<Message[]>([]);
export const indexingStateStore = writable<IndexingState>({
  status: 'idle',
  progress: 0,
  total: 0,
  currentFile: null
});
```

#### 4. Event-Driven Updates
```typescript
// Listen to vault changes
this.registerEvent(
  this.app.vault.on('modify', (file) => {
    if (file instanceof TFile && file.extension === 'md') {
      this.ragEngine.updateDocument(file);
    }
  })
);
```

---

## Data Model

### Chat Message Format
```typescript
interface Message {
  id: string;           // nanoid
  role: 'user' | 'assistant';
  content: string;      // Markdown
  sources?: Source[];   // Only for assistant messages
  timestamp: number;
  model?: string;       // Which model generated this
}

interface Source {
  file: string;         // File path
  score: number;        // Similarity score
  snippet: string;      // Relevant excerpt
}
```

### Stored Chat File Format (Markdown)
```markdown
user
What is the Document Assembly Agent pattern?
- - - - -

assistant
Based on your notes, the Document Assembly Agent is a specialized agent that...

**Sources:**
- [[Raw future state notes]]
- [[Taxonomy]]

- - - - -

user
Tell me more about avoiding over-agenting
- - - - -
```

### Vector Store Schema
```typescript
interface VectorDocument {
  id: string;           // File path
  content: string;      // File content
  embedding: number[];  // Vector embedding
  metadata: {
    path: string;
    mtime: number;      // Last modified time
    tags?: string[];
    frontmatter?: Record<string, any>;
  };
}
```

### Settings Schema
```typescript
interface Settings {
  // Provider
  activeProvider: 'ollama' | 'openai' | 'anthropic';

  // Ollama
  ollamaUrl: string;
  ollamaModel: string;
  ollamaEmbeddingModel: string;

  // OpenAI
  openaiApiKey: string;
  openaiModel: string;
  openaiEmbeddingModel: string;

  // Anthropic
  anthropicApiKey: string;
  anthropicModel: string;

  // RAG
  similarityThreshold: number;
  topK: number;
  temperature: number;

  // UI
  viewMode: 'comfy' | 'compact';
  chatFolder: string;

  // Privacy
  incognitoMode: boolean;

  // Exclusions
  excludePatterns: string[];

  // Advanced
  verboseLogging: boolean;
}
```

---

## User Experience

### Primary User Flow

1. **Installation**
   - Install from Obsidian Community Plugins
   - Plugin detects first run
   - Opens onboarding wizard

2. **Onboarding**
   - Choose Ollama (local) or Cloud (OpenAI/Anthropic)
   - Follow provider-specific setup
   - Configure basic settings
   - Start initial indexing (shows progress)

3. **First Chat**
   - Click ribbon icon or use command palette
   - Opens chat view in new pane
   - Type question about notes
   - See streaming response with sources

4. **Ongoing Usage**
   - Plugin auto-updates index as notes change
   - Save chat histories to vault
   - Switch models/providers as needed
   - Adjust settings to refine results

### Key Interactions

**Starting a Chat:**
- Ribbon icon: Brain emoji (🧠)
- Command: "Smart Second Brain: New Chat"
- Shortcut: Configurable (default: Cmd/Ctrl+Shift+B)

**Asking Questions:**
- Type in input field at bottom
- Press Enter or click Send
- Response streams in real-time
- Sources appear as links below response

**Viewing Sources:**
- Click source link to open note
- Hover to see preview (future enhancement)
- Similarity score shown as percentage

**Managing Chats:**
- Auto-saved every 30 seconds
- Stored as markdown in configured folder
- Can edit/delete like any note
- Open existing chats with ChatView

**Switching Providers:**
- Go to Settings → Provider
- Select different provider
- Configure if needed
- No re-indexing required (if same embeddings)

---

## Non-Functional Requirements

### Performance
- Initial indexing: <1 second per note
- Query latency: <3 seconds (cloud), <5 seconds (local)
- Embedding update: <500ms per modified note
- UI responsiveness: <100ms for all interactions
- Memory usage: <500MB for 10,000 notes

### Scalability
- Support vaults up to 10,000 notes
- Handle notes up to 50,000 words
- Graceful degradation beyond limits
- Background indexing for large vaults

### Reliability
- 99% query success rate
- Automatic recovery from provider failures
- Corrupt vector store detection and rebuild
- No data loss on plugin crashes

### Security & Privacy
- API keys stored in Obsidian's secure storage
- No telemetry or external calls (except to chosen provider)
- Clear indication when data leaves device
- Incognito mode enforces local-only processing

### Compatibility
- Obsidian Desktop 1.5.0+
- Windows, macOS, Linux
- No mobile support (phase 1)

### Accessibility
- Keyboard navigation for all features
- ARIA labels for screen readers
- Respects system theme (dark/light)
- Configurable font sizes

---

## Success Metrics

### Phase 1 Goals

**Adoption Metrics:**
- 100+ installs in first month
- 70%+ retention after 1 week
- 50%+ retention after 1 month

**Quality Metrics:**
- <5% error rate in production
- 80%+ relevant results in user testing
- <3 bugs reported per 100 users
- 4+ star average rating

**Performance Metrics:**
- <3s average query time (cloud)
- <5s average query time (local)
- <10s initial load time
- <1s embedding update time

**Engagement Metrics:**
- 5+ queries per active user per day
- 60%+ of users save chat histories
- 30%+ of users try both local and cloud

---

## Multi-Phase Roadmap

### Phase 1: Foundation (Current Scope)
**Goal:** Basic RAG with direct API calls
- ✅ Core RAG pipeline (embed → search → generate)
- ✅ Multi-provider support (Ollama, OpenAI, Anthropic)
- ✅ Chat interface with streaming
- ✅ Vector store with auto-sync
- ✅ Settings and configuration
- ✅ Direct API calls (no frameworks)

**Tech:** Vanilla TypeScript, Orama, fetch API

### Phase 2: LLM Framework Integration
**Goal:** Add LangChain.js for better abstractions
- 🔄 Replace direct API calls with LangChain
- 🔄 Better prompt management
- 🔄 Built-in retry logic and error handling
- 🔄 Memory management (conversation history)
- 🔄 Chain composition for complex queries
- 🔄 Easier to add new providers

**Tech:** + LangChain.js

**Why later:**
- Phase 1 teaches RAG fundamentals
- LangChain adds abstraction we don't need yet
- Can migrate incrementally (interfaces compatible)

### Phase 3: Agent Workflows (LangGraph)
**Goal:** Multi-agent coordination
- 🔄 Document Assembly Agent
- 🔄 Agent taxonomy and routing
- 🔄 Agents that call other agents
- 🔄 Conditional workflows (if/else logic)
- 🔄 Avoid over-agenting (proper guardrails)
- 🔄 State machines for complex tasks

**Tech:** + LangGraph.js

**Why later:**
- Requires Phase 2 foundation (LangChain)
- Phase 1 is single-agent only
- Need to understand basic RAG before multi-agent

### Phase 4: UX Enhancements & Power Features
- 🔄 **Toggle RAG on/off per message** - Quick toggle in chat input to ask LLM directly (no note retrieval)
- 🔄 **Save response as note** - One-click to save assistant response as new markdown file
- 🔄 **Response actions toolbar** - Copy, save, regenerate, edit buttons per message
- 🔄 **Source preview on hover** - Quick peek at source notes without opening
- 🔄 **Chat templates** - Pre-configured prompts for common tasks
- 🔄 **Conversation branching** - Fork conversations at any point
- 🔄 **Export chat as markdown** - Save entire conversation with sources

**Why Phase 4:**
- Phase 1-3 focuses on core RAG functionality
- These are UX refinements that enhance existing features
- User feedback from Phase 1-3 will guide prioritization

### Phase 5: Multi-Modal & Advanced Features
- 🔄 Image/PDF support in RAG
- 🔄 Web search integration
- 🔄 Custom embedding models
- 🔄 Advanced memory and personalization

### Phase 6: Platform Expansion
- 🔄 Mobile support (iOS/Android)
- 🔄 Browser extension
- 🔄 API for external tools
- 🔄 Collaborative features

---

## Out of Scope (All Phases)

**Never planned:**
- Cloud hosting of user data
- Subscription/paid tiers
- Telemetry (beyond optional anonymous stats)
- Training custom models
- Commercial model hosting

---

## Risk Assessment

### Technical Risks

**Risk:** Vector store corruption
- **Mitigation:** Automatic backups, rebuild capability
- **Severity:** Medium
- **Likelihood:** Low

**Risk:** Provider API changes
- **Mitigation:** Version pinning, abstraction layer
- **Severity:** High
- **Likelihood:** Medium

**Risk:** Obsidian API changes
- **Mitigation:** Follow best practices, stay updated
- **Severity:** High
- **Likelihood:** Low

**Risk:** Performance degradation on large vaults
- **Mitigation:** Lazy loading, chunking, progress indicators
- **Severity:** Medium
- **Likelihood:** Medium

### User Experience Risks

**Risk:** Setup too complex (especially Ollama)
- **Mitigation:** Detailed onboarding, OS detection, clear instructions
- **Severity:** High
- **Likelihood:** High

**Risk:** Poor result quality
- **Mitigation:** Tunable parameters, model selection, user feedback
- **Severity:** High
- **Likelihood:** Medium

**Risk:** Privacy concerns
- **Mitigation:** Clear labeling, incognito mode, local-first option
- **Severity:** Medium
- **Likelihood:** Low

---

## Open Questions

1. Should we support custom system prompts in Phase 1?
2. How do we handle very large notes (>50k words)?
3. Should chats be searchable in Obsidian's global search?
4. Do we need rate limiting for cloud providers?
5. Should we show token usage/costs for cloud providers?
6. How do we handle frontmatter in embeddings?
7. Should we support conversation branching?

---

## Appendix

### Competitive Analysis

**Smart Connections:**
- Proprietary core
- Expensive for Ollama support
- Less customizable
- Established user base

**Smart2Brain (Original):**
- Open source
- Good UX
- Limited to Ollama + OpenAI
- Not actively maintained

**Our Advantage:**
- Extensible provider architecture
- Anthropic Claude support
- Cleaner codebase
- Active development
- Future agent workflows

### References
- LangChain.js: https://js.langchain.com/
- Orama: https://docs.oramasearch.com/
- Obsidian API: https://docs.obsidian.md/
- Ollama: https://ollama.ai/
- OpenAI: https://platform.openai.com/
- Anthropic: https://docs.anthropic.com/
