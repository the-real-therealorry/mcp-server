#!/bin/bash

# Health check script for MCP Server
# Can be used for monitoring and alerting

set -e

# Configuration
APP_NAME="mcp-server"
APP_USER="mcp"
HEALTH_URL="http://localhost:3001/health"
DOMAIN="mcp.titespec.com"
EXTERNAL_URL="https://$DOMAIN/health"

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

# Check if PM2 process is running
check_pm2_status() {
    local status=$(sudo -u $APP_USER pm2 show $APP_NAME 2>/dev/null | grep -o "online\|stopped\|errored" | head -1)
    
    if [ "$status" = "online" ]; then
        log "✅ PM2 Status: ONLINE"
        return 0
    else
        error "❌ PM2 Status: $status"
        return 1
    fi
}

# Check local health endpoint
check_local_health() {
    if curl -f -s --max-time 10 $HEALTH_URL > /dev/null 2>&1; then
        log "✅ Local Health Check: PASSED"
        return 0
    else
        error "❌ Local Health Check: FAILED"
        return 1
    fi
}

# Check external health endpoint (through nginx)
check_external_health() {
    if curl -f -s --max-time 10 $EXTERNAL_URL > /dev/null 2>&1; then
        log "✅ External Health Check: PASSED"
        return 0
    else
        error "❌ External Health Check: FAILED"
        return 1
    fi
}

# Check system resources
check_system_resources() {
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    local disk_usage=$(df /opt/mcp-server | tail -1 | awk '{print $5}' | sed 's/%//')
    
    log "System Resources:"
    log "  Memory Usage: ${memory_usage}%"
    log "  Disk Usage: ${disk_usage}%"
    
    # Alert thresholds
    if (( $(echo "$memory_usage > 90.0" | bc -l) )); then
        warning "High memory usage: ${memory_usage}%"
        return 1
    fi
    
    if [ "$disk_usage" -gt 85 ]; then
        warning "High disk usage: ${disk_usage}%"
        return 1
    fi
    
    return 0
}

# Check nginx status
check_nginx_status() {
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx Status: ACTIVE"
        return 0
    else
        error "❌ Nginx Status: INACTIVE"
        return 1
    fi
}

# Check SSL certificate expiry
check_ssl_certificate() {
    local cert_expiry=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    local expiry_epoch=$(date -d "$cert_expiry" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))
    
    log "SSL Certificate expires in $days_until_expiry days"
    
    if [ $days_until_expiry -lt 30 ]; then
        warning "SSL certificate expires in $days_until_expiry days"
        return 1
    fi
    
    return 0
}

# Restart application if unhealthy
restart_application() {
    log "Attempting to restart application..."
    
    # Stop application
    sudo -u $APP_USER pm2 stop $APP_NAME || true
    
    # Wait a moment
    sleep 5
    
    # Start application
    sudo -u $APP_USER pm2 start $APP_NAME
    
    # Wait for application to start
    sleep 10
    
    # Check if restart was successful
    if check_pm2_status && check_local_health; then
        log "✅ Application restart successful"
        return 0
    else
        error "❌ Application restart failed"
        return 1
    fi
}

# Send alert (customize this function based on your alerting system)
send_alert() {
    local message="$1"
    local severity="$2"
    
    # Log the alert
    if [ "$severity" = "critical" ]; then
        error "ALERT: $message"
    else
        warning "ALERT: $message"
    fi
    
    # You can add email, Slack, or other notification methods here
    # Example for email (requires mailutils):
    # echo "$message" | mail -s "MCP Server Alert - $severity" admin@example.com
    
    # Example for Slack webhook:
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"MCP Server Alert: $message\"}" \
    #   $SLACK_WEBHOOK_URL
}

# Comprehensive health check
comprehensive_check() {
    local failed_checks=0
    local critical_failure=false
    
    log "Starting comprehensive health check..."
    
    # PM2 Status
    if ! check_pm2_status; then
        ((failed_checks++))
        critical_failure=true
    fi
    
    # Local health endpoint
    if ! check_local_health; then
        ((failed_checks++))
        critical_failure=true
    fi
    
    # External health endpoint
    if ! check_external_health; then
        ((failed_checks++))
    fi
    
    # Nginx status
    if ! check_nginx_status; then
        ((failed_checks++))
    fi
    
    # System resources
    if ! check_system_resources; then
        ((failed_checks++))
    fi
    
    # SSL certificate
    if ! check_ssl_certificate; then
        ((failed_checks++))
    fi
    
    # Summary
    log "Health check completed. Failed checks: $failed_checks"
    
    if [ $failed_checks -eq 0 ]; then
        log "🎉 All health checks passed!"
        return 0
    elif [ "$critical_failure" = true ]; then
        error "💥 Critical failure detected!"
        send_alert "Critical failure: Application is not responding" "critical"
        
        # Attempt automatic recovery
        if restart_application; then
            log "🔄 Automatic recovery successful"
            send_alert "Application automatically recovered after critical failure" "info"
        else
            error "🚨 Automatic recovery failed - manual intervention required"
            send_alert "Application recovery failed - manual intervention required" "critical"
        fi
        
        return 1
    else
        warning "⚠️  Some health checks failed but application is running"
        send_alert "$failed_checks health checks failed" "warning"
        return 1
    fi
}

# Show detailed status
show_detailed_status() {
    log "=== Detailed MCP Server Status ==="
    
    echo ""
    echo "📊 System Information:"
    uname -a
    uptime
    
    echo ""
    echo "💾 Memory Usage:"
    free -h
    
    echo ""
    echo "💿 Disk Usage:"
    df -h /opt/mcp-server
    
    echo ""
    echo "🔄 PM2 Processes:"
    sudo -u $APP_USER pm2 status
    
    echo ""
    echo "🌐 Nginx Status:"
    systemctl status nginx --no-pager -l
    
    echo ""
    echo "🔒 SSL Certificate:"
    echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates
    
    echo ""
    echo "📋 Recent Application Logs:"
    sudo -u $APP_USER pm2 logs $APP_NAME --lines 20
}

# Main script logic
case "$1" in
    --check)
        comprehensive_check
        ;;
    --status)
        show_detailed_status
        ;;
    --restart)
        restart_application
        ;;
    --pm2)
        check_pm2_status
        ;;
    --local)
        check_local_health
        ;;
    --external)
        check_external_health
        ;;
    --resources)
        check_system_resources
        ;;
    --ssl)
        check_ssl_certificate
        ;;
    *)
        echo "MCP Server Health Check Script"
        echo ""
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  --check      Run comprehensive health check"
        echo "  --status     Show detailed status information"
        echo "  --restart    Restart the application"
        echo "  --pm2        Check PM2 process status"
        echo "  --local      Check local health endpoint"
        echo "  --external   Check external health endpoint"
        echo "  --resources  Check system resources"
        echo "  --ssl        Check SSL certificate"
        echo ""
        echo "Examples:"
        echo "  $0 --check                # Run all health checks"
        echo "  $0 --status               # Show detailed status"
        echo "  $0 --restart              # Restart application"
        echo ""
        echo "For automated monitoring, add to crontab:"
        echo "  */5 * * * * $0 --check >> /var/log/mcp-health.log 2>&1"
        exit 1
        ;;
esac