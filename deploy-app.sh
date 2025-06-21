#!/bin/bash
# Application deployment script

set -e

echo "🔧 Deploying MCP Server application..."

# Install dependencies
npm install

# Build the application
npm run build

# Create production environment file
if [ ! -f .env.production ]; then
    cp .env.example .env.production 2>/dev/null || cat > .env.production << EOF
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*
MAX_FILE_SIZE=52428800
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
EOF
    echo "📝 Created .env.production - please edit with your settings"
fi

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mcp-server',
    script: './backend/dist/server.js',
    cwd: '/var/www/mcp-server',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Application deployed successfully!"
echo "🌐 Your MCP server should be running on port 3001"