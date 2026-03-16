"use client";

import { motion, AnimatePresence } from "framer-motion";

/**
 * Hemo SVG Mascot (New Design)
 * States: 
 * - idle: subtle breathing + floating
 * - listening: antennas pulse glow
 * - thinking: eyes pulse
 * - responding: heartbeat pulse in the drop
 */
export default function DrHemoAvatar({ size = 60, state = "idle", isSpeaking = false, isLoading = false }) {
  const activeState = isLoading ? "thinking" : (isSpeaking ? "responding" : state);

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Background Circle */}
        <circle cx="50" cy="50" r="45" fill="#4BBE4F" />

        {/* Robot Head Body */}
        <motion.g
          animate={{
            y: [0, -2, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Head Shape (White) */}
          <rect x="25" y="25" width="50" height="40" rx="15" fill="white" />
          
          {/* Antennas */}
          <motion.circle 
            cx="35" cy="22" r="3" fill="white"
            animate={activeState === "listening" ? { fill: ["#ffffff", "#ff0000", "#ffffff"] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.circle 
            cx="65" cy="22" r="3" fill="white"
            animate={activeState === "listening" ? { fill: ["#ffffff", "#ff0000", "#ffffff"] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          
          {/* Face Area */}
          <rect x="32" y="32" width="36" height="20" rx="8" fill="#f0f0f0" />

          {/* Eyes */}
          <motion.g
            animate={activeState === "thinking" ? { scaleY: [1, 0.1, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <circle cx="43" cy="42" r="4" fill="#4BBE4F" />
            <circle cx="57" cy="42" r="4" fill="#4BBE4F" />
          </motion.g>

          {/* Smile */}
          <path d="M44 50Q50 54 56 50" stroke="#4BBE4F" strokeWidth="2" strokeLinecap="round" fill="none" />
        </motion.g>

        {/* The Drop (Hemo symbol) */}
        <motion.g
          animate={{
            scale: activeState === "responding" ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          {/* White Drop Outline / Background */}
          <path d="M50 85C50 85 35 70 35 60C35 51.7 41.7 45 50 45C58.3 45 65 51.7 65 60C65 70 50 85 50 85Z" fill="white" />
          
          {/* Green Internal Drop */}
          <path d="M50 82C50 82 38 70 38 62C38 55.4 43.4 50 50 50C56.6 50 62 55.4 62 62C62 70 50 82 50 82Z" fill="#4BBE4F" />
          
          {/* Heartbeat Line */}
          <motion.path
            d="M42 62H47L49 55L52 69L54 62H58"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            animate={{
              pathLength: [0, 1],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.g>
      </svg>
    </div>
  );
}
