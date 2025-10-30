"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from '@/hooks/use-mobile'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

export const description = "Koszty planu (słupki)"

type CostBar = { label: string; value: number }

const chartConfig = {
  value: { label: "PLN", color: "var(--primary)" },
} satisfies ChartConfig

export function ChartAreaInteractive({ data }: { data: CostBar[] }) {
  const isMobile = useIsMobile()
  const bars = (data ?? []).map(d => ({ ...d, label: d.label }))

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Struktura kosztów</CardTitle>
        <CardDescription>
          Dojazdy vs Nadprzebieg vs Razem
        </CardDescription>
        <CardAction />
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart data={bars} barSize={isMobile ? 28 : 36}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => Number(v).toLocaleString("pl-PL")} />
            <ChartTooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent indicator="dot" valueFormatter={(v) => `${Number(v).toLocaleString("pl-PL")} PLN`} />} />
            <Bar dataKey="value" fill="var(--primary)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
