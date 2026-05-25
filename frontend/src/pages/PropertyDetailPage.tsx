import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  ArrowLeft, Bed, Bath, Car, Maximize2, MapPin, Calendar, Home,
  TrendingUp, Loader2, AlertCircle, ChevronRight, Building2,
  Hash, Layers,
} from 'lucide-react'
import { propertiesApi } from '../lib/api'
import { formatPrice, formatDate, formatArea, propertyTypeColor, confidenceConfig, geoLat, geoLon } from '../lib/utils'
import type { PropertyDetailDto, ValuationDto, NearbyPropertyDto } from '../types'
import PropertyMap, { type MapProperty } from '../components/PropertyMap'

export default function PropertyDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const [property, setProperty]   = useState<PropertyDetailDto | null>(null)
  const [valuation, setValuation] = useState<ValuationDto | null>(null)
  const [nearby, setNearby]       = useState<NearbyPropertyDto[]>([])
  const [loading, setLoading]     = useState(true)
  const [valLoading, setValLoading] = useState(true)
  const [error,   setError]       = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)

    propertiesApi.getById(id)
      .then(p => {
        setProperty(p)
        setLoading(false)
        // Fetch valuation + nearby in parallel after we have the property
        Promise.all([
          propertiesApi.getValuation(id).catch(() => null),
          propertiesApi.nearbyById(id, 3, 6).catch(() => []),
        ]).then(([val, near]) => {
          setValuation(val)
          setNearby(near as NearbyPropertyDto[])
        }).finally(() => setValLoading(false))
      })
      .catch(e => { setError(e.message); setLoading(false); setValLoading(false) })
  }, [id])

  if (loading) return <LoadingShell />
  if (error)   return <ErrorState msg={error} onBack={() => navigate(-1)} />
  if (!property) return null

  const typeColor = propertyTypeColor(property.propertyType)
  const salesHistory = [...(property.salesHistory ?? [])].sort(
    (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
  )

  return (
    <div className="p-6 max-w-[1300px] mx-auto space-y-6">
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-ink-2" data-stagger="0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 hover:text-ink-0 transition-colors">
          <ArrowLeft size={13} /> Back
        </button>
        <ChevronRight size={11} />
        <span className="hover:text-ink-0 cursor-pointer" onClick={() => navigate('/search')}>Search</span>
        <ChevronRight size={11} />
        <span className="text-ink-0 truncate max-w-[200px]">{property.suburb}</span>
      </div>

      {/* ── Property header ───────────────────────────────────────────────── */}
      <div className="card p-6" data-stagger="1">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                style={{ background: `${typeColor}18`, color: typeColor }}
              >
                <Home size={18} />
              </div>
              <span
                className="badge"
                style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}
              >
                {property.propertyType}
              </span>
            </div>
            <h2 className="font-display text-2xl lg:text-3xl text-ink-0 font-medium leading-tight">
              {property.fullAddress}
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <MapPin size={13} className="text-ink-2" />
              <span className="text-sm text-ink-2 font-mono">
                {property.suburb}, {property.state} {property.postcode}
              </span>
            </div>
          </div>

          {/* Key stats chips */}
          <div className="flex flex-wrap gap-2">
            <Chip icon={<Bed size={13} />}      label={`${property.bedrooms} bed`} />
            <Chip icon={<Bath size={13} />}     label={`${property.bathrooms} bath`} />
            {property.carSpaces > 0 && <Chip icon={<Car size={13} />} label={`${property.carSpaces} car`} />}
            {property.floorAreaSqm && <Chip icon={<Maximize2 size={13} />} label={formatArea(property.floorAreaSqm)} />}
            {property.landAreaSqm  && <Chip icon={<Layers size={13} />}    label={`Land ${formatArea(property.landAreaSqm)}`} />}
          </div>
        </div>

        {/* Meta row */}
        <div className="divider-gold my-4" />
        <div className="flex flex-wrap gap-6 text-xs text-ink-2 font-mono">
          {property.lotNumber  && <span><Hash size={11} className="inline mr-1" />Lot {property.lotNumber}</span>}
          {property.planNumber && <span>Plan {property.planNumber}</span>}
          <span className="flex items-center gap-1">
            <Calendar size={11} />Indexed {formatDate(property.createdAt)}
          </span>
          <span className="text-ink-3">ID: {property.id.slice(0, 8)}…</span>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Sales history + Listings ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales history */}
          <div className="card p-5" data-stagger="2">
            <h3 className="font-display text-xl text-ink-0 font-medium mb-1">Sales History</h3>
            <p className="text-xs text-ink-2 font-mono mb-5">
              {salesHistory.length} recorded transaction{salesHistory.length !== 1 ? 's' : ''}
            </p>

            {salesHistory.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Building2 size={32} className="text-ink-2 mb-3" />
                <p className="text-sm text-ink-2">No sales history recorded</p>
              </div>
            ) : (
              <>
                {/* Mini chart */}
                {salesHistory.length >= 2 && (
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart
                        data={[...salesHistory].reverse().map(s => ({
                          date: formatDate(s.saleDate, { year: '2-digit', month: 'short' }),
                          price: s.price,
                        }))}
                        margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fill: '#4A5B78', fontSize: 10, fontFamily: 'DM Mono' }} />
                        <YAxis
                          tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`}
                          tick={{ fill: '#4A5B78', fontSize: 10, fontFamily: 'DM Mono' }}
                        />
                        <Tooltip
                          formatter={(v: number) => [formatPrice(v), 'Sale price']}
                          contentStyle={{ background: '#101F32', border: '1px solid #1D3450', borderRadius: 8 }}
                          itemStyle={{ color: '#E4A53A', fontFamily: 'DM Mono', fontSize: 12 }}
                        />
                        <Bar dataKey="price" fill="#E4A53A" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Timeline */}
                <div className="relative">
                  {/* vertical line */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-px bg-edge" />

                  <div className="space-y-4">
                    {salesHistory.map((sale, idx) => (
                      <div key={sale.id} className="flex gap-4 relative">
                        {/* Dot */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                            idx === 0 ? 'bg-gold/20 border-2 border-gold' : 'bg-panel border border-edge'
                          }`}
                        >
                          <TrendingUp size={14} className={idx === 0 ? 'text-gold-bright' : 'text-ink-2'} />
                        </div>

                        {/* Content */}
                        <div className="card p-4 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-lg font-mono tabular font-semibold text-gold-bright">
                                {formatPrice(sale.price)}
                              </p>
                              <div className="flex flex-wrap gap-3 mt-1">
                                <span className="text-xs text-ink-2 font-mono flex items-center gap-1">
                                  <Calendar size={11} />{formatDate(sale.saleDate)}
                                </span>
                                <span className="badge badge-active text-[10px]">{sale.saleMethod}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              {sale.pricePerSqm && (
                                <p className="text-xs font-mono text-ink-1">
                                  ${Math.round(sale.pricePerSqm).toLocaleString()}/m²
                                </p>
                              )}
                              {sale.daysOnMarket != null && (
                                <p className="text-xs text-ink-2 font-mono">{sale.daysOnMarket}d on market</p>
                              )}
                            </div>
                          </div>
                          {(sale.agencyName || sale.agentName) && (
                            <p className="text-xs text-ink-2 mt-2">
                              {sale.agencyName}{sale.agentName ? ` · ${sale.agentName}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Active listings */}
          {property.activeListings?.length > 0 && (
            <div className="card p-5" data-stagger="3">
              <h3 className="font-display text-xl text-ink-0 font-medium mb-4">Active Listings</h3>
              <div className="space-y-3">
                {property.activeListings.map(listing => (
                  <div key={listing.id} className="p-4 bg-panel rounded-xl border border-edge">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-mono tabular font-semibold text-ink-0">
                          {listing.priceText || (listing.advertisedPrice ? formatPrice(listing.advertisedPrice) : 'Contact Agent')}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <ListingBadge status={listing.status} />
                          <span className="badge badge-withdrawn">{listing.listingType}</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-ink-2 font-mono">
                        <p>{formatDate(listing.listedAt)}</p>
                        {listing.daysOnMarket != null && <p>{listing.daysOnMarket}d listed</p>}
                      </div>
                    </div>
                    {listing.description && (
                      <p className="text-xs text-ink-2 mt-3 line-clamp-2">{listing.description}</p>
                    )}
                    <p className="text-xs text-ink-2 mt-2">
                      {listing.agencyName} · {listing.agentName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ──────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* AVM Valuation widget */}
          <div className="card p-5" data-stagger="2">
            <h3 className="font-display text-xl text-ink-0 font-medium mb-1">Valuation</h3>
            <p className="text-xs text-ink-2 font-mono mb-4">Automated Valuation Model</p>

            {valLoading ? (
              <div className="flex flex-col items-center py-6">
                <Loader2 size={24} className="text-teal-bright animate-spin mb-3" />
                <p className="text-xs text-ink-2">Computing AVM…</p>
              </div>
            ) : valuation ? (
              <ValuationWidget valuation={valuation} />
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <AlertCircle size={24} className="text-ink-2 mb-2" />
                <p className="text-xs text-ink-2">Valuation unavailable</p>
                <p className="text-[11px] text-ink-3 mt-1">Requires floor area data</p>
              </div>
            )}
          </div>

          {/* Nearby properties */}
          <div className="card p-5" data-stagger="3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-xl text-ink-0 font-medium">Nearby</h3>
                <p className="text-xs text-ink-2 font-mono">within 3 km</p>
              </div>
              <button onClick={() => navigate('/nearby')} className="btn btn-ghost btn-sm text-xs">
                Explore
              </button>
            </div>

            {valLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="skeleton w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-full" />
                      <div className="skeleton h-2.5 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : nearby.length === 0 ? (
              <p className="text-sm text-ink-2 text-center py-4">No nearby properties found</p>
            ) : (
              <div className="space-y-3">
                {nearby.map(n => (
                  <button
                    key={n.id}
                    onClick={() => navigate(`/properties/${n.id}`)}
                    className="w-full flex gap-3 p-2.5 rounded-lg hover:bg-lift/40 transition-colors text-left group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: `${propertyTypeColor(n.propertyType)}18`,
                        color: propertyTypeColor(n.propertyType),
                      }}
                    >
                      {n.propertyType[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink-0 truncate group-hover:text-teal-bright transition-colors">
                        {n.fullAddress}
                      </p>
                      <p className="text-[11px] text-ink-2 font-mono">
                        {n.bedrooms}bd · {(n.distanceKm * 1000).toFixed(0)}m away
                      </p>
                    </div>
                    <p className="text-xs font-mono tabular text-gold-bright flex-shrink-0">
                      {n.lastSalePrice ? `$${(n.lastSalePrice / 1_000_000).toFixed(2)}M` : '—'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location mini map */}
          <div className="card overflow-hidden" data-stagger="4">
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div>
                <h3 className="font-display text-base text-ink-0 font-medium">Location</h3>
                <p className="text-[11px] font-mono text-ink-2 mt-0.5 tabular">
                  {geoLat(property.location).toFixed(5)}, {geoLon(property.location).toFixed(5)}
                </p>
              </div>
              <button
                onClick={() => navigate(`/nearby?lat=${geoLat(property.location)}&lon=${geoLon(property.location)}`)}
                className="btn btn-ghost btn-sm text-xs"
              >
                <MapPin size={12} /> Nearby
              </button>
            </div>

            {/* Map — shows this property + nearby as context */}
            <PropertyMap
              properties={[
                {
                  id:            property.id,
                  fullAddress:   property.fullAddress,
                  propertyType:  property.propertyType,
                  bedrooms:      property.bedrooms,
                  bathrooms:     property.bathrooms,
                  carSpaces:     property.carSpaces,
                  lastSalePrice: property.salesHistory?.[0]?.price ?? null,
                  lastSaleDate:  property.salesHistory?.[0]?.saleDate ?? null,
                  lat:           geoLat(property.location),
                  lon:           geoLon(property.location),
                  floorAreaSqm:  property.floorAreaSqm,
                },
                ...nearby.map((n): MapProperty => ({
                  id:            n.id,
                  fullAddress:   n.fullAddress,
                  propertyType:  n.propertyType,
                  bedrooms:      n.bedrooms,
                  bathrooms:     n.bathrooms,
                  lastSalePrice: n.lastSalePrice,
                  lastSaleDate:  n.lastSaleDate,
                  lat:           geoLat(n.location),
                  lon:           geoLon(n.location),
                  distanceKm:    n.distanceKm,
                })),
              ]}
              height="260px"
              highlightId={property.id}
              showLegend={false}
              fitOnLoad
              initialZoom={14}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-panel rounded-full border border-edge text-xs text-ink-1 font-mono">
      <span className="text-ink-2">{icon}</span>{label}
    </span>
  )
}

function ListingBadge({ status }: { status: string }) {
  const cls = {
    Active:     'badge-active',
    UnderOffer: 'badge-underoffer',
    Sold:       'badge-sold',
    Withdrawn:  'badge-withdrawn',
  }[status] ?? 'badge-withdrawn'
  return <span className={`badge ${cls}`}>{status}</span>
}

function ValuationWidget({ valuation: v }: { valuation: ValuationDto }) {
  const cfg   = confidenceConfig(v.confidenceLevel)
  const r     = 46
  const circ  = 2 * Math.PI * r
  const dash  = (cfg.pct / 100) * circ

  return (
    <div className="space-y-4">
      {/* Gauge */}
      <div className="flex flex-col items-center py-2">
        <div className="relative">
          <svg width="112" height="112" viewBox="0 0 112 112">
            {/* Track */}
            <circle cx="56" cy="56" r={r} fill="none" stroke="#1D3450" strokeWidth="8" />
            {/* Fill */}
            <circle
              cx="56" cy="56" r={r}
              fill="none"
              stroke={cfg.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 56 56)"
              style={{ filter: `drop-shadow(0 0 6px ${cfg.color}60)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[10px] text-ink-2 font-mono">CONF.</p>
            <p className="text-base font-bold" style={{ color: cfg.color }}>{cfg.pct}%</p>
          </div>
        </div>
        <span
          className="badge mt-2"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Estimates */}
      {v.estimatedValue && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-xs text-ink-2 font-mono mb-0.5">Estimated Value</p>
            <p className="text-2xl font-mono tabular font-semibold text-ink-0">
              {formatPrice(v.estimatedValue, true)}
            </p>
          </div>

          {(v.lowEstimate || v.highEstimate) && (
            <div className="flex justify-between text-xs font-mono text-ink-2 bg-panel rounded-lg px-3 py-2 border border-edge">
              <span>Low: <span className="text-ink-1">{v.lowEstimate ? formatPrice(v.lowEstimate, true) : '—'}</span></span>
              <span>High: <span className="text-ink-1">{v.highEstimate ? formatPrice(v.highEstimate, true) : '—'}</span></span>
            </div>
          )}

          <div className="space-y-1.5 text-[11px] font-mono text-ink-2">
            <div className="flex justify-between">
              <span>Comparables</span>
              <span className="text-ink-1">{v.comparableCount} sales</span>
            </div>
            <div className="flex justify-between">
              <span>Search radius</span>
              <span className="text-ink-1">{v.searchRadiusKm} km</span>
            </div>
            <div className="flex justify-between">
              <span>Valued on</span>
              <span className="text-ink-1">{formatDate(v.valuationDate)}</span>
            </div>
          </div>
        </div>
      )}

      {!v.estimatedValue && (
        <p className="text-xs text-ink-2 text-center">
          Insufficient comparable data to produce an estimate.
        </p>
      )}
    </div>
  )
}

function LoadingShell() {
  return (
    <div className="p-6 space-y-4 max-w-[1300px] mx-auto">
      <div className="skeleton h-4 w-32" />
      <div className="card p-6">
        <div className="skeleton h-8 w-2/3 mb-3" />
        <div className="skeleton h-4 w-1/3" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-5 h-64"><div className="skeleton h-full" /></div>
        <div className="card p-5 h-64"><div className="skeleton h-full" /></div>
      </div>
    </div>
  )
}

function ErrorState({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <AlertCircle size={40} className="text-red-400" />
      <div>
        <p className="font-display text-xl text-ink-1 font-medium">Property not found</p>
        <p className="text-sm text-ink-2 mt-1">{msg}</p>
      </div>
      <button onClick={onBack} className="btn btn-ghost btn-sm">
        <ArrowLeft size={14} /> Go back
      </button>
    </div>
  )
}
