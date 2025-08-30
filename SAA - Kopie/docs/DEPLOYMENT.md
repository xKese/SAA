# Deployment Guide

This guide covers deployment options for the SAA Portfolio Management System.

## Table of Contents
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Security Configuration](#security-configuration)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Development Deployment

### Local Development Setup

1. **Prerequisites**
   - Python 3.8+
   - Git
   - Code editor (VS Code recommended)

2. **Environment Setup**
   ```bash
   # Clone repository
   git clone <repo-url>
   cd SAA
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Setup environment variables
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # SQLite (default) - no setup needed
   # Creates database automatically on first run
   
   # For PostgreSQL (optional)
   createdb portfolio_dev
   export DATABASE_URL="postgresql://user:password@localhost/portfolio_dev"
   ```

4. **Run Development Server**
   ```bash
   python run.py
   # Access at http://localhost:5000
   ```

### Development Tools

```bash
# Install development dependencies
pip install pytest pytest-cov black flake8 mypy

# Code formatting
black app/ tests/

# Linting
flake8 app/ tests/

# Type checking
mypy app/

# Run tests
pytest --cov=app tests/
```

## Production Deployment

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB+ SSD
- **OS**: Ubuntu 20.04 LTS or newer
- **Python**: 3.8+

### Production Setup

1. **Server Preparation**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install dependencies
   sudo apt install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib supervisor
   
   # Create application user
   sudo useradd -m -d /home/portfolio -s /bin/bash portfolio
   sudo su - portfolio
   ```

2. **Application Setup**
   ```bash
   # Clone and setup application
   git clone <repo-url> /home/portfolio/app
   cd /home/portfolio/app
   
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   pip install gunicorn psycopg2-binary
   ```

3. **Database Configuration**
   ```bash
   # Create PostgreSQL database
   sudo -u postgres psql
   CREATE DATABASE portfolio_prod;
   CREATE USER portfolio_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE portfolio_prod TO portfolio_user;
   \q
   ```

4. **Environment Configuration**
   ```bash
   # Production environment file
   cat > /home/portfolio/app/.env << EOF
   DEBUG=False
   SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
   DATABASE_URL=postgresql://portfolio_user:secure_password@localhost/portfolio_prod
   CLAUDE_API_KEY_ANALYST=your_analyst_key
   CLAUDE_API_KEY_OPTIMIZER=your_optimizer_key
   ALPHA_VANTAGE_API_KEY=your_av_key
   EOF
   ```

5. **Gunicorn Configuration**
   ```bash
   # Create gunicorn config
   cat > /home/portfolio/app/gunicorn.conf.py << EOF
   bind = "127.0.0.1:5000"
   workers = 4
   worker_class = "eventlet"
   worker_connections = 1000
   timeout = 30
   max_requests = 1000
   max_requests_jitter = 100
   preload_app = True
   user = "portfolio"
   group = "portfolio"
   EOF
   ```

6. **Supervisor Configuration**
   ```bash
   # Create supervisor config
   sudo cat > /etc/supervisor/conf.d/portfolio.conf << EOF
   [program:portfolio]
   command=/home/portfolio/app/venv/bin/gunicorn --config gunicorn.conf.py run:app
   directory=/home/portfolio/app
   user=portfolio
   autostart=true
   autorestart=true
   redirect_stderr=true
   stdout_logfile=/var/log/portfolio/app.log
   environment=PATH="/home/portfolio/app/venv/bin"
   EOF
   
   # Create log directory
   sudo mkdir -p /var/log/portfolio
   sudo chown portfolio:portfolio /var/log/portfolio
   
   # Start service
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start portfolio
   ```

7. **Nginx Configuration**
   ```bash
   # Create nginx site config
   sudo cat > /etc/nginx/sites-available/portfolio << EOF
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;
       
       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade \$http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host \$host;
           proxy_set_header X-Real-IP \$remote_addr;
           proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto \$scheme;
           proxy_cache_bypass \$http_upgrade;
           proxy_read_timeout 300s;
       }
       
       location /static {
           alias /home/portfolio/app/app/static;
           expires 1M;
           add_header Cache-Control "public, immutable";
       }
   }
   EOF
   
   # Enable site
   sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

8. **SSL Configuration (Let's Encrypt)**
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Get SSL certificate
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   
   # Auto-renewal
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

## Docker Deployment

### Dockerfile
```dockerfile
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn psycopg2-binary

# Copy project
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5000

# Run application
CMD ["gunicorn", "--config", "gunicorn.conf.py", "run:app"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://portfolio:password@db:5432/portfolio
      - CLAUDE_API_KEY_ANALYST=${CLAUDE_API_KEY_ANALYST}
      - CLAUDE_API_KEY_OPTIMIZER=${CLAUDE_API_KEY_OPTIMIZER}
      - ALPHA_VANTAGE_API_KEY=${ALPHA_VANTAGE_API_KEY}
    depends_on:
      - db
      - redis
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=portfolio
      - POSTGRES_USER=portfolio
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
```

### Build and Deploy
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f web

# Scale web service
docker-compose up -d --scale web=3

# Update application
docker-compose pull
docker-compose up -d
```

## Cloud Deployment

### AWS Deployment (Elastic Beanstalk)

1. **Prepare Application**
   ```bash
   # Create application.py for EB
   from run import app as application
   
   if __name__ == "__main__":
       application.run()
   ```

2. **EB Configuration**
   ```yaml
   # .ebextensions/01_packages.config
   packages:
     yum:
       postgresql-devel: []
   
   # .ebextensions/02_python.config
   option_settings:
     aws:elasticbeanstalk:application:environment:
       PYTHONPATH: "/opt/python/current/app:$PYTHONPATH"
     aws:elasticbeanstalk:container:python:
       WSGIPath: "application.py"
   ```

3. **Deploy**
   ```bash
   # Install EB CLI
   pip install awsebcli
   
   # Initialize and deploy
   eb init
   eb create portfolio-prod
   eb deploy
   ```

### Google Cloud Deployment (App Engine)

1. **app.yaml**
   ```yaml
   runtime: python39
   
   env_variables:
     CLAUDE_API_KEY_ANALYST: "your-key"
     CLAUDE_API_KEY_OPTIMIZER: "your-key"
     DATABASE_URL: "postgresql://user:pass@host/db"
   
   automatic_scaling:
     min_instances: 1
     max_instances: 10
   ```

2. **Deploy**
   ```bash
   gcloud app deploy
   gcloud app browse
   ```

### Digital Ocean App Platform

1. **Deploy Button**
   ```yaml
   # .do/app.yaml
   name: portfolio-management
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/saa-portfolio
       branch: main
     run_command: gunicorn --worker-class eventlet run:app
     environment_slug: python
     instance_count: 1
     instance_size_slug: basic-xxs
     env:
     - key: CLAUDE_API_KEY_ANALYST
       value: ${CLAUDE_API_KEY_ANALYST}
     - key: CLAUDE_API_KEY_OPTIMIZER
       value: ${CLAUDE_API_KEY_OPTIMIZER}
   databases:
   - name: portfolio-db
     engine: PG
     version: "13"
   ```

## Security Configuration

### Environment Security
```bash
# Secure file permissions
chmod 600 .env
chown portfolio:portfolio .env

# Firewall configuration
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Fail2ban for SSH protection
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### Application Security
```python
# config/settings.py security settings
SECURE_HEADERS = True
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
```

### Database Security
```sql
-- Create read-only user for reporting
CREATE USER portfolio_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE portfolio_prod TO portfolio_readonly;
GRANT USAGE ON SCHEMA public TO portfolio_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO portfolio_readonly;
```

## Monitoring & Maintenance

### Application Monitoring
```bash
# Install monitoring tools
pip install sentry-sdk flask-monitoring-dashboard

# System monitoring
sudo apt install htop iotop nethogs
```

### Log Configuration
```python
# config/logging.py
import logging
from logging.handlers import RotatingFileHandler

# Application logging
file_handler = RotatingFileHandler(
    'logs/app.log',
    maxBytes=10240000,  # 10MB
    backupCount=10
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s'
))
```

### Backup Strategy
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Database backup
pg_dump portfolio_prod > "$BACKUP_DIR/db_$DATE.sql"

# Application backup
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" /home/portfolio/app

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Add to crontab: 0 2 * * * /path/to/backup.sh
```

### Health Check Endpoint
```python
@app.route('/health')
def health_check():
    # Check database connectivity
    # Check Claude API connectivity
    # Check disk space
    # Return status
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow()})
```

### Performance Monitoring
```bash
# Setup monitoring dashboard
pip install prometheus-client grafana-api

# Monitor system resources
cat > /etc/prometheus/node_exporter.yml
```

This deployment guide covers all major deployment scenarios from local development to production cloud deployment. Choose the approach that best fits your infrastructure requirements and technical expertise.