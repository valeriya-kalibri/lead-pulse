'use client'

import type { Score } from '@/types'

export interface Filters {
  score: Score | 'all'
  hasChat: 'all' | 'yes' | 'no'
  hasBooking: 'all' | 'yes' | 'no'
  hasContactForm: 'all' | 'yes' | 'no'
  hasServices: 'all' | 'yes' | 'no'
  hasCrmEmr: 'all' | 'yes' | 'no'
  hasAnalytics: 'all' | 'yes' | 'no'
  isMultiLocation: 'all' | 'yes' | 'no'
  employeeCount: string
  revenueRange: string
  search: string
  city: string
  state: string
}

export const DEFAULT_FILTERS: Filters = {
  score: 'all',
  hasChat: 'all',
  hasBooking: 'all',
  hasContactForm: 'all',
  hasServices: 'all',
  hasCrmEmr: 'all',
  hasAnalytics: 'all',
  isMultiLocation: 'all',
  employeeCount: '',
  revenueRange: '',
  search: '',
  city: '',
  state: '',
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  criteria: string[]
  cities: string[]
  states: string[]
}

const SCORE_OPTIONS: Array<{ value: Filters['score']; label: string }> = [
  { value: 'all', label: 'All scores' },
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
]

const BINARY_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

const EMPLOYEE_OPTIONS = [
  { value: '', label: 'Any employees' },
  { value: '1-5', label: '1–5' },
  { value: '6-15', label: '6–15' },
  { value: '16-50', label: '16–50' },
  { value: '50+', label: '50+' },
]

const REVENUE_OPTIONS = [
  { value: '', label: 'Any revenue' },
  { value: '<$500K', label: '<$500K' },
  { value: '$500K-$1M', label: '$500K–$1M' },
  { value: '$1M-$5M', label: '$1M–$5M' },
  { value: '$5M+', label: '$5M+' },
]

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function FilterBar({ filters, onChange, criteria, cities, states }: Props) {
  const isActive =
    filters.score !== 'all' ||
    filters.hasChat !== 'all' ||
    filters.hasBooking !== 'all' ||
    filters.hasContactForm !== 'all' ||
    filters.hasServices !== 'all' ||
    filters.hasCrmEmr !== 'all' ||
    filters.hasAnalytics !== 'all' ||
    filters.isMultiLocation !== 'all' ||
    filters.employeeCount !== '' ||
    filters.revenueRange !== '' ||
    filters.search !== '' ||
    filters.city !== '' ||
    filters.state !== ''

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Search by URL or name…"
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-[#2E3A59] w-52 focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
      />

      <Select
        label="Score:"
        value={filters.score}
        options={SCORE_OPTIONS}
        onChange={(v) => onChange({ ...filters, score: v })}
      />

      {criteria.includes('chatbot') && (
        <Select
          label="Chatbot:"
          value={filters.hasChat}
          options={BINARY_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, hasChat: v as Filters['hasChat'] })}
        />
      )}

      {criteria.includes('contact_form') && (
        <Select
          label="Contact form:"
          value={filters.hasContactForm}
          options={BINARY_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, hasContactForm: v as Filters['hasContactForm'] })}
        />
      )}

      {criteria.includes('online_booking') && (
        <Select
          label="Booking:"
          value={filters.hasBooking}
          options={BINARY_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, hasBooking: v as Filters['hasBooking'] })}
        />
      )}

      {criteria.includes('services') && (
        <Select
          label="Services:"
          value={filters.hasServices}
          options={BINARY_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, hasServices: v as Filters['hasServices'] })}
        />
      )}

      {criteria.includes('crm_emr_platform') && (
        <Select
          label="CRM/EMR:"
          value={filters.hasCrmEmr}
          options={BINARY_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, hasCrmEmr: v as Filters['hasCrmEmr'] })}
        />
      )}

      {criteria.includes('analytics') && (
        <Select
          label="Analytics:"
          value={filters.hasAnalytics}
          options={BINARY_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, hasAnalytics: v as Filters['hasAnalytics'] })}
        />
      )}

      {criteria.includes('locations') && (
        <Select
          label="Multi-location:"
          value={filters.isMultiLocation}
          options={BINARY_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, isMultiLocation: v as Filters['isMultiLocation'] })}
        />
      )}

      {criteria.includes('employee_count') && (
        <Select
          label="Employees:"
          value={filters.employeeCount}
          options={EMPLOYEE_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, employeeCount: v })}
        />
      )}

      {criteria.includes('revenue_range') && (
        <Select
          label="Revenue:"
          value={filters.revenueRange}
          options={REVENUE_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, revenueRange: v })}
        />
      )}

      {criteria.includes('city') && cities.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 whitespace-nowrap">City:</span>
          <select
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {criteria.includes('state') && states.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 whitespace-nowrap">State:</span>
          <select
            value={filters.state}
            onChange={(e) => onChange({ ...filters, state: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {isActive && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
