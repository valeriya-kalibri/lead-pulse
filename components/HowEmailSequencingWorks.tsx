'use client'

import { useState } from 'react'

type EmailCard = {
  label: string
  send: string
  desc: string
}

type Step = {
  n: string
  title: string
  body: string
  sub?: { label: string; desc: string }[]
  bullets?: string[]
  emails?: EmailCard[]
  footer?: string
  note?: string
  isManualStep?: boolean
  statusBadges?: boolean
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Qualify and score your list first',
    body: 'Email sequence generation requires a completed scrape and an Intel Card. Run your list through qualification first. Filter to your Hot and Warm prospects — these are the only ones who get email sequences. Cold prospects are deprioritized and do not get sequence generation.',
  },
  {
    n: '02',
    title: 'Generate the Intel Card',
    body: 'Before LeadPulse can write your emails, it needs to know who it is writing to. Click Generate Intel on any Hot or Warm prospect. LeadPulse reads the full website, finds their social media, and produces a complete intelligence briefing — business summary, owner profile, pain indicators, conversation starters, and a personalized outreach hook. This is the source material for your emails.',
    note: 'Intel Cards are generated once and saved permanently. You only pay for generation, never for storage or re-reading.',
  },
  {
    n: '03',
    title: 'Generate the Email Sequence',
    body: 'Once the Intel Card exists, a Generate Email Sequence button appears. Click it. LeadPulse calls Claude and writes three complete emails for that specific prospect — not a template with their name swapped in. Real personalization based on what was actually found on their website.',
    emails: [
      {
        label: 'Email 1 — The Cold Opener',
        send: 'Day 1',
        desc: "Leads with the specific gap or pain point found on the prospect's website. 3–4 short paragraphs. Ends with one soft question or a suggestion to connect — no pressure, no hard pitch. This email opens with the prospect's outreach hook and expands it into a full message.",
      },
      {
        label: 'Email 2 — The Follow-Up',
        send: 'Day 3–4',
        desc: "Takes a completely different angle from Email 1. References that you reached out before without being pushy. Leads with a value point or a specific insight pulled from the prospect's pain indicators. Shorter — 2–3 paragraphs. Reminds them why this is relevant to them right now.",
      },
      {
        label: 'Email 3 — The Breakup Email',
        send: 'Day 7–8',
        desc: 'Very short. 2–3 sentences. Low pressure. Closes the loop and leaves the door open for later. This email consistently gets the highest reply rate of the three because people respond when they feel the conversation is ending.',
      },
    ],
    footer: 'All three emails are plain text, conversational, and written to sound like a real person — not a marketing automation tool.',
  },
  {
    n: '04',
    title: 'Sync to HubSpot',
    body: 'Click Sync to HubSpot. LeadPulse pushes all six email fields — subject line and body for each of the three emails — to the Contact record in HubSpot as custom properties. This happens automatically as part of the standard sync. No extra steps.',
    bullets: [
      'Email 1 Subject and Email 1 Body',
      'Email 2 Subject and Email 2 Body',
      'Email 3 Subject and Email 3 Body',
      'Pain Indicators (also synced separately as a standalone property)',
      'Conversation Starters (also synced separately)',
    ],
  },
  {
    n: '05',
    title: 'Apollo pulls the fields automatically',
    body: "Apollo's native HubSpot integration syncs your contact records including all custom properties. Once you have mapped your LeadPulse HubSpot properties to Apollo custom fields one time in Apollo settings, every synced contact automatically has their personalized email copy ready to use in sequences.",
    note: 'You set the field mapping once. After that it is fully automatic.',
  },
  {
    n: '06',
    title: 'Add contacts to your Apollo sequence',
    body: 'In Apollo, select your Hot and Warm contacts and add them to a sequence. Apollo auto-fills the subject line and body for each step from the HubSpot custom fields. Every person in the sequence gets their own personalized email — not the same template sent to everyone.',
    isManualStep: true,
  },
  {
    n: '07',
    title: 'Track enrollment in LeadPulse',
    body: 'After adding a prospect to an Apollo sequence, mark them as Enrolled in LeadPulse. When they reply, mark them as Replied. LeadPulse tracks the status of every prospect across your outbound campaign so you always know where each person stands.',
    note: 'Apollo logs the sent email activity back to HubSpot automatically. Your HubSpot contact record shows when each email was sent. Replies are handled directly in Apollo where you can respond and continue the conversation.',
    statusBadges: true,
  },
]

const APOLLO_STATUSES = [
  { label: 'Not Enrolled', cls: 'bg-gray-100 text-gray-600 ring-gray-400/20' },
  { label: 'Enrolled', cls: 'bg-blue-50 text-blue-600 ring-blue-500/20' },
  { label: 'Replied', cls: 'bg-green-50 text-green-700 ring-green-600/20' },
  { label: 'Bounced', cls: 'bg-red-50 text-red-600 ring-red-500/20' },
  { label: 'Completed', cls: 'bg-purple-50 text-purple-700 ring-purple-600/20' },
]

const FAQS = [
  {
    q: 'Do all three emails get sent automatically?',
    a: 'Yes. Once a contact is enrolled in an Apollo sequence, Apollo sends each email on the schedule you set — Day 1, Day 3–4, and Day 7–8. If they reply at any point, Apollo stops the sequence automatically for that contact.',
  },
  {
    q: 'Is every email actually different per prospect?',
    a: "Yes. LeadPulse generates each email from scratch using that prospect's specific website data, Intel Card, and qualification signals. Two prospects in the same industry will get completely different emails because they have different websites, different gaps, and different pain points.",
  },
  {
    q: 'What if I want to edit the emails before they go out?',
    a: 'Every email is visible inside LeadPulse on the prospect record before you sync. You can read them, copy them, or manually adjust the copy in HubSpot or Apollo before enrolling the contact in a sequence. Nothing sends without you adding the contact to a sequence in Apollo first.',
  },
  {
    q: 'Can I generate sequences for Cold prospects?',
    a: 'No. Email sequence generation is available for Hot and Warm prospects only. Cold prospects already have a chatbot or full booking solution — they are deprioritized and not worth cold outreach at this time.',
  },
  {
    q: 'What does this cost?',
    a: 'Generating one email sequence costs approximately $0.02–$0.05 in Claude API usage. Generating sequences for 50 prospects costs roughly $1–$2.50 total. Pro plan includes 50 sequences per month. Additional sequences are pay-per-use.',
  },
  {
    q: 'Does Apollo show opens and clicks in HubSpot?',
    a: "Apollo logs sent email activity to HubSpot automatically — you will see when each email was sent on the contact's timeline. Detailed engagement events like opens and clicks are not currently pushed back to HubSpot by Apollo. Check Apollo directly for open and reply data.",
  },
]

export default function HowEmailSequencingWorks() {
  const [open, setOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#2E3A59]">How LeadPulse Email Sequencing Works</span>
          <span className="rounded-full bg-[#AABFFF]/20 px-2 py-0.5 text-xs text-[#2E3A59]">
            7 steps
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
        <div className="border-t border-gray-100 px-4 pt-4 pb-5 space-y-5">

          <p className="text-sm text-gray-500 leading-relaxed">
            LeadPulse writes your cold email sequences for you. Once a prospect has an Intel Card, one click generates a complete 3-step personalized email sequence — subject line and full email body for each step — written specifically for that business using everything LeadPulse found on their website. The emails sync to HubSpot, Apollo pulls them automatically, and your sequence goes out personalized without you writing a single word.
          </p>

          <ol className="space-y-6">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="mt-0.5 flex-shrink-0 text-sm font-semibold tabular-nums text-[#AABFFF]">
                  {s.n}
                </span>
                <div className="space-y-2 min-w-0">
                  <p className="text-sm font-bold text-[#2E3A59]">{s.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>

                  {s.emails && (
                    <div className="space-y-2 pt-1">
                      {s.emails.map((email) => (
                        <div
                          key={email.label}
                          className="rounded-lg border border-[#AABFFF]/40 bg-[#AABFFF]/10 px-3 py-2.5 space-y-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#2E3A59]">{email.label}</span>
                            <span className="rounded-full bg-[#2E3A59]/10 px-2 py-0.5 text-[10px] font-medium text-[#2E3A59]">
                              {email.send}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{email.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.bullets && (
                    <ul className="space-y-1.5 pt-0.5">
                      {s.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                          <span className="mt-2 flex-shrink-0 w-1 h-1 rounded-full bg-gray-400" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {s.sub && (
                    <ul className="space-y-1.5 pt-0.5">
                      {s.sub.map((item) => (
                        <li key={item.label} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                          <span className="font-semibold text-[#2E3A59] flex-shrink-0 whitespace-nowrap">{item.label} —</span>
                          <span>{item.desc}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {s.statusBadges && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {APOLLO_STATUSES.map((status) => (
                        <span
                          key={status.label}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {s.isManualStep && (
                    <p className="text-sm font-semibold text-[#2E3A59] border-l-2 border-[#AABFFF] pl-2 mt-1">
                      This is the only manual step in the entire process. Everything else — qualification, scoring, intel generation, email writing, HubSpot sync, and Apollo field population — is automatic.
                    </p>
                  )}

                  {'footer' in s && s.footer && (
                    <p className="text-sm text-gray-600 leading-relaxed pt-0.5">{s.footer}</p>
                  )}

                  {s.note && (
                    <p className="text-sm text-gray-400 leading-relaxed italic pt-0.5">{s.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-lg border border-[#AABFFF]/40 bg-[#AABFFF]/10 px-4 py-3 space-y-2">
            <p className="text-sm font-bold text-[#2E3A59]">How it all fits together</p>
            <div className="space-y-1">
              {[
                'Apollo finds your prospects.',
                'LeadPulse qualifies them, scores them, and writes their personalized email sequences.',
                'HubSpot stores everything and keeps your CRM clean.',
                'Apollo sends the emails automatically.',
              ].map((line) => (
                <p key={line} className="text-sm text-gray-600 leading-relaxed">{line}</p>
              ))}
            </div>
            <p className="text-sm text-gray-400 italic leading-relaxed pt-0.5">
              The only thing you do manually is select which contacts to add to a sequence. Everything else runs on its own.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-1.5">
            <p className="text-sm font-bold text-[#2E3A59] mb-3">Frequently asked questions</p>
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50/60 transition-colors gap-2"
                >
                  <span className="text-sm font-semibold text-[#2E3A59]">{faq.q}</span>
                  <svg
                    className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${openFaqIndex === i ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaqIndex === i && (
                  <div className="border-t border-gray-100 px-3 py-3">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
