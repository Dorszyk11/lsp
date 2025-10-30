import { NextRequest } from "next/server"
import { planAssignments } from "@/lib/planner"
import { PlannerParams, Location, LocationRelation, RouteRow, SegmentRow, Vehicle } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const vehicles: Vehicle[] = body.vehicles ?? []
		const locations: Location[] = body.locations ?? []
		const relations: LocationRelation[] = body.relations ?? []
		const routes: RouteRow[] = body.routes ?? []
		const segments: SegmentRow[] = body.segments ?? []
		const params: PlannerParams = {
			maxSwapsPerVehiclePerDays: body.params?.maxSwapsPerVehiclePerDays ?? 90,
			deadheadFixedCost: body.params?.deadheadFixedCost ?? 1000,
			deadheadCostPerKm: body.params?.deadheadCostPerKm ?? 1,
			deadheadCostPerHour: body.params?.deadheadCostPerHour ?? 150,
			overageCostPerKm: body.params?.overageCostPerKm ?? 0.92,
			serviceBlockHours: body.params?.serviceBlockHours ?? 48,
		}

		const result = planAssignments(vehicles, locations, relations, routes, segments, params)
		return Response.json({ ok: true, result })
	} catch (e: any) {
		return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 400 })
	}
}


