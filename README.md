# VerifyAI — Universal Multimodal Evidence Verification Platform

VerifyAI is a production-ready, full-stack AI platform that audits and verifies evidence across multiple sectors (Healthcare, Finance, FMCG, Entertainment, Manufacturing, Legal Services) using multimodal LLMs. 

The application is styled with a premium, editorial-style **warm cream and emerald** design, and features a responsive dashboard, detailed criteria checklists, processing timelines, and downloadable PDF audit certificates.

---

## Technical Stack
- **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite (local development) / PostgreSQL (production)
- **Frontend**: React (Vite, SPA), Vanilla CSS Design System, Lucide Icons, React Router
- **AI Core**: Groq Multimodal API (`llama-3.2-11b-vision-preview` for visual + text parsing)
- **Reports**: ReportLab (Python PDF creation)
- **Orchestration**: Docker & Docker Compose

---

## Getting Started

### 1. Prerequisites
Ensure you have the following installed on your local machine:
- **Node.js** (v18 or higher)
- **Python** (3.11 or higher)
- **Docker** & **Docker Compose** (optional, for container runs)

### 2. Obtain Groq API Key
1. Go to the [Groq Console](https://console.groq.com/).
2. Create a free account and navigate to **API Keys**.
3. Generate a new API Key and copy it.

---

## Option A: Run Locally (Fastest for Development)

### Setup the Backend
1. Navigate to the `backend` directory.
2. Create your virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment:
   Open the `.env` file inside `backend/` and set your `GROQ_API_KEY`:
   ```env
   GROQ_API_KEY=gsk_your_actual_groq_api_key_goes_here
   ```
5. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   The backend API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### Setup the Frontend
1. Navigate to the `frontend` directory in a new terminal window.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Access the web application at [http://localhost:5173](http://localhost:5173).

---

## Option B: Run with Docker Compose (Unified Containerization)

Docker Compose starts a PostgreSQL database, builds the FastAPI backend, and serves the static React frontend via Nginx.

1. Open `docker-compose.yml` in the project root.
2. Replace `gsk_your_groq_api_key_goes_here` under the `backend` environment section with your actual Groq key:
   ```yaml
   environment:
     - GROQ_API_KEY=gsk_your_actual_groq_api_key_here
   ```
3. Run the orchestration:
   ```bash
   docker-compose up --build
   ```
4. Access points:
   - **Frontend**: [http://localhost:8080](http://localhost:8080)
   - **Backend Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Running Automated Tests
The backend contains a test suite that automatically tests registering, logging in, fetching profiles, checking history, and compiling admin statistics using an ephemeral in-memory SQLite database.

1. Navigate to the `backend` directory.
2. Install testing dependencies if needed:
   ```bash
   pip install pytest httpx
   ```
3. Run the tests:
   ```bash
   pytest test_api.py -v
   ```

---

## Deployment Guide (Live Hosting)

### 1. Deploy the Backend (FastAPI & PostgreSQL)
You can deploy the FastAPI backend to platforms like **Render**, **Railway**, or **Fly.io**.

#### Deploying on Render:
1. Connect your GitHub repository to Render.
2. Create a new **Web Service**.
3. Select **Python** runtime and set:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT` (set directory to backend) or restructure repo root.
4. Spin up a **Render PostgreSQL** database and copy the database URI.
5. In the Web Service settings, define **Environment Variables**:
   - `DATABASE_URL`: Your Render PostgreSQL database URI.
   - `GROQ_API_KEY`: Your live Groq API key.
   - `JWT_SECRET`: A secure random password signing string.
   - `UPLOAD_DIR`: `/data/uploads` (for persistent storage, mount a disk on `/data`).

---

### 2. Deploy the Frontend (React Vite SPA)
You can deploy the React frontend for free to **Vercel**, **Netlify**, or **GitHub Pages**.

#### Deploying on Vercel:
1. Install Vercel CLI or import the repository inside Vercel Dashboard.
2. Set the project framework to **Vite**.
3. Configure the Root Directory to `frontend`.
4. Add **Environment Variables**:
   - `VITE_API_BASE_URL`: The URL of your deployed backend service (e.g. `https://your-backend.onrender.com/api`).
5. Click **Deploy**. Vercel will compile the assets and provide a premium live URL.

---

## Evaluation Workflow (How to Demo the App)
1. **Interactive Demo**: Visit the landing page at [http://localhost:5173](http://localhost:5173). Scroll to the **Interactive Demo Preview**. Choose "Healthcare", enter a treatment statement, and click "Run Audit Check" to see the AI process visual and text indicators instantly.
2. **Register**: Click **Get Started** and create an account. The very first user to register on the SQLite database is automatically promoted to **Admin** role for testing convenience.
3. **Workspace Dashboard**: Review aggregate statistics and visual SVG graphs.
4. **New Verification**: Go to **New Verification**. Select an industry (e.g., Legal Services) and a type (e.g., Contract Execution Check). Write a contract description, upload a mock document or receipt, and click **Run AI Audit**.
5. **Results Screen**: Review the AI Confidence score, reasoning details (in Markdown), criteria checklist, and process timeline.
6. **Export PDF**: Click **Export PDF Audit Certificate** to download the official ReportLab generated audit document.
7. **Admin Panel**: Click **Admin Panel** in the sidebar (available for the first registered user) to inspect latency charts and system audit logs tracking logins and API requests.
