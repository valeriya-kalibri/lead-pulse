'use client'

import { useState } from 'react'

const STEPS = [
  {
    n: '01',
    title: 'Export your list from Apollo or HubSpot',
    body: 'Export your prospects as a CSV file. LeadPulse auto-reads standard Apollo and HubSpot export columns — company name, website, contact name, email, phone, city, state, employee count, and revenue. No column renaming or cleanup needed. If multiple contacts share the same website, LeadPulse scrapes it once and applies the results to all of them automatically.',
    note: 'Exporting from HubSpot? Use Export View → CSV. Under Properties, select "Properties and associations in your view." Make sure your view includes: Company Name, Website Domain, Associated Contact name, email, phone, City, State, Number of Employees, and Annual Revenue. Check "Include associated record name" and "Include up to 1,000 associated records per column." Do not select All Properties — it adds unnecessary columns. Your file is ready to upload as-is.',
  },
  {
    n: '02',
    title: 'Choose your offer',
    body: 'Tell LeadPulse what you are selling. This is the most important decision — it controls how every prospect on your list is scored, what the AI Intel Card focuses on, and what angle the email sequence takes.',
    bullets: [
      { label: 'Lead Capture', desc: 'Pitch chatbots, AI voice agents, and lead automation. LeadPulse hunts for gaps — businesses running high-ticket services with no chatbot, no live coverage, and a contact form as their only lead capture. Those are your hot prospects.' },
      { label: 'Business Analytics', desc: 'Pitch BI dashboards and data analytics. LeadPulse hunts for complexity — multi-location operators and high-revenue businesses making decisions without a reporting layer. Those are your hot prospects.' },
    ],
    note: 'The same prospect database can be used for both offers at different times. Run a Lead Capture list first, then clone it for a Business Analytics pitch later — the website data is already collected, only the scoring and AI generation run fresh.',
  },
  {
    n: '03',
    title: 'Create a new prospect list',
    body: 'Give your list a name and select your industry. LeadPulse pre-loads the most common high-ticket service keywords for that vertical — you can edit, remove, or add your own. The offer you selected in the previous step pre-fills the qualification criteria that matter most for that pitch.',
  },
  {
    n: '04',
    title: 'Choose your qualification criteria',
    body: 'Select which data points you want LeadPulse to check on each website — chatbot detection, contact form, online booking, CRM/EMR platform, high-ticket services, number of locations, analytics tools, employee count, and revenue range. Your offer type pre-selects the most relevant criteria. You can adjust freely — only selected criteria are analyzed, scored, and shown in your results.',
    bullets: [
      { label: 'Lead Capture defaults', desc: 'Chatbot, contact form, online booking, services, CRM/EMR platform.' },
      { label: 'Business Analytics defaults', desc: 'Analytics platform, location count, employee count, revenue range, CRM/EMR platform.' },
    ],
  },
  {
    n: '05',
    title: 'Upload your CSV and run',
    body: 'Hit Start Qualification and LeadPulse goes to work. Every website on your list is visited, analyzed against your selected criteria, and scored. 10 prospects or 500 — it runs the same way, automatically, in the background. You\'ll see results populate in real time as each site completes.',
  },
  {
    n: '06',
    title: 'Review your scored results',
    body: 'Every prospect is scored based on what was found on their site — interpreted through the lens of your offer.',
    bullets: [
      { label: '🔥 Hot', desc: 'High priority. Clear gap or strong fit for your offer. Worth outreach today.' },
      { label: '⚡ Warm', desc: 'Missing one key qualifier. Still worth reaching out — just a softer angle.' },
      { label: '❄️ Cold', desc: 'Already covered or not a fit for this offer. Deprioritize.' },
    ],
    note: 'The same business can score differently depending on your offer. A prospect already running a chatbot is Cold for Lead Capture — but if they have 4 locations and no reporting layer, they may be Hot for Business Analytics.',
  },
  {
    n: '07',
    title: 'Generate Intel and Email Sequence',
    body: 'For your best prospects, click Generate Intel to produce a full AI briefing — business summary, owner profile, recent social signals, conversation starters, pain indicators, and a personalized outreach hook. Then generate a 3-step cold email sequence written specifically for that business. Both are framed entirely around your offer — the hook, the pain points, and the pitch are relevant to what you are selling, not generic. Generated once, saved permanently.',
  },
  {
    n: '08',
    title: 'Export, push to HubSpot, or pull from HubSpot',
    body: 'Download your qualified list as a CSV for any outreach tool. Or use HubSpot sync (Pro plan) — push your qualified prospects into HubSpot CRM with scores, intel, email sequences, and signals attached, or pull contacts in from an existing HubSpot list to enrich them inside LeadPulse. All field names in HubSpot stay the same regardless of offer — outreach hook, intel, email sequences — populated with offer-relevant content.',
  },
]

export default function HowItWorks() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#2E3A59]">How LeadPulse Works</span>
          <span className="rounded-full bg-[#AABFFF]/20 px-2 py-0.5 text-xs text-[#2E3A59]">
            8 steps
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

          <p className="text-xs text-gray-500 leading-relaxed">
            LeadPulse visits every website on your list and automatically researches each one — then scores, briefs, and writes outreach for your best prospects based on what you are selling. You know exactly who to call, what to say, and who to skip before you make a single outreach attempt.
          </p>

          <ol className="space-y-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="mt-0.5 flex-shrink-0 text-xs font-semibold tabular-nums text-[#AABFFF]">
                  {s.n}
                </span>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-[#2E3A59]">{s.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
                  {s.bullets && (
                    <ul className="space-y-1 pl-1 pt-0.5">
                      {s.bullets.map((b) => (
                        <li key={b.label} className="flex gap-2 text-xs text-gray-500 leading-relaxed">
                          <span className="font-medium text-[#2E3A59] flex-shrink-0">{b.label} —</span>
                          <span>{b.desc}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.note && (
                    <p className="text-xs text-gray-400 leading-relaxed italic">{s.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-[#2E3A59]">How lists work</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Every list in LeadPulse is completely isolated — its own offer type, industry, criteria, and results. A run of 30 prospects and a run of 5 prospects are two separate lists. Your results, CSV export, and HubSpot sync all operate only on the list you&rsquo;re currently viewing.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              This means you can run multiple campaigns simultaneously — different offers, different industries, different regions — and each one stays clean and separate.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-[#2E3A59]">Reusing a list for a different offer</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              If you want to pitch a second offer to the same contacts, use <span className="font-medium text-[#2E3A59]">Clone for New Offer</span> on any completed list. LeadPulse copies all the prospect records — with all their scraped website data — into a new list with a different offer type. No re-scraping. The website data is already there. Scoring runs fresh through the new offer&rsquo;s lens, and you generate new intel and email sequences from there.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              The two lists stay independent. Run each pitch on its own timeline, sync each one to HubSpot when you&rsquo;re actively working that offer.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-[#2E3A59]">Pushing to HubSpot</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pushing to HubSpot is a smart upsert — not a blind create. For every prospect you sync, LeadPulse does the following:
            </p>
            <ul className="space-y-1.5 pl-1">
              {[
                { label: 'Company', desc: 'searches your HubSpot account by website domain. If a matching company record already exists, it updates it with the LeadPulse score, services detected, chatbot status, booking status, platform data, and filter summary. If no match is found, it creates a new company record.' },
                { label: 'Contact', desc: 'searches by email first, then by phone if no email is found. Same logic — updates the existing record if found, creates a new one if not.' },
                { label: 'Association', desc: 'links the contact to the company in HubSpot if not already connected.' },
                { label: 'Intel & Emails', desc: 'if you generated an Intel Card and email sequence for that prospect, both are written to dedicated LeadPulse fields on the contact and company record — your full briefing and ready-to-send email copy live inside your CRM alongside the record.' },
              ].map((item) => (
                <li key={item.label} className="flex gap-2 text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-[#2E3A59] flex-shrink-0">{item.label} —</span>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 leading-relaxed">
              LeadPulse is always the source of truth on a push. Every score, intel card, email sequence, and signal field you push will overwrite whatever was in HubSpot previously. If you sync a second offer later, it replaces the first — by design. Run one offer at a time per contact.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-[#2E3A59]">Pulling from HubSpot</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pulling is the reverse — it brings contacts from HubSpot into LeadPulse so you can qualify and enrich them. There are two pull modes:
            </p>
            <ul className="space-y-1.5 pl-1">
              {[
                { label: 'HubSpot List', desc: 'select any Company List you have saved in HubSpot. LeadPulse fetches every company in that list, pulls the primary associated contact for each one, and creates a new LeadPulse list ready for qualification. The new list name matches the HubSpot list name.' },
                { label: 'LeadPulse List', desc: 'pulls back contacts that were previously pushed from the current list. LeadPulse searches HubSpot for all records tagged with this list name and refreshes their contact info — name, email, phone, company details — inside LeadPulse.' },
              ].map((item) => (
                <li key={item.label} className="flex gap-2 text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-[#2E3A59] flex-shrink-0">{item.label} —</span>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 leading-relaxed">
              A pull never overwrites enrichment data. If a prospect has already been scraped, LeadPulse will refresh their contact info from HubSpot but will never touch the score, intel card, email sequences, outreach hook, or any detected signals. HubSpot owns contact info. LeadPulse owns qualification data.
            </p>
          </div>

          <p className="text-xs text-gray-400 border-t border-gray-100 pt-3 leading-relaxed">
            LeadPulse does not replace Apollo or HubSpot — it works alongside them. Apollo finds your prospects. HubSpot stores them. LeadPulse tells you which ones are worth calling, what to say, and has the emails ready to go.
          </p>

        </div>
      )}
    </div>
  )
}
