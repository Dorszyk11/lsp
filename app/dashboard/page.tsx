"use client"
import { AppSidebar } from '@/components/app-sidebar'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { SectionCards } from '@/components/section-cards'
import { SiteHeader } from '@/components/site-header'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

import { useEffect, useState } from "react"
// using server-side loader from ./api/plan/local

export default function Page() {
  const [plan, setPlan] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [swapDays] = useState(90)
  const [days, setDays] = useState<number | "">(365)
  const [error, setError] = useState<string | null>(null)
  // no demo, no client-side CSV

  async function generatePlan() {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      q.set("swapDays", String(swapDays))
      if (days !== "" && !Number.isNaN(Number(days))) q.set("days", String(days))
      const res = await fetch(`/api/plan/python?${q.toString()}`)
      const json = await res.json()
      if (!res.ok || json.ok === false) {
        setPlan(null)
        setError(String(json.error || "Błąd uruchomienia planera Python"))
        return
      }
      setPlan(json.result)
    } finally {
      setLoading(false)
    }
  }

  // no demo payload

  async function tryLoadCsvFromPublic(): Promise<null | {
    vehicles: Record<string, string>[]
    locations: Record<string, string>[]
    relations: Record<string, string>[]
    routes: Record<string, string>[]
    segments: Record<string, string>[]
  }> {
    try {
      const v = await fetchFirst(["/data/Vehicles.csv","/data/vehicles.csv"], { cache: "no-store" })
      const l = await fetchFirst(["/data/Locations.csv","/data/locations.csv"], { cache: "no-store" })
      const rel = await fetchFirst([
        "/data/Locations_relations.csv",
        "/data/Location_relations.csv",
        "/data/locations_relations.csv",
        "/data/location_relations.csv",
      ], { cache: "no-store" })
      const r = await fetchFirst(["/data/Routes.csv","/data/routes.csv"], { cache: "no-store" })
      const s = await fetchFirst(["/data/Segments.csv","/data/segments.csv"], { cache: "no-store" })
      if (!v || !l || !rel || !r || !s) return null
      const [vt,lt,relt,rt,st] = await Promise.all([v.text(), l.text(), rel.text(), r.text(), s.text()])
      return {
        vehicles: parseCsv(vt),
        locations: parseCsv(lt),
        relations: parseCsv(relt),
        routes: parseCsv(rt),
        segments: parseCsv(st),
      }
    } catch {
      return null
    }
  }

  async function fetchFirst(urls: string[], init?: RequestInit): Promise<Response | null> {
    for (const u of urls) {
      try {
        const res = await fetch(u, init)
        if (res.ok) return res
      } catch {
        // ignore and try next
      }
    }
    return null
  }
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards
                totalCost={(plan?.totalDeadheadCost ?? 0) + (plan?.totalOverageCost ?? 0)}
                deadheadCost={plan?.totalDeadheadCost ?? 0}
                overageCost={plan?.totalOverageCost ?? 0}
                numSwaps={plan?.numSwaps ?? 0}
                pctVehiclesWithoutOverage={plan?.kpis?.pctVehiclesWithoutOverage ?? 0}
                pctContractUtilization={plan?.kpis?.pctContractUtilization ?? 0}
                // Flask mapping (snake_case)
                {...(plan?.total_cost != null ? { totalCost: plan.total_cost } : {})}
                {...(plan?.swap_cost != null ? { deadheadCost: plan.swap_cost } : {})}
                {...(plan?.overrun_cost != null ? { overageCost: plan.overrun_cost } : {})}
                {...(plan?.swaps_count != null ? { numSwaps: plan.swaps_count } : {})}
                {...(plan?.contract_use_pct != null ? { pctContractUtilization: plan.contract_use_pct } : {})}
                {...(plan?.goal_completion_pct != null ? { goalCompletionPct: plan.goal_completion_pct } : {})}
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={buildCostBars(plan)} />
              </div>
              <div className="px-4 lg:px-6 flex items-center gap-4">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  Ilość dni:
                  <input type="number" className="border rounded px-2 py-1 w-28 bg-background" value={days as any} onChange={(e) => setDays(e.target.value === "" ? "" : Number(e.target.value))} />
                </label>
                <button onClick={generatePlan} className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50" disabled={loading}>
                  {loading ? "Liczenie…" : "Generuj plan"}
                </button>
                {error && (
                  <div className="text-sm text-destructive">
                    {error}
                  </div>
                )}
                
              </div>
              
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function buildCostSeries(plan: any): { date: string; deadhead: number; overage: number; total: number }[] {
  if (!plan?.assignments) return []
  const byDay: Record<string, { deadhead: number; overage: number }> = {}
  for (const a of plan.assignments as any[]) {
    const startStr = String(a.routeStartDatetime ?? a.start_datetime ?? "")
    const dParsed = Date.parse(startStr)
    const key = isFinite(dParsed) ? new Date(dParsed).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    const d = byDay[key] || { deadhead: 0, overage: 0 }
    d.deadhead += Number(a.deadheadCost ?? 0)
    d.overage += Number(a.overageCost ?? 0)
    byDay[key] = d
  }
  return Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, deadhead: Math.round(v.deadhead), overage: Math.round(v.overage), total: Math.round(v.deadhead + v.overage) }))
}

function buildCostBars(plan: any): { label: string; value: number }[] {
  if (!plan) return []
  if (plan.total_cost != null || plan.swap_cost != null || plan.overrun_cost != null) {
    return [
      { label: "Dojazdy", value: Number(plan.swap_cost ?? 0) },
      { label: "Nadprzebieg", value: Number(plan.overrun_cost ?? 0) },
      { label: "Razem", value: Number(plan.total_cost ?? ((plan.swap_cost ?? 0) + (plan.overrun_cost ?? 0))) },
    ]
  }
  return [
    { label: "Dojazdy", value: Number(plan.totalDeadheadCost ?? 0) },
    { label: "Nadprzebieg", value: Number(plan.totalOverageCost ?? 0) },
    { label: "Razem", value: Number((plan.totalDeadheadCost ?? 0) + (plan.totalOverageCost ?? 0)) },
  ]
}
