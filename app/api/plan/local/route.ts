import { NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { parseCsv } from "@/lib/csv"
import { planAssignments } from "@/lib/planner"
import { PlannerParams } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const swapDays = Number(url.searchParams.get("swapDays") ?? 90)
		const params: PlannerParams = {
			maxSwapsPerVehiclePerDays: isNaN(swapDays) ? 90 : swapDays,
			deadheadFixedCost: 1000,
			deadheadCostPerKm: 1,
			deadheadCostPerHour: 150,
			overageCostPerKm: 0.92,
			serviceBlockHours: 48,
		}

		const dataDir = path.join(process.cwd(), "data")
		const [v,l,rel,r,s] = await Promise.all([
			fs.readFile(path.join(dataDir, "Vehicles.csv"), "utf8"),
			fs.readFile(path.join(dataDir, "Locations.csv"), "utf8"),
			fs.readFile(path.join(dataDir, "Locations_relations.csv"), "utf8").catch(async () => {
				// fallback name variants
				try { return await fs.readFile(path.join(dataDir, "Location_relations.csv"), "utf8") } catch { return "" }
			}),
			fs.readFile(path.join(dataDir, "Routes.csv"), "utf8"),
			fs.readFile(path.join(dataDir, "Segments.csv"), "utf8"),
		])

		if (!v || !l || !r || !s) {
			return new Response(JSON.stringify({ ok: false, error: "Missing one or more CSV files in ./data" }), { status: 400 })
		}

		const vehicles = parseCsv<Record<string,string>>(v).map(mapVehicle)
		const locations = parseCsv<Record<string,string>>(l).map(mapLocation)
		const relations = (rel ? parseCsv<Record<string,string>>(rel) : []).map(mapRelation)
		const routes = parseCsv<Record<string,string>>(r).map(mapRoute)
		const segments = parseCsv<Record<string,string>>(s).map(mapSegment)

		const result = planAssignments(vehicles as any, locations as any, relations as any, routes as any, segments as any, params)
		return Response.json({ ok: true, result })
	} catch (e: any) {
		return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 500 })
	}
}

function toNum(v: any): number { return v == null || v === "" ? 0 : Number(v) }
function toNumOrNull(v: any): number | null { if (v == null || v === "") return null; const n = Number(v); return isNaN(n) ? null : n }
function norm(obj: Record<string, any>, ...keys: string[]): any {
	const map: Record<string, any> = {}
	for (const k of Object.keys(obj)) map[k.toLowerCase()] = (obj as any)[k]
	for (const k of keys) {
		const kl = k.toLowerCase()
		if (map[kl] !== undefined) (map as any)[k] = map[kl]
	}
	return { ...map, ...obj }
}

function mapVehicle(r: Record<string, any>) {
	const o = norm(r, "id","registration_number","brand","service_interval_km","leasing_start_km","leasing_limit_km","leasing_start_date","leasing_end_date","current_odometer_km","current_location_id")
	return {
		id: toNum((o as any).id),
		registration_number: String((o as any).registration_number ?? (o as any).reg ?? ""),
		brand: String((o as any).brand ?? ""),
		service_interval_km: toNum((o as any).service_interval_km),
		leasing_start_km: toNum((o as any).leasing_start_km),
		leasing_limit_km: toNum((o as any).leasing_limit_km),
		leasing_start_date: String((o as any).leasing_start_date ?? (o as any).start_date ?? ""),
		leasing_end_date: String((o as any).leasing_end_date ?? (o as any).end_date ?? ""),
		current_odometer_km: toNum((o as any).current_odometer_km),
		current_location_id: toNumOrNull((o as any).current_location_id),
	}
}

function mapLocation(r: Record<string, any>) {
	const o = norm(r, "id","name","lat","long","is_hub")
	return {
		id: toNum((o as any).id),
		name: String((o as any).name ?? ""),
		lat: Number((o as any).lat),
		long: Number((o as any).long ?? (o as any).lng ?? (o as any).lon),
		is_hub: String((o as any).is_hub ?? "0").toLowerCase() === "true" || String((o as any).is_hub) === "1",
	}
}

function mapRelation(r: Record<string, any>) {
	const o = norm(r, "id","id_loc_1","id_loc_2","dist","time")
	return {
		id: toNum((o as any).id),
		id_loc_1: toNum((o as any).id_loc_1),
		id_loc_2: toNum((o as any).id_loc_2),
		dist: Number((o as any).dist),
		time: Number((o as any).time),
	}
}

function mapRoute(r: Record<string, any>) {
	const o = norm(r, "id","start_datetime","end_datetime")
	return {
		id: toNum((o as any).id),
		start_datetime: String((o as any).start_datetime ?? (o as any).start ?? ""),
		end_datetime: String((o as any).end_datetime ?? (o as any).end ?? ""),
	}
}

function mapSegment(r: Record<string, any>) {
	const o = norm(r, "id","route_id","seq","start_loc_id","end_loc_id","start_datetime","end_datetime","distance_travelled_km","relation_id")
	return {
		id: toNum((o as any).id),
		route_id: toNum((o as any).route_id),
		seq: toNum((o as any).seq),
		start_loc_id: toNum((o as any).start_loc_id),
		end_loc_id: toNum((o as any).end_loc_id),
		start_datetime: String((o as any).start_datetime ?? ""),
		end_datetime: String((o as any).end_datetime ?? ""),
		distance_travelled_km: Number((o as any).distance_travelled_km ?? (o as any).dist ?? 0),
		relation_id: toNumOrNull((o as any).relation_id),
	}
}


