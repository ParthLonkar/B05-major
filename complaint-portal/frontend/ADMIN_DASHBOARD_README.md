# Admin Dashboard Frontend

This guide covers the standalone admin website in this frontend package. The admin website is a separate Vite entry point (`admin.html`) and does not use the citizen app's phone frame. It uses the existing Express API; this document does not describe backend setup internals.

## Run locally

1. Start MySQL and the complaint API from `complaint-portal/backend`:

   ```powershell
   npm.cmd run dev
   ```

2. Start the frontend from `complaint-portal/frontend`:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

3. Open `http://localhost:3000/admin.html#/login` and sign in with an admin account.

The frontend API base defaults to `http://localhost:5000/api`. To use another API host, set `VITE_API_URL` in the frontend `.env`, for example:

```env
VITE_API_URL=http://localhost:5000/api
```

Restart Vite after changing `.env`.

## Admin website routes

These paths are HashRouter paths after `admin.html#`:

| URL | View |
| --- | --- |
| `/admin.html#/login` | Admin sign-in |
| `/admin.html#/` | Overview dashboard |
| `/admin.html#/reports` | Searchable and filterable report list; select a row to open report details |
| `/admin.html#/heatmap` | Incident map |

Admin sign-in from the citizen portal also redirects to the standalone `admin.html` entry.

## Current API contract

Requests use JSON and the Axios client in `src/services/api.ts`. Once signed in, it sends:

```http
Authorization: Bearer <JWT>
```

### Sign in

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{ "email": "admin@example.com", "password": "..." }
```

Expected success response:

```json
{
  "success": true,
  "data": {
    "user": { "id": "1", "name": "Admin", "email": "admin@example.com", "role": "admin" },
    "token": "<JWT>"
  }
}
```

The frontend stores the user and JWT in `localStorage` as `user` and `authToken`. The admin entry checks that `user.role` is `admin`.

### Overview statistics

```http
GET /api/dashboard/stats
Authorization: Bearer <JWT>
```

Expected `data` shape:

```json
{
  "total": 0,
  "pending": 0,
  "progressed": 0,
  "underConstruction": 0,
  "done": 0,
  "severityCounts": { "low": 0, "medium": 0, "high": 0, "critical": 0 },
  "statusCounts": { "pending": 0, "progressed": 0, "underConstruction": 0, "done": 0 }
}
```

### Reports list and details

```http
GET /api/complaints
Authorization: Bearer <JWT>
```

Expected success response:

```json
{ "success": true, "data": [ /* Complaint objects */ ], "total": 0 }
```

The frontend `Complaint` type is in `src/types/index.ts`. Report objects should include these fields:

| Field | Expected type | Used for |
| --- | --- | --- |
| `id`, `complaintId` | string | React row identity and report/API identifier |
| `fullName`, `mobileNumber` | string | Reporter details |
| `email` | string, optional | Reporter contact |
| `category`, `description` | string | Report content |
| `imagePreview` | string, optional | Original report photo |
| `latitude`, `longitude` | number | Coordinates and map link |
| `address` | string | Human readable location |
| `severity` | `Low \| Medium \| High \| Critical` | Severity indicator |
| `status` | `Pending \| Progressed \| Under Construction \| Done` | Filter and status control |
| `createdAt`, `updatedAt` | ISO date strings | Report timestamps |
| `estimatedCompletion`, `assignedTo`, `notes` | optional string | Additional admin details |

For `imagePreview`, return a data URL, an absolute image URL, or a path such as `/uploads/complaints/example.jpg`. `getImageUrl()` resolves relative paths against the host portion of `VITE_API_URL`.

### Update report status

```http
PUT /api/complaints/:complaintId/status
Authorization: Bearer <JWT>
Content-Type: application/json
```

Request body:

```json
{ "status": "Progressed" }
```

Return `{ "success": true, "data": <updated Complaint> }`. `emailSent` may also be returned by the current backend.

### Incident map

The admin map currently fetches `GET /api/complaints` and plots reports with coordinates. Clicking a marker opens the map popup. The separate `GET /api/dashboard/heatmap` client helper exists, but the current admin map page does not use it.

## Backend integration notes

- Admin report details currently include the complaint, original image, location, and fields returned by `GET /api/complaints`. Keep those response fields aligned with `Complaint` in `src/types/index.ts`.
- The frontend has no saved segmentation masks or depth results to display yet. The model output must be persisted and returned by the API before the admin details panel can show it. Coordinate an API response shape with the backend team, then extend `Complaint` (or add explicit image/detection types) and render those fields in `src/pages/AdminReportsPage.tsx`.
- The database schema has image and detection relations, but the current admin frontend does not receive detection data through the complaint list contract.
- The frontend hides admin routes based on the locally stored role, but that is only a UI guard. Ensure the API independently requires the admin role for report listing, dashboard statistics, status updates, and deletion.
- A browser “Network Error” generally means the API host/port is unreachable, the backend is stopped, or the browser request is blocked. Confirm `VITE_API_URL`, the API health URL (`/api/health`), and CORS configuration.

## Build

From this folder:

```powershell
npm.cmd run build
```

Vite builds both the citizen entry (`index.html`) and the admin entry (`admin.html`).
