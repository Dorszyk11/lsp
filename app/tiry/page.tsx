"use client"

import { useEffect, useMemo, useState } from "react"
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

type Assignment = { vehicleId?: number; routeId?: number; start?: string; end?: string }

export default function Page() {
  const [plan, setPlan] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch("/api/plan/last", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok || j.ok === false) throw new Error(j.error || "Brak danych")
        setPlan(j.result)
      })
      .catch((e) => setError(String(e?.message || e)))
  }, [])

  const grouped = useMemo(() => groupByVehicle(plan), [plan])

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col px-4 lg:px-6 py-4 gap-4">
          <h2 className="text-xl font-semibold">Tiry i przypisane trasy</h2>
          {error && <div className="text-sm text-destructive">{error}</div>}
          {!error && !plan && <div className="text-sm text-muted-foreground">Wygeneruj najpierw plan na zakładce Obliczenia.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {grouped.map((g) => (
              <div key={g.vehicleId} className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Pojazd</div>
                <div className="text-lg font-medium">ID {g.vehicleId}</div>
                <div className="mt-2 text-sm">Trasy: {g.routes.length}</div>
                <ul className="mt-2 space-y-1 max-h-64 overflow-auto pr-2">
                  {g.routes.map((r) => (
                    <li key={r.routeId} className="text-sm flex items-center justify-between">
                      <span>Trasa #{r.routeId}</span>
                      <span className="text-muted-foreground">{r.start?.slice(0,10)} → {r.end?.slice(0,10)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function groupByVehicle(plan: any): { vehicleId: number; routes: { routeId: number; start?: string; end?: string }[] }[] {
  // Support both planner.ts assignments and Python result if it includes assignments
  let asg: any[] = []
  if (Array.isArray(plan?.assignments)) {
    asg = plan.assignments
  } else if (Array.isArray(plan?.result?.assignments)) {
    return groupByVehicle(plan.result)
  }
  
  if (asg.length === 0) return []
  
  const by: Record<number, { routeId: number; start?: string; end?: string }[]> = {}
  for (const a of asg) {
    // Support different field names: vehicleId/vehicle_id, routeId/route_id
    const vid = Number(a.vehicleId ?? a.vehicle_id ?? 0)
    const rid = Number(a.routeId ?? a.route_id ?? 0)
    if (!Number.isFinite(vid) || !Number.isFinite(rid)) continue
    const start = a.routeStartDatetime ?? a.start_datetime ?? a.start
    const end = a.routeEndDatetime ?? a.end_datetime ?? a.end
    ;(by[vid] ||= []).push({ routeId: rid, start, end })
  }
  const out = Object.entries(by).map(([vehicleId, routes]) => ({ vehicleId: Number(vehicleId), routes }))
  out.sort((a, b) => a.vehicleId - b.vehicleId)
  for (const g of out) g.routes.sort((a, b) => a.routeId - b.routeId)
  return out
}


