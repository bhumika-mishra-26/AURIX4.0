"use client"

export default function HeatmapPage() {

  const files = [
    { name: "auth.js", risk: "High" },
    { name: "login.js", risk: "Medium" },
    { name: "config.js", risk: "Low" }
  ]

  return (

    <main className="min-h-screen p-10 bg-slate-950 text-slate-100">

      <h1 className="text-3xl font-bold mb-10">
        File Risk Heatmap
      </h1>

      <div className="space-y-4">

        {files.map((f, i) => (

          <div
            key={i}
            className="flex justify-between p-4 border rounded-lg"
          >

            <span>{f.name}</span>

            <span className={
              f.risk === "High"
                ? "text-red-500"
                : f.risk === "Medium"
                ? "text-yellow-500"
                : "text-green-500"
            }>

              {f.risk}

            </span>

          </div>

        ))}

      </div>

    </main>

  )
}
