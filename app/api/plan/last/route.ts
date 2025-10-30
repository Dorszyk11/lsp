import { NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
	try {
		const p = path.join(process.cwd(), "data", "last_plan.json")
		const txt = await fs.readFile(p, "utf8")
		const json = JSON.parse(txt)
		return Response.json({ ok: true, result: json })
	} catch (e: any) {
		return new Response(JSON.stringify({ ok: false, error: "Brak ostatniego planu. Wygeneruj plan na zakładce Obliczenia." }), { status: 404 })
	}
}


