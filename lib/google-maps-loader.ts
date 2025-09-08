let isLoading = false
let isLoaded = false
let loadPromise: Promise<void> | null = null

export function loadGoogleMapsAPI(): Promise<void> {
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise
  }

  // Return resolved promise if already loaded
  if (isLoaded || window.google?.maps) {
    return Promise.resolve()
  }

  // Check if script already exists in DOM
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
  if (existingScript) {
    return new Promise((resolve) => {
      if (window.google?.maps) {
        resolve()
      } else {
        existingScript.addEventListener("load", () => resolve())
      }
    })
  }

  // Create new loading promise
  loadPromise = new Promise((resolve, reject) => {
    if (isLoading) return

    isLoading = true

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBtdLeqCmrtCK60UUgSrhAh88J7xEI981o&libraries=places&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      isLoaded = true
      isLoading = false
      console.log("[v0] Google Maps API loaded successfully")
      resolve()
    }

    script.onerror = () => {
      isLoading = false
      loadPromise = null
      console.error("[v0] Failed to load Google Maps API")
      reject(new Error("Failed to load Google Maps API"))
    }

    document.head.appendChild(script)
  })

  return loadPromise
}

export function isGoogleMapsLoaded(): boolean {
  return isLoaded || Boolean(window.google?.maps)
}
