# Pixel Agents Web — Full Product Concept

> A browser-based world where users build a scene, create AI-powered pixel art characters by describing them, assign tasks to those characters, and watch a living scene of tiny agents working on your behalf.

---

## 1. Inspiration & Context

### Where the idea comes from

The original [Pixel Agents](https://github.com/pablodelucca/pixel-agents) is a VS Code extension by Pablo De Lucca that turns Claude Code terminals into animated pixel art characters in a virtual office. Each agent walks around, sits at desks, and visually reflects what it's doing — typing when writing code, reading when searching files, showing a speech bubble when it needs your attention. It got 3.6k GitHub stars almost immediately after launch and was covered by Fast Company.

The creator himself said: *"I envision a future where agent-based user interfaces resemble a video game more than a traditional IDE."*

This web app takes that vision and makes it a standalone consumer product — no VS Code, no developer setup required.

### Related prior art

- **AI Town** (a16z-infra) — a deployable starter kit for building virtual towns where AI characters live, chat, and socialize. Multiplayer-ready, 100% TypeScript.
- **Generative Agents** (Stanford/Google, 2023) — landmark research paper: 25 ChatGPT agents in a Sims-inspired town called Smallville. Agents wake up, form opinions, remember days past, throw parties. Proved that LLM-powered characters in a spatial environment are compelling and believable.
- **AgentOffice** — TypeScript monorepo with Phaser.js rendering + React UI overlays, where AI agents walk around, think, collaborate, hire interns, and grow their team. Used the click-to-inspect pattern for viewing agent activity.
- **PixelLab** — AI tool for generating pixel art game assets from text descriptions, including character sprites, directional rotations, and animations.

### What makes this different

Every existing project either requires developer setup (Pixel Agents, AI Town) or uses preset sprites with no user ownership. This app puts **user-created characters at the center** — you describe your agent, it gets generated as a unique pixel sprite, you accept or reject it, and it lives in a world *you* built. That emotional ownership loop is genuinely new in the consumer space.

---

## 2. Core Concept

Users build a little world, populate it with AI-powered pixel art characters they design themselves, assign tasks to those characters, and watch a living scene of agents working. Clicking a character shows what it's doing and reveals its output when done.

**The through-line: emotional ownership at every step.**
- You built the world.
- You described the character.
- You gave it a task.
- It feels like *your* tiny team.

---

## 3. Full User Workflow

### Phase 1 — Build Your World

The user lands on the app and the first thing they do is **design a scene**. Pick an environment type:
- Cozy home office
- Tropical beach
- Space station
- Fantasy forest
- Café
- Or start from a blank grid

Then drag and drop furniture, decorations, and props to arrange the space. This is the emotional hook — they're not setting up a productivity tool, they're **decorating a little world**.

**Technical layer underneath:**
- 32×32 tile grid rendered on HTML Canvas
- Paintable floor types, wall objects, prop placement
- Grid is expandable (up to 64×64)
- Layout serialized as JSON, persisted to backend
- Layout survives sessions and is shared if the user shares their world URL

---

### Phase 2 — Create a Character

Once the world exists, user hits **"+ New Agent"** and gets a chat-style input box. They describe their character in plain language:

> *"A tiny wizard with a purple robe, white beard, and a glowing staff"*
> *"A cyberpunk hacker girl with neon green hair and a hoodie"*
> *"A sleepy golden retriever in a business suit"*

Claude receives the description and generates a **16×16 or 32×32 pixel sprite** — encoded as a JSON color grid — which the app renders on canvas in real time.

**The accept/reject loop:**
- ✅ **Accept** → character is saved and placed in the scene
- 🔄 **Regenerate** → Claude tries again with the same prompt
- ✏️ **Refine** → user adds more description ("make the robe darker, give them a pointy hat") and Claude iterates

This is the most important moment in the product. It must feel fast, fun, and surprising — like a vending machine that gives you a different toy each time until you love one.

Once accepted:
- Character gets a **name** (user-defined or AI-suggested)
- Drops into the scene at a random walkable tile
- Immediately starts an **idle animation** (weight shift, subtle blink)
- Just to feel alive from the moment it exists

**On pixel art generation:**
Claude (text model) cannot natively generate images. Two viable approaches:
1. **Claude generates a pixel grid as JSON** — a 16×16 or 32×32 array of hex color values. Surprisingly effective for simple characters. Keeps everything in one API, controls style consistency, keeps costs low. **Recommended for v1.**
2. **Hybrid** — Claude defines the character concept and structured description, feeds it as a prompt to a dedicated pixel art API (PixelLab, etc.) for higher fidelity. Good for v2.

---

### Phase 3 — Assign a Task

User clicks a character in the scene. A small **agent card** pops up showing:
- Character name and sprite
- Status indicator
- A text input field

User types a task:
> *"Research the best ways to learn Spanish as an adult"*
> *"Write a short poem about the ocean"*
> *"Brainstorm 10 product names for an oat milk brand"*
> *"Summarize this article: [URL]"*

They hit send. The card minimizes. The character's **state changes visually:**
- Walks to the nearest desk or relevant prop
- Sits down
- Starts a "working" animation loop (typing, reading, thinking)

Behind the scenes, Claude API starts processing. As the response streams, the app parses it into **activity phase labels:**
- "reading…"
- "forming ideas…"
- "writing draft…"
- "almost done…"

These rotate through a **speech bubble** above the character's head.

---

### Phase 4 — The Living Scene

Now the magic: multiple characters in the same world, all doing different things at once. The user can glance at the scene and understand the state of everything without opening a single panel.

**Character states and their visual expressions:**

| State | Animation | Speech Bubble |
|---|---|---|
| Idle | Gentle weight shift | Empty or ambient thought |
| Working | Typing / reading loop | Current activity phrase |
| Thinking | Pacing slowly | "hmm…" |
| Waiting for input | Standing still, looking at user | "Your turn!" |
| Done | Celebration bounce | "Done! Click me ✨" |
| Error | Head shake | "Something went wrong" |

When a task finishes:
- Character does a small celebration animation
- Optional notification chime
- Speech bubble: *"Done! Click me to see results"*

---

### Phase 5 — Viewing Results

User clicks the character → agent card expands to show:
- Full task output, formatted nicely
- Option to **copy**, **continue the conversation**, or **assign a new task**
- Short task history (last 3–5 tasks)

Characters **remember their last task** (short-term memory stored per agent in the backend). Users can pick up mid-conversation or start fresh.

---

### Phase 6 — Agent-to-Agent Interaction (Roadmap)

Long-term vision: characters can **hand off work to each other**.

The researcher passes notes to the writer. The writer passes a draft to the editor. Visually, they walk toward each other, a small handoff animation plays, and the second agent's task auto-populates with the first agent's output.

This mirrors real multi-agent orchestration patterns in a way that's immediately legible without reading any logs.

---

### The Emotional Arc

| Step | What happens | How it feels |
|---|---|---|
| Build scene | User tiles a world | Creative, low-stakes |
| Create character | Describe → see it appear | Magical, personal |
| Accept character | Drops into your world | Ownership |
| Assign task | Type → character starts moving | Satisfying |
| Watch scene | Multiple agents working | Calm, ambient delight |
| Task completes | Celebration + notification | Rewarding |
| Click agent | See full output | Useful |

---

## 4. Technical Architecture

### Frontend
- **React + TypeScript**
- **HTML Canvas** (2D context) for the game world rendering — character sprites, tile grid, animations, speech bubbles
- **React** for all UI overlays — agent cards, task input, scene editor panels, character creation flow
- **Vite** for bundling
- Canvas renders at pixel-perfect integer zoom levels (1x, 2x, 3x)

### Backend
- **Node.js / Express** or serverless functions (Vercel/Cloudflare Workers)
- **WebSockets** for real-time streaming of agent state updates to the frontend
- **Claude API** (`claude-sonnet-4-20250514`) for:
  - Pixel sprite generation (JSON grid output)
  - Task execution and streaming
  - Activity phase narration
- **Database** (Postgres or SQLite) for:
  - User scenes (tile layouts, prop placements)
  - Character definitions (name, description, sprite data)
  - Task history per character

### Agent State Machine (per character)
```
IDLE → WORKING → THINKING → WAITING_FOR_INPUT → DONE
              ↓
            ERROR
```
State transitions are emitted as events over WebSocket, consumed by the canvas renderer to switch animations.

### Pixel Sprite Format (v1)
Claude generates sprites as a JSON array of hex color strings:
```json
{
  "width": 16,
  "height": 16,
  "frames": {
    "idle": [["#3a1a5c", "#3a1a5c", ...], ...],
    "walk_1": [...],
    "walk_2": [...],
    "work": [...]
  }
}
```
The canvas renderer draws each frame pixel-by-pixel, scaled up 2x or 3x for crispness.

---

## 5. Honest Assessment — Strengths & Risks

### Strengths

1. **The character creation loop is the killer feature.** Describing a character and watching it appear, then accepting or rejecting it — this is sticky, delightful, and nothing else does it this way. It creates immediate emotional investment.

2. **Scene-first is the right order.** Building the world before populating it means users are emotionally invested before any AI is involved. The Sims proved this pattern: people spend hours building before they play.

3. **The visual state machine solves a real problem.** Managing multiple concurrent AI tasks is genuinely confusing (the original Pixel Agents was built to solve exactly this pain). Turning task state into character body language is a better interface than any dashboard.

4. **Market timing is excellent.** Pixel Agents hit 3.6k stars in days. The appetite for playful, human-feeling AI interfaces is real and hot right now.

5. **No developer setup required.** This is the biggest expansion over Pixel Agents — anyone can use it, not just Claude Code users.

### Risks & Hard Problems

1. **Pixel art generation quality.** Claude generating 16×16 grids will produce simple, charming sprites — but not detailed ones. Users who expect Pokémon-quality characters will be disappointed. This needs to be framed as a *feature* (lo-fi, consistent, cute) not a limitation.

2. **Defining what "tasks" mean.** Do agents do real work (call APIs, browse the web, write files)? Or simulated work (Claude narrating in character)? This is the biggest architectural fork and needs to be decided before building. Recommendation: start with **real tasks, simple scope** — text generation, research synthesis, brainstorming. No file system access in v1.

3. **API cost at scale.** Every character is a running Claude API session. If a user has 8 characters all doing tasks simultaneously, that's 8 concurrent API calls. Cost management (rate limiting, queuing, user API key input) needs to be thought through before launch.

4. **The "waiting for input" problem.** Detecting when an agent genuinely needs the user's attention vs. is just processing is harder than it looks. Since we own the agent loop (unlike Pixel Agents which observed an external process), we can emit explicit state events — but the prompt engineering to get Claude to signal "I need input" reliably still needs work.

5. **Audience clarity.** There are three possible framings:
   - **Productivity tool** — real agents doing real tasks (higher utility, less delight)
   - **Entertainment/simulation** — agents living in your world (highest delight, unclear monetization)
   - **Personal creative toy** — agents with personalities doing your tasks in a world you made (sweet spot)

   Lean into the third framing.

---

## 6. What to Build First (Recommended Build Order)

### Milestone 1 — Character Creation Proof of Concept
- Static canvas rendering a 32×32 grid
- Text input → Claude API → JSON sprite → rendered on canvas
- Accept / Regenerate / Refine loop
- If this moment feels magical, keep building

### Milestone 2 — Scene Builder
- Tile painting (floor types)
- Prop placement (desk, tree, chair)
- Save/load layout as JSON

### Milestone 3 — Character Lives in the Scene
- Accepted character drops into scene
- Idle animation
- BFS pathfinding so it can walk between tiles
- Multiple characters coexist

### Milestone 4 — Task Assignment
- Click character → agent card
- Type task → Claude API streams response
- Activity phases parsed from stream → speech bubble
- State machine drives animation

### Milestone 5 — Polish
- Task completion notification + animation
- Task history per character
- Multiple simultaneous agents
- Sound effects

### Milestone 6 — Agent Handoff (v2)
- Character A output → Character B input
- Walk-toward-each-other handoff animation
- Visual pipeline between agents

---

## 7. Open Questions Before Building

1. **Will you use your own Claude API key or build a backend that proxies requests?** (Cost model decision)
2. **What are the 5 starter task types you'll support in v1?** (Scoping the prompt engineering work)
3. **What art style do you want for environment tiles?** (Need a tileset — either hand-made, purchased, or AI-generated ahead of time)
4. **Single-player only, or can users share their world with others?** (Multiplayer changes the backend significantly)
5. **What's the business model?** Free with API key input? Subscription with your key on backend? Credits?

---

## 8. One-Line Summary

> A browser toy where you build a little world, describe characters to an AI and watch them appear as pixel sprites, assign tasks to them, and see a living scene of cute agents working — click any one to see what it's up to.