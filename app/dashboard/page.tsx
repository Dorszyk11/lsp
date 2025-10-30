"use client"
import { AppSidebar } from '@/components/app-sidebar'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { SectionCards } from '@/components/section-cards'
import { SiteHeader } from '@/components/site-header'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

import { useState } from "react"

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
                totalCost={plan?.total_cost ?? ((plan?.totalDeadheadCost ?? 0) + (plan?.totalOverageCost ?? 0))}
                deadheadCost={plan?.swap_cost ?? plan?.totalDeadheadCost ?? 0}
                overageCost={plan?.overrun_cost ?? plan?.totalOverageCost ?? 0}
                numSwaps={plan?.swaps_count ?? plan?.numSwaps ?? 0}
                pctVehiclesWithoutOverage={plan?.kpis?.pctVehiclesWithoutOverage ?? 0}
                pctContractUtilization={plan?.contract_use_pct ?? plan?.kpis?.pctContractUtilization ?? 0}
                goalCompletionPct={plan?.goal_completion_pct}
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={buildCostBars(plan)} />
              </div>
              <div className="px-4 lg:px-6 flex items-center gap-4">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  Ilość dni:
                  <input type="number" className="border rounded px-2 py-1 w-28 bg-background" value={days as any} onChange={(e) => setDays(e.target.value === "" ? "" : Number(e.target.value))} />
                </label>
                <button onClick={generatePlan} className="px-4 py-2 rounded bg-[#E61E1E] text-white hover:bg-[#cc1a1a] disabled:opacity-50 transition-colors" disabled={loading}>
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
