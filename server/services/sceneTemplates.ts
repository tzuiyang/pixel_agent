import type { SceneLayout, Tile, Prop } from '../../shared/types.js';

function makeFloor(width: number, height: number, type: Tile['type']): Tile[][] {
  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      // Walls on edges
      const isWall = y === 0 || y === height - 1 || x === 0 || x === width - 1;
      tiles[y][x] = {
        type: isWall ? 'wall_brick' : type,
        walkable: !isWall,
      };
    }
  }
  return tiles;
}

const officeLayout: SceneLayout = {
  width: 20,
  height: 16,
  tiles: makeFloor(20, 16, 'floor_wood'),
  props: [
    { type: 'desk', x: 3, y: 3, walkable: false, isWorkstation: true },
    { type: 'computer', x: 3, y: 2, walkable: false, isWorkstation: false },
    { type: 'chair', x: 3, y: 4, walkable: false, isWorkstation: false },
    { type: 'desk', x: 8, y: 3, walkable: false, isWorkstation: true },
    { type: 'computer', x: 8, y: 2, walkable: false, isWorkstation: false },
    { type: 'chair', x: 8, y: 4, walkable: false, isWorkstation: false },
    { type: 'desk', x: 13, y: 3, walkable: false, isWorkstation: true },
    { type: 'computer', x: 13, y: 2, walkable: false, isWorkstation: false },
    { type: 'chair', x: 13, y: 4, walkable: false, isWorkstation: false },
    { type: 'bookshelf', x: 17, y: 1, walkable: false, isWorkstation: false },
    { type: 'bookshelf', x: 18, y: 1, walkable: false, isWorkstation: false },
    { type: 'plant', x: 1, y: 1, walkable: false, isWorkstation: false },
    { type: 'plant', x: 18, y: 14, walkable: false, isWorkstation: false },
    { type: 'coffee_machine', x: 1, y: 14, walkable: false, isWorkstation: false },
    { type: 'rug', x: 9, y: 10, walkable: true, isWorkstation: false },
    { type: 'rug', x: 10, y: 10, walkable: true, isWorkstation: false },
    { type: 'couch', x: 9, y: 12, walkable: false, isWorkstation: false },
    { type: 'lamp', x: 16, y: 7, walkable: false, isWorkstation: false },
  ],
};

const apartmentLayout: SceneLayout = {
  width: 18,
  height: 14,
  tiles: makeFloor(18, 14, 'floor_carpet'),
  props: [
    { type: 'desk', x: 3, y: 2, walkable: false, isWorkstation: true },
    { type: 'computer', x: 3, y: 1, walkable: false, isWorkstation: false },
    { type: 'chair', x: 3, y: 3, walkable: false, isWorkstation: false },
    { type: 'couch', x: 8, y: 6, walkable: false, isWorkstation: false },
    { type: 'table', x: 8, y: 8, walkable: false, isWorkstation: false },
    { type: 'bookshelf', x: 1, y: 1, walkable: false, isWorkstation: false },
    { type: 'lamp', x: 12, y: 5, walkable: false, isWorkstation: false },
    { type: 'plant', x: 16, y: 1, walkable: false, isWorkstation: false },
    { type: 'rug', x: 8, y: 7, walkable: true, isWorkstation: false },
    { type: 'bed', x: 14, y: 10, walkable: false, isWorkstation: false },
  ],
};

const labLayout: SceneLayout = {
  width: 22,
  height: 16,
  tiles: makeFloor(22, 16, 'floor_stone'),
  props: [
    { type: 'desk', x: 3, y: 3, walkable: false, isWorkstation: true },
    { type: 'monitor', x: 3, y: 2, walkable: false, isWorkstation: false },
    { type: 'desk', x: 8, y: 3, walkable: false, isWorkstation: true },
    { type: 'monitor', x: 8, y: 2, walkable: false, isWorkstation: false },
    { type: 'server_rack', x: 18, y: 1, walkable: false, isWorkstation: false },
    { type: 'server_rack', x: 19, y: 1, walkable: false, isWorkstation: false },
    { type: 'server_rack', x: 20, y: 1, walkable: false, isWorkstation: false },
    { type: 'desk', x: 14, y: 8, walkable: false, isWorkstation: true },
    { type: 'computer', x: 14, y: 7, walkable: false, isWorkstation: false },
    { type: 'chair', x: 14, y: 9, walkable: false, isWorkstation: false },
    { type: 'lamp', x: 1, y: 14, walkable: false, isWorkstation: false },
    { type: 'plant', x: 1, y: 1, walkable: false, isWorkstation: false },
  ],
};

const beachLayout: SceneLayout = {
  width: 20,
  height: 14,
  tiles: makeFloor(20, 14, 'floor_sand'),
  props: [
    { type: 'palm_tree', x: 2, y: 2, walkable: false, isWorkstation: false },
    { type: 'palm_tree', x: 16, y: 3, walkable: false, isWorkstation: false },
    { type: 'tiki_desk', x: 6, y: 5, walkable: false, isWorkstation: true },
    { type: 'chair', x: 6, y: 6, walkable: false, isWorkstation: false },
    { type: 'hammock', x: 12, y: 8, walkable: false, isWorkstation: true },
    { type: 'tiki_desk', x: 10, y: 10, walkable: false, isWorkstation: true },
    { type: 'bench', x: 4, y: 11, walkable: false, isWorkstation: false },
    { type: 'plant', x: 18, y: 12, walkable: false, isWorkstation: false },
  ],
};

export const SCENE_TEMPLATES: Record<string, { name: string; layout: SceneLayout }> = {
  office: { name: 'Cozy Office', layout: officeLayout },
  apartment: { name: 'Apartment', layout: apartmentLayout },
  lab: { name: 'Hacker Lab', layout: labLayout },
  beach: { name: 'Beach Hut', layout: beachLayout },
};
