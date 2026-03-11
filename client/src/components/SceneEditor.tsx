import { useState, useEffect, useCallback } from 'react';
import type { SceneLayout, TileType, PropType } from '@shared/types';

interface SceneEditorProps {
  layout: SceneLayout;
  onLayoutChange: (layout: SceneLayout) => void;
  onClose: () => void;
}

const FLOOR_TYPES: { type: TileType; label: string; color: string }[] = [
  { type: 'floor_wood', label: 'Wood', color: '#8B6914' },
  { type: 'floor_stone', label: 'Stone', color: '#6B6B6B' },
  { type: 'floor_grass', label: 'Grass', color: '#3A7D44' },
  { type: 'floor_sand', label: 'Sand', color: '#D4B483' },
  { type: 'floor_carpet', label: 'Carpet', color: '#4A3B6B' },
];

const WALL_TYPES: { type: TileType; label: string; color: string }[] = [
  { type: 'wall_brick', label: 'Brick', color: '#5C3A21' },
  { type: 'wall_glass', label: 'Glass', color: '#7BC8F6' },
  { type: 'wall_hedge', label: 'Hedge', color: '#2D5A27' },
];

const PROP_CATEGORIES: { category: string; props: { type: PropType; label: string }[] }[] = [
  {
    category: 'Furniture',
    props: [
      { type: 'desk', label: 'Desk' },
      { type: 'chair', label: 'Chair' },
      { type: 'couch', label: 'Couch' },
      { type: 'bed', label: 'Bed' },
      { type: 'table', label: 'Table' },
    ],
  },
  {
    category: 'Tech',
    props: [
      { type: 'computer', label: 'Computer' },
      { type: 'monitor', label: 'Monitor' },
      { type: 'server_rack', label: 'Server' },
    ],
  },
  {
    category: 'Decor',
    props: [
      { type: 'plant', label: 'Plant' },
      { type: 'lamp', label: 'Lamp' },
      { type: 'bookshelf', label: 'Bookshelf' },
      { type: 'rug', label: 'Rug' },
      { type: 'coffee_machine', label: 'Coffee' },
    ],
  },
  {
    category: 'Outdoor',
    props: [
      { type: 'tree', label: 'Tree' },
      { type: 'palm_tree', label: 'Palm' },
      { type: 'bench', label: 'Bench' },
      { type: 'hammock', label: 'Hammock' },
      { type: 'tiki_desk', label: 'Tiki Desk' },
    ],
  },
];

type Tool = 'floor' | 'wall' | 'prop' | 'eraser' | 'workstation';

export function SceneEditor({ layout, onLayoutChange, onClose }: SceneEditorProps) {
  const [tool, setTool] = useState<Tool>('floor');
  const [selectedFloor, setSelectedFloor] = useState<TileType>('floor_wood');
  const [selectedWall, setSelectedWall] = useState<TileType>('wall_brick');
  const [selectedProp, setSelectedProp] = useState<PropType>('desk');
  const [isWorkstation, setIsWorkstation] = useState(false);
  const [undoStack, setUndoStack] = useState<SceneLayout[]>([]);
  const [lastDragId, setLastDragId] = useState(0);

  const pushUndo = useCallback((layoutToPush: SceneLayout) => {
    setUndoStack((prev) => [...prev.slice(-19), JSON.parse(JSON.stringify(layoutToPush))]);
  }, []);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    onLayoutChange(prev);
  };

  // BUG-001 FIX: Handle canvas tile clicks here where tool state actually lives
  // BUG-016 FIX: Only push undo on mousedown (drag start), not every pixel
  const applyTool = useCallback((x: number, y: number, currentLayout: SceneLayout, isDragStart: boolean) => {
    if (x < 0 || y < 0 || x >= currentLayout.width || y >= currentLayout.height) return;

    if (isDragStart) {
      pushUndo(currentLayout);
    }

    const newLayout = JSON.parse(JSON.stringify(currentLayout)) as SceneLayout;

    if (tool === 'floor') {
      newLayout.tiles[y][x] = { type: selectedFloor, walkable: true };
    } else if (tool === 'wall') {
      newLayout.tiles[y][x] = { type: selectedWall, walkable: false };
    } else if (tool === 'eraser') {
      newLayout.props = newLayout.props.filter((p) => !(p.x === x && p.y === y));
      newLayout.tiles[y][x] = { type: 'floor_wood', walkable: true };
    } else if (tool === 'prop') {
      newLayout.props = newLayout.props.filter((p) => !(p.x === x && p.y === y));
      newLayout.props.push({
        type: selectedProp,
        x,
        y,
        walkable: selectedProp === 'rug',
        isWorkstation,
      });
    } else if (tool === 'workstation') {
      const prop = newLayout.props.find((p) => p.x === x && p.y === y);
      if (prop) prop.isWorkstation = !prop.isWorkstation;
    }

    onLayoutChange(newLayout);
  }, [tool, selectedFloor, selectedWall, selectedProp, isWorkstation, pushUndo, onLayoutChange]);

  // Listen for canvas click events and apply the current tool
  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y, isDragStart } = (e as CustomEvent).detail;
      applyTool(x, y, layout, isDragStart);
    };
    window.addEventListener('scene-editor-click', handler);
    return () => window.removeEventListener('scene-editor-click', handler);
  }, [applyTool, layout]);

  return (
    <div
      className="fixed left-0 top-0 h-full w-72 border-r border-[#2A2A4A] shadow-2xl overflow-y-auto z-40"
      style={{ backgroundColor: '#12122A' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-[#2A2A4A]">
        <h2 className="text-lg font-bold" style={{ color: '#FFD166' }}>
          Scene Editor
        </h2>
        <button onClick={onClose} className="text-[#8888AA] hover:text-white cursor-pointer text-lg leading-none" aria-label="Close">
          &times;
        </button>
      </div>

      {/* Tools */}
      <div className="p-4 border-b border-[#2A2A4A]">
        <h3 className="text-xs text-[#8888AA] uppercase mb-2">Tools</h3>
        <div className="flex gap-1 flex-wrap">
          {(['floor', 'wall', 'prop', 'eraser', 'workstation'] as Tool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`px-2 py-1 rounded text-xs cursor-pointer ${
                tool === t ? 'text-white' : 'text-[#8888AA]'
              }`}
              style={{
                backgroundColor: tool === t ? '#9B5DE5' : '#1A1A3A',
                border: `1px solid ${tool === t ? '#9B5DE5' : '#2A2A4A'}`,
              }}
            >
              {t === 'workstation' ? 'WS' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="mt-2 px-2 py-1 rounded text-xs text-[#8888AA] hover:text-white disabled:opacity-30 cursor-pointer border border-[#2A2A4A]"
        >
          Undo ({undoStack.length})
        </button>
      </div>

      {/* Floor selector */}
      {tool === 'floor' && (
        <div className="p-4 border-b border-[#2A2A4A]">
          <h3 className="text-xs text-[#8888AA] uppercase mb-2">Floor Type</h3>
          <div className="grid grid-cols-3 gap-1">
            {FLOOR_TYPES.map((f) => (
              <button
                key={f.type}
                onClick={() => setSelectedFloor(f.type)}
                className={`flex flex-col items-center p-2 rounded text-xs cursor-pointer ${
                  selectedFloor === f.type ? 'ring-2 ring-[#9B5DE5]' : ''
                }`}
                style={{ backgroundColor: '#1A1A3A' }}
              >
                <div className="w-6 h-6 rounded mb-1" style={{ backgroundColor: f.color }} />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wall selector */}
      {tool === 'wall' && (
        <div className="p-4 border-b border-[#2A2A4A]">
          <h3 className="text-xs text-[#8888AA] uppercase mb-2">Wall Type</h3>
          <div className="grid grid-cols-3 gap-1">
            {WALL_TYPES.map((w) => (
              <button
                key={w.type}
                onClick={() => setSelectedWall(w.type)}
                className={`flex flex-col items-center p-2 rounded text-xs cursor-pointer ${
                  selectedWall === w.type ? 'ring-2 ring-[#9B5DE5]' : ''
                }`}
                style={{ backgroundColor: '#1A1A3A' }}
              >
                <div className="w-6 h-6 rounded mb-1" style={{ backgroundColor: w.color }} />
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prop selector */}
      {tool === 'prop' && (
        <div className="p-4 border-b border-[#2A2A4A]">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs text-[#8888AA]">Mark as workstation</label>
            <input
              type="checkbox"
              checked={isWorkstation}
              onChange={(e) => setIsWorkstation(e.target.checked)}
              className="cursor-pointer"
            />
          </div>
          {PROP_CATEGORIES.map((cat) => (
            <div key={cat.category} className="mb-3">
              <h4 className="text-xs text-[#8888AA] uppercase mb-1">{cat.category}</h4>
              <div className="grid grid-cols-3 gap-1">
                {cat.props.map((p) => (
                  <button
                    key={p.type}
                    onClick={() => setSelectedProp(p.type)}
                    className={`px-2 py-1.5 rounded text-xs cursor-pointer ${
                      selectedProp === p.type ? 'text-white' : 'text-[#8888AA]'
                    }`}
                    style={{
                      backgroundColor: selectedProp === p.type ? '#9B5DE5' : '#1A1A3A',
                      border: `1px solid ${selectedProp === p.type ? '#9B5DE5' : '#2A2A4A'}`,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="p-4 text-xs text-[#555577]">
        <p>Click tiles on the canvas to apply the selected tool.</p>
        <p className="mt-1">Use the Eraser to remove props and reset tiles.</p>
        <p className="mt-1">Mark workstations where agents will sit when working.</p>
      </div>
    </div>
  );
}

export { type Tool };
