# Vultr VPS Deployment Guide

## Server Specifications
- **Provider**: Vultr VPS
- **Resources**: 2 CPUs, 4GB RAM, 50GB Bandwidth
- **Domain**: mcp.titespec.com
- **OS**: Ubuntu 22.04 LTS (recommended)

## Initial Server Setup

### 1. Connect to Your VPS
```bash
ssh root@your-server-ip
```

### 2. Update System Packages
```bash
apt update && apt upgrade -y
```

### 3. Install Required Software
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install additional dependencies
apt install -y nginx git pm2 ufw certbot python3-certbot-nginx

# Verify installations
node --version
npm --version
nginx -v
```

### 4. Configure Firewall
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 5. Create Application User
```bash
adduser --system --group --home /opt/mcp-server mcp
mkdir -p /opt/mcp-server
chown mcp:mcp /opt/mcp-server
```

## Application Deployment

### 1. Clone Repository
```bash
sudo -u mcp git clone https://github.com/yourusername/mcp-server.git /opt/mcp-server
cd /opt/mcp-server
```

### 2. Install Dependencies and Build
```bash
sudo -u mcp npm run setup
sudo -u mcp npm run build
```

### 3. Create Environment File
```bash
sudo -u mcp tee /opt/mcp-server/.env << EOF
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://mcp.titespec.com
MAX_FILE_SIZE=52428800
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
EOF
```

### 4. Set Up PM2 Process Manager
```bash
sudo -u mcp pm2 start npm --name "mcp-server" -- start
sudo -u mcp pm2 save
sudo -u mcp pm2 startup
# Follow the instructions from the startup command
```

## Nginx Configuration

### 1. Create Nginx Site Configuration
```bash
tee /etc/nginx/sites-available/mcp.titespec.com << 'EOF'
server {
    listen 80;
    server_name mcp.titespec.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp.titespec.com;
    
    # SSL Configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/mcp.titespec.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.titespec.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # File upload size limit
    client_max_body_size 60M;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
```

### 2. Enable Site and Test Configuration
```bash
ln -s /etc/nginx/sites-available/mcp.titespec.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## SSL Certificate Setup

### 1. Obtain Let's Encrypt Certificate
```bash
certbot --nginx -d mcp.titespec.com
```

### 2. Set Up Auto-Renewal
```bash
crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## CI/CD Setup with GitHub Actions

### 1. Generate SSH Deploy Key
```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub >> /home/mcp/.ssh/authorized_keys
cat ~/.ssh/deploy_key
# Copy the private key content for GitHub secrets
```

### 2. Add GitHub Repository Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `VPS_HOST`: your-server-ip
- `VPS_USER`: mcp
- `VPS_SSH_KEY`: (paste the private key content from step 1)

## Monitoring and Maintenance

### 1. Check Application Status
```bash
sudo -u mcp pm2 status
sudo -u mcp pm2 logs mcp-server
```

### 2. View System Resources
```bash
htop
df -h
free -h
```

### 3. Update Application
```bash
cd /opt/mcp-server
sudo -u mcp git pull
sudo -u mcp npm run build
sudo -u mcp pm2 restart mcp-server
```

### 4. Backup Important Data
```bash
# Create backup script
tee /opt/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /opt/backups/mcp-data-$DATE.tar.gz -C /opt/mcp-server data/
find /opt/backups -name "mcp-data-*.tar.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup.sh
mkdir -p /opt/backups

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/backup.sh
```

## Troubleshooting

### Common Issues

1. **Application not starting**:
   ```bash
   sudo -u mcp pm2 logs mcp-server
   ```

2. **Nginx configuration errors**:
   ```bash
   nginx -t
   systemctl status nginx
   ```

3. **SSL certificate issues**:
   ```bash
   certbot certificates
   systemctl status certbot.timer
   ```

4. **Resource monitoring**:
   ```bash
   htop
   iotop
   netstat -tulpn
   ```

## Performance Optimization

Given your 4GB RAM and 2 CPU setup:

1. **PM2 Cluster Mode** (optional for better CPU utilization):
   ```bash
   sudo -u mcp pm2 delete mcp-server
   sudo -u mcp pm2 start npm --name "mcp-server" -i 2 -- start
   ```

2. **Nginx Gzip Compression**:
   Add to nginx config:
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
   ```

3. **System Limits**:
   ```bash
   echo "fs.file-max = 65536" >> /etc/sysctl.conf
   sysctl -p
   ```