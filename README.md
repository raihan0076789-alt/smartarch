# 🏠 SmartArch — Full Stack AI-Powered Architecture Application

A complete house architecture design tool with AI chat, 3D visualization, multi-floor design, drag-and-drop rooms/doors/windows/staircases, export to CAD/OBJ/STL/GLTF, Google OAuth, email verification, support tickets, and Ollama integration.

---

## 📁 Project Structure

```
smartarch
│
├── frontend
│   │
│   ├── css
│   │   ├── admin.css
│   │   ├── architect.css
│   │   ├── dashboard.css
│   │   └── styles.css
│   │
│   ├── js
│   │   ├── admin.js
│   │   ├── api.js
│   │   ├── architect.js
│   │   ├── auth.js
│   │   ├── dashboard-charts.js
│   │   ├── dashboard-profile.js
│   │   ├── dashboard.js
│   │   ├── interior.js
│   │   └── templates.js
│   │
│   ├── about.html
│   ├── admin-login.html
│   ├── admin.html
│   ├── architect.html
│   ├── contact.html
│   ├── dashboard.html
│   ├── index.html
│   ├── privacy.html
│   ├── reset-password.html
│   └── terms.html
│
├── backend-main
│   │
│   ├── config
│   │   └── db.js
│   │
│   ├── controllers
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── feedbackController.js
│   │   ├── modelController.js
│   │   ├── projectController.js
│   │   └── ticketController.js
│   │
│   ├── middleware
│   │   ├── adminAuth.js
│   │   ├── auth.js
│   │   └── validation.js
│   │
│   ├── models
│   │   ├── ModelVersion.js
│   │   ├── Project.js
│   │   ├── Ticket.js
│   │   └── User.js
│   │
│   ├── routes
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── modelRoutes.js
│   │   ├── projectRoutes.js
│   │   └── ticketRoutes.js
│   │
│   ├── utils
│   │   ├── modelGenerator.js
│   │   ├── sendEmail.js
│   │   ├── verifyEmail.js
│   │   └── welcomeEmail.js
│   │
│   ├── package.json
│   └── server.js
│
├── backend-ai
│   │
│   ├── controllers
│   │   ├── architectureController.js
│   │   └── feedbackController.js
│   │
│   ├── logs
│   │
│   ├── middleware
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── requestLogger.js
│   │   └── validators.js
│   │
│   ├── routes
│   │   └── architectureRoutes.js
│   │
│   ├── services
│   │   └── architectureService.js
│   │
│   ├── tests
│   │   └── api.test.js
│   │
│   ├── utils
│   │   ├── errors.js
│   │   └── logger.js
│   │
│   ├── .env.example
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT.md
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── FRONTEND_README.md
│   ├── IMPROVEMENTS.md
│   ├── OLLAMA_SETUP.md
│   ├── package.json
│   ├── QUICKSTART.md
│   ├── README.md
│   └── server.js
│
├── package.json
└── README.md
```

---

## 🚀 Running the Project

### Prerequisites

1. **Node.js** v18+ — https://nodejs.org
2. **MongoDB** — https://www.mongodb.com/try/download/community
3. **Ollama** (for AI features) — https://ollama.ai

---

### Step 1: Set up MongoDB

Make sure MongoDB is running:
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Ubuntu/Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

---

### Step 2: Set up Ollama (for AI Chat)

Install Ollama from https://ollama.ai, then pull the model:
```bash
ollama pull phi3:mini
```

Start Ollama server:
```bash
ollama serve
# Ollama runs on port 11434 by default
```

---

### Step 3: Install & Run Main Backend (Port 5000)

```bash
cd backend-main
npm install
npm start
# Or for development with auto-reload:
npm run dev
```

**Expected output:**
```
🏠 House Architect Backend running on port 5000
🌍 Environment: development
📡 API available at http://localhost:5000/api
💾 Database: mongodb://localhost:27017/house_architect
```

---

### Step 4: Install & Run AI Backend (Port 3001)

```bash
cd backend-ai
npm install
npm start
# Or:
npm run dev
```

**Expected output:**
```
AI Architect Backend Server running on port 3001
Health check available at http://localhost:3001/health
```

---

### Step 5: Open the Frontend

**Option A — Direct browser open:**
```bash
# Just open the file in your browser
open frontend/index.html         # macOS
start frontend/index.html        # Windows
xdg-open frontend/index.html     # Linux
```

**Option B — Serve with a local server (recommended for API calls):**
```bash
# Using Python
cd frontend
python3 -m http.server 3000
# Open http://localhost:3000

# Using Node.js http-server
npx http-server frontend -p 3000
# Open http://localhost:3000

# Using VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

---

## 🎯 Features

### ✅ Authentication & User Management
- **Register / Login** — Email + password with JWT authentication
- **Google OAuth** — Sign in with Google (access-token flow)
- **Email Verification** — OTP-based email verification on signup
- **Forgot / Reset Password** — Token-based password reset via email
- **User Roles** — `user`, `architect`, `admin`
- **Profile Management** — Update name, company, phone, avatar, preferences (theme, units, auto-save)
- **Account Suspension** — Admin can suspend/unsuspend users

### ✅ Design Canvas (architect.html)
- **Drag & Drop Rooms** — Click Room tool, click canvas to add rooms
- **Resize Rooms** — 8 handles on corners/edges (NW, N, NE, W, E, SW, S, SE)
- **Door Placement** — Press D, click near room wall to place door, drag to reposition
- **Window Placement** — Press W, click near room wall to place window, drag to reposition
- **Staircase Placement** — Press S, click canvas to place a staircase room
- **Undo / Redo** — Up to 60 undo steps (Ctrl+Z / Ctrl+Y)
- **Zoom** — Mouse wheel zoom on canvas
- **3D Model View** — Full 3D with proper floor stacking
- **Multi-Floor Support** — Floors stack with correct heights
- **Interior View** — 3D furnished walkthrough
- **Style System** — Modern, Minimalist, Traditional, Luxury
- **Auto Layout** — Smart room arrangement
- **Templates** — Pre-built house layouts

### ✅ AI Features
- **Ollama AI Chat** — Chat with AI about your design (right sidebar)
- **AI Architecture Generator** — Generate layout ideas from text description
- **Floorplan Image Upload** — Upload a floorplan image and parse it with AI
- **AI Design Suggestions** — Proactive suggestions for interior, exterior, layout, and materials
- **AI Design Feedback** — Get scored feedback on your project design
- **Rate Limiting** — 100 requests per 15 minutes per IP

### ✅ Export
- **JSON** — Export project data as JSON
- **SVG** — Export floor plan as SVG
- **DXF (CAD)** — Export 2D floor plan for AutoCAD (via AI backend)
- **OBJ** — Export 3D model as OBJ + MTL files (via AI backend)
- **STL** — Export 3D model for 3D printing (via AI backend)
- **GLB (GLTF)** — Export 3D model as binary glTF 2.0 (via AI backend)

### ✅ Project Management
- **Save / Load Projects** — Full project persistence in MongoDB
- **Version History** — View and restore previous project versions
- **Collaborators** — Add collaborators with `viewer`, `editor`, or `admin` roles
- **Project Status** — `draft`, `in_progress`, `review`, `approved`, `archived`
- **Project Types** — `residential`, `commercial`, `industrial`, `mixed`
- **AI Feedback Storage** — Save and retrieve AI feedback per project

### ✅ Admin Panel (admin.html)
- **Dashboard Stats** — Users, projects, AI score analytics
- **User Management** — List, view, suspend/unsuspend, delete users
- **Project Management** — List, view, toggle visibility, delete projects
- **Support Tickets** — View all tickets, reply, update status, unread count

### ✅ Support Ticket System
- **Guest + User Tickets** — Submit tickets without an account or while logged in
- **Threaded Replies** — Admin and user can exchange messages per ticket
- **Status Tracking** — `new`, `seen`, `replied`, `closed`
- **Unread Badges** — Separate unread counts for users and admins

### 🔑 Keyboard Shortcuts
| Key | Action |
|-----|--------|
| V | Select tool |
| R | Add room tool |
| D | Door tool |
| W | Window tool |
| S | Staircase tool |
| M | Measure tool |
| Ctrl+S | Save project |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Del / Backspace | Delete selected room |
| Esc | Cancel current tool |

### 🛠️ Tools
- **Select** — Click to select, drag to move, 8-handle resize
- **Room** — Click on canvas to add room at that position
- **Door** — Click near a room wall edge to place door; drag placed door to move it
- **Window** — Click near a room wall edge to place window; drag placed window to move it
- **Staircase** — Click on canvas to place a staircase
- **Measure** — Measurement tool

---

## 🌐 API Endpoints

### Main Backend (Port 5000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/google | Google OAuth (ID token) |
| POST | /api/auth/google-profile | Google OAuth (access token) |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/profile | Update profile |
| PUT | /api/auth/password | Update password |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/verify-otp | Verify email OTP |
| POST | /api/auth/resend-verification | Resend verification OTP |
| POST | /api/auth/forgot-password | Request password reset email |
| PUT | /api/auth/reset-password/:token | Reset password |
| GET | /api/projects | Get all projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| POST | /api/projects/:id/collaborators | Add collaborator |
| GET | /api/projects/:id/versions | Get version history |
| POST | /api/projects/:id/versions/:versionId/restore | Restore version |
| GET | /api/projects/:id/ai-feedback | Get AI feedback |
| PUT | /api/projects/:id/ai-feedback | Save AI feedback |
| POST | /api/models/:projectId/floorplan | Generate floor plan model |
| POST | /api/models/:projectId/3d | Generate 3D model |
| GET | /api/models/:projectId/stats | Get model stats |
| GET | /api/models/:projectId/export/:format | Export model |
| POST | /api/admin/login | Admin login |
| GET | /api/admin/dashboard | Dashboard stats |
| GET | /api/admin/users | List all users |
| GET | /api/admin/users/:id | Get user by ID |
| PATCH | /api/admin/users/:id/status | Suspend / unsuspend user |
| DELETE | /api/admin/users/:id | Delete user |
| GET | /api/admin/projects | List all projects |
| GET | /api/admin/projects/:id | Get project by ID |
| PATCH | /api/admin/projects/:id/visibility | Toggle project visibility |
| DELETE | /api/admin/projects/:id | Delete project |
| GET | /api/admin/ai-scores | AI score analytics |
| POST | /api/tickets | Submit support ticket (guest or user) |
| GET | /api/tickets/my | Get own tickets |
| GET | /api/tickets/my/unread | Get own unread count |
| GET | /api/tickets/admin/all | Admin: list all tickets |
| GET | /api/tickets/admin/unread-count | Admin: unread count |
| GET | /api/tickets/admin/:id | Admin: get ticket |
| POST | /api/tickets/admin/:id/reply | Admin: reply to ticket |
| PATCH | /api/tickets/admin/:id/status | Admin: update ticket status |
| GET | /api/health | Health check |

### AI Backend (Port 3001)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/architecture/floorplan/generate | Generate floor plan from requirements |
| POST | /api/architecture/floorplan/upload-image | Parse uploaded floorplan image |
| POST | /api/architecture/chat | Chat with AI about your design |
| POST | /api/architecture/feedback | Get AI design feedback & score |
| POST | /api/architecture/suggest | Get proactive AI design suggestions |
| POST | /api/architecture/export/cad | Export as DXF (AutoCAD) |
| POST | /api/architecture/export/obj | Export as OBJ + MTL |
| POST | /api/architecture/export/stl | Export as STL (3D printing) |
| POST | /api/architecture/export/gltf | Export as GLB (glTF 2.0) |
| GET | /health | Health check |
| GET | /api/status | Status check |

---

## 🔧 Configuration

### backend-main/.env
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/house_architect
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000

# Email (Nodemailer SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
EMAIL_FROM_NAME=SmartArch
ADMIN_EMAIL=admin@example.com
```

### backend-ai/.env
```env
PORT=3001
NODE_ENV=development
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=phi3:mini
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_REQUEST_SIZE=10mb
```

### frontend/index.html (Google OAuth)
To enable Google Sign-In, set the `GOOGLE_CLIENT_ID` meta tag in `index.html`:
```html
<meta name="google-client-id" content="YOUR_GOOGLE_CLIENT_ID_HERE">
```

---

## 🐛 Troubleshooting

### AI Chat not working?
1. Make sure Ollama is running: `ollama serve`
2. Check model is pulled: `ollama list`
3. Make sure AI backend is on port 3001: `curl http://localhost:3001/health`

### Cannot save project?
1. Make sure main backend is on port 5000: `curl http://localhost:5000/api/health`
2. Make sure MongoDB is running

### 3D not rendering?
- CDN connection required for Three.js
- Check browser console for errors
- Try refreshing after the page fully loads

### Floors not aligned?
- Each floor uses its own height value
- Update floor height in Project Settings and refresh 3D

### Email not sending?
- Set `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` in `backend-main/.env`
- For Gmail, use an App Password (not your account password)

### Google Sign-In not showing?
- Set `GOOGLE_CLIENT_ID` in the `<meta>` tag in `frontend/index.html`
- Make sure the origin is whitelisted in your Google Cloud Console OAuth credentials

### Export (DXF/OBJ/STL/GLB) not working?
- These exports require the AI backend to be running on port 3001
- Check: `curl http://localhost:3001/health`

---

## 📋 Quick Start (All at Once)

Open 4 terminal windows:

**Terminal 1 — MongoDB:**
```bash
mongod
```

**Terminal 2 — Main Backend:**
```bash
cd backend-main && npm install && npm start
```

**Terminal 3 — AI Backend:**
```bash
cd backend-ai && npm install && npm start
```

**Terminal 4 — Frontend:**
```bash
cd frontend && python3 -m http.server 3000
```

Then open: http://localhost:3000