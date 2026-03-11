import type { AgentState } from '../../shared/types.js';
import { AGENT_STATE_TRANSITIONS } from '../../shared/types.js';
import { WSManager } from './wsManager.js';

export class AgentStateMachine {
  private state: AgentState;
  private characterId: string;
  private activity: string = '';

  constructor(characterId: string, initialState: AgentState = 'idle') {
    this.characterId = characterId;
    this.state = initialState;
  }

  getState(): AgentState {
    return this.state;
  }

  getActivity(): string {
    return this.activity;
  }

  canTransitionTo(newState: AgentState): boolean {
    const allowed = AGENT_STATE_TRANSITIONS[this.state];
    return allowed.includes(newState);
  }

  transition(newState: AgentState, activity?: string): void {
    if (!this.canTransitionTo(newState)) {
      throw new Error(`Invalid state transition: ${this.state} → ${newState} for character ${this.characterId}`);
    }

    const oldState = this.state;
    this.state = newState;
    this.activity = activity || '';

    console.log(`Agent ${this.characterId}: ${oldState} → ${newState}${activity ? ` (${activity})` : ''}`);

    WSManager.broadcast({
      type: 'agent_state_change',
      characterId: this.characterId,
      state: newState,
      activity,
    });
  }

  emitActivity(label: string, detail?: string): void {
    this.activity = label;
    WSManager.broadcast({
      type: 'agent_activity',
      characterId: this.characterId,
      label,
      detail,
    });
  }

  reset(): void {
    this.state = 'idle';
    this.activity = '';
  }
}
