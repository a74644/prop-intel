import type {
  AuthResultDto,
  PropertySummaryDto,
  PropertyDetailDto,
  SalesHistoryDto,
  ValuationDto,
  NearbyPropertyDto,
  SuburbStatisticsDto,
  ListingDto,
  PagedResult,
  SearchParams,
  CreatePropertyRequest,
  RecordSaleRequest,
  NaturalSearchResult,
} from '../types'

const BASE = '/api'

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('propintel_token')
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    localStorage.removeItem('propintel_token')
    localStorage.removeItem('propintel_user')
    window.dispatchEvent(new Event('propintel:logout'))
    throw new ApiError(401, 'Unauthorized — please log in again.')
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      msg = body?.error ?? body?.title ?? body?.message ?? msg
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    http<AuthResultDto>('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, firstName: string, lastName: string) =>
    http<AuthResultDto>('/auth/register', {
      method: 'POST',
      body:   JSON.stringify({ email, password, firstName, lastName }),
    }),
}

// ── Properties ────────────────────────────────────────────────────────────────

export const propertiesApi = {
  getById: (id: string) =>
    http<PropertyDetailDto>(`/properties/${id}`),

  search: (params: SearchParams = {}) =>
    http<PagedResult<PropertySummaryDto>>(`/properties/search${qs({
      suburb:      params.suburb,
      state:       params.state,
      postcode:    params.postcode,
      propertyType:params.propertyType,
      minBedrooms: params.minBedrooms,
      maxBedrooms: params.maxBedrooms,
      minPrice:    params.minPrice,
      maxPrice:    params.maxPrice,
      page:        params.page ?? 1,
      pageSize:    params.pageSize ?? 20,
    })}`),

  nearbyByCoord: (latitude: number, longitude: number, radiusKm = 2, maxResults = 20) =>
    http<NearbyPropertyDto[]>(`/properties/nearby${qs({ latitude, longitude, radiusKm, maxResults })}`),

  nearbyById: (id: string, radiusKm = 2, maxResults = 10) =>
    http<NearbyPropertyDto[]>(`/properties/${id}/nearby${qs({ radiusKm, maxResults })}`),

  getValuation: (id: string) =>
    http<ValuationDto>(`/properties/${id}/valuation`),

  create: (data: CreatePropertyRequest) =>
    http<PropertyDetailDto>('/properties', {
      method: 'POST',
      body:   JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreatePropertyRequest>) =>
    http<PropertyDetailDto>(`/properties/${id}`, {
      method: 'PUT',
      body:   JSON.stringify(data),
    }),

  delete: (id: string) =>
    http<void>(`/properties/${id}`, { method: 'DELETE' }),

  recordSale: (id: string, data: RecordSaleRequest) =>
    http<SalesHistoryDto>(`/properties/${id}/sales`, {
      method: 'POST',
      body:   JSON.stringify(data),
    }),

  naturalSearch: (query: string, pageSize = 20) =>
    http<NaturalSearchResult>('/properties/search/natural', {
      method: 'POST',
      body:   JSON.stringify({ query, pageSize }),
    }),
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export const salesApi = {
  getByProperty: (propertyId: string, page = 1, pageSize = 50) =>
    http<PagedResult<SalesHistoryDto>>(`/sales${qs({ propertyId, page, pageSize })}`),

  getBySuburb: (suburb: string, state: string, page = 1, pageSize = 50) =>
    http<PagedResult<SalesHistoryDto>>(`/sales${qs({ suburb, state, page, pageSize })}`),
}

// ── Listings ──────────────────────────────────────────────────────────────────

export const listingsApi = {
  create: (data: Omit<ListingDto, 'id' | 'fullAddress' | 'status' | 'listedAt' | 'daysOnMarket'>) =>
    http<ListingDto>('/listings', {
      method: 'POST',
      body:   JSON.stringify(data),
    }),
}

// ── Suburbs ───────────────────────────────────────────────────────────────────

export const suburbsApi = {
  getStatistics: (suburb: string, state: string) =>
    http<SuburbStatisticsDto>(`/suburbs/${encodeURIComponent(suburb)}/statistics${qs({ state })}`),
}
