# AI Architect Frontend

Frontend application for the AI Architect Backend service.

## 🚀 Overview

This document provides guidance for building a frontend application to interact with the AI Architect Backend API. The backend provides comprehensive software architecture services powered by Claude AI.

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0 or yarn
- Modern web browser

## 🎯 Recommended Tech Stack

### Option 1: React + Vite
```bash
npm create vite@latest ai-architect-frontend -- --template react
cd ai-architect-frontend
npm install
```

### Option 2: Next.js
```bash
npx create-next-app@latest ai-architect-frontend
cd ai-architect-frontend
```

### Option 3: Vue.js
```bash
npm create vue@latest ai-architect-frontend
cd ai-architect-frontend
npm install
```

## 📦 Required Dependencies

```bash
npm install axios
npm install react-router-dom  # For React routing
npm install @tanstack/react-query  # For data fetching
npm install react-hook-form  # For form management
npm install zod  # For validation
npm install tailwindcss  # For styling
npm install react-markdown  # For rendering markdown responses
npm install react-syntax-highlighter  # For code highlighting
```

## 🏗️ Recommended Project Structure

```
ai-architect-frontend/
├── public/
├── src/
│   ├── api/
│   │   └── architectureApi.js      # API client
│   ├── components/
│   │   ├── common/                 # Reusable components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Loading.jsx
│   │   │   └── ErrorMessage.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── Sidebar.jsx
│   │   └── features/
│   │       ├── ArchitectureGenerator.jsx
│   │       ├── ArchitectureAnalyzer.jsx
│   │       ├── ArchitectureOptimizer.jsx
│   │       ├── ArchitectureComparison.jsx
│   │       ├── DocumentationGenerator.jsx
│   │       └── SuggestionViewer.jsx
│   ├── hooks/
│   │   ├── useArchitecture.js
│   │   └── useApi.js
│   ├── utils/
│   │   ├── api.js
│   │   ├── validation.js
│   │   └── formatting.js
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Generate.jsx
│   │   ├── Analyze.jsx
│   │   ├── Optimize.jsx
│   │   ├── Compare.jsx
│   │   └── Documentation.jsx
│   ├── styles/
│   │   └── globals.css
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
└── README.md
```

## 🔌 API Integration

### Create API Client

Create `src/api/architectureApi.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

export const architectureApi = {
  generateArchitecture: async (data) => {
    const response = await apiClient.post('/architecture/generate', data);
    return response.data;
  },

  analyzeArchitecture: async (data) => {
    const response = await apiClient.post('/architecture/analyze', data);
    return response.data;
  },

  optimizeArchitecture: async (data) => {
    const response = await apiClient.post('/architecture/optimize', data);
    return response.data;
  },

  compareArchitectures: async (data) => {
    const response = await apiClient.post('/architecture/compare', data);
    return response.data;
  },

  generateDocumentation: async (data) => {
    const response = await apiClient.post('/architecture/documentation', data);
    return response.data;
  },

  getArchitectureSuggestions: async (data) => {
    const response = await apiClient.post('/architecture/suggestions', data);
    return response.data;
  },

  checkHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};
```

## 🎨 UI Components Examples

### Architecture Generator Component

```jsx
import { useState } from 'react';
import { architectureApi } from '../api/architectureApi';

export const ArchitectureGenerator = () => {
  const [requirements, setRequirements] = useState('');
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await architectureApi.generateArchitecture({
        requirements,
        preferences,
        constraints: {}
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Generate Architecture</h1>
      
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Requirements
          </label>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className="w-full p-3 border rounded-lg"
            rows={6}
            placeholder="Describe your system requirements..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Generating...' : 'Generate Architecture'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 p-6 bg-white border rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Generated Architecture</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
```

### Custom Hook for API Calls

```javascript
import { useState } from 'react';

export const useApi = (apiFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, execute, reset };
};
```

## 🎨 Styling Recommendations

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}
```

## 📱 Responsive Design

Ensure your components are responsive:

```jsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Your components */}
  </div>
</div>
```

## 🔐 Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=AI Architect
VITE_REQUEST_TIMEOUT=120000
```

## 🧪 Testing

### Unit Tests with Vitest

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Example test:
```javascript
import { render, screen } from '@testing-library/react';
import { ArchitectureGenerator } from './ArchitectureGenerator';

describe('ArchitectureGenerator', () => {
  it('renders the component', () => {
    render(<ArchitectureGenerator />);
    expect(screen.getByText('Generate Architecture')).toBeInTheDocument();
  });
});
```

## 📊 State Management Options

### Option 1: React Context
For simple state management

### Option 2: Zustand
For lightweight global state

```bash
npm install zustand
```

### Option 3: Redux Toolkit
For complex applications

```bash
npm install @reduxjs/toolkit react-redux
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deployment Options

1. **Vercel** (Recommended for Next.js)
```bash
npm install -g vercel
vercel
```

2. **Netlify**
```bash
npm install -g netlify-cli
netlify deploy
```

3. **AWS S3 + CloudFront**
4. **Docker**

## 🎯 Key Features to Implement

1. **Architecture Generator**
   - Input form for requirements
   - Real-time validation
   - Loading states
   - Result visualization

2. **Architecture Analyzer**
   - Upload/paste architecture
   - Analysis type selection
   - Detailed results display

3. **Architecture Optimizer**
   - Current architecture input
   - Optimization goals selection
   - Before/after comparison

4. **Architecture Comparison**
   - Multiple architecture inputs
   - Comparison criteria selection
   - Side-by-side comparison view

5. **Documentation Generator**
   - Architecture input
   - Documentation type selection
   - Markdown rendering

6. **Suggestions Viewer**
   - Problem areas input
   - Prioritized suggestions
   - Implementation guidance

## 🔄 Real-time Updates

For real-time updates, consider:

1. **Server-Sent Events (SSE)**
2. **WebSockets**
3. **Polling** (simplest approach)

## 📈 Performance Optimization

1. **Code Splitting**
```javascript
const ArchitectureGenerator = lazy(() => import('./ArchitectureGenerator'));
```

2. **Memoization**
```javascript
const MemoizedComponent = memo(Component);
```

3. **Virtual Scrolling**
For large lists, use `react-window` or `react-virtualized`

## 🎨 UI/UX Best Practices

1. **Loading States**: Show spinners or skeleton screens
2. **Error Handling**: Display user-friendly error messages
3. **Validation**: Provide real-time form validation
4. **Accessibility**: Use semantic HTML and ARIA labels
5. **Responsive Design**: Mobile-first approach
6. **Dark Mode**: Implement theme switching

## 📱 Progressive Web App (PWA)

Add PWA support with Vite:

```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AI Architect',
        short_name: 'AI Arch',
        description: 'AI-powered architecture tool',
      }
    })
  ]
}
```

## 🔍 SEO Optimization

For Next.js applications:

```javascript
import Head from 'next/head';

export default function Page() {
  return (
    <>
      <Head>
        <title>AI Architect - Generate Software Architectures</title>
        <meta name="description" content="..." />
      </Head>
      {/* Your content */}
    </>
  );
}
```

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Axios Documentation](https://axios-http.com)
- [React Router Documentation](https://reactrouter.com)

## 🤝 Contributing

1. Follow the component structure
2. Write tests for new features
3. Use TypeScript for type safety
4. Follow ESLint rules
5. Write meaningful commit messages

## 📄 License

MIT License

## 🆘 Support

For issues, create a GitHub issue or contact support.
