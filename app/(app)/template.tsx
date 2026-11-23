"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/** Perpindahan antarhalaman: isi masuk dari bawah dengan kurva halus supaya terasa mengalir. */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
