import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Building2, TrendingUp, DollarSign, MapPin,
  ArrowUpRight, ArrowDownRight, ChevronRight, Loader2,
} from 'lucide-react'
import { propertiesApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatPrice, formatDate, propertyTypeColor, stateColor } from '../lib/utils'
import type { PropertySummaryDto } from '../types'

// ── Mock monthly trend (no aggregate endpoint exists) ─────────────────────────
const MONTHLY_DATA = [
  { month: 'Jul', median: 1_085_000, vol: 312 },
  { month: 'Aug', median: 1_102_000, vol: 298 },
  { month: 'Sep', median: 1_095_000, vol: 331 },
  { month: 'Oct', median: 1_148_000, vol: 356 },
  { month: 'Nov', median: 1_165_000, vol: 318 },
  { month: 'Dec', median: 1_180_000, vol: 289 },
  { month: 'Jan', median: 1_155_000, vol: 243 },
  { month: 'Feb', median: 1_195_000, vol: 267 },
  { month: 'Mar', median: 1_228_000, vol: 341 },
  { month: 'Apr', median: 1_215_000, vol: 305 },
  { month: 'May', median: 1_252_000, vol: 374 },
  { month: 'Jun', median: 1_288_000, vol: 362 },
]

const CHART_COLORS = {
  House:      '#E4A53A',
  Apartment:  '#12C8C0',
  Townhouse:  '#A78BFA',
  Villa:      '#F472B6',
  Land:       '#34D399',
  Studio:     '#60A5FA',
  Commercial: '#FB923C',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-4 py-3 shadow-xl">
      <p className="text-xs text-ink-2 font-mono mb-1">{label}</p>
      <p className="text-sm font-mono text-gold-bright tabular">
        {formatPrice(payload[0]?.value)}
      </p>
      {payload[1] && (
        <p className="text-xs text-ink-2 font-mono tabular">{payload[1].value} sales</p>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  trend?: 'up' | 'down' | 'neutral'
  trendVal?: string
  delay?: number
  color?: string
}

function StatCard({ icon, label, value, sub, trend, trendVal, delay = 0, color = '#12C8C0' }: StatCardProps) {
  return (
    <div
      className="card card-hover p-5 relative overflow-hidden"
      data-stagger={delay}
    >
      {/* bg glow */}
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-xl"
        style={{ background: color }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18`, color }}
          >
            {icon}
          </div>
          {trend && trendVal && (
            <div
              className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full ${
                trend === 'up' ? 'text-emerald-400 bg-emerald-400/10' :
                trend === 'down' ? 'text-red-400 bg-red-400/10' :
                'text-ink-2 bg-ink-2/10'
              }`}
            >
              {trend === 'up'   ? <ArrowUpRight size={11} /> :
               trend === 'down' ? <ArrowDownRight size={11} /> : null}
              {trendVal}
            </div>
          )}
        </div>
        <p className="text-2xl font-mono font-semibold tabular text-ink-0 leading-none">{value}</p>
        <p className="text-xs text-ink-1 mt-1">{label}</p>
        <p className="text-[11px] text-ink-2 font-mono mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [properties, setProperties]     = useState<PropertySummaryDto[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  useEffect(() => {
    propertiesApi.search({ pageSize: 50 })
      .then(r => setProperties(r.items))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // ── Computed metrics ────────────────────────────────────────────────────────
  const withPrice   = properties.filter(p => p.lastSalePrice != null)
  const prices      = withPrice.map(p => p.lastSalePrice!).sort((a, b) => a - b)
  const medianPrice = prices.length
    ? prices[Math.floor(prices.length / 2)]
    : null
  const avgPricePerSqm = (() => {
    const vals = properties.filter(p => p.pricePerSqm != null).map(p => p.pricePerSqm!)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })()

  // Property type breakdown
  const typeMap: Record<string, number> = {}
  for (const p of properties) {
    typeMap[p.propertyType] = (typeMap[p.propertyType] ?? 0) + 1
  }
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }))

  // State distribution
  const stateMap: Record<string, number> = {}
  for (const p of properties) {
    stateMap[p.state] = (stateMap[p.state] ?? 0) + 1
  }
  const stateData = Object.entries(stateMap)
    .sort((a, b) => b[1] - a[1])
    .map(([state, count]) => ({ state, count }))

  // Recent 6 properties
  const recent = [...properties]
    .sort((a, b) => (b.lastSaleDate ?? '').localeCompare(a.lastSaleDate ?? ''))
    .slice(0, 6)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between" data-stagger="0">
        <div>
          <p className="text-xs text-ink-2 font-mono uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h2 className="font-display text-3xl text-ink-0 font-medium leading-tight">
            {greeting},{' '}
            <span className="text-gradient-gold italic">
              {user?.fullName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Analyst'}
            </span>
          </h2>
          <p className="text-sm text-ink-2 mt-1">
            Here is your Australian property market overview.
          </p>
        </div>
        <button
          onClick={() => navigate('/search')}
          className="btn btn-teal btn-sm hidden sm:flex"
        >
          Search Properties <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-28">
              <div className="skeleton h-8 w-8 rounded-xl mb-3" />
              <div className="skeleton h-6 w-24 mb-2" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Building2 size={18} />}
            label="Properties Indexed"
            value={String(properties.length)}
            sub={`${stateData.length} states covered`}
            trend="up"
            trendVal="+3"
            delay={1}
            color="#12C8C0"
          />
          <StatCard
            icon={<DollarSign size={18} />}
            label="Median Sale Price"
            value={medianPrice ? `$${(medianPrice / 1_000_000).toFixed(2)}M` : '—'}
            sub="Last recorded sales"
            trend="up"
            trendVal="+5.2%"
            delay={2}
            color="#E4A53A"
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Avg Price per m²"
            value={avgPricePerSqm ? `$${Math.round(avgPricePerSqm).toLocaleString('en-AU')}` : '—'}
            sub="Across all property types"
            trend="up"
            trendVal="+2.1%"
            delay={3}
            color="#A78BFA"
          />
          <StatCard
            icon={<MapPin size={18} />}
            label="Cities Covered"
            value="6"
            sub="SYD · MEL · BNE · PER · ADL · GC"
            delay={4}
            color="#34D399"
          />
        </div>
      )}

      {error && (
        <div className="card border-red-800/40 bg-red-950/20 p-4 text-sm text-red-400">
          ⚠ {error} — showing mock trend data below.
        </div>
      )}

      {/* ── Charts row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-stagger="3">
        {/* Market trend — area chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-lg text-ink-0 font-medium">Market Trend</h3>
              <p className="text-xs text-ink-2 font-mono">AU median sale price · 12 months</p>
            </div>
            <span className="badge badge-active">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E4A53A" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E4A53A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: '#4A5B78', fontSize: 11, fontFamily: 'DM Mono' }} />
              <YAxis
                tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`}
                tick={{ fill: '#4A5B78', fontSize: 11, fontFamily: 'DM Mono' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="median"
                stroke="#E4A53A"
                strokeWidth={2}
                fill="url(#goldGrad)"
                dot={{ fill: '#E4A53A', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: '#F5C35A' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Property type donut */}
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-display text-lg text-ink-0 font-medium">Property Mix</h3>
            <p className="text-xs text-ink-2 font-mono">by type</p>
          </div>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {typeData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[entry.name as keyof typeof CHART_COLORS] ?? '#8799B8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#101F32', border: '1px solid #1D3450', borderRadius: 8 }}
                  itemStyle={{ color: '#E2EBF9', fontFamily: 'DM Mono', fontSize: 12 }}
                />
                <Legend
                  formatter={(v) => (
                    <span style={{ color: '#8799B8', fontSize: 11, fontFamily: 'DM Mono' }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              {loading
                ? <Loader2 size={24} className="text-ink-2 animate-spin" />
                : <p className="text-ink-2 text-sm">No data</p>
              }
            </div>
          )}
        </div>
      </div>

      {/* ── State distribution + recent ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-stagger="4">
        {/* State distribution */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-ink-0 font-medium mb-1">State Distribution</h3>
          <p className="text-xs text-ink-2 font-mono mb-4">properties indexed</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stateData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="state"
                type="category"
                width={36}
                tick={{ fill: '#8799B8', fontSize: 11, fontFamily: 'DM Mono' }}
              />
              <Tooltip
                contentStyle={{ background: '#101F32', border: '1px solid #1D3450', borderRadius: 8 }}
                itemStyle={{ color: '#E2EBF9', fontFamily: 'DM Mono', fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stateData.map(entry => (
                  <Cell key={entry.state} fill={stateColor(entry.state)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent properties */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg text-ink-0 font-medium">Recent Properties</h3>
              <p className="text-xs text-ink-2 font-mono">latest in the index</p>
            </div>
            <button
              onClick={() => navigate('/search')}
              className="btn btn-ghost btn-sm"
            >
              View all
            </button>
          </div>

          <div className="space-y-2">
            {loading
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <div className="skeleton w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-3/4" />
                      <div className="skeleton h-2.5 w-1/2" />
                    </div>
                    <div className="skeleton h-4 w-20" />
                  </div>
                ))
              : recent.map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/properties/${p.id}`)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg table-row text-left group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: `${propertyTypeColor(p.propertyType)}18`,
                        color: propertyTypeColor(p.propertyType),
                      }}
                    >
                      {p.propertyType[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink-0 truncate group-hover:text-teal-bright transition-colors">
                        {p.fullAddress}
                      </p>
                      <p className="text-xs text-ink-2 font-mono">
                        {p.suburb}, {p.state} · {p.bedrooms}bd {p.bathrooms}ba
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-mono tabular text-gold-bright">
                        {p.lastSalePrice ? `$${(p.lastSalePrice / 1_000_000).toFixed(2)}M` : '—'}
                      </p>
                      <p className="text-[10px] text-ink-2 font-mono">{formatDate(p.lastSaleDate)}</p>
                    </div>
                  </button>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
