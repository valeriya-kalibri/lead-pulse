'use client'

import type { Score } from '@/types'

export interface Filters {
  score: Score | 'all'
  hasChat: 'all' | 'yes' | 'no'
  hasBooking: 'all' | 'yes' | 'no'
  search: string
  city: string
  state: string
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
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
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

      {criteria.includes('online_booking') && (
        <Select
          label="Booking:"
          value={filters.hasBooking}
          options={BINARY_OPTIONS as any}
          onChange={(v) => onChange({ ...filters, hasBooking: v as Filters['hasBooking'] })}
        />
      )}

      {criteria.includes('city') && cities.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 whitespace-nowrap">City:</span>
          <select
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
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
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-[#2E3A59] focus:outline-none focus:ring-2 focus:ring-[#AABFFF]"
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
          onClick={() =>
            onChange({ score: 'all', hasChat: 'all', hasBooking: 'all', search: '', city: '', state: '' })
          }
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
