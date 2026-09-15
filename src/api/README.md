# Google Ads API layer

`docs/openapi-backend.yaml` is the source of truth for production paths, methods and request
parameters. Its response envelopes are still declared with `additionalProperties`, so the known
Google Ads response fields are maintained as explicit TypeScript wire DTOs in `types/domains.ts`.
Those DTOs are shared with the local mock server to make contract drift a compile-time error.

## Boundaries

- Backend money is an integer in minor units. Advertising hooks normalize it to `Money`; UI code
  never receives `*_minor` fields.
- Ratio metrics whose denominator is zero remain `null`. They must not be displayed as zero.
- Aggregated totals retain one row per `currency_code`; values from different currencies are never
  combined.
- UI pagination uses `page` and `per_page`; `withApiQuery` converts these to `limit` and `offset`.
  `ads_account_ids` and export `columns` are serialized as comma-separated values, as required by
  the backend.

Use the domain hooks (`useAdsAccountsQuery`, `useAnalyticsOverviewQuery`,
`useAnalyticsBreakdownQuery`, `useGoogleAdsEntitiesQuery` and sync-history hooks) instead of
constructing Google Ads URLs in pages. Account, OAuth, synchronization and export writes are
exposed through the mutations in `mutations.ts`.

`apiFileRequest` shares authentication refresh, timeout and normalized `ApiError` behavior with
JSON requests and returns the response `Blob`, content type and filename for CSV/XLSX exports.

The generic `useApiQuery` remains available for authentication and other envelope-based service
requests. Queries retry network failures, `429` and `5xx` responses at most twice; mutations are
never retried. `Retry-After`, `request_id` and `422 field_errors` are preserved by the common error
adapter.
