# 🧠 Smart Second Brain

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Transform your Obsidian vault into an AI-powered knowledge assistant. Ask questions in natural language and get answers with sources, powered by **local or cloud AI models**.

**Privacy-first by design** – Works 100% offline with Ollama (no data leaves your machine), or connect to OpenAI/Anthropic for enhanced capabilities.

---

## 📑 Table of Contents

- [✨ What is Smart Second Brain?](#-what-is-smart-second-brain)
- [🎯 Key Features](#-key-features)
- [🖼️ Screenshots](#️-screenshots)
- [🔒 Privacy & Security](#-privacy--security)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [🔍 Search Modes Explained](#-search-modes-explained)
- [⚙️ Settings Guide](#️-settings-guide)
- [💬 Using the Chat Interface](#-using-the-chat-interface)
- [📝 Custom Prompt Templates](#-custom-prompt-templates)
- [🛠️ Commands Reference](#️-commands-reference)
- [🏗️ Architecture](#️-architecture)
- [🐛 Troubleshooting](#-troubleshooting)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [💖 Support](#-support)

---

## ✨ What is Smart Second Brain?

Smart Second Brain is a **RAG (Retrieval-Augmented Generation)** plugin that gives your Obsidian vault a memory. Instead of manually searching through hundreds of notes, just ask questions like:

- *"What are my project goals for Q1?"*
- *"What did I learn about machine learning?"*
- *"Summarize my meeting notes from last week"*

The plugin searches your vault, retrieves relevant context, and uses AI to generate answers **with clickable source citations**.

**Why use this plugin?**
- 🔍 **Smart Search**: Combines keyword (BM25) + semantic (vector) search
- 💬 **Natural Conversation**: Multi-turn chat with full conversation history
- 🔗 **Source Attribution**: Every answer includes clickable links to source notes
- 🏠 **Privacy Options**: 100% local with Ollama, or cloud with OpenAI/Anthropic
- 💾 **Auto-Save**: Conversations and responses save automatically to your vault
- 🎨 **Beautiful UI**: Persistent sidebar chat that stays open while you work

---

## 🎯 Key Features

### 💬 Interactive Chat Interface
- **Persistent Chat Sidebar** – Side-by-side chat window that stays open while you work
- **Multi-Turn Conversations** – Full conversation history with context awareness
- **RAG Toggle** – 🐙 octopus button to turn note search on/off (chat with or without your knowledge base)
- **Save & Load Chats** – Automatically saves to `Chats/` folder, reload anytime
- **Save Individual Responses** – 💾 button on each message to extract as standalone note
- **Live Stats** – See document count, AI provider, and search mode in chat header
- **Streaming Responses** – Watch answers appear in real-time with markdown formatting
- **Source Attribution** – Clickable links to source notes with relevance scores

### 🤖 Multi-Provider AI Support

#### 🏠 Ollama (Local - Privacy-First)
- **Completely offline** – No data leaves your machine
- **Free forever** – No API costs
- **Models**: llama3, mistral, phi, gemma, qwen
- **Embeddings**: snowflake-arctic-embed, nomic-embed-text
- **No API key required**

#### ☁️ OpenAI (Cloud)
- **Industry-leading models** – GPT-4o, GPT-4 Turbo, GPT-3.5
- **Embeddings**: text-embedding-3-small, text-embedding-3-large
- **Cost**: ~$0.03 per 1000 questions (GPT-4o-mini)
- **Requires**: API key from [platform.openai.com](https://platform.openai.com)

#### 🧬 Anthropic (Cloud)
- **Claude models** – Claude 3.5 Sonnet, Opus, Haiku
- **200K context window** – Handle large conversations
- **Embeddings**: Voyage AI (voyage-2, voyage-large-2)
- **Cost**: ~$0.02 per 1000 questions (Claude Haiku)
- **Requires**: Anthropic + Voyage API keys

### 🔍 Advanced Search Capabilities

| Search Mode | Best For | How It Works |
|-------------|----------|--------------|
| **Full-text (BM25)** | Exact keywords, names, specific terms | Fast keyword matching with intelligent boosting for titles, paths, tags |
| **Vector (Semantic)** | Conceptual searches, related content | AI embeddings find semantically similar content without exact keywords |
| **Hybrid** ⭐ | Balanced results (recommended) | Combines both approaches for best of both worlds |

### 🧠 Intelligent Indexing
- **Automatic Indexing** – Indexes vault on startup (or loads from disk if cached)
- **Vector Store Persistence** – Index saves to disk, loads instantly on restart
- **Incremental Updates** – Only re-indexes files that changed (mtime checking)
- **Smart Chunking** – Overlapping chunks for better context preservation
- **File Watchers** – Auto-updates when you create, modify, rename, or delete notes
- **Dimension Validation** – Prevents mixing incompatible embedding models

### 📝 Custom Prompt Templates
- **Visible Prompts Folder** – `Prompts/` folder created at vault root for easy editing
- **3 Built-in Templates** – Default, Technical, and Creative assistant modes
- **Edit in Obsidian** – Click "Edit in Obsidian" button in settings
- **Variable Substitution** – Use `{context}`, `{question}`, `{history}`, `{date}`, `{vault}`
- **Version Control** – Markdown files work with Git
- **Hot Reload** – Changes take effect immediately

### ⚙️ Flexible Configuration
- Multiple search modes (fulltext, vector, hybrid)
- Adjustable similarity and fulltext thresholds
- Top-K results configuration (1-20)
- Temperature control for LLM creativity (0-2)
- Provider switching with full settings per provider
- File exclusion patterns (glob-based)

---

## 🖼️ Screenshots

> **Note for maintainers**: Add screenshots here showing:
> 1. Chat sidebar interface with a conversation
> 2. RAG toggle and control buttons in action
> 3. Search results with source citations
> 4. Settings panel with provider configuration
> 5. Prompt template editing in Obsidian

*Screenshots coming soon! The plugin features:*
- 💬 Persistent chat sidebar with streaming responses
- 🎛️ Control buttons (New, Load, Save, RAG toggle, Delete)
- 📊 Live stats display (doc count, provider, search mode)
- 🔗 Clickable source citations with relevance scores
- ⚙️ Comprehensive settings panel with live preview

---

## 🔒 Privacy & Security

### Privacy-First Design

**Local-Only Option (Ollama)**
- ✅ **100% offline** – All processing happens on your machine
- ✅ **Zero telemetry** – No usage tracking or analytics
- ✅ **Your data stays local** – Notes never leave your computer
- ✅ **No accounts required** – No sign-ups, no subscriptions

**Cloud Providers (OpenAI/Anthropic)**
- ⚠️ **Query data sent to provider** – Your questions and retrieved note excerpts are sent via API
- ⚠️ **API key required** – Store securely in Obsidian settings (encrypted)
- ✅ **No full vault upload** – Only relevant chunks sent as context
- ✅ **Exclude sensitive files** – Use exclusion patterns for private notes

### Security Features
- **File Exclusions** – Exclude sensitive folders (e.g., `Archive/**`, `Private/**`)
- **Local Vector Store** – Your document index stays on disk, never uploaded
- **Configurable Context** – Control how many documents are sent with each query
- **No Third-Party Analytics** – This plugin doesn't collect or send usage data

**Recommendation**: Use **Ollama** for sensitive/private vaults. Use cloud providers for general knowledge bases where convenience outweighs privacy concerns.

---

## 📦 Installation

### Prerequisites

Choose **one** of the following AI providers:

<details>
<summary><b>Option 1: Ollama (Local - Recommended for Privacy)</b></summary>

1. Install [Ollama](https://ollama.com/) for your platform
2. Pull an embedding model:
   ```bash
   ollama pull snowflake-arctic-embed:335m
   ```
3. Pull a generation model:
   ```bash
   ollama pull llama3
   ```
4. Verify Ollama is running:
   ```bash
   ollama list
   ```

</details>

<details>
<summary><b>Option 2: OpenAI (Cloud)</b></summary>

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Add credits to your account (~$5 recommended)
3. Keep your API key handy for plugin setup

**Cost**: ~$0.03 per 1000 questions with GPT-4o-mini

</details>

<details>
<summary><b>Option 3: Anthropic Claude (Cloud)</b></summary>

1. Get Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Get Voyage AI API key from [voyageai.com](https://www.voyageai.com) (for embeddings)
3. Add credits to both accounts
4. Keep both API keys handy

**Cost**: ~$0.02 per 1000 questions with Claude Haiku

</details>

### Plugin Installation

**Method 1: Manual Install (Current)**

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

4. Enable in Obsidian:
   - Open **Settings → Community Plugins**
   - Turn off **Restricted mode** (if enabled)
   - Click **Reload** or restart Obsidian
   - Enable **Smart Second Brain**

**Method 2: Community Plugin (Coming Soon)**

Once published in the Obsidian Community Plugins directory:
1. Open **Settings → Community Plugins → Browse**
2. Search for "Smart Second Brain"
3. Click **Install** → **Enable**

---

## 🚀 Quick Start

### Step 1: Configure Your AI Provider

1. Open **Settings → Smart Second Brain**
2. Under **Provider Settings**, select your AI provider:
   - 🏠 **Ollama** (local, privacy-first)
   - ☁️ **OpenAI** (cloud, GPT models)
   - 🧬 **Anthropic** (cloud, Claude models)
3. Configure provider-specific settings:
   - **Ollama**: Verify URL (default: `http://localhost:11434`)
   - **OpenAI**: Enter API key
   - **Anthropic**: Enter Anthropic + Voyage API keys
4. Choose your models:
   - **Generation model** (e.g., `llama3`, `gpt-4o`, `claude-3-5-sonnet`)
   - **Embedding model** (e.g., `snowflake-arctic-embed:335m`, `text-embedding-3-small`, `voyage-2`)
5. Click **"Test Provider Connection"** to verify ✅

### Step 2: Let the Plugin Index Your Vault

- The plugin automatically indexes your vault on first load
- Watch the 🧠 **brain icon** in the status bar for progress
- Indexing time: ~10-30 seconds per 100 notes
- The index saves to disk and loads instantly on future restarts

### Step 3: Start Chatting!

1. Click the 💬 **Chat icon** in the left ribbon
2. A chat sidebar opens next to your notes
3. Type a question: *"What are my project goals?"*
4. Watch the answer stream in with sources
5. Click source links to jump to relevant notes
6. Continue the conversation – context is preserved!

**Pro Tips:**
- 🐙 Toggle the **octopus button** to disable RAG (chat without searching notes)
- 💾 Click **Save** on any response to extract it as a standalone note
- 📂 Click **Load** to restore previous conversations from `Chats/` folder
- 🆕 Click **New** to start a fresh conversation

### Step 4: Customize (Optional)

- **Change search mode**: Settings → RAG Settings → Search Mode
- **Adjust creativity**: Settings → RAG Settings → Temperature (0 = precise, 2 = creative)
- **Edit prompts**: Settings → System Prompts → Click "Edit in Obsidian"
- **Exclude files**: Settings → Advanced → Exclude Patterns (e.g., `Archive/**`)

---

## 🔍 Search Modes Explained

The plugin offers three search approaches. You can switch between them in **Settings → RAG Settings → Search Mode**.

### 🔤 Full-text Search (BM25)

**Best for:** Finding exact keywords, names, specific terms

**How it works:**
- Uses the BM25 ranking algorithm (industry-standard for keyword search)
- Boosts matches in:
  - Note **titles** (3x weight)
  - Note **paths** (2x weight)
  - **Tags** (2x weight)
- Fast and deterministic (same query = same results)

**Example:** Searching for "Docker" finds notes containing that exact word, especially if it's in the title or tags.

**When to use:**
- ✅ Searching for technical terms, product names, or acronyms
- ✅ Looking for specific phrases or quotes
- ✅ When you know the exact wording

---

### 🧠 Vector Search (Semantic)

**Best for:** Conceptual searches, finding related content without exact keywords

**How it works:**
- Converts your query into an AI embedding (numerical representation of meaning)
- Compares against embeddings of all note chunks
- Finds semantically similar content even without keyword matches

**Example:** Searching for "project planning" can find notes about "roadmaps," "milestones," "sprints," and "quarterly goals" even if they never use the words "project planning."

**When to use:**
- ✅ Exploring concepts and themes
- ✅ Finding related notes you might not remember the exact wording of
- ✅ When synonyms and paraphrases are important
- ✅ Research and idea discovery

---

### ⚡ Hybrid Search (Recommended)

**Best for:** Balanced results combining precision + discovery

**How it works:**
- Runs both BM25 and vector search in parallel
- Combines results using configurable weights
- Default: 80% keyword, 20% semantic (adjustable in settings)

**Example:** Searching for "machine learning pipeline" finds:
- Notes with exact phrase "machine learning pipeline" (high keyword score)
- Notes about "ML workflows" and "model training" (high semantic score)
- Balanced ranking considers both relevance signals

**When to use:**
- ✅ **Most use cases** (recommended default)
- ✅ When you want both precision and recall
- ✅ When you're not sure which search type is better

**Customization:**
- Adjust weights in **Settings → RAG Settings → Hybrid Search Weights**
- **Keyword Weight** (0-1): Higher = prioritize exact matches
- **Vector Weight** (0-1): Higher = prioritize meaning
- Weights auto-balance to sum to 1.0

---

## ⚙️ Settings Guide

### 🤖 Provider Settings

| Setting | Description |
|---------|-------------|
| **Active Provider** | Choose: Ollama (local), OpenAI, or Anthropic |
| **Ollama URL** | Default: `http://localhost:11434` |
| **API Keys** | OpenAI key or Anthropic + Voyage keys |
| **Generation Model** | LLM for generating answers (e.g., `llama3`, `gpt-4o`, `claude-3-5-sonnet`) |
| **Embedding Model** | Model for semantic search (e.g., `snowflake-arctic-embed:335m`, `text-embedding-3-small`) |
| **Test Connection** | Button to verify provider is working |

### 🔍 RAG Settings

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| **Search Mode** | fulltext / vector / hybrid | hybrid | How to search your notes |
| **Similarity Threshold** | 0-1 | 0.8 | Minimum score for vector search (lower = more results) |
| **Fulltext Threshold** | 0-1 | 0.0 | Minimum score for BM25 search |
| **Top-K Results** | 1-20 | 5 | Number of documents to retrieve per query |
| **Temperature** | 0-2 | 0.7 | LLM creativity (0 = precise, 2 = creative) |

**Hybrid Search Weights** (only shown when Search Mode = hybrid):

| Weight | Range | Default | Description |
|--------|-------|---------|-------------|
| **Keyword Weight** | 0-1 | 0.8 | Balance for BM25 keyword matching (higher = prioritize exact words) |
| **Vector Weight** | 0-1 | 0.2 | Balance for semantic similarity (higher = prioritize meaning) |

*Weights auto-balance to sum to 1.0*

### 🗂️ Vector Store Management

| Setting | Description |
|---------|-------------|
| **Index Status** | Live document count (updates every 2 seconds) |
| **Clear & Rebuild Index** | Deletes vector store and rebuilds from scratch (use when switching embedding models) |
| **Quick Rebuild** | Re-indexes without clearing (faster, use after adding many notes) |

### 📝 System Prompts

| Setting | Description |
|---------|-------------|
| **Active Prompt Template** | Choose: Default, Technical, or Creative |
| **Live Preview** | See first 500 characters of active prompt |
| **Edit in Obsidian** | Opens active prompt file for customization |
| **Available Variables** | `{context}` `{question}` `{history}` `{date}` `{vault}` |
| **Prompts Location** | All prompts stored in `Prompts/` folder at vault root |

### 🔧 Advanced Settings

| Setting | Description |
|---------|-------------|
| **Exclude Patterns** | Glob patterns to exclude files (e.g., `Archive/**`, `Private/**`)<br>`.obsidian/**` and `Prompts/**` excluded by default<br>One pattern per line<br>**Requires index rebuild to take effect** |
| **Verbose Logging** | Enable detailed console logs for debugging |

---

## 💬 Using the Chat Interface

### Chat Sidebar Layout

```
┌─────────────────────────────────────────┐
│  🆕 New  📂 Load  💾 Save               │  ← Header buttons
├─────────────────────────────────────────┤
│  📊 Stats: 523 docs │ Ollama │ Hybrid  │  ← Live stats
│  💾 Save │ 🐙 RAG │ 🗑️ Delete           │  ← Control buttons
├─────────────────────────────────────────┤
│                                         │
│  👤 You (10:30 AM)                      │
│  What are my project goals for Q1?      │
│                                         │
│  🤖 Assistant (10:30 AM)            💾  │  ← Save button
│  Based on your notes, your Q1 goals...  │
│                                         │
│  📚 Sources (3):                        │
│  • Projects/Q1-Planning.md (0.92)      │  ← Clickable sources
│  • Goals/2024-Objectives.md (0.87)     │
│  • Meetings/Team-Sync.md (0.81)        │
│                                         │
├─────────────────────────────────────────┤
│  Type your question...             [↵]  │  ← Input
└─────────────────────────────────────────┘
```

### Control Buttons Explained

| Button | Function |
|--------|----------|
| 🆕 **New** | Start a fresh conversation (clears history) |
| 📂 **Load** | Browse and restore saved conversations from `Chats/` folder |
| 💾 **Save** (header) | Manually save current conversation (auto-saves every 30s anyway) |
| 💾 **Save** (on message) | Extract individual assistant response as standalone note to `QnA/` folder |
| 🐙 **RAG Toggle** | Turn note search on/off<br>• ON (purple): Searches notes + AI answers<br>• OFF (gray): Just AI chat, no note search |
| 🗑️ **Delete** | Delete current conversation |

### Chat Workflow

**Basic Q&A**
1. Type question → Press Enter
2. Watch answer stream in with sources
3. Click source links to jump to notes

**Multi-Turn Conversation**
1. Ask initial question
2. Ask follow-up questions – context is preserved
3. Chat automatically saves to `Chats/YYYY-MM-DD-HHMMSS-Chat.md`

**Save Individual Responses**
1. Click 💾 on any assistant message
2. Response saved to `QnA/YYYY-MM-DD-HHMMSS-QnA.md`
3. Includes question, answer, sources, and metadata (YAML frontmatter)

**Load Previous Conversations**
1. Click 📂 **Load** button
2. Select from list of saved chats
3. Conversation loads with full history

**Chat Without RAG**
1. Click 🐙 **RAG Toggle** to turn off (gray)
2. Ask questions – AI answers without searching notes
3. Useful for general knowledge, brainstorming, or writing help

---

## 📝 Custom Prompt Templates

### What Are Prompt Templates?

Prompts are instructions that tell the AI how to behave. They define the assistant's personality, response style, and how to use sources.

The plugin creates a `Prompts/` folder in your vault root with 3 built-in templates:
- **`rag-default.md`** – Helpful, balanced assistant
- **`rag-technical.md`** – Code-focused developer mode
- **`rag-creative.md`** – Creative writing assistant

### Editing Prompts

1. Open **Settings → Smart Second Brain → System Prompts**
2. Select a template from **Active Prompt Template** dropdown
3. Click **"Edit in Obsidian"** button
4. Modify instructions, examples, or citation format
5. Save the file (Cmd+S / Ctrl+S)
6. Changes apply immediately – just ask a new question!

### Prompt Template Structure

Templates use markdown with YAML frontmatter:

```markdown
---
name: My Custom Assistant
description: A specialized assistant for...
---

# System Instructions

You are a [describe role]. When answering questions:

1. Use the provided context from the user's notes
2. Cite sources using [[Note Title]] format
3. Be [tone: concise, detailed, creative, etc.]

## Context

{context}

## Question

{question}

## Conversation History

{history}

---

Please provide a [type of answer] based on the context above.
```

### Available Variables

| Variable | Replaced With | Example |
|----------|---------------|---------|
| `{context}` | Retrieved documents from search | "From [[Note1]]: content here..." |
| `{question}` | User's current question | "What are my project goals?" |
| `{history}` | Previous messages in conversation | "User: ... Assistant: ..." |
| `{date}` | Current date | "1/24/2026" |
| `{vault}` | Name of your Obsidian vault | "My Knowledge Base" |

### Example Customizations

**Make responses more concise:**
```markdown
Provide a brief, 2-3 sentence answer. Be direct and avoid elaboration unless asked.
```

**Change citation format:**
```markdown
Cite sources as markdown links: [Note Title](obsidian://open?vault={vault}&file=Note+Title)
```

**Add domain expertise:**
```markdown
You are a machine learning expert. Use technical terminology and assume the user has a CS background.
```

**Version control with Git:**
Since prompts are markdown files, they work great with Git:
```bash
cd Prompts/
git add rag-custom.md
git commit -m "Add custom prompt for research mode"
```

---

## 🛠️ Commands Reference

Access commands via **Command Palette** (Cmd/Ctrl + P) or assign hotkeys in **Settings → Hotkeys**.

### RAG Commands

| Command | Description |
|---------|-------------|
| **Ask a Question** | Opens modal for quick Q&A (alternative to chat sidebar) |
| **Test Provider Connection** | Verify AI provider is configured correctly |

### Search Commands

| Command | Description |
|---------|-------------|
| **Test Search Query** | Opens vector search modal (for debugging/testing) |
| **Switch Search Mode to Full-text (BM25)** | Use keyword search only |
| **Switch Search Mode to Vector (Semantic)** | Use AI similarity search only |
| **Switch Search Mode to Hybrid (BM25 + Vector)** | Use both (recommended) |

### Index Management Commands

| Command | Description |
|---------|-------------|
| **Rebuild Vector Store** | Re-indexes all documents (keeps settings) |
| **Show Vector Store Info** | Displays document count, dimensions, and stats in modal |

### Ribbon Icons

| Icon | Function |
|------|----------|
| 🧠 **Brain** | Quick question modal (one-off Q&A) |
| 💬 **Chat** | Opens persistent chat sidebar |
| 🔍 **Search** | Vector search modal (debugging) |

---

## 🏗️ Architecture

### Overview

The plugin follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                   Obsidian Plugin                    │
├─────────────────────────────────────────────────────┤
│  UI Layer          │  ChatView, SearchModal         │
│  Settings Layer    │  SettingsTab, PromptManager    │
│  Core Layer        │  RAGEngine, VectorStore        │
│  Provider Layer    │  Ollama, OpenAI, Anthropic     │
│  Observability     │  OpikTracer, NoOpTracer        │
└─────────────────────────────────────────────────────┘
```

### Core Components

**RAGEngine** (`src/core/RAGEngine.ts`)
- Orchestrates the entire RAG pipeline
- Manages document loading, embedding, and storage
- Handles incremental updates and file watchers
- Processes queries and generates responses

**VectorStore** (`src/core/VectorStore.ts`)
- Built on [Orama v2.1.1](https://docs.orama.com/) for hybrid search
- Stores document chunks with embeddings
- Implements BM25, vector, and hybrid search algorithms
- Auto-detects dimension mismatches when switching models
- Persists to `vectorstore.json` for instant loading

**DocumentLoader** (`src/core/DocumentLoader.ts`)
- Loads markdown files from vault
- Extracts frontmatter, tags, and metadata
- Handles exclusion patterns (glob-based)
- Smart chunking with overlap for context preservation

**Providers** (`src/providers/`)
- **BaseProvider**: Abstract interface for all providers
- **OllamaProvider**: Local embedding and LLM (100% offline)
- **OpenAIProvider**: GPT models + text-embedding-3
- **AnthropicProvider**: Claude models + Voyage embeddings
- Dynamic dimension detection and validation
- Streaming support for real-time responses

**PromptManager** (`src/prompts/PromptManager.ts`)
- Loads templates from `Prompts/` folder
- Parses markdown with YAML frontmatter
- Variable substitution: `{context}`, `{question}`, `{history}`, `{date}`, `{vault}`
- Hot reload – changes apply immediately
- Fallback to embedded prompts if files not found

**Tracers** (`src/tracers/`)
- **BaseTracer**: Abstract interface for observability
- **OpikTracer**: LLM observability with Opik (local or cloud)
- **NoOpTracer**: Null object pattern for disabled tracing
- Factory pattern for easy extension

### Data Flow

**1. Indexing Flow**
```
Document → Load → Chunk → Embed → Store → Save to Disk
   ↓         ↓       ↓       ↓       ↓          ↓
  .md     metadata  512ch  vector  Orama  vectorstore.json
```

**2. Search Flow**
```
Query → Embed → Search (BM25/Vector/Hybrid) → Rank → Return Top-K
  ↓       ↓              ↓                      ↓          ↓
"goals"  vector    Orama searches        Score    5 chunks
```

**3. RAG Query Flow**
```
Question → Retrieve Docs → Format Context → LLM Stream → Answer + Sources
    ↓            ↓               ↓              ↓              ↓
  "Q1 goals"   5 chunks      prompt vars    GPT-4o      markdown + links
```

**4. File Update Flow**
```
File Change → Debounce 30s → Re-embed → Update Store → Auto-save
     ↓             ↓             ↓            ↓            ↓
  edit .md    file watcher   new vector   Orama update  disk write
```

### Project Structure

```
src/
├── core/
│   ├── RAGEngine.ts          # Main orchestration engine
│   ├── VectorStore.ts        # Orama-based hybrid search
│   └── DocumentLoader.ts     # Document loading & parsing
├── providers/
│   ├── BaseProvider.ts       # Provider interface
│   ├── OllamaProvider.ts     # Ollama implementation
│   ├── OpenAIProvider.ts     # OpenAI implementation
│   ├── AnthropicProvider.ts  # Anthropic + Voyage AI
│   └── index.ts              # Provider factory
├── prompts/
│   ├── PromptManager.ts      # Template loading & variables
│   └── index.ts              # Export interface
├── tracers/
│   ├── BaseTracer.ts         # Tracer interface
│   ├── OpikTracer.ts         # Opik observability
│   ├── NoOpTracer.ts         # Null object pattern
│   └── index.ts              # Tracer factory
├── ui/
│   ├── ChatView.ts           # Persistent chat sidebar
│   └── SearchModal.ts        # Search debugging UI
├── utils/
│   └── chunking.ts           # Text chunking utilities
├── types/
│   └── index.ts              # TypeScript definitions
├── settings.ts               # Settings UI
└── main.ts                   # Plugin entry point

Prompts/ (Vault Root)
├── rag-default.md            # Default assistant
├── rag-technical.md          # Developer mode
└── rag-creative.md           # Creative writing

Chats/ (Vault Root)
└── YYYY-MM-DD-HHMMSS-Chat.md # Saved conversations

QnA/ (Vault Root)
└── YYYY-MM-DD-HHMMSS-QnA.md  # Saved Q&A responses
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **Obsidian API** | Plugin framework, markdown rendering, file system |
| **Orama v2.1.1** | Vector + full-text search engine (hybrid search) |
| **TypeScript 5.8** | Type-safe development |
| **Ollama** | Local LLM and embedding provider (privacy-first) |
| **OpenAI API** | Cloud GPT models and embeddings |
| **Anthropic API** | Claude models for generation |
| **Voyage AI** | Embedding service for Anthropic provider |
| **esbuild** | Fast bundling and compilation |

---

## 🐛 Troubleshooting

### Indexing Issues

<details>
<summary><b>"Dimension mismatch" error</b></summary>

**Cause**: You switched embedding models (e.g., from `snowflake-arctic-embed:335m` to `text-embedding-3-small`)

**Solution**:
1. Open **Settings → Smart Second Brain → Vector Store Management**
2. Click **"Clear & Rebuild Index"**
3. Wait for re-indexing to complete

**Why it happens**: Different embedding models produce vectors of different dimensions. The vector store can't mix 768-dimensional and 1536-dimensional embeddings.

</details>

<details>
<summary><b>Documents not indexing</b></summary>

**Solution**:
1. Check AI provider is running:
   - **Ollama**: Run `ollama list` in terminal
   - **OpenAI/Anthropic**: Verify API keys in settings
2. Verify embedding model is available:
   - **Ollama**: Run `ollama pull snowflake-arctic-embed:335m`
   - **OpenAI/Anthropic**: Check model dropdown in settings
3. Open console (Ctrl+Shift+I / Cmd+Option+I) and look for errors
4. Check status bar – should show document count
5. Try **Quick Rebuild** in settings

</details>

<details>
<summary><b>Slow indexing</b></summary>

**Solutions**:
- **Use a faster embedding model**:
  - Ollama: `nomic-embed-text` (smaller, faster)
  - OpenAI: `text-embedding-3-small` (faster than `-large`)
- **Exclude large folders**:
  - Settings → Advanced → Exclude Patterns
  - Add patterns like `Archive/**` or `Attachments/**`
- **Note**: Indexing runs in background and doesn't block Obsidian

**Typical speeds**:
- ~10-30 seconds per 100 notes (depending on embedding model)
- Initial index is slower; subsequent loads are instant (cached)

</details>

### Search Issues

<details>
<summary><b>No results found</b></summary>

**Solutions**:
1. **Verify documents are indexed**:
   - Check status bar (should show doc count > 0)
   - Run command: "Show Vector Store Info"
2. **Try different search mode**:
   - Switch to **full-text** for exact keyword matches
   - Switch to **hybrid** for balanced results
3. **Lower similarity threshold**:
   - Settings → RAG Settings → Similarity Threshold
   - Try `0.3` instead of `0.8` (returns more results)
4. **Check exclusion patterns**:
   - Settings → Advanced → Exclude Patterns
   - Make sure you didn't exclude the notes you're searching

</details>

<details>
<summary><b>Vector search not working</b></summary>

**Solutions**:
1. Ensure embedding model is running:
   - **Ollama**: `ollama list` should show embedding model
   - **OpenAI/Anthropic**: Check API key and model settings
2. Check console (Ctrl+Shift+I) for embedding errors
3. Rebuild index: Settings → Vector Store Management → Clear & Rebuild
4. Switch to **hybrid mode** as fallback (uses both BM25 + vector)

</details>

### Chat Issues

<details>
<summary><b>Chat history not loading</b></summary>

**Solution**:
1. Check that `Chats/` folder exists in vault root
2. Verify chat files are markdown (`.md`) with proper format
3. Try manually opening a chat file to verify structure
4. Console may show "Chat file not found" errors if format is incorrect

**Chat file format**:
```markdown
---
created: 2026-01-24T10:30:00
provider: ollama
model: llama3
messages: 5
---

# Conversation

[Conversation content here]
```

</details>

<details>
<summary><b>Index resets on restart</b></summary>

**This should be fixed!** The vector store now persists to `vectorstore.json`.

**If still happening**:
1. Check console for errors during save/load
2. Verify plugin data folder has write permissions
3. Look for `vectorstore.json` in `.obsidian/plugins/smart-second-brain/`
4. File should be several MB (depending on vault size)

</details>

<details>
<summary><b>RAG toggle (octopus) not working</b></summary>

**How to verify it's working**:
1. Open console (Ctrl+Shift+I / Cmd+Option+I)
2. Click the 🐙 toggle
3. Ask a question
4. Console should log: "Skipping vector search (RAG disabled by user)"

**If not working**:
- The toggle just changes UI state – verify console logs
- Questions should still get answered (just without note context)
- If no response at all, check provider connection

</details>

### Prompt Issues

<details>
<summary><b>"Prompt file not found" error</b></summary>

**Solution**:
1. Check `Prompts/` folder exists in vault root (not `.obsidian/`)
2. Verify files exist: `rag-default.md`, `rag-technical.md`, `rag-creative.md`
3. If missing, disable and re-enable plugin to recreate
4. Files should contain YAML frontmatter + markdown content

**Manual fix**:
Create `Prompts/rag-default.md` with this content:
```markdown
---
name: Default Assistant
description: A helpful AI assistant
---

You are a helpful AI assistant...
```

</details>

<details>
<summary><b>Prompts getting indexed into vector store</b></summary>

**This should be auto-fixed!** Plugin automatically excludes `Prompts/**`.

**If still happening**:
1. Check **Settings → Advanced → Exclude Patterns**
2. Verify `Prompts/**` is listed
3. Click **Clear & Rebuild Index** to remove from store

</details>

<details>
<summary><b>Prompt changes not taking effect</b></summary>

**Solution**:
1. Verify you saved the file (Cmd+S / Ctrl+S)
2. Check you're editing the **active template**:
   - Settings → System Prompts → Active Prompt Template
3. Changes apply immediately – no restart needed
4. Try asking a new question (not editing old conversation)

**Debug**:
- Settings → System Prompts → Live Preview
- Should show first 500 chars of active prompt
- If preview doesn't update, prompt file might not be loading

</details>

### Performance Issues

<details>
<summary><b>Settings tab slow to load</b></summary>

**This should be fixed!** Settings now load models asynchronously.

**If still slow**:
1. Check provider connection (slow API calls can block)
2. Disable "Reload models on settings open" if added
3. Console may show timeouts

</details>

<details>
<summary><b>Chat responses lag or freeze</b></summary>

**Solutions**:
1. **Reduce Top-K**: Settings → RAG Settings → Top-K Results
   - Default is 5; try 3 for faster responses
2. **Lower temperature**: Settings → RAG Settings → Temperature
   - Lower = faster, more deterministic
3. **Check provider**:
   - **Ollama**: May be slow on older hardware
   - **OpenAI/Anthropic**: Check internet connection
4. **Streaming disabled**: Verify streaming is enabled (should be default)

</details>

---

## 🗺️ Roadmap

### ✅ Phase 1 - Foundation (COMPLETE)
- [x] RAG-powered Q&A with sources
- [x] Streaming answers with markdown rendering
- [x] Multi-provider support (Ollama, OpenAI, Anthropic)
- [x] Save Q&A to vault with YAML frontmatter
- [x] Vector + BM25 + Hybrid search modes
- [x] Real-time indexing with file watchers

### ✅ Phase 2 - Enhanced UX (COMPLETE)
- [x] Conversation history (multi-turn chat)
- [x] Follow-up questions with context
- [x] Chat threads view/management (save/load)
- [x] Improved source display with relevance scores
- [x] RAG toggle to disable search when needed
- [x] Save individual responses as notes
- [x] Persistent chat sidebar interface
- [x] Auto-save conversations

### ⚙️ Phase 3 - Advanced Features (IN PROGRESS)
- [x] **Custom prompt templates** with variable substitution
- [x] **LLM Observability** with Opik tracing support
- [ ] Advanced filtering (date ranges, tags, folders)
- [ ] Search history and bookmarked queries
- [ ] Export conversations as markdown
- [ ] Custom system prompts per folder/tag
- [ ] Batch operations and optimizations

### 🔮 Future Ideas
- [ ] **Mobile support** (iOS/Android compatibility)
- [ ] **Graph view integration** (show related notes visually)
- [ ] **Voice input** for questions
- [ ] **Suggested questions** based on recent edits
- [ ] **Plugin API** for extensibility
- [ ] **Multi-language support** (i18n)
- [ ] **Image analysis** (vision models for screenshots/diagrams)
- [ ] **Code execution** (run code snippets in conversations)

---

## 🤝 Contributing

Contributions are welcome! This plugin is open source and benefits from community input.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes** with tests (if applicable)
4. **Test thoroughly**:
   - Build: `npm run build`
   - Test in Obsidian vault
   - Verify all providers work
5. **Submit a pull request**

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/smart-second-brain.git
cd smart-second-brain

# Install dependencies
npm install

# Build and watch for changes
npm run dev

# In another terminal, create symlink to test vault
ln -s $(pwd) /path/to/test/vault/.obsidian/plugins/smart-second-brain

# Reload Obsidian to test changes
```

### Contribution Ideas

- 🐛 **Bug fixes** – Check GitHub Issues
- 📚 **Documentation** – Improve README, add examples
- 🧪 **Tests** – Add unit/integration tests
- 🎨 **UI improvements** – Better styling, responsive design
- 🌍 **Translations** – Add i18n support
- 🚀 **Performance** – Optimize indexing, search, or rendering
- 🔌 **Integrations** – New AI providers, observability tools

### Code Style

- TypeScript with strict mode
- ESLint for linting (run `npm run lint`)
- Follow existing code patterns
- Comment complex logic
- Use descriptive variable names

---

## 📄 License

**MIT License** – See [LICENSE](LICENSE) file for details.

You are free to:
- ✅ Use commercially
- ✅ Modify and distribute
- ✅ Use privately
- ✅ Sublicense

**Attribution appreciated but not required.**

---

## 💖 Support

### Getting Help

- 🐛 **Report bugs**: [GitHub Issues](https://github.com/YOUR_USERNAME/smart-second-brain/issues)
- 💡 **Feature requests**: [GitHub Discussions](https://github.com/YOUR_USERNAME/smart-second-brain/discussions)
- 📖 **Documentation**: See sections above or check code comments
- 🔍 **Debugging**: Enable verbose logging (Settings → Advanced) and check console (Ctrl+Shift+I)

### Community

- 💬 **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/smart-second-brain/discussions)
- 🌟 **Star the repo** if you find it useful!
- 📣 **Share** with other Obsidian users

### Sponsor the Project

If this plugin saves you time or enhances your workflow, consider supporting development:

- ☕ **Ko-fi**: [ko-fi.com/YOUR_USERNAME](https://ko-fi.com/YOUR_USERNAME)
- 💖 **GitHub Sponsors**: [github.com/sponsors/YOUR_USERNAME](https://github.com/sponsors/YOUR_USERNAME)

**All sponsorship tiers appreciated!** Funds go toward:
- 🔧 Ongoing maintenance and bug fixes
- ✨ New feature development
- 📚 Documentation improvements
- ☁️ API costs for testing cloud providers

---

## 📚 Credits

Built with:
- [Obsidian API](https://docs.obsidian.md) – Plugin framework and markdown rendering
- [Orama](https://docs.orama.com/) – Fast vector and full-text search engine
- [Ollama](https://ollama.com/) – Local LLM infrastructure (privacy-first)
- [OpenAI API](https://platform.openai.com) – GPT models and embeddings
- [Anthropic API](https://www.anthropic.com) – Claude models
- [Voyage AI](https://www.voyageai.com) – Embeddings for Anthropic provider

**Inspired by**: The Obsidian community's passion for knowledge management and privacy.

---

<div align="center">

**Made with ❤️ for the Obsidian community**

[Report Bug](https://github.com/YOUR_USERNAME/smart-second-brain/issues) · [Request Feature](https://github.com/YOUR_USERNAME/smart-second-brain/discussions) · [⭐ Star on GitHub](https://github.com/YOUR_USERNAME/smart-second-brain)

</div>
