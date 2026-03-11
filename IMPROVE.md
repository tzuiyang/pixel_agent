# PIXEL AGENT — IMPROVEMENT PLAN

> How to take this from a working prototype to something genuinely impressive. Organized by impact tier.

---

## TIER 1: Fix the Broken Core (Do These First)

These aren't features — they're prerequisites for the app to actually work as promised.

### 1.1 Fix the Scene Editor State Sync
The scene editor is fundamentally broken. `SceneEditorWithRef` has its own tool/selection state that never updates when the user clicks tools in `SceneEditor`. The fix requires either:
- **Option A:** Lift all editor state up to `SceneEditorWrapper` and pass it down to both `SceneEditor` (for UI) and `useImperativeHandle` (for canvas clicks)
- **Option B:** Ditch the `CustomEvent` bridge pattern entirely. Have `SceneEditor` directly receive click coordinates and handle tile modification itself via `onTileClick` callbacks

Option B is cleaner. The current architecture has the tile-modification logic duplicated in two places (SceneEditor's `handleTileClick` AND SceneEditorWithRef's `useImperativeHandle`), and they're out of sync.

### 1.2 Make Characters Spawn at Unique Positions
Characters should not all spawn at (5,5). When saving a character:
- Find all occupied positions in the scene
- BFS from center of the room to find the nearest unoccupied walkable tile
- Place the new character there
- This also requires characters to actually KNOW about each other's positions

### 1.3 Wire Up `agent_activity` WebSocket Events
The server emits these beautiful real-time progress updates ("Forming ideas...", "Writing response...", "Almost done...") and the client throws them away. Add a fourth `wsClient.on('agent_activity', ...)` handler in App.tsx that updates the character's `currentTask` text so speech bubbles show live progress.

### 1.4 Make Characters Walk to Workstations
The pathfinding system exists, `CharacterEntity.moveToWorkstation()` exists, but nothing triggers it. When `agent_state_change` fires with `state: 'working'`:
- Get the character entity from `entitiesRef`
- Call `moveToWorkstation(tileRendererRef.current)`
- This is literally the visual soul of the app

### 1.5 Fix Task Route Ordering
Move `GET /task/status` ABOVE `GET /task/:id` in `server/routes/task.ts` so Express doesn't treat "status" as an ID parameter.

---

## TIER 2: Make It Feel Real (High-Impact Features)

### 2.1 Real Sprite Animation System
Currently all sprites have 3 frames (idle_1, idle_2, work) and the animation cycling is buggy (double-counting deltaMs). Redesign the animation system:
- **Walk cycle:** 2-frame walk animation triggered during pathfinding movement. Flip sprite horizontally based on direction.
- **Working animation:** Character sits at desk with typing motion — subtle up/down of the arms
- **Thinking animation:** Character looks up with thought dots cycling
- **Celebration:** Quick sparkle/jump when task completes
- **Error animation:** Character slumps or shows frustration

The sprite generator prompt should request 6 named frames: `idle_1`, `idle_2`, `walk_1`, `walk_2`, `work`, `celebrate`.

### 2.2 Character Collision & Smart Placement
- Characters should never overlap on the same tile
- When multiple characters walk to workstations, they should pick DIFFERENT workstations
- Add a reservation system: when a character starts walking to a workstation, mark it as claimed so no other character picks it
- If all workstations are taken, character stands nearby and shows "Waiting for a desk..." bubble

### 2.3 Real-Time Activity Stream Panel
Add a persistent side panel (toggle with a button) showing a chronological feed of ALL agent activity:
```
[14:32:01] Pixel Wizard started: "Write a poem about clouds"
[14:32:03] Pixel Wizard: Thinking about the task...
[14:32:05] Pixel Wizard: Forming ideas...
[14:32:09] Pixel Wizard: Writing response...
[14:32:15] Pixel Wizard completed task (13s)
[14:32:15] Cyber Cat started: "Debug this function"
```
This gives users a "mission control" view of what's happening without clicking individual characters.

### 2.4 Pipeline UI — Visual Agent Chain Builder
The pipeline backend exists but there's no UI. Build:
- **Pipeline builder:** Drag characters into a sequence. Draw arrows between them. Set prompt templates for each step.
- **Pipeline monitor:** Show which step is active, completed, or pending. Live-update as each agent finishes and hands off to the next.
- **Template library:** Pre-built pipeline templates like "Research → Write → Edit" or "Brainstorm → Design → Review"

### 2.5 Markdown Output Rendering
Task output currently displays as raw text. Use a markdown renderer (react-markdown) in AgentInspector to properly render:
- Headers, bold, italic
- Code blocks with syntax highlighting
- Lists
- Links

This makes agent outputs dramatically more readable and professional.

---

## TIER 3: Make It Delightful (Polish & Personality)

### 3.1 Character Personality System
Right now character personality is just the visual description crammed into the Claude prompt. Expand to:
- **Personality traits:** User picks 2-3 traits during creation (analytical, creative, cheerful, sarcastic)
- **Communication style:** Affects how the agent writes — formal, casual, technical, poetic
- **Expertise areas:** "This character specializes in coding, design, writing..." — influences task routing suggestions
- **Idle behaviors:** Characters do random idle actions — stretch, yawn, check phone, wave at nearby characters

### 3.2 Inter-Character Ambient Interactions
When characters are idle and near each other:
- They occasionally "chat" — small speech bubbles with generic phrases
- They might wave or nod at each other
- If one is working while another is idle, the idle one could show "Watching [Name] work..." bubble
- All cosmetic, no API calls needed — just makes the scene feel alive

### 3.3 Sound Design v2
The current sound system is bare-bones synthesized tones. Upgrade:
- **Ambient background:** Gentle lo-fi beat per room type (office = keyboard clicks & coffee machine, lab = server hums, beach = waves)
- **Per-character sounds:** Each character gets a unique notification pitch
- **Typing sounds:** When an agent is "working," play quiet keyboard click sounds
- **Completion fanfare:** Satisfying chime cascade when a task finishes
- **UI sounds:** Hover effects, button clicks, panel slides — all pixel-art style blips
- **Volume per category:** Master, Ambient, Effects, UI — each independently adjustable

### 3.4 Day/Night Cycle
Visual atmosphere change over time:
- Tiles gradually shift color temperature throughout the day
- "Lamps" light up at night, creating warm glow circles
- Window tiles (wall_glass) show sky color changes
- Optional: sync with user's real-time clock

### 3.5 Particle Effects
Canvas-based particle system for:
- **Sparkles** when character completes a task
- **Exclamation marks** when character encounters an error
- **Thought bubbles** (floating ellipsis dots) when thinking
- **Confetti** on first character creation
- **Paper shuffle** when agent is writing
- Small, tasteful, not overwhelming — 4-6 particles max per effect

---

## TIER 4: Make It Smart (AI & Architecture)

### 4.1 Prompt Engineering Dashboard
Let users see AND customize the prompts that shape their agents:
- View the system prompt that gets sent to Claude for each task
- Edit character-specific context injections
- See token counts and estimated cost per task
- A/B test different prompt styles — "which personality gives better writing?"

### 4.2 Task Templates & Presets
Pre-built task templates for common use cases:
- "Research: Find the top 5..." (research tasks)
- "Write: Create a blog post about..." (writing tasks)
- "Analyze: Review this code/document..." (analysis tasks)
- "Brainstorm: Generate 10 ideas for..." (creativity tasks)
- Users can save their own templates

### 4.3 Agent Memory & Context
Characters should remember previous tasks:
- Summarize the last 3 task outputs and include in the next prompt
- "You previously researched X and wrote Y. Now..."
- Build a character-specific knowledge base over time
- Allow users to pin/unpin memories: "Remember this, forget that"

### 4.4 Cost Tracking Dashboard
Show users their API usage:
- Token count per task (input + output)
- Running total per session / per day
- Per-character usage breakdown
- Budget alerts: "You've used $2.50 today"
- Cost estimation before task execution: "This task will use ~2000 tokens (~$0.03)"

### 4.5 Export & Share System
- **Export scene:** Download scene + characters as a JSON file
- **Import scene:** Load someone else's scene
- **Screenshot:** One-click canvas screenshot (download as PNG)
- **Share output:** Generate a shareable link for a task's output
- **Scene gallery:** Browse and clone community-created scenes

---

## TIER 5: Make It Scalable (Infrastructure)

### 5.1 Migrate to Proper State Management
Current state management is raw `useState` in App.tsx with prop-drilling 5 levels deep. Migrate to:
- **Zustand** (lightweight, simple) or **Jotai** (atomic) for global state
- Separate stores: `useSceneStore`, `useCharacterStore`, `useTaskStore`, `useUIStore`
- No more passing `setCharacters` through 4 components

### 5.2 End-to-End Testing
Current tests are all unit tests. Add:
- **Playwright E2E tests:** Full user flows (create scene → create character → assign task → see output)
- **API integration tests:** Test the full Express pipeline with real SQLite
- **WebSocket integration tests:** Verify events propagate correctly
- **Visual regression tests:** Screenshot comparison for canvas rendering

### 5.3 Database Improvements
- **Migrations system:** Version-controlled schema changes instead of "run schema.sql on startup"
- **Position persistence:** Save character positions back to DB when they move
- **Pipeline persistence:** Move pipelines from in-memory Map to SQLite
- **Task pagination:** The current `LIMIT 10` is hardcoded — add proper cursor-based pagination
- **Indexes:** Add index on `characters.scene_id` and `tasks.character_id` for query performance

### 5.4 Authentication & Multi-User
- **Simple auth:** Email + password or OAuth (Google/GitHub)
- **Per-user scenes:** Users only see their own worlds
- **API key management:** Users bring their own Anthropic key, stored encrypted
- **Rate limiting per user:** Prevent one user from burning all resources
- **Session management:** JWT or session cookies

### 5.5 Deployment & DevOps
- **Docker setup:** Single `docker-compose up` to run the whole stack
- **Environment configs:** development / staging / production
- **Health monitoring:** Uptime checks, error rate alerts
- **Database backups:** Automated SQLite backup to S3 or equivalent
- **CI/CD pipeline:** GitHub Actions for test + build + deploy

---

## TIER 6: Make It Ambitious (Moonshot Ideas)

### 6.1 Voice Input
"Hey Pixel, write me a blog post about..." — use Web Speech API for voice-to-text task assignment. Characters could even show a "listening" animation.

### 6.2 Multi-User Collaborative Scenes
Multiple users viewing and interacting with the same scene:
- Shared character pool
- Real-time cursor visibility ("User A is looking at...")
- Collaborative task assignment
- Uses the existing WebSocket infrastructure, just needs room-based broadcasting

### 6.3 Plugin / Tool System for Agents
Let agents use real tools beyond just text generation:
- Web search tool (browse the web for research tasks)
- Code execution tool (run code snippets and return results)
- Image generation tool (create visual assets)
- File I/O tool (read/write local files with permission)

This turns characters from text generators into actual autonomous agents.

### 6.4 Mobile-Responsive Canvas
Currently the canvas is fixed-size based on tile count. For mobile:
- Pinch-to-zoom on the scene
- Tap characters to inspect
- Bottom sheet inspector instead of side panel
- Touch-friendly tile painting

### 6.5 AI-Generated Scenes
Instead of picking from 4 templates:
- "Create a cozy coffee shop with lots of plants"
- Claude generates a complete SceneLayout JSON with appropriate tiles, props, and workstations
- Same pipeline as sprite generation, just for room layouts

---

## Priority Matrix

| Improvement | Impact | Effort | Do When |
|---|---|---|---|
| Fix scene editor sync (1.1) | Critical | Low | NOW |
| Character spawn positions (1.2) | High | Low | NOW |
| Wire agent_activity events (1.3) | High | Trivial | NOW |
| Character walking (1.4) | High | Low | NOW |
| Fix route ordering (1.5) | High | Trivial | NOW |
| Markdown output (2.5) | High | Low | Week 1 |
| Activity stream panel (2.3) | High | Medium | Week 1 |
| Personality system (3.1) | Medium | Medium | Week 2 |
| Pipeline UI (2.4) | High | High | Week 2-3 |
| Cost tracking (4.4) | Medium | Medium | Week 2 |
| E2E tests (5.2) | Medium | High | Week 3 |
| State management (5.1) | Medium | Medium | Week 3 |
| Sound design v2 (3.3) | Low | Medium | Week 4 |
| Day/night cycle (3.4) | Low | Medium | Month 2 |
| Auth & multi-user (5.4) | High | High | Month 2 |
| Plugin/tool system (6.3) | Very High | Very High | Month 3+ |
