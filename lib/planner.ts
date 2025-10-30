import { AssignmentResult, Location, LocationRelation, PlannerOutput, PlannerParams, RouteRow, SegmentRow, Vehicle } from "./types"

type VehicleState = {
	vehicle: Vehicle
	availableFrom: number // epoch ms
	currentLocId?: number | null
	currentOdo: number
	lastServiceOdo: number
	contractUsedKm: number
	swapsTimestamps: number[] // epoch ms of swaps
	lastSwapDay?: string // YYYY-MM-DD to limit 1 swap/day
}

export function planAssignments(
	vehicles: Vehicle[],
	locations: Location[],
	relations: LocationRelation[],
	routes: RouteRow[],
	segments: SegmentRow[],
	params: PlannerParams
): PlannerOutput {
	const relKey = (a: number, b: number) => `${a}-${b}`
	const relByPair = new Map<string, { dist: number; timeH: number }>()
	for (const r of relations) {
		const norm = normalizeRelation(r)
		relByPair.set(relKey(r.id_loc_1, r.id_loc_2), norm)
		relByPair.set(relKey(r.id_loc_2, r.id_loc_1), norm)
	}

  const segmentsByRoute = new Map<number, SegmentRow[]>()
	for (const s of segments) {
		const list = segmentsByRoute.get(s.route_id) ?? []
		list.push(s)
		segmentsByRoute.set(s.route_id, list)
	}
	for (const [rid, list] of segmentsByRoute) list.sort((a, b) => a.seq - b.seq)

  const parseMs = (s: string) => {
    if (!s) return NaN
    // Try ISO with T, then with explicit Z (avoid TZ shifts), then native Date.parse
    const iso = s.includes("T") ? s : s.replace(" ", "T")
    let t = Date.parse(iso)
    if (!Number.isFinite(t)) t = Date.parse(iso + "Z")
    if (!Number.isFinite(t)) t = Date.parse(s)
    return t
  }
  const locationsMap = new Map(locations.map(l => [l.id, l]))
  const routeMeta = routes.map((r) => {
    const segs = segmentsByRoute.get(r.id) ?? []
    const startLoc = segs[0]?.start_loc_id
    const endLoc = segs[segs.length - 1]?.end_loc_id
    let km = segs.reduce((s, x) => s + (x.distance_travelled_km || 0), 0)
    let startMs = parseMs(r.start_datetime)
    let endMs = parseMs(r.end_datetime)
    // fallback to segments' datetimes when route-level dates are missing/invalid
    if (!Number.isFinite(startMs) && segs[0]?.start_datetime) startMs = parseMs(segs[0].start_datetime)
    if (!Number.isFinite(endMs) && segs[segs.length - 1]?.end_datetime) endMs = parseMs(segs[segs.length - 1].end_datetime)
    // if segments don't provide distances, approximate by summing relation distances when available
    if (km <= 0 && segs.length > 0) {
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i]
        const rel = relByPair.get(`${s.start_loc_id}-${s.end_loc_id}`)
        if (rel) km += Math.max(0, rel.dist)
      }
    }
    const dayStr = String(r.start_datetime ?? segs[0]?.start_datetime ?? "").slice(0, 10)
    return { r, startLoc, endLoc, start: startMs, end: endMs, km, dayStr }
  }).filter((m) => m.startLoc != null && m.endLoc != null && Number.isFinite(m.start) && Number.isFinite(m.end))

	// group routes per day
	const byDay = new Map<string, typeof routeMeta>()
  for (const m of routeMeta) {
    const day = m.dayStr && m.dayStr.length === 10 ? m.dayStr : new Date(m.start).toISOString().slice(0, 10)
    const list = byDay.get(day) ?? []
		list.push(m)
		byDay.set(day, list)
	}
	for (const list of byDay.values()) list.sort((a, b) => a.start - b.start)

	const vehicleStates: VehicleState[] = vehicles.map((v) => ({
		vehicle: v,
		availableFrom: 0,
		currentLocId: v.current_location_id ?? null,
		currentOdo: v.current_odometer_km,
		lastServiceOdo: v.current_odometer_km,
		contractUsedKm: Math.max(0, v.current_odometer_km - v.leasing_start_km),
		swapsTimestamps: [],
	}))

	const assignments: AssignmentResult[] = []
	let totalDeadheadCost = 0
	let totalOverageCost = 0
	let numSwaps = 0
	const alerts: string[] = []

	const days = [...byDay.keys()].sort()
	for (const day of days) {
		const dayRoutes = byDay.get(day)!
		for (const m of dayRoutes) {
			let best: { vs: VehicleState; deadKm: number; deadH: number; deadCost: number; overKm: number; overCost: number } | null = null
      for (const vs of vehicleStates) {
				// determine deadhead using ONLY relations; if first assignment and no currentLoc, allow free placement
				let deadKm = 0
				let deadH = 0
				let requiresSwap = false
				if (vs.currentLocId == null) {
					// initial placement: free
        } else if (vs.currentLocId !== m.startLoc) {
          const rel = relByPair.get(relKey(vs.currentLocId, m.startLoc!))
          if (rel) {
            deadKm = Math.max(0, rel.dist)
            deadH = Math.max(0, rel.timeH)
          } else {
            // fallback: haversine if both coords available
            const a = locationsMap.get(vs.currentLocId)
            const b = locationsMap.get(m.startLoc!)
            if (a && b && isFinite(a.lat) && isFinite(a.long) && isFinite(b.lat) && isFinite(b.long)) {
              deadKm = haversineKm(a.lat, a.long, b.lat, b.long)
              deadH = deadKm / 60
            } else {
              continue // infeasible without any distance estimate
            }
          }
          // clamp fallback to sane bounds
          if (deadKm > 800) deadKm = 800
          if (deadH > 14) deadH = 14
					requiresSwap = deadKm > 0.1
				}

				// Availability incl. travel
        const travelStart = m.start - deadH * 3600 * 1000
				if (vs.availableFrom > travelStart) continue

				// Swap limits
        const windowStart = m.start - params.maxSwapsPerVehiclePerDays * 24 * 3600 * 1000
				const swapsInWindow = vs.swapsTimestamps.filter((t) => t >= windowStart && t <= m.start).length
				if (requiresSwap && swapsInWindow >= 1) continue
				if (requiresSwap && vs.lastSwapDay === day) continue

				const deadCost = requiresSwap ? (params.deadheadFixedCost + params.deadheadCostPerKm * deadKm + params.deadheadCostPerHour * deadH) : 0

				// Incremental overage cost
				const limit = Number.isFinite(vs.vehicle.leasing_limit_km) && vs.vehicle.leasing_limit_km > 0 ? vs.vehicle.leasing_limit_km : Infinity
				const priorOver = Math.max(0, vs.contractUsedKm - limit)
				const afterUsed = vs.contractUsedKm + deadKm + m.km
				const afterOver = Math.max(0, afterUsed - limit)
				const overKm = Math.max(0, afterOver - priorOver)
				const overCost = overKm * params.overageCostPerKm

				const cand = { vs, deadKm, deadH, deadCost, overKm, overCost }
				if (!best) best = cand
				else {
					const bestCost = best.deadCost + best.overCost
					const candCost = cand.deadCost + cand.overCost
					if (candCost < bestCost
						|| (candCost === bestCost && (cand.deadKm < best.deadKm || (cand.deadKm === best.deadKm && (cand.overKm < best.overKm || (cand.overKm === best.overKm && (best.vs.vehicle.leasing_limit_km - best.vs.contractUsedKm) < (cand.vs.vehicle.leasing_limit_km - cand.vs.contractUsedKm))))))) {
						best = cand
					}
				}
			}

			if (!best) {
				alerts.push(`No feasible vehicle for route ${m.r.id}`)
				continue
			}

			const vs = best.vs
			if (best.deadKm > 0.1) {
				vs.swapsTimestamps.push(m.start)
				vs.lastSwapDay = day
				numSwaps += 1
			}
			vs.currentOdo += best.deadKm + m.km
			vs.contractUsedKm += best.deadKm + m.km
			vs.currentLocId = m.endLoc!
			vs.availableFrom = m.end

			let serviceScheduled = false
			if (vs.currentOdo - vs.lastServiceOdo >= vs.vehicle.service_interval_km) {
				serviceScheduled = true
				vs.lastServiceOdo = vs.currentOdo
				vs.availableFrom = Math.max(vs.availableFrom, m.end + params.serviceBlockHours * 3600 * 1000)
			}

			totalDeadheadCost += best.deadCost
			totalOverageCost += best.overCost
			assignments.push({
				routeId: m.r.id,
				vehicleId: vs.vehicle.id,
				deadheadKm: best.deadKm,
				deadheadHours: best.deadH,
				deadheadCost: best.deadCost,
				overageKm: best.overKm,
				overageCost: best.overCost,
				serviceScheduled,
				routeStartDatetime: m.r.start_datetime,
			})
		}
	}

	// KPIs
	const vehiclesWithoutOverage = vehicleStates.filter((v) => v.contractUsedKm <= v.vehicle.leasing_limit_km).length
	const pctVehiclesWithoutOverage = vehicleStates.length ? (vehiclesWithoutOverage / vehicleStates.length) * 100 : 0
	const utilizations = vehicleStates.map((v) => Math.min(1, v.contractUsedKm / Math.max(1, v.vehicle.leasing_limit_km)))
	const pctContractUtilization = utilizations.length ? (utilizations.reduce((a, b) => a + b, 0) / utilizations.length) * 100 : 0
	const estKmToLimit = vehicleStates.map((v) => Math.max(0, v.vehicle.leasing_limit_km - v.contractUsedKm))
	const estimatedKmToContractLimitAvg = estKmToLimit.length ? estKmToLimit.reduce((a, b) => a + b, 0) / estKmToLimit.length : 0

	return {
		assignments,
		totalDeadheadCost,
		totalOverageCost,
		numSwaps,
		kpis: { pctVehiclesWithoutOverage, pctContractUtilization, estimatedKmToContractLimitAvg },
		alerts,
	}
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
function toRad(deg: number) { return (deg * Math.PI) / 180 }

function normalizeRelation(r: LocationRelation): { dist: number; timeH: number } {
  const dist = Math.max(0, Number(r.dist) || 0)
  let time = Math.max(0, Number(r.time) || 0)
  // detect minutes: unrealistic speed if time treated as hours
  // if dist/time > 200 km/h and time > 60, assume minutes
  if (time > 60 && dist / time > 200) {
    time = time / 60
  }
  // clamp to sane bounds
  if (!Number.isFinite(time)) time = 0
  if (time > 48 && dist < 200) time = 48
  return { dist, timeH: time }
}



