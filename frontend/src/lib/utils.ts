import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// ── Currency formatting ───────────────────────────────────────────────────────
export function formatPrice(value: number | null | undefined, compact = false): string {
  if (value == null) return 'Contact Agent'
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}k`
    return `$${value.toFixed(0)}`
  }
  return new Intl.NumberFormat('en-AU', {
    style:    'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value)
}

// ── Date formatting ───────────────────────────────────────────────────────────
export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const ms   = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}yr ago`
}

// ── Number formatting ─────────────────────────────────────────────────────────
export function formatArea(sqm: number | null | undefined): string {
  if (sqm == null) return '—'
  return `${sqm.toLocaleString('en-AU')} m²`
}

export function formatPct(val: number | null | undefined): string {
  if (val == null) return '—'
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(1)}%`
}

export function formatKm(val: number): string {
  return val < 1 ? `${(val * 1000).toFixed(0)} m` : `${val.toFixed(1)} km`
}

// ── Confidence badge styles ───────────────────────────────────────────────────
export function confidenceConfig(level: string) {
  switch (level) {
    case 'High':              return { color: '#2BB068', bg: 'rgba(43,176,104,0.12)',  label: 'High Confidence',   pct: 95 }
    case 'Medium':            return { color: '#E4A53A', bg: 'rgba(228,165,58,0.12)', label: 'Medium Confidence', pct: 60 }
    case 'Low':               return { color: '#E05050', bg: 'rgba(224,80,80,0.12)',  label: 'Low Confidence',    pct: 30 }
    case 'Insufficient Data': return { color: '#4A5B78', bg: 'rgba(74,91,120,0.12)', label: 'Insufficient Data', pct: 5  }
    default:                  return { color: '#4A5B78', bg: 'rgba(74,91,120,0.12)', label: level,               pct: 0  }
  }
}

// ── Property type colour map ──────────────────────────────────────────────────
export function propertyTypeColor(type: string): string {
  const map: Record<string, string> = {
    House:      '#E4A53A',
    Apartment:  '#12C8C0',
    Townhouse:  '#A78BFA',
    Villa:      '#F472B6',
    Land:       '#34D399',
    Studio:     '#60A5FA',
    Commercial: '#FB923C',
  }
  return map[type] ?? '#8799B8'
}

// ── State badge colour ────────────────────────────────────────────────────────
export function stateColor(state: string): string {
  const map: Record<string, string> = {
    NSW: '#12C8C0',
    VIC: '#E4A53A',
    QLD: '#F59E0B',
    WA:  '#A78BFA',
    SA:  '#F472B6',
    TAS: '#60A5FA',
    ACT: '#34D399',
    NT:  '#FB923C',
  }
  return map[state] ?? '#8799B8'
}

// ── Constants ─────────────────────────────────────────────────────────────────
export const AU_STATES    = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
export const PROPERTY_TYPES = ['House', 'Apartment', 'Townhouse', 'Villa', 'Land', 'Studio', 'Commercial']
export const SALE_METHODS   = ['Auction', 'PrivateTreaty', 'OffMarket', 'Tender', 'SetDateSale']

// GeoJSON helpers (GeoJSON: [lon, lat], UI: lat then lon)
export const geoLat = (pt: { coordinates: [number, number] }): number => pt.coordinates[1]
export const geoLon = (pt: { coordinates: [number, number] }): number => pt.coordinates[0]
