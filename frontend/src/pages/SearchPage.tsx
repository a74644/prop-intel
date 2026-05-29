import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, SlidersHorizontal, Grid3X3, List, Map as MapIcon,
  X, ChevronLeft, ChevronRight,
  Bed, Bath, Car, Maximize2, MapPin, Loader2, Building2, Sparkles,
} from 'lucide-react'
import { propertiesApi } from '../lib/api'
import { formatPrice, formatDate, propertyTypeColor, stateColor, AU_STATES, PROPERTY_TYPES, geoLat, geoLon } from '../lib/utils'
import type { PropertySummaryDto, PagedResult, ParsedSearchParams } from '../types'
import PropertyMap, { type MapProperty } from '../components/PropertyMap'

type ViewMode = 'grid' | 'list' | 'map'
type SortKey  = 'price_desc' | 'price_asc' | 'date_desc' | 'beds_desc'

export default function SearchPage() {
  const navigate      = useNavigate()
  const [sp]          = useSearchParams()

  // ── Filter state ────────────────────────────────────────────────────────────
  const [suburb,       setSuburb]       = useState(sp.get('suburb') ?? '')
  const [state,        setState]        = useState(sp.get('state') ?? '')
  const [propertyType, setPropertyType] = useState(sp.get('propertyType') ?? '')
  const [minBedrooms,  setMinBedrooms]  = useState(sp.get('minBedrooms') ?? '')
  const [minPrice,     setMinPrice]     = useState(sp.get('minPrice') ?? '')
  const [maxPrice,     setMaxPrice]     = useState(sp.get('maxPrice') ?? '')

  // ── UI state ────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sort,     setSort]     = useState<SortKey>('date_desc')
  const [page,     setPage]     = useState(1)
  const PAGE_SIZE = 20

  // ── Data state ──────────────────────────────────────────────────────────────
  const [result,  setResult]  = useState<PagedResult<PropertySummaryDto> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // ── AI Search state ──────────────────────────────────────────────────────────
  const [aiMode,    setAiMode]    = useState(false)
  const [aiQuery,   setAiQuery]   = useState('')
  const [aiParsed,  setAiParsed]  = useState<ParsedSearchParams | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const doSearch = useCallback(async (pg = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await propertiesApi.search({
        suburb:      suburb        || undefined,
        state:       state         || undefined,
        propertyType:propertyType  || undefined,
        minBedrooms: minBedrooms   ? Number(minBedrooms)  : undefined,
        minPrice:    minPrice      ? Number(minPrice)     : undefined,
        maxPrice:    maxPrice      ? Number(maxPrice)     : undefined,
        page: pg,
        pageSize: PAGE_SIZE,
      })
      setResult(data)
      setPage(pg)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [suburb, state, propertyType, minBedrooms, minPrice, maxPrice])

  useEffect(() => { doSearch() }, [])  // eslint-disable-line

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); doSearch(1) }

  const doAiSearch = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setError('')
    setAiParsed(null)
    try {
      const data = await propertiesApi.naturalSearch(aiQuery.trim())
      setAiParsed(data.parsed)
      setResult(data.results)
      setPage(1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const clearFilters = () => {
    setSuburb(''); setState(''); setPropertyType('')
    setMinBedrooms(''); setMinPrice(''); setMaxPrice('')
  }

  // ── Sort items client-side ──────────────────────────────────────────────────
  const sorted = [...(result?.items ?? [])].sort((a, b) => {
    switch (sort) {
      case 'price_desc': return (b.lastSalePrice ?? 0) - (a.lastSalePrice ?? 0)
      case 'price_asc':  return (a.lastSalePrice ?? 0) - (b.lastSalePrice ?? 0)
      case 'date_desc':  return (b.lastSaleDate ?? '').localeCompare(a.lastSaleDate ?? '')
      case 'beds_desc':  return b.bedrooms - a.bedrooms
      default:           return 0
    }
  })

  // ── Convert to MapProperty ──────────────────────────────────────────────────
  const mapProperties: MapProperty[] = sorted.map(p => ({
    id:            p.id,
    fullAddress:   p.fullAddress,
    propertyType:  p.propertyType,
    bedrooms:      p.bedrooms,
    bathrooms:     p.bathrooms,
    carSpaces:     p.carSpaces,
    lastSalePrice: p.lastSalePrice,
    lastSaleDate:  p.lastSaleDate,
    lat:           geoLat(p.location),
    lon:           geoLon(p.location),
    floorAreaSqm:  p.floorAreaSqm,
  }))

  const hasFilters = suburb || state || propertyType || minBedrooms || minPrice || maxPrice

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Filter sidebar ──────────────────────────────────────────────────── */}
      <aside className={`flex-shrink-0 border-r border-edge overflow-y-auto bg-void/40 transition-all duration-300 ${
        viewMode === 'map' ? 'w-[220px]' : 'w-[260px]'
      }`}>
        {/* AI / Filters mode toggle */}
        <div className="px-5 pt-5 pb-3 border-b border-edge">
          <div className="flex bg-panel rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => { setAiMode(false); setAiParsed(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors ${
                !aiMode ? 'bg-card text-ink-0 shadow-sm' : 'text-ink-2 hover:text-ink-1'
              }`}
            >
              <SlidersHorizontal size={12} /> Filters
            </button>
            <button
              onClick={() => setAiMode(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors ${
                aiMode ? 'bg-gold/20 text-gold-bright shadow-sm' : 'text-ink-2 hover:text-ink-1'
              }`}
            >
              <Sparkles size={12} /> AI Search
            </button>
          </div>
        </div>

        {aiMode ? (
          /* ── AI Search panel ────────────────────────────────────────────── */
          <div className="p-5 space-y-4">
            <p className="text-xs text-ink-2 leading-relaxed">
              Describe what you're looking for in plain English.
            </p>
            <textarea
              className="input resize-none text-sm leading-relaxed"
              rows={5}
              placeholder={'3 bedroom house in Sydney\nunder $2 million'}
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) doAiSearch() }}
            />
            <p className="text-[10px] text-ink-2 font-mono">⌘↵ to search</p>
            <button
              type="button"
              onClick={doAiSearch}
              disabled={aiLoading || !aiQuery.trim()}
              className="btn btn-gold w-full"
            >
              {aiLoading
                ? <><Loader2 size={14} className="animate-spin" /> Thinking…</>
                : <><Sparkles size={14} /> Search with AI</>}
            </button>
            <div className="pt-2 space-y-1.5">
              {['3BR house in Bondi under $3M', 'Apartment in Melbourne under $600k', '4 bed villa in Perth'].map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setAiQuery(ex)}
                  className="w-full text-left text-xs text-ink-2 hover:text-gold-bright px-3 py-1.5 rounded-lg border border-edge hover:border-gold/40 transition-colors font-mono"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
        <form onSubmit={handleSearch} className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-0">
              <SlidersHorizontal size={15} className="text-teal-bright" />
              Filters
            </div>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-xs text-ink-2 hover:text-ink-0 flex items-center gap-1">
                <X size={12} /> Clear
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs text-ink-2 mb-1.5 font-medium">Suburb</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
              <input className="input pl-9" placeholder="e.g. Bondi" value={suburb} onChange={e => setSuburb(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink-2 mb-1.5 font-medium">State</label>
            <select className="select" value={state} onChange={e => setState(e.target.value)}>
              <option value="">All states</option>
              {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-ink-2 mb-1.5 font-medium">Property type</label>
            <select className="select" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
              <option value="">All types</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-ink-2 mb-1.5 font-medium">Min bedrooms</label>
            <select className="select" value={minBedrooms} onChange={e => setMinBedrooms(e.target.value)}>
              <option value="">Any</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-ink-2 mb-1.5 font-medium">Price range (AUD)</label>
            <div className="space-y-2">
              <input className="input" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} type="number" min={0} />
              <input className="input" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} type="number" min={0} />
            </div>
          </div>

          <button type="submit" className="btn btn-gold w-full" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
        )}
      </aside>

      {/* ── Results area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-edge bg-canvas/90 backdrop-blur-sm flex-shrink-0">
          <div className="text-sm text-ink-2 font-mono flex flex-col gap-1">
            {(loading || aiLoading) ? (
              <span className="flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> {aiLoading ? 'AI thinking…' : 'Searching…'}</span>
            ) : result ? (
              <span>
                <span className="text-ink-0 font-semibold tabular">{result.totalCount}</span>
                {' '}properties{(hasFilters || aiParsed) ? ' matching' : ' indexed'}
              </span>
            ) : null}
            {aiParsed && (
              <span className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-gold-bright text-[10px]">
                  <Sparkles size={10} /> AI interpreted:
                </span>
                {[
                  aiParsed.suburb       && `${aiParsed.suburb}`,
                  aiParsed.state        && aiParsed.state,
                  aiParsed.propertyType && aiParsed.propertyType,
                  aiParsed.minBedrooms  && `${aiParsed.minBedrooms}BR+`,
                  aiParsed.minPrice     && `from $${(aiParsed.minPrice/1e6).toFixed(1)}M`,
                  aiParsed.maxPrice     && `under $${(aiParsed.maxPrice/1e6).toFixed(1)}M`,
                ].filter(Boolean).map((chip, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gold/10 text-gold-bright border border-gold/20">
                    {chip}
                  </span>
                ))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {viewMode !== 'map' && (
              <select
                className="select text-xs py-1.5"
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                style={{ width: 'auto', padding: '6px 32px 6px 10px' }}
              >
                <option value="date_desc">Latest</option>
                <option value="price_desc">Price ↓</option>
                <option value="price_asc">Price ↑</option>
                <option value="beds_desc">Most beds</option>
              </select>
            )}

            {/* View mode toggle */}
            <div className="flex border border-edge rounded-lg overflow-hidden">
              {([
                { mode: 'grid', icon: <Grid3X3 size={14} />,  title: 'Grid view'  },
                { mode: 'list', icon: <List size={14} />,      title: 'List view'  },
                { mode: 'map',  icon: <MapIcon size={14} />,   title: 'Map view'   },
              ] as { mode: ViewMode; icon: React.ReactNode; title: string }[]).map(({ mode, icon, title }, i) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={title}
                  className={`px-3 py-1.5 transition-colors ${i > 0 ? 'border-l border-edge' : ''} ${
                    viewMode === mode
                      ? mode === 'map' ? 'bg-gold/15 text-gold-bright' : 'bg-teal/15 text-teal-bright'
                      : 'text-ink-2 hover:text-ink-1'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="mx-5 mt-4 p-4 card border-red-800/40 bg-red-950/20 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}

        {/* ── Map view ─────────────────────────────────────────────────────── */}
        {viewMode === 'map' && (
          <div className="flex-1 p-4 overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center bg-panel rounded-xl border border-edge">
                <Loader2 size={28} className="text-teal-bright animate-spin" />
              </div>
            ) : mapProperties.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center bg-panel rounded-xl border border-edge gap-3">
                <MapPin size={32} className="text-ink-2" />
                <p className="text-sm text-ink-2">No properties to display on map</p>
              </div>
            ) : (
              <PropertyMap
                properties={mapProperties}
                height="100%"
                showLegend
                fitOnLoad
              />
            )}
          </div>
        )}

        {/* ── Grid / List view ─────────────────────────────────────────────── */}
        {viewMode !== 'map' && (
          <div className="flex-1 overflow-y-auto">
            <div className={`p-5 ${
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                : 'space-y-3'
            }`}>
              {loading
                ? [...Array(9)].map((_, i) => (
                    <div key={i} className="card p-4">
                      <div className="skeleton h-3 w-3/4 mb-3" />
                      <div className="skeleton h-2.5 w-1/2 mb-4" />
                      <div className="flex gap-2 mb-3">
                        {[...Array(3)].map((_, j) => <div key={j} className="skeleton h-6 w-12 rounded-full" />)}
                      </div>
                      <div className="skeleton h-5 w-28" />
                    </div>
                  ))
                : sorted.length === 0
                ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20">
                      <Building2 size={40} className="text-ink-2 mb-4" />
                      <p className="font-display text-xl text-ink-1 font-medium">No properties found</p>
                      <p className="text-sm text-ink-2 mt-1">Try adjusting your filters</p>
                      <button onClick={clearFilters} className="btn btn-ghost btn-sm mt-4">Clear filters</button>
                    </div>
                  )
                : sorted.map(p => (
                    viewMode === 'grid'
                      ? <PropertyGridCard key={p.id} property={p} onClick={() => navigate(`/properties/${p.id}`)} />
                      : <PropertyListRow  key={p.id} property={p} onClick={() => navigate(`/properties/${p.id}`)} />
                  ))
              }
            </div>

            {/* Pagination */}
            {result && result.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-6">
                <button onClick={() => doSearch(page - 1)} disabled={page <= 1 || loading} className="btn btn-ghost btn-sm">
                  <ChevronLeft size={15} /> Prev
                </button>
                <span className="text-sm text-ink-2 font-mono">{page} / {result.totalPages}</span>
                <button onClick={() => doSearch(page + 1)} disabled={page >= result.totalPages || loading} className="btn btn-ghost btn-sm">
                  Next <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Property grid card ─────────────────────────────────────────────────────────
function PropertyGridCard({ property: p, onClick }: { property: PropertySummaryDto; onClick: () => void }) {
  const typeColor = propertyTypeColor(p.propertyType)
  return (
    <button onClick={onClick} className="card card-hover p-5 text-left group w-full">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-0 font-medium leading-snug truncate group-hover:text-teal-bright transition-colors">
            {p.fullAddress}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={11} className="text-ink-2 flex-shrink-0" />
            <span className="text-xs text-ink-2 font-mono">{p.suburb}, {p.state} {p.postcode}</span>
          </div>
        </div>
        <span className="badge flex-shrink-0"
          style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
          {p.propertyType}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-ink-2 font-mono mb-4">
        <span className="flex items-center gap-1"><Bed size={12} />{p.bedrooms}</span>
        <span className="flex items-center gap-1"><Bath size={12} />{p.bathrooms}</span>
        {p.carSpaces > 0 && <span className="flex items-center gap-1"><Car size={12} />{p.carSpaces}</span>}
        {p.floorAreaSqm && <span className="flex items-center gap-1"><Maximize2 size={12} />{Math.round(p.floorAreaSqm)}m²</span>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-mono tabular font-semibold text-gold-bright leading-none">
            {p.lastSalePrice ? formatPrice(p.lastSalePrice, true) : 'Contact Agent'}
          </p>
          {p.pricePerSqm && (
            <p className="text-[11px] text-ink-2 font-mono mt-0.5">${Math.round(p.pricePerSqm).toLocaleString()}/m²</p>
          )}
        </div>
        {p.lastSaleDate && <p className="text-[11px] text-ink-2 font-mono">{formatDate(p.lastSaleDate)}</p>}
      </div>
    </button>
  )
}

function PropertyListRow({ property: p, onClick }: { property: PropertySummaryDto; onClick: () => void }) {
  const typeColor = propertyTypeColor(p.propertyType)
  return (
    <button onClick={onClick} className="card card-hover w-full px-5 py-4 text-left flex items-center gap-4 group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: `${typeColor}18`, color: typeColor }}>
        {p.propertyType[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink-0 font-medium group-hover:text-teal-bright transition-colors truncate">{p.fullAddress}</p>
        <p className="text-xs text-ink-2 font-mono mt-0.5">
          {p.suburb}, {p.state} · {p.bedrooms}bd {p.bathrooms}ba{p.floorAreaSqm ? ` · ${Math.round(p.floorAreaSqm)}m²` : ''}
        </p>
      </div>
      <span className="badge flex-shrink-0 hidden sm:flex"
        style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
        {p.propertyType}
      </span>
      <div className="text-right flex-shrink-0">
        <p className="font-mono tabular text-gold-bright font-semibold">
          {p.lastSalePrice ? formatPrice(p.lastSalePrice, true) : '—'}
        </p>
        <p className="text-[11px] text-ink-2 font-mono">{formatDate(p.lastSaleDate)}</p>
      </div>
    </button>
  )
}
