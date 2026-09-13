"use client"

import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface ElectricBorderProps {
  children?: React.ReactNode
  className?: string
  color?: string
  glowColor?: string
  speed?: string
  thickness?: number
  chaos?: number
}

export default function ElectricBorder({
  children,
  className = "",
  color = "#3b82f6",
  glowColor = "rgba(59, 130, 246, 0.5)",
  speed = "3s",
  thickness = 2,
  chaos = 1
}: ElectricBorderProps) {
  const [filterId, setFilterId] = useState<string>("electric-filter-default")

  useEffect(() => {
    setFilterId(`electric-filter-${Math.random().toString(36).substring(2, 9)}`)
  }, [])

  return (
    <div className={cn("relative group inline-block p-[2px] rounded-2xl overflow-hidden", className)}>
      {/* SVG Lightning Filter Definition */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={`${0.04 * chaos}`}
              numOctaves="2"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values={`${0.03 * chaos};${0.07 * chaos};${0.03 * chaos}`}
                dur={speed}
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={`${6 * chaos}`}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Electric Outer Aura Glow */}
      <div
        className="absolute -inset-1 rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 blur-sm pointer-events-none animate-pulse"
        style={{
          boxShadow: `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}`
        }}
      />

      {/* Electric Lightning Border Stroke Container */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
        <svg className="w-full h-full" style={{ filter: `url(#${filterId})` }}>
          <rect
            x="1"
            y="1"
            width="99%"
            height="99%"
            rx="16"
            ry="16"
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray="12 8 4 8"
            className="animate-[electricSweep_4s_linear_infinite]"
            style={{
              strokeLinecap: "round"
            }}
          />
        </svg>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full h-full rounded-[calc(1rem-2px)] bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md">
        {children}
      </div>

      {/* Inline Keyframe for Electric Sweep */}
      <style jsx global>{`
        @keyframes electricSweep {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 200;
          }
        }
      `}</style>
    </div>
  )
}
