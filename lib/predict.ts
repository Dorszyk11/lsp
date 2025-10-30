import { RouteRow, SegmentRow, Vehicle } from "./types"

// Very simple predictor: rolling average km/day from history, applied forward
export function estimateVehicleDailyKm(historyRoutes: RouteRow[], historySegments: SegmentRow[], vehicle: Vehicle): number {
	// If history does not map vehicles, fall back to brand-based heuristic
	const totalKm = historySegments.reduce((s, x) => s + (x.distance_travelled_km || 0), 0)
	const days = estimateDays(historyRoutes)
	if (days <= 0) return 300 // fallback 300 km/day
	const fleetAvg = totalKm / days
	// brand multipliers (rough heuristic)
	const mult = vehicle.brand === "Scania" ? 1.05 : vehicle.brand === "Volvo" ? 0.98 : 1.0
	return Math.max(50, fleetAvg * mult)
}

function estimateDays(routes: RouteRow[]): number {
	if (routes.length === 0) return 0
	const minStart = Math.min(...routes.map((r) => Date.parse(r.start_datetime)))
	const maxEnd = Math.max(...routes.map((r) => Date.parse(r.end_datetime)))
	return (maxEnd - minStart) / (1000 * 3600 * 24)
}


