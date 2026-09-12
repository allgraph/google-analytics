# API layer

`apiRequest<T>(path, init)` adds the access token, applies the 15 second timeout and returns a normalized envelope. Use `DataEnvelope<T>` for a single resource and `ListEnvelope<T>` for a collection.

UI query state stays in the contract form:

```ts
const path = withApiQuery(apiRoutes.calls, {
  page: 2,
  per_page: 50,
  filters: { site_ids: ['site_1', 'site_2'], status: 'answered' },
})
// /calls?limit=50&offset=50&site_ids=site_1&site_ids=site_2&status=answered
```

Use `fromMinorUnits` and `toMinorUnits` at API boundaries. Components receive `Money` objects and never handle minor units.

The backend endpoint `/alerts` is exposed as `apiRoutes.notifications`, matching the frontend screen name. `VITE_API_MODE` remains available through `apiConfig.mode`; mock transport selection will be implemented when a mock transport exists.

## Server state

Use `useApiQuery` for a resource and `useApiListQuery` for a paginated list. List cache keys
always have the shape `[entity, filters, { page, per_page }]`, so filters and pagination create
independent cache entries. Data stays fresh for 60 seconds and remains in memory for five minutes.

TanStack Query retries failed queries at most twice for network errors, `429` and `5xx` responses.
The `Retry-After` response header controls the delay when present. Mutations are never retried.

Mutations must invalidate every affected entity key. `useChangeLeadStatusMutation` invalidates the
lead list, status counters and lead details. `useSaveMatchingDecisionMutation` invalidates the
matching review queue and call details.

The HTTP client performs one shared refresh request when concurrent calls receive `401`, stores the
rotated token pair and repeats each original request once. A failed refresh clears tokens and opens
`/login`. Render `ApiErrorState` for query errors so `403` becomes an inline access state. Use
`applyApiErrorToForm` to attach `422` errors to Ant Design form fields.
