"use client"

import { useEffect, useMemo, useState } from "react"
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

type ServiceInfo = {
  vehicleId: number
  registrationNumber?: string
  brand?: string
  currentOdo: number
  nextServiceAt: number
  kmUntilService: number
  serviceInterval: number
  lastServiceOdo: number
  contractLimitKm: number
  contractUsedKm: number
  contractRemainingKm: number
  annualLimitKm?: number
}

export default function Page() {
  const [plan, setPlan] = useState<any | null>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"service" | "contract">("service")

  useEffect(() => {
    Promise.all([
      fetch("/api/plan/last", { cache: "no-store" }).then(r => r.json()).catch(() => null),
      fetch("/api/vehicles", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/routes", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([planRes, vehiclesRes, routesRes]) => {
      let finalPlan = planRes?.ok ? planRes.result : null
      if (finalPlan && routesRes?.ok && routesRes.routes) {
        finalPlan = { ...finalPlan, routesData: routesRes.routes }
      }
      setPlan(finalPlan)
      if (vehiclesRes?.ok) setVehicles(vehiclesRes.vehicles || [])
      setLoading(false)
    }).catch((e) => {
      setError(String(e?.message || e))
      setLoading(false)
    })
  }, [])

  const services = useMemo(() => {
    const result = calculateServices(plan, vehicles, sortBy)
    return result
  }, [plan, vehicles, sortBy])

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col px-4 lg:px-6 py-4 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Najbliższe serwisy</h2>
            {services.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Sortuj według:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "service" | "contract")}
                  className="border rounded px-3 py-1 text-sm bg-background"
                >
                  <option value="service">Najbliższy serwis</option>
                  <option value="contract">Najbliższy limit kontraktowy</option>
                </select>
              </div>
            )}
          </div>
          {loading && <div className="text-sm text-muted-foreground">Ładowanie...</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}
          {!loading && !error && services.length === 0 && (
            <div className="text-sm text-muted-foreground">Wygeneruj najpierw plan na zakładce Obliczenia.</div>
          )}
          {services.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {services.map((s) => (
                <div key={s.vehicleId} className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Pojazd</div>
                  <div className="text-lg font-medium">
                    {s.registrationNumber || `ID ${s.vehicleId}`}
                    {s.brand && <span className="text-sm text-muted-foreground ml-2">({s.brand})</span>}
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aktualny przebieg:</span>
                      <span className="font-medium">{s.currentOdo.toLocaleString("pl-PL")} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ostatni serwis:</span>
                      <span>{s.lastServiceOdo.toLocaleString("pl-PL")} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interwał:</span>
                      <span>{s.serviceInterval.toLocaleString("pl-PL")} km</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className={s.kmUntilService <= 10000 ? "text-destructive font-medium" : "font-medium"}>
                        Do serwisu:
                      </span>
                      <span className={s.kmUntilService <= 10000 ? "text-destructive font-medium" : "font-medium"}>
                        {s.kmUntilService > 0 ? s.kmUntilService.toLocaleString("pl-PL") + " km" : "TERAZ"}
                      </span>
                    </div>
                    {s.kmUntilService <= 0 && (
                      <div className="text-xs text-destructive font-medium mt-1">⚠️ Wymagany serwis</div>
                    )}
                    <div className="flex justify-between pt-2 border-t mt-2">
                      <span className="text-muted-foreground">Limit kontraktowy:</span>
                      <span className={s.contractRemainingKm <= 50000 ? "text-amber-600 font-medium" : ""}>
                        {s.contractUsedKm.toLocaleString("pl-PL")} / {s.contractLimitKm.toLocaleString("pl-PL")} km
                      </span>
                    </div>
                    {s.annualLimitKm && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Limit roczny:</span>
                        <span>{s.annualLimitKm.toLocaleString("pl-PL")} km/rok</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function calculateServices(plan: any, vehicles: any[], sortBy: "service" | "contract" = "service"): ServiceInfo[] {
  if (!plan || !vehicles.length) return []
  
  // Build route_id -> km map from routes data
  const routeKmMap = new Map<number, number>()
  if (Array.isArray(plan.routesData)) {
    for (const r of plan.routesData) {
      const rid = Number(r.id ?? r.Id ?? 0)
      const km = Number(r.route_km ?? r.distance_km ?? r.distance_travelled_km ?? 0)
      if (rid && km > 0) routeKmMap.set(rid, km)
    }
  }
  
  // Calculate final odometer for each vehicle from assignments
  const vehicleFinalOdo: Record<number, number> = {}
  const vehicleLastService: Record<number, number> = {}
  
  // Start with initial odometer from vehicles data
  const vehMap = new Map(vehicles.map(v => [Number(v.id ?? v.Id ?? 0), v]))
  
  for (const v of vehicles) {
    const vid = Number(v.id ?? v.Id ?? 0)
    vehicleFinalOdo[vid] = Number(v.current_odometer_km ?? v.currentOdometerKm ?? v.current_odometer_km ?? 0)
    vehicleLastService[vid] = vehicleFinalOdo[vid] // Assume last service was at current odo initially
  }
  
  // Sum up km from assignments
  const assignments = Array.isArray(plan.assignments) ? plan.assignments : []
  for (const a of assignments) {
    const vid = Number(a.vehicleId ?? a.vehicle_id ?? 0)
    const rid = Number(a.routeId ?? a.route_id ?? 0)
    if (!vid) continue
    
    // Get route km from map or from assignment
    let routeKm = Number(a.routeKm ?? a.route_km ?? 0)
    if (routeKm <= 0 && rid && routeKmMap.has(rid)) {
      routeKm = routeKmMap.get(rid)!
    }
    
    if (routeKm > 0) {
      vehicleFinalOdo[vid] = (vehicleFinalOdo[vid] || 0) + routeKm
    }
    
    // Track last service if marked
    if (a.serviceScheduled || a.service_scheduled) {
      vehicleLastService[vid] = vehicleFinalOdo[vid]
    }
  }
  
  // Brand-based service intervals (per requirements)
  const brandServiceIntervals: Record<string, number> = {
    DAF: 120000,
    Scania: 120000,
    Volvo: 110000,
  }
  const brandContractLimits: Record<string, number> = {
    DAF: 450000,
    Scania: 750000,
    Volvo: 450000,
  }
  
  // Calculate contract usage per vehicle
  const vehicleContractUsed: Record<number, number> = {}
  for (const v of vehicles) {
    const vid = Number(v.id ?? v.Id ?? 0)
    const startKm = Number(v.leasing_start_km ?? v.leasingStartKm ?? 0)
    vehicleContractUsed[vid] = vehicleFinalOdo[vid] - startKm
  }
  
  // Build service info
  const services: ServiceInfo[] = []
  for (const [vid, finalOdo] of Object.entries(vehicleFinalOdo)) {
    const v = vehMap.get(Number(vid))
    if (!v) continue
    
    const brand = String(v.brand ?? "").trim()
    // Use brand-specific interval (per requirements table)
    const serviceInterval = brandServiceIntervals[brand] ?? Number(v.service_interval_km ?? v.serviceIntervalKm ?? 120000)
    // Contract limit is brand-based (total contract km)
    const contractLimitKm = brandContractLimits[brand] ?? 450000
    // Annual limit from CSV (if different from contract limit, it's per-vehicle annual)
    const csvLimitKm = Number(v.leasing_limit_km ?? v.leasingLimitKm ?? 0)
    const annualLimitKm = csvLimitKm > 0 && csvLimitKm !== contractLimitKm ? csvLimitKm : undefined
    const contractUsedKm = Math.max(0, vehicleContractUsed[Number(vid)] ?? 0)
    const contractRemainingKm = Math.max(0, contractLimitKm - contractUsedKm)
    
    const lastServiceOdo = vehicleLastService[Number(vid)] || finalOdo
    const kmSinceService = finalOdo - lastServiceOdo
    const kmUntilService = Math.max(0, serviceInterval - kmSinceService)
    const nextServiceAt = finalOdo + kmUntilService
    
    services.push({
      vehicleId: Number(vid),
      registrationNumber: v.registration_number ?? v.registrationNumber,
      brand,
      currentOdo: finalOdo,
      nextServiceAt,
      kmUntilService,
      serviceInterval,
      lastServiceOdo,
      contractLimitKm,
      contractUsedKm,
      contractRemainingKm,
      annualLimitKm: annualLimitKm > 0 && annualLimitKm !== contractLimitKm ? annualLimitKm : undefined,
    })
  }
  
  // Sort based on selected criteria
  const sorted = [...services].sort((a, b) => {
    if (sortBy === "service") {
      // Primary: km until service (nearest first)
      // Vehicles requiring service NOW (kmUntilService <= 0) go first
      if (a.kmUntilService <= 0 && b.kmUntilService > 0) return -1
      if (a.kmUntilService > 0 && b.kmUntilService <= 0) return 1
      // Both in same category, sort by kmUntilService ascending
      const serviceDiff = a.kmUntilService - b.kmUntilService
      if (serviceDiff !== 0) return serviceDiff
      // Secondary: contract remaining (nearest limit first)
      return a.contractRemainingKm - b.contractRemainingKm
    } else {
      // Primary: contract remaining (nearest limit first)
      const contractDiff = a.contractRemainingKm - b.contractRemainingKm
      if (contractDiff !== 0) return contractDiff
      // Secondary: km until service (nearest first)
      if (a.kmUntilService <= 0 && b.kmUntilService > 0) return -1
      if (a.kmUntilService > 0 && b.kmUntilService <= 0) return 1
      return a.kmUntilService - b.kmUntilService
    }
  })
  
  return sorted
}

