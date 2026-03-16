"use client";

import { motion, AnimatePresence } from "framer-motion";

/**
 * Hemo SVG Mascot (Cell-bot)
 * States: 
 * - idle: default floating + glow
 * - listening: eye focus + data lines
 * - thinking: neural net pattern pulse
 * - responding: happy eyes + twirl
 */
export default function DrHemoAvatar({ size = 60, state = "idle", isSpeaking = false }) {
  // Map props to internal states if needed, though 'state' is primary
  const activeState = isSpeaking ? "responding" : state;

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 8px rgba(75, 190, 79, 0.3))' }}
      >
        {/* Glow Background */}
        <motion.circle
          cx="100" cy="100" r="85"
          fill="url(#glowGradient)"
          animate={{
            opacity: activeState === "idle" ? [0.2, 0.4, 0.2] : 0.6,
            scale: activeState === "thinking" ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Body (Cell-bot) */}
        <motion.g
          animate={{
            y: activeState === "responding" ? [0, -10, 0] : [0, -5, 0],
            rotate: activeState === "responding" ? [0, 5, -5, 0] : 0,
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Main Sphere */}
          <circle cx="100" cy="100" r="70" fill="#A8D5BA" stroke="#4BBE4F" strokeWidth="4" />
          
          {/* Circuit / Tech Lines on Body */}
          <path d="M60 60Q80 50 100 60" stroke="#4BBE4F" strokeWidth="2" opacity="0.4" />
          <path d="M140 140Q120 150 100 140" stroke="#4BBE4F" strokeWidth="2" opacity="0.4" />
          
          {/* Antenna */}
          <line x1="100" y1="30" x2="100" y2="10" stroke="#4BBE4F" strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="10" r="8" fill="#4BBE4F" />

          {/* Screen Face */}
          <rect x="50" y="70" width="100" height="60" rx="15" fill="#1A2F1A" stroke="#4BBE4F" strokeWidth="2" />

          {/* Eyes System */}
          <AnimatePresence mode="wait">
            {activeState === "listening" ? (
              <motion.g key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Focused Line Eyes */}
                <rect x="65" y="95" width="25" height="4" rx="2" fill="#4BBE4F" />
                <rect x="110" y="95" width="25" height="4" rx="2" fill="#4BBE4F" />
                {/* Data bits float up */}
                <motion.text
                  x="70" y="60" fill="#4BBE4F" fontSize="12" fontWeight="bold"
                  animate={{ y: [-10, -30], opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >0110</motion.text>
              </motion.g>
            ) : activeState === "responding" ? (
              <motion.g key="responding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Curved Happy Eyes */}
                <path d="M65 105Q77 90 90 105" stroke="#4BBE4F" strokeWidth="5" fill="none" strokeLinecap="round" />
                <path d="M110 105Q122 90 135 105" stroke="#4BBE4F" strokeWidth="5" fill="none" strokeLinecap="round" />
                {/* Mouth */}
                <path d="M85 115Q100 125 115 115" stroke="#4BBE4F" strokeWidth="3" fill="none" strokeLinecap="round" />
              </motion.g>
            ) : activeState === "thinking" ? (
              <motion.g key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Pulse Neural Net Pattern */}
                <circle cx="100" cy="100" r="20" stroke="#4BBE4F" strokeWidth="1" opacity="0.6" strokeDasharray="4 2">
                  <animate attributeName="r" values="15;25;15" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx="85" cy="95" r="4" fill="#4BBE4F" />
                <circle cx="115" cy="95" r="4" fill="#4BBE4F" />
              </motion.g>
            ) : (
              <motion.g key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Normal Round Eyes */}
                <circle cx="80" cy="95" r="8" fill="#4BBE4F" />
                <circle cx="120" cy="95" r="8" fill="#4BBE4F" />
                {/* Subtle Blink */}
                <motion.rect
                  x="70" y="93" width="20" height="4" fill="#1A2F1A"
                  animate={{ opacity: [0, 0, 1, 0, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
              </motion.g>
            )}
          </AnimatePresence>
        </motion.g>

        {/* Gradients */}
        <defs>
          <radialGradient id="glowGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 100) rotate(90) scale(85)">
            <stop stopColor="#4BBE4F" stopOpacity="0.4" />
            <stop offset="1" stopColor="#4BBE4F" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Motion Lines (Idle only) */}
      {activeState === "idle" && (
        <motion.div
          style={{ position: 'absolute', width: '120%', height: '120%', border: '1px solid rgba(75, 190, 79, 0.1)', borderRadius: '50%' }}
          animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}
