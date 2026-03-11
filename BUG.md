# PIXEL AGENT — BUG REPORT

> Bugs ranked by severity: CRITICAL > HIGH > MEDIUM > LOW > COSMETIC
> Each bug includes where it lives, how to reproduce it, and what happens.
>
> **STATUS: 29/30 bugs fixed.** Only BUG-003 (API key hygiene) and BUG-023 (pipeline persistence) remain as won't-fix/deferred.

---

## CRITICAL (App-breaking, data loss, security)

### BUG-001: Scene editor tool state is disconnected from canvas clicks
**Files:** `client/src/App.tsx` (lines 340-378), `client/src/components/SceneEditor.tsx`
**What:** The `SceneEditorWithRef` component inside App.tsx has its OWN `tool`, `selectedFloor`, `selectedProp` etc. state — but it renders `<SceneEditor>` which also has its OWN independent copies of those same states. When the user clicks a tool in the SceneEditor sidebar, it updates SceneEditor's local state, but the `useImperativeHandle` in `SceneEditorWithRef` still reads from its own never-changing defaults. So clicking the canvas ALWAYS paints `floor_wood` with the `floor` tool — no matter what the user selected in the sidebar.
**Reproduce:** Open scene editor > select "Wall" tool > select "Glass" wall > click on canvas. It paints wood floor, not glass wall.
**Impact:** Scene editor is fundamentally broken for all tools except the default (floor_wood).

### BUG-002: Stale closure in handleLayoutChange causes lost edits
**Files:** `client/src/App.tsx` (line 138-149)
**What:** `handleLayoutChange` captures `scene` via `useCallback` dependency. But `setScene({ ...scene, layout: newLayout })` uses the stale `scene` reference. If the user makes two rapid edits, the second one overwrites the first because it spreads from the old `scene` object instead of using the functional updater `setScene(prev => ...)`.
**Reproduce:** Rapidly click two different tiles in edit mode — only the second edit persists, the first is lost.
**Impact:** Data loss during scene editing.

### BUG-003: API key exposed in .env is committed to conversation history
**Files:** `.env`
**What:** The Anthropic API key `sk-ant-api03-...` was shared in the conversation and stored in the .env file. If this repo is ever pushed to a public GitHub, the key is compromised. The .gitignore does exclude .env, but the key is also in conversation logs.
**Impact:** Potential API key exposure and unauthorized billing.

---

## HIGH (Major functionality broken)

### BUG-004: Characters spawn on top of each other at hardcoded position (5,5)
**Files:** `server/routes/character.ts` (line 64)
**What:** Every character defaults to `positionX: 5, positionY: 5`. The client never sends custom positions. All characters stack on the same tile and become unclickable.
**Reproduce:** Create 3 characters. They all appear at the same spot overlapping.
**Impact:** Cannot select individual characters after creating multiple, making multi-agent unusable.

### BUG-005: Character position never updates in the database
**Files:** `client/src/canvas/CharacterEntity.ts`, `server/routes/character.ts`
**What:** When characters move to workstations (via pathfinding), their position updates only in the client-side `CharacterEntity.gridX/gridY`. The database still has the old `position_x, position_y`. On page refresh, all characters teleport back to (5,5).
**Reproduce:** Assign a task (character walks to workstation) > refresh the page > character is back at (5,5).
**Impact:** No position persistence across sessions.

### BUG-006: Agent output notification doesn't say WHICH agent finished
**Files:** `client/src/App.tsx` (line 46)
**What:** `addNotification('An agent finished their task!', 'success', data.characterId)` — when you have 3 agents working, the notification says "An agent finished" for all of them. It should include the character's name.
**Reproduce:** Run tasks on 2+ agents. Both notifications say "An agent finished their task!" with no name.
**Impact:** User has no idea which agent finished without clicking around.

### BUG-007: Task route `/status` collides with `/task/:id` route
**Files:** `server/routes/task.ts` (lines 85-104)
**What:** `GET /task/status` is defined AFTER `GET /task/:id`. Express matches routes in order, so `GET /task/status` is caught by the `:id` route — Express treats "status" as an ID parameter. The DB query returns null (no task with id="status"), resulting in a 404.
**Reproduce:** `curl http://localhost:3001/api/task/status` — returns `{"error":"Task not found"}`.
**Impact:** Task queue status monitoring is completely non-functional.

### BUG-008: Characters don't actually move to workstations when assigned tasks
**Files:** `client/src/App.tsx`, `client/src/canvas/CharacterEntity.ts`
**What:** The `CharacterEntity.moveToWorkstation()` method exists, but NOTHING ever calls it. When a task is assigned and the WebSocket event arrives, `setState()` is called (which changes animation) but `moveToWorkstation()` is never triggered. Characters just stand still and change their speech bubble.
**Reproduce:** Assign a task to a character > watch the canvas. Character stays at (5,5) and shows "Working..." bubble but never walks.
**Impact:** The core visual promise — watching agents walk to their desks and work — is missing.

### BUG-009: Deleting a character while it has a running task leaves a zombie task
**Files:** `server/routes/character.ts` (line 108-117)
**What:** The DELETE endpoint calls `removeMachine()` which clears the state machine and removes from `activeTasks`, but the Claude API stream is still running. The `runTask` function holds a reference to the character and will try to update the database when the stream finishes — writing to a deleted character's tasks (which will succeed due to cascade delete already cleaning up tasks).
**Reproduce:** Assign a task > immediately delete the character > watch server console for errors.
**Impact:** Server errors, potential orphaned API calls burning tokens.

---

## MEDIUM (Noticeable UX issues)

### BUG-010: No confirmation dialog before deleting a character
**Files:** `client/src/components/AgentInspector.tsx` (line 182)
**What:** The "Remove Character" button immediately deletes with no "Are you sure?" prompt. One misclick destroys a character (and its AI-generated sprite that took API credits to create).
**Reproduce:** Click "Remove Character" accidentally. Character is gone forever.
**Impact:** Frustrating accidental data loss.

### BUG-011: Notification IDs use `Date.now()` causing collisions
**Files:** `client/src/App.tsx` (line 103)
**What:** `Date.now().toString()` is used as notification IDs. If two events arrive in the same millisecond (common with WebSocket bursts), they get the same ID. React then has key collisions and the second notification may not render.
**Reproduce:** Have two agents finish tasks simultaneously. Only one notification may appear.
**Impact:** Missing notifications for concurrent events.

### BUG-012: Onboarding guide reappears after page refresh if user skipped early
**Files:** `client/src/components/OnboardingGuide.tsx` (lines 46-51)
**What:** If the user clicks "Skip" on step 1 or 2, `dismissed` state goes true but `localStorage` is only written on step 3. On refresh, `dismissed` resets to false and `hasOnboarded` reads from empty localStorage, so the onboarding appears again.
**Reproduce:** See onboarding on step 1 > click "Skip" > refresh page > onboarding reappears.
**Impact:** Annoying repeated tutorial after explicitly dismissing.

### BUG-013: `agent_activity` WebSocket events are never handled by the client
**Files:** `client/src/App.tsx` (lines 28-64), `client/src/lib/wsClient.ts`
**What:** The server emits `agent_activity` events (e.g., "Forming ideas...", "Writing response...") via `WSManager.broadcast()`, and the `AgentStateMachine.emitActivity()` method uses this event type. But the client only subscribes to `agent_state_change`, `agent_output`, and `agent_error`. The `agent_activity` events are silently dropped — characters never show real-time activity text updates in their speech bubbles.
**Reproduce:** Assign a task > watch the character. Speech bubble stays on the initial text, never cycles through "Forming ideas...", "Writing response...", "Almost done...".
**Impact:** The real-time "watching the agent think" experience is missing.

### BUG-014: WebSocket client silently swallows all connect/parse errors
**Files:** `client/src/lib/wsClient.ts` (line 38)
**What:** `ws.onerror` just calls `ws.close()` with no logging or user notification. If the WebSocket can never connect (wrong port, server down), the user sees no error — just a silent dead app with no real-time updates.
**Reproduce:** Start only the client (no server). No error shown. Characters never update.
**Impact:** Silent failure, confusing debugging.

### BUG-015: SpriteRenderer `update()` double-counts deltaMs for idle animations
**Files:** `client/src/canvas/SpriteRenderer.ts` (lines 69-87)
**What:** `frameTimer += deltaMs` at line 70, then ALSO `frameTimer += deltaMs * 0.5` at line 85 if the animation starts with "idle". This means idle animations tick at 1.5x speed instead of the intended slower cycling.
**Reproduce:** Watch a character's idle animation — it flickers slightly too fast.
**Impact:** Janky idle animation.

### BUG-016: Scene editor undo pushes state BEFORE every tile click including drags
**Files:** `client/src/components/SceneEditor.tsx` (line 87)
**What:** `handleTileClick` calls `pushUndo()` on every invocation. But when drag-painting tiles, each mouse-move pixel triggers a tile click and a new undo entry. Painting a line of 10 tiles creates 10 undo states. The 20-deep undo stack fills up from one drag stroke.
**Reproduce:** Select floor tool > drag across 15 tiles > undo stack is full of micro-states from one stroke.
**Impact:** Undo is nearly useless — undoing one paint stroke requires 15 undo clicks.

### BUG-017: `handleLayoutChange` debounce uses fetch directly instead of api helper
**Files:** `client/src/App.tsx` (lines 142-148)
**What:** Uses raw `fetch('/api/scene/...')` instead of the `api.ts` helper. This bypasses the centralized error handling and `Content-Type` header logic. If the fetch fails, the error is silently swallowed by `.catch(() => {})`.
**Reproduce:** Disconnect network > edit scene > no error shown, edits lost on refresh.
**Impact:** Silent data loss.

---

## LOW (Minor issues, edge cases)

### BUG-018: No loading state when scene templates are being fetched
**Files:** `client/src/components/SceneSelector.tsx`
**What:** The template list is empty while the API call is in-flight. User sees "Pixel Agent" title and "Choose a room" text with an empty grid — could think the app is broken.
**Reproduce:** Open app on slow connection. Blank grid for 1-2 seconds.
**Impact:** Momentary confusion.

### BUG-019: CharacterCreator doesn't reset state when reopened
**Files:** `client/src/components/CharacterCreator.tsx`
**What:** If user generates a sprite, closes the modal (without accepting), then reopens it, the old description/sprite/name state persists because React state isn't reset when the component remounts (React may reuse the component fiber).
**Reproduce:** Generate a sprite > close modal without accepting > reopen > old sprite still showing.
**Impact:** Minor confusion, user can just clear and start over.

### BUG-020: `spriteGenerator.ts` operator precedence bug in frame validation
**Files:** `server/services/spriteGenerator.ts` (line 120)
**What:** `if (frames.length === sprite.height && Array.isArray(frames[0]) && typeof frames[0][0] === 'string' || frames[0][0] === null)` — due to operator precedence, `|| frames[0][0] === null` binds to the entire expression, not just the last `&&`. This means if `frames[0][0]` is `null`, the ENTIRE condition is true regardless of `frames.length`. Could cause malformed sprites to pass validation.
**Reproduce:** Send sprite with mismatched frame count where first pixel is null — passes validation when it shouldn't.
**Impact:** Potential malformed sprite data in database.

### BUG-021: Keyboard shortcut "Cmd+N" fires even when typing in input fields
**Files:** `client/src/App.tsx` (lines 78-99)
**What:** The keydown handler doesn't check if the event target is an input/textarea. If a user is typing in the task input and hits Cmd+N, the character creator modal opens instead of the expected browser behavior.
**Reproduce:** Click on task input > type > hit Cmd+N > creator modal opens unexpectedly.
**Impact:** Interrupts workflow.

### BUG-022: `SceneCanvas` never cleans up `entitiesRef` properly on scene switch
**Files:** `client/src/components/SceneCanvas.tsx` (lines 31-45)
**What:** When switching rooms (`setScene(null)` then selecting new scene), the `entitiesRef.current` Map is never cleared. Old character entities from the previous scene could linger if the component doesn't fully unmount.
**Reproduce:** Create characters in Scene A > switch room > go to Scene B > potential ghost entities.
**Impact:** Potential visual artifacts after room switching.

### BUG-023: Pipeline in-memory storage lost on server restart
**Files:** `server/services/agentHandoff.ts` (line 24)
**What:** Pipelines are stored in `const pipelines = new Map<string, Pipeline>()` — purely in memory. Server restart loses all pipeline state. The comment says "could be persisted to DB later" but this is never done.
**Reproduce:** Create a pipeline > restart server > `GET /api/pipeline/:id` returns 404.
**Impact:** Pipeline data is ephemeral.

### BUG-024: Agent state in DB and state machine can desync
**Files:** `server/services/taskExecutor.ts`, `server/services/agentStateMachine.ts`
**What:** The `AgentStateMachine` is in-memory. The character `state` column is in SQLite. They're updated separately and can drift. If the server crashes mid-task, the DB might say "working" but the in-memory machine doesn't exist (defaults to "idle" on recreation).
**Reproduce:** Kill server while a task is running > restart > character shows "idle" in state machine but "working" in DB.
**Impact:** Stuck characters that can't be assigned new tasks.

---

## COSMETIC (Visual, polish)

### BUG-025: Close button is lowercase "x" instead of a proper icon
**Files:** `CharacterCreator.tsx:103`, `AgentInspector.tsx:71`, `SceneEditor.tsx:132`
**What:** All close buttons show a plain text "x" character. Looks cheap.
**Impact:** Unprofessional appearance.

### BUG-026: Bottom bar shows "Cmd+N" on all platforms
**Files:** `client/src/App.tsx` (lines 248-250)
**What:** Mac users see "Cmd+N" correctly, but Windows/Linux users also see "Cmd+N" when it should say "Ctrl+N".
**Impact:** Wrong keyboard hints on non-Mac.

### BUG-027: Character name tag font (9px monospace) is hard to read
**Files:** `client/src/canvas/CharacterEntity.ts` (line 120)
**What:** At 9px, the monospace font is barely legible on most screens, especially with the canvas `pixelated` rendering.
**Impact:** Can't read character names without squinting.

### BUG-028: Speech bubble text overflows on long activity strings
**Files:** `client/src/canvas/SpeechBubble.ts` (line 9)
**What:** Text is truncated at 30 chars with "...", but the truncation doesn't account for wide characters. Some activity strings like "Queued (position 12)" are fine, but text from the Claude API could contain emojis or wide chars that overflow.
**Impact:** Occasional text overflow in speech bubbles.

### BUG-029: No visual distinction between walkable and non-walkable props
**Files:** `client/src/canvas/TileRenderer.ts` (lines 111-133)
**What:** All props render the same way — two nested rectangles. Workstations get a tiny gold line at the top (2px, 40% opacity) that's nearly invisible. Users can't tell which props are workstations.
**Impact:** Users can't visually identify where agents will sit.

### BUG-030: Toast notifications stack in top-right, overlap with AgentInspector
**Files:** `client/src/components/NotificationToast.tsx` (line 18), `AgentInspector.tsx` (line 61)
**What:** Toasts render at `fixed top-4 right-4`. The AgentInspector panel is `fixed right-0 top-0 h-full w-96`. When the inspector is open, toasts appear underneath/behind it.
**Reproduce:** Open inspector > wait for an agent to finish > toast is hidden behind the panel.
**Impact:** Missed notifications when inspector is open.
