# AI Architect Backend

A production-ready backend service for AI-powered software architecture generation, analysis, and optimization using locally installed Llama Phi3:mini model via Ollama.

## 🚀 Features

- **Architecture Generation**: Generate comprehensive software architectures based on requirements
- **Architecture Analysis**: Analyze existing architectures for strengths, weaknesses, and improvements
- **Architecture Optimization**: Optimize architectures for performance, scalability, cost, and reliability
- **Architecture Comparison**: Compare multiple architecture approaches with detailed analysis
- **Documentation Generation**: Generate comprehensive technical documentation
- **Architecture Suggestions**: Get improvement suggestions for existing architectures
- **Local AI Model**: Uses Llama Phi3:mini running locally via Ollama (no external API required)

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- **Ollama installed with phi3:mini model**

### Installing Ollama and Phi3:mini

1. Install Ollama from [https://ollama.ai](https://ollama.ai)
2. Pull the phi3:mini model:
```bash
ollama pull phi3:mini
```
3. Verify the model is available:
```bash
ollama list
```

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-architect-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=phi3:mini
CORS_ORIGIN=http://localhost:3001,http://localhost:3000
```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📡 API Endpoints

### Health Check
```http
GET /health
```
Returns server health status.

### Service Status
```http
GET /api/status
```
Returns service operational status.

### Generate Architecture
```http
POST /api/architecture/generate
Content-Type: application/json

{
  "requirements": "Build a scalable e-commerce platform",
  "preferences": {
    "cloud": "AWS",
    "architecture": "microservices"
  },
  "constraints": {
    "budget": "moderate",
    "timeline": "6 months"
  }
}
```

### Analyze Architecture
```http
POST /api/architecture/analyze
Content-Type: application/json

{
  "architecture": {
    "name": "E-commerce Platform",
    "components": ["API Gateway", "Services", "Database"]
  },
  "analysisType": "comprehensive"
}
```

### Optimize Architecture
```http
POST /api/architecture/optimize
Content-Type: application/json

{
  "architecture": {
    "name": "E-commerce Platform",
    "components": ["API Gateway", "Services", "Database"]
  },
  "optimizationGoals": ["performance", "scalability", "cost"]
}
```

### Compare Architectures
```http
POST /api/architecture/compare
Content-Type: application/json

{
  "architectures": [
    {
      "name": "Monolithic Architecture",
      "description": "Single deployment unit"
    },
    {
      "name": "Microservices Architecture",
      "description": "Distributed services"
    }
  ],
  "comparisonCriteria": ["performance", "scalability", "cost", "complexity"]
}
```

### Generate Documentation
```http
POST /api/architecture/documentation
Content-Type: application/json

{
  "architecture": {
    "name": "E-commerce Platform",
    "components": ["API Gateway", "Services", "Database"]
  },
  "documentationType": "comprehensive"
}
```

### Get Architecture Suggestions
```http
POST /api/architecture/suggestions
Content-Type: application/json

{
  "currentArchitecture": {
    "name": "E-commerce Platform",
    "components": ["API Gateway", "Services", "Database"]
  },
  "problemAreas": ["performance", "scalability"]
}
```

## 🔒 Security Features

- **Helmet**: Security headers protection
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Request rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation using express-validator
- **Error Handling**: Centralized error handling with detailed logging

## 📊 Logging

The application uses Winston for logging with the following levels:
- `error`: Error messages
- `warn`: Warning messages
- `info`: Informational messages
- `http`: HTTP request logs
- `debug`: Debug messages

Logs are stored in the `logs/` directory:
- `error.log`: Error-level logs
- `combined.log`: All logs

## 🧪 Testing

```bash
npm test
```

## 📁 Project Structure

```
ai-architect-backend/
├── controllers/           # Request handlers
│   └── architectureController.js
├── services/             # Business logic
│   └── architectureService.js
├── routes/               # API routes
│   └── architectureRoutes.js
├── middleware/           # Custom middleware
│   ├── errorHandler.js
│   ├── requestLogger.js
│   ├── rateLimiter.js
│   └── validators.js
├── utils/                # Utility functions
│   ├── logger.js
│   └── errors.js
├── config/               # Configuration files
├── logs/                 # Log files
├── tests/                # Test files
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore file
├── package.json         # Dependencies
├── server.js            # Application entry point
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment (development/production) | development |
| OLLAMA_HOST | Ollama service host URL | http://localhost:11434 |
| OLLAMA_MODEL | Llama model to use | phi3:mini |
| CORS_ORIGIN | Allowed CORS origins | * |
| RATE_LIMIT_WINDOW_MS | Rate limit window in ms | 900000 |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 |
| LOG_LEVEL | Logging level | info |
| MAX_REQUEST_SIZE | Maximum request body size | 10mb |
| REQUEST_TIMEOUT | API request timeout in ms | 120000 |

## 🚨 Error Handling

The API uses standard HTTP status codes:

- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `503`: Service Unavailable
- `504`: Gateway Timeout

Error Response Format:
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400,
  "timestamp": "2024-02-24T10:30:00.000Z",
  "path": "/api/architecture/generate",
  "details": {}
}
```

## 📈 Performance Considerations

- Request timeout: 120 seconds (configurable)
- Rate limiting: 100 requests per 15 minutes per IP
- Request size limit: 10MB
- Compression enabled for responses
- Connection pooling for external API calls

## 🔐 Authentication

Currently, the API does not require authentication. To add authentication:

1. Implement authentication middleware
2. Add JWT token validation
3. Configure protected routes
4. Update CORS settings

## 🐳 Docker Support

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t ai-architect-backend .
docker run -p 3000:3000 --env-file .env ai-architect-backend
```

## 📝 API Response Examples

### Successful Response
```json
{
  "success": true,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "architecture": "...",
    "components": []
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

### Error Response
```json
{
  "error": "Validation Error",
  "message": "Requirements must be between 10 and 10000 characters",
  "statusCode": 400,
  "timestamp": "2024-02-24T10:30:00.000Z",
  "path": "/api/architecture/generate"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License

## 🆘 Support

For support, email support@example.com or create an issue in the repository.

## 🔄 Changelog

### Version 2.0.0
- Complete rewrite with improved architecture
- Integrated with local Llama Phi3:mini via Ollama
- Added comprehensive error handling
- Implemented rate limiting
- Added request validation
- Improved logging system
- Enhanced security features
- Added health check endpoints
- Optimized performance
- No external API dependencies

## 🙏 Acknowledgments

- Ollama for local LLM runtime
- Llama and Microsoft for Phi3 model
- Express.js community
- All contributors

## 📚 Additional Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Phi3 Model Information](https://ollama.com/library/phi3)
- [Express.js Documentation](https://expressjs.com)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
