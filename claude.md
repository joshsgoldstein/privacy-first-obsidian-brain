# Claude Context - Smart Second Brain Plugin

**Date:** 2026-01-12
**Working Directory:** `/Users/joshgoldstein/Documents/lab/notes-meeting-agent/test-vault/.obsidian/plugins/obsidian-sample-plugin`
**Plugin Name:** Smart Second Brain
**Version:** 1.3.0

---

## Project Overview

A production-ready RAG (Retrieval-Augmented Generation) plugin for Obsidian that transforms your vault into an AI-powered knowledge assistant. Built from the Obsidian sample plugin template.

### Core Features
- **Multi-turn Chat Interface** - Persistent sidebar with conversation history
- **Hybrid Search** - Combines BM25 keyword search with vector embeddings
- **Multi-Provider Support** - Ollama (local), OpenAI, Anthropic
- **Custom Prompts** - Markdown templates in `Prompts/` folder at vault root
- **Automatic Indexing** - Incremental updates with file watchers
- **Vector Store Persistence** - Saves to disk for instant reload
- **LLM Observability** - Optional Opik tracing integration

---

## Recent Session (2026-01-12)

### Issues Fixed
1. **Prompt files being indexed** - Added `Prompts/**` to default exclusions with migration
2. **CSS breaking on reload** - Root caused to wrong styles.css being copied (Svelte CSS from different plugin)
3. **Vectorstore not saving** - Fixed path resolution and added mkdir for missing directories
4. **Plugin path confusion** - Folder named `obsidian-sample-plugin` but manifest ID `smart-second-brain`
5. **Double path bug** - Was constructing `.obsidian/plugins/.obsidian/plugins/` instead of `.obsidian/plugins/`
6. **SearchModal different results** - Now uses same config as RAG (topK, mode, thresholds, weights)

### Features Added
1. **Hybrid Search Weights** - Tunable balance between keyword (BM25) and semantic (vector) search
   - Settings: `hybridTextWeight` (default 0.8) and `hybridVectorWeight` (default 0.2)
   - UI sliders auto-balance to sum to 1.0
   - Passed to Orama as `hybridWeights: { text, vector }`

2. **Enhanced Search Logging** - Detailed console output showing:
   - Search mode, query, k value
   - Options passed (thresholds, weights)
   - Raw Orama results vs final documents
   - Top 3 results with paths and scores

3. **Prompt Template System** - Moved to visible `Prompts/` folder in vault root
   - PromptManager loads markdown with YAML frontmatter
   - Variable substitution: `{context}`, `{question}`, `{history}`, `{date}`, `{vault}`
   - Hot reload - changes apply immediately
   - Edit button in settings opens active prompt

4. **Settings Migration** - Auto-adds `.obsidian/**` and `Prompts/**` to exclusions on load

### Architecture Improvements
- **Path Resolution** - Now uses `manifest.dir || manifest.id` dynamically
- **Directory Creation** - VectorStore.save() creates parent dir if missing
- **SearchModal Sync** - Uses same settings as RAG for consistent behavior
- **Better Error Handling** - mkdir failures, save errors now show user notices

---

## Current State

### Git Status
```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

### Latest Commits
```
3e6a8fc Fix double path bug in plugin directory resolution
b46cf9d Sync SearchModal with RAG search config and add detailed logging
17b923c Add hybrid search weights and fix vectorstore saving
164a78d added prompt templates
```

### File Structure
```
src/
├── core/
│   ├── RAGEngine.ts          # Main orchestrator (query, indexing, file watchers)
│   ├── VectorStore.ts        # Orama database (hybrid search, save/load)
│   └── DocumentLoader.ts     # Loads markdown with frontmatter
├── providers/
│   ├── OllamaProvider.ts     # Local Ollama (embeddings + LLM)
│   ├── OpenAIProvider.ts     # OpenAI API
│   └── AnthropicProvider.ts  # Claude + Voyage embeddings
├── prompts/
│   └── PromptManager.ts      # Loads markdown templates from Prompts/
├── tracers/
│   ├── BaseTracer.ts         # Observability interface
│   └── OpikTracer.ts         # Opik integration
├── ui/
│   ├── ChatView.ts           # Sidebar chat interface
│   └── SearchModal.ts        # Debug search modal
├── utils/
│   └── chunking.ts           # Document splitting
├── types/
│   └── index.ts              # TypeScript definitions
├── main.ts                   # Plugin entry point
└── settings.ts               # Settings UI
```

---

## Key Implementation Details

### Hybrid Search (VectorStore.ts:296)
```typescript
await oramaSearch(db, {
  mode: 'hybrid',
  term: query,                    // BM25 keyword search
  vector: { embedding },          // Semantic similarity
  properties: ['content', 'path', 'noteName', 'tags'],
  boost: {
    noteName: 3,  // Title matches weighted 3x
    path: 2,
    tags: 2,
    content: 1
  },
  hybridWeights: {
    text: settings.hybridTextWeight,    // Default 0.8
    vector: settings.hybridVectorWeight  // Default 0.2
  },
  limit: topK
})
```

### Path Resolution Pattern
```typescript
// configDir is already .obsidian
const pluginFolderName = this.manifest.dir || this.manifest.id;
const pluginDir = `${this.app.vault.configDir}/plugins/${pluginFolderName}`;
```

### Prompt Template Format
```markdown
---
name: Default RAG Assistant
type: rag
description: Helpful assistant
variables: [context, question, history, date, vault]
---

You are a helpful assistant that answers questions based ONLY on the user's notes.

Context from your notes:
{context}

Question: {question}

Answer:
```

---

## Known Issues / Tech Debt

None currently! All major issues fixed this session.

---

## Next Steps (Discussed but not implemented)

### RAG Customization Ideas
1. **Better keyword matching** - Case sensitivity, stemming, fuzzy matching
2. **More relevant results** - Re-ranking, MMR for diversity, filtering
3. **Search specific fields** - Dates, folders, tags, frontmatter queries
4. **Multiple search strategies** - Ensemble retrieval, query expansion
5. **Query understanding** - Entity extraction, intent detection

### Search Architecture
Currently: `Question → Hybrid Search → Top-K → Context → LLM`

Possible expansions:
- Query rewriting/expansion
- Multi-query strategies
- Hierarchical retrieval (summaries → drill down)
- Custom scoring functions
- MMR for diverse results
- Date/metadata filtering

---

## Development Setup

### Build Commands
```bash
npm run dev        # Watch mode with esbuild
npm run build      # Production build
npm run lint       # ESLint check
```

### Testing in Multiple Vaults
- **Dev vault**: `/Users/.../test-vault/.obsidian/plugins/obsidian-sample-plugin/`
- **Notes vault**: `/Users/.../Notes/.obsidian/plugins/smart-second-brain/`

Copy built files:
```bash
cp main.js manifest.json styles.css "/path/to/vault/.obsidian/plugins/smart-second-brain/"
```

### Hot Reload
Uses `hot-reload` plugin in dev vault - automatically reloads on file changes

---

## Documentation

- **README.md** - User-facing documentation (features, settings, architecture)
- **AGENTS.md** - Guide for building custom agents
- **DEPENDENCIES.md** - Dependency overview
- **FEATURE_IDEAS.md** - Future feature brainstorming

All docs are up to date as of 2026-01-12.

---

## User Configuration

### Current Settings (data.json)
```json
{
  "activeProvider": "ollama",
  "ollamaUrl": "http://192.168.1.177:11434",
  "ollamaModel": "qwen3:0.6b",
  "ollamaEmbeddingModel": "snowflake-arctic-embed:335m",
  "searchMode": "hybrid",
  "topK": 7,
  "temperature": 0,
  "hybridTextWeight": 0.95,
  "hybridVectorWeight": 0.05,
  "excludePatterns": [
    "Archive/**",
    "Templates/**",
    ".obsidian/**",
    "Prompts/**"
  ],
  "verboseLogging": true,
  "opikEnabled": false
}
```

User is a search SME and knows what they're doing with the weight tuning (heavily favoring keyword matches).

---

## Session Summary

Successfully fixed all major bugs related to:
- Path resolution in multi-vault setup
- Vectorstore persistence
- Settings consistency across UI components
- Prompt template management

Added powerful hybrid search tuning capabilities. Plugin is now production-ready and deployed to both vaults.
