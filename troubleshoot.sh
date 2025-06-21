#!/bin/bash
# PM2 Troubleshooting Script

echo "🔍 Diagnosing PM2 startup issues..."

echo "1. Checking if build files exist:"
ls -la /var/www/mcp-server/backend/dist/server.js || echo "❌ server.js not found!"

echo -e "\n2. Checking PM2 ecosystem config:"
cat /var/www/mcp-server/ecosystem.config.js

echo -e "\n3. Testing Node.js can run the server directly:"
cd /var/www/mcp-server
timeout 5s node backend/dist/server.js || echo "❌ Direct node execution failed"

echo -e "\n4. Checking PM2 process details:"
pm2 describe mcp-server

echo -e "\n5. Checking file permissions:"
ls -la /var/www/mcp-server/backend/dist/

echo -e "\n6. Manual PM2 start with verbose output:"
pm2 delete mcp-server 2>/dev/null || true
pm2 start backend/dist/server.js --name mcp-server --log /var/www/mcp-server/logs/pm2.log

echo -e "\n7. Check logs again:"
pm2 logs --lines 10