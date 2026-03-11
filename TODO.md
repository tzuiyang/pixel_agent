# PIXEL AGENT — DETAILED TODO

> Building from zero. Ordered by dependency — each phase unlocks the next. Every task includes what to build, where it lives, and why it matters.

## STATUS: Phases 0-8 COMPLETE (2026-03-11)
- 13 test files, 148 unit tests, all passing
- Full backend: Express + WebSocket + SQLite + Claude API integration
- Full frontend: React + Canvas + Tailwind, scene rendering, character creation, agent inspector
- Phase 5: Multi-agent concurrency (max 3 concurrent, queue system)
- Phase 6: Scene editor (tile painter, prop placer, undo stack, keyboard shortcuts)
- Phase 7: Agent handoff pipelines ({{previousOutput}} template chaining)
- Phase 8: Polish (sound effects, onboarding guide, sprite caching, WS exponential backoff)
- `npm run dev` starts both client (5173) and server (3001)
- Add your ANTHROPIC_API_KEY to .env to enable sprite generation and task execution

---

## PHASE 0: Project Scaffolding

Before any features, the project needs a skeleton. This is pure infrastructure — no user-facing functionality yet.

### 0.1 Initialize Monorepo Structure
**Why:** Clean separation between frontend (canvas + React) and backend (API + WebSocket) from day one prevents painful refactors later.

- [ ] Create directory structure:
  ```
  pixel_agent/
  ├── client/          # React + Canvas frontend
  ├── server/          # Express + WebSocket backend
  ├── shared/          # Shared types and constants
  ├── assets/          # Tilesets, preset sprites, sounds
  ├── package.json     # Root scripts
  └── .env             # API keys, config
  ```
- [ ] Initialize git repo with `.gitignore` (node_modules, .env, dist, .DS_Store)
- [ ] Create root `package.json` with `concurrently` for running client + server together
- [ ] Add scripts: `npm run dev`, `npm run client`, `npm run server`, `npm run install:all`

### 0.2 Set Up Frontend (React + Vite + TypeScript)
**Why:** Vite gives instant HMR. TypeScript catches bugs at compile time — critical for canvas coordinate math and state machines.

- [ ] Initialize Vite project with React + TypeScript template in `client/`
- [ ] Install and configure Tailwind CSS (for UI overlays, not the canvas)
- [ ] Set up Vite proxy: `/api` → `http://localhost:3001`
- [ ] Create basic `App.tsx` with a placeholder canvas element
- [ ] Verify hot reload works with a hello-world render

### 0.3 Set Up Backend (Express + TypeScript)
**Why:** The backend manages agent orchestration, Claude API calls, and WebSocket events. TypeScript ensures type safety across the stack.

- [ ] Initialize Express server in `server/` with TypeScript (ts-node or tsx)
- [ ] Add CORS, JSON body parser, dotenv
- [ ] Create `/api/health` endpoint returning `{ status: "ok" }`
- [ ] Set up WebSocket server (ws library) alongside Express
- [ ] Verify frontend can hit `/api/health` through Vite proxy

### 0.4 Set Up Shared Types
**Why:** Agent states, sprite formats, and scene data structures are used by both frontend and backend. Single source of truth prevents drift.

- [ ] Create `shared/types.ts` with initial types:
  - `AgentState` enum: `idle | working | thinking | waiting | done | error`
  - `SpriteData` interface: `{ width, height, frames: Record<string, string[][]> }`
  - `Character` interface: `{ id, name, description, sprite, position, state, currentTask }`
  - `Scene` interface: `{ id, name, width, height, tiles, props, characters }`
  - `Task` interface: `{ id, characterId, prompt, status, output, createdAt }`
  - `WSEvent` type: discriminated union of all WebSocket event types
- [ ] Configure TypeScript path aliases so both client and server can import from `shared/`

### 0.5 Set Up Database (SQLite)
**Why:** SQLite is zero-config, file-based, perfect for v1. Scenes, characters, and task history need to survive server restarts.

- [ ] Install `better-sqlite3` in server
- [ ] Create `server/db/schema.sql` with tables:
  - `scenes` (id, name, layout_json, created_at, updated_at)
  - `characters` (id, scene_id, name, description, sprite_json, position_x, position_y, state, created_at)
  - `tasks` (id, character_id, prompt, status, output, started_at, completed_at)
- [ ] Create `server/db/index.ts` — init DB, run migrations on startup
- [ ] Seed with one default scene layout for development

---

## PHASE 1: Character Creation (The Magic Moment)

This is the make-or-break feature. If describing a character and seeing it appear as a pixel sprite doesn't feel delightful, nothing else matters. Build this first and validate it.

### 1.1 Build the Sprite Generation Prompt
**Files:** `server/services/spriteGenerator.ts`
**Why:** The quality of generated sprites depends entirely on the prompt. This needs careful engineering with examples and constraints.

- [ ] Design Claude prompt for 16x16 pixel sprite generation:
  - System message establishing pixel art expertise and JSON output format
  - Include 2-3 example input/output pairs (few-shot) showing good sprites
  - Constrain color palette to 8-12 colors max for consistency
  - Require transparent background (use `null` or `"transparent"` in grid)
  - Request multiple frames: `idle` (2 frames), `walk` (2 frames), `work` (2 frames)
  - Include anti-instructions: no gradients, no sub-pixel details, clean outlines
- [ ] Implement `generateSprite(description: string): Promise<SpriteData>` function
- [ ] Add input validation: description length limits, sanitization
- [ ] Add output validation: verify JSON structure, check dimensions, validate hex colors
- [ ] Handle generation failures gracefully (retry once with adjusted prompt)
- [ ] Test with 10+ character descriptions, save results for quality review:
  - "a tiny wizard with a purple robe and glowing staff"
  - "a cyberpunk hacker girl with neon green hair"
  - "a sleepy golden retriever in a business suit"
  - "a robot chef with a tall white hat"
  - "a ninja cat with a red bandana"
  - etc.

### 1.2 Build the Canvas Sprite Renderer
**Files:** `client/src/canvas/SpriteRenderer.ts`
**Why:** The sprite needs to render pixel-perfect at integer scale factors. Sub-pixel rendering ruins pixel art.

- [ ] Create `SpriteRenderer` class that takes a `SpriteData` object
- [ ] Render method: iterate through 2D color array, draw each pixel as a filled rectangle at scale
- [ ] Support scale factors: 2x, 3x, 4x (configurable)
- [ ] Disable canvas anti-aliasing (`imageSmoothingEnabled = false`) — critical for pixel art
- [ ] Handle transparent pixels (skip drawing or use checkerboard preview)
- [ ] Implement frame animation: cycle through `idle` frames at configurable FPS (4-6 FPS for pixel art)
- [ ] Add code-based animation modifiers:
  - Bounce: subtle y-offset oscillation
  - Squash-and-stretch: scale x/y slightly on landing
  - Bob: gentle floating motion for idle

### 1.3 Build the Character Creation UI
**Files:** `client/src/components/CharacterCreator.tsx`
**Why:** This is the primary user interaction. It needs to feel like a vending machine — type, see result, love it or try again.

- [ ] Create modal/panel component with:
  - Text input field for character description
  - "Generate" button
  - Loading state with fun message ("Sketching your character...")
  - Preview canvas showing generated sprite at 4x scale with idle animation
  - Three action buttons:
    - **Accept** — saves character, closes modal
    - **Regenerate** — same description, new generation
    - **Refine** — text input expands for additional details, re-generates with combined prompt
  - Character name input (auto-suggested by Claude, editable by user)
- [ ] Wire up to `/api/character/generate` endpoint
- [ ] Handle API errors: show retry option, not just error text
- [ ] Add generation counter ("Attempt 3 of 5") to prevent infinite regeneration

### 1.4 Build Character Generation API Endpoint
**Files:** `server/routes/character.ts`
**Why:** Frontend needs a clean API to request sprite generation and save accepted characters.

- [ ] `POST /api/character/generate` — takes `{ description }`, returns `{ sprite, suggestedName }`
  - Calls `spriteGenerator.generateSprite()`
  - Also asks Claude to suggest a name based on the description
  - Returns sprite data + name suggestion
- [ ] `POST /api/character/save` — takes `{ sceneId, name, description, sprite, position }`, saves to DB
  - Validates sprite data structure
  - Assigns default position if none provided
  - Returns saved character with ID
- [ ] `GET /api/character/:id` — returns character data
- [ ] `DELETE /api/character/:id` — removes character from scene and DB

### 1.5 Validate the Magic Moment
**Why:** Before building anything else, test this with real users. If the character creation loop isn't delightful, iterate on prompts and UI before moving forward.

- [ ] Generate 20+ characters with varied descriptions
- [ ] Evaluate sprite quality: are they charming? consistent? recognizable?
- [ ] Test the accept/reject/refine loop: does refining actually improve results?
- [ ] Measure latency: how long does generation take? (target: under 5 seconds)
- [ ] Get feedback from 2-3 people: "Does this feel magical?"
- [ ] If sprites are too simple at 16x16, test 32x32 (more detail but slower generation)
- [ ] Document what works and what doesn't — adjust prompts accordingly

---

## PHASE 2: Scene Rendering

The character needs a world to live in. Start with pre-built templates, not a full scene editor.

### 2.1 Design the Tile System
**Files:** `shared/types.ts`, `client/src/canvas/TileRenderer.ts`
**Why:** Everything in the scene — floors, walls, furniture — is a tile on a grid. The tile system is the foundation for all scene rendering.

- [ ] Define tile types:
  - Floor tiles: wood, stone, grass, sand, carpet (each as a small pixel pattern or solid color)
  - Wall tiles: brick, glass, hedge
  - Props: desk, chair, bookshelf, plant, computer, coffee machine, lamp, rug
- [ ] Create `Tile` interface: `{ type, x, y, walkable, interactable }`
- [ ] Build `TileRenderer` that draws the full grid:
  - Iterate through 2D tile array
  - Draw each tile as a colored/patterned rectangle
  - Layer order: floor → walls → props → characters → UI overlays
- [ ] Create or source a simple 16x16 tileset (hand-drawn or purchased pixel art pack)
  - **Decision needed:** hand-make tiles for style consistency, or use an existing free tileset?

### 2.2 Create Pre-Built Room Templates
**Files:** `server/data/rooms.ts` or `assets/rooms/`
**Why:** Building a scene from scratch is too much friction for first use. Templates get users to the fun part (characters) immediately.

- [ ] Design 4 room templates as JSON tile layouts:
  - **Office** — desks, monitors, whiteboards, coffee machine, plants
  - **Apartment** — couch, bookshelf, desk area, kitchen corner, rug
  - **Lab** — workbenches, server racks, monitors, cables, science equipment
  - **Beach Hut** — sand floor, palm trees, hammock, tiki desk, ocean background
- [ ] Each room: 32x32 grid, pre-placed props, defined walkable areas
- [ ] Include "workstation" positions — specific tiles where characters sit when working
- [ ] Create room selection UI: grid of room thumbnails, click to choose

### 2.3 Build the Scene Canvas
**Files:** `client/src/canvas/SceneCanvas.tsx`
**Why:** This is the main viewport — the living world the user sees. Everything else overlays on top of it.

- [ ] Create full-screen (or main area) canvas component
- [ ] Render selected room template using `TileRenderer`
- [ ] Implement camera/viewport:
  - Pan with click-drag or arrow keys
  - Zoom with scroll wheel (integer scale factors only: 1x, 2x, 3x)
  - Center on scene by default
- [ ] Render characters on top of scene at their grid positions
- [ ] Implement render loop using `requestAnimationFrame`
- [ ] Handle canvas resize on window resize
- [ ] Add click detection: translate canvas coordinates to grid coordinates to identify clicked character/prop

### 2.4 Character Placement and Movement
**Files:** `client/src/canvas/CharacterController.ts`
**Why:** Characters need to walk to workstations when given tasks and back to idle positions when done.

- [ ] Place accepted character at a walkable tile in the scene
- [ ] Implement simple BFS pathfinding on the walkable tile grid
- [ ] Animate character movement: lerp between tiles at a consistent speed
- [ ] Walking animation: alternate between `walk_1` and `walk_2` frames
- [ ] Character faces direction of movement (flip sprite horizontally for left/right)
- [ ] When given a task: character pathfinds to nearest workstation, sits, starts working animation
- [ ] When idle: character stands at idle position with idle animation

---

## PHASE 3: Agent System (The Brain)

Characters become agents — they can receive tasks, execute them via Claude API, and report results.

### 3.1 Build the Agent State Machine
**Files:** `server/services/agentStateMachine.ts`
**Why:** Every character needs a deterministic state machine that drives both backend behavior (when to call Claude) and frontend animation (what to show).

- [ ] Implement state machine with transitions:
  ```
  idle → working (on task assigned)
  working → thinking (on Claude processing)
  thinking → working (on tool result received)
  working → waiting (on input needed)
  waiting → working (on user input received)
  working → done (on task complete)
  working → error (on failure)
  done → idle (after results viewed)
  error → idle (after error acknowledged)
  ```
- [ ] Each transition emits a WebSocket event to frontend
- [ ] State persisted to database so it survives server restarts
- [ ] Include metadata per state: current activity description, progress estimate

### 3.2 Build the Claude Task Executor
**Files:** `server/services/taskExecutor.ts`
**Why:** This is the actual AI work — taking a user's task, sending it to Claude with streaming, and parsing the response into activity phases.

- [ ] Implement `executeTask(character: Character, prompt: string)`:
  - Build Claude message with character personality context
  - Stream response using Anthropic SDK streaming API
  - Parse stream into activity phases:
    - Detect reasoning → emit "thinking" state
    - Detect content generation → emit "writing" state with preview
    - Detect tool use → emit "researching" / "reading" state
    - Detect completion → emit "done" state with full output
  - Save complete output to database
- [ ] Design activity phase parser:
  - Split Claude response into logical chunks
  - Generate user-friendly activity labels: "forming ideas...", "writing draft...", "reviewing..."
  - These labels appear in the character's speech bubble
- [ ] Handle streaming errors gracefully: retry once, then emit error state
- [ ] Implement task cancellation: user can cancel a running task

### 3.3 Build the WebSocket Event Layer
**Files:** `server/services/wsManager.ts`, `client/src/lib/wsClient.ts`
**Why:** Real-time state updates are what make the scene feel alive. Polling would add latency and kill the ambient feel.

- [ ] Server-side: `WSManager` class
  - Manage connected clients
  - Broadcast agent state changes to all connected clients
  - Event types: `agent_state_change`, `agent_activity`, `agent_output`, `agent_error`
  - Include character ID and metadata in every event
- [ ] Client-side: `wsClient` singleton
  - Connect on app load, reconnect on disconnect
  - Event listener pattern: `wsClient.on('agent_state_change', handler)`
  - Buffer events if received during reconnection
- [ ] Map WebSocket events to canvas updates:
  - `agent_state_change` → switch character animation
  - `agent_activity` → update speech bubble text
  - `agent_output` → store result, show "Done! Click me" bubble

### 3.4 Build the Agent Inspector Panel
**Files:** `client/src/components/AgentInspector.tsx`
**Why:** The inspector is how users understand what their agent is actually doing. Without it, the animations are cute but opaque.

- [ ] Create slide-in panel triggered by clicking a character on canvas:
  - Character sprite preview (animated)
  - Character name and description
  - Current task (if any)
  - Current state with human-readable label
  - Activity log: timestamped list of recent actions
  - Progress indicator (if estimable)
- [ ] When task is complete:
  - Full output displayed in formatted markdown
  - "Copy" button for output text
  - "New Task" button to assign another task
  - Task history (last 3-5 tasks, collapsible)
- [ ] When agent is in error state:
  - Show error message
  - "Retry" button
  - "Dismiss" button (returns to idle)

### 3.5 Build the Task Input UI
**Files:** `client/src/components/TaskInput.tsx`
**Why:** This is how users communicate with their agents. It needs to be fast and frictionless.

- [ ] Click character on canvas → agent card appears near the character
- [ ] Text input field with placeholder: "What should [name] work on?"
- [ ] Send button + Enter key to submit
- [ ] Show character's current state in the card header
- [ ] If character is already working: show current task, offer "Cancel" option
- [ ] Task suggestions for new users: "Research...", "Write...", "Brainstorm..."
- [ ] Input validation: minimum 5 characters, maximum 1000

---

## PHASE 4: Speech Bubbles & Visual Feedback

The visual language that makes the scene legible at a glance.

### 4.1 Build Speech Bubble Renderer
**Files:** `client/src/canvas/SpeechBubble.ts`
**Why:** Speech bubbles are the primary information layer between the canvas and the user. They communicate agent state without requiring clicks.

- [ ] Render pixel-art style speech bubble above character:
  - Rounded rectangle with small triangle pointer
  - Text inside: short activity phrase (max ~30 chars)
  - Auto-position to avoid overlapping other characters or going off-screen
- [ ] Different bubble styles per state:
  - Thinking: thought bubble (cloud shape with dots)
  - Working: standard speech bubble with activity text
  - Done: green-tinted bubble with sparkle effect
  - Error: red-tinted bubble with warning icon
  - Waiting: pulsing bubble to draw attention
- [ ] Animate bubble appearance: pop-in with slight overshoot
- [ ] Cycle through activity labels if multiple (fade transition between phrases)

### 4.2 Build Notification System
**Files:** `client/src/components/NotificationToast.tsx`
**Why:** If the user has scrolled away or is focused on another character, they need to know when a task finishes.

- [ ] Toast notification when task completes: "[Character Name] finished their task!"
- [ ] Click toast to jump camera to character and open inspector
- [ ] Optional browser notification (request permission) for background tab completion
- [ ] Notification queue: if multiple finish at once, stack them
- [ ] Auto-dismiss after 5 seconds, or click to dismiss

---

## PHASE 5: Multiple Agents

The scene comes alive when multiple characters work simultaneously.

### 5.1 Support Multiple Characters in Scene
**Files:** `client/src/canvas/SceneCanvas.tsx`, `server/routes/character.ts`
**Why:** The "living scene" vision requires multiple agents. One character is a demo; three characters is a world.

- [ ] Allow 2-5 characters per scene (limit for v1 — API cost control)
- [ ] Each character gets its own position, state machine, and task queue
- [ ] Characters don't overlap: collision detection on grid positions
- [ ] Z-ordering: characters in front (higher y) render on top of characters behind
- [ ] Clicking canvas accurately selects the correct character when overlapping

### 5.2 Concurrent Task Execution
**Files:** `server/services/taskExecutor.ts`, `server/services/agentStateMachine.ts`
**Why:** Multiple agents working simultaneously is the core value proposition over a simple chatbot.

- [ ] Allow parallel Claude API calls (one per active agent)
- [ ] Rate limiting: max 3 concurrent API calls to control cost
- [ ] Task queue: if all slots are full, queue additional tasks with "waiting in line" state
- [ ] Each agent streams independently — WebSocket events include character ID for routing
- [ ] Handle partial failures: one agent's error doesn't affect others

### 5.3 Agent Awareness of Each Other
**Files:** `server/services/taskExecutor.ts`
**Why:** Agents in the same scene should be aware of each other for potential collaboration.

- [ ] Include scene context in Claude prompt: "You are [name] in a [scene type]. Other agents in the scene: [list names and current tasks]"
- [ ] This doesn't create real coordination yet — just awareness for more natural responses
- [ ] Foundation for Phase 7's agent-to-agent handoff

---

## PHASE 6: Scene Editor (Post-MVP)

Let users build custom worlds, not just use templates.

### 6.1 Build Tile Painter
**Files:** `client/src/components/SceneEditor.tsx`, `client/src/canvas/TilePainter.ts`
**Why:** Creative expression. Users who build their own world are more invested.

- [ ] Tool palette with floor types: click to select, click-drag on canvas to paint
- [ ] Erase tool to reset tiles to default
- [ ] Fill tool for large areas
- [ ] Visual feedback: hover preview shows tile before placement
- [ ] Undo/redo stack (Ctrl+Z / Ctrl+Shift+Z)

### 6.2 Build Prop Placer
**Files:** `client/src/components/SceneEditor.tsx`, `client/src/canvas/PropPlacer.ts`
**Why:** Props (desk, bookshelf, plant) make the scene personal and define where agents can work.

- [ ] Prop library panel with categorized items:
  - Furniture: desk, chair, couch, bed, table
  - Tech: computer, server, monitor, headphones
  - Decor: plant, lamp, rug, picture frame, bookshelf
  - Outdoor: tree, bench, fountain, flower pot
- [ ] Click-to-place: select prop, click on tile to place
- [ ] Rotation: R key to rotate prop 90 degrees
- [ ] Delete: right-click prop to remove
- [ ] Mark workstations: certain props (desk, computer) are tagged as workstations where agents sit when working
- [ ] Save layout to database via `/api/scene/save`

### 6.3 Save/Load Custom Scenes
**Files:** `server/routes/scene.ts`
**Why:** Users want to keep their worlds across sessions.

- [ ] `POST /api/scene/save` — saves tile layout + props as JSON to DB
- [ ] `GET /api/scene/:id` — loads a scene
- [ ] `GET /api/scenes` — lists user's saved scenes
- [ ] `DELETE /api/scene/:id` — deletes a scene
- [ ] Auto-save on every edit (debounced, 2-second delay)

---

## PHASE 7: Agent Collaboration (v2)

### 7.1 Agent-to-Agent Handoff
**Files:** `server/services/agentOrchestrator.ts`, `client/src/canvas/HandoffAnimation.ts`
**Why:** Multi-agent pipelines (researcher → writer → editor) are the natural evolution. Visual handoff makes it legible.

- [ ] Allow user to define a pipeline: "When [Agent A] finishes, pass output to [Agent B]"
- [ ] Backend: on task completion, auto-create task for next agent with previous output as context
- [ ] Visual: Agent A walks toward Agent B, small document-pass animation, Agent B starts working
- [ ] Pipeline status visible in a sidebar: which agent is active, which is waiting

### 7.2 Agent Conversations
**Files:** `server/services/agentConversation.ts`
**Why:** Agents discussing work creates emergent behavior and delightful observations.

- [ ] Two agents can be linked for back-and-forth conversation
- [ ] Visual: agents walk to face each other, alternating speech bubbles
- [ ] Backend: ping-pong Claude calls with conversation history
- [ ] User can observe or join the conversation
- [ ] Limit: 10 turns max to prevent runaway API costs

---

## PHASE 8: Polish & Production

### 8.1 Sound Design
- [ ] Ambient background music per scene type (lo-fi, nature, sci-fi)
- [ ] Character action sounds: keyboard clicks when typing, page flip when reading
- [ ] Notification chime on task completion
- [ ] Volume controls + mute toggle
- [ ] Use Web Audio API for low-latency playback

### 8.2 Onboarding Flow
- [ ] First-visit tutorial: guided steps with tooltips
- [ ] Default starter character pre-generated (skip straight to task assignment)
- [ ] Suggested first task to demonstrate the full loop
- [ ] "Time to first magic moment" target: under 60 seconds

### 8.3 Performance Optimization
- [ ] Canvas: only re-render dirty regions, not full canvas every frame
- [ ] Sprite caching: pre-render scaled sprites to offscreen canvases
- [ ] WebSocket: debounce rapid state changes (no more than 10 events/second per agent)
- [ ] Lazy load room templates and assets
- [ ] Memory management: dispose canvas resources for removed characters

### 8.4 Error Resilience
- [ ] WebSocket auto-reconnect with exponential backoff
- [ ] API timeout handling: if Claude takes >60s, show "Taking longer than usual..."
- [ ] Database backup: auto-backup SQLite file daily
- [ ] Graceful degradation: if WebSocket fails, fall back to polling

### 8.5 User Accounts (If Needed)
- [ ] Simple auth: email + password or OAuth (Google/GitHub)
- [ ] Associate scenes and characters with user accounts
- [ ] User settings: preferred scene, notification preferences
- [ ] Data export: download all scenes/characters as JSON

---

## Quick Reference: Build Order

```
Phase 0 (Scaffolding)            ← Infrastructure, ~1 day
  0.1 Monorepo structure
  0.2 Frontend setup
  0.3 Backend setup
  0.4 Shared types
  0.5 Database

Phase 1 (Character Creation)     ← THE critical feature, validate before anything else
  1.1 Sprite generation prompt
  1.2 Canvas sprite renderer
  1.3 Character creation UI
  1.4 API endpoints
  1.5 Validate the magic moment   ← STOP HERE if this doesn't feel magical. Iterate.

Phase 2 (Scene Rendering)        ← Give characters a world to live in
  2.1 Tile system
  2.2 Room templates
  2.3 Scene canvas
  2.4 Character movement

Phase 3 (Agent System)           ← Characters become agents with real AI tasks
  3.1 State machine
  3.2 Claude task executor
  3.3 WebSocket events
  3.4 Agent inspector
  3.5 Task input UI

Phase 4 (Visual Feedback)        ← Make the scene legible at a glance
  4.1 Speech bubbles
  4.2 Notifications

Phase 5 (Multiple Agents)        ← The "living scene" vision
  5.1 Multi-character support
  5.2 Concurrent execution
  5.3 Agent awareness

Phase 6 (Scene Editor)           ← Post-MVP creative tools
Phase 7 (Agent Collaboration)    ← v2 multi-agent orchestration
Phase 8 (Polish & Production)    ← Sound, onboarding, performance, auth
```

---

## Critical Decision Points

| Decision | When | Options | Recommendation |
|----------|------|---------|----------------|
| Canvas library | Phase 0.2 | Raw Canvas 2D vs Phaser.js vs PixiJS | Start with raw Canvas 2D — less abstraction, full control. Move to PixiJS if sprite management gets painful. |
| Sprite resolution | Phase 1.1 | 16x16 vs 32x32 | Start with 16x16. Simpler for Claude to generate, faster, more "retro." Try 32x32 if quality is insufficient. |
| API key model | Phase 3.2 | User provides key vs backend proxy | User provides key for v1 (zero cost for you). Backend proxy for v2 if you want to monetize. |
| Tileset source | Phase 2.1 | Hand-drawn vs purchased vs AI-generated | Purchase a quality pixel art tileset for consistency. Hand-draw if you want total control. |
| Database | Phase 0.5 | SQLite vs PostgreSQL | SQLite for v1 (zero config). Migrate to Postgres if you need multi-user or cloud deployment. |
