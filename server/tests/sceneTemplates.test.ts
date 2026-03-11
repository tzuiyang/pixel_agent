import { describe, it, expect } from 'vitest';
import { SCENE_TEMPLATES } from '../services/sceneTemplates';

describe('Scene Templates', () => {
  it('should have 4 templates', () => {
    expect(Object.keys(SCENE_TEMPLATES)).toHaveLength(4);
    expect(Object.keys(SCENE_TEMPLATES)).toEqual(['office', 'apartment', 'lab', 'beach']);
  });

  for (const [key, template] of Object.entries(SCENE_TEMPLATES)) {
    describe(`Template: ${key}`, () => {
      it('should have a name', () => {
        expect(template.name).toBeTruthy();
        expect(typeof template.name).toBe('string');
      });

      it('should have valid dimensions', () => {
        expect(template.layout.width).toBeGreaterThan(0);
        expect(template.layout.height).toBeGreaterThan(0);
        expect(template.layout.width).toBeLessThanOrEqual(64);
        expect(template.layout.height).toBeLessThanOrEqual(64);
      });

      it('should have tiles matching dimensions', () => {
        expect(template.layout.tiles).toHaveLength(template.layout.height);
        for (const row of template.layout.tiles) {
          expect(row).toHaveLength(template.layout.width);
        }
      });

      it('should have walls on the edges', () => {
        const { tiles, width, height } = template.layout;
        // Top and bottom rows
        for (let x = 0; x < width; x++) {
          expect(tiles[0][x].walkable).toBe(false);
          expect(tiles[height - 1][x].walkable).toBe(false);
        }
        // Left and right columns
        for (let y = 0; y < height; y++) {
          expect(tiles[y][0].walkable).toBe(false);
          expect(tiles[y][width - 1].walkable).toBe(false);
        }
      });

      it('should have walkable interior tiles', () => {
        const { tiles } = template.layout;
        // At least one interior tile should be walkable
        let hasWalkable = false;
        for (let y = 1; y < template.layout.height - 1; y++) {
          for (let x = 1; x < template.layout.width - 1; x++) {
            if (tiles[y][x].walkable) hasWalkable = true;
          }
        }
        expect(hasWalkable).toBe(true);
      });

      it('should have at least one workstation prop', () => {
        const workstations = template.layout.props.filter((p) => p.isWorkstation);
        expect(workstations.length).toBeGreaterThan(0);
      });

      it('should have all props within bounds', () => {
        for (const prop of template.layout.props) {
          expect(prop.x).toBeGreaterThanOrEqual(0);
          expect(prop.x).toBeLessThan(template.layout.width);
          expect(prop.y).toBeGreaterThanOrEqual(0);
          expect(prop.y).toBeLessThan(template.layout.height);
        }
      });

      it('should have valid prop types', () => {
        const validTypes = [
          'desk', 'chair', 'bookshelf', 'plant', 'computer', 'coffee_machine',
          'lamp', 'rug', 'couch', 'bed', 'table', 'server_rack', 'monitor',
          'tree', 'bench', 'hammock', 'palm_tree', 'tiki_desk',
        ];
        for (const prop of template.layout.props) {
          expect(validTypes).toContain(prop.type);
        }
      });
    });
  }
});
