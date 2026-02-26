# Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Software
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Docker (optional, for containerized deployment)

### API Keys
- Anthropic API Key (required)

---

## Local Development

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-architect-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
PORT=3000
NODE_ENV=development
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CORS_ORIGIN=http://localhost:3001,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=120000
```

### 4. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 5. Test the API
```bash
curl http://localhost:3000/health
```

---

## Production Deployment

### 1. Prepare for Production

Update `.env` for production:
```env
NODE_ENV=production
PORT=3000
ANTHROPIC_API_KEY=your_production_api_key
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=warn
```

### 2. Install Production Dependencies
```bash
npm ci --only=production
```

### 3. Start Production Server
```bash
npm start
```

### 4. Using Process Manager (PM2)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'ai-architect-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Docker Deployment

### 1. Build Docker Image
```bash
docker build -t ai-architect-backend:latest .
```

### 2. Run Container
```bash
docker run -d \
  --name ai-architect-backend \
  -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your_api_key \
  -v $(pwd)/logs:/app/logs \
  ai-architect-backend:latest
```

### 3. Using Docker Compose
```bash
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f
```

Stop services:
```bash
docker-compose down
```

---

## Cloud Deployment

### AWS Deployment

#### Option 1: EC2

1. Launch EC2 Instance (Ubuntu 22.04 LTS)
2. Connect to instance:
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

3. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. Clone and setup:
```bash
git clone <repository-url>
cd ai-architect-backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

5. Setup PM2:
```bash
sudo npm install -g pm2
pm2 start server.js --name ai-architect-backend
pm2 startup
pm2 save
```

6. Configure Nginx (optional):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### Option 2: ECS (Elastic Container Service)

1. Build and push Docker image to ECR
2. Create ECS Task Definition
3. Create ECS Service
4. Configure Application Load Balancer

#### Option 3: AWS Lambda (with API Gateway)

Requires adapting the Express app for serverless:
```bash
npm install serverless-http
```

### Google Cloud Platform

#### Cloud Run

1. Build container:
```bash
gcloud builds submit --tag gcr.io/[PROJECT-ID]/ai-architect-backend
```

2. Deploy:
```bash
gcloud run deploy ai-architect-backend \
  --image gcr.io/[PROJECT-ID]/ai-architect-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ANTHROPIC_API_KEY=your_key
```

### Microsoft Azure

#### Azure Container Instances

1. Create container registry
2. Push Docker image
3. Deploy:
```bash
az container create \
  --resource-group myResourceGroup \
  --name ai-architect-backend \
  --image your-registry.azurecr.io/ai-architect-backend \
  --cpu 1 --memory 1 \
  --registry-username <username> \
  --registry-password <password> \
  --dns-name-label ai-architect-api \
  --ports 3000 \
  --environment-variables ANTHROPIC_API_KEY=your_key
```

### Heroku

1. Install Heroku CLI
2. Login:
```bash
heroku login
```

3. Create app:
```bash
heroku create ai-architect-backend
```

4. Set environment variables:
```bash
heroku config:set ANTHROPIC_API_KEY=your_key
heroku config:set NODE_ENV=production
```

5. Deploy:
```bash
git push heroku main
```

### DigitalOcean

#### App Platform

1. Connect your GitHub repository
2. Configure environment variables
3. Deploy automatically on push

---

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
CORS_ORIGIN=*
```

### Staging
```env
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=https://staging.yourdomain.com
```

### Production
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX_REQUESTS=100
```

---

## SSL/TLS Configuration

### Using Let's Encrypt with Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Using Cloudflare

1. Add your domain to Cloudflare
2. Enable SSL/TLS encryption mode: Full (strict)
3. Update DNS records

---

## Monitoring & Maintenance

### Health Checks

Kubernetes health check:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Logging

View logs in production:
```bash
# PM2
pm2 logs ai-architect-backend

# Docker
docker logs -f ai-architect-backend

# Direct logs
tail -f logs/combined.log
tail -f logs/error.log
```

### Monitoring Tools

1. **PM2 Monitoring**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
```

2. **Application Performance Monitoring (APM)**
   - New Relic
   - Datadog
   - AppDynamics

3. **Log Management**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Splunk
   - CloudWatch (AWS)

### Backup Strategy

1. **Environment Variables**: Store securely in secret manager
2. **Logs**: Regular rotation and archival
3. **Configuration**: Version control with Git

### Updates & Maintenance

```bash
# Update dependencies
npm update

# Security audit
npm audit
npm audit fix

# Check for outdated packages
npm outdated
```

---

## Performance Optimization

### 1. Enable Compression
Already enabled in the application via `compression` middleware.

### 2. Use CDN
Configure CDN (CloudFront, Cloudflare) for static assets.

### 3. Database Connection Pooling
If using databases, configure connection pooling.

### 4. Caching
Implement Redis for caching frequent requests.

### 5. Load Balancing
Use Nginx, HAProxy, or cloud load balancers.

---

## Security Best Practices

1. **Environment Variables**: Never commit `.env` to version control
2. **API Keys**: Rotate regularly
3. **HTTPS**: Always use SSL/TLS in production
4. **Rate Limiting**: Configure appropriate limits
5. **CORS**: Restrict to specific domains
6. **Security Headers**: Already configured via Helmet
7. **Dependencies**: Keep updated and audit regularly
8. **Firewall**: Configure firewall rules
9. **Monitoring**: Set up alerts for suspicious activities

---

## Troubleshooting

### Common Issues

1. **Port already in use**
```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>
```

2. **API key not working**
- Verify key is correct in `.env`
- Check Anthropic API status
- Verify network connectivity

3. **High memory usage**
- Check for memory leaks
- Reduce concurrent requests
- Increase server resources

4. **Slow responses**
- Check network latency
- Verify API timeout settings
- Monitor Claude API response times

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

---

## Rollback Procedure

### PM2
```bash
pm2 stop ai-architect-backend
# Restore previous version
pm2 start ecosystem.config.js
```

### Docker
```bash
docker stop ai-architect-backend
docker rm ai-architect-backend
docker run -d --name ai-architect-backend ai-architect-backend:previous-tag
```

### Git
```bash
git checkout previous-commit-hash
npm install
npm start
```

---

## Support & Resources

- API Documentation: See `API_DOCUMENTATION.md`
- Backend README: See `README.md`
- Frontend Guide: See `FRONTEND_README.md`
- GitHub Issues: Report bugs and request features

---

## Checklist for Production

- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] Security headers enabled
- [ ] Health checks working
- [ ] Error handling tested
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] API keys secured
- [ ] Auto-scaling configured (if applicable)
- [ ] Disaster recovery plan documented
