import { useRef } from "react";
import type { Pet } from "../api";
import { useMenuStore, type Tab } from "../store/useMenuStore";
import { TAB_META } from "./Dock";
import { FeedMenu, WashMenu } from "./menus/ItemMenus";
import { PartnerMenu } from "./menus/PartnerMenu";
import { PlayMenu } from "./menus/PlayMenu";
import { SettingsMenu } from "./menus/SettingsMenu";
import { ShopMenu } from "./menus/ShopMenu";
import { SleepMenu } from "./menus/SleepMenu";
import "./MenuSheet.css";

const SWIPE_PX = 40;

interface Props {
  tab: Tab;
  pet: Pet;
  onOpenGame: () => void;
  onDeleted: () => void;
}

/** Sheet under the dock. Swipe sideways to switch tabs, swipe down to close. */
export function MenuSheet({ tab, pet, onOpenGame, onDeleted }: Props) {
  const { direction, step, setOpen } = useMenuStore();
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    start.current = null;
    if (dy > SWIPE_PX && dy > Math.abs(dx) * 1.3) setOpen(null);
    else if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else return;
    swiped.current = true;
  };

  // A swipe that ends on a button must not also press it (e.g. buy an item)
  const onClickCapture = (e: React.MouseEvent) => {
    if (!swiped.current) return;
    swiped.current = false;
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <section
      className="sheet"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
      onClickCapture={onClickCapture}
    >
      <div key={tab} className="sheet__page" style={{ "--from": `${direction * 32}px` } as React.CSSProperties}>
        <h2 className="sheet__title">{TAB_META[tab].title}</h2>
        {tab === "feed" && <FeedMenu pet={pet} />}
        {tab === "play" && <PlayMenu pet={pet} onOpenGame={onOpenGame} />}
        {tab === "shop" && <ShopMenu />}
        {tab === "wash" && <WashMenu pet={pet} />}
        {tab === "sleep" && <SleepMenu pet={pet} />}
        {tab === "partner" && <PartnerMenu pet={pet} />}
        {tab === "settings" && <SettingsMenu pet={pet} onDeleted={onDeleted} />}
      </div>
    </section>
  );
}
