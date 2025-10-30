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


