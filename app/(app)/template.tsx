"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/** Perpindahan antarhalaman: isi masuk dari bawah sedikit supaya terasa berpindah, bukan berganti mendadak. */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
