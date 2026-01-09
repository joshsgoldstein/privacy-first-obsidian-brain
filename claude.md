# Claude Context - Obsidian Plugin Development Session

**Date:** 2026-01-07
**Working Directory:** `/Users/joshgoldstein/Documents/lab/notes-meeting-agent/test-vault/.obsidian/plugins/obsidian-sample-plugin`

---

## Current Project: Hello World Plugin

### Status
Modified version of the official Obsidian sample plugin template.

### Uncommitted Changes (Git Status)
```
M manifest.json
M package-lock.json
M src/main.ts
```

### Changes Made
1. **manifest.json** - Rebranded from "Sample Plugin" to "Hello World"
   - Changed ID: `sample-plugin` → `hello-world`
   - Changed name: `Sample Plugin` → `Hello World`
   - Updated description, author info, URLs

2. **src/main.ts** - Added new ribbon icon
   - Added "Greet" ribbon icon that displays "Hello, world!" notice (lines 13-15)
   - Appears before the existing "Sample" ribbon icon

3. **package-lock.json** - Dependency updates

### Project Structure
```
obsidian-sample-plugin/
├── src/
│   ├── main.ts              # Main plugin class and modal implementation
│   └── settings.ts          # Settings interface, defaults, and settings tab
├── manifest.json            # Plugin metadata (modified)
├── package.json             # NPM dependencies and build scripts
├── package-lock.json        # Locked dependency versions (modified)
├── esbuild.config.mjs       # Build bundler configuration
├── eslint.config.mts        # ESLint configuration
├── tsconfig.json            # TypeScript compiler options
├── styles.css               # CSS styling (empty)
└── README.md                # Documentation
```

### Features Demonstrated
- Ribbon icons in sidebar
- Command palette commands
- Status bar text
- Modal dialogs
- Settings persistence
- Event listeners (DOM clicks, intervals)

### Tech Stack
- TypeScript ^5.8.3
- esbuild 0.25.5 (bundler)
- ESLint with Obsidian-specific rules
- Target: ES2018, CommonJS output

### Build Commands
- `npm run dev` - Watch mode compilation
- `npm run build` - Production build with type checking
- `npm run lint` - ESLint check
- `npm run version` - Version bump script

---

## Reference Project: Smart2Brain Plugin

**Location:** `/Users/joshgoldstein/Documents/cold-vault/obsidian-plugins/obsidian-Smart2Brain`
**GitHub:** `git@github.com:joshsgoldstein/obsidian-Smart2Brain.git`

### What It Is
A sophisticated RAG-powered AI chat plugin that transforms your Obsidian vault into an intelligent assistant. Users can chat with their notes using local (Ollama) or cloud (OpenAI) LLMs.

### Core Functionality
1. **RAG Pipeline**: Embeds all notes as vectors, retrieves semantically similar content
2. **Chat Interface**: Streaming LLM responses with markdown support
3. **Dual AI Support**:
   - Local: Ollama (llama2, mistral, phi, etc.)
   - Cloud: OpenAI (GPT-3.5, GPT-4, GPT-4o)
4. **Auto-sync**: Updates embeddings when notes change
5. **Source Linking**: Automatically links responses back to source notes

### Architecture Highlights

**Frontend:**
- **Framework**: Svelte (not typical for Obsidian plugins!)
- **Styling**: Tailwind CSS
- **Components**: 30+ Svelte components in organized structure

**Backend:**
- **Core Library**: `papa-ts` (external library for RAG orchestration)
- **Vector DB**: Orama
- **LLM Framework**: LangChain
- **Storage**: Binary `.bin` vector stores per model

**Key Technical Decisions:**
- Monkey-patches Obsidian view routing to auto-open chats in custom view
- Svelte stores for reactive state management
- Debounced auto-save (30s) for vector store updates
- Lazy initialization of papa-ts backend
- Separate vector stores per embedding model

### Codebase Stats
- **~3,377 lines** across 47 source files
- **Version**: 1.3.0
- **License**: AGPL-3.0
- **Platform**: Desktop only
- **Min Obsidian**: 1.5.0

### File Organization
```
/src
├── main.ts                          # Plugin entry & lifecycle
├── SmartSecondBrain.ts              # Core RAG logic
├── store.ts                         # Svelte stores
├── logging.ts                       # Custom logger
├── components/
│   ├── Chat/                        # Chat interface
│   ├── Settings/                    # Configuration UI
│   ├── Onboarding/                  # Setup wizard
│   ├── Modal/                       # Modal dialogs
│   ├── base/                        # Reusable UI components
│   └── Logos/                       # Branding
├── controller/
│   ├── Messages.ts                  # Chat message handling
│   ├── OpenAI.ts                    # OpenAI API client
│   └── Ollama.ts                    # Ollama API client
├── views/
│   ├── Chat.ts                      # Custom chat view
│   ├── Settings.ts                  # Settings tab
│   └── Onboarding.ts                # Setup wizard
└── lang/                            # i18n (7 languages)
```

### Dependencies
**Runtime:**
- i18next, svelte-i18n (internationalization)
- monkey-around (view routing patch)
- nanoid (ID generation)
- obsidian, svelte

**Dev:**
- TypeScript 5.2.2, Vite 4.4.9
- Tailwind CSS 3.3.3
- Biome 1.2.2 (formatter/linter)
- Bun (package manager)

### Key Differences from Standard Obsidian Plugins
1. **Svelte framework** vs vanilla JS
2. **Hybrid AI backend** (local + cloud)
3. **Vector store persistence** (maintains indexed data)
4. **Real-time vault synchronization** (actively monitors changes)
5. **Custom view class** implementing TextFileView
6. **Monkey patching** for seamless UX
7. **Privacy-first design** ("Incognito Mode" for local-only operation)

### Privacy Features
- "Incognito Mode" toggle for local-only processing
- All data stays on device when using Ollama
- No cloud calls unless explicitly configured with API key

### Performance Considerations
- Vector stores can be large (recommend excluding from Obsidian Sync)
- Lazy initialization reduces startup time
- Debounced saves prevent excessive writes
- Binary format for efficient storage

---

## Context Notes

### What User Was Working On
Looking at screenshot, the user has notes about:
- Agentic AI workflows
- Agent taxonomy design
- Document Assembly Agents
- Avoiding "over-agenting"
- Field CTO mode vs "AI everywhere" approach

### Possible Next Steps
1. Build something inspired by Smart2Brain?
2. Modify/extend Smart2Brain plugin?
3. Understand specific RAG implementation details?
4. Create a different type of Obsidian plugin?

---

## Git State
**Branch:** master (main branch)
**Recent commits:**
- dc2fa22 Fix typo in ESLint plugin link
- 2323edd Merge pull request #164
- 911b773 Merge remote-tracking branch 'upstream/master'

---

## Environment
- **Platform:** macOS (Darwin 25.2.0)
- **Node/Bun:** Available
- **Git repo:** Yes
- **Obsidian API:** 1.4.11+

---

## Quick Reference Commands

### Current Project (Hello World Plugin)
```bash
cd /Users/joshgoldstein/Documents/lab/notes-meeting-agent/test-vault/.obsidian/plugins/obsidian-sample-plugin

# Development
npm run dev          # Watch mode
npm run build        # Production build
npm run lint         # Check code quality

# Git
git status
git diff
git log --oneline -5
```

### Smart2Brain Reference
```bash
cd /Users/joshgoldstein/Documents/cold-vault/obsidian-plugins/obsidian-Smart2Brain

# Explore
ls -la src/
cat manifest.json
git log --oneline -10
```

---

## Key Files to Review

### Current Project
- `src/main.ts:13-15` - New "Greet" ribbon icon
- `manifest.json` - Rebranding changes
- `src/settings.ts` - Settings interface pattern

### Smart2Brain Reference
- `src/SmartSecondBrain.ts` - Core RAG implementation
- `src/main.ts` - Plugin lifecycle and view registration
- `src/components/Chat/Chat.svelte` - Chat UI component
- `src/controller/OpenAI.ts` - OpenAI integration pattern
- `src/controller/Ollama.ts` - Local LLM integration
- `package.json` - Full dependency list

---

## Questions to Clarify on Return
1. What's the goal for this plugin development?
2. Building new plugin or modifying existing?
3. Need RAG/AI capabilities like Smart2Brain?
4. Any specific features to implement?

---

*This context was generated by Claude Code on 2026-01-07. Resume the conversation with: "I'm back, let's continue"*
