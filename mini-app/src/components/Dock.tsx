import { useEffect, useRef, type RefObject } from "react";
import { Bath, ChevronDown, Gamepad2, Moon, Settings, ShoppingBag, Users, Utensils, type LucideIcon } from "lucide-react";
import type { Pet } from "../api";
import { TABS, useMenuStore, type Tab } from "../store/useMenuStore";
import { MenuSheet } from "./MenuSheet";
import { PettingGlove } from "./PettingGlove";
import "./Dock.css";

export const TAB_META: Record<Tab, { icon: LucideIcon; title: string }> = {
  feed: { icon: Utensils, title: "Еда" },
  play: { icon: Gamepad2, title: "Игры" },
  shop: { icon: ShoppingBag, title: "Магазин" },
  wash: { icon: Bath, title: "Купание" },
  sleep: { icon: Moon, title: "Сон" },
  partner: { icon: Users, title: "Вдвоём" },
  settings: { icon: Settings, title: "Питомец" },
};

interface Props {
  pet: Pet;
  petRef: RefObject<HTMLDivElement>;
  stroking: boolean;
  onStroking: (v: boolean) => void;
  onOpenGame: () => void;
  onDeleted: () => void;
}

export function Dock({ pet, petRef, stroking, onStroking, onOpenGame, onDeleted }: Props) {
  const { open, setOpen } = useMenuStore();
  const tabsRef = useRef<HTMLDivElement>(null);

  // Keep the selected tab centred in the three-icon window
  useEffect(() => {
    const tabs = tabsRef.current;
    const el = open && tabs?.querySelector<HTMLElement>(`[data-tab="${open}"]`);
    if (tabs && el) tabs.scrollTo({ left: el.offsetLeft - (tabs.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [open]);

  return (
    <div className={`dock${open ? " dock--open" : ""}`}>
      <div className="dock__bar">
        <nav className="tabs" ref={tabsRef}>
          {TABS.map((tab) => {
            const { icon: Icon, title } = TAB_META[tab];
            return (
              <button
                key={tab}
                data-tab={tab}
                className={`tabs__btn${open === tab ? " is-active" : ""}`}
                onClick={() => setOpen(open === tab ? null : tab)}
                aria-label={title}
                aria-pressed={open === tab}
              >
                <Icon size={20} strokeWidth={1.75} />
              </button>
            );
          })}
        </nav>

        <div className="dock__side">
          {open ? (
            <button className="dock__close" onClick={() => setOpen(null)} aria-label="Свернуть">
              <ChevronDown size={22} strokeWidth={1.75} />
            </button>
          ) : (
            <PettingGlove petRef={petRef} stroking={stroking} onStroking={onStroking} />
          )}
        </div>
      </div>

      {open && <MenuSheet tab={open} pet={pet} onOpenGame={onOpenGame} onDeleted={onDeleted} />}
    </div>
  );
}
