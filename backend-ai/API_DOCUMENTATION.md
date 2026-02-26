# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, no authentication is required. Authentication can be added as needed.

## Rate Limiting
- Window: 15 minutes
- Max Requests: 100 per IP address
- Excluded Endpoints: `/health`, `/api/status`

## Common Headers
```http
Content-Type: application/json
Accept: application/json
```

## Response Format

### Success Response
```json
{
  "success": true,
  "requestId": "uuid-v4",
  "data": {},
  "timestamp": "ISO-8601 timestamp"
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400,
  "timestamp": "ISO-8601 timestamp",
  "path": "/api/endpoint",
  "details": {}
}
```

## Endpoints

### 1. Generate Architecture

Generate a comprehensive software architecture based on requirements.

**Endpoint:** `POST /api/architecture/generate`

**Request Body:**
```json
{
  "requirements": "string (10-10000 characters, required)",
  "preferences": {
    "cloud": "AWS | Azure | GCP",
    "architecture": "monolithic | microservices | serverless",
    "database": "SQL | NoSQL | mixed"
  },
  "constraints": {
    "budget": "low | moderate | high",
    "timeline": "string",
    "team_size": "number"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "requestId": "uuid",
  "data": {
    "architecture": {
      "overview": "string",
      "components": [],
      "technology_stack": {},
      "data_flow": "string",
      "scalability": "string",
      "security": "string",
      "deployment": "string",
      "challenges": []
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/architecture/generate \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "Build a scalable e-commerce platform with real-time inventory management",
    "preferences": {
      "cloud": "AWS",
      "architecture": "microservices"
    },
    "constraints": {
      "budget": "moderate",
      "timeline": "6 months"
    }
  }'
```

---

### 2. Analyze Architecture

Analyze an existing architecture for strengths, weaknesses, and improvements.

**Endpoint:** `POST /api/architecture/analyze`

**Request Body:**
```json
{
  "architecture": {
    "name": "string",
    "components": [],
    "technologies": [],
    "description": "string"
  },
  "analysisType": "comprehensive | security | performance | scalability | cost"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "requestId": "uuid",
  "data": {
    "analysis": {
      "assessment": "string",
      "strengths": [],
      "weaknesses": [],
      "security": {},
      "performance": {},
      "scalability": {},
      "recommendations": [],
      "risk_assessment": {},
      "cost_optimization": []
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/architecture/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "architecture": {
      "name": "E-commerce Platform",
      "components": ["API Gateway", "User Service", "Product Service", "Database"],
      "technologies": ["Node.js", "PostgreSQL", "Redis"]
    },
    "analysisType": "comprehensive"
  }'
```

---

### 3. Optimize Architecture

Optimize an architecture based on specific goals.

**Endpoint:** `POST /api/architecture/optimize`

**Request Body:**
```json
{
  "architecture": {
    "name": "string",
    "components": [],
    "current_issues": []
  },
  "optimizationGoals": ["performance", "scalability", "cost", "reliability"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "requestId": "uuid",
  "data": {
    "optimization": {
      "optimized_architecture": {},
      "key_changes": [],
      "expected_benefits": {},
      "implementation_complexity": "string",
      "trade_offs": [],
      "migration_strategy": "string",
      "metrics": [],
      "cost_implications": {}
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

---

### 4. Compare Architectures

Compare multiple architecture approaches.

**Endpoint:** `POST /api/architecture/compare`

**Request Body:**
```json
{
  "architectures": [
    {
      "name": "Monolithic Architecture",
      "description": "string",
      "components": []
    },
    {
      "name": "Microservices Architecture",
      "description": "string",
      "components": []
    }
  ],
  "comparisonCriteria": ["performance", "scalability", "cost", "complexity"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "requestId": "uuid",
  "data": {
    "comparison": {
      "comparison_matrix": {},
      "detailed_analysis": {},
      "strengths_weaknesses": [],
      "use_case_recommendations": {},
      "overall_recommendation": "string",
      "decision_factors": [],
      "risk_comparison": {},
      "cost_comparison": {}
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

---

### 5. Generate Documentation

Generate comprehensive technical documentation.

**Endpoint:** `POST /api/architecture/documentation`

**Request Body:**
```json
{
  "architecture": {
    "name": "string",
    "components": [],
    "description": "string"
  },
  "documentationType": "comprehensive | technical | executive | operational"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "requestId": "uuid",
  "data": {
    "documentation": {
      "executive_summary": "string",
      "architecture_overview": "string",
      "component_descriptions": [],
      "data_flow_diagrams": "string",
      "api_specifications": {},
      "deployment_procedures": "string",
      "monitoring": "string",
      "troubleshooting": "string",
      "glossary": {}
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

---

### 6. Get Architecture Suggestions

Get improvement suggestions for existing architecture.

**Endpoint:** `POST /api/architecture/suggestions`

**Request Body:**
```json
{
  "currentArchitecture": {
    "name": "string",
    "components": [],
    "technologies": []
  },
  "problemAreas": ["performance", "scalability", "security"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "requestId": "uuid",
  "data": {
    "suggestions": {
      "identified_issues": [],
      "prioritized_suggestions": [],
      "detailed_solutions": [],
      "implementation_complexity": {},
      "expected_benefits": {},
      "quick_wins": [],
      "long_term_improvements": [],
      "risk_mitigation": [],
      "alternative_approaches": []
    }
  },
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

---

## Health Endpoints

### Check Health
**Endpoint:** `GET /health`

**Response:** `200 OK`
```json
{
  "uptime": 12345.67,
  "message": "OK",
  "timestamp": 1708771800000,
  "environment": "development",
  "version": "2.0.0"
}
```

### Check Status
**Endpoint:** `GET /api/status`

**Response:** `200 OK`
```json
{
  "status": "operational",
  "service": "AI Architect Backend",
  "version": "2.0.0",
  "timestamp": "2024-02-24T10:30:00.000Z"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

---

## Rate Limit Headers

When rate limited, the following headers are included:

```http
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1708772400
Retry-After: 600
```

---

## Best Practices

1. **Error Handling**: Always check the response status code
2. **Retries**: Implement exponential backoff for retries
3. **Timeouts**: Set appropriate request timeouts (recommended: 120s)
4. **Logging**: Log request IDs for debugging
5. **Validation**: Validate input data before sending requests
6. **Rate Limiting**: Respect rate limits and implement backoff

---

## Examples in Different Languages

### JavaScript (Axios)
```javascript
const axios = require('axios');

async function generateArchitecture() {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/architecture/generate',
      {
        requirements: 'Build a scalable platform',
        preferences: { cloud: 'AWS' }
      },
      { timeout: 120000 }
    );
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

### Python (Requests)
```python
import requests

url = 'http://localhost:3000/api/architecture/generate'
data = {
    'requirements': 'Build a scalable platform',
    'preferences': {'cloud': 'AWS'}
}

response = requests.post(url, json=data, timeout=120)
if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.json()}")
```

### cURL
```bash
curl -X POST http://localhost:3000/api/architecture/generate \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "Build a scalable platform",
    "preferences": {"cloud": "AWS"}
  }' \
  --max-time 120
```

---

## Websocket Support (Future)

Coming soon: Real-time streaming of architecture generation responses.

---

## Versioning

Current API Version: `v1`

Future versions will be accessible via: `/api/v2/...`

---

## Support

For API support:
- Email: support@example.com
- GitHub Issues: Create an issue
- Documentation: Check README.md
