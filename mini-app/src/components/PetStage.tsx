import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Heart, UserPlus } from "lucide-react";
import type { Pet } from "../api";
import { describe, lastPartnerAction } from "../lib/activity";
import { timeAgo } from "../lib/format";
import { haptic } from "../lib/telegram";
import { PetSprite } from "./PetSprite";
import "./PetStage.css";

export interface Burst {
  id: number;
  text: string;
}

interface Props {
  pet: Pet;
  menuOpen: boolean;
  stroking: boolean;
  burst: Burst | null;
  petRef: RefObject<HTMLDivElement>;
  onInvite: () => void;
}

interface HeartFx {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const SPRING = { stiffness: 220, damping: 26, mass: 0.8 };
const HEART_EVERY_MS = 180;

export function PetStage({ pet, menuOpen, stroking, burst, petRef, onInvite }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);
  const { hearts, spawn } = useHearts(stroking && !menuOpen, petRef);
  const [boing, setBoing] = useState(0);
  const dragged = useRef(false);

  // A tap (not a drag) makes the pet hop
  const onTap = () => {
    if (pet.is_sleeping || dragged.current) return;
    setBoing((n) => n + 1);
    spawn();
    haptic("light");
  };

  // While the sheet is open the pet returns to the middle of the space that's left
  useEffect(() => {
    if (menuOpen || pet.is_sleeping) {
      x.set(0);
      y.set(0);
    }
  }, [menuOpen, pet.is_sleeping, x, y]);

  const mood = pet.is_sleeping ? "sleepy" : stroking ? "happy" : pet.mood;
  const partner = pet.owners.find((o) => !o.is_me);
  const partnerDid = lastPartnerAction(pet);

  return (
    <div className="stage" ref={stageRef}>
      <motion.div
        className="stage__pet"
        drag={!menuOpen && !pet.is_sleeping}
        dragConstraints={stageRef}
        dragElastic={0.08}
        dragMomentum={false}
        onTap={onTap}
        onDragStart={() => (dragged.current = true)}
        onPointerDown={() => (dragged.current = false)}
        style={{ x: springX, y: springY }}
        animate={{ scale: menuOpen ? 0.8 : 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div ref={petRef} className="stage__body">
          {burst && (
            <span key={burst.id} className="stage__burst num">
              {burst.text}
            </span>
          )}
          {pet.is_sleeping && <Zzz />}
          <div key={boing} className={boing ? "stage__hop" : undefined}>
            <PetSprite type={pet.pet_type} mood={mood} level={pet.level} reacting={stroking} size="clamp(132px, 40vw, 184px)" />
          </div>
          <div className="stage__shadow" />
        </div>
      </motion.div>

      <div className={`stage__partner${menuOpen || pet.is_sleeping ? " is-hidden" : ""}`}>
        {partner ? (
          <span className="chip">
            <span className={`chip__dot${isOnline(partner.last_active_at) ? " chip__dot--on" : ""}`} />
            {partnerDid
              ? `${describe(partnerDid, pet)} · ${timeAgo(partnerDid.performed_at)}`
              : `${partner.name ?? "Партнёр"} · ${timeAgo(partner.last_active_at) ?? "ещё не заходил"}`}
          </span>
        ) : (
          <button className="chip chip--action" onClick={onInvite}>
            <UserPlus size={16} strokeWidth={1.75} />
            Позвать друга
          </button>
        )}
      </div>

      {hearts.map((h) => (
        <Heart
          key={h.id}
          className="stage__heart"
          size={18}
          style={{ left: h.x, top: h.y, "--dx": `${h.dx}px`, "--dy": `${h.dy}px` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

const isOnline = (iso: string | null) => !!iso && Date.now() - new Date(iso).getTime() < 5 * 60_000;

function Zzz() {
  return (
    <div className="zzz" aria-hidden>
      <span>z</span>
      <span>z</span>
      <span>Z</span>
    </div>
  );
}

/** Hearts float out of the pet while it's being stroked */
function useHearts(active: boolean, petRef: RefObject<HTMLDivElement>) {
  const [hearts, setHearts] = useState<HeartFx[]>([]);

  const spawn = useCallback(() => {
    const r = petRef.current?.getBoundingClientRect();
    if (!r) return;
    const a = Math.random() * Math.PI * 2;
    const heart = {
      id: ++heartId,
      x: r.left + r.width / 2 + Math.cos(a) * r.width * 0.3,
      y: r.top + r.height * 0.45 + Math.sin(a) * r.height * 0.25,
      dx: Math.cos(a) * 32,
      dy: -24 - Math.random() * 24,
    };
    setHearts((hs) => [...hs.slice(-6), heart]);
    window.setTimeout(() => setHearts((hs) => hs.filter((h) => h !== heart)), 800);
  }, [petRef]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(spawn, HEART_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [active, spawn]);

  return { hearts, spawn };
}

let heartId = 0;
