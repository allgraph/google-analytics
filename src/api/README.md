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
