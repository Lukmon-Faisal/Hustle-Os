import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Fades and lifts a route view into place. Keyed on the screen name by the
 * caller so switching screens replays the entrance instead of morphing one
 * layout into the next.
 *
 * Stretches as a flex column because `.screen` inside relies on `flex: 1` to
 * own the scroll area — a plain wrapper would collapse that chain.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: 'easeOut' }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Cascade for lists that arrive together (insights, action cards). Put
 * `listStagger` on the container as `variants` with `initial="hidden"
 * animate="show"`, and `listItem` on each child — children inherit the
 * animate state, so they don't each need their own props.
 */
export const listStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.075, delayChildren: 0.05 },
  },
}

export const listItem = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}
