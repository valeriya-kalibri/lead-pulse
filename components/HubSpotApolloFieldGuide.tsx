'use client'

import { useState } from 'react'

type FieldRow = {
  property: string
  label: string
  type: 'text' | 'textarea' | 'dropdown' | 'number'
  scope: 'contact + company' | 'contact'
  notes?: string
}

type ApolloRow = {
  hubspotProperty: string
  apolloVariable: string
  sequenceUse: string
}

const V1_FIELDS: FieldRow[] = [
  { property: 'outreach_hook', label: 'Outreach Hook', type: 'text', scope: 'contact + company' },
  { property: 'leadpulse_score', label: 'LeadPulse Score', type: 'text', scope: 'contact + company', notes: 'Hot / Warm / Cold' },
  { property: 'leadpulse_list_name', label: 'LeadPulse List Name', type: 'text', scope: 'contact + company' },
  { property: 'leadpulse_filter_summary', label: 'LeadPulse Filter Summary', type: 'textarea', scope: 'contact + company' },
  { property: 'practice_platform', label: 'Practice Platform', type: 'text', scope: 'contact + company' },
  { property: 'crm_platform', label: 'CRM Platform', type: 'text', scope: 'contact + company' },
  { property: 'has_chatbot', label: 'Has Chatbot', type: 'dropdown', scope: 'contact + company', notes: 'Unknown / Yes / No' },
  { property: 'has_contact_form', label: 'Has Contact Form', type: 'dropdown', scope: 'contact + company', notes: 'Unknown / Yes / No' },
  { property: 'has_online_booking', label: 'Has Online Booking', type: 'dropdown', scope: 'contact + company', notes: 'Unknown / Yes / No' },
  { property: 'services_detected', label: 'Services Detected', type: 'text', scope: 'contact + company' },
  { property: 'location_count', label: 'Location Count', type: 'number', scope: 'contact + company' },
  { property: 'leadpulse_intel', label: 'LeadPulse Intel', type: 'textarea', scope: 'contact + company', notes: 'Full intelligence briefing as formatted plain text' },
]

const V2_FIELDS: FieldRow[] = [
  { property: 'outreach_email_subject_1', label: 'Email 1 Subject', type: 'text', scope: 'contact' },
  { property: 'outreach_email_body_1', label: 'Email 1 Body', type: 'textarea', scope: 'contact' },
  { property: 'outreach_email_subject_2', label: 'Email 2 Subject', type: 'text', scope: 'contact' },
  { property: 'outreach_email_body_2', label: 'Email 2 Body', type: 'textarea', scope: 'contact' },
  { property: 'outreach_email_subject_3', label: 'Email 3 Subject', type: 'text', scope: 'contact' },
  { property: 'outreach_email_body_3', label: 'Email 3 Body', type: 'textarea', scope: 'contact' },
  { property: 'pain_indicators', label: 'Pain Indicators', type: 'textarea', scope: 'contact', notes: 'Also included inside LeadPulse Intel — synced here as a standalone field for Apollo use' },
  { property: 'conversation_starters', label: 'Conversation Starters', type: 'textarea', scope: 'contact', notes: 'Also included inside LeadPulse Intel — synced here as a standalone field for Apollo use' },
  { property: 'apollo_sequence_status', label: 'Apollo Sequence Status', type: 'text', scope: 'contact', notes: 'Not Enrolled / Enrolled / Replied / Bounced / Completed' },
]

const APOLLO_SEQUENCE_FIELDS: ApolloRow[] = [
  { hubspotProperty: 'outreach_email_subject_1', apolloVariable: 'outreach_email_subject_1', sequenceUse: 'Step 1 — subject line' },
  { hubspotProperty: 'outreach_email_body_1', apolloVariable: 'outreach_email_body_1', sequenceUse: 'Step 1 — email body' },
  { hubspotProperty: 'outreach_email_subject_2', apolloVariable: 'outreach_email_subject_2', sequenceUse: 'Step 2 — subject line' },
  { hubspotProperty: 'outreach_email_body_2', apolloVariable: 'outreach_email_body_2', sequenceUse: 'Step 2 — email body' },
  { hubspotProperty: 'outreach_email_subject_3', apolloVariable: 'outreach_email_subject_3', sequenceUse: 'Step 3 — subject line' },
  { hubspotProperty: 'outreach_email_body_3', apolloVariable: 'outreach_email_body_3', sequenceUse: 'Step 3 — email body' },
]

const APOLLO_SUPPLEMENTAL_FIELDS: ApolloRow[] = [
  { hubspotProperty: 'outreach_hook', apolloVariable: 'outreach_hook', sequenceUse: 'Personalization reference — optional manual use' },
  { hubspotProperty: 'leadpulse_score', apolloVariable: 'leadpulse_score', sequenceUse: 'Filter and sort contacts in Apollo views' },
  { hubspotProperty: 'pain_indicators', apolloVariable: 'pain_indicators', sequenceUse: 'Context reference for manual personalization' },
  { hubspotProperty: 'conversation_starters', apolloVariable: 'conversation_starters', sequenceUse: 'Context reference for manual personalization' },
]

const TYPE_STYLES: Record<FieldRow['type'], { label: string; cls: string }> = {
  text: { label: 'text', cls: 'bg-gray-100 text-gray-600' },
  textarea: { label: 'multi-line', cls: 'bg-gray-100 text-gray-600' },
  dropdown: { label: 'dropdown', cls: 'bg-blue-50 text-blue-600' },
  number: { label: 'number', cls: 'bg-purple-50 text-purple-700' },
}

function FieldTable({ fields }: { fields: FieldRow[] }) {
  return (
    <div className="space-y-0 rounded-lg border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Property name / Label</span>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Type</span>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Scope</span>
      </div>
      {fields.map((f, i) => {
        const t = TYPE_STYLES[f.type]
        return (
          <div
            key={f.property}
            className={`grid grid-cols-[1fr_auto_auto] gap-x-3 items-start px-3 py-2 ${i < fields.length - 1 ? 'border-b border-gray-50' : ''}`}
          >
            <div className="min-w-0 space-y-0.5">
              <span className="inline-block font-mono text-[10px] text-[#2E3A59] bg-[#AABFFF]/15 px-1.5 py-0.5 rounded">
                {f.property}
              </span>
              <p className="text-xs text-gray-500">{f.label}{f.notes && <span className="text-gray-400"> — {f.notes}</span>}</p>
            </div>
            <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${t.cls}`}>
              {t.label}
            </span>
            <span className="mt-0.5 text-[10px] text-gray-400 whitespace-nowrap">{f.scope}</span>
          </div>
        )
      })}
    </div>
  )
}

function ApolloTable({ rows, supplemental }: { rows: ApolloRow[]; supplemental?: boolean }) {
  return (
    <div className="space-y-0 rounded-lg border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-x-3 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">HubSpot property</span>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Apollo variable</span>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Use in sequence</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.hubspotProperty}
          className={`grid grid-cols-[1fr_1fr_1fr] gap-x-3 items-start px-3 py-2 ${i < rows.length - 1 ? 'border-b border-gray-50' : ''}`}
        >
          <span className="font-mono text-[10px] text-[#2E3A59] bg-[#AABFFF]/15 px-1.5 py-0.5 rounded self-start">
            {r.hubspotProperty}
          </span>
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded self-start ${supplemental ? 'text-gray-500 bg-gray-50' : 'text-[#2E3A59] bg-[#AABFFF]/15'}`}>
            {`{{${r.apolloVariable}}}`}
          </span>
          <span className="text-xs text-gray-500 leading-relaxed">{r.sequenceUse}</span>
        </div>
      ))}
    </div>
  )
}

export default function HubSpotApolloFieldGuide() {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'hubspot' | 'apollo'>('hubspot')
  const [hubspotTab, setHubspotTab] = useState<'v1' | 'v2'>('v1')

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#2E3A59]">HubSpot &amp; Apollo Field Setup</span>
          <span className="rounded-full bg-[#AABFFF]/20 px-2 py-0.5 text-xs text-[#2E3A59]">
            field reference
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pt-4 pb-5 space-y-4">

          <p className="text-sm text-gray-500 leading-relaxed">
            A complete reference of every custom field LeadPulse creates in HubSpot and how to map them in Apollo. V1 fields cover qualification and Intel Card data. V2 fields cover email sequencing and are required for Apollo auto-fill to work.
          </p>

          {/* Section tabs */}
          <div className="flex gap-1 rounded-lg bg-gray-50 p-0.5 w-fit">
            {(['hubspot', 'apollo'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSection(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeSection === s
                    ? 'bg-white text-[#2E3A59] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s === 'hubspot' ? 'HubSpot Fields' : 'Apollo Mapping'}
              </button>
            ))}
          </div>

          {/* ── HubSpot section ── */}
          {activeSection === 'hubspot' && (
            <div className="space-y-4">

              {/* V1 / V2 tab row */}
              <div className="flex items-center gap-2">
                {(['v1', 'v2'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setHubspotTab(v)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                      hubspotTab === v
                        ? v === 'v1'
                          ? 'border-gray-400 bg-gray-100 text-[#2E3A59]'
                          : 'border-[#AABFFF] bg-[#AABFFF]/15 text-[#2E3A59]'
                        : 'border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {v === 'v1' ? 'V1 — Core fields' : 'V2 — Email sequencing'}
                  </button>
                ))}
              </div>

              {hubspotTab === 'v1' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Auto-created
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      These 12 properties are created automatically in HubSpot the first time you run a sync. You do not need to create them manually. They appear on both Contact and Company records under the <span className="font-semibold text-[#2E3A59]">Contact Information</span> group.
                    </p>
                  </div>
                  <FieldTable fields={V1_FIELDS} />
                  <p className="text-sm text-gray-400 italic leading-relaxed">
                    Dropdown fields (Has Chatbot, Has Contact Form, Has Online Booking) are created as HubSpot enumeration properties with three options: Unknown, Yes, No — in that order.
                  </p>
                </div>
              )}

              {hubspotTab === 'v2' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0 rounded-full bg-[#AABFFF]/20 px-2 py-0.5 text-[10px] font-medium text-[#2E3A59] ring-1 ring-inset ring-[#AABFFF]/40">
                      Email sequencing
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      These 9 properties back the email sequencing feature. They are Contact-only — email sequences are contact-level, not company-level. All 9 are auto-created on your first sync after the V2 update. Until then, create them manually in HubSpot under <span className="font-semibold text-[#2E3A59]">Settings → Properties → Contact properties → Contact Information</span>.
                    </p>
                  </div>
                  <FieldTable fields={V2_FIELDS} />
                  <div className="rounded-lg border border-[#AABFFF]/40 bg-[#AABFFF]/10 px-3 py-2.5 space-y-1">
                    <p className="text-sm font-semibold text-[#2E3A59]">Why pain_indicators and conversation_starters exist twice</p>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Both fields already appear inside the <span className="font-mono text-[10px] bg-white/70 px-1 py-0.5 rounded">leadpulse_intel</span> multi-line text property as part of the full formatted briefing. They are also synced as standalone fields so Apollo can reference them individually in sequence logic or as supplemental variables — without parsing the full intel block.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Apollo section ── */}
          {activeSection === 'apollo' && (
            <div className="space-y-5">

              <p className="text-sm text-gray-500 leading-relaxed">
                Apollo reads HubSpot contact properties through its native integration. You map each HubSpot property to an Apollo custom variable once, and Apollo makes that variable available in every sequence step as <span className="font-mono text-[10px] bg-gray-50 border border-gray-200 px-1 py-0.5 rounded">&#123;&#123;variable_name&#125;&#125;</span>. The six email fields are the only ones required for sequences to auto-fill.
              </p>

              {/* Setup steps */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#2E3A59]">One-time setup</p>
                <ol className="space-y-4">
                  {[
                    {
                      n: '01',
                      title: 'Connect HubSpot to Apollo',
                      body: 'In Apollo, go to Settings → Integrations → HubSpot. Authorize the connection. Apollo will begin syncing your HubSpot contacts including all custom properties.',
                    },
                    {
                      n: '02',
                      title: 'Map the LeadPulse fields',
                      body: 'In Apollo, go to Settings → Custom Fields (or the HubSpot field mapping section). For each property in the table below, create a custom variable with the same name and map it to the matching HubSpot property. Keep the variable name identical to the HubSpot internal property name — this avoids confusion and makes the mapping table below the source of truth.',
                    },
                    {
                      n: '03',
                      title: 'Use variables in your sequence steps',
                      body: 'When building a sequence, each email step has a subject and body field. Paste the variable placeholder into the subject and body. Apollo replaces it with that contact\'s synced value when the email sends.',
                    },
                  ].map((step) => (
                    <li key={step.n} className="flex gap-3">
                      <span className="mt-0.5 flex-shrink-0 text-sm font-semibold tabular-nums text-[#AABFFF]">{step.n}</span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#2E3A59]">{step.title}</p>
                        <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Sequence fields */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#2E3A59]">Required for sequence auto-fill</p>
                  <span className="rounded-full bg-[#AABFFF]/20 px-2 py-0.5 text-[10px] text-[#2E3A59]">6 fields</span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Map these six fields to enable Apollo to auto-fill subject lines and email bodies from your LeadPulse-generated sequences.
                </p>
                <ApolloTable rows={APOLLO_SEQUENCE_FIELDS} />
                <div className="rounded-lg border border-[#AABFFF]/40 bg-[#AABFFF]/10 px-3 py-2 mt-1">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    In your Apollo sequence, set Step 1 subject to <span className="font-mono text-[10px] bg-white/70 border border-[#AABFFF]/30 px-1 py-0.5 rounded">&#123;&#123;outreach_email_subject_1&#125;&#125;</span> and body to <span className="font-mono text-[10px] bg-white/70 border border-[#AABFFF]/30 px-1 py-0.5 rounded">&#123;&#123;outreach_email_body_1&#125;&#125;</span>. Repeat for steps 2 and 3. Apollo replaces each placeholder with that contact&rsquo;s unique generated copy.
                  </p>
                </div>
              </div>

              {/* Supplemental fields */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#2E3A59]">Optional — supplemental fields</p>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">4 fields</span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  These fields are useful for filtering contacts in Apollo views, building manual personalization, or creating supplemental tasks in a sequence. Not required for email auto-fill.
                </p>
                <ApolloTable rows={APOLLO_SUPPLEMENTAL_FIELDS} supplemental />
              </div>

              {/* Notes */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-sm font-semibold text-[#2E3A59]">Important notes</p>
                <ul className="space-y-2">
                  {[
                    'Field mapping in Apollo is a one-time setup. Once mapped, every contact synced from HubSpot automatically has their variables populated — including all future LeadPulse syncs.',
                    'If a prospect does not have a generated sequence yet, the variable resolves to empty in Apollo. Always generate sequences in LeadPulse and sync to HubSpot before enrolling contacts.',
                    'Apollo syncs from HubSpot on a schedule (typically every few hours) and on-demand when you trigger a sync. After syncing from LeadPulse to HubSpot, allow Apollo\'s next sync cycle before enrolling contacts — or trigger a manual sync in Apollo.',
                    "The variable names in Apollo must match exactly — no spaces, same capitalization, same underscores. The safest approach is to copy the property name directly from the HubSpot property and use it as the Apollo variable name.",
                  ].map((note) => (
                    <li key={note} className="flex gap-2 text-sm text-gray-500 leading-relaxed">
                      <span className="mt-2 flex-shrink-0 w-1 h-1 rounded-full bg-gray-300" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  )
}
