"use client";

import Image from "next/image";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import type { Mockup } from "@/lib/database.types";

type SwipeCardProps = {
  mockup: Mockup;
  onSwipe: (liked: boolean) => void;
  isTop: boolean;
};

const SWIPE_THRESHOLD = 120;

export function SwipeCard({ mockup, onSwipe, isTop }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe(true);
      return;
    }
    if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe(false);
    }
  }

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{ x, rotate, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.96, opacity: isTop ? 1 : 0.6 }}
      animate={{ scale: isTop ? 1 : 0.96, opacity: isTop ? 1 : 0.6 }}
      exit={{ x: x.get() >= 0 ? 400 : -400, opacity: 0, transition: { duration: 0.2 } }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <Image
          src={mockup.url}
          alt={mockup.filename}
          fill
          className="object-contain p-4"
          sizes="(max-width: 768px) 100vw, 480px"
          priority={isTop}
          unoptimized
        />

        <motion.div
          className="pointer-events-none absolute left-6 top-6 rounded-lg border-4 border-emerald-400 px-4 py-2 text-2xl font-bold uppercase tracking-widest text-emerald-400"
          style={{ opacity: likeOpacity, rotate: -12 }}
        >
          Keep
        </motion.div>

        <motion.div
          className="pointer-events-none absolute right-6 top-6 rounded-lg border-4 border-rose-400 px-4 py-2 text-2xl font-bold uppercase tracking-widest text-rose-400"
          style={{ opacity: nopeOpacity, rotate: 12 }}
        >
          Archive
        </motion.div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/90 to-transparent px-5 pb-5 pt-16">
          <p className="truncate text-sm font-medium text-zinc-100">
            {mockup.filename}
          </p>
          {mockup.design_id && (
            <p className="text-xs text-zinc-400">
              {mockup.design_id}
              {mockup.version ? ` · V${mockup.version}` : ""}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
