# Smart Second Brain

An intelligent RAG (Retrieval-Augmented Generation) plugin for Obsidian that transforms your vault into an AI-powered knowledge assistant. Ask questions in natural language and get answers with sources, powered by local or cloud AI models.

## Features

### 💬 **RAG-Powered Q&A**
- **Ask a Question**: Natural language queries with streaming AI answers
- **Source Attribution**: Every answer includes clickable links to source notes
- **Markdown Rendering**: Beautiful formatted answers with headers, lists, code blocks, and more
- **Save to Vault**: Export Q&A sessions as notes in `QnA/` folder with YAML frontmatter
- **Stage-Specific Messages**: Real-time feedback showing search and generation phases

### 🤖 **Multi-Provider AI Support**
- **Ollama (Local)**: Completely offline, privacy-first
  - Models: llama3, mistral, phi, gemma, qwen
  - Embeddings: snowflake-arctic-embed, nomic-embed-text
  - No API key required
- **OpenAI (Cloud)**: Industry-leading models
  - Models: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
  - Embeddings: text-embedding-3-small, text-embedding-3-large
  - Requires API key
- **Anthropic (Cloud)**: Claude models with 200K context
  - Models: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
  - Embeddings: Voyage AI (voyage-2, voyage-large-2)
  - Requires Anthropic + Voyage API keys

### 🔍 **Advanced Search Capabilities**
- **Full-text Search (BM25)**: Fast keyword-based search with intelligent boosting for note titles, paths, and tags
- **Vector Search**: Semantic search using AI embeddings to find conceptually similar content
- **Hybrid Search**: Combines both approaches for the best of both worlds (recommended)

### 🧠 **Intelligent Indexing**
- Automatically indexes your vault on startup
- Incremental updates when you create, modify, or delete notes
- Smart chunking with overlap for better context preservation
- Caches embeddings to avoid re-processing unchanged documents
- Dimension validation prevents mixing incompatible models

### 🎨 **User Interface**
- **RAG Modal**: Beautiful Q&A interface with real-time streaming
  - Fixed question header and button footer
  - Scrollable answer section with markdown rendering
  - Copy to clipboard and save as note buttons
  - Stage indicators (searching → thinking → answering)
- **Search Modal**: Document retrieval interface (testing/debugging)
- **Ribbon Icons**:
  - 🧠 Brain icon - Shows indexing status and document count
  - 🔍 Search icon - Opens vector search modal
- **Live Status Updates**: Real-time indexing progress in settings

### ⚙️ **Flexible Configuration**
- Multiple search modes (fulltext, vector, hybrid)
- Adjustable similarity and fulltext thresholds
- Top-K results configuration (1-20)
- Temperature control for LLM creativity (0-2)
- Provider switching with full settings per provider
- File exclusion patterns (glob-based)

## Prerequisites

Choose **one** of the following:

### Option 1: Local (Privacy-First)
- [Ollama](https://ollama.com/) installed and running locally
- An embedding model: `ollama pull snowflake-arctic-embed:335m`
- A generation model: `ollama pull llama3`

### Option 2: OpenAI
- OpenAI API key from [platform.openai.com](https://platform.openai.com)
- ~$0.03 per 1000 questions (GPT-4o-mini)

### Option 3: Anthropic Claude
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
- Voyage AI API key from [voyageai.com](https://www.voyageai.com)
- ~$0.02 per 1000 questions (Claude Haiku)

## Installation

1. Clone this repository into your vault's plugins folder:
   ```bash
   cd /path/to/vault/.obsidian/plugins/
   git clone <repository-url> smart-second-brain
   cd smart-second-brain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Enable the plugin in Obsidian Settings → Community Plugins

## Quick Start

1. **Initial Setup**
   - Open Settings → Smart Second Brain
   - Select your AI provider (Ollama, OpenAI, or Anthropic)
   - Configure provider settings (URL/API keys)
   - Choose your models (generation + embedding)
   - Click "Test Provider Connection" to verify

2. **First Index**
   - The plugin will automatically index your vault on first load
   - Watch the 🧠 brain icon in left sidebar for progress
   - Indexing time depends on vault size (~10-30 seconds per 100 notes)

3. **Ask Questions**
   - Press `Cmd/Ctrl + P` → "Ask a Question"
   - Type your question: "What are my project goals?"
   - Watch answer stream in with sources
   - Click "💾 Save as Note" to export to `QnA/` folder
   - Click sources to jump to relevant notes

## Search Modes

### Full-text (BM25)
Best for: Exact keyword matching, names, specific terms
- Uses BM25 ranking algorithm
- Boosts matches in note titles (3x), paths (2x), and tags (2x)
- Fast and deterministic

### Vector (Semantic)
Best for: Conceptual searches, finding related content
- Uses AI embeddings to understand meaning
- Finds semantically similar content even without exact keywords
- Example: "project planning" finds notes about "roadmaps" and "milestones"

### Hybrid
Best for: Balanced results combining both approaches
- Combines BM25 and vector search
- Recommended for most use cases
- Configurable similarity and fulltext thresholds

## Commands

### RAG Commands
- **Ask a Question**: Opens RAG modal for natural language Q&A with streaming answers
- **Test Provider Connection**: Verify your AI provider is working correctly

### Search Commands
- **Test Search Query**: Opens vector search modal (for debugging/testing)
- **Switch Search Mode to Full-text (BM25)**: Use keyword search
- **Switch Search Mode to Vector (Semantic)**: Use AI similarity search
- **Switch Search Mode to Hybrid (BM25 + Vector)**: Use both (recommended)

### Index Management
- **Rebuild Vector Store**: Re-indexes all documents (keeps settings)
- **Show Vector Store Info**: Displays document count, dimensions, and stats

## Settings

### Provider Settings
- **Active Provider**: Choose Ollama, OpenAI, or Anthropic
- **Provider-Specific Settings**: Dynamic settings based on selected provider
  - **Ollama**: URL, generation model, embedding model
  - **OpenAI**: API key, generation model, embedding model
  - **Anthropic**: API key, Claude model, Voyage AI key, Voyage embedding model
- **Model Reload**: Fetch available models from provider

### RAG Settings
- **Search Mode**: Choose between fulltext, vector, or hybrid
- **Similarity Threshold**: Minimum score for vector search (0-1, default 0.8)
- **Fulltext Threshold**: Minimum score for BM25 search (0-1, default 0)
- **Top-K Results**: Number of documents to retrieve (1-20, default 5)
- **Temperature**: LLM creativity (0-2, default 0.7)

### Vector Store Management
- **Index Status**: Live document count and indexing state (updates every 2 seconds)
- **Clear & Rebuild Index**: Deletes vector store and rebuilds from scratch
- **Quick Rebuild**: Re-indexes without clearing (faster)

### Advanced
- **Exclude Patterns**: Glob patterns to exclude files (e.g., `Archive/**`)
- **Verbose Logging**: Enable detailed console logs for debugging
- **Incognito Mode**: Force local-only processing (future feature)

## Architecture

### Core Components

**RAGEngine** (`src/core/RAGEngine.ts`)
- Orchestrates the entire indexing and retrieval pipeline
- Manages document loading, embedding generation, and storage
- Handles incremental updates and file watchers

**VectorStore** (`src/core/VectorStore.ts`)
- Built on [Orama](https://docs.orama.com/) for vector and full-text search
- Stores document chunks with embeddings
- Implements hybrid search algorithms
- Auto-detects dimension mismatches

**DocumentLoader** (`src/core/DocumentLoader.ts`)
- Loads markdown files from vault
- Extracts frontmatter, tags, and metadata
- Handles exclusion patterns

**Providers** (`src/providers/`)
- **BaseProvider**: Abstract interface for all providers
- **OllamaProvider**: Local embedding and LLM provider (fully offline)
- **OpenAIProvider**: Cloud-based with GPT models and text-embedding-3
- **AnthropicProvider**: Claude models with Voyage AI embeddings
- Dynamic dimension detection and validation
- Streaming support for real-time responses

### Data Flow

1. **Indexing**: Document → Chunking → Embedding → Vector Store → Disk
2. **Search**: Query → Embedding → Vector/BM25 Search → Ranked Results
3. **RAG Query**: Query → Retrieve Docs → Format Context → LLM Stream → Answer + Sources
4. **Updates**: File Change → Re-embed → Update Store → Auto-save (debounced 30s)

## Development

### Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run lint
```

### Project Structure

```
src/
├── core/
│   ├── RAGEngine.ts          # Main orchestration engine
│   ├── VectorStore.ts        # Vector & full-text search
│   └── DocumentLoader.ts     # Document loading & parsing
├── providers/
│   ├── BaseProvider.ts       # Provider interface
│   ├── OllamaProvider.ts     # Ollama implementation
│   └── index.ts              # Provider factory
├── ui/
│   └── SearchModal.ts        # Search UI component
├── utils/
│   └── chunking.ts           # Text chunking utilities
├── types.ts                  # TypeScript definitions
├── settings.ts               # Settings UI
└── main.ts                   # Plugin entry point
```

### Key Technologies

- **Obsidian API**: Plugin framework and markdown rendering
- **Orama v2.1.1**: Vector and full-text search engine (hybrid search)
- **TypeScript 5.8**: Type-safe development
- **Ollama**: Local LLM and embedding provider (privacy-first)
- **OpenAI API**: Cloud-based GPT models and embeddings
- **Anthropic API**: Claude models for generation
- **Voyage AI**: Embedding service for Anthropic
- **esbuild**: Fast bundling and compilation

## Troubleshooting

### Indexing Issues

**Problem**: "Dimension mismatch" error
**Solution**: Click "Clear & Rebuild Index" in settings. This happens when switching embedding models.

**Problem**: Documents not indexing
**Solution**:
1. Check Ollama is running: `ollama list`
2. Verify embedding model is pulled: `ollama pull snowflake-arctic-embed:335m`
3. Check console (Ctrl+Shift+I) for errors

### Search Issues

**Problem**: No results found
**Solution**:
1. Verify documents are indexed (check status bar)
2. Try different search mode (fulltext works for exact keywords)
3. Lower similarity threshold in settings

**Problem**: Vector search not working
**Solution**:
1. Ensure embedding model is running in Ollama
2. Check console for embedding generation errors
3. Rebuild index to ensure correct dimensions

### Performance

**Problem**: Slow indexing
**Solution**:
- Use smaller/faster embedding model (e.g., `all-minilm`)
- Reduce chunk overlap in code if needed
- Index runs in background, doesn't block Obsidian

**Problem**: Settings slow to load
**Solution**: Settings now load models asynchronously - should be instant

## Roadmap

### Phase 1 - Foundation ✅ COMPLETE
- [x] RAG-powered Q&A with sources
- [x] Streaming answers with markdown rendering
- [x] Multi-provider support (Ollama, OpenAI, Anthropic)
- [x] Save Q&A to vault with YAML frontmatter
- [x] Vector + BM25 + Hybrid search modes
- [x] Real-time indexing with file watchers

### Phase 2 - Enhanced UX (Next)
- [ ] Conversation history (multi-turn chat)
- [ ] Follow-up questions with context
- [ ] Chat threads view/management
- [ ] Improved source display with previews
- [ ] Query suggestions based on vault content

### Phase 3 - Advanced Features
- [ ] Advanced filtering (date ranges, tags, folders)
- [ ] Search history and bookmarked queries
- [ ] Export conversations as markdown
- [ ] Custom system prompts per folder
- [ ] Batch operations and optimizations

### Future Ideas
- [ ] Mobile support (iOS/Android)
- [ ] Graph view integration (show related notes)
- [ ] Voice input for questions
- [ ] Suggested questions based on recent edits
- [ ] Plugin API for extensibility

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- [Obsidian API](https://docs.obsidian.md)
- [Orama](https://docs.orama.com/) - Fast vector and full-text search
- [Ollama](https://ollama.com/) - Local LLM infrastructure

## Support

- Report bugs via GitHub Issues
- Feature requests welcome
- Check console logs for debugging (Ctrl+Shift+I / Cmd+Option+I)
