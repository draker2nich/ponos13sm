// mini-app/src/components/BottomBlock.tsx
import { AnimatePresence, motion } from "framer-motion";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { Carousel, CarouselBtn, NOTAP, NAV_PAD, BTN_W, BTN_GAP, PILL_INNER_W, type TabId } from "./NavCarousel";
import { MenuPanel } from "./MenuPanel";
import { PettingGlove } from "./PettingGlove";
import { IC } from "./icons";
import type { Pet } from "../api/types";

/* ── Design tokens ── */
export const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.60)",
  backdropFilter: "blur(32px) saturate(180%)",
  WebkitBackdropFilter: "blur(32px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.72)",
  boxShadow: "0 8px 32px rgba(100,100,140,0.13), 0 2px 8px rgba(100,100,140,0.08), inset 0 1.5px 0 rgba(255,255,255,0.95)",
};

/* Tab ordering that matches MENU_ORDER + extra tabs */
const ALL_TABS: TabId[] = ["feed", "play", "shop", "wash", "sleep", "partner", "settings"];

const WIDGET_H  = NAV_PAD * 2 + BTN_W;   // 66
const HALF_H    = WIDGET_H / 2;           // 33
const GLOVE_SZ  = WIDGET_H;
const GLOVE_GAP = 10;

function fmtCd(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  if (!s) return "";
  if (s > 3600) return `${Math.floor(s / 3600)}ч`;
  if (s > 60) return `${Math.floor(s / 60)}м`;
  return `${s}с`;
}
const cdActive = (iso: string | null) => !!iso && new Date(iso).getTime() > Date.now();

/* ── StatusRing ── */
const RING_SIZE = 34;
function toDeg(v: number) { return Math.round(Math.max(0, Math.min(100, v)) / 100 * 360); }

function StatusRing({ value, icon }: { value: number; icon: React.ReactNode }) {
  const deg = toDeg(value);
  const low = value < 25;
  const R = 13;
  const circ = 2 * Math.PI * R;
  const dash = deg / 360 * circ;
  const col = low ? "rgba(220,60,60,0.80)" : "rgba(80,80,100,0.50)";
  return (
    <div style={{ position: "relative", width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
      <svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={2} />
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R} fill="none" stroke={col} strokeWidth={2}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{
        position: "absolute", inset: 5, borderRadius: "50%",
        background: "rgba(255,255,255,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 5,
        color: low ? "rgba(200,50,50,0.85)" : "rgba(60,60,80,0.55)",
      }}>{icon}</div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Props
   ════════════════════════════════════════════ */
interface Props {
  pet: Pet;
  evo: number;
  sleepVal: number;
  activeTab: TabId | null;
  isCd: (a: string) => boolean;
  getCd: (a: string) => string | null;
  onTab: (t: TabId) => void;
  onClose: () => void;
  petRef: React.RefObject<HTMLDivElement | null>;
  onStroking: (v: boolean) => void;
  isStroking: boolean;
}

/* ════════════════════════════════════════════
   BottomBlock
   ════════════════════════════════════════════ */
export function BottomBlock({
  pet, evo: _evo, sleepVal,
  activeTab, isCd, getCd,
  onTab, onClose,
  petRef, onStroking, isStroking,
}: Props) {
  const { openMenu } = useMenuStore();
  const menuIsOpen = openMenu !== null;
  const closedBottomPad = "clamp(24px,6.5vw,38px)";

  // Active index within ALL_TABS for the carousel centering logic
  const activeIndex = activeTab !== null ? Math.max(0, ALL_TABS.indexOf(activeTab)) : 0;

  const widgetStyle: React.CSSProperties = menuIsOpen
    ? { background: "rgba(255,255,255,0.10)" }
    : { ...GLASS };

  // Pill width needs extra horizontal padding so clipped shadows on left/right edges are visible
  // We pull the pill container out by SPAD on each side and clip only horizontally inside.
  const SPAD_H = 12; // horizontal shadow padding (mirrors vertical SPAD in Carousel)
  const pillOuterW = PILL_INNER_W + SPAD_H * 2;

  return (
    <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", width: "100%", ...NOTAP }}>
      <div style={{
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)",
        display: "flex", flexDirection: "column", flexShrink: 0,
        pointerEvents: menuIsOpen ? "auto" : "none",
        ...(menuIsOpen ? {
          ...GLASS,
          borderBottom: "none",
          borderRadius: `${HALF_H}px ${HALF_H}px 0 0`,
          overflow: "hidden",
        } : {}),
      }}>

        {/* ── Nav row ── */}
        <div style={{
          pointerEvents: "auto",
          padding: menuIsOpen ? `8px 16px 0` : `0 16px ${closedBottomPad}`,
          display: "flex", justifyContent: "center", alignItems: "flex-end",
          gap: GLOVE_GAP, flexShrink: 0,
          transition: "padding 0.25s ease",
        }}>

          {/* ── Pill ── */}
          {/*
            We need:
            - Horizontal clip so the pill shape is preserved
            - Vertical overflow so button shadows paint above/below
            Solution: outer div clips X, sets negative margin Y for shadow room.
          */}
          <div style={{
            ...widgetStyle,
            borderRadius: `${HALF_H}px`,
            height: WIDGET_H,
            // Use pillOuterW so SPAD_H on each side gives shadow room before clip
            width: pillOuterW,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            // Clip only X, let Y overflow for shadows
            overflowX: "hidden",
            overflowY: "visible",
            boxSizing: "border-box",
            transition: "background 0.25s, box-shadow 0.25s, border 0.25s",
            // Negative vertical margin so the pill's own overflow:visible doesn't push layout
            marginBlock: -NAV_PAD,
            paddingBlock: NAV_PAD,
          }}>
            <Carousel activeIndex={activeIndex} totalCount={ALL_TABS.length}>
              <CarouselBtn icon={IC.food}  active={activeTab === "feed"}  disabled={isCd("feed")} cdLabel={fmtCd(getCd("feed"))} onClick={() => onTab("feed")} />
              <CarouselBtn icon={IC.game}  active={activeTab === "play"}  disabled={isCd("play")} cdLabel={fmtCd(getCd("play"))} onClick={() => onTab("play")} />
              <CarouselBtn icon={IC.shop}  active={activeTab === "shop"}  onClick={() => onTab("shop")} />
              <CarouselBtn icon={IC.wash}  active={activeTab === "wash"}  onClick={() => onTab("wash")} />
              <CarouselBtn icon={IC.moon}  active={activeTab === "sleep"} onClick={() => onTab("sleep")} />
              <CarouselBtn icon={IC.users} active={activeTab === "partner"} onClick={() => onTab("partner")} />
              <CarouselBtn icon={IC.settings} active={activeTab === "settings"} onClick={() => onTab("settings")} />
            </Carousel>
          </div>

          {/* ── Side glove / chevron button ── */}
          <div style={{
            width: GLOVE_SZ, height: GLOVE_SZ,
            borderRadius: `${GLOVE_SZ / 2}px`,
            flexShrink: 0,
            ...widgetStyle,
            position: "relative",
            overflow: "hidden",
            transition: "background 0.25s, box-shadow 0.25s, border 0.25s",
          }}>
            {/* Glove */}
            <div style={{
              position: "absolute", inset: 0,
              opacity: menuIsOpen ? 0 : 1,
              pointerEvents: menuIsOpen ? "none" : "auto",
              transition: "opacity 0.15s",
            }}>
              <PettingGlove petRef={petRef} onStroking={onStroking} isStroking={isStroking} />
            </div>
            {/* Chevron */}
            <div
              onClick={menuIsOpen ? onClose : undefined}
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: menuIsOpen ? "pointer" : "default",
                opacity: menuIsOpen ? 1 : 0,
                pointerEvents: menuIsOpen ? "auto" : "none",
                transition: "opacity 0.15s",
                ...NOTAP,
              }}
            >
              <div style={{ width: 26, height: 26, color: "rgba(0,0,0,0.50)" }}>{IC.chevronDown}</div>
            </div>
          </div>
        </div>

        {/* ── Header status rings (shown when menu open) ── */}
        <AnimatePresence>
          {menuIsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", display: "flex", justifyContent: "center", gap: 6, padding: "6px 16px 0" }}
            >
              <StatusRing value={pet.hunger}    icon={IC.food} />
              <StatusRing value={pet.happiness} icon={IC.game} />
              <StatusRing value={sleepVal}      icon={IC.moon} />
              <StatusRing value={pet.health}    icon={IC.wash} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Menu content ── */}
        <AnimatePresence>
          {menuIsOpen && (
            <motion.div
              key="menu-slide"
              initial={{ height: 0 }}
              animate={{ height: "50dvh" }}
              exit={{ height: 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 42, mass: 0.75 }}
              style={{ overflow: "hidden", flexShrink: 0 }}
            >
              <MenuPanel menuH="50dvh" />
            </motion.div>
          )}
        </AnimatePresence>

        {!menuIsOpen && (
          <div style={{ pointerEvents: "auto", height: 4, marginBottom: "clamp(5px,1.5vw,8px)" }} />
        )}
      </div>
    </div>
  );
}

export { StatusRing, fmtCd, cdActive, WIDGET_H, HALF_H, GLOVE_GAP };