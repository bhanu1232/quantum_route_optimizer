"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Map, Navigation } from "lucide-react"

interface Location {
  id: string
  name: string
  address: string
  coordinates?: [number, number]
}

interface RouteVisualizationProps {
  startLocation: Location
  deliveryLocations: Location[]
  optimizedPath: string[]
}

declare global {
  interface Window {
    google: any
  }
}

export function RouteVisualization({ startLocation, deliveryLocations, optimizedPath }: RouteVisualizationProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [directionsService, setDirectionsService] = useState<any>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null)
  const [totalDistance, setTotalDistance] = useState<string>("")
  const [totalDuration, setTotalDuration] = useState<string>("")

  const allLocations = [startLocation, ...deliveryLocations]

  useEffect(() => {
    if (window.google && mapRef.current && !map) {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: startLocation.coordinates
          ? { lat: startLocation.coordinates[1], lng: startLocation.coordinates[0] }
          : { lat: 40.7128, lng: -74.006 }, // Default to NYC
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      })

      const dirService = new window.google.maps.DirectionsService()
      const dirRenderer = new window.google.maps.DirectionsRenderer({
        draggable: false,
        panel: null,
      })

      dirRenderer.setMap(googleMap)

      setMap(googleMap)
      setDirectionsService(dirService)
      setDirectionsRenderer(dirRenderer)
    }
  }, [startLocation, map])

  useEffect(() => {
    if (directionsService && directionsRenderer && optimizedPath.length > 2) {
      const waypoints = []

      // Create waypoints from optimized path (excluding start and end)
      for (let i = 1; i < optimizedPath.length - 1; i++) {
        const locationName = optimizedPath[i]
        const location = deliveryLocations.find((loc) => loc.name === locationName)

        if (location && location.coordinates) {
          waypoints.push({
            location: { lat: location.coordinates[1], lng: location.coordinates[0] },
            stopover: true,
          })
        }
      }

      const request = {
        origin: startLocation.coordinates
          ? { lat: startLocation.coordinates[1], lng: startLocation.coordinates[0] }
          : startLocation.address,
        destination: startLocation.coordinates
          ? { lat: startLocation.coordinates[1], lng: startLocation.coordinates[0] }
          : startLocation.address,
        waypoints: waypoints,
        optimizeWaypoints: false, // We already have the optimized order
        travelMode: window.google.maps.TravelMode.DRIVING,
      }

      directionsService.route(request, (result: any, status: string) => {
        if (status === "OK") {
          directionsRenderer.setDirections(result)

          // Calculate total distance and duration
          let totalDist = 0
          let totalTime = 0

          result.routes[0].legs.forEach((leg: any) => {
            totalDist += leg.distance.value
            totalTime += leg.duration.value
          })

          setTotalDistance((totalDist / 1000).toFixed(1) + " km")
          setTotalDuration(Math.round(totalTime / 60) + " min")
        } else {
          console.log("[v0] Directions request failed:", status)
        }
      })
    }
  }, [directionsService, directionsRenderer, optimizedPath, startLocation])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Route Visualization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div ref={mapRef} className="w-full h-[400px] rounded-lg border bg-muted/30" style={{ minHeight: "400px" }} />

          {/* Route Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Distance</p>
              <p className="text-lg font-semibold">{totalDistance || "Calculating..."}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Estimated Time</p>
              <p className="text-lg font-semibold">{totalDuration || "Calculating..."}</p>
            </div>
          </div>

          {/* Route Steps */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Optimized Route Steps
            </h4>
            <div className="space-y-2">
              {optimizedPath.map((locationName, index) => {
                const isStart = index === 0
                const isEnd = index === optimizedPath.length - 1
                const isReturn = isStart && isEnd && index > 0

                return (
                  <div
                    key={`${locationName}-${index}`}
                    className="flex items-center gap-3 p-2 rounded bg-background/50"
                  >
                    <div
                      className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                      ${
                        isStart && !isReturn
                          ? "bg-accent text-accent-foreground"
                          : isReturn
                            ? "bg-accent/70 text-accent-foreground"
                            : "bg-secondary text-secondary-foreground"
                      }
                    `}
                    >
                      {isStart && !isReturn ? "S" : isReturn ? "E" : index}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{locationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {isStart && !isReturn
                          ? "Depot (Start)"
                          : isReturn
                            ? "Return to Depot"
                            : `Delivery Stop ${index}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
