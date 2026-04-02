# 🤘 Share My Claude Max

> Your team's Claude Code sessions, connected. No more stepping on each other's toes.

## The Problem

Multiple people using Claude Code on the same repo? You're flying blind:
- **"Did Alex already implement auth?"** — No idea, ask on Slack
- **"Who's editing routes.ts right now?"** — Find out after a git conflict
- **"I already fixed this bug last week"** — But the new session doesn't know that

**Share My Claude Max** makes every Claude Code session aware of every other session. Automatically.

## Quick Start

### 1. Install
Search "Share My Claude Max" in VS Code Extensions, or install from marketplace.

### 2. Set your identity (one time)
Open Claude Code in your project and run:
```
/teamshare:identify YourName your-role
```
Example:
```
/teamshare:identify Alex backend-lead
/teamshare:identify Sam fullstack
```

### 3. Index existing sessions (one time)
```
/teamshare:index
```
This scans all Claude Code sessions from `~/.claude/projects/` for your current project and builds the search index. Takes a few seconds.

### 4. Done! Just code normally.
Every new Claude Code session is automatically tracked. No extra steps needed.

## Commands

| Command | What it does |
|---------|-------------|
| `/teamshare:who` | See who's actively coding and what files they're touching |
| `/teamshare:search <query>` | Search across all sessions by keyword, user, file, or topic |
| `/teamshare:summary [query]` | View detailed summary of any session |
| `/teamshare:identify <name> [role]` | Set your name so teammates can see you |
| `/teamshare:index` | Scan & index all existing Claude Code sessions |
| `/teamshare:reindex` | Force rebuild search indices from scratch |

## Example: A Day with Share My Claude Max

**Morning — Alex starts working on auth:**
```
Alex's Claude session starts
  → Auto-registered: "Alex (backend-lead) on feature/auth"
  → Hooks track every file edit and command
```

**Later — Sam joins the project:**
```
Sam: /teamshare:who

👥 Team Status
🟢 Active now:
  Alex (backend-lead) - "JWT Auth Middleware"
    Branch: feature/auth
    Files: src/auth/middleware.ts, src/auth/types.ts, src/auth/redis.ts
    Focus: Implementing rate limiting with Redis
```

**Sam needs context on what Alex did:**
```
Sam: /teamshare:search authentication

🔍 Found 1 session:
  1. 🟢 Alex - "JWT Auth Middleware" (today, 09:56)
     Branch: feature/auth | Files: 5 | Score: 8
     Implemented JWT validation, Redis session store, rate limiting
     Tags: authentication, jwt, middleware, redis
```

**Sam copies the summary and pastes into their own session:**
```
Sam: "Here's what Alex already did: [paste summary]. I'll work on the API endpoints instead."
  → Claude now knows the full context without re-exploring the codebase
  → Zero duplicate work, zero wasted tokens
```

## How It Works Under the Hood

### Auto-tracking (zero config)
When you install the extension, it registers a Claude Code plugin with three hooks:

- **SessionStart** → Registers your session in `.teamshare/sessions/registry.json`
- **PostToolUse** → Every Edit/Write/Bash command updates your session's file list and actions
- **Stop** → Generates final summary, updates search indices

### Session Summaries (minimal token cost)
Summaries are **living documents** that update in real-time:

| Operation | When | Token Cost |
|-----------|------|------------|
| **INSERT** | New file edited, git commit, npm install | **0** (parsed from tool calls) |
| **ALTER** | Focus changed, task completed | **0** (parsed from events) |
| **REWRITE** | Session end only | **~500 tokens** (AI consolidates decisions) |

A typical 100-message session costs **~2,000 tokens** total for summaries. Most updates are free.

### 3-Layer Search
1. **Structured filter** — By user, branch, date, files. Instant, free.
2. **Keyword index** — Inverted index lookup + grep summaries. Instant, free.
3. **Semantic search** — Embedding similarity (optional). Background indexed.

### Data Storage
All data stays local in your project's `.teamshare/` directory (auto git-ignored):

```
.teamshare/
├── config.json                    ← Your identity
├── sessions/
│   ├── registry.json              ← All sessions: who, when, what, status
│   └── summaries/{sessionId}.json ← Per-session summaries
└── search/
    ├── keyword-index.json         ← keyword → [session IDs]
    └── file-index.json            ← file path → [session IDs]
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `shareMyClaudeMax.enabled` | `true` | Enable or disable the extension |
| `shareMyClaudeMax.embedding.provider` | `"none"` | `"none"`, `"openai"`, or `"ollama"` for semantic search |
| `shareMyClaudeMax.embedding.model` | `"text-embedding-3-small"` | Which embedding model to use |
| `shareMyClaudeMax.embedding.dimensions` | `256` | Vector dimensions |

## Privacy & Security
- All data is **local only** — nothing leaves your machine
- `.teamshare/` is automatically added to `.gitignore`
- The extension only **reads** from `~/.claude/` — never writes to Claude's data
- No telemetry, no tracking, no external API calls (unless you enable embedding)

## Requirements
- VS Code 1.96+
- Claude Code CLI installed and working

## License
MIT — do whatever you want with it. 🤘
