// Block Blast rules, kept free of React so they are easy to read and test.

export const GRID = 8;

export type Shape = number[][]; // 1 = filled
export type Board = (string | null)[][]; // a cell holds the color of the block in it
export interface Pos {
  r: number;
  c: number;
}
export interface Piece {
  id: number;
  shape: Shape;
  color: string;
  used: boolean;
}

const SHAPES: Shape[] = [
  [[1]],
  [[1, 1]],
  [[1], [1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 1], [1, 0], [1, 0]],
  [[1, 1], [0, 1], [0, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [[1, 1, 1, 1, 1]],
  [[1], [1], [1], [1], [1]],
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
];

// Toy-block colors from the same warm room as the rest of the app
const COLORS = ["#c8553d", "#d99a2b", "#6f9a6a", "#5b7fa6", "#9a6a9a", "#c27a5a"];

let nextPieceId = 0;
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export const emptyBoard = (): Board => Array.from({ length: GRID }, () => Array<string | null>(GRID).fill(null));

export const newPieces = (): Piece[] =>
  Array.from({ length: 3 }, () => ({ id: ++nextPieceId, shape: pick(SHAPES), color: pick(COLORS), used: false }));

export const shapeSize = (shape: Shape) => ({ rows: shape.length, cols: Math.max(...shape.map((r) => r.length)) });

export const cellCount = (shape: Shape) => shape.flat().filter(Boolean).length;

export function cellsOf(shape: Shape, at: Pos): Pos[] {
  const cells: Pos[] = [];
  shape.forEach((row, dr) => row.forEach((v, dc) => v && cells.push({ r: at.r + dr, c: at.c + dc })));
  return cells;
}

export function canPlace(board: Board, shape: Shape, at: Pos): boolean {
  return cellsOf(shape, at).every(({ r, c }) => r >= 0 && r < GRID && c >= 0 && c < GRID && board[r][c] === null);
}

export function place(board: Board, piece: Piece, at: Pos): Board {
  const next = board.map((row) => [...row]);
  for (const { r, c } of cellsOf(piece.shape, at)) next[r][c] = piece.color;
  return next;
}

/** Full rows and columns: the cells to clear and how many lines that is */
export function fullLines(board: Board): { cells: Pos[]; lines: number } {
  const keys = new Set<string>();
  let lines = 0;
  for (let i = 0; i < GRID; i++) {
    if (board[i].every(Boolean)) {
      lines++;
      for (let c = 0; c < GRID; c++) keys.add(`${i},${c}`);
    }
    if (board.every((row) => row[i])) {
      lines++;
      for (let r = 0; r < GRID; r++) keys.add(`${r},${i}`);
    }
  }
  const cells = [...keys].map((k) => {
    const [r, c] = k.split(",").map(Number);
    return { r, c };
  });
  return { cells, lines };
}

export function clear(board: Board, cells: Pos[]): Board {
  const next = board.map((row) => [...row]);
  for (const { r, c } of cells) next[r][c] = null;
  return next;
}

export function anyMoveLeft(board: Board, pieces: Piece[]): boolean {
  return pieces.some(
    (p) => !p.used && board.some((_, r) => board[r].some((__, c) => canPlace(board, p.shape, { r, c }))),
  );
}

/** Points for placing a piece: one per cell, plus a combo-scaled bonus per cleared line */
export const scoreFor = (cells: number, lines: number, combo: number) => cells + lines * 10 * Math.min(combo, 5);

export const LINES_PER_COIN = 2;
