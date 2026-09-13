"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"

const data = [
  { name: "Scan 1", risk: 85 },
  { name: "Scan 2", risk: 78 },
  { name: "Scan 3", risk: 92 }
]

export default function TrendGraph() {

  return (

    <ResponsiveContainer width="100%" height="100%">

      <LineChart data={data}>

        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />

        <XAxis dataKey="name" stroke="#64748b" />

        <YAxis stroke="#64748b" />

        <Tooltip />

        <Line
          type="monotone"
          dataKey="risk"
          stroke="#f97316"
          strokeWidth={3}
          dot={{ r: 5 }}
        />

      </LineChart>

    </ResponsiveContainer>

  )
}
