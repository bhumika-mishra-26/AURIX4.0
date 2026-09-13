"use client"

import { useEffect, useState } from "react"

interface RiskMeterProps {
  score: number
  category: string
}

export default function RiskMeter({ score, category }: RiskMeterProps) {

  const [progress, setProgress] = useState(0)

  useEffect(() => {

    const timer = setTimeout(() => {
      setProgress(score)
    }, 300)

    return () => clearTimeout(timer)

  }, [score])

  const radius = 90
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  const getColor = () => {
    if (score >= 80) return "#ef4444"
    if (score >= 60) return "#f97316"
    if (score >= 40) return "#eab308"
    return "#22c55e"
  }

  return (
    <div className="flex flex-col items-center">

      <svg width="220" height="140">

        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth="16"
          strokeDasharray={circumference}
          strokeDashoffset="0"
          transform="rotate(-90 110 110)"
        />

        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="transparent"
          stroke={getColor()}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 110 110)"
          style={{ transition: "stroke-dashoffset 1.5s ease" }}
        />

      </svg>

      <div className="text-center -mt-16">

        <p className="text-4xl font-bold text-slate-800">
          {score}
        </p>

        <p className="text-sm text-slate-500">
          Risk Score
        </p>

        <p
          className="text-lg font-semibold mt-2"
          style={{ color: getColor() }}
        >
          {category}
        </p>

      </div>

    </div>
  )
}
