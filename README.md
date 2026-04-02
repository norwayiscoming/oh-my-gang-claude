# Share My Claude Max

> Your team's Claude Code sessions, connected.

When multiple people use Claude Code on the same project, nobody knows what anyone else is doing. You duplicate work, edit the same files, and waste tokens re-explaining context that another session already figured out.

**Share My Claude Max** fixes this by making every Claude Code session visible, searchable, and aware of each other.

## What it does

### For Claude (auto, zero config)
When you install this extension, Claude Code automatically:
- **Knows who's on the team** — sees all active sessions and what they're working on
- **Tracks what was done** — auto-generates session summaries from tool calls (0 tokens)
- **Avoids conflicts** — knows which files other sessions are editing
- **Searches past work** — finds relevant context from any team member's sessions

### For you (slash commands)
```
/teamshare:who          → See who's actively coding and what they're doing
/teamshare:search auth  → Find sessions about authentication across all users
/teamshare:summary      → View summary of any session
/teamshare:identify     → Set your name so teammates see you
/teamshare:index        → Scan & index all existing Claude Code sessions
```

## How it works

```
You install extension → VS Code activates → Claude Code plugin auto-registers
                                                    ↓
                                    Hooks start tracking:
                                    • SessionStart → register in .teamshare/
                                    • PostToolUse → track files & commands
                                    • Stop → generate summary + update index
                                                    ↓
                                    Your Claude session now:
                                    • Knows Brian is editing src/auth.ts
                                    • Can search what Anh did yesterday
                                    • Won't duplicate work already done
```

## Search (3-layer, fast)

| Layer | How | Cost | When |
|-------|-----|------|------|
| **Structured** | Filter by user, branch, time, files | Free, instant | Always |
| **Keyword** | Inverted index + grep summaries | Free, instant | Always |
| **Semantic** | Embedding similarity (OpenAI/Ollama) | Optional, background | When L1+L2 return 0 |

## Summary (living document, minimal tokens)

Summaries update in real-time as sessions progress:

| Operation | Trigger | Token cost |
|-----------|---------|------------|
| **INSERT** | New file edited, new command run | 0 (parsed from tool calls) |
| **ALTER** | Focus changed, status updated | 0 (parsed from events) |
| **REWRITE** | Session end (AI consolidates) | ~500 tokens, once |

## Data stored in `.teamshare/`

```
.teamshare/                          ← git-ignored, local to project
├── config.json                      ← Your identity (name, role)
├── sessions/
│   ├── registry.json                ← All sessions metadata
│   └── summaries/{id}.json          ← Per-session summaries
└── search/
    ├── keyword-index.json           ← keyword → session IDs
    └── file-index.json              ← file path → session IDs
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `shareMyClaudeMax.enabled` | `true` | Enable/disable |
| `shareMyClaudeMax.embedding.provider` | `"none"` | `none`, `openai`, or `ollama` |
| `shareMyClaudeMax.embedding.model` | `text-embedding-3-small` | Embedding model |

## Requirements

- VS Code 1.96+
- Claude Code CLI installed

## License

MIT
