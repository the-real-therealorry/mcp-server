# SSL Certificate Setup Guide

This guide covers SSL certificate setup for mcp.titespec.com using Let's Encrypt.

## Prerequisites

- Domain mcp.titespec.com must point to your VPS IP address
- Nginx installed and configured
- Port 80 and 443 open in firewall

## Initial SSL Certificate Setup

### 1. Install Certbot
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate
```bash
# For nginx (automatic configuration)
sudo certbot --nginx -d mcp.titespec.com

# For manual certificate only (if you prefer to configure nginx manually)
sudo certbot certonly --nginx -d mcp.titespec.com
```

### 3. Verify Certificate Installation
```bash
# Check certificate details
sudo certbot certificates

# Test SSL configuration
curl -I https://mcp.titespec.com

# Test SSL rating (external)
curl -s "https://api.ssllabs.com/api/v3/analyze?host=mcp.titespec.com&publish=off&startNew=on"
```

## Automatic Renewal

### 1. Test Renewal Process
```bash
# Dry run renewal
sudo certbot renew --dry-run
```

### 2. Set Up Automatic Renewal
```bash
# Add to crontab for automatic renewal
sudo crontab -e

# Add this line to run renewal check twice daily
0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Alternative: Use Systemd Timer
```bash
# Check if systemd timer is already enabled
sudo systemctl status certbot.timer

# Enable if not already enabled
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## SSL Configuration Optimization

### 1. Update Nginx SSL Configuration
The nginx configuration includes optimized SSL settings:

```nginx
# SSL Configuration
ssl_certificate /etc/letsencrypt/live/mcp.titespec.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/mcp.titespec.com/privkey.pem;
include /etc/letsencrypt/options-ssl-nginx.conf;
ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 2. Generate Strong DH Parameters (Optional)
```bash
# Generate stronger DH parameters if needed
sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
```

## Monitoring SSL Certificate

### 1. Check Certificate Expiry
```bash
# Using openssl
echo | openssl s_client -servername mcp.titespec.com -connect mcp.titespec.com:443 2>/dev/null | openssl x509 -noout -dates

# Using certbot
sudo certbot certificates
```

### 2. Set Up Expiry Monitoring
Add to your health check script or monitoring system:

```bash
#!/bin/bash
# Check if certificate expires in less than 30 days
DOMAIN="mcp.titespec.com"
EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    # Send alert
fi
```

## Troubleshooting SSL Issues

### 1. Certificate Not Found
```bash
# Check if certificate files exist
sudo ls -la /etc/letsencrypt/live/mcp.titespec.com/

# If missing, re-run certbot
sudo certbot --nginx -d mcp.titespec.com
```

### 2. Permission Issues
```bash
# Fix permissions
sudo chown -R root:root /etc/letsencrypt/
sudo chmod -R 755 /etc/letsencrypt/live/
sudo chmod -R 644 /etc/letsencrypt/live/mcp.titespec.com/
```

### 3. Nginx Configuration Issues
```bash
# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 4. DNS Issues
```bash
# Check if domain points to correct IP
dig mcp.titespec.com
nslookup mcp.titespec.com

# Check if port 80 is accessible
curl -I http://mcp.titespec.com
```

### 5. Firewall Issues
```bash
# Check firewall status
sudo ufw status

# Allow HTTP and HTTPS if needed
sudo ufw allow 'Nginx Full'
```

## SSL Certificate Renewal Process

### 1. Manual Renewal
```bash
# Stop nginx temporarily if needed
sudo systemctl stop nginx

# Renew certificate
sudo certbot renew

# Start nginx
sudo systemctl start nginx
```

### 2. Renewal with Nginx Running
```bash
# Renew without stopping nginx (webroot method)
sudo certbot renew --nginx
```

### 3. Force Renewal (if needed)
```bash
# Force renewal even if not due
sudo certbot renew --force-renewal
```

## Security Best Practices

### 1. SSL Configuration Security
- Use TLS 1.2 and 1.3 only
- Disable weak ciphers
- Enable HSTS (HTTP Strict Transport Security)
- Use secure headers

### 2. Certificate Management
- Monitor certificate expiry
- Set up automated renewal alerts
- Keep certbot updated
- Regularly test renewal process

### 3. Backup Certificate
```bash
# Backup Let's Encrypt directory
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt/

# Store backup securely
sudo mv letsencrypt-backup-*.tar.gz /opt/backups/
```

## Testing SSL Configuration

### 1. Online SSL Test Tools
- SSL Labs: https://www.ssllabs.com/ssltest/
- SSL Checker: https://www.sslchecker.com/sslchecker

### 2. Command Line Testing
```bash
# Test SSL connection
openssl s_client -connect mcp.titespec.com:443 -servername mcp.titespec.com

# Check certificate chain
curl -I https://mcp.titespec.com

# Verify HSTS header
curl -I https://mcp.titespec.com | grep -i strict
```

## Integration with Health Checks

The health check script includes SSL monitoring:

```bash
# Run SSL check
./scripts/health-check.sh --ssl

# Include in comprehensive health check
./scripts/health-check.sh --check
```

## Automated SSL Monitoring

Add to your monitoring cron jobs:

```bash
# Check SSL certificate daily
0 8 * * * /opt/mcp-server/scripts/health-check.sh --ssl >> /var/log/ssl-check.log 2>&1
```

This ensures your SSL certificate is always valid and properly configured for mcp.titespec.com.