"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MapPin, Plus } from "lucide-react"
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from "@/lib/google-maps-loader"

interface Location {
  id: string
  name: string
  address: string
  coordinates?: [number, number]
}

interface LocationInputProps {
  placeholder: string
  onLocationSelect: (location: Location | null) => void
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export function LocationInput({ placeholder, onLocationSelect }: LocationInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (isGoogleMapsLoaded()) {
      setIsLoaded(true)
    } else {
      loadGoogleMapsAPI()
        .then(() => {
          setIsLoaded(true)
        })
        .catch((error) => {
          console.error("[v0] Failed to load Google Maps:", error)
        })
    }
  }, [])

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["establishment", "geocode"],
        fields: ["place_id", "name", "formatted_address", "geometry"],
      })

      autocompleteRef.current.addListener("place_changed", () => {
        if (processingRef.current) return
        processingRef.current = true

        const place = autocompleteRef.current.getPlace()

        if (place.geometry && place.geometry.location) {
          const location: Location = {
            id: place.place_id || Math.random().toString(36).substr(2, 9),
            name: place.name || place.formatted_address.split(",")[0],
            address: place.formatted_address,
            coordinates: [place.geometry.location.lng(), place.geometry.location.lat()],
          }

          console.log("[v0] LocationInput: Autocomplete selected location:", location.name)
          onLocationSelect(location)
          setInputValue("")
        }

        setTimeout(() => {
          processingRef.current = false
        }, 100)
      })
    }
  }, [isLoaded, onLocationSelect])

  const handleAddLocation = () => {
    if (processingRef.current) return

    if (inputValue.trim()) {
      processingRef.current = true

      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder()

        geocoder.geocode({ address: inputValue.trim() }, (results: any[], status: string) => {
          if (status === "OK" && results[0]) {
            const result = results[0]
            const location: Location = {
              id: result.place_id || Math.random().toString(36).substr(2, 9),
              name: result.formatted_address.split(",")[0],
              address: result.formatted_address,
              coordinates: [result.geometry.location.lng(), result.geometry.location.lat()],
            }
            console.log("[v0] LocationInput: Manual geocoding selected location:", location.name)
            onLocationSelect(location)
            setInputValue("")
          } else {
            console.log("[v0] Geocoding failed:", status)
            alert("Could not find this location. Please try a more specific address.")
          }

          setTimeout(() => {
            processingRef.current = false
          }, 100)
        })
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddLocation()
    }
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isLoaded ? placeholder : "Loading Google Maps..."}
          className="pl-10"
          disabled={!isLoaded}
        />
      </div>
      <Button onClick={handleAddLocation} disabled={!inputValue.trim() || !isLoaded} size="icon" variant="outline">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
