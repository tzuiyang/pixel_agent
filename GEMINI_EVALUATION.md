# Project: Pixel-Agent Web (PAW) - Project Evaluation & Architecture

## 1. Project Overview
The goal is to evolve the "Pixel Agents" VS Code extension concept into a standalone, gamified web platform. Users can design custom environments (homes, beaches, offices), generate unique AI-powered pixel characters, and assign real-world tasks to these "agents" via the Claude API. The UI provides a visual representation of the agent's internal logic through character animations and status bubbles.

---

## 2. Core Concepts & Features
* **Dynamic Scene Builder:** A drag-and-drop interface for users to decorate their "base" using a library of pixel-art assets.
* **AI Avatar Generation:** A text-to-pixel-art pipeline where users describe a character, and an AI model generates the sprite.
* **Visual Logic Mapping:** Translating abstract API calls (e.g., `web_search`, `write_code`) into physical character actions (e.g., *looking through binoculars*, *sitting at a desk*).
* **The "Thought Bubble" UI:** A clickable overlay for each agent showing real-time terminal outputs, reasoning, and task progress in an approachable format.

---

## 3. Deep Research & Thinking Process

### A. The "Visual Loop" Problem
In a standard agentic workflow, there is often a "black box" where the user waits for a response. 
* **Thinking:** How do we make the wait enjoyable?
* **Solution:** Use "state-based animations." If the Claude API returns a "tool_use" block, the frontend triggers a specific animation. If the agent is "thinking" (high latency), the character could perform a "pacing" or "scratching head" animation.

### B. Asset Consistency (The Design Challenge)
A major risk is "style drift." If the user places a professional 16-bit chair and the AI generates a messy 32-bit character, the immersion breaks.
* **Thinking:** How do we ensure the AI-generated character fits the world?
* **Solution:** Use **Image-to-Image (Img2Img)** or very strict **ControlNet** parameters in the generation pipeline. We should feed a "Style Reference" image of our base assets to the generation model to ensure the color palette and pixel density match.

### C. Backend Persistence
Unlike a VS Code extension that runs locally, a web app must handle agents that work while the user is offline.
* **Thinking:** What happens when the user closes the tab?
* **Solution:** Move the Claude API orchestration to a **Background Worker** (using Redis/BullMQ). When the agent finishes a task, it updates the database and sends a browser notification or email to the user.

---

## 4. Technical Stack Recommendation

### Frontend (The Game Engine)
* **Next.js:** For the landing page, auth, and dashboard logic.
* **Phaser.js:** To handle the 2D canvas, sprite layering, and character movement. It is lightweight and perfect for "The Sims" style top-down or isometric views.
* **Tailwind CSS:** For the "Thought Bubble" and UI overlays.

### Agentic Intelligence
* **Claude 3.5/3.7 Sonnet (via API):** The primary brain for task execution and prompt generation.
* **LangGraph:** To manage the state of the agent and handle multi-step loops (searching -> analyzing -> writing).

### Art Generation Pipeline
* **Flux.1 (Fine-tuned for Pixel Art):** High-speed, high-quality image generation.
* **Pipeline:** User Input -> Claude (Optimizer) -> Flux API -> Remove Background API -> Phaser Sprite.

---

## 5. Feedback & Strategic Advice

1.  **Start with "Pre-fab" Assets:** Don't let the AI generate everything (floors, walls, furniture) from scratch at first. Provide a solid, cohesive base set of "Standard Pixel Furniture." Use the AI generation exclusively for the **unique** characters to maintain visual quality.
2.  **Gamify the "Log":** Instead of a scrolling terminal, use a "Journal" or "Mission Log" UI. When an agent succeeds, give the user a small visual reward (e.g., a "Level Up" animation or a new piece of furniture unlocked).
3.  **Low-Latency Sprites:** Instead of full spritesheets (which are hard for AI to get right), generate a static "Front View" and "Side View." Use **code-based animations** (bouncing, tilting, squash-and-stretch) to make them feel alive without needing 24 hand-drawn frames.

---

## 6. Next Steps
* [ ] Define the "Prompt Template" for consistent pixel art characters.
* [ ] Create a mapping table (e.g., `Tool: Google Search` -> `Anim: Binoculars`).
* [ ] Build a basic Phaser.js prototype with one character that moves to a "Desk" when a button is clicked.

---
**Would you like me to generate the initial system prompt for Claude that will act as the "Character Designer" for this app?**