// mini-app/src/components/BlockBlastGame.tsx
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useCoinStore } from "../store/useCoinStore";

/* ═══════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════ */

const GRID = 8;
const CELL = 38;
const GAP = 2;
const BOARD_PX = GRID * (CELL + GAP) + GAP;

type Shape = boolean[][];
type CellState = 0 | string; // 0=empty, string=color
type Board = CellState[][];
type Pos = { r: number; c: number };

interface Piece {
  id: number;
  shape: Shape;
  color: string;
  used: boolean;
}

interface ClearAnim {
  cells: Pos[];
  ts: number;
}

interface FloatText {
  id: number;
  text: string;
  x: number;
  y: number;
  ts: number;
}

/* ═══════════════════════════════════════════
   SHAPE DEFINITIONS
   ═══════════════════════════════════════════ */

const SHAPES: Shape[] = [
  [[true]],
  [[true, true]],
  [[true], [true]],
  [[true, true, true]],
  [[true], [true], [true]],
  [[true, false], [true, false], [true, true]],
  [[false, true], [false, true], [true, true]],
  [[true, true], [true, false], [true, false]],
  [[true, true], [false, true], [false, true]],
  [[true, true, true], [false, true, false]],
  [[false, true, false], [true, true, true]],
  [[true, true], [true, true]],
  [[true, true, false], [false, true, true]],
  [[false, true, true], [true, true, false]],
  [[true, false, false], [true, false, false], [true, true, true]],
  [[false, false, true], [false, false, true], [true, true, true]],
  [[true, true, true, true]],
  [[true], [true], [true], [true]],
  [[true, true, true, true, true]],
  [[true], [true], [true], [true], [true]],
  [[true, true, true], [true, true, true], [true, true, true]],
];

const COLORS = [
  "#7c5cfc", "#f472b6", "#38bdf8", "#fb923c",
  "#4ade80", "#f87171", "#a78bfa", "#fbbf24",
  "#2dd4bf", "#e879f9",
];

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function emptyBoard(): Board {
  return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

function randPiece(id: number): Piece {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { id, shape, color, used: false };
}

function canPlace(board: Board, shape: Shape, r: number, c: number): boolean {
  for (let dr = 0; dr < shape.length; dr++) {
    for (let dc = 0; dc < shape[dr].length; dc++) {
      if (!shape[dr][dc]) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return false;
      if (board[nr][nc] !== 0) return false;
    }
  }
  return true;
}

function placePiece(board: Board, shape: Shape, r: number, c: number, color: string): Board {
  const b = board.map(row => [...row]) as Board;
  for (let dr = 0; dr < shape.length; dr++)
    for (let dc = 0; dc < shape[dr].length; dc++)
      if (shape[dr][dc]) b[r + dr][c + dc] = color;
  return b;
}

function findFullLines(board: Board): Pos[] {
  const cells = new Set<string>();
  for (let r = 0; r < GRID; r++) {
    if (board[r].every(c => c !== 0))
      for (let c = 0; c < GRID; c++) cells.add(`${r},${c}`);
  }
  for (let c = 0; c < GRID; c++) {
    let full = true;
    for (let r = 0; r < GRID; r++) if (board[r][c] === 0) { full = false; break; }
    if (full) for (let r = 0; r < GRID; r++) cells.add(`${r},${c}`);
  }
  return [...cells].map(s => {
    const [r, c] = s.split(",").map(Number);
    return { r, c };
  });
}

function clearCells(board: Board, cells: Pos[]): Board {
  const b = board.map(row => [...row]) as Board;
  for (const { r, c } of cells) b[r][c] = 0;
  return b;
}

function countLines(board: Board): number {
  let n = 0;
  for (let r = 0; r < GRID; r++)
    if (board[r].every(c => c !== 0)) n++;
  for (let c = 0; c < GRID; c++) {
    let full = true;
    for (let r = 0; r < GRID; r++) if (board[r][c] === 0) { full = false; break; }
    if (full) n++;
  }
  return n;
}

function anyPieceFits(board: Board, pieces: Piece[]): boolean {
  for (const p of pieces) {
    if (p.used) continue;
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (canPlace(board, p.shape, r, c)) return true;
  }
  return false;
}

function shapeSize(shape: Shape) {
  return { rows: shape.length, cols: Math.max(...shape.map(r => r.length)) };
}

function shapeCellCount(shape: Shape): number {
  let n = 0;
  for (const row of shape) for (const c of row) if (c) n++;
  return n;
}

/* ═══════════════════════════════════════════
   HAPTIC
   ═══════════════════════════════════════════ */

function haptic(type: "light" | "medium" | "heavy" | "error" | "success") {
  try {
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(type);
  } catch { /* noop */ }
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

let pieceIdCounter = 0;

export function BlockBlastGame({ onBack }: { onBack: () => void }) {
  const addCoins = useCoinStore(s => s.addCoins);

  const [board, setBoard] = useState<Board>(emptyBoard);
  const [pieces, setPieces] = useState<Piece[]>(() => [
    randPiece(++pieceIdCounter), randPiece(++pieceIdCounter), randPiece(++pieceIdCounter),
  ]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [clearAnims, setClearAnims] = useState<ClearAnim[]>([]);
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([]);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [placedCells, setPlacedCells] = useState<Set<string>>(new Set());

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [ghostPos, setGhostPos] = useState<Pos | null>(null);
  const [canDrop, setCanDrop] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const floatId = useRef(0);

  // Check game over
  useEffect(() => {
    const unused = pieces.filter(p => !p.used);
    if (unused.length > 0 && !anyPieceFits(board, unused)) {
      setGameOver(true);
      haptic("error");
      if (score > bestScore) setBestScore(score);
    }
  }, [board, pieces, score, bestScore]);

  // Refill pieces when all used
  useEffect(() => {
    if (pieces.every(p => p.used)) {
      setPieces([
        randPiece(++pieceIdCounter), randPiece(++pieceIdCounter), randPiece(++pieceIdCounter),
      ]);
    }
  }, [pieces]);

  // Clear placed animation
  useEffect(() => {
    if (placedCells.size > 0) {
      const t = setTimeout(() => setPlacedCells(new Set()), 300);
      return () => clearTimeout(t);
    }
  }, [placedCells]);

  const addFloat = useCallback((text: string, x: number, y: number) => {
    const id = ++floatId.current;
    setFloatTexts(prev => [...prev, { id, text, x, y, ts: Date.now() }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== id)), 1000);
  }, []);

  // Board position for hit-testing
  const getBoardRect = useCallback(() => {
    return boardRef.current?.getBoundingClientRect() ?? null;
  }, []);

  const screenToGrid = useCallback((x: number, y: number, shape: Shape): Pos | null => {
    const rect = getBoardRect();
    if (!rect) return null;
    const { rows, cols } = shapeSize(shape);
    const cellTotal = CELL + GAP;
    const gridX = x - rect.left - GAP - (cols * cellTotal) / 2;
    const gridY = y - rect.top - GAP - (rows * cellTotal) / 2;
    const c = Math.round(gridX / cellTotal);
    const r = Math.round(gridY / cellTotal);
    if (r < 0 || c < 0 || r + rows > GRID || c + cols > GRID) return null;
    return { r, c };
  }, [getBoardRect]);

  // ─── Drag handlers ───
  const startDrag = useCallback((idx: number, x: number, y: number) => {
    if (pieces[idx].used || gameOver) return;
    setDragIdx(idx);
    setDragPos({ x, y });
    haptic("light");
  }, [pieces, gameOver]);

  const moveDrag = useCallback((x: number, y: number) => {
    if (dragIdx === null) return;
    setDragPos({ x, y });
    const piece = pieces[dragIdx];
    const pos = screenToGrid(x, y - 60, piece.shape);
    if (pos && canPlace(board, piece.shape, pos.r, pos.c)) {
      setGhostPos(pos);
      setCanDrop(true);
    } else {
      setGhostPos(pos);
      setCanDrop(false);
    }
  }, [dragIdx, pieces, board, screenToGrid]);

  const endDrag = useCallback(() => {
    if (dragIdx === null) return;
    const piece = pieces[dragIdx];

    if (canDrop && ghostPos && canPlace(board, piece.shape, ghostPos.r, ghostPos.c)) {
      let newBoard = placePiece(board, piece.shape, ghostPos.r, ghostPos.c, piece.color);
      haptic("medium");

      // Track placed cells for animation
      const newPlaced = new Set<string>();
      for (let dr = 0; dr < piece.shape.length; dr++)
        for (let dc = 0; dc < piece.shape[dr].length; dc++)
          if (piece.shape[dr][dc]) newPlaced.add(`${ghostPos.r + dr},${ghostPos.c + dc}`);
      setPlacedCells(newPlaced);

      const cellCount = shapeCellCount(piece.shape);
      const lines = findFullLines(newBoard);
      const lineCount = countLines(newBoard);
      let earnedPts = cellCount;
      let newCombo = 0;

      if (lines.length > 0) {
        newCombo = combo + 1;
        const comboMult = Math.min(newCombo, 5);
        const lineBonus = lineCount * 10 * comboMult;
        earnedPts += lineBonus;

        // Bonus text
        const rect = getBoardRect();
        if (rect) {
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;

          if (lineCount >= 3) {
            addFloat(`MEGA! +${lineBonus}`, cx, cy - 30);
          } else if (lineCount >= 2) {
            addFloat(`DOUBLE! +${lineBonus}`, cx, cy - 30);
          }
          if (newCombo >= 2) {
            addFloat(`Combo ×${comboMult}!`, cx, cy + 10);
          }
        }

        setTotalLines(prev => prev + lineCount);

        // Coins
        const coinsEarned = Math.floor(lineCount / 2) + (lineCount >= 3 ? 1 : 0) + (newCombo >= 3 ? 1 : 0);
        if (coinsEarned > 0) {
          addCoins(coinsEarned);
          setEarnedCoins(coinsEarned);
          setTimeout(() => setEarnedCoins(0), 1200);
          haptic("success");
        }

        haptic("heavy");
        setClearAnims(prev => [...prev, { cells: lines, ts: Date.now() }]);
        setTimeout(() => {
          setClearAnims(prev => prev.filter(a => Date.now() - a.ts < 500));
        }, 500);

        newBoard = clearCells(newBoard, lines);
        setCombo(newCombo);
      } else {
        setCombo(0);
      }

      setBoard(newBoard);
      setScore(s => s + earnedPts);
      setPieces(prev => prev.map((p, i) => i === dragIdx ? { ...p, used: true } : p));
    }

    setDragIdx(null);
    setDragPos(null);
    setGhostPos(null);
    setCanDrop(false);
  }, [dragIdx, ghostPos, canDrop, board, pieces, combo, addCoins, getBoardRect, addFloat]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    moveDrag(e.clientX, e.clientY);
  }, [moveDrag]);

  const onPointerUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Touch events for mobile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (dragIdx !== null) {
        e.preventDefault();
        const t = e.touches[0];
        moveDrag(t.clientX, t.clientY);
      }
    };
    const onTouchEnd = () => endDrag();
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [dragIdx, moveDrag, endDrag]);

  const restart = useCallback(() => {
    if (score > bestScore) setBestScore(score);
    setBoard(emptyBoard());
    setPieces([
      randPiece(++pieceIdCounter), randPiece(++pieceIdCounter), randPiece(++pieceIdCounter),
    ]);
    setScore(0);
    setCombo(0);
    setTotalLines(0);
    setGameOver(false);
    setClearAnims([]);
    setFloatTexts([]);
    haptic("medium");
  }, [score, bestScore]);

  // Sets for quick lookup
  const clearingSet = useMemo(() => {
    const s = new Set<string>();
    for (const a of clearAnims) for (const c of a.cells) s.add(`${c.r},${c.c}`);
    return s;
  }, [clearAnims]);

  const ghostSet = useMemo(() => {
    const s = new Set<string>();
    if (ghostPos && dragIdx !== null) {
      const shape = pieces[dragIdx].shape;
      for (let dr = 0; dr < shape.length; dr++)
        for (let dc = 0; dc < shape[dr].length; dc++)
          if (shape[dr][dc]) s.add(`${ghostPos.r + dr},${ghostPos.c + dc}`);
    }
    return s;
  }, [ghostPos, dragIdx, pieces]);

  const dragPiece = dragIdx !== null ? pieces[dragIdx] : null;

  // Fill percentage
  const fillPct = useMemo(() => {
    let filled = 0;
    for (const row of board) for (const c of row) if (c !== 0) filled++;
    return Math.round(filled / (GRID * GRID) * 100);
  }, [board]);

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        width: "100%", height: "100%", gap: 10,
        touchAction: "none",
        WebkitUserSelect: "none", userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        position: "relative", overflow: "hidden",
        padding: "8px 0",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "0 4px", flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.70)",
          borderRadius: 14, padding: "8px 14px", cursor: "pointer",
          fontSize: 12, fontWeight: 700, color: "rgba(0,0,0,0.50)",
          fontFamily: "inherit", backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>← Назад</button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {combo > 1 && (
            <div style={{
              padding: "4px 10px", borderRadius: 999,
              background: `linear-gradient(135deg, ${combo >= 4 ? "#ef4444" : combo >= 3 ? "#f59e0b" : "#fbbf24"}, ${combo >= 4 ? "#dc2626" : combo >= 3 ? "#d97706" : "#f59e0b"})`,
              fontSize: 11, fontWeight: 800, color: "#fff",
              animation: "combo-pop 0.3s ease-out",
              boxShadow: `0 2px 12px ${combo >= 3 ? "rgba(239,68,68,0.4)" : "rgba(251,191,36,0.4)"}`,
            }}>
              ×{combo}
            </div>
          )}
          <div style={{
            background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.70)",
            borderRadius: 14, padding: "8px 14px",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.30)", letterSpacing: "0.05em" }}>СЧЁТ</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(0,0,0,0.70)" }}>{score}</div>
            </div>
            <div style={{ width: 1, height: 24, background: "rgba(0,0,0,0.08)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.30)", letterSpacing: "0.05em" }}>ЛУЧШИЙ</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(0,0,0,0.45)" }}>{bestScore}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 10px", borderRadius: 999,
          background: "rgba(255,255,255,0.40)",
          border: "1px solid rgba(255,255,255,0.55)",
        }}>
          <span style={{ fontSize: 10 }}>📊</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.40)" }}>{totalLines} линий</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 10px", borderRadius: 999,
          background: "rgba(255,255,255,0.40)",
          border: "1px solid rgba(255,255,255,0.55)",
        }}>
          <span style={{ fontSize: 10 }}>📦</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: fillPct > 70 ? "rgba(220,60,60,0.70)" : "rgba(0,0,0,0.40)" }}>{fillPct}%</span>
        </div>
      </div>

      {/* Coin earned popup */}
      {earnedCoins > 0 && (
        <div style={{
          position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)",
          padding: "6px 16px", borderRadius: 999, zIndex: 50,
          background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
          boxShadow: "0 4px 20px rgba(251,191,36,0.4)",
          fontSize: 14, fontWeight: 800, color: "#fff",
          animation: "float-up 1.2s ease-out forwards",
        }}>
          +{earnedCoins} 🪙
        </div>
      )}

      {/* Float texts */}
      {floatTexts.map(f => (
        <div key={f.id} style={{
          position: "fixed", left: f.x, top: f.y,
          transform: "translateX(-50%)",
          fontSize: 16, fontWeight: 900, color: "rgba(124,92,252,0.90)",
          textShadow: "0 2px 8px rgba(124,92,252,0.3)",
          pointerEvents: "none", zIndex: 60, whiteSpace: "nowrap",
          animation: "float-up 1s ease-out forwards",
        }}>{f.text}</div>
      ))}

      {/* Board */}
      <div
        ref={boardRef}
        style={{
          width: BOARD_PX, height: BOARD_PX, flexShrink: 0,
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 8px 32px rgba(100,100,140,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
          borderRadius: 16,
          display: "grid",
          gridTemplateColumns: `repeat(${GRID}, ${CELL}px)`,
          gridTemplateRows: `repeat(${GRID}, ${CELL}px)`,
          gap: GAP, padding: GAP,
          position: "relative",
        }}
      >
        {board.flatMap((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const isGhost = ghostSet.has(key);
            const isClearing = clearingSet.has(key);
            const isPlaced = placedCells.has(key);
            const filled = cell !== 0;
            const ghostColor = dragPiece?.color ?? "#888";
            const cellColor = typeof cell === "string" ? cell : "rgba(130,100,200,0.55)";

            return (
              <div
                key={key}
                style={{
                  width: CELL, height: CELL,
                  borderRadius: 8,
                  transition: isClearing ? "none" : "background 0.12s ease, transform 0.12s ease, box-shadow 0.12s ease",
                  ...(isClearing ? {
                    background: "#fff",
                    animation: "cell-clear 0.35s ease-out forwards",
                    boxShadow: "0 0 16px rgba(255,255,255,0.8)",
                  } : filled ? {
                    background: cellColor,
                    boxShadow: `inset 0 -2px 0 rgba(0,0,0,0.12), 0 2px 6px ${cellColor}30`,
                    border: "1px solid rgba(255,255,255,0.35)",
                    transform: isPlaced ? "scale(1)" : undefined,
                    animation: isPlaced ? "cell-place 0.25s ease-out" : undefined,
                  } : isGhost ? {
                    background: canDrop ? `${ghostColor}40` : "rgba(255,80,80,0.15)",
                    border: canDrop ? `1.5px dashed ${ghostColor}80` : "1.5px dashed rgba(255,80,80,0.30)",
                    transform: canDrop ? "scale(1.02)" : "scale(1)",
                  } : {
                    background: "rgba(0,0,0,0.025)",
                    border: "1px solid rgba(0,0,0,0.03)",
                  }),
                }}
              />
            );
          })
        )}
      </div>

      {/* Pieces tray */}
      <div style={{
        display: "flex", gap: 12, justifyContent: "center", alignItems: "center",
        padding: "10px 8px", flexShrink: 0,
        background: "rgba(255,255,255,0.35)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.55)",
        borderRadius: 20, minHeight: 88,
      }}>
        {pieces.map((piece, idx) => {
          if (piece.used) {
            return <div key={piece.id} style={{ width: 72, height: 72 }} />;
          }
          const { rows, cols } = shapeSize(piece.shape);
          const isDragging = dragIdx === idx;
          const miniCell = Math.min(14, Math.floor(60 / Math.max(rows, cols)));

          return (
            <div
              key={piece.id}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                startDrag(idx, e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                startDrag(idx, t.clientX, t.clientY);
              }}
              style={{
                width: 72, height: 72,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isDragging ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.40)",
                border: "1px solid rgba(255,255,255,0.60)",
                borderRadius: 14,
                cursor: "grab",
                opacity: isDragging ? 0.3 : 1,
                transition: "opacity 0.15s, transform 0.15s",
                touchAction: "none",
              }}
            >
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, ${miniCell}px)`,
                gridTemplateRows: `repeat(${rows}, ${miniCell}px)`,
                gap: 1.5,
              }}>
                {piece.shape.flatMap((row, dr) =>
                  row.map((filled, dc) => (
                    <div key={`${dr}-${dc}`} style={{
                      width: miniCell, height: miniCell,
                      borderRadius: 3,
                      background: filled ? piece.color : "transparent",
                      boxShadow: filled ? `inset 0 -1px 0 rgba(0,0,0,0.12), 0 1px 3px ${piece.color}33` : "none",
                    }} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating drag piece */}
      {dragIdx !== null && dragPos && dragPiece && (
        <div style={{
          position: "fixed",
          left: dragPos.x,
          top: dragPos.y - 80,
          transform: "translate(-50%, -50%) scale(1.05)",
          pointerEvents: "none",
          zIndex: 100,
          filter: `drop-shadow(0 8px 24px ${dragPiece.color}55)`,
          opacity: 0.92,
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${shapeSize(dragPiece.shape).cols}, ${CELL - 2}px)`,
            gridTemplateRows: `repeat(${shapeSize(dragPiece.shape).rows}, ${CELL - 2}px)`,
            gap: GAP,
          }}>
            {dragPiece.shape.flatMap((row, dr) =>
              row.map((filled, dc) => (
                <div key={`${dr}-${dc}`} style={{
                  width: CELL - 2, height: CELL - 2,
                  borderRadius: 7,
                  background: filled ? dragPiece.color : "transparent",
                  border: filled ? "1px solid rgba(255,255,255,0.50)" : "none",
                  boxShadow: filled
                    ? `inset 0 -2px 0 rgba(0,0,0,0.10), 0 2px 8px ${dragPiece.color}44`
                    : "none",
                }} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {gameOver && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
          animation: "fade-in 0.3s ease-out",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(255,255,255,0.85)",
            borderRadius: 28, padding: "28px 36px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
          }}>
            <div style={{ fontSize: 40 }}>{score >= bestScore && score > 0 ? "🎉" : "😔"}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(0,0,0,0.70)" }}>
              {score >= bestScore && score > 0 ? "Новый рекорд!" : "Игра окончена"}
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.30)" }}>СЧЁТ</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(0,0,0,0.70)" }}>{score}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.30)" }}>ЛИНИИ</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(0,0,0,0.65)" }}>{totalLines}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={restart} style={{
                padding: "13px 28px", borderRadius: 999, border: "none",
                background: "linear-gradient(135deg, #c5b8d8, #a89cc8)",
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 16px rgba(197,184,216,0.40)",
              }}>
                Заново 🔄
              </button>
              <button onClick={onBack} style={{
                padding: "13px 28px", borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.10)",
                background: "rgba(255,255,255,0.55)",
                color: "rgba(0,0,0,0.50)", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes cell-clear {
          0% { transform: scale(1); opacity: 1; background: #fff; }
          40% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes cell-place {
          0% { transform: scale(0.5); opacity: 0.5; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes combo-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}