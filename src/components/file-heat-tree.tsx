"use client"

interface FileHeatProps {
  fileHeat: Record<string, number>
}

export default function FileHeatTree({ fileHeat }: FileHeatProps) {

  const getRiskColor = (value: number) => {
    if (value >= 0.9) return "text-red-600"
    if (value >= 0.7) return "text-orange-500"
    if (value >= 0.4) return "text-yellow-500"
    return "text-green-600"
  }

  return (

    <div className="space-y-3">

      {Object.entries(fileHeat).map(([file, heat], index) => (

        <div
          key={index}
          className="flex justify-between border-b pb-2"
        >

          <span className="text-slate-700">
            {file}
          </span>

          <span className={`${getRiskColor(heat)} font-semibold`}>
            {(heat * 100).toFixed(0)}%
          </span>

        </div>

      ))}

    </div>

  )
}
