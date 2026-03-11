import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { createPipeline, getPipeline, listPipelines, runPipeline, deletePipeline } from '../services/agentHandoff.js';
import { getDb } from '../db/index.js';

export const pipelineRoutes = Router();

// Create and run a pipeline
pipelineRoutes.post('/create', async (req: Request, res: Response) => {
  try {
    const { sceneId, steps } = req.body;

    if (!sceneId || !steps || !Array.isArray(steps) || steps.length < 2) {
      res.status(400).json({ error: 'Pipeline requires sceneId and at least 2 steps' });
      return;
    }

    // Validate all characters exist
    const db = getDb();
    for (const step of steps) {
      if (!step.characterId || !step.promptTemplate) {
        res.status(400).json({ error: 'Each step requires characterId and promptTemplate' });
        return;
      }
      const char = db.prepare('SELECT id FROM characters WHERE id = ?').get(step.characterId);
      if (!char) {
        res.status(404).json({ error: `Character not found: ${step.characterId}` });
        return;
      }
    }

    const id = uuid();
    const pipeline = createPipeline(id, sceneId, steps);

    // Return immediately, run in background
    res.json({ id: pipeline.id, status: 'started', steps: pipeline.steps.length });

    runPipeline(pipeline).catch((err) => {
      console.error(`Pipeline ${id} failed:`, err);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create pipeline';
    res.status(500).json({ error: msg });
  }
});

// Get pipeline status
pipelineRoutes.get('/:id', (req: Request, res: Response) => {
  const pipeline = getPipeline(req.params.id);
  if (!pipeline) {
    res.status(404).json({ error: 'Pipeline not found' });
    return;
  }
  res.json(pipeline);
});

// List pipelines for a scene
pipelineRoutes.get('/scene/:sceneId', (req: Request, res: Response) => {
  res.json(listPipelines(req.params.sceneId));
});

// Delete a pipeline
pipelineRoutes.delete('/:id', (req: Request, res: Response) => {
  if (!deletePipeline(req.params.id)) {
    res.status(404).json({ error: 'Pipeline not found' });
    return;
  }
  res.json({ deleted: true });
});
