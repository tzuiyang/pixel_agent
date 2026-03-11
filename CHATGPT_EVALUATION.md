# Visual AI Agents World
## Concept, Evaluation, and Architecture

Inspired by: https://github.com/pablodelucca/pixel-agents

---

# 1. Overview

This document describes the concept, evaluation, and technical architecture for building a **web-based visual AI agent workspace** inspired by the Pixel Agents VS Code extension.

The goal is to create an environment where AI agents are represented as **animated pixel characters inside a virtual scene**. Instead of interacting with agents through logs or chat alone, users can **visually observe agents performing tasks in real time**.

This system improves:

- transparency
- trust
- engagement
- multi-agent coordination

By turning invisible AI processes into visible behavior.

---

# 2. Pixel Agents Repository Summary

The Pixel Agents repository is a VS Code extension that visualizes Claude Code terminals as animated pixel workers.

Repository:
https://github.com/pablodelucca/pixel-agents

Each Claude Code terminal becomes a character in a virtual office.

Example mapping:

```
Terminal 1 → Worker A
Terminal 2 → Worker B
Terminal 3 → Worker C
```

The extension watches Claude transcript activity and maps that activity into animations.

Example state mapping:

| Claude activity | Animation |
|----------------|----------|
Thinking | Thought bubble |
Generating text | Typing |
Reading files | Reading animation |
Waiting | Idle |
Task complete | Celebration |

Internal pipeline:

```
Claude transcripts
↓
File watcher
↓
Transcript parser
↓
Agent manager
↓
Webview UI
↓
Pixel animation
```

Important source files in the repo:

```
src/
 ├ extension.ts
 ├ PixelAgentsViewProvider.ts
 ├ agentManager.ts
 ├ fileWatcher.ts
 ├ transcriptParser.ts
 ├ layoutPersistence.ts
 ├ timerManager.ts
 └ assetLoader.ts
```

The UI is built with:

- React
- Canvas rendering
- TypeScript
- Vite

The most important architectural idea is **translating agent activity into visible states**.

---

# 3. Product Vision

The goal is to evolve the Pixel Agents idea into a **standalone web application**.

Instead of being limited to an IDE extension, users manage AI agents inside a **visual world**.

Core concept:

> Build a cozy space for your AI workers and watch them work.

Users can:

1. create or choose a scene
2. create characters
3. assign tasks to agents
4. observe their behavior
5. inspect their progress

---

# 4. User Experience

## Scene Creation

Users select a scene template.

Examples:

- office
- apartment
- beach hut
- hacker lab
- garage workshop

Scenes include:

- furniture
- decorations
- workstations

Agents move and operate inside the scene.

Scene editing and customization can be expanded later.

---

## Character Creation

Users create AI workers.

Two approaches:

### Preset characters

Start with a library of pixel characters.

Example roles:

```
researcher
coder
writer
analyst
planner
```

### AI-generated characters

Users describe a character.

Example prompt:

```
cute pixel scientist with messy hair and large glasses
```

The AI generates a sprite.

The user can:

- accept
- regenerate
- modify description

Pixel style is recommended because it simplifies sprite generation and animation.

---

## Assigning Tasks

Each character acts as an AI agent powered by Claude API.

Example task:

```
Research top productivity tools for startups
```

The agent:

1. interprets the task
2. performs reasoning
3. calls tools
4. generates results

---

## Watching Agents Work

Agents display visual states.

Example animations:

| State | Animation |
|------|----------|
Thinking | Thought bubble |
Writing | Typing animation |
Reading | Book animation |
Waiting | Idle |
Blocked | Warning icon |
Completed | Celebration |

Multiple agents can operate simultaneously.

---

## Agent Inspector

Clicking a character opens a detail panel.

Example:

```
Agent: Luna

Task:
Write landing page outline

Current Step:
Analyzing competitor websites

Recent Actions:
• searched "AI landing page examples"
• extracted headline patterns
• started section outline

Status:
Waiting for target audience clarification
```

The inspector panel is critical for trust.

Users should clearly see:

- current task
- current step
- recent actions
- blockers
- progress

Avoid vague states like:

```
thinking...
working...
```

---

# 5. Key UX Insight

Most AI systems are invisible.

Users cannot easily tell:

- what the agent is doing
- whether it is stuck
- what step it is on
- when it will finish

A visual interface solves this problem.

Benefits include:

## Transparency
Users see agent activity.

## Trust
Agents are less like black boxes.

## Engagement
Watching agents work is satisfying.

## Multi-agent clarity
Parallel work becomes understandable.

---

# 6. Risks and Challenges

## Too Much Setup

If users must:

1. build a scene
2. generate a character
3. configure an agent

before seeing results, the experience becomes slow.

Better onboarding flow:

```
choose room
choose worker
assign task
watch it work
```

Scene customization should come later.

---

## AI Character Generation Complexity

Generating usable sprites with AI can be difficult.

Common problems:

- inconsistent proportions
- inconsistent color palettes
- missing animation frames
- poor transparency
- alignment issues

Better approach:

Start with **preset characters**, then allow AI generation later.

---

## Visual Noise

Many agents can create chaos.

Example:

```
10+ characters
speech bubbles
animations
notifications
```

Solution:

Define a clear visual language.

| State | Indicator |
|------|----------|
Thinking | Thought bubble |
Waiting | Idle |
Blocked | Red alert |
Completed | Green indicator |

---

## Agent Trust

Users must understand agent progress.

Instead of:

```
thinking...
working...
```

Show structured information:

```
current task
current step
recent actions
blockers
```

---

# 7. Recommended MVP

Start extremely small.

## MVP definition

> A cozy room where a single AI worker performs tasks visually.

---

## MVP user flow

```
enter app
↓
choose room template
↓
choose worker
↓
assign task
↓
watch agent work
↓
click to inspect
```

---

## MVP features

### Room templates

Examples:

```
office
apartment
garage lab
beach hut
```

### Agent system

Start with 6–10 preset characters.

### Task system

User provides tasks.

Claude executes them.

### Real-time animation

Agents visually reflect activity.

### Inspector panel

Users can inspect progress.

---

# 8. Technical Architecture

## Frontend

Recommended stack:

```
Next.js
React
PixiJS
Tailwind
```

PixiJS handles:

- sprite rendering
- tile maps
- animations
- WebGL acceleration

Scene structure example:

```
World
 ├ background
 ├ furniture
 ├ agents
 └ UI overlays
```

---

## Realtime Layer

Use:

```
WebSockets
or
Colyseus
```

Example events:

```
agent_started
agent_thinking
agent_tool_call
agent_waiting
agent_completed
```

---

## Backend Agent Service

Responsibilities:

```
task orchestration
Claude API calls
tool execution
memory storage
event streaming
```

Claude workflow:

```
user task
↓
Claude reasoning
↓
tool usage
↓
Claude response
↓
state update
```

---

## Data Model Example

```
Agent {
  id
  name
  sprite
  position
  task
  state
  recent_actions
}
```

Possible agent states:

```
idle
thinking
typing
reading
blocked
complete
```

---

# 9. Animation Mapping

Agent activity maps to animations.

Example mapping:

| Agent Activity | Animation |
|---------------|----------|
Tool call | Reading |
Generating text | Typing |
Waiting | Idle |
Task completed | Celebration |
Error | Blocked |

This layer makes the environment feel alive.

---

# 10. Claude API Considerations

## Cost

Many agents can increase cost.

Mitigation strategies:

- limit concurrent agents
- event-driven execution
- compress memory
- reduce context size

---

## Streaming

Streaming responses allow:

- typing animations
- faster feedback
- real-time updates

---

# 11. Future Expansion

After MVP, the platform can expand.

## Multi-agent collaboration

Example workflow:

```
research agent
↓
writer agent
↓
editor agent
```

---

## Scene customization

Users decorate environments.

Examples:

```
desks
plants
monitors
coffee machines
whiteboards
```

---

## Shared worlds

Users can share environments.

Examples:

```
team workspaces
public agent worlds
collaborative rooms
```

---

## Persistent workers

Users create reusable agents.

Examples:

```
Researcher
Writer
Planner
Debugger
```

---

# 12. Final Evaluation

The concept is strong.

Reasons:

- AI work needs better visibility
- visual interfaces improve trust
- playful environments increase engagement
- multi-agent systems require clearer UX

However, success depends on **focus**.

Do not start with:

```
full scene builder
AI sprite generator
multi-agent orchestration
social worlds
```

Start with:

```
one room
one worker
one task
clear inspection
```

If users enjoy **watching agents work**, the rest of the system can evolve naturally.

---

# Core Vision

> Build a cozy room for your AI workers.  
Create a worker, give it a task, and watch it work.