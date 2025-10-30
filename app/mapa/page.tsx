"use client"

import { useEffect, useState, useRef } from "react"
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

type Location = {
  id: number
  name: string
  lat: number
  long: number
  is_hub: boolean
}

export default function Page() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/locations")
      .then(async (r) => {
        if (!r.ok) throw new Error("Błąd ładowania lokalizacji")
        const data = await r.json()
        setLocations(data.locations || [])
      })
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col px-4 lg:px-6 py-4 gap-4">
          <h2 className="text-xl font-semibold">Mapa lokalizacji</h2>
          
          {loading && <div className="text-sm text-muted-foreground">Ładowanie mapy...</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}
          
          {!loading && !error && (
            <div className="w-full h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-muted relative">
              {locations.length > 0 ? (
                <MapVisualization locations={locations} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Brak lokalizacji do wyświetlenia
                </div>
              )}
            </div>
          )}

          {locations.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">
                Zarejestrowanych lokalizacji: {locations.length}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-auto">
                {locations.slice(0, 20).map((loc) => (
                  <div key={loc.id} className="text-xs p-2 border rounded bg-background">
                    <div className="font-medium">{loc.name}</div>
                    <div className="text-muted-foreground">
                      {loc.lat.toFixed(4)}, {loc.long.toFixed(4)}
                    </div>
                    {loc.is_hub && (
                      <div className="text-[#E61E1E] font-semibold text-xs mt-1">HUB</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function MapVisualization({ locations }: { locations: Location[] }) {
  // Calculate center and bounds
  const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length
  const avgLng = locations.reduce((sum, loc) => sum + loc.long, 0) / locations.length
  
  // Build static map using Leaflet via CDN (embedded)
  // Simple iframe solution with Leaflet
  const centerLat = avgLat.toFixed(6)
  const centerLng = avgLng.toFixed(6)
  
  // Create a data URL with locations for the map
  const locationsJson = JSON.stringify(locations.map(loc => ({
    id: loc.id,
    name: loc.name,
    lat: loc.lat,
    lng: loc.long,
    isHub: loc.is_hub
  })))
  
  // Use Leaflet map via iframe (simple solution)
  // Alternative: use Leaflet CDN directly in component
  return (
    <div className="w-full h-full relative">
      <LeafletMap locations={locations} centerLat={avgLat} centerLng={avgLng} />
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border z-10">
        <div className="text-sm font-semibold mb-2">Legenda</div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 bg-[#E61E1E] rounded-full"></div>
          <span>Hub</span>
        </div>
        <div className="flex items-center gap-2 text-xs mt-1">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span>Lokalizacja</span>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {locations.length} lokalizacji
        </div>
      </div>
    </div>
  )
}

function LeafletMap({ locations, centerLat, centerLng }: { locations: Location[], centerLat: number, centerLng: number }) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  
  useEffect(() => {
    // Check if Leaflet is already loaded
    // @ts-ignore
    if (typeof window !== 'undefined' && window.L) {
      initMap()
      return
    }
    
    // Load Leaflet CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
    link.crossOrigin = ''
    document.head.appendChild(link)
    
    // Load Leaflet JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
    script.crossOrigin = ''
    script.onload = () => {
      initMap()
    }
    document.body.appendChild(script)
    
    function initMap() {
      // @ts-ignore
      const L = window.L
      if (!L || !mapRef.current) return
      
      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        markersRef.current.forEach(m => mapInstanceRef.current.removeLayer(m))
        markersRef.current = []
      }
      
      // Create new map
      const map = L.map(mapRef.current).setView([centerLat, centerLng], 6)
      mapInstanceRef.current = map
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      
      // Add markers
      locations.forEach(loc => {
        const color = loc.is_hub ? '#E61E1E' : '#3b82f6'
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })
        
        const marker = L.marker([loc.lat, loc.long], { icon })
          .addTo(map)
          .bindPopup(`<b>${loc.name}</b><br>ID: ${loc.id}${loc.is_hub ? '<br><span style="color: #E61E1E;">HUB</span>' : ''}`)
        
        markersRef.current.push(marker)
      })
    }
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      markersRef.current = []
    }
  }, [locations, centerLat, centerLng])
  
  return <div ref={mapRef} className="w-full h-full" />
}

