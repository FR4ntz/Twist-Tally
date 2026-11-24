"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import mascotCalm from "@/public/images/mascot-calm.png";
import mascotCheer from "@/public/images/mascot-cheer.png";
import mascotIdle from "@/public/images/mascot-idle.png";
import { cn } from "./ui";

const poses = {
  idle: { src: mascotIdle, alt: "Maskot Twist & Tally berdiri ramah" },
  cheer: { src: mascotCheer, alt: "Maskot Twist & Tally gembira menyemangati" },
  calm: { src: mascotCalm, alt: "Maskot Twist & Tally tersenyum tenang" },
} as const;

export type MascotPose = keyof typeof poses;

export function Mascot({
  pose = "idle",
  size = 136,
  mobileSize,
  float = true,
  halo = false,
  className,
}: {
  pose?: MascotPose;
  size?: number;
  mobileSize?: number;
  float?: boolean;
  halo?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const asset = poses[pose];
  const mSize = mobileSize ?? Math.round(size * 0.78);

  return (
    <motion.div
      animate={!float || reduce ? undefined : { y: [0, -6, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center select-none",
        halo && "rounded-[20px] border border-ink/15 bg-card/95 px-3.5 py-2.5 shadow-[0_8px_22px_rgb(29_33_88/0.22)] sm:rounded-[24px] sm:px-5 sm:py-3",
        className,
      )}
    >
      <Image
        src={asset.src}
        alt={asset.alt}
        style={
          {
            "--mascot-m": `${mSize}px`,
            "--mascot-d": `${size}px`,
          } as CSSProperties
        }
        className="h-[var(--mascot-m)] w-auto object-contain drop-shadow-[0_6px_12px_rgb(29_33_88/0.16)] sm:h-[var(--mascot-d)]"
      />
    </motion.div>
  );
}
