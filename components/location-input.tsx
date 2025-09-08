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

      // Apply styles to ensure the dropdown appears correctly
      const fixPacContainerStyles = () => {
        // Use a shorter delay for better responsiveness
        setTimeout(() => {
          const pacContainers = document.querySelectorAll('.pac-container')
          pacContainers.forEach(container => {
            const containerElement = container as HTMLElement
            containerElement.style.zIndex = '9999'
            containerElement.style.position = 'absolute'
            containerElement.style.display = 'block'
            containerElement.style.visibility = 'visible'
            
            // Ensure proper width and positioning
            if (inputRef.current) {
              const rect = inputRef.current.getBoundingClientRect()
              containerElement.style.width = `${inputRef.current.offsetWidth}px`
              containerElement.style.left = `${rect.left}px`
              containerElement.style.top = `${rect.bottom}px`
            }
            
            // Enhanced styles to ensure visibility
            containerElement.style.marginTop = '2px'
            containerElement.style.backgroundColor = 'white'
            containerElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)'
            containerElement.style.fontSize = '14px'
            containerElement.style.overflow = 'hidden'
            containerElement.style.border = '1px solid #ddd'
            containerElement.style.borderRadius = '4px'
            
            // Make sure the dropdown is not hidden
            containerElement.style.opacity = '1'
            containerElement.style.pointerEvents = 'auto'
            
            // Fix any potential issues with parent containers
            let parent = containerElement.parentElement
            while (parent) {
              if (getComputedStyle(parent).overflow === 'hidden') {
                parent.style.overflow = 'visible'
              }
              parent = parent.parentElement
            }
          })
        }, 150) // Shorter delay for better responsiveness
      }

      // Apply styles when input is focused or receives input
      inputRef.current.addEventListener('focus', fixPacContainerStyles)
      inputRef.current.addEventListener('input', fixPacContainerStyles)
      
      // Trigger the autocomplete dropdown when typing
      inputRef.current.addEventListener('input', handleInputForAutocomplete)
      
      // Also set up a MutationObserver to detect when Google adds the pac-container to the DOM
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
            const pacContainers = document.querySelectorAll('.pac-container')
            if (pacContainers.length > 0) {
              fixPacContainerStyles()
            }
          }
        })
      })
      
      // Start observing the document body for added nodes
      observer.observe(document.body, { childList: true, subtree: true })
      
      const placeChangedListener = autocompleteRef.current.addListener("place_changed", () => {
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
      
      // Store the input event handler for cleanup
      const handleInputForAutocomplete = () => {
        // Force the autocomplete to show suggestions
        if (inputRef.current && inputRef.current.value.length > 0) {
          // Add a small delay to ensure Google's API has time to process the input
          setTimeout(() => {
            // Ensure the pac-container is visible
            fixPacContainerStyles()
            
            // Simulate a focus event to ensure Google's autocomplete activates
            const focusEvent = new Event('focus', { bubbles: true })
            inputRef.current?.dispatchEvent(focusEvent)
            
            // Force Google's autocomplete to update
            if (autocompleteRef.current) {
              // This triggers the internal Google Maps autocomplete mechanism
              const inputEvent = new Event('input', { bubbles: true })
              inputRef.current?.dispatchEvent(inputEvent)
            }
          }, 100)
        }
      }
      
      // Return cleanup function for the effect
      return () => {
        // Clean up event listeners
        if (inputRef.current) {
          inputRef.current.removeEventListener('focus', fixPacContainerStyles)
          inputRef.current.removeEventListener('input', fixPacContainerStyles)
          inputRef.current.removeEventListener('input', handleInputForAutocomplete)
        }
        // Disconnect the observer
        observer.disconnect()
        // Remove Google Maps listener
        if (placeChangedListener) {
          placeChangedListener.remove()
        }
      }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddLocation()
    }
  }

  return (
    <div className="flex gap-2">
      <div className="location-input-container relative flex-1">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            // Ensure autocomplete is triggered when typing
            if (isLoaded && e.target.value.length > 0 && autocompleteRef.current) {
              // This helps ensure the dropdown appears
              const pacContainers = document.querySelectorAll('.pac-container')
              if (pacContainers.length === 0) {
                // If no dropdown is visible, force it to appear
                setTimeout(() => {
                  if (inputRef.current) {
                    inputRef.current.focus()
                  }
                }, 10)
              }
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Ensure dropdown appears on focus
            if (isLoaded && inputValue.length > 0) {
              setTimeout(() => {
                const pacContainers = document.querySelectorAll('.pac-container')
                if (pacContainers.length === 0) {
                  // If no dropdown is visible, manually trigger input event
                  const inputEvent = new Event('input', { bubbles: true })
                  inputRef.current?.dispatchEvent(inputEvent)
                }
              }, 100)
            }
          }}
          placeholder={isLoaded ? placeholder : "Loading Google Maps..."}
          className="pl-10"
          disabled={!isLoaded}
          autoComplete="off" // Prevent browser autocomplete from interfering
        />
      </div>
      <Button onClick={handleAddLocation} disabled={!inputValue.trim() || !isLoaded} size="icon" variant="outline">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
