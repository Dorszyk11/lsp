import { NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { parseCsv } from "@/lib/csv"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
	try {
		const csvPath = path.join(process.cwd(), "data", "Vehicles.csv")
		const csvText = await fs.readFile(csvPath, "utf8")
		const rows = parseCsv<Record<string, string>>(csvText)
		return Response.json({ ok: true, vehicles: rows })
	} catch (e: any) {
		return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 500 })
	}
}

