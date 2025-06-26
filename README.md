# Azure Resource Graph MCP Server

An experimental Model Context Protocol (MCP) server that provides access to Azure resources through Azure Resource Graph queries. This server enables AI assistants to query and retrieve information about Azure resources across subscriptions.

## Key Features

- **Multi-User Support**: Uses Azure AD On-Behalf-Of (OBO) authentication flow to support multiple Azure users
- **Secure Authentication**: Each user's Azure identity is preserved through the OBO flow - queries are executed with the user's own permissions
- **Client Caching**: Implements client caching and connection reuse for better performance
- **Resource Access**: 
  - List Azure subscriptions accessible to the authenticated user
  - Query resource groups across subscriptions with filtering options
  - Retrieve Azure Kubernetes Service (AKS) clusters with detailed information
  - Execute custom KQL queries against Azure Resource Graph
- **Containerization**: Docker support for easy deployment and testing

## Architecture Overview

The server implements a modular architecture with the following components:

- **ResourceGraphClientManager**: Manages Azure Resource Graph client instances with LRU caching
- **AzureAuthManager**: Handles Azure AD authentication using the On-Behalf-Of flow
- **ContextualMcpServer**: Custom MCP server implementation with dependency injection
- **Tool-Based Architecture**: Modular tool system for different Azure resource operations

## Authentication Model

This server uses **Azure AD On-Behalf-Of (OBO) authentication**:

- **Multi-User Support**: Multiple Azure users can use the same server instance
- **User Identity Preservation**: Each user's queries are executed with their own Azure permissions
- **Token Caching**: Implements LRU cache with automatic token refresh
- **Delegated Access**: The server acts on behalf of the authenticated user
- **Secure Access**: Users only see resources they have access to in their Azure environment

## Available Tools

- **`query-azure-resources`**: Execute custom KQL queries against Azure Resource Graph
- **`list-subscriptions`**: List all accessible Azure subscriptions
- **`list-resource-groups`**: List resource groups with optional filtering by subscription and location
- **`list-aks-clusters`**: List AKS clusters with detailed cluster information

## Prerequisites

- **Runtime**: Node.js 18+ or Bun runtime
- **Azure Environment**: Azure subscription with appropriate permissions
- **Authentication**: Azure AD application registration with Resource Graph API permissions

## Azure Setup

1. **Create an Azure AD Application**:
   - Register a new application in Azure AD
   - Add API permissions for Azure Resource Manager
   - Create a client secret

2. **Required Azure Permissions**:
   - `Azure Service Management` → `user_impersonation` (delegated)
   
   **Note**: Only the `user_impersonation` permission is required. The server uses On-Behalf-Of authentication, so users will access resources based on their own Azure permissions, not the application's permissions.

3. **Multi-User Considerations**:
   - Each user must have appropriate Reader permissions on the Azure subscriptions they want to query
   - The application registration supports multiple users without additional configuration
   - Users authenticate through their own Azure AD credentials

## Installation

### Using Bun (Recommended)

```bash
# Install dependencies
bun install

# Start the server
bun run index.ts
```

### Using Node.js

```bash
# Install dependencies
npm install

# Build and start
npm run build
npm start
```

### Using Docker

```bash
# Build and run
docker build -t azure-resource-graph-mcp .
docker run -p 3000:3000 --env-file azure_ad.env azure-resource-graph-mcp
```

## Configuration

1. **Create environment configuration**:
   ```bash
   cp azure_ad.env.example azure_ad.env
   ```

2. **Configure Azure AD application details** in `azure_ad.env`:
   ```bash
   export AZURE_CLIENT_ID="your-client-id"
   export AZURE_CLIENT_SECRET="your-client-secret"
   export AZURE_TENANT_ID="your-tenant-id"
   export LOG_LEVEL="info"  # Optional: debug, info, error
   ```

3. **Load environment variables**:
   ```bash
   source azure_ad.env
   ```

## Usage

### Running the Server

```bash
# Development
bun run index.ts

# Production
npm run build && npm start
```

The server will start at `http://localhost:3000/mcp` and accept POST requests.

### Access Token Authentication

The server supports two methods for passing Azure AD access tokens:

1. **Function Call Arguments** (Primary method):
   - Pass `access_token` as a parameter in each MCP tool call
   - Required because Python MCP clients cannot easily set custom HTTP headers correctly
   - **Security Note**: For security reasons, `access_token` is not exposed in the tool's input schema definition. The server uses special handling to accept this parameter without advertising it in the schema, preventing accidental exposure in tool documentation or client interfaces.

2. **HTTP Headers** (Alternative method):
   - Pass token in `Authorization: Bearer <token>` header
   - Useful for clients that support custom headers

### Example Usage

Once connected to an MCP client:

- "List all my Azure subscriptions"
- "Show me all resource groups in subscription X"  
- "List all AKS clusters with their status"
- "Query for virtual machines in East US region"

**Note**: Users only see resources they have permission to access in their Azure environment.

## Development

```bash
# Build TypeScript
bun run build

# Debug mode
LOG_LEVEL=debug bun run index.ts
```

## Project Structure

```
├── index.ts                   # Main server entry point
├── src/
│   ├── auth/                 # Azure authentication management
│   ├── services/             # Client management and caching
│   ├── tools/                # MCP tool implementations
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Server factory and utilities
```

## Troubleshooting

**Authentication Issues**:
- Ensure your Azure AD app has `user_impersonation` permission
- Verify environment variables are set correctly

**Permission Errors**:
- Users can only access resources they have permissions for
- Check Azure RBAC assignments for the authenticated user

**Token Issues**:
- The server handles token refresh automatically
- Enable debug logging to see detailed authentication flows

## License

MIT License - see LICENSE file for details.
