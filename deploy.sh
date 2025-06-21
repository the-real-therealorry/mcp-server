#!/bin/bash
# MCP Server Deployment Script for Vultr VPS

set -e

echo "🚀 Starting MCP Server deployment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git if not present
sudo apt install -y git

# Create app directory
sudo mkdir -p /var/www/mcp-server
sudo chown $USER:$USER /var/www/mcp-server

# Clone or copy your project
echo "📁 Please upload your project files to /var/www/mcp-server"
echo "   You can use: scp -r . user@your-server-ip:/var/www/mcp-server/"

# Set up firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "✅ Server setup complete!"
echo "Next steps:"
echo "1. Upload your project files"
echo "2. Run: cd /var/www/mcp-server && ./deploy-app.sh"