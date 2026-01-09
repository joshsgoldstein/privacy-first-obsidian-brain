# Smart Second Brain v2 - Dependencies

## Minimal Dependency Approach

We're keeping dependencies to a bare minimum to:
- Reduce complexity and bundle size
- Make the codebase easier to understand
- Learn RAG fundamentals without framework abstractions
- Avoid version conflicts and maintenance burden

---

## Production Dependencies

### Required

```json
{
  "dependencies": {
    "obsidian": "^1.5.0",
    "@orama/orama": "^2.0.0",
    "nanoid": "^5.0.0"
  }
}
```

**obsidian** (^1.5.0)
- The Obsidian plugin API
- Provides: Plugin class, ItemView, Settings, markdown rendering, vault access
- License: Proprietary (free for plugin use)

**@orama/orama** (^2.0.0)
- Pure JavaScript vector database
- Provides: In-memory vector search, persistence, cosine similarity
- Why: No native dependencies, works in Obsidian environment, fast
- License: Apache 2.0
- Alternatives considered:
  - hnswlib-node (requires native bindings)
  - faiss (requires Python/native)
  - chromadb (server required)

**nanoid** (^5.0.0)
- Tiny, secure, URL-friendly unique ID generator
- Provides: Message IDs, session IDs
- Why: Smaller than uuid (130 bytes), collision-resistant
- License: MIT

---

## Development Dependencies

### Required

```json
{
  "devDependencies": {
    "typescript": "^5.2.0",
    "esbuild": "^0.25.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "builtin-modules": "^3.3.0",
    "@types/node": "^16.11.6"
  }
}
```

**typescript** (^5.2.0)
- TypeScript compiler for type checking
- We use `tsc -noEmit` to check types without compiling
- esbuild handles actual compilation (faster)

**esbuild** (^0.25.0)
- Ultra-fast JavaScript bundler
- Compiles TypeScript to JavaScript
- Bundles all source files into single main.js
- Standard for Obsidian plugins

**eslint + typescript-eslint** (^8.0.0 / ^6.0.0)
- Code linting and style enforcement
- Catches common errors
- Enforces consistent code style

**builtin-modules** (^3.3.0)
- List of Node.js built-in modules
- Used in esbuild config to mark as external

**@types/node** (^16.11.6)
- TypeScript type definitions for Node.js APIs
- Needed for file system operations

---

## Optional Dependencies

### For Testing (if we add tests later)

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

---

## Phased Dependency Approach

### Phase 1 (Current): Minimal Dependencies
**What we're using NOW:**
- Direct API calls via fetch
- No LLM frameworks

**Why:**
- Learn RAG fundamentals
- Understand what's happening under the hood
- Smaller bundle, less complexity
- Easier to debug

### Phase 2 (Future): Add LangChain.js
**When we'll add it:**
- After Phase 1 is working
- When provider switching gets complex
- When we want better prompt management

**What it will give us:**
```json
{
  "dependencies": {
    "langchain": "^0.1.0",
    "@langchain/core": "^0.1.0",
    "@langchain/community": "^0.0.x"
  }
}
```

**Benefits:**
- Unified interface for all providers
- Built-in retry and error handling
- Memory management
- Better prompt templates
- Chain composition

**Migration path:**
- Our provider interfaces are already compatible
- Swap implementation, keep public API
- No breaking changes for users

### Phase 3 (Future): Add LangGraph.js
**When we'll add it:**
- After implementing multi-agent workflows
- Document Assembly Agent
- Agent coordination and routing

**What it will give us:**
```json
{
  "dependencies": {
    "@langchain/langgraph": "^0.0.x"
  }
}
```

**Benefits:**
- State machines for agents
- Conditional workflows
- Agent orchestration
- Cycle detection
- Streaming updates

---

## What We're NOT Using in ANY Phase

### ❌ Heavy Frameworks

### ❌ Svelte / React / Vue
**Why not:**
- Framework overhead
- Most Obsidian plugins use vanilla
- Easier to learn TypeScript without framework

**What we do instead:**
- Vanilla TypeScript DOM manipulation
- Obsidian's built-in UI helpers

### ❌ Tailwind CSS
**Why not:**
- Requires build pipeline integration
- Obsidian has excellent CSS variables already
- Adds bundle size

**What we do instead:**
- Plain CSS using Obsidian CSS variables
- Automatic theme compatibility

### ❌ axios / node-fetch
**Why not:**
- Obsidian has native fetch API
- One less dependency

**What we do instead:**
- Native fetch (works in Obsidian)

### ❌ lodash / ramda
**Why not:**
- Modern JavaScript has most utilities built-in
- Adds bundle size

**What we do instead:**
- Native array methods (map, filter, reduce)
- Simple helper functions when needed

### ❌ dotenv
**Why not:**
- Obsidian doesn't use .env files
- API keys stored in plugin settings

**What we do instead:**
- Obsidian's loadData/saveData for settings

---

## API Integrations (No SDK Dependencies)

We call these APIs directly using fetch:

### Ollama API
```typescript
// No SDK needed - simple REST API
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({ model: 'llama2', prompt: '...' })
});
```

### OpenAI API
```typescript
// No official SDK needed - simple REST API
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ model: 'gpt-4o', messages: [...] })
});
```

### Anthropic API
```typescript
// No SDK needed - simple REST API
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': apiKey },
  body: JSON.stringify({ model: 'claude-3-5-sonnet-20241022', messages: [...] })
});
```

**Benefits:**
- No version conflicts
- Full control over requests
- Understand exactly what's happening
- Smaller bundle size
- No dependency maintenance

---

## Installation

### For Development

```bash
# Install all dependencies
npm install

# Or if you prefer bun
bun install
```

### For Users

Users just install the plugin through Obsidian's Community Plugins.
All dependencies are bundled into `main.js`.

---

## Bundle Size Target

| Component | Size | Notes |
|-----------|------|-------|
| Our code | ~50KB | TypeScript compiled to JS |
| Orama | ~100KB | Vector database |
| nanoid | <1KB | ID generation |
| **Total** | **~150KB** | Minified and gzipped |

Compare to Smart2Brain original: ~500KB (includes LangChain, Svelte, etc.)

---

## Security Considerations

### API Keys
- Stored using Obsidian's built-in storage (encrypted)
- Never bundled in code
- Never sent to third parties (except chosen provider)

### Network Requests
- Only to user-configured endpoints
- Ollama: localhost by default
- OpenAI/Anthropic: Only if user provides API key

### Dependencies Audit
```bash
npm audit
```

Run before every release to check for vulnerabilities.

---

## Upgrade Path

If we later decide we need LangChain/LangGraph:

1. Our provider interfaces are already compatible
2. Swap implementation without changing public API
3. Users won't notice the change

Example:
```typescript
// Current: Direct API call
class OllamaProvider {
  async generate(prompt: string) {
    return fetch('http://localhost:11434/api/generate', ...);
  }
}

// Future: Using LangChain (if needed)
import { Ollama } from 'langchain/llms/ollama';

class OllamaProvider {
  private llm = new Ollama();

  async generate(prompt: string) {
    return this.llm.call(prompt);
  }
}
```

Interface stays the same, implementation changes.

---

## Summary

**Total Dependencies: 3 runtime, 7 dev**

**Philosophy:**
- Start simple
- Add complexity only when needed
- Understand fundamentals before adding abstractions
- Keep bundle small and maintainable

This approach lets us learn RAG deeply while building a production-ready plugin.
