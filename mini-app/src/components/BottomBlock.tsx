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

const ALL_TABS: TabId[] = ["feed", "play", "shop", "wash", "sleep", "partner", "settings"];

export const WIDGET_H = NAV_PAD * 2 + BTN_W;  // 66
export const HALF_H   = WIDGET_H / 2;          // 33
const GLOVE_SZ  = WIDGET_H;
export const GLOVE_GAP = 10;

function fmtCd(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  if (!s) return "";
  if (s > 3600) return `${Math.floor(s / 3600)}ч`;
  if (s > 60) return `${Math.floor(s / 60)}м`;
  return `${s}с`;
}
const cdActive = (iso: string | null) => !!iso && new Date(iso).getTime() > Date.now();

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
  pet, sleepVal,
  activeTab,
  isCd, getCd,
  onTab, onClose,
  petRef, onStroking, isStroking,
}: Props) {
  const { openMenu } = useMenuStore();
  const menuIsOpen = openMenu !== null;
  const closedBottomPad = "clamp(24px,6.5vw,38px)";

  const activeIndex = activeTab !== null ? Math.max(0, ALL_TABS.indexOf(activeTab)) : 0;

  const widgetStyle: React.CSSProperties = menuIsOpen
    ? { background: "rgba(255,255,255,0.10)" }
    : { ...GLASS };

  // Extra horizontal padding so pill clip doesn't eat button shadows
  const SPAD_H = 12;
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
          display: "flex", justifyContent: "center", alignItems: "center", // ← center вместо flex-end
          gap: GLOVE_GAP, flexShrink: 0,
          transition: "padding 0.25s ease",
        }}>

          {/* ── Pill ── */}
          <div style={{
            ...widgetStyle,
            borderRadius: `${HALF_H}px`,
            height: WIDGET_H,
            width: pillOuterW,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            overflowX: "hidden",
            overflowY: "visible",
            boxSizing: "border-box",
            transition: "background 0.25s, box-shadow 0.25s, border 0.25s",
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

          {/* ── Side glove / chevron — same height as pill ── */}
          <div style={{
            width: GLOVE_SZ,
            height: WIDGET_H,        // ← точно = WIDGET_H, без marginBlock
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

        {/* ── Menu content ── (без status rings) */}
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
              <MenuPanel menuH="50dvh" pet={pet} sleepVal={sleepVal} />
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

export { fmtCd, cdActive };