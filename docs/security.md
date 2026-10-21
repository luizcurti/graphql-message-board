# Security notes

CI fails on any **critical** runtime advisory (`npm audit --omit=dev --audit-level=critical`). Lower-severity findings were reviewed:

- **Frontend:** findings come from `react-scripts` build tooling, which is not shipped. The runtime `react-router` open-redirect fix needs a v7 major bump and is deferred.
- **Backend:** `lodash` and `ws` are pinned to patched versions via `overrides`. The rest (`multer`, `qs`/`body-parser`, `uuid`, `@apollo/server`) need a coordinated NestJS/Apollo major upgrade, deferred. They are not reachable through this API: there are no file-upload endpoints and inputs are typed GraphQL, not raw query strings.

This is a point-in-time review — run `npm audit --omit=dev` in each app for current results.
