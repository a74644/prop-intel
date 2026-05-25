import { useState, FormEvent } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import {
  Search, TrendingUp, TrendingDown, Minus,
  BarChart2, Home, Clock, Loader2, AlertCircle,
} from 'lucide-react'
import { suburbsApi } from '../lib/api'
import { formatPrice, formatPct, AU_STATES, stateColor, propertyTypeColor } from '../lib/utils'
import type { SuburbStatisticsDto } from '../types'

const NOTABLE_SUBURBS = [
  { suburb: 'Bondi',    state: 'NSW' },
  { suburb: 'Fitzroy',  state: 'VIC' },
  { suburb: 'Paddington', state: 'NSW' },
  { suburb: 'Richmond', state: 'VIC' },
  { suburb: 'Teneriffe', state: 'QLD' },
]

export default function SuburbAnalyticsPage() {
  const [suburb, setSuburb] = useState('')
  const [state,  setState]  = useState('')
  const [data,   setData]   = useState<SuburbStatisticsDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault()
    if (!suburb.trim() || !state) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await suburbsApi.getStatistics(suburb.trim(), state)
      setData(res)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadQuick(s: string, st: string) {
    setSuburb(s)
    setState(st)
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await suburbsApi.getStatistics(s, st)
      setData(res)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Derived chart data ──────────────────────────────────────────────────────
  const typeData = data
    ? Object.entries(data.medianByPropertyType)
        .filter(([, v]) => v != null)
        .map(([name, value]) => ({ name, value: value! }))
        .sort((a, b) => b.value - a.value)
    : []

  const growthTrend = data ? [
    { label: '24m median', value: data.medianSalePrice24Months ?? 0 },
    { label: '12m median', value: data.medianSalePrice12Months ?? 0 },
  ] : []

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <div className="card p-5" data-stagger="0">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
            <input
              className="input pl-9"
              placeholder="Suburb name (e.g. Bondi, Fitzroy, Teneriffe)"
              value={suburb}
              onChange={e => setSuburb(e.target.value)}
              required
            />
          </div>
          <select
            className="select sm:w-36"
            value={state}
            onChange={e => setState(e.target.value)}
            required
          >
            <option value="">State *</option>
            {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="btn btn-gold" disabled={loading || !suburb || !state}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <BarChart2 size={15} />}
            Analyse
          </button>
        </form>

        {/* Quick pick */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs text-ink-2 font-mono self-center">Quick:</span>
          {NOTABLE_SUBURBS.map(n => (
            <button
              key={`${n.suburb}-${n.state}`}
              onClick={() => loadQuick(n.suburb, n.state)}
              className="btn btn-ghost btn-sm text-xs py-1 px-3"
            >
              {n.suburb}, {n.state}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-teal/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={28} className="text-teal-bright animate-spin" />
            </div>
          </div>
          <p className="text-sm text-ink-2 font-mono">Analysing {suburb}, {state}…</p>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="card border-red-800/40 bg-red-950/20 p-5 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-400 font-medium">No data found</p>
            <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && !error && !data && (
        <div className="card p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center mb-4">
            <BarChart2 size={28} className="text-teal-bright" />
          </div>
          <h3 className="font-display text-xl text-ink-0 font-medium mb-1">Suburb Intelligence</h3>
          <p className="text-sm text-ink-2 max-w-sm">
            Enter a suburb and state to see median prices, auction clearance rates, days on market, and property type breakdown.
          </p>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {data && !loading && (
        <>
          {/* Header */}
          <div className="flex items-end justify-between" data-stagger="0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: stateColor(data.state) }}
                />
                <span className="text-xs text-ink-2 font-mono tracking-widest uppercase">{data.state}</span>
              </div>
              <h2 className="font-display text-3xl text-ink-0 font-medium">
                {data.suburb}
                <span className="text-ink-2 text-xl ml-2">{data.postcode}</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-2 font-mono">12-month sales</p>
              <p className="text-2xl font-mono tabular font-semibold text-ink-0">
                {data.salesCount12Months}
              </p>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-stagger="1">
            <KpiCard
              label="Median Price (12m)"
              value={data.medianSalePrice12Months ? formatPrice(data.medianSalePrice12Months, true) : '—'}
              sub={data.medianSalePrice24Months ? `24m: ${formatPrice(data.medianSalePrice24Months, true)}` : 'Insufficient data'}
              icon={<Home size={16} />}
              color="#E4A53A"
            />
            <KpiCard
              label="Annual Growth"
              value={formatPct(data.annualGrowthPct)}
              sub="Year-on-year"
              icon={data.annualGrowthPct != null && data.annualGrowthPct >= 0
                ? <TrendingUp size={16} />
                : <TrendingDown size={16} />
              }
              color={data.annualGrowthPct != null && data.annualGrowthPct >= 0 ? '#2BB068' : '#E05050'}
            />
            <KpiCard
              label="Median Days on Market"
              value={data.medianDaysOnMarket != null ? `${data.medianDaysOnMarket.toFixed(0)} days` : '—'}
              sub="Listing to contract"
              icon={<Clock size={16} />}
              color="#12C8C0"
            />
            <KpiCard
              label="Auction Clearance"
              value={data.auctionClearanceRate12Months != null
                ? `${(data.auctionClearanceRate12Months * 100).toFixed(0)}%`
                : '—'
              }
              sub="Past 12 months"
              icon={<Minus size={16} />}
              color="#A78BFA"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" data-stagger="2">
            {/* Median by type bar chart */}
            <div className="card p-5">
              <h3 className="font-display text-lg text-ink-0 font-medium mb-1">Price by Property Type</h3>
              <p className="text-xs text-ink-2 font-mono mb-4">median sale price</p>
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={typeData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#4A5B78', fontSize: 11, fontFamily: 'DM Mono' }}
                    />
                    <YAxis
                      tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`}
                      tick={{ fill: '#4A5B78', fontSize: 11, fontFamily: 'DM Mono' }}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatPrice(v), 'Median']}
                      contentStyle={{ background: '#101F32', border: '1px solid #1D3450', borderRadius: 8 }}
                      itemStyle={{ color: '#E4A53A', fontFamily: 'DM Mono', fontSize: 12 }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {typeData.map(entry => (
                        <Cell key={entry.name} fill={propertyTypeColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center">
                  <p className="text-sm text-ink-2">No property type data available</p>
                </div>
              )}
            </div>

            {/* 12m vs 24m + clearance donut */}
            <div className="card p-5">
              <h3 className="font-display text-lg text-ink-0 font-medium mb-1">Price Trend Comparison</h3>
              <p className="text-xs text-ink-2 font-mono mb-4">12m vs 24m median</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={growthTrend} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: '#4A5B78', fontSize: 11, fontFamily: 'DM Mono' }} />
                  <YAxis
                    tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`}
                    tick={{ fill: '#4A5B78', fontSize: 11, fontFamily: 'DM Mono' }}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatPrice(v), 'Median price']}
                    contentStyle={{ background: '#101F32', border: '1px solid #1D3450', borderRadius: 8 }}
                    itemStyle={{ color: '#12C8C0', fontFamily: 'DM Mono', fontSize: 12 }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="value" fill="#12C8C0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary table */}
          <div className="card p-5" data-stagger="3">
            <h3 className="font-display text-lg text-ink-0 font-medium mb-4">Summary Statistics</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: 'Suburb',            value: data.suburb },
                { label: 'State',             value: data.state },
                { label: 'Postcode',          value: data.postcode },
                { label: 'Sales (12m)',        value: String(data.salesCount12Months) },
                { label: 'Median Price (12m)', value: data.medianSalePrice12Months ? formatPrice(data.medianSalePrice12Months) : '—' },
                { label: 'Median Price (24m)', value: data.medianSalePrice24Months ? formatPrice(data.medianSalePrice24Months) : '—' },
                { label: 'Annual Growth',      value: formatPct(data.annualGrowthPct) },
                { label: 'Days on Market',     value: data.medianDaysOnMarket != null ? `${data.medianDaysOnMarket.toFixed(1)} days` : '—' },
                { label: 'Price / m²',        value: data.medianPricePerSqm ? formatPrice(data.medianPricePerSqm) : '—' },
              ].map(row => (
                <div key={row.label} className="bg-panel rounded-xl p-4 border border-edge">
                  <p className="text-[11px] text-ink-2 font-mono uppercase tracking-wide">{row.label}</p>
                  <p className="text-sm font-mono tabular text-ink-0 font-medium mt-1">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10 blur-xl"
        style={{ background: color }}
      />
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>
      <p className="text-[11px] text-ink-2 font-mono uppercase tracking-wide">{label}</p>
      <p className="text-xl font-mono tabular font-semibold mt-0.5" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px] text-ink-2 font-mono mt-0.5">{sub}</p>
    </div>
  )
}
