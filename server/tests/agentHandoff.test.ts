import { describe, it, expect, beforeEach } from 'vitest';
import { createPipeline, getPipeline, listPipelines, deletePipeline } from '../services/agentHandoff';
import type { Pipeline, PipelineStep } from '../services/agentHandoff';

describe('Agent Handoff / Pipeline System', () => {
  const sceneId = 'scene-test-1';

  // Note: We can't easily test runPipeline without mocking the DB and Claude API,
  // but we can thoroughly test the pipeline CRUD and data structure logic.

  describe('createPipeline', () => {
    it('should create a pipeline with correct structure', () => {
      const pipeline = createPipeline('p-1', sceneId, [
        { characterId: 'char-a', promptTemplate: 'Research {{topic}}' },
        { characterId: 'char-b', promptTemplate: 'Summarize: {{previousOutput}}' },
      ]);

      expect(pipeline.id).toBe('p-1');
      expect(pipeline.sceneId).toBe(sceneId);
      expect(pipeline.status).toBe('pending');
      expect(pipeline.currentStep).toBe(0);
      expect(pipeline.steps).toHaveLength(2);
      expect(pipeline.createdAt).toBeTruthy();
    });

    it('should initialize all steps as pending', () => {
      const pipeline = createPipeline('p-2', sceneId, [
        { characterId: 'c1', promptTemplate: 'Step 1' },
        { characterId: 'c2', promptTemplate: 'Step 2' },
        { characterId: 'c3', promptTemplate: 'Step 3' },
      ]);

      for (const step of pipeline.steps) {
        expect(step.status).toBe('pending');
        expect(step.taskId).toBeUndefined();
        expect(step.output).toBeUndefined();
      }
    });

    it('should preserve character IDs and prompt templates', () => {
      const steps = [
        { characterId: 'researcher', promptTemplate: 'Research AI trends' },
        { characterId: 'writer', promptTemplate: 'Write article from: {{previousOutput}}' },
      ];
      const pipeline = createPipeline('p-3', sceneId, steps);

      expect(pipeline.steps[0].characterId).toBe('researcher');
      expect(pipeline.steps[0].promptTemplate).toBe('Research AI trends');
      expect(pipeline.steps[1].characterId).toBe('writer');
      expect(pipeline.steps[1].promptTemplate).toContain('{{previousOutput}}');
    });
  });

  describe('getPipeline', () => {
    it('should retrieve a created pipeline by ID', () => {
      createPipeline('p-get-1', sceneId, [
        { characterId: 'c1', promptTemplate: 'Step 1' },
        { characterId: 'c2', promptTemplate: 'Step 2' },
      ]);

      const found = getPipeline('p-get-1');
      expect(found).toBeDefined();
      expect(found!.id).toBe('p-get-1');
    });

    it('should return undefined for non-existent pipeline', () => {
      expect(getPipeline('non-existent-id')).toBeUndefined();
    });
  });

  describe('listPipelines', () => {
    it('should list pipelines for a specific scene', () => {
      const sid = 'scene-list-test';
      createPipeline('pl-1', sid, [
        { characterId: 'c1', promptTemplate: 'A' },
        { characterId: 'c2', promptTemplate: 'B' },
      ]);
      createPipeline('pl-2', sid, [
        { characterId: 'c3', promptTemplate: 'C' },
        { characterId: 'c4', promptTemplate: 'D' },
      ]);
      createPipeline('pl-3', 'other-scene', [
        { characterId: 'c5', promptTemplate: 'E' },
        { characterId: 'c6', promptTemplate: 'F' },
      ]);

      const list = listPipelines(sid);
      expect(list.length).toBe(2);
      expect(list.every((p) => p.sceneId === sid)).toBe(true);
    });

    it('should return empty array for scene with no pipelines', () => {
      expect(listPipelines('empty-scene-xyz')).toEqual([]);
    });
  });

  describe('deletePipeline', () => {
    it('should delete an existing pipeline', () => {
      createPipeline('p-del-1', sceneId, [
        { characterId: 'c1', promptTemplate: 'Step' },
        { characterId: 'c2', promptTemplate: 'Step' },
      ]);

      expect(deletePipeline('p-del-1')).toBe(true);
      expect(getPipeline('p-del-1')).toBeUndefined();
    });

    it('should return false for non-existent pipeline', () => {
      expect(deletePipeline('ghost-pipeline')).toBe(false);
    });
  });

  describe('Pipeline data integrity', () => {
    it('should support pipelines with many steps', () => {
      const steps = Array.from({ length: 10 }, (_, i) => ({
        characterId: `agent-${i}`,
        promptTemplate: `Step ${i}: {{previousOutput}}`,
      }));
      const pipeline = createPipeline('p-big', sceneId, steps);
      expect(pipeline.steps).toHaveLength(10);
    });

    it('should store valid ISO timestamp', () => {
      const pipeline = createPipeline('p-time', sceneId, [
        { characterId: 'c1', promptTemplate: 'A' },
        { characterId: 'c2', promptTemplate: 'B' },
      ]);
      const date = new Date(pipeline.createdAt);
      expect(date.toISOString()).toBe(pipeline.createdAt);
    });

    it('pipeline steps should be mutable for status tracking', () => {
      const pipeline = createPipeline('p-mut', sceneId, [
        { characterId: 'c1', promptTemplate: 'A' },
        { characterId: 'c2', promptTemplate: 'B' },
      ]);

      // Simulate what runPipeline does
      pipeline.steps[0].status = 'running';
      pipeline.steps[0].output = 'Some result';
      pipeline.steps[0].taskId = 'task-123';
      pipeline.steps[0].status = 'completed';

      const retrieved = getPipeline('p-mut');
      expect(retrieved!.steps[0].status).toBe('completed');
      expect(retrieved!.steps[0].output).toBe('Some result');
      expect(retrieved!.steps[0].taskId).toBe('task-123');
    });

    it('{{previousOutput}} template should be valid in all non-first steps', () => {
      const pipeline = createPipeline('p-tmpl', sceneId, [
        { characterId: 'c1', promptTemplate: 'Start the research' },
        { characterId: 'c2', promptTemplate: 'Review this: {{previousOutput}}' },
        { characterId: 'c3', promptTemplate: 'Final edit: {{previousOutput}}' },
      ]);

      // First step should NOT have {{previousOutput}}
      expect(pipeline.steps[0].promptTemplate).not.toContain('{{previousOutput}}');

      // Subsequent steps should
      for (let i = 1; i < pipeline.steps.length; i++) {
        expect(pipeline.steps[i].promptTemplate).toContain('{{previousOutput}}');
      }
    });
  });
});
