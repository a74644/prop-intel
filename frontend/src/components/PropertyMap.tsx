import { useRef, useState, useCallback, useEffect } from 'react'
import Map, { Marker, NavigationControl, ScaleControl, Source, Layer } from 'react-map-gl/mapbox'
import type { MapRef, LayerProps } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { X, Maximize2, Bed, Bath, Car, ChevronRight, MapPin, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatPrice, formatDate, formatKm, propertyTypeColor } from '../lib/utils'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

// ── Shared map property type ───────────────────────────────────────────────────
export interface MapProperty {
  id:            string
  fullAddress:   string
  propertyType:  string
  bedrooms:      number
  bathrooms:     number
  carSpaces?:    number
  lastSalePrice: number | null
  lastSaleDate:  string | null
  lat:           number
  lon:           number
  distanceKm?:   number
  floorAreaSqm?: number | null
}

// ── GeoJSON circle (for radius search) ───────────────────────────────────────
function makeCircle(lon: number, lat: number, radiusKm: number, steps = 80): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  const latRad = (lat * Math.PI) / 180
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    coords.push([
      lon + ((radiusKm / 111.32) / Math.cos(latRad)) * Math.sin(angle),
      lat +  (radiusKm / 111.32) * Math.cos(angle),
    ])
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
}

// ── Layer styles ───────────────────────────────────────────────────────────────
const circleFillLayer: LayerProps = {
  id:   'radius-fill',
  type: 'fill',
  paint: { 'fill-color': '#12C8C0', 'fill-opacity': 0.06 },
}
const circleOutlineLayer: LayerProps = {
  id:   'radius-outline',
  type: 'line',
  paint: {
    'line-color':   '#12C8C0',
    'line-width':   1.5,
    'line-opacity': 0.5,
    'line-dasharray': [4, 3],
  },
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface PropertyMapProps {
  properties:      MapProperty[]
  height?:         string
  showLegend?:     boolean
  highlightId?:    string
  originMarker?:   { lat: number; lon: number; label?: string }
  radiusKm?:       number
  interactive?:    boolean
  initialZoom?:    number
  fitOnLoad?:      boolean
  onPropertyClick?: (id: string) => void
}

// ── Unique property types present in data ─────────────────────────────────────
const PROP_TYPE_ORDER = ['House', 'Apartment', 'Townhouse', 'Villa', 'Land', 'Studio', 'Commercial']

export default function PropertyMap({
  properties,
  height = '100%',
  showLegend = true,
  highlightId,
  originMarker,
  radiusKm,
  interactive = true,
  initialZoom = 11,
  fitOnLoad = true,
  onPropertyClick,
}: PropertyMapProps) {
  const navigate          = useNavigate()
  const mapRef            = useRef<MapRef>(null)
  const [selected, setSelected] = useState<MapProperty | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // ── Center point ────────────────────────────────────────────────────────────
  const center = (() => {
    if (originMarker) return { lon: originMarker.lon, lat: originMarker.lat }
    if (properties.length === 0) return { lon: 151.2093, lat: -33.8688 } // Sydney default
    const lon = properties.reduce((s, p) => s + p.lon, 0) / properties.length
    const lat = properties.reduce((s, p) => s + p.lat, 0) / properties.length
    return { lon, lat }
  })()

  // ── Fit bounds after load ───────────────────────────────────────────────────
  const fitBounds = useCallback(() => {
    const map = mapRef.current
    if (!map || properties.length === 0) return
    const lons = properties.map(p => p.lon)
    const lats = properties.map(p => p.lat)
    if (originMarker) { lons.push(originMarker.lon); lats.push(originMarker.lat) }
    map.fitBounds(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      { padding: { top: 80, bottom: selected ? 200 : 80, left: 60, right: 60 }, duration: 800, maxZoom: 15 }
    )
  }, [properties, originMarker, selected])

  useEffect(() => {
    if (mapLoaded && fitOnLoad) fitBounds()
  }, [mapLoaded, fitOnLoad, fitBounds])

  // ── Present types ───────────────────────────────────────────────────────────
  const presentTypes = PROP_TYPE_ORDER.filter(t => properties.some(p => p.propertyType === t))

  // ── Circle GeoJSON ──────────────────────────────────────────────────────────
  const circleData = originMarker && radiusKm
    ? makeCircle(originMarker.lon, originMarker.lat, radiusKm)
    : null

  // ── Guard: no token ─────────────────────────────────────────────────────────
  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 bg-panel rounded-xl border border-edge" style={{ height }}>
        <MapPin size={28} className="text-ink-2" />
        <div className="text-center">
          <p className="text-sm font-medium text-ink-1">Map requires Mapbox token</p>
          <p className="text-xs text-ink-2 mt-1 font-mono">Add VITE_MAPBOX_TOKEN to frontend/.env</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-edge" style={{ height }}>
      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        initialViewState={{ longitude: center.lon, latitude: center.lat, zoom: initialZoom }}
        interactive={interactive}
        onLoad={() => setMapLoaded(true)}
        onClick={() => setSelected(null)}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Navigation controls */}
        {interactive && (
          <NavigationControl position="top-right" showCompass showZoom />
        )}
        <ScaleControl position="bottom-left" unit="metric" />

        {/* Radius circle */}
        {circleData && (
          <Source id="radius-circle" type="geojson" data={circleData}>
            <Layer {...circleFillLayer} />
            <Layer {...circleOutlineLayer} />
          </Source>
        )}

        {/* Origin marker */}
        {originMarker && (
          <Marker longitude={originMarker.lon} latitude={originMarker.lat} anchor="center">
            <OriginPin label={originMarker.label} />
          </Marker>
        )}

        {/* Property markers */}
        {properties.map(prop => {
          const isSelected = selected?.id === prop.id || highlightId === prop.id
          const isHovered  = hoveredId === prop.id

          return (
            <Marker
              key={prop.id}
              longitude={prop.lon}
              latitude={prop.lat}
              anchor="bottom"
              onClick={e => { e.originalEvent.stopPropagation(); setSelected(prop); onPropertyClick?.(prop.id) }}
            >
              <PropertyPin
                property={prop}
                isSelected={isSelected}
                isHovered={isHovered}
                onMouseEnter={() => setHoveredId(prop.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            </Marker>
          )
        })}
      </Map>

      {/* ── Overlay controls ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Property count badge */}
        <div className="absolute top-3 left-3 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium"
            style={{ background: 'rgba(8,17,31,0.85)', backdropFilter: 'blur(8px)', border: '1px solid #1D3450', color: '#12C8C0' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-teal-bright animate-pulse" />
            {properties.length} {properties.length === 1 ? 'property' : 'properties'}
          </div>
        </div>

        {/* Fit bounds button */}
        {interactive && properties.length > 1 && (
          <div className="absolute top-14 right-3 pointer-events-auto">
            <button
              onClick={fitBounds}
              title="Fit all properties"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-1 hover:text-ink-0 transition-colors"
              style={{ background: 'rgba(8,17,31,0.9)', backdropFilter: 'blur(8px)', border: '1px solid #1D3450' }}
            >
              <Maximize2 size={13} />
            </button>
          </div>
        )}

        {/* Legend */}
        {showLegend && presentTypes.length > 0 && (
          <div
            className="absolute bottom-10 right-3 pointer-events-auto"
            style={{ background: 'rgba(8,17,31,0.88)', backdropFilter: 'blur(10px)', border: '1px solid #1D3450', borderRadius: 10, padding: '10px 12px' }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Layers size={10} className="text-ink-2" />
              <p className="text-[10px] text-ink-2 font-mono uppercase tracking-wider">Type</p>
            </div>
            <div className="space-y-1.5">
              {presentTypes.map(type => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: propertyTypeColor(type), boxShadow: `0 0 6px ${propertyTypeColor(type)}60` }}
                  />
                  <span className="text-[11px] text-ink-1 font-mono">{type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Selected property panel ───────────────────────────────────────── */}
      {selected && (
        <PropertyPanel
          property={selected}
          onClose={() => setSelected(null)}
          onNavigate={() => navigate(`/properties/${selected.id}`)}
        />
      )}
    </div>
  )
}

// ── Property pin marker ────────────────────────────────────────────────────────
function PropertyPin({
  property, isSelected, isHovered, onMouseEnter, onMouseLeave,
}: {
  property:     MapProperty
  isSelected:   boolean
  isHovered:    boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const color   = propertyTypeColor(property.propertyType)
  const active  = isSelected || isHovered
  const dotSize = isSelected ? 22 : isHovered ? 18 : 13

  return (
    <div
      className="relative flex flex-col items-center cursor-pointer select-none"
      style={{ transform: 'translateY(0)', zIndex: isSelected ? 30 : isHovered ? 20 : 10 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Price / label bubble */}
      <div
        className="mb-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-mono font-bold transition-all duration-200 pointer-events-none"
        style={{
          background: active ? color : 'rgba(8,17,31,0.9)',
          color: active ? '#04080F' : color,
          border: `1.5px solid ${color}`,
          opacity: active ? 1 : 0,
          transform: active ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(4px)',
          boxShadow: active ? `0 4px 16px ${color}50` : 'none',
          backdropFilter: 'blur(8px)',
          transitionProperty: 'opacity, transform, background, color',
        }}
      >
        {property.lastSalePrice
          ? formatPrice(property.lastSalePrice, true)
          : property.propertyType
        }
      </div>

      {/* Pulse rings (selected only) */}
      {isSelected && (
        <>
          <div
            className="absolute rounded-full animate-ping"
            style={{
              width: 36, height: 36,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              background: `${color}30`,
              animationDuration: '1.4s',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 28, height: 28,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              background: `${color}15`,
            }}
          />
        </>
      )}

      {/* Main dot */}
      <div
        className="rounded-full border-2 border-white transition-all duration-200 relative z-10"
        style={{
          width: dotSize,
          height: dotSize,
          background: color,
          boxShadow: active
            ? `0 0 0 3px ${color}30, 0 4px 12px rgba(0,0,0,0.6), 0 0 20px ${color}50`
            : `0 2px 6px rgba(0,0,0,0.5)`,
        }}
      />

      {/* Pin stem */}
      <div
        className="w-px transition-all duration-200"
        style={{
          height: isSelected ? 10 : 6,
          background: `linear-gradient(to bottom, ${color}, transparent)`,
          marginTop: -1,
        }}
      />
    </div>
  )
}

// ── Origin "you are here" pin ─────────────────────────────────────────────────
function OriginPin({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center">
      {label && (
        <div className="mb-1 px-2 py-0.5 rounded-full text-[10px] font-mono"
          style={{ background: 'rgba(18,200,192,0.9)', color: '#04080F', fontWeight: 600 }}
        >
          {label}
        </div>
      )}
      {/* Crosshair */}
      <div className="relative flex items-center justify-center" style={{ width: 32, height: 32 }}>
        <div className="absolute inset-0 rounded-full border-2 border-teal-bright/40 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="w-3 h-3 rounded-full bg-teal-bright border-2 border-white relative z-10"
          style={{ boxShadow: '0 0 12px rgba(18,200,192,0.8)' }}
        />
        {/* Cross lines */}
        <div className="absolute w-5 h-px bg-teal-bright/60" />
        <div className="absolute h-5 w-px bg-teal-bright/60" />
      </div>
    </div>
  )
}

// ── Selected property slide-up panel ─────────────────────────────────────────
function PropertyPanel({
  property, onClose, onNavigate,
}: {
  property:   MapProperty
  onClose:    () => void
  onNavigate: () => void
}) {
  const color = propertyTypeColor(property.propertyType)

  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-auto"
      style={{
        background: 'rgba(8, 17, 31, 0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: `1px solid ${color}30`,
        animation: 'slideUp 0.25s ease-out',
      }}
    >
      {/* Coloured top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: address + specs */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Type badge */}
              <span
                className="badge text-[10px]"
                style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
              >
                {property.propertyType}
              </span>
              {property.distanceKm != null && (
                <span className="text-[10px] text-teal-bright font-mono">
                  <MapPin size={9} className="inline mr-0.5" />{formatKm(property.distanceKm)}
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-ink-0 leading-snug truncate">
              {property.fullAddress}
            </p>

            <div className="flex items-center gap-3 mt-2 text-xs text-ink-2 font-mono">
              <span className="flex items-center gap-1"><Bed size={11} />{property.bedrooms} bed</span>
              <span className="flex items-center gap-1"><Bath size={11} />{property.bathrooms} bath</span>
              {property.carSpaces != null && property.carSpaces > 0 && (
                <span className="flex items-center gap-1"><Car size={11} />{property.carSpaces}</span>
              )}
              {property.floorAreaSqm && (
                <span>{Math.round(property.floorAreaSqm)} m²</span>
              )}
            </div>
          </div>

          {/* Right: price + actions */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button onClick={onClose} className="text-ink-2 hover:text-ink-0 -mt-1 -mr-1 p-1">
              <X size={15} />
            </button>
            <div className="text-right">
              <p className="text-lg font-mono tabular font-bold" style={{ color: '#E4A53A' }}>
                {property.lastSalePrice ? formatPrice(property.lastSalePrice, true) : '—'}
              </p>
              {property.lastSaleDate && (
                <p className="text-[10px] text-ink-2 font-mono">{formatDate(property.lastSaleDate)}</p>
              )}
            </div>
          </div>
        </div>

        {/* View button */}
        <button
          onClick={onNavigate}
          className="btn btn-teal btn-sm w-full mt-3 justify-center"
        >
          View Full Property <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}
