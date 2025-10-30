import { NextRequest } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { runPythonPlanner } from "@/lib/python"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const swapDays = Number(url.searchParams.get("swapDays") ?? 90)
		const days = Number(url.searchParams.get("days") ?? "")
		const dataDir = path.join(process.cwd(), "data")
    // 1) Try Flask at localhost:5000/simulate
    const simUrl = new URL("http://127.0.0.1:5000/simulate")
    if (!isNaN(days)) simUrl.searchParams.set("days", String(days))
    try {
      const r = await fetch(simUrl.toString(), { cache: "no-store" })
      if (r.ok) {
        const j = await r.json()
        if (j?.status === "success" && j?.result) {
          await persistLastPlan(j.result)
          return Response.json({ ok: true, result: j.result })
        }
        if (j?.status === "error") {
          // fall through to CLI if server reports error
          throw new Error(j?.message || "Flask error")
        }
      }
    } catch {}

    // 2) Fallback to CLI runner
    const out = await runPythonPlanner(dataDir, {
      swapDays: isNaN(swapDays) ? undefined : swapDays,
      days: isNaN(days) ? undefined : days,
    })
    const parsed = await parseFlexibleJson(out, dataDir)
    if (!parsed) {
      return new Response(JSON.stringify({ ok: false, error: "Skrypt Python nie zwrócił JSON", stdout: out.slice(0, 5000) }), { status: 500 })
    }
    await persistLastPlan(parsed)
    return Response.json({ ok: true, result: parsed })
	} catch (e: any) {
		return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 500 })
	}
}

async function parseFlexibleJson(stdout: string, dataDir: string): Promise<any | null> {
  // 1) Try direct JSON
  try { return JSON.parse(stdout) } catch {}
  // 2) Try extract between markers
  const markerStart = stdout.indexOf("JSON_START")
  const markerEnd = stdout.lastIndexOf("JSON_END")
  if (markerStart !== -1 && markerEnd !== -1 && markerEnd > markerStart) {
    const segment = stdout.substring(markerStart + "JSON_START".length, markerEnd)
    try { return JSON.parse(segment.trim()) } catch {}
  }
  // 3) Try first { ... last } window
  const firstBrace = stdout.indexOf("{")
  const lastBrace = stdout.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const segment = stdout.substring(firstBrace, lastBrace + 1)
    try { return JSON.parse(segment) } catch {}
  }
  // 4) Try reading output.json from common paths
  const candidates = [
    path.join(process.cwd(), "output.json"),
    path.join(process.cwd(), "python", "output.json"),
    path.join(dataDir, "output.json"),
  ]
  for (const p of candidates) {
    try {
      const txt = await fs.readFile(p, "utf8")
      return JSON.parse(txt)
    } catch {}
  }
  return null
}

async function persistLastPlan(result: any) {
  try {
    // Try to load assignments from CSV if available
    const csvPath = path.join(process.cwd(), "plan_assignments.csv")
    try {
      const csvText = await fs.readFile(csvPath, "utf8")
      const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim())
      if (lines.length > 1) {
        const parseCsvLine = (line: string): string[] => {
          const res: string[] = []
          let current = ""
          let inQuotes = false
          for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"'
                i++
              } else {
                inQuotes = !inQuotes
              }
            } else if (ch === "," && !inQuotes) {
              res.push(current.trim())
              current = ""
            } else {
              current += ch
            }
          }
          res.push(current.trim())
          return res
        }
        const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/"/g, "").trim())
        const assignments = []
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCsvLine(lines[i])
          const obj: any = {}
          headers.forEach((h, idx) => {
            const val = vals[idx]?.replace(/"/g, "").trim() || ""
            if (h === "route_id" || h === "routeid") obj.routeId = Number(val) || 0
            else if (h === "vehicle_id" || h === "vehicleid") obj.vehicleId = Number(val) || 0
            else if (h === "swap") obj.swap = val === "True" || val === "true" || val === "1"
            else if (h === "swap_cost_pln" || h === "swapcostpln") obj.deadheadCost = Number(val) || 0
            else if (h === "total_cost_pln" || h === "totalcostpln") obj.totalCost = Number(val) || 0
          })
          if (obj.routeId && obj.vehicleId) assignments.push(obj)
        }
        if (assignments.length > 0) result.assignments = assignments
      }
    } catch {}
    const outPath = path.join(process.cwd(), "data", "last_plan.json")
    await fs.writeFile(outPath, JSON.stringify(result), "utf8")
  } catch {}
}


