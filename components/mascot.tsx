"use client";

import Image from "next/image";
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
  size = 110,
  float = true,
  halo = false,
  className,
}: {
  pose?: MascotPose;
  size?: number;
  float?: boolean;
  halo?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const asset = poses[pose];

  return (
    <motion.div
      animate={!float || reduce ? undefined : { y: [0, -5, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center select-none",
        halo && "rounded-full bg-card/85 p-3 shadow-[0_4px_14px_rgb(29_33_88/0.16)]",
        className,
      )}
    >
      <Image
        src={asset.src}
        alt={asset.alt}
        style={{ height: size, width: "auto" }}
        className="object-contain drop-shadow-[0_4px_8px_rgb(29_33_88/0.12)]"
      />
    </motion.div>
  );
}
