# UI & UX Improvement Plan

This roadmap captures the gaps in the current `resale-next` frontend (as of 2025‑11‑19) and maps them to concrete deliverables. It draws inspiration from the legacy `~/resale-tracker` experience while aiming for a cleaner, more modern UX aligned with best practices (Jakob Nielsen heuristics, progressive disclosure, responsive design, accessibility).

---

## 1. Audit Summary

| Area | Findings | Impact |
| --- | --- | --- |
| Navigation / Information Architecture | Single-level sidebar with minimal labeling; no breadcrumbs, no quick access to integrations/logs. Returning to the dashboard from detail pages often requires the browser back button. | Users get lost when switching between operations (Purchases → Listings → Credentials). |
| Dashboard | Mixes purchasing stats with listing actions in one column; publish notifications are transient; no historical context beyond the new queue panel. Critical alerts (e.g., policy refresh failure) buried mid page. | Slow triage; important failures may be overlooked. |
| Data Entry (Listing Composer, Purchases) | Long scroll forms without grouping; no contextual validation messages; heavy reliance on plain inputs. No preview of platform-specific requirements. | High cognitive load, error-prone submissions. |
| Integrations (Platform/Goodwill/Salvation Army) | Basic credential forms lack status history, next sync schedules, or manual triggers. No inline guidance on creating/rotating API keys. | Ops can’t quickly validate integration health. |
| Responsiveness & Accessibility | Layout uses Tailwind but lacks responsive breakpoints on tables/cards; limited ARIA labels, no keyboard affordances for critical actions (publish, download kit). | Poor experience on tablets and keyboard-only contexts. |
| Visual Polish | Palette is mostly gray + brand accent; inconsistent spacing between cards; modals/toasts vary in style. | Perceived quality gap vs. legacy app; harder to scan. |

---

## 2. Guiding Principles

1. **Information Hierarchy** – Separate monitoring (dashboards/logs) from authoring (composer, credentials). Use persistent navigation + breadcrumbs.
2. **Progressive Disclosure** – Collapse advanced controls (policy defaults, integration headers) until the user opts in.
3. **Feedback & State** – Every async action needs persistent status (toasts + log entries). Use inline validation and optimistic updates.
4. **Consistency & Components** – Standardize cards, tables, empty states, and button styles via a shared component set (e.g., `components/ui`).
5. **Responsive / Accessible** – AA contrast, focus outlines, ARIA labels, and stacking layouts for ≤1024px widths.

---

## 3. Roadmap

### Phase 1 – Foundations (Navigation & Dashboard)

| Item | Description | Notes |
| --- | --- | --- |
| Global App Shell | Expand `AppLayout.tsx` with persistent sidebar (sections: Operations, Inventory, Integrations) + top bar showing environment & alerts. | Reference legacy app’s left nav; include breadcrumbs. |
| Dashboard 2.0 | Split hero stats (Purchasing, Inventory, Automations) into modular cards; add widgets for alerts (policy failures, queue backlog) and integration health badges. | Use responsive grid and dedicated “Activity” feed. |
| Notification System | Replace ad-hoc notices with reusable toast/banner component supporting success/error/info and auto-dismiss with log link. | Tie into BullMQ job updates & integration syncs. |

### Phase 2 – Core Workflows

| Item | Description | Notes |
| --- | --- | --- |
| Listing Composer Redesign | Break form into tabs/steps (Core Details, Media, Platform Overrides, Review). Provide sticky summary & validation per step. | Show eBay policy defaults inline; add preview mode. |
| Purchases Workspace | Replace `PurchasesPage` table with segmented views (Inbound, In Stock, Completed). Provide inline filters, export, and per-row actions (assign listing, upload docs). | Introduce empty states & skeleton loaders. |
| Platform Credentials Hub | Convert to cards per platform with status timeline, last sync log, and quick actions (Connect, Refresh, View Logs). Include contextual help links. | Pull recent policy refresh logs + Goodwill/SA sync results. |

### Phase 3 – Integrations & Monitoring

| Item | Description | Notes |
| --- | --- | --- |
| Integration Detail Views | Dedicated pages for Goodwill and Salvation Army showing credential info, latest sync attempts, manual triggers, and log tables. | Surface metrics (import count, errors) with filters. |
| Automation Center | Expand dashboard queue panel into full page listing publish jobs with filters, bulk retry, and per-job traces (linking to eBay sync logs). | Align with BullMQ endpoints already exposed. |
| Alerting Hooks | Visual indicators + settings for upcoming failures (e.g., Goodwill credential expiring). Provide copy-paste curl commands for manual tests. | Pair with Prometheus alerts (documented). |

### Phase 4 – Visual/Interaction Polish

| Item | Description | Notes |
| --- | --- | --- |
| Design Tokens & Theme | Create unified color/font/spacing tokens (Tailwind config) and apply to cards, tables, buttons. | Enables brands/dark mode later. |
| Accessibility Pass | Add keyboard focus traps to modals, ARIA labels for action buttons, semantic headings in pages. Run automated audits (Lighthouse, axe). | Target WCAG 2.1 AA. |
| Responsive Breakpoints | Define breakpoints for ≤1280, ≤1024, ≤768 px. Ensure key flows (dashboard, composer, credentials) collapse gracefully. | Add mobile nav drawer if needed. |

---

## 4. Deliverables & Tracking

- **Design artifacts:** Figma wireframes for navigation + key flows (Phase 1 & 2).
- **Component library:** Documented in storybook or simple MDX, covering cards, tables, toasts, empty states.
- **Telemetry tie-in:** Dashboard widgets driven by `/metrics`, `/listing-publisher/jobs`, and integration log endpoints.
- **Change log:** Update `docs/UI_UX_IMPROVEMENT_PLAN.md` as phases complete; link PRs/tickets.

---

## 5. Next Actions

1. Produce wireframes for the updated App Shell + Dashboard (Phase 1).
2. Spike reusable components (card, toast, alert banner) to unblock dashboard work.
3. Gather data for integration detail views (extend API if needed).

Once Phase 1 is underway, we can prioritize specific Phase 2 items (likely Listing Composer + Platform Credentials) based on user feedback. Subsequent phases follow after core workflow improvements land.*** End Patch
