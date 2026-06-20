import type { GameState, PatientPathStep, RoomState } from '../types';

interface GridNode {
  x: number;
  y: number;
}

const DIRECTIONS: GridNode[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function createPathToPoint(state: GameState, startX: number, startY: number, targetX: number, targetY: number): PatientPathStep[] {
  const start = snapToWalkable(state, Math.round(startX), Math.round(startY));
  const goal = snapToWalkable(state, Math.round(targetX), Math.round(targetY));
  const blocked = createBlockedSet(state.rooms);
  const queue: GridNode[] = [start];
  const cameFrom = new Map<string, string>();
  const visited = new Set<string>([keyOf(start)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(cameFrom, start, goal);
    }

    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = keyOf(next);
      if (!isInside(state, next) || blocked.has(nextKey) || visited.has(nextKey)) {
        continue;
      }

      visited.add(nextKey);
      cameFrom.set(nextKey, keyOf(current));
      queue.push(next);
    }
  }

  return [
    { x: startX, y: startY },
    { x: targetX, y: targetY },
  ];
}

export function createPathToRoom(state: GameState, startX: number, startY: number, room: RoomState): PatientPathStep[] {
  const doorway = getRoomDoorway(state, room);
  const path = createPathToPoint(state, startX, startY, doorway.x, doorway.y);
  return [...path, { x: room.gridX + room.width / 2, y: room.gridY + room.height + 0.2 }];
}

export function getRoomDoorway(state: GameState, room: RoomState): PatientPathStep {
  const doorwayX = clamp(Math.round(room.gridX + room.width / 2), 0, state.grid.columns - 1);
  const below = room.gridY + room.height;
  if (below < state.grid.rows && !isRoomTile(state.rooms, doorwayX, below)) {
    return { x: doorwayX, y: below };
  }

  const above = room.gridY - 1;
  if (above >= 0 && !isRoomTile(state.rooms, doorwayX, above)) {
    return { x: doorwayX, y: above };
  }

  const left = room.gridX - 1;
  if (left >= 0) {
    return { x: left, y: clamp(room.gridY, 0, state.grid.rows - 1) };
  }

  return { x: clamp(room.gridX + room.width, 0, state.grid.columns - 1), y: clamp(room.gridY, 0, state.grid.rows - 1) };
}

function reconstructPath(cameFrom: Map<string, string>, start: GridNode, goal: GridNode): PatientPathStep[] {
  const reversePath: PatientPathStep[] = [goal];
  let currentKey = keyOf(goal);
  const startKey = keyOf(start);

  while (currentKey !== startKey) {
    const previousKey = cameFrom.get(currentKey);
    if (!previousKey) {
      break;
    }

    const [x, y] = previousKey.split(':').map(Number);
    reversePath.push({ x, y });
    currentKey = previousKey;
  }

  return reversePath.reverse().map((step) => ({ x: step.x + 0.5, y: step.y + 0.5 }));
}

function snapToWalkable(state: GameState, x: number, y: number): GridNode {
  const clamped = {
    x: clamp(x, 0, state.grid.columns - 1),
    y: clamp(y, 0, state.grid.rows - 1),
  };
  if (!isRoomTile(state.rooms, clamped.x, clamped.y)) {
    return clamped;
  }

  for (let radius = 1; radius < Math.max(state.grid.columns, state.grid.rows); radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        const candidate = { x: clamped.x + dx, y: clamped.y + dy };
        if (isInside(state, candidate) && !isRoomTile(state.rooms, candidate.x, candidate.y)) {
          return candidate;
        }
      }
    }
  }

  return clamped;
}

function createBlockedSet(rooms: RoomState[]): Set<string> {
  const blocked = new Set<string>();
  for (const room of rooms) {
    for (let x = room.gridX; x < room.gridX + room.width; x += 1) {
      for (let y = room.gridY; y < room.gridY + room.height; y += 1) {
        blocked.add(`${x}:${y}`);
      }
    }
  }
  return blocked;
}

function isRoomTile(rooms: RoomState[], x: number, y: number): boolean {
  return rooms.some((room) => x >= room.gridX && x < room.gridX + room.width && y >= room.gridY && y < room.gridY + room.height);
}

function isInside(state: GameState, node: GridNode): boolean {
  return node.x >= 0 && node.y >= 0 && node.x < state.grid.columns && node.y < state.grid.rows;
}

function keyOf(node: GridNode): string {
  return `${node.x}:${node.y}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
