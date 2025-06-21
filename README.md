# MCP Server - Production Monorepo

A production-grade Model Context Protocol (MCP) server with a beautiful React dashboard, built with security, scalability, and maintainability in mind.

## 🚀 Features

### Backend (Node.js + Express + TypeScript)
- **Full MCP Protocol Compliance** - Complete implementation of the Model Context Protocol
- **Secure ZIP Processing** - Advanced security validation, zip bomb protection, path traversal prevention
- **Context Management** - Approval workflow for uploaded content
- **System Snapshots** - Comprehensive state snapshots with configurable options
- **Production Security** - Rate limiting, CORS, helmet, input validation
- **Structured Logging** - Winston-based logging with rotation and levels
- **Health Monitoring** - Comprehensive health checks and system statistics

### Frontend (React + TypeScript + Tailwind)
- **Modern Dashboard** - Beautiful, responsive interface with dark/light mode
- **Real-time Monitoring** - Live system stats, logs, and activity feeds
- **Secure File Upload** - Drag-and-drop ZIP upload with progress tracking
- **Context Browser** - Search, filter, and manage uploaded contexts
- **Log Viewer** - Real-time log streaming with filtering and export
- **Tool Management** - MCP tool monitoring and configuration

### MCP Tools
- **load_zip** - Securely extract and process ZIP archives
- **mark_approved** - Context approval workflow management
- **snapshot** - Create comprehensive system state snapshots

## 🏗️ Architecture

```
mcp-server/
├── backend/           # Node.js + Express API server
│   ├── src/
│   │   ├── mcp/      # MCP protocol implementation
│   │   ├── api/      # REST API routes and middleware
│   │   ├── utils/    # Utilities and security
│   │   └── types.ts  # TypeScript definitions
├── dashboard/         # React frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/     # Application pages
│   │   └── api.ts     # API client
├── data/             # Runtime data storage
│   ├── zips/         # Uploaded ZIP files
│   ├── extracted/    # Extracted file contents
│   ├── vds/          # Vector database storage
│   └── snapshots/    # System snapshots
└── logs/             # Application logs
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+

### Local Development

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd mcp-server
npm install
```

2. **Start development servers:**
```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173) in development mode.

3. **Access the application:**
- Dashboard: http://localhost:5173
- API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

### Production Build

```bash
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*
MAX_FILE_SIZE=52428800
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
```

### Security Configuration

The server includes comprehensive security measures:

- **File Upload Limits**: 50MB max file size, ZIP files only
- **Rate Limiting**: 5 uploads per 15 minutes, 100 API calls per 15 minutes
- **ZIP Security**: Zip bomb protection, path traversal prevention, file type validation
- **Input Validation**: Joi-based validation for all endpoints
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers and CSP

## 📡 API Endpoints

### MCP Tools
- `POST /api/mcp/tools/load-zip` - Upload and extract ZIP files
- `POST /api/mcp/tools/mark-approved` - Approve/reject contexts
- `POST /api/mcp/tools/snapshot` - Create system snapshots

### Data Management
- `GET /api/context` - List contexts with filtering and pagination
- `GET /api/logs` - Retrieve system logs
- `GET /api/stats` - System statistics and metrics
- `GET /api/mcp/tools` - List available MCP tools

### System
- `GET /api/health` - Health check endpoint

## 🔒 Security Features

### ZIP File Processing
- **File Type Validation**: Only ZIP files accepted
- **Size Limits**: 50MB upload limit, 100MB extraction limit
- **Zip Bomb Protection**: Compression ratio analysis
- **Path Traversal Prevention**: Sanitized file paths
- **Content Filtering**: Allowed file extensions only

### API Security
- **Rate Limiting**: Configurable request limits
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses
- **CORS Configuration**: Controlled cross-origin access
- **Security Headers**: Helmet.js integration

## 🚀 Deployment

### Render (Recommended)

The project includes a `render.yaml` configuration for easy deployment:

1. Connect your repository to Render
2. The build and deployment will happen automatically
3. Environment variables are configured in the YAML file

### Manual Deployment

1. **Build the project:**
```bash
npm run build
```

2. **Set environment variables:**
```bash
export NODE_ENV=production
export PORT=3001
```

3. **Start the server:**
```bash
npm start
```

## 📊 Monitoring

### Dashboard Features
- **System Overview**: Uptime, file counts, memory/disk usage
- **Real-time Logs**: Live log streaming with filtering
- **Context Management**: Upload approval workflow
- **Tool Monitoring**: MCP tool usage statistics

### Logging
- **Structured Logging**: JSON format with metadata
- **Log Rotation**: Automatic log file rotation
- **Multiple Levels**: Error, warn, info, debug
- **Export Capability**: Download logs for analysis

## 🧪 Testing

```bash
# Run backend tests
npm run test --workspace=backend

# Run frontend tests  
npm run test --workspace=dashboard

# Run all tests
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [Issues](https://github.com/your-repo/issues) page
- Review the API documentation
- Check the logs for error details

## 🔄 Version History

- **v1.0.0** - Initial release with full MCP protocol support
- Production-ready security features
- Complete React dashboard
- Render deployment configuration