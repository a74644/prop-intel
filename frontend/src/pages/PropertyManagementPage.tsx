import { useEffect, useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Pencil, Eye, Search, Loader2, AlertCircle, X, ChevronLeft, ChevronRight,
  Bed, Bath, Car, Building2, Maximize2,
} from 'lucide-react'
import { propertiesApi } from '../lib/api'
import { formatPrice, formatDate, propertyTypeColor, stateColor, AU_STATES, PROPERTY_TYPES } from '../lib/utils'
import type { PropertySummaryDto, PagedResult, CreatePropertyRequest } from '../types'

const BLANK: CreatePropertyRequest = {
  streetNumber: '', streetName: '', streetType: 'Street',
  suburb: '', state: 'NSW', postcode: '',
  latitude: 0, longitude: 0,
  propertyType: 'House', bedrooms: 3, bathrooms: 2, carSpaces: 1,
}

type ModalMode = 'add' | 'edit' | 'delete' | null

export default function PropertyManagementPage() {
  const navigate = useNavigate()

  // ── Data ───────────────────────────────────────────────────────────────────
  const [result,  setResult]  = useState<PagedResult<PropertySummaryDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const PAGE_SIZE = 20

  // ── Filter ─────────────────────────────────────────────────────────────────
  const [filterType,  setFilterType]  = useState('')
  const [filterState, setFilterState] = useState('')

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [modal,     setModal]     = useState<ModalMode>(null)
  const [selected,  setSelected]  = useState<PropertySummaryDto | null>(null)
  const [form,      setForm]      = useState<CreatePropertyRequest>(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')

  const fetchData = async (pg = 1) => {
    setLoading(true)
    try {
      const data = await propertiesApi.search({
        propertyType: filterType  || undefined,
        state:        filterState || undefined,
        page: pg, pageSize: PAGE_SIZE,
      })
      setResult(data)
      setPage(pg)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = () => { setForm(BLANK); setFormError(''); setModal('add') }
  const openEdit = (p: PropertySummaryDto) => {
    const parts = p.fullAddress.split(' ')
    setForm({
      ...BLANK,
      streetNumber: parts[0] ?? '',
      streetName:   parts.slice(1).join(' ') ?? p.fullAddress,
      suburb:       p.suburb,
      state:        p.state,
      postcode:     p.postcode,
      propertyType: p.propertyType,
      bedrooms:     p.bedrooms,
      bathrooms:    p.bathrooms,
      carSpaces:    p.carSpaces,
      latitude:     p.location.coordinates[1],
      longitude:    p.location.coordinates[0],
    })
    setSelected(p)
    setFormError('')
    setModal('edit')
  }
  const openDelete = (p: PropertySummaryDto) => { setSelected(p); setModal('delete') }
  const closeModal = () => { setModal(null); setSelected(null); setFormError('') }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      if (modal === 'add') {
        await propertiesApi.create(form)
      } else if (modal === 'edit' && selected) {
        await propertiesApi.update(selected.id, {
          propertyType: form.propertyType,
          bedrooms: form.bedrooms,
          bathrooms: form.bathrooms,
          carSpaces: form.carSpaces,
          landAreaSqm: form.landAreaSqm,
          floorAreaSqm: form.floorAreaSqm,
        })
      }
      closeModal()
      fetchData(page)
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      await propertiesApi.delete(selected.id)
      closeModal()
      fetchData(page)
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const field = (key: keyof CreatePropertyRequest, value: any) =>
    setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="p-6 space-y-5 max-w-[1300px] mx-auto">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between" data-stagger="0">
        <div className="flex gap-3 flex-1 max-w-md">
          <select
            className="select flex-1"
            value={filterType}
            onChange={e => { setFilterType(e.target.value); fetchData(1) }}
          >
            <option value="">All types</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="select w-28"
            value={filterState}
            onChange={e => { setFilterState(e.target.value); fetchData(1) }}
          >
            <option value="">All states</option>
            {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={openAdd} className="btn btn-gold btn-sm">
          <Plus size={15} /> Add Property
        </button>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      {result && (
        <div className="flex gap-4 text-sm text-ink-2 font-mono" data-stagger="1">
          <span><span className="text-ink-0 font-semibold tabular">{result.totalCount}</span> total</span>
          <span className="text-edge">·</span>
          <span>page <span className="text-ink-0">{page}</span> of <span className="text-ink-0">{result.totalPages}</span></span>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden" data-stagger="2">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_100px_80px_90px_120px_100px] gap-4 px-5 py-3 border-b border-edge text-[11px] text-ink-2 font-mono uppercase tracking-wider">
          <span>Property</span>
          <span>Type</span>
          <span>Rooms</span>
          <span>State</span>
          <span>Last sale</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 size={24} className="text-teal-bright animate-spin" />
          </div>
        ) : result?.items.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Building2 size={36} className="text-ink-2 mb-3" />
            <p className="text-sm text-ink-2">No properties match the current filters</p>
          </div>
        ) : (
          <div>
            {result?.items.map(p => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_100px_80px_90px_120px_100px] gap-4 px-5 py-3.5 items-center table-row"
              >
                {/* Address */}
                <div className="min-w-0">
                  <p className="text-sm text-ink-0 truncate">{p.fullAddress}</p>
                  <p className="text-xs text-ink-2 font-mono">{p.suburb}</p>
                </div>
                {/* Type */}
                <div>
                  <span
                    className="badge text-[10px]"
                    style={{
                      background: `${propertyTypeColor(p.propertyType)}15`,
                      color: propertyTypeColor(p.propertyType),
                      border: `1px solid ${propertyTypeColor(p.propertyType)}30`,
                    }}
                  >
                    {p.propertyType}
                  </span>
                </div>
                {/* Rooms */}
                <div className="flex items-center gap-2 text-xs text-ink-2 font-mono">
                  <span className="flex items-center gap-0.5"><Bed size={11} />{p.bedrooms}</span>
                  <span className="flex items-center gap-0.5"><Bath size={11} />{p.bathrooms}</span>
                </div>
                {/* State */}
                <div>
                  <span
                    className="badge"
                    style={{
                      background: `${stateColor(p.state)}12`,
                      color: stateColor(p.state),
                      border: `1px solid ${stateColor(p.state)}25`,
                    }}
                  >
                    {p.state}
                  </span>
                </div>
                {/* Last sale */}
                <div>
                  <p className="text-sm font-mono tabular text-gold-bright">
                    {p.lastSalePrice ? formatPrice(p.lastSalePrice, true) : '—'}
                  </p>
                  <p className="text-[10px] text-ink-2 font-mono">{formatDate(p.lastSaleDate)}</p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    onClick={() => navigate(`/properties/${p.id}`)}
                    className="p-1.5 text-ink-2 hover:text-teal-bright transition-colors rounded"
                    title="View detail"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 text-ink-2 hover:text-gold-bright transition-colors rounded"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => openDelete(p)}
                    className="p-1.5 text-ink-2 hover:text-red-400 transition-colors rounded"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3" data-stagger="3">
          <button onClick={() => fetchData(page - 1)} disabled={page <= 1 || loading} className="btn btn-ghost btn-sm">
            <ChevronLeft size={15} /> Prev
          </button>
          <span className="text-sm text-ink-2 font-mono tabular">{page} / {result.totalPages}</span>
          <button onClick={() => fetchData(page + 1)} disabled={page >= result.totalPages || loading} className="btn btn-ghost btn-sm">
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* ── Add/Edit Modal ───────────────────────────────────────────────── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-edge sticky top-0 bg-card z-10">
              <h3 className="font-display text-xl text-ink-0 font-medium">
                {modal === 'add' ? 'Add New Property' : 'Edit Property'}
              </h3>
              <button onClick={closeModal} className="text-ink-2 hover:text-ink-0">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Address */}
              <section>
                <p className="text-xs text-ink-2 font-mono uppercase tracking-wider mb-3">Address</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Unit #</label>
                    <input className="input" placeholder="Optional" value={form.unitNumber ?? ''} onChange={e => field('unitNumber', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Street number *</label>
                    <input className="input" required value={form.streetNumber} onChange={e => field('streetNumber', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Street type</label>
                    <select className="select" value={form.streetType} onChange={e => field('streetType', e.target.value)}>
                      {['Street', 'Avenue', 'Road', 'Drive', 'Lane', 'Place', 'Court', 'Crescent', 'Boulevard', 'Parade'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-ink-2 mb-1">Street name *</label>
                  <input className="input" required value={form.streetName} onChange={e => field('streetName', e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="col-span-1">
                    <label className="block text-xs text-ink-2 mb-1">Suburb *</label>
                    <input className="input" required value={form.suburb} onChange={e => field('suburb', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">State *</label>
                    <select className="select" required value={form.state} onChange={e => field('state', e.target.value)}>
                      {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Postcode *</label>
                    <input className="input" required maxLength={4} pattern="\d{4}" value={form.postcode} onChange={e => field('postcode', e.target.value)} />
                  </div>
                </div>
              </section>

              <div className="divider-gold" />

              {/* Coordinates */}
              <section>
                <p className="text-xs text-ink-2 font-mono uppercase tracking-wider mb-3">Coordinates</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Latitude *</label>
                    <input className="input font-mono" type="number" step="0.000001" required value={form.latitude || ''} onChange={e => field('latitude', parseFloat(e.target.value))} placeholder="-33.865143" />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Longitude *</label>
                    <input className="input font-mono" type="number" step="0.000001" required value={form.longitude || ''} onChange={e => field('longitude', parseFloat(e.target.value))} placeholder="151.209900" />
                  </div>
                </div>
              </section>

              <div className="divider-gold" />

              {/* Property attributes */}
              <section>
                <p className="text-xs text-ink-2 font-mono uppercase tracking-wider mb-3">Property Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Type *</label>
                    <select className="select" value={form.propertyType} onChange={e => field('propertyType', e.target.value)}>
                      {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {([
                    { key: 'bedrooms',  icon: <Bed size={12} />,      label: 'Bedrooms *',  min: 0 },
                    { key: 'bathrooms', icon: <Bath size={12} />,     label: 'Bathrooms *', min: 0 },
                    { key: 'carSpaces', icon: <Car size={12} />,      label: 'Car spaces',  min: 0 },
                  ] as const).map(({ key, label, min }) => (
                    <div key={key}>
                      <label className="block text-xs text-ink-2 mb-1">{label}</label>
                      <input
                        className="input font-mono"
                        type="number"
                        min={min}
                        value={form[key] as number}
                        onChange={e => field(key, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Land area (m²)</label>
                    <input className="input font-mono" type="number" min={0} value={form.landAreaSqm ?? ''} onChange={e => field('landAreaSqm', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Floor area (m²)</label>
                    <input className="input font-mono" type="number" min={0} value={form.floorAreaSqm ?? ''} onChange={e => field('floorAreaSqm', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="Optional" />
                  </div>
                </div>
              </section>

              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-4 py-3">
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={closeModal} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-gold" disabled={submitting}>
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  {modal === 'add' ? 'Create Property' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ──────────────────────────────────────────── */}
      {modal === 'delete' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-display text-xl text-ink-0 font-medium">Delete Property</h3>
                <p className="text-xs text-ink-2">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-panel rounded-xl border border-edge px-4 py-3 mb-5">
              <p className="text-sm text-ink-0">{selected.fullAddress}</p>
              <p className="text-xs text-ink-2 font-mono">{selected.suburb}, {selected.state}</p>
            </div>
            <p className="text-sm text-ink-2 mb-5">
              This will permanently delete the property and all associated sales history and listings.
            </p>
            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-4 py-3 mb-4">
                <AlertCircle size={15} /> {formError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={closeModal} className="btn btn-ghost">Cancel</button>
              <button onClick={handleDelete} className="btn btn-danger" disabled={submitting}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
