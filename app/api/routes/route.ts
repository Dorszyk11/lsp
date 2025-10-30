import { NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { parseCsv } from "@/lib/csv"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
	try {
		const routesPath = path.join(process.cwd(), "data", "Routes.csv")
		const segmentsPath = path.join(process.cwd(), "data", "Segments.csv")
		
		const routesText = await fs.readFile(routesPath, "utf8")
		const segmentsText = await fs.readFile(segmentsPath, "utf8")
		
		const routes = parseCsv<Record<string, string>>(routesText)
		const segments = parseCsv<Record<string, string>>(segmentsText)
		
		// Calculate route_km from segments
		const routeKm: Record<number, number> = {}
		for (const s of segments) {
			const rid = Number(s.route_id ?? s.routeId ?? 0)
			const km = Number(s.distance_travelled_km ?? s.distanceTravelledKm ?? s.dist ?? 0)
			if (rid && km > 0) {
				routeKm[rid] = (routeKm[rid] || 0) + km
			}
		}
		
		// Attach km to routes
		const routesWithKm = routes.map(r => ({
			...r,
			route_km: routeKm[Number(r.id ?? r.Id ?? 0)] || 0,
		}))
		
		return Response.json({ ok: true, routes: routesWithKm })
	} catch (e: any) {
		return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 500 })
	}
}

