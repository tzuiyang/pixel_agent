# PIXEL AGENT — MASTER PLAN

## Vision

A **browser-based world** where you build a little scene, describe AI-powered characters in plain language and watch them appear as pixel sprites, assign real tasks to them, and see a living scene of cute agents working. Click any character to inspect what it's doing, view its output, or give it a new task.

> Build a cozy room for your AI workers. Create a worker, give it a task, and watch it work.

This is **not** a chatbot. It's a spatial, visual, ambient interface for interacting with AI — closer to The Sims than to ChatGPT.

---

## Origin

Inspired by [Pixel Agents](https://github.com/pablodelucca/pixel-agents) — a VS Code extension by Pablo De Lucca (3.6k+ GitHub stars) that turns Claude Code terminals into animated pixel characters in a virtual office. Each terminal maps to a character that walks, types, reads, and celebrates based on real Claude activity.

**What we're doing differently:**
- **Standalone web app** — no VS Code required, no developer setup
- **User-created characters** — describe your character, AI generates a unique pixel sprite
- **User-built scenes** — drag-and-drop tile-based scene builder
- **Real task execution** — characters do actual AI work via Claude API, not just visualize existing terminals
- **Consumer-facing** — designed for anyone, not just developers

---

## Core Concept: Emotional Ownership

The product's stickiness comes from **ownership at every layer:**

| Step | What Happens | Emotional Hook |
|------|-------------|----------------|
| Build scene | User tiles floors, places furniture | Creative investment |
| Create character | Describe in words → pixel sprite appears | Magic, surprise |
| Accept character | Sprite drops into your world | Personal attachment |
| Assign task | Type task → character starts working | Agency, satisfaction |
| Watch scene | Multiple agents animate simultaneously | Ambient delight |
| Task completes | Celebration animation + notification | Reward |
| View results | Click character → see output | Utility |

**The character creation loop is the killer feature.** If describing a character and watching it appear doesn't feel magical, nothing else matters.

---

## Related Prior Art

| Project | What It Is | What We Learn |
|---------|-----------|---------------|
| **Pixel Agents** (VS Code) | Turns Claude terminals into pixel workers | Core concept — map AI states to animations |
| **AI Town** (a16z) | Deployable virtual town with AI characters | Multi-agent spatial environment, TypeScript |
| **Generative Agents** (Stanford) | 25 ChatGPT agents in a Sims town | LLM characters in spatial environments are compelling |
| **AgentOffice** | Phaser.js agents that collaborate | Click-to-inspect pattern, agent handoff |
| **PixelLab** | AI pixel art generation tool | Text-to-pixel-art pipeline reference |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND (React)                    │
│  TypeScript + Vite + Tailwind                         │
│                                                       │
│  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │   HTML Canvas (2D)  │  │    React UI Overlays   │ │
│  │                     │  │                        │ │
│  │  - Tile grid        │  │  - Agent card/panel    │ │
│  │  - Character sprites│  │  - Task input          │ │
│  │  - Animations       │  │  - Scene editor tools  │ │
│  │  - Speech bubbles   │  │  - Character creator   │ │
│  │  - Pathfinding      │  │  - Results viewer      │ │
│  │  - Pixel rendering  │  │  - Notifications       │ │
│  └─────────────────────┘  └────────────────────────┘ │
└────────────────────────┬─────────────────────────────┘
                         │ WebSocket + REST
┌────────────────────────▼─────────────────────────────┐
│                   BACKEND (Node.js)                   │
│  Express + WebSocket server                           │
│                                                       │
│  Services:                                            │
│    Agent Orchestrator  ← manages agent state machines │
│    Claude Service      ← Anthropic SDK, streaming     │
│    Sprite Generator    ← text → JSON pixel grid       │
│    Scene Manager       ← save/load tile layouts       │
│    Task Manager        ← queue, execute, store tasks  │
│                                                       │
│  Real-time events via WebSocket:                      │
│    agent_started, agent_thinking, agent_tool_call,    │
│    agent_waiting, agent_completed, agent_error        │
└────────────────────────┬─────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────┐
│                   PERSISTENCE                         │
│  SQLite (v1) or PostgreSQL (v2)                       │
│                                                       │
│  Tables:                                              │
│    users        ← accounts (if needed)                │
│    scenes       ← tile layouts, prop placements       │
│    characters   ← name, description, sprite data      │
│    tasks        ← per-character task history           │
│    agent_state  ← current state machine per agent     │
└──────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### 1. Pixel Sprite Generation (v1: Claude JSON Grids)

Claude generates sprites as a JSON array of hex color strings — a 16x16 or 32x32 grid. The canvas renderer draws each pixel scaled up 2x or 3x.

```json
{
  "width": 16,
  "height": 16,
  "frames": {
    "idle": [["#3a1a5c", "#3a1a5c", ...], ...],
    "walk_1": [...],
    "walk_2": [...]
  }
}
```

**Why this approach:** Keeps everything in one API, controls style consistency, avoids external image generation dependencies. Simple but charming.

**v2 upgrade path:** Hybrid approach — Claude defines character concept, dedicated pixel art model (PixelLab, fine-tuned Flux) generates higher fidelity sprites.

### 2. Animation Strategy (Code-Based, Not Frame-Based)

Instead of requiring full spritesheets, generate a static front-view and side-view, then use **code-based animations**: bouncing, tilting, squash-and-stretch, bobbing. This makes characters feel alive without needing 24 hand-drawn frames.

### 3. Agent State Machine

Each character runs a state machine that drives both backend behavior and frontend animation:

```
IDLE → WORKING → THINKING → WAITING_FOR_INPUT → DONE
                    ↓
                  ERROR
```

State transitions emit WebSocket events. The canvas renderer maps states to animations:

| State | Animation | Speech Bubble |
|-------|-----------|---------------|
| Idle | Gentle weight shift | Empty or ambient thought |
| Working | Typing/reading loop | Current activity phrase |
| Thinking | Pacing slowly | "hmm..." |
| Waiting | Standing, looking at user | "Your turn!" |
| Done | Celebration bounce | "Done! Click me" |
| Error | Head shake | "Something went wrong" |

### 4. Task Scope (v1)

Start with **real tasks, simple scope** — text generation, research synthesis, brainstorming, writing. No file system access, no web browsing, no code execution in v1.

### 5. Scene Rendering

- 32x32 tile grid on HTML Canvas (2D context)
- Paintable floor types, wall objects, prop placement
- Grid expandable up to 64x64
- Layout serialized as JSON
- Pixel-perfect integer zoom levels (1x, 2x, 3x)

---

## MVP Definition

> A cozy room where you create a pixel character by describing it, give it a task, and watch it work.

### MVP User Flow

```
Enter app
↓
Choose a room template (office / apartment / lab / beach)
↓
Click "+ New Agent"
↓
Describe character in plain text
↓
See generated pixel sprite appear
↓
Accept / Regenerate / Refine
↓
Character drops into scene with idle animation
↓
Click character → type a task
↓
Watch character animate through work states
↓
Click again when done → see results
```

### MVP Scope

**In scope:**
- 3-4 pre-built room templates with fixed layouts
- Character creation via text description → Claude JSON sprite
- Accept/regenerate/refine loop
- Single character placed in scene with idle animation
- Task assignment via click → text input
- Claude API streaming with activity phase labels
- Speech bubbles reflecting agent state
- Agent inspector panel (task, status, output)
- Task completion with celebration animation

**Out of scope for MVP:**
- Custom scene builder (drag-and-drop)
- Multiple simultaneous agents
- Agent-to-agent handoff
- User accounts / auth
- Persistent storage across sessions
- Sound effects
- AI-generated environment tiles
- Multiplayer / shared worlds

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Sprite quality** — Claude JSON grids produce simple, not detailed sprites | Medium | Frame as a feature: "lo-fi, consistent, cute." Use strict style constraints in prompt. |
| **API cost** — each agent = a Claude API session | High | Limit concurrent agents in v1. Consider user-provided API key model. Queue tasks. |
| **Too much setup before value** — scene + character + task before anything happens | High | Pre-built room templates. Default starter character. Get to "assign task, watch work" in under 60 seconds. |
| **Style drift** — user assets vs AI-generated characters look mismatched | Medium | Constrain sprite palette to match tileset. Use style reference in generation prompt. |
| **"Waiting for input" detection** — knowing when agent genuinely needs user attention | Medium | Explicit state events since we own the agent loop. Prompt engineering for clear handoff signals. |
| **Audience confusion** — is this productivity? entertainment? toy? | Medium | Frame as "personal creative toy" — agents with personality doing your tasks in a world you made. |

---

## Open Questions (Decisions Needed)

1. **API key model** — user provides their own key, or we proxy through our backend? (cost vs. friction tradeoff)
2. **5 starter task types for v1** — what categories? (writing, research, brainstorming, summarization, ...?)
3. **Art style for environment tiles** — hand-made tileset, purchased asset pack, or AI-generated ahead of time?
4. **Single-player only or shareable worlds?** — multiplayer changes backend significantly
5. **Business model** — free with API key? subscription? credits?
6. **Canvas library** — raw HTML Canvas 2D, or use Phaser.js/PixiJS for easier sprite management?

---

## Long-Term Vision (Post-MVP)

- **Scene builder** — full drag-and-drop tile editor, custom environments
- **Multiple concurrent agents** — 3-8 characters working simultaneously
- **Agent-to-agent handoff** — researcher → writer → editor pipeline with visual walk-toward animation
- **Persistent workers** — reusable agents with memory across sessions
- **Gamification** — level-up animations, unlockable furniture/props, mission log instead of terminal
- **Shared worlds** — team workspaces, public agent worlds, collaborative rooms
- **AI-generated environment tiles** — describe a room, AI generates the tileset
- **Sound design** — ambient music, keyboard clicks, celebration chimes
- **Mobile support** — responsive canvas rendering
