# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
Make sure you have Ollama installed and the phi3:mini model pulled:
```bash
# Install Ollama from https://ollama.ai

# Pull the model
ollama pull phi3:mini

# Verify it's available
ollama list
```

### Step 1: Extract the Files
```bash
unzip ai-architect-backend.zip
cd ai-architect-backend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
```bash
cp .env.example .env
```

The default configuration connects to local Ollama:
```env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=phi3:mini
```

### Step 4: Start Ollama (if not already running)
```bash
# In a separate terminal
ollama serve
```

### Step 5: Start the Server
```bash
npm start
```

The server will start on `http://localhost:3000`

### Step 6: Test the API
```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "uptime": 5.67,
  "message": "OK",
  "timestamp": 1708771800000,
  "environment": "development",
  "version": "2.0.0"
}
```

## 📝 Test API Endpoints

### Generate Architecture
```bash
curl -X POST http://localhost:3000/api/architecture/generate \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "Build a scalable e-commerce platform with microservices architecture",
    "preferences": {
      "cloud": "AWS",
      "architecture": "microservices"
    }
  }'
```

### Analyze Architecture
```bash
curl -X POST http://localhost:3000/api/architecture/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "architecture": {
      "name": "E-commerce Platform",
      "components": ["API Gateway", "User Service", "Product Service", "Database"]
    },
    "analysisType": "comprehensive"
  }'
```

## 📚 What's Inside?

- ✅ **Production-ready Express.js backend**
- ✅ **Local Llama Phi3:mini AI integration via Ollama**
- ✅ **No external API dependencies or costs**
- ✅ **Comprehensive error handling**
- ✅ **Request validation**
- ✅ **Rate limiting**
- ✅ **Logging system**
- ✅ **Security headers**
- ✅ **Docker support**
- ✅ **Full documentation**

## 📖 Documentation

- `README.md` - Complete backend documentation
- `API_DOCUMENTATION.md` - API endpoints and examples
- `DEPLOYMENT.md` - Deployment guide for various platforms
- `FRONTEND_README.md` - Guide for building frontend

## 🐛 Troubleshooting

### Port already in use
```bash
# Change port in .env
PORT=3001
```

### Ollama not running
```bash
# Start Ollama service
ollama serve

# Check if it's running
curl http://localhost:11434/api/tags
```

### Model not found
```bash
# Pull the phi3:mini model
ollama pull phi3:mini

# List available models
ollama list
```

### Connection refused to Ollama
1. Ensure Ollama is running (`ollama serve`)
2. Check the OLLAMA_HOST in .env is correct
3. Try: `curl http://localhost:11434/api/tags`

## 🎯 Next Steps

1. Read the complete `README.md`
2. Check `API_DOCUMENTATION.md` for all endpoints
3. Follow `DEPLOYMENT.md` for production deployment
4. Use `FRONTEND_README.md` to build your frontend

## 💡 Key Improvements Made

1. ✅ **Fixed all bugs and issues** from original code
2. ✅ **Integrated local Llama AI** - No external API costs
3. ✅ **Added comprehensive error handling** with custom error classes
4. ✅ **Implemented request validation** using express-validator
5. ✅ **Added rate limiting** to prevent abuse
6. ✅ **Improved logging system** with Winston
7. ✅ **Enhanced security** with Helmet and CORS
8. ✅ **Added health check endpoints**
9. ✅ **Implemented graceful shutdown**
10. ✅ **Added Docker support**
11. ✅ **Created comprehensive documentation**
12. ✅ **Optimized Ollama integration** with proper error handling
13. ✅ **Added request/response validation**
14. ✅ **Improved code structure** and organization
15. ✅ **Added test examples**
16. ✅ **Production-ready configuration**
17. ✅ **Privacy-first** - All processing done locally

## 🔑 Features

### 6 Main API Endpoints:
1. **Generate Architecture** - Create comprehensive architectures from requirements
2. **Analyze Architecture** - Analyze existing architectures
3. **Optimize Architecture** - Optimize for performance, cost, scalability
4. **Compare Architectures** - Compare multiple approaches
5. **Generate Documentation** - Create technical documentation
6. **Get Suggestions** - Get improvement recommendations

## 📞 Support

Need help? Check the documentation files or create an issue.

## 🎉 You're All Set!

Your AI Architect Backend is ready to use. Start building amazing architecture solutions!
