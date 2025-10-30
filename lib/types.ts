export type Brand = "DAF" | "Scania" | "Volvo" | string

export interface Vehicle {
	id: number
	registration_number: string
	brand: Brand
	service_interval_km: number
	leasing_start_km: number
	leasing_limit_km: number
	leasing_start_date: string
	leasing_end_date: string
	current_odometer_km: number
	current_location_id?: number | null
}

export interface Location {
	id: number
	name: string
	lat: number
	long: number
	is_hub: boolean
}

export interface LocationRelation {
	id: number
	id_loc_1: number
	id_loc_2: number
	dist: number
	time: number
}

export interface RouteRow {
	id: number
	start_datetime: string
	end_datetime: string
}

export interface SegmentRow {
	id: number
	route_id: number
	seq: number
	start_loc_id: number
	end_loc_id: number
	start_datetime: string
	end_datetime: string
	distance_travelled_km: number
	relation_id?: number | null
}

export interface PlannerParams {
	maxSwapsPerVehiclePerDays: number // e.g. 90 for ~3 months
	deadheadFixedCost: number // 1000 PLN
	deadheadCostPerKm: number // 1 PLN/km
	deadheadCostPerHour: number // 150 PLN/h
	overageCostPerKm: number // 0.92 PLN/km
	serviceBlockHours: number // 48h
}

export interface AssignmentResult {
	routeId: number
	vehicleId: number
	deadheadKm: number
	deadheadHours: number
	deadheadCost: number
	overageKm: number
	overageCost: number
	serviceScheduled: boolean
	routeStartDatetime: string
}

export interface PlannerOutput {
	assignments: AssignmentResult[]
	totalDeadheadCost: number
	totalOverageCost: number
	numSwaps: number
	kpis: {
		pctVehiclesWithoutOverage: number
		pctContractUtilization: number // avg across vehicles
		estimatedKmToContractLimitAvg: number
	}
	alerts: string[]
}


