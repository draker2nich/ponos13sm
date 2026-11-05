import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { plural } from "../lib/format";
import { haptic } from "../lib/telegram";
import { useCoinStore } from "../store/useCoinStore";
import {
  GRID,
  LINES_PER_COIN,
  anyMoveLeft,
  canPlace,
  cellCount,
  cellsOf,
  clear,
  emptyBoard,
  fullLines,
  newPieces,
  place,
  scoreFor,
  shapeSize,
  type Piece,
  type Pos,
} from "./logic";
import { useCoinBank } from "./useCoinBank";
import "./BlockBlast.css";

// The dragged piece floats above the finger so it isn't hidden under it
const LIFT_PX = 72;

interface Drag {
  index: number;
  x: number;
  y: number;
  target: Pos | null;
  fits: boolean;
}

export function BlockBlast({ onClose }: { onClose: () => void }) {
  const storedBest = useCoinStore((s) => s.bestScore);
  const claim = useCoinStore((s) => s.claimFromGame);
  const deposit = useCoinBank();

  const [board, setBoard] = useState(emptyBoard);
  const [pieces, setPieces] = useState(newPieces);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(storedBest);
  const [combo, setCombo] = useState(0);
  const [clearing, setClearing] = useState<Set<string>>(new Set());
  const [coinPop, setCoinPop] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const lines = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);

  const gameOver = useMemo(() => !pieces.every((p) => p.used) && !anyMoveLeft(board, pieces), [board, pieces]);

  useEffect(() => {
    if (pieces.every((p) => p.used)) setPieces(newPieces());
  }, [pieces]);

  useEffect(() => {
    if (!gameOver) return;
    haptic("error");
    if (score > best) {
      setBest(score);
      void claim(0, score);
    }
    // Only react to the moment the game ends, not to every score change
  }, [gameOver]);

  const cellPx = () => (boardRef.current?.getBoundingClientRect().width ?? 320) / GRID;

  const targetAt = useCallback((x: number, y: number, piece: Piece): Pos | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const size = rect.width / GRID;
    const { rows, cols } = shapeSize(piece.shape);
    const c = Math.round((x - rect.left) / size - cols / 2);
    const r = Math.round((y - LIFT_PX - rect.top) / size - rows / 2);
    return r < 0 || c < 0 || r + rows > GRID || c + cols > GRID ? null : { r, c };
  }, []);

  const drop = useCallback(
    (d: Drag) => {
      const piece = pieces[d.index];
      if (!d.target || !d.fits) return;

      let next = place(board, piece, d.target);
      const { cells, lines: cleared } = fullLines(next);
      const nextCombo = cleared ? combo + 1 : 0;
      haptic(cleared ? "heavy" : "medium");

      if (cleared) {
        next = clear(next, cells);
        setClearing(new Set(cells.map(({ r, c }) => `${r},${c}`)));
        window.setTimeout(() => setClearing(new Set()), 350);

        lines.current += cleared;
        const coins = Math.floor(lines.current / LINES_PER_COIN);
        if (coins) {
          lines.current %= LINES_PER_COIN;
          deposit(coins);
          setCoinPop(coins);
          window.setTimeout(() => setCoinPop(0), 1000);
        }
      }

      setBoard(next);
      setCombo(nextCombo);
      setScore((s) => s + scoreFor(cellCount(piece.shape), cleared, nextCombo));
      setPieces((ps) => ps.map((p, i) => (i === d.index ? { ...p, used: true } : p)));
    },
    [board, combo, pieces, deposit],
  );

  // Track the pointer on window while dragging so it works across the whole screen
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const piece = pieces[drag.index];
      const target = targetAt(e.clientX, e.clientY, piece);
      setDrag({ ...drag, x: e.clientX, y: e.clientY, target, fits: !!target && canPlace(board, piece.shape, target) });
    };
    const up = () => {
      drop(drag);
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, pieces, board, targetAt, drop]);

  const startDrag = (index: number, e: React.PointerEvent) => {
    if (pieces[index].used || gameOver) return;
    e.preventDefault();
    haptic("light");
    setDrag({ index, x: e.clientX, y: e.clientY, target: null, fits: false });
  };

  const restart = () => {
    setBest((b) => Math.max(b, score));
    setBoard(emptyBoard());
    setPieces(newPieces());
    setScore(0);
    setCombo(0);
    lines.current = 0;
    haptic("medium");
  };

  const dragged = drag ? pieces[drag.index] : null;
  const ghost = new Set(drag?.target && dragged ? cellsOf(dragged.shape, drag.target).map(({ r, c }) => `${r},${c}`) : []);

  return (
    <div className="bb">
      <header className="bb__top">
        <button className="bb__icon-btn" onClick={onClose} aria-label="Назад">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <div className="bb__scores">
          {combo > 1 && <span className="bb__combo num">×{combo}</span>}
          <div className="bb__score">
            <span>Счёт</span>
            <b className="num">{score}</b>
          </div>
          <div className="bb__score bb__score--muted">
            <span>Рекорд</span>
            <b className="num">{Math.max(best, score)}</b>
          </div>
        </div>
      </header>

      <div className="bb__board" ref={boardRef}>
        {board.flatMap((row, r) =>
          row.map((color, c) => {
            const key = `${r},${c}`;
            const isGhost = ghost.has(key) && !color;
            const cls = clearing.has(key) ? "bb__cell bb__cell--clear" : "bb__cell";
            return (
              <div
                key={key}
                className={cls}
                style={
                  color
                    ? { background: color }
                    : isGhost
                      ? { background: drag?.fits ? `${dragged!.color}55` : "rgba(196,55,47,0.15)" }
                      : undefined
                }
              />
            );
          }),
        )}
        {coinPop > 0 && <div className="bb__coins num">+{coinPop} {plural(coinPop, "монета", "монеты", "монет")}</div>}
      </div>

      <div className="bb__tray">
        {pieces.map((piece, i) => (
          <div
            key={piece.id}
            className="bb__slot"
            style={{ opacity: piece.used ? 0 : drag?.index === i ? 0.3 : 1 }}
            onPointerDown={(e) => startDrag(i, e)}
          >
            {!piece.used && <PieceView piece={piece} cell={Math.min(14, 56 / Math.max(...Object.values(shapeSize(piece.shape))))} />}
          </div>
        ))}
      </div>

      <p className="bb__hint">Собирай линии: каждые {LINES_PER_COIN} линии — монета</p>

      {drag && dragged && (
        <div className="bb__floating" style={{ left: drag.x, top: drag.y - LIFT_PX }}>
          <PieceView piece={dragged} cell={cellPx() - 4} />
        </div>
      )}

      {gameOver && (
        <div className="bb__over">
          <div className="bb__over-card">
            <h2>Ходов больше нет</h2>
            <p className="num">
              Счёт {score} · рекорд {Math.max(best, score)}
            </p>
            <button className="btn btn--primary btn--block" onClick={restart}>
              <RotateCcw size={18} strokeWidth={1.75} />
              Сыграть ещё
            </button>
            <button className="btn btn--secondary btn--block" onClick={onClose}>
              К питомцу
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PieceView({ piece, cell }: { piece: Piece; cell: number }) {
  const { cols } = shapeSize(piece.shape);
  return (
    <div className="bb__piece" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridAutoRows: `${cell}px` }}>
      {piece.shape.flatMap((row, r) =>
        row.map((v, c) => <div key={`${r}-${c}`} style={v ? { background: piece.color } : undefined} />),
      )}
    </div>
  );
}
