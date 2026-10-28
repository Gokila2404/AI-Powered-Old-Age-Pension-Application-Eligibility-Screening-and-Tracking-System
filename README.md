# Pension Seva

Pension Seva is an academic prototype that helps citizens explore pension schemes, check potential eligibility, prepare applications, upload and review documents, and track application status. It includes a citizen portal, an administrative review portal, email OTP verification, and English/Tamil accessibility features.

> **Prototype notice:** Pension Seva is not an official government portal. Eligibility results are guidance only; the relevant government authority makes final decisions.

## Requirements

- Node.js 18 or newer and npm
- Python 3.10 or newer
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- Tesseract OCR installed and available on `PATH` for document text extraction (optional; other application features can still be used without it)
- An SMTP email account for OTP delivery. SMS OTP is not supported.

The application uses MongoDB for users, schemes, applications, and other portal data. Document traceability metadata is stored in SQLite by default (`backend/traceability.sqlite3`). Uploaded documents are stored under `backend/uploads/`.

## Setup

Run these commands from the project root.

### 1. Install frontend dependencies

```powershell
npm install
```

### 2. Create and activate a Python environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 3. Configure environment variables

Create a local environment file from the template:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux, use `cp .env.example .env`. Edit `.env` and configure at least:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. The template uses `mongodb://localhost:27017`. |
| `MONGODB_DATABASE` | MongoDB database name. |
| `JWT_SECRET_KEY` | Secret used to sign authentication tokens and protect OTP hashes. Replace the template value with a long, random secret. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` | SMTP server settings required to send real OTP email. Keep credentials private. |
| `SMTP_USE_SSL`, `SMTP_USE_TLS` | Choose the security mode required by your SMTP provider. |
| `CORS_ORIGINS` | Comma-separated frontend origins. The defaults allow local Vite development. |
| `DOCUMENT_ENCRYPTION_KEY` | Optional dedicated secret for encrypted document traceability data. If blank, the app derives encryption from `JWT_SECRET_KEY`; keep that secret stable so existing data remains readable. |
| `GEMINI_API_KEY` | Optional key for external Gemini integration. |

The template also documents server ports, upload size, and OTP expiry, resend, and attempt limits. The backend reads the project-root `.env` automatically. Do not commit `.env` or share its secrets.

## Run the application

Start MongoDB first. Then open two terminals in the project root.

### Terminal 1: backend API

Activate the virtual environment as shown above, then run:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The API is available at <http://127.0.0.1:8000>. Interactive API documentation is at <http://127.0.0.1:8000/docs>, and the health endpoint is <http://127.0.0.1:8000/api/health>. Check that the health response reports `mongodb_connected: true` when using MongoDB-backed data.

### Terminal 2: frontend

```bash
npm run dev
```

Open the local URL printed by Vite, usually <http://localhost:5173>. Vite proxies `/api` requests to the backend on port 8000.

## Local demo accounts

On first startup, the backend seeds a demo citizen, a configured administrator, sample schemes, and demo application data when those records are absent.

| Role | Email | Password |
| --- | --- | --- |
| Citizen | `citizen@pensionseva.in` | `Citizen@123` |
| Administrator | `admin@pensionseva.in` | `Admin@123` by default |

Email OTP is required after a valid password. Configure working SMTP settings to complete sign-in. Administrator credentials can be changed with `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. These credentials are for local demonstration only; set unique credentials before sharing a development environment, and never use the defaults in a deployed system.

## Useful commands

```bash
npm run build       # Build the frontend into dist/
npm run preview     # Serve the built frontend locally
npm run db:verify   # Verify MongoDB connectivity and Mongoose model loading
```

The database verification command requires MongoDB to be reachable and uses the same `MONGODB_URI` and database name settings.

## Troubleshooting

- **MongoDB connection is unavailable:** Start MongoDB and confirm `MONGODB_URI` and `MONGODB_DATABASE` in `.env`. The health endpoint reports the connection state.
- **OTP email fails:** Check all SMTP fields, the provider's SSL/TLS requirements, and that the sender address is allowed. OTP delivery is email-only; there is no development OTP bypass.
- **Document text is not extracted:** Install Tesseract OCR and ensure its executable is on `PATH`, then restart the backend. The app can report document quality without the OCR executable, but text extraction will be unavailable.
- **Frontend cannot reach the API:** Keep the backend on port 8000 or update the proxy in `vite.config.js`. If using a different frontend origin, add it to `CORS_ORIGINS`.

## Main project structure

```text
src/                    React/Vite citizen and admin interfaces
  components/layout/    Shared navigation and footer
  pages/applicant/      Citizen pages and OTP flow
  pages/admin/          Administrative pages
  context/              Shared authentication and application state
backend/                FastAPI API, MongoDB access, and services
  routes/               API route groups
  services/             OTP, eligibility, document, and scheme services
  traceability/         SQLite-backed document audit records
  uploads/              Uploaded document files
.env.example            Environment variable template
requirements.txt        Python backend dependencies
package.json            Frontend scripts and dependencies
```
