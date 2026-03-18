# 🏠 House Architect Pro — Full Stack AI-Powered Application

A complete house architecture design tool with AI chat, 3D visualization, multi-floor design, drag-and-drop doors & windows, and Ollama integration.

---

## 📁 Project Structure

```
house-architect-pro-v2
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
│   │   ├── modelController.js
│   │   └── projectController.js
│   │
│   ├── middleware
│   │   ├── adminAuth.js
│   │   ├── auth.js
│   │   └── validation.js
│   │
│   ├── models
│   │   ├── ModelVersion.js
│   │   ├── Project.js
│   │   └── User.js
│   │
│   ├── routes
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── modelRoutes.js
│   │   └── projectRoutes.js
│   │
│   ├── utils
│   │   ├── modelGenerator.js
│   │   └── sendEmail.js
│   │
│   ├── .env
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
│
├── backend-ai
│   │
│   ├── controllers
│   │   └── architectureController.js
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
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT.md
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── FRONTEND_README.md
│   ├── IMPROVEMENTS.md
│   ├── OLLAMA_SETUP.md
│   ├── package-lock.json
│   ├── package.json
│   ├── QUICKSTART.md
│   ├── README.md
│   └── server.js
│
├── package.json
└── README.md

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

### ✅ Fixed & Working
- **Drag & Drop Rooms** — Click Room tool, click canvas to add rooms
- **Resize Rooms** — Orange handles on corners/edges
- **Door Placement** — Press D, click near room wall to place door, drag to reposition
- **Window Placement** — Press W, click near room wall to place window, drag to reposition
- **3D Model View** — Full 3D with proper floor stacking (floors align correctly)
- **Multi-Floor Support** — Floors stack with correct heights
- **Interior View** — 3D furnished walkthrough
- **Style System** — Modern, Minimalist, Traditional, Luxury
- **Ollama AI Chat** — Chat with AI about your design (right sidebar)
- **AI Architecture Generator** — Generate layout ideas from text description
- **Auto Layout** — Smart room arrangement
- **Templates** — Pre-built house layouts

### 🔑 Keyboard Shortcuts
| Key | Action |
|-----|--------|
| V | Select tool |
| R | Add room tool |
| D | Door tool |
| W | Window tool |
| M | Measure tool |
| Ctrl+S | Save project |
| Del | Delete selected room |
| Esc | Cancel current tool |

### 🛠️ Tools
- **Select** — Click to select, drag to move, handles to resize
- **Room** — Click on canvas to add room at that position
- **Door** — Click near a room wall edge to place door; drag placed door to move it
- **Window** — Click near a room wall edge to place window; drag placed window to move it
- **Measure** — Measurement tool

---

## 🌐 API Endpoints

### Main Backend (Port 5000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/projects | Get all projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| GET | /api/health | Health check |

### AI Backend (Port 3001)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/architecture/chat | Chat with AI about your design |
| POST | /api/architecture/generate | Generate architecture from requirements |
| POST | /api/architecture/analyze | Analyze an architecture |
| POST | /api/architecture/optimize | Optimize architecture |
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
```

### backend-ai/.env
```env
PORT=3001
NODE_ENV=development
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=phi3:mini
CORS_ORIGIN=*
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
- Fixed in new version — each floor uses its own height value
- Update floor height in Project Settings and refresh 3D

---

## 📋 Quick Start (All at Once)

Open 3 terminal windows:

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
