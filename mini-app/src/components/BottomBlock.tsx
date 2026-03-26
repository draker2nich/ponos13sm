// mini-app/src/components/BottomBlock.tsx
// Rewritten: CSS transitions instead of spring height animation
import { useMenuStore, type MenuCategory } from "../store/useMenuStore";
import { Carousel, CarouselBtn, NOTAP, NAV_PAD, BTN_W, PILL_INNER_W, type TabId } from "./NavCarousel";
import { MenuPanel } from "./MenuPanel";
import { PettingGlove } from "./PettingGlove";
import { IC } from "./icons";
import type { Pet } from "../api/types";

/* ── Design tokens ── */
export const GLASS_BG = "rgba(255,255,255,0.58)";
export const GLASS_BORDER = "1px solid rgba(255,255,255,0.70)";
export const GLASS_SHADOW = "0 -4px 24px rgba(100,100,140,0.08)";

const ALL_TABS: TabId[] = ["feed", "play", "shop", "wash", "sleep", "partner", "settings"];

export const WIDGET_H = NAV_PAD * 2 + BTN_W;
export const HALF_H   = WIDGET_H / 2;
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

/* ════════════════════════════════════════════ */
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
  navRowRef?: React.RefObject<HTMLDivElement | null>;
  onGameOpen?: () => void;
}

export function BottomBlock({
  pet, sleepVal,
  activeTab,
  isCd, getCd,
  onTab, onClose,
  petRef, onStroking, isStroking,
  navRowRef,
  onGameOpen,
}: Props) {
  const { openMenu } = useMenuStore();
  const menuIsOpen = openMenu !== null;
  const activeIndex = activeTab !== null ? Math.max(0, ALL_TABS.indexOf(activeTab)) : 0;

  return (
    <div style={{
      position: "relative", zIndex: 10,
      display: "flex", flexDirection: "column", width: "100%",
      ...NOTAP,
    }}>
      {/* ── Outer shell ── */}
      <div style={{
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)",
        display: "flex", flexDirection: "column", flexShrink: 0,
        ...(menuIsOpen ? {
          background: GLASS_BG,
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          borderTop: GLASS_BORDER,
          borderRadius: `${HALF_H}px ${HALF_H}px 0 0`,
          boxShadow: GLASS_SHADOW,
        } : {}),
        transition: "background 0.2s ease, border-radius 0.2s ease",
      }}>

        {/* ── Nav row ── */}
        <div
          ref={navRowRef as React.RefObject<HTMLDivElement>}
          style={{
            pointerEvents: "auto",
            padding: menuIsOpen ? `8px 16px 0` : `0 16px clamp(24px,6.5vw,38px)`,
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: GLOVE_GAP, flexShrink: 0,
            transition: "padding 0.2s ease",
          }}
        >
          {/* ── Pill ── */}
          <div style={{
            background: menuIsOpen ? "rgba(255,255,255,0.10)" : GLASS_BG,
            ...(!menuIsOpen ? {
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: GLASS_BORDER,
              boxShadow: "0 4px 16px rgba(100,100,140,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
            } : {
              border: "1px solid rgba(255,255,255,0.15)",
            }),
            borderRadius: `${HALF_H}px`,
            height: WIDGET_H,
            width: PILL_INNER_W,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            transition: "background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease",
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

          {/* ── Side glove / chevron ── */}
          <div style={{
            width: GLOVE_SZ,
            height: WIDGET_H,
            borderRadius: `${GLOVE_SZ / 2}px`,
            flexShrink: 0,
            background: menuIsOpen ? "rgba(255,255,255,0.10)" : GLASS_BG,
            ...(!menuIsOpen ? {
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: GLASS_BORDER,
              boxShadow: "0 4px 16px rgba(100,100,140,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
            } : {
              border: "1px solid rgba(255,255,255,0.15)",
            }),
            position: "relative",
            overflow: menuIsOpen ? "hidden" : "visible",
            transition: "background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              opacity: menuIsOpen ? 0 : 1,
              pointerEvents: menuIsOpen ? "none" : "auto",
              transition: "opacity 0.15s ease",
            }}>
              <PettingGlove petRef={petRef} onStroking={onStroking} isStroking={isStroking} />
            </div>
            <div
              onClick={menuIsOpen ? onClose : undefined}
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: menuIsOpen ? "pointer" : "default",
                opacity: menuIsOpen ? 1 : 0,
                pointerEvents: menuIsOpen ? "auto" : "none",
                transition: "opacity 0.15s ease",
                ...NOTAP,
              }}
            >
              <div style={{ width: 26, height: 26, color: "rgba(0,0,0,0.50)" }}>{IC.chevronDown}</div>
            </div>
          </div>
        </div>

        {/* ── Menu content ── */}
        <div style={{
          maxHeight: menuIsOpen ? "50dvh" : "0px",
          overflow: "hidden",
          transition: "max-height 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
          willChange: menuIsOpen ? "max-height" : "auto",
        }}>
          <MenuPanel menuH="50dvh" pet={pet} sleepVal={sleepVal} onGameOpen={onGameOpen} />
        </div>

        {!menuIsOpen && (
          <div style={{ pointerEvents: "auto", height: 4, marginBottom: "clamp(5px,1.5vw,8px)" }} />
        )}
      </div>
    </div>
  );
}

export { fmtCd, cdActive };