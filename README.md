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

## First time developing plugins?

Quick starting guide for new plugin devs:

- Check if [someone already developed a plugin for what you want](https://obsidian.md/plugins)! There might be an existing plugin similar enough that you can partner up with.
- Make a copy of this repo as a template with the "Use this template" button (login to GitHub if you don't see it).
- Clone your repo to a local development folder. For convenience, you can place this folder in your `.obsidian/plugins/your-plugin-name` folder.
- Install NodeJS, then run `npm i` in the command line under your repo folder.
- Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of your plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- This project already has eslint preconfigured, you can invoke a check by running`npm run lint`
- Together with a custom eslint [plugin](https://github.com/obsidianmd/eslint-plugin) for Obsidan specific code guidelines.
- A GitHub action is preconfigured to automatically lint every commit on all branches.

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://docs.obsidian.md
