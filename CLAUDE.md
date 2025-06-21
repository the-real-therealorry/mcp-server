# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a production-grade MCP (Model Context Protocol) server monorepo with two main workspaces:

- **backend/**: Node.js + Express + TypeScript MCP server
- **dashboard/**: React + TypeScript + Tailwind CSS frontend

## Development Commands

### Root Level (Monorepo)
- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both backend and frontend for production  
- `npm run start` - Start production backend server
- `npm test` - Run tests for both workspaces
- `npm run setup` - Install dependencies and build everything

### Backend (backend/)
- `npm run dev` - Start backend in watch mode using tsx
- `npm run build` - Compile TypeScript to dist/
- `npm run start` - Run compiled production server
- `npm run test` - Run Jest tests
- `npm run type-check` - TypeScript type checking without compilation

### Frontend (dashboard/)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production (runs tsc + vite build)
- `npm run preview` - Preview production build
- `npm run test` - Run Vitest tests
- `npm run type-check` - TypeScript type checking without compilation

## Architecture Overview

### MCP Server Core (backend/src/mcp/)
- **mcpServer.ts**: Main MCP protocol server implementing the @modelcontextprotocol/sdk
- **tools/**: Individual MCP tool implementations
  - **zipHandler.ts**: Secure ZIP file extraction with security validations
  - **contextManager.ts**: Context approval workflow and data management
  - **snapshotManager.ts**: System state snapshot creation
- **types.ts**: MCP-specific TypeScript type definitions

### API Layer (backend/src/api/)
- **routes.ts**: Express REST API endpoints exposing MCP tools and data
- **middleware.ts**: Security, validation, and error handling middleware
- **validation.ts**: Joi-based request validation schemas

### Security Features
- Comprehensive ZIP security: zip bomb protection, path traversal prevention, file type validation
- Rate limiting: 5 uploads per 15 minutes, 100 API calls per 15 minutes
- Input validation using Joi schemas
- Helmet.js security headers and CSP
- File size limits: 50MB upload, 100MB extraction

### Data Storage Structure
- `data/zips/`: Uploaded ZIP files
- `data/extracted/`: Extracted file contents
- `data/vds/`: Vector database storage (if implemented)
- `data/snapshots/`: System snapshots
- `logs/`: Application logs

### Frontend Architecture (dashboard/src/)
- **pages/**: Route-based page components (Dashboard, Context, Logs, Tools, Upload)
- **components/**: Reusable UI components (Layout.tsx)
- **api.ts**: Axios-based API client for backend communication
- Uses React Router for navigation and Tailwind CSS for styling

## Key Development Notes

### MCP Protocol Implementation
The server implements three core MCP tools:
1. **load_zip**: Secure ZIP archive extraction and processing
2. **mark_approved**: Context approval workflow management  
3. **snapshot**: System state snapshot creation

### Context Management System
- Uploaded files create "contexts" that require approval before processing
- Context status workflow: pending → approved/rejected
- Frontend provides management interface for context approval

### Testing Strategy
- Backend uses Jest for unit testing
- Frontend uses Vitest for testing
- Tests should cover MCP tool functionality and security validations

### Logging
- Winston-based structured logging in backend
- Logs written to logs/ directory with rotation
- Real-time log viewing available in dashboard

### Environment Configuration
Backend supports these environment variables:
- `NODE_ENV`: production/development
- `PORT`: Server port (default 3001)
- `CORS_ORIGIN`: CORS configuration
- `MAX_FILE_SIZE`: File upload limit
- `LOG_LEVEL`: Logging verbosity
- `RATE_LIMIT_ENABLED`: Enable/disable rate limiting

### Production Deployment
- Uses `render.yaml` for Render.com deployment
- Frontend builds to dashboard/dist/ and is served by backend in production
- Backend serves both API and static frontend files