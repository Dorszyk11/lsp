import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SectionCards(props: {
  totalCost?: number
  deadheadCost?: number
  overageCost?: number
  numSwaps?: number
  pctVehiclesWithoutOverage?: number
  pctContractUtilization?: number
  goalCompletionPct?: number
}) {
  const totalCost = Math.round(props.totalCost ?? 0)
  const deadhead = Math.round(props.deadheadCost ?? 0)
  const overage = Math.round(props.overageCost ?? 0)
  const swaps = props.numSwaps ?? 0
  const pctGoal = Math.round((props.goalCompletionPct ?? props.pctVehiclesWithoutOverage) ?? 0)
  const pctUtil = Math.round(props.pctContractUtilization ?? 0)
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Łączny koszt</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalCost.toLocaleString("pl-PL")} PLN
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              koszt = dojazdy + nadprzebieg
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Dojazdy: {deadhead.toLocaleString("pl-PL")} PLN, Nadprzebieg: {overage.toLocaleString("pl-PL")} PLN
          </div>
          <div className="text-muted-foreground">
            Suma dla wygenerowanego planu
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Zamiany (dojazdy)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {swaps}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown />
              limit: 1 / poj. / okno
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Im mniej, tym lepiej <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Ograniczenie częstotliwości zamian
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Realizacja celu</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pctGoal}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              cel: 100%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            % tras zrealizowanych <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Wyższe = lepiej</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Wykorzystanie kontraktów</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pctUtil}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              średnia floty
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Km przejechane / km dostępne <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Cel: wysokie wykorzystanie bez kar</div>
        </CardFooter>
      </Card>
    </div>
  )
}
