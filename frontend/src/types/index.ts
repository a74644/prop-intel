// ── GeoJSON ───────────────────────────────────────────────────────────────────
export interface GeoJsonPoint {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude] — GeoJSON standard
}

// ── Enums ─────────────────────────────────────────────────────────────────────
export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT'
export type PropertyType = 'House' | 'Apartment' | 'Townhouse' | 'Villa' | 'Land' | 'Studio' | 'Commercial'
export type ListingType = 'ForSale' | 'ForRent' | 'Auction'
export type SaleMethod = 'Auction' | 'PrivateTreaty' | 'OffMarket' | 'Tender' | 'SetDateSale'
export type ConfidenceLevel = 'High' | 'Medium' | 'Low' | 'Insufficient Data'

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthResultDto {
  token: string
  expiresAt: string
  email: string
  fullName: string
  role: string
}

// ── Property ──────────────────────────────────────────────────────────────────
export interface PropertySummaryDto {
  id: string
  fullAddress: string
  suburb: string
  state: string
  postcode: string
  location: GeoJsonPoint
  propertyType: string
  bedrooms: number
  bathrooms: number
  carSpaces: number
  landAreaSqm: number | null
  floorAreaSqm: number | null
  lastSalePrice: number | null
  lastSaleDate: string | null
  pricePerSqm: number | null
}

export interface PropertyDetailDto {
  id: string
  unitNumber: string
  streetNumber: string
  streetName: string
  streetType: string
  fullAddress: string
  suburb: string
  state: string
  postcode: string
  location: GeoJsonPoint
  propertyType: string
  bedrooms: number
  bathrooms: number
  carSpaces: number
  landAreaSqm: number | null
  floorAreaSqm: number | null
  lotNumber: string | null
  planNumber: string | null
  createdAt: string
  salesHistory: SalesHistoryDto[]
  activeListings: ListingDto[]
}

// ── Sales ─────────────────────────────────────────────────────────────────────
export interface SalesHistoryDto {
  id: string
  propertyId: string
  fullAddress: string
  price: number
  saleDate: string
  saleMethod: string
  agencyName: string
  agentName: string | null
  daysOnMarket: number | null
  pricePerSqm: number | null
}

// ── Listings ──────────────────────────────────────────────────────────────────
export interface ListingDto {
  id: string
  propertyId: string
  fullAddress: string
  listingType: string
  advertisedPrice: number | null
  priceText: string
  status: string
  agencyName: string
  agentName: string
  description: string
  listedAt: string
  daysOnMarket: number | null
}

// ── Valuation ─────────────────────────────────────────────────────────────────
export interface ValuationDto {
  propertyId: string
  fullAddress: string
  estimatedValue: number | null
  lowEstimate: number | null
  highEstimate: number | null
  confidenceLevel: string
  comparableCount: number
  searchRadiusKm: number
  valuationDate: string
  comparables: SalesHistoryDto[]
}

// ── Nearby ────────────────────────────────────────────────────────────────────
export interface NearbyPropertyDto {
  id: string
  fullAddress: string
  location: GeoJsonPoint
  distanceKm: number
  propertyType: string
  bedrooms: number
  bathrooms: number
  lastSalePrice: number | null
  lastSaleDate: string | null
}

// ── Suburb Statistics ─────────────────────────────────────────────────────────
export interface SuburbStatisticsDto {
  suburb: string
  state: string
  postcode: string
  salesCount12Months: number
  medianSalePrice12Months: number | null
  medianSalePrice24Months: number | null
  annualGrowthPct: number | null
  medianDaysOnMarket: number | null
  medianPricePerSqm: number | null
  auctionClearanceRate12Months: number | null
  medianByPropertyType: Record<string, number | null>
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Forms ─────────────────────────────────────────────────────────────────────
export interface SearchParams {
  suburb?: string
  state?: string
  postcode?: string
  propertyType?: string
  minBedrooms?: number
  maxBedrooms?: number
  minPrice?: number
  maxPrice?: number
  page?: number
  pageSize?: number
}

export interface CreatePropertyRequest {
  unitNumber?: string
  streetNumber: string
  streetName: string
  streetType: string
  suburb: string
  state: string
  postcode: string
  latitude: number
  longitude: number
  propertyType: string
  bedrooms: number
  bathrooms: number
  carSpaces: number
  landAreaSqm?: number
  floorAreaSqm?: number
  lotNumber?: string
  planNumber?: string
}

export interface RecordSaleRequest {
  propertyId: string
  price: number
  saleDate: string
  saleMethod: string
  agencyName: string
  agentName?: string
  daysOnMarket?: number
}

// ── Natural Language Search ───────────────────────────────────────────────────
export interface ParsedSearchParams {
  suburb: string | null
  state: string | null
  propertyType: string | null
  minPrice: number | null
  maxPrice: number | null
  minBedrooms: number | null
  maxBedrooms: number | null
}

export interface NaturalSearchResult {
  query: string
  parsed: ParsedSearchParams
  results: PagedResult<PropertySummaryDto>
}
