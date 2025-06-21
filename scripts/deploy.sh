#!/bin/bash

# Deployment script for MCP Server on Vultr VPS
# Usage: ./scripts/deploy.sh [--setup|--deploy|--rollback]

set -e

# Configuration
APP_NAME="mcp-server"
APP_DIR="/opt/mcp-server"
APP_USER="mcp"
BACKUP_DIR="/opt/mcp-server-backup"
DOMAIN="mcp.titespec.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Initial server setup
setup_server() {
    log "Starting server setup for $DOMAIN..."
    
    # Update system
    log "Updating system packages..."
    apt update && apt upgrade -y
    
    # Install required packages
    log "Installing required packages..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt install -y nodejs nginx git ufw certbot python3-certbot-nginx htop
    
    # Install PM2 globally
    log "Installing PM2..."
    npm install -g pm2
    
    # Configure firewall
    log "Configuring firewall..."
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw --force enable
    
    # Create application user
    log "Creating application user..."
    if ! id "$APP_USER" &>/dev/null; then
        adduser --system --group --home $APP_DIR $APP_USER
    fi
    
    # Create necessary directories
    log "Creating application directories..."
    mkdir -p $APP_DIR/{data,logs}
    mkdir -p $APP_DIR/data/{zips,extracted,snapshots}
    chown -R $APP_USER:$APP_USER $APP_DIR
    
    # Configure nginx
    log "Configuring nginx..."
    if [ -f "$(dirname "$0")/../configs/nginx.conf" ]; then
        cp "$(dirname "$0")/../configs/nginx.conf" /etc/nginx/sites-available/$DOMAIN
        ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        nginx -t && systemctl reload nginx
    else
        warning "Nginx config file not found. Please configure manually."
    fi
    
    # Setup SSL certificate
    log "Setting up SSL certificate..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    # Setup auto-renewal
    log "Setting up SSL auto-renewal..."
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
    
    # Setup log rotation
    log "Setting up log rotation..."
    cat > /etc/logrotate.d/mcp-server << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 $APP_USER $APP_USER
    postrotate
        sudo -u $APP_USER pm2 reload $APP_NAME > /dev/null 2>&1 || true
    endscript
}
EOF
    
    log "Server setup completed!"
    log "Next steps:"
    log "1. Push your code to GitHub"
    log "2. Set up GitHub repository secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY)"
    log "3. Push to main/master branch to trigger automatic deployment"
}

# Deploy application
deploy_app() {
    log "Starting application deployment..."
    
    # Check if app directory exists
    if [ ! -d "$APP_DIR" ]; then
        error "Application directory $APP_DIR does not exist. Run setup first."
        exit 1
    fi
    
    # Create backup of current deployment
    if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
        log "Creating backup of current deployment..."
        rm -rf $BACKUP_DIR
        cp -r $APP_DIR $BACKUP_DIR
    fi
    
    # Stop application
    log "Stopping application..."
    sudo -u $APP_USER pm2 stop $APP_NAME || true
    
    cd $APP_DIR
    
    # Pull latest code (if git repo exists)
    if [ -d ".git" ]; then
        log "Pulling latest code..."
        sudo -u $APP_USER git pull origin main || sudo -u $APP_USER git pull origin master
    else
        error "No git repository found. Please clone the repository first."
        exit 1
    fi
    
    # Install dependencies and build
    log "Installing dependencies and building..."
    sudo -u $APP_USER npm run setup
    sudo -u $APP_USER npm run build
    
    # Create/update environment file
    if [ ! -f ".env" ]; then
        log "Creating environment file..."
        sudo -u $APP_USER tee .env << EOF
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://$DOMAIN
MAX_FILE_SIZE=52428800
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
EOF
    fi
    
    # Start application
    log "Starting application..."
    sudo -u $APP_USER pm2 start npm --name "$APP_NAME" -- start
    sudo -u $APP_USER pm2 save
    
    # Setup PM2 startup
    sudo -u $APP_USER pm2 startup systemd -u $APP_USER --hp $APP_DIR
    
    # Wait for app to start
    sleep 5
    
    # Health check
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log "✅ Deployment successful - Application is running"
        rm -rf $BACKUP_DIR
    else
        error "❌ Deployment failed - Application not responding"
        rollback_deployment
        exit 1
    fi
    
    log "Deployment completed successfully!"
}

# Rollback to previous version
rollback_deployment() {
    log "Rolling back to previous version..."
    
    # Stop current application
    sudo -u $APP_USER pm2 stop $APP_NAME || true
    sudo -u $APP_USER pm2 delete $APP_NAME || true
    
    # Restore backup if it exists
    if [ -d "$BACKUP_DIR" ]; then
        rm -rf $APP_DIR
        mv $BACKUP_DIR $APP_DIR
        
        # Start application
        cd $APP_DIR
        sudo -u $APP_USER pm2 start npm --name "$APP_NAME" -- start
        sudo -u $APP_USER pm2 save
        
        log "🔄 Rollback completed"
    else
        error "No backup found for rollback"
        exit 1
    fi
}

# Show application status
show_status() {
    log "=== MCP Server Status ==="
    
    echo "System Resources:"
    free -h
    df -h $APP_DIR
    
    echo ""
    echo "PM2 Status:"
    sudo -u $APP_USER pm2 status
    
    echo ""
    echo "Application Health:"
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Application: HEALTHY"
    else
        echo "❌ Application: UNHEALTHY"
    fi
    
    echo ""
    echo "Recent Logs:"
    sudo -u $APP_USER pm2 logs $APP_NAME --lines 10
}

# Show logs
show_logs() {
    sudo -u $APP_USER pm2 logs $APP_NAME
}

# Main script logic
case "$1" in
    --setup)
        check_root
        setup_server
        ;;
    --deploy)
        check_root
        deploy_app
        ;;
    --rollback)
        check_root
        rollback_deployment
        ;;
    --status)
        show_status
        ;;
    --logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 [--setup|--deploy|--rollback|--status|--logs]"
        echo ""
        echo "Commands:"
        echo "  --setup     Initial server setup (run once)"
        echo "  --deploy    Deploy application"
        echo "  --rollback  Rollback to previous version"
        echo "  --status    Show application status"
        echo "  --logs      Show application logs"
        exit 1
        ;;
esac