"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Route, Clock, MapPin, Zap, TrendingUp } from "lucide-react"

interface OptimizedRoute {
  path: string[]
  totalDistance: number
  estimatedTime: number
  quantumAdvantage: number
}

interface OptimizationResultsProps {
  route: OptimizedRoute
}

export function OptimizationResults({ route }: OptimizationResultsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <Zap className="h-5 w-5" />
            Optimization Complete
          </CardTitle>
          <CardDescription>Quantum algorithm found the optimal delivery route</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center">
                <MapPin className="h-4 w-4 text-muted-foreground mr-1" />
                <span className="text-2xl font-bold text-foreground">{route.totalDistance}</span>
                <span className="text-sm text-muted-foreground ml-1">km</span>
              </div>
              <p className="text-xs text-muted-foreground">Total Distance</p>
            </div>

            <div className="text-center space-y-1">
              <div className="flex items-center justify-center">
                <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                <span className="text-2xl font-bold text-foreground">{Math.floor(route.estimatedTime / 60)}</span>
                <span className="text-sm text-muted-foreground ml-1">h</span>
                <span className="text-2xl font-bold text-foreground ml-1">{route.estimatedTime % 60}</span>
                <span className="text-sm text-muted-foreground ml-1">m</span>
              </div>
              <p className="text-xs text-muted-foreground">Est. Time</p>
            </div>

            <div className="text-center space-y-1">
              <div className="flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-accent mr-1" />
                <span className="text-2xl font-bold text-accent">{route.quantumAdvantage}</span>
                <span className="text-sm text-muted-foreground ml-1">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Improvement</p>
            </div>
          </div>

          {/* Quantum Advantage Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Quantum Advantage</span>
              <Badge variant="secondary" className="bg-accent/10 text-accent">
                {route.quantumAdvantage}% better than classical
              </Badge>
            </div>
            <Progress value={route.quantumAdvantage} className="h-2" />
            <p className="text-xs text-muted-foreground">Compared to nearest neighbor heuristic algorithm</p>
          </div>
        </CardContent>
      </Card>

      {/* Route Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Optimal Route Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {route.path.map((location, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {index === 0 || index === route.path.length - 1 ? (
                    <div className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index === 0 ? "S" : "E"}
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-secondary/10 text-secondary border-2 border-secondary rounded-full flex items-center justify-center text-sm font-medium">
                      {index}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{location}</p>
                  <p className="text-xs text-muted-foreground">
                    {index === 0
                      ? "Starting point"
                      : index === route.path.length - 1
                        ? "Return to depot"
                        : `Delivery stop ${index}`}
                  </p>
                </div>
                {index < route.path.length - 1 && <div className="text-muted-foreground">→</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
