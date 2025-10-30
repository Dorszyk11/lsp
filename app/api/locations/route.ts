import { NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { parseCsv } from "@/lib/csv"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
	try {
		// Try different filename variants
		const variants = ["Locations.csv", "locations.csv", "Location.csv", "location.csv"]
		let csvText = ""
		let lastError: Error | null = null
		
		for (const variant of variants) {
			try {
				const csvPath = path.join(process.cwd(), "data", variant)
				csvText = await fs.readFile(csvPath, "utf8")
				break
			} catch (e) {
				lastError = e as Error
				continue
			}
		}
		
		if (!csvText) {
			throw lastError || new Error("Nie znaleziono pliku Locations.csv")
		}
		const rows = parseCsv<Record<string, string>>(csvText)
		
		// Map and clean up location data
		const locations = rows.map(row => ({
			id: Number(row.id ?? row.Id ?? 0),
			name: String(row.name ?? row.Name ?? ""),
			lat: Number(row.lat ?? row.Lat ?? 0),
			long: Number(row.long ?? row.long ?? row.lng ?? row.Lng ?? 0),
			is_hub: row.is_hub === "1" || row.is_hub === "true" || row.Is_hub === "1" || row.Is_hub === "true",
		})).filter(loc => loc.id > 0 && loc.lat !== 0 && loc.long !== 0)
		
		return Response.json({ ok: true, locations })
	} catch (e: any) {
		return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 500 })
	}
}

