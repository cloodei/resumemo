"use client"

import { motion } from "motion/react"

export default function HomeTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  )
}
