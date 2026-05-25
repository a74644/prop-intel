import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  MapPin, Navigation, Loader2, AlertCircle, Bed, Bath,
  Building2, ChevronRight, LayoutList, Map as MapIcon,
} from 'lucide-react'
import { propertiesApi } from '../lib/api'
import { formatPrice, formatDate, formatKm, propertyTypeColor } from '../lib/utils'
import type { NearbyPropertyDto } from '../types'
import PropertyMap, { type MapProperty } from '../components/PropertyMap'

const CITY_PRESETS = [
  { label: 'Sydney CBD',    lat: -33.8688, lon: 151.2093 },
  { label: 'Melbourne CBD', lat: -37.8136, lon: 144.9631 },
  { label: 'Brisbane CBD',  lat: -27.4698, lon: 153.0251 },
  { label: 'Perth CBD',     lat: -31.9505, lon: 115.8605 },
  { label: 'Adelaide CBD',  lat: -34.9285, lon: 138.6007 },
  { label: 'Gold Coast',    lat: -28.0167, lon: 153.4000 },
]

type ViewMode = 'split' | 'map' | 'list'

export default function NearbyPage() {
  const navigate = useNavigate()
  const [sp]     = useSearchParams()

  const [lat,        setLat]        = useState(sp.get('lat') ?? '')
  const [lon,        setLon]        = useState(sp.get('lon') ?? '')
  const [radius,     setRadius]     = useState(3)
  const [maxResults, setMaxResults] = useState(20)
  const [viewMode,   setViewMode]   = useState<ViewMode>('split')

  const [results,    setResults]    = useState<NearbyPropertyDto[]>([])
  const [loading,    setLoading]    = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [error,      setError]      = useState('')
  const [searched,   setSearched]   = useState(false)
  const [origin,     setOrigin]     = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    if (sp.get('lat') && sp.get('lon')) doSearch()
  }, [])  // eslint-disable-line

  const doSearch = async (overrideLat?: number, overrideLon?: number) => {
    const la = overrideLat ?? parseFloat(lat)
    const lo = overrideLon ?? parseFloat(lon)
    if (isNaN(la) || isNaN(lo)) { setError('Please enter valid coordinates'); return }

    setLoading(true)
    setError('')
    setSearched(true)
    setOrigin({ lat: la, lon: lo })
    try {
      const data = await propertiesApi.nearbyByCoord(la, lo, radius, maxResults)
      setResults(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); doSearch() }

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const la = pos.coords.latitude
        const lo = pos.coords.longitude
        setLat(la.toFixed(6))
        setLon(lo.toFixed(6))
        setGeoLoading(false)
        doSearch(la, lo)
      },
      () => {
        setError('Unable to get location. Enter coordinates manually.')
        setGeoLoading(false)
      }
    )
  }

  const loadPreset = (preset: typeof CITY_PRESETS[0]) => {
    setLat(preset.lat.toFixed(6))
    setLon(preset.lon.toFixed(6))
    doSearch(preset.lat, preset.lon)
  }

  // Convert to MapProperty
  const mapProperties: MapProperty[] = results.map(p => ({
    id:            p.id,
    fullAddress:   p.fullAddress,
    propertyType:  p.propertyType,
    bedrooms:      p.bedrooms,
    bathrooms:     p.bathrooms,
    lastSalePrice: p.lastSalePrice,
    lastSaleDate:  p.lastSaleDate,
    lat:           p.location.coordinates[1],
    lon:           p.location.coordinates[0],
    distanceKm:    p.distanceKm,
  }))

  const showMap = viewMode === 'split' || viewMode === 'map'
  const showList = viewMode === 'split' || viewMode === 'list'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Control bar ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-edge bg-void/60 px-5 py-3">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
          <div className="flex gap-2 flex-1 min-w-0">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] text-ink-2 font-mono mb-1">LATITUDE</label>
              <input
                className="input font-mono text-xs py-2"
                placeholder="-33.865143"
                value={lat}
                onChange={e => setLat(e.target.value)}
                required
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] text-ink-2 font-mono mb-1">LONGITUDE</label>
              <input
                className="input font-mono text-xs py-2"
                placeholder="151.209900"
                value={lon}
                onChange={e => setLon(e.target.value)}
                required
              />
            </div>
            <div className="w-24">
              <label className="block text-[10px] text-ink-2 font-mono mb-1">RADIUS</label>
              <select className="select text-xs py-2" value={radius} onChange={e => setRadius(Number(e.target.value))}>
                {[0.5, 1, 2, 3, 5, 10, 20].map(r => <option key={r} value={r}>{r} km</option>)}
              </select>
            </div>
            <div className="w-20">
              <label className="block text-[10px] text-ink-2 font-mono mb-1">MAX</label>
              <select className="select text-xs py-2" value={maxResults} onChange={e => setMaxResults(Number(e.target.value))}>
                {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <button type="submit" className="btn btn-gold btn-sm" disabled={loading}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
              {loading ? 'Searching…' : 'Search'}
            </button>
            <button type="button" onClick={useMyLocation} disabled={geoLoading || loading} className="btn btn-teal btn-sm">
              {geoLoading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
              {geoLoading ? 'Locating…' : 'My location'}
            </button>

            {/* View toggle */}
            <div className="flex border border-edge rounded-lg overflow-hidden ml-2">
              {([
                { mode: 'split', icon: <LayoutList size={13} />, title: 'Split view' },
                { mode: 'map',   icon: <MapIcon size={13} />,    title: 'Map only'   },
                { mode: 'list',  icon: <Building2 size={13} />,  title: 'List only'  },
              ] as { mode: ViewMode; icon: React.ReactNode; title: string }[]).map(({ mode, icon, title }, i) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  title={title}
                  className={`px-2.5 py-1.5 transition-colors ${i > 0 ? 'border-l border-edge' : ''} ${
                    viewMode === mode ? 'bg-teal/15 text-teal-bright' : 'text-ink-2 hover:text-ink-1'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* City presets */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {CITY_PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => loadPreset(preset)}
              disabled={loading}
              className="btn btn-ghost btn-sm text-[11px] py-1 px-2.5"
            >
              <MapPin size={10} className="text-teal-bright" /> {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="mx-5 mt-3 p-3 card border-red-800/40 bg-red-950/20 flex items-center gap-2 flex-shrink-0">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && !searched && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(18,200,192,0.08)', border: '1px solid rgba(18,200,192,0.2)' }}
          >
            <MapPin size={32} className="text-teal-bright" />
          </div>
          <div>
            <h3 className="font-display text-2xl text-ink-0 font-medium">Proximity Search</h3>
            <p className="text-sm text-ink-2 mt-2 max-w-sm">
              Enter coordinates, use your location, or pick a city preset to discover nearby properties visualised on the map.
            </p>
          </div>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-teal/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-teal-bright animate-spin" />
            <MapPin size={18} className="absolute inset-0 m-auto text-teal-bright" />
          </div>
          <p className="text-sm text-ink-2 font-mono">Scanning {radius} km radius…</p>
        </div>
      )}

      {/* ── Results: split / map / list ───────────────────────────────────── */}
      {searched && !loading && (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Map pane */}
          {showMap && (
            <div className={`relative ${showList ? 'flex-1' : 'w-full'} p-3 overflow-hidden`}>
              {results.length === 0 && !error ? (
                <div className="h-full flex flex-col items-center justify-center bg-panel rounded-xl border border-edge gap-3">
                  <MapPin size={28} className="text-ink-2" />
                  <p className="text-sm text-ink-2">No properties in this area</p>
                  <button onClick={() => { setRadius(10); doSearch() }} className="btn btn-ghost btn-sm">
                    Try 10 km
                  </button>
                </div>
              ) : (
                <PropertyMap
                  properties={mapProperties}
                  height="100%"
                  showLegend
                  fitOnLoad
                  originMarker={origin ? { lat: origin.lat, lon: origin.lon, label: `${radius}km` } : undefined}
                  radiusKm={radius}
                />
              )}

              {/* Results count overlay */}
              {results.length > 0 && (
                <div className="absolute bottom-6 left-6 pointer-events-none">
                  <div
                    className="px-3 py-1.5 rounded-full text-xs font-mono"
                    style={{ background: 'rgba(8,17,31,0.88)', border: '1px solid #1D3450', color: '#8799B8' }}
                  >
                    {results.length} found · radius {radius} km
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List pane */}
          {showList && (
            <div className={`${showMap ? 'w-80 border-l border-edge' : 'w-full'} overflow-y-auto flex-shrink-0`}>
              {results.length === 0 && !error ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center gap-3">
                  <Building2 size={32} className="text-ink-2" />
                  <p className="text-sm text-ink-1 font-medium">No properties found</p>
                  <p className="text-xs text-ink-2">Try a larger radius</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {results.map((prop, idx) => (
                    <NearbyListItem
                      key={prop.id}
                      property={prop}
                      rank={idx + 1}
                      compact={showMap}
                      onClick={() => navigate(`/properties/${prop.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Nearby list item ──────────────────────────────────────────────────────────
function NearbyListItem({
  property: p, rank, compact, onClick,
}: {
  property: NearbyPropertyDto; rank: number; compact: boolean; onClick: () => void
}) {
  const typeColor = propertyTypeColor(p.propertyType)
  const isClose   = p.distanceKm < 0.5

  return (
    <button
      onClick={onClick}
      className="card card-hover w-full text-left group p-3"
    >
      <div className="flex items-start gap-3">
        {/* Rank + distance */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold"
            style={{ background: `${typeColor}18`, color: typeColor }}
          >
            {rank}
          </div>
          <span
            className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: isClose ? 'rgba(43,176,104,0.12)' : 'rgba(18,200,192,0.1)',
              color: isClose ? '#2BB068' : '#12C8C0',
            }}
          >
            {formatKm(p.distanceKm)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-0 font-medium truncate group-hover:text-teal-bright transition-colors leading-snug">
            {p.fullAddress}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-2 font-mono">
            <span className="flex items-center gap-0.5"><Bed size={10} />{p.bedrooms}</span>
            <span className="flex items-center gap-0.5"><Bath size={10} />{p.bathrooms}</span>
            <span
              className="badge text-[9px] py-0 px-1.5"
              style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25` }}
            >
              {p.propertyType}
            </span>
          </div>
          {!compact && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm font-mono tabular font-semibold text-gold-bright">
                {p.lastSalePrice ? formatPrice(p.lastSalePrice, true) : '—'}
              </p>
              {p.lastSaleDate && (
                <p className="text-[10px] text-ink-2 font-mono">{formatDate(p.lastSaleDate)}</p>
              )}
            </div>
          )}
          {compact && p.lastSalePrice && (
            <p className="text-xs font-mono tabular text-gold-bright mt-1">{formatPrice(p.lastSalePrice, true)}</p>
          )}
        </div>

        {compact && <ChevronRight size={13} className="text-ink-2 group-hover:text-teal-bright transition-colors flex-shrink-0 mt-1" />}
      </div>
    </button>
  )
}
