"use client"

interface Scan {
  risk: number
}

interface ScanComparisonProps {
  scans: Scan[]
}

export default function ScanComparison({ scans }: ScanComparisonProps) {

  return (
    <div className="space-y-4">

      {scans.map((scan, index) => (

        <div
          key={index}
          className="flex justify-between items-center border-b pb-2"
        >

          <span className="text-slate-600">
            Scan {index + 1}
          </span>

          <span className="font-semibold text-orange-600">
            Risk: {scan.risk}
          </span>

        </div>

      ))}

    </div>
  )
}
