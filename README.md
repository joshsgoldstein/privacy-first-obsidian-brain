# Smart Second Brain

An intelligent search plugin for Obsidian that uses AI embeddings and vector search to help you find relevant notes using natural language queries.

## Features

### 🔍 **Advanced Search Capabilities**
- **Full-text Search (BM25)**: Fast keyword-based search with intelligent boosting for note titles, paths, and tags
- **Vector Search**: Semantic search using AI embeddings to find conceptually similar content
- **Hybrid Search**: Combines both approaches for the best of both worlds

### 🧠 **Intelligent Indexing**
- Automatically indexes your vault on startup
- Incremental updates when you create, modify, or delete notes
- Smart chunking with overlap for better context preservation
- Caches embeddings to avoid re-processing unchanged documents

### 🎨 **User Interface**
- **Search Modal**: Compact search interface that expands with results
- **Side Panel Icons**:
  - 🧠 Brain icon - Shows indexing status
  - 🔍 Search icon - Opens search modal
- **Live Status Updates**: Real-time indexing progress in settings

### ⚙️ **Flexible Configuration**
- Multiple search modes (fulltext, vector, hybrid)
- Adjustable similarity thresholds
- Configurable chunk sizes
- Support for multiple embedding models
- Dynamic dimension detection from Ollama API

## Prerequisites

- [Ollama](https://ollama.com/) installed and running locally
- An embedding model pulled in Ollama (e.g., `ollama pull snowflake-arctic-embed:335m`)

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
   - Verify Ollama URL (default: http://localhost:11434)
   - Select your embedding model
   - Click "Reload Models" to fetch available models from Ollama

2. **First Index**
   - The plugin will automatically index your vault on first load
   - Watch the status bar for progress (🧠 icon in left sidebar)
   - Indexing time depends on vault size and embedding model speed

3. **Search Your Notes**
   - Click the 🔍 search icon in the sidebar, OR
   - Use Command Palette: "Test Search Query"
   - Type natural language queries like "workflow documentation" or "meeting notes about project"

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

- **Test Search Query**: Opens the search modal
- **Rebuild Vector Store**: Re-indexes all documents from scratch
- **Show Vector Store Info**: Displays index statistics
- **Switch Search Mode to [mode]**: Quickly change search modes
- **Test Provider Connection**: Verify Ollama is working

## Settings

### Provider Settings
- **Ollama URL**: Connection endpoint for Ollama (default: localhost:11434)
- **Embedding Model**: Model used for generating embeddings
- **Generation Model**: Model for future RAG features

### Search Settings
- **Search Mode**: Choose between fulltext, vector, or hybrid
- **Similarity Threshold**: Minimum score for vector search results (0-1)
- **Fulltext Threshold**: Minimum score for BM25 results (0-1)

### Vector Store Management
- **Index Status**: Live document count and indexing state
- **Clear & Rebuild Index**: Deletes vector store and rebuilds from scratch
- **Rebuild Index**: Quick rebuild without clearing

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
- **OllamaProvider**: Local embedding and LLM provider
- Dynamic dimension detection via Ollama API
- Supports multiple embedding models

### Data Flow

1. **Indexing**: Document → Chunking → Embedding → Vector Store → Disk
2. **Search**: Query → Embedding → Vector/BM25 Search → Ranked Results
3. **Updates**: File Change → Re-embed → Update Store → Save

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

- **Obsidian API**: Plugin framework
- **Orama v2.1.1**: Vector and full-text search engine
- **TypeScript**: Type-safe development
- **Ollama**: Local LLM and embedding provider

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

- [ ] RAG-powered Q&A with sources
- [ ] Chat interface for conversational search
- [ ] Support for OpenAI and Anthropic providers
- [ ] Advanced filtering (date ranges, tags, folders)
- [ ] Search history and saved queries
- [ ] Export search results
- [ ] Batch re-indexing optimizations

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
