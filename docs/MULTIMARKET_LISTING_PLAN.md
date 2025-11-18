# Multimarket Listing Plan

## Goals
- Lower the time/effort to post listings across Facebook Marketplace, OfferUp, eBay, Mercari, Poshmark, etc.
- Maintain a single source of truth (Inventory + Listings service) with reusable data models/templates.
- Support partial automation (prefill + manual review) and eventually full automation (API or headless flows).

## Canonical Listing Model
We already have a `Listing` entity with key fields. To support all marketplaces we should extend with:

| Category            | Canonical Fields                          | Notes / Marketplace Mapping                                                 |
|---------------------|-------------------------------------------|-----------------------------------------------------------------------------|
| Core identity       | `title`, `description`, `condition`, `sku`, `tags[]` | Most marketplaces require title + description + category/condition |
| Media               | `media[]` (urls + metadata)               | Should store order + captions; some sites limit count (e.g., 12 photos)     |
| Pricing             | `askingPrice`, `currency`, `minPrice`, `shippingPrice`, `feesEstimate` | OfferUp/Mercari support shipping labels; eBay has starting/buy-it-now. |
| Inventory metadata  | `quantity`, `dimensions`, `weight`, `location`, `serial` | Needed for shipping calculators + compliance. |
| Platform overrides  | `platformSettings` (JSON per marketplace) | e.g., eBay item specifics, Poshmark category path, Facebook delivery options. |

### Shared Validation / Templates
- Define `ListingTemplate` objects for each vertical (electronics, apparel, collectibles) with default shipping profiles, condition text, and CTA imagery.
- Expose UI to preview how data maps to each marketplace before posting.

## Integration Strategies

| Marketplace | Official API? | Proposed Approach                                                         |
|-------------|---------------|---------------------------------------------------------------------------|
| eBay        | Yes           | Use eBay Sell APIs (Inventory + Fulfillment). Requires OAuth + sandbox/prod credentials. |
| Facebook Marketplace | Limited | Use Graph API for Shops (if eligible) or implement headless browser automation (Playwright) with stored cookies. |
| OfferUp     | No public     | Either headless automation or manual export (prefilled CSV + instructions). |
| Mercari     | Partial       | Similar to OfferUp—prefill forms via automation or provide shareable templates. |
| Poshmark    | No public     | Provide pre-generated description blocks and image sets for manual copy/paste; long-term headless automation. |

## Minimizing Human Effort
1. **Unified Draft Workspace**  
   - Sellers fill in canonical fields once.
   - UI displays per-platform requirements and highlights missing fields.
   - Use component library to drag/drop photos, reorder, and add platform-specific tags.

2. **Platform Profiles**  
   - Store credentials + default preferences per platform (shipping type, pickup radius).
   - Provide “auto-fill” forms that copy canonical data plus profile defaults when opening listing flows.

3. **Bulk Listing Kit**  
   - Generate zipped kits per listing with:
     - Resized images (max dimensions per platform)
     - Markdown/HTML description snippet
     - CSV row for marketplaces that accept uploads.
   - Support multi-select to generate kits for many listings at once.

4. **Automation Pipeline**  
   - Build queue-based service `ListingPublisher` that takes canonical listing ID + target platform(s).
   - Each platform adapter implements:
     ```ts
     interface ListingAdapter {
       validate(data: CanonicalListing): ValidationResult;
       publish(data: CanonicalListing, credentials: PlatformCredentials): Promise<PublishResult>;
       updateStatus(listingId: string, platformData: PublishResult): Promise<void>;
     }
     ```
   - Publish results include platform listing ID, URL, status (draft, live, rejected).
   - For headless flows (Facebook/OfferUp), use Playwright inside a hardened worker container with secret storage.

5. **Change Propagation**
   - When canonical listing updates (price, title, photo), push tasks onto queue for adapters to sync.
   - Keep audit history of diffs per platform for compliance.

## Short-Term Roadmap
1. **Schema updates**
   - Extend `Listing` with `condition`, `category`, `platformSettings`.
   - Add `ListingTemplate` + `PlatformCredential` entities.
2. **UI Enhancements**
   - Build “Listing Composer” page to edit canonical fields + platform previews.
   - Add “Generate kit” action that produces downloadable zip with resized images + text.
3. **Automation Foundations**
   - Implement eBay adapter first (official API).
   - Create queue + worker (BullMQ or Temporal) for asynchronous publishing.
   - Add logging + retry policies per platform.
4. **Headless Automation Research**
   - Spike Playwright flows for Facebook Marketplace and OfferUp to gauge feasibility.
   - Document required human inputs (captchas, 2FA) and plan fallback to manual kits where automation blocked.

## Risks & Mitigations
- **Platform Terms / Automation Limits**: Maintain compliance by using official APIs when possible; for headless flows, require user-provided credentials + opt-in, and monitor for breakage.
- **Credential Security**: Store encrypted credentials in DB (e.g., using KMS or libsodium). Rotate tokens regularly.
- **Image Storage Growth**: Current local storage is fine short-term; design media service to swap underlying storage (S3) without API changes.
- **Operational Load**: Publishing queues may spike; use rate limiting per platform + monitoring hooks (Prometheus/Grafana).

## Deliverables
- Design document (this file) for reference.
- Follow-up tasks:
  1. Implement canonical schema extensions + migrations.
  2. Build listing composer UI/UX.
  3. Implement eBay adapter + publishing worker.
  4. Prototype kit generator for manual uploads.
