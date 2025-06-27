# Azure Resource Graph MCP Server

A Model Context Protocol (MCP) server that provides AI assistants secure access to Azure resources through Azure Resource Graph queries. Built with TypeScript and featuring JWT authentication and caching.

## Key Features

- **JWT-Based Authentication**: Validates Azure AD access tokens with JWKS verification
- **On-Behalf-Of Flow**: Uses Azure AD OBO authentication to preserve user identity
- **Multi-User Support**: Concurrent user sessions with isolated authentication contexts
- **Smart Caching**: LRU cache with automatic token refresh and expiration handling
- **Resource Access**: 
  - List Azure subscriptions accessible to the authenticated user
  - Query resource groups with optional filtering by subscription
  - Retrieve AKS clusters with detailed cluster information
  - Execute custom KQL queries against Azure Resource Graph
- **Docker Support**: Container support for easy deployment and testing

## Architecture Overview

The server implements a layered architecture with clear separation of concerns:

- **Azure Core**: Authentication, JWT validation, and credential management
- **Client Management**: Azure Resource Graph client caching with LRU eviction
- **Contextual MCP Server**: Custom MCP implementation with dependency injection
- **Tool Layer**: Modular tool system for Azure resource operations
- **Service Layer**: Azure Resource Graph client abstraction

## Authentication Model

**JWT Token Validation + Azure AD On-Behalf-Of (OBO)**:

- **JWT Verification**: Validates incoming tokens using Azure AD JWKS endpoints
- **Multi-Tenant Support**: Configurable tenant validation with clock tolerance
- **User Identity Preservation**: Each user's queries execute with their own Azure permissions
- **Token Caching**: Automatic credential refresh with configurable TTL and buffer times
- **Secure Access**: Users only access resources they have permissions for in Azure

## Available Tools

- **`query-azure-resources`**: Execute custom KQL queries against Azure Resource Graph
- **`list-subscriptions`**: List all accessible Azure subscriptions
- **`list-resource-groups`**: List resource groups with optional filtering by subscription and location
- **`list-aks-clusters`**: List AKS clusters with detailed cluster information

## Prerequisites

- **Runtime**: Node.js 18+ or Bun runtime (Bun recommended for TypeScript)
- **Azure Environment**: Azure subscription with appropriate RBAC permissions
- **Authentication**: Azure AD application registration with API permissions

## Azure Setup

1. **Create Azure AD Application**:
   - Register application in Azure AD portal
   - Configure API permissions: `Azure Service Management` → `user_impersonation` (delegated)
   - Generate client secret or upload certificate

2. **Required Permissions**:
   - **Application**: `user_impersonation` scope only
   - **Users**: Reader or higher on target Azure subscriptions/resources
   
   **Note**: The application uses OBO flow - users access resources based on their own Azure permissions, not the application's.

3. **Certificate Authentication** (Optional):
   - Generate X.509 certificate for enhanced security
   - Upload public key to Azure AD application
   - Store private key securely with optional password protection

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

**Environment Variables** in `azure_ad.env`:

```bash
# Required - Azure AD Application
export AZURE_CLIENT_ID="your-application-client-id"
export AZURE_TENANT_ID="your-azure-ad-tenant-id"

# Authentication Method 1: Client Secret
export AZURE_CLIENT_SECRET="your-client-secret"

# Authentication Method 2: Certificate (alternative to secret)
# export AZURE_CLIENT_CERTIFICATE_PATH="/path/to/certificate.pem"
# export AZURE_CLIENT_CERTIFICATE_PASSWORD="cert-password-if-required"

# Optional Configuration
export LOG_LEVEL="info"                    # debug, info, warn, error
export JWT_CLOCK_TOLERANCE="300"           # JWT validation tolerance (seconds)
export CACHE_MAX_SIZE="1000"               # Maximum cached clients
export CACHE_TTL_MS="3600000"              # Cache TTL (1 hour)
```

**Setup**:
```bash
# Copy and edit configuration
cp azure_ad.env.example azure_ad.env
nano azure_ad.env

# Load environment
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

**Primary Method - Function Arguments**:
- Pass `access_token` parameter in MCP tool calls
- Required for Python MCP clients due to header limitations
- Token automatically excluded from schema documentation for security

**Alternative Method - HTTP Headers**:
- `Authorization: Bearer <access_token>` header
- Suitable for clients with proper header support

**Token Requirements**:
- Valid Azure AD access token with `user_impersonation` scope
- Must be issued for the configured tenant
- Server validates signature using Azure AD JWKS endpoints

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
├── index.ts                          # Express server entry point
├── src/
│   ├── azure-core/                   # Core Azure integration
│   │   ├── auth/                     # JWT validation & credential management
│   │   │   ├── jwt-token-validator.ts
│   │   │   ├── azure-credential-provider.ts
│   │   │   └── types.ts
│   │   ├── client/                   # Client caching & management
│   │   │   ├── azure-client-manager.ts
│   │   │   └── types.ts
│   │   ├── config.ts                 # Configuration management
│   │   ├── factory.ts                # Dependency injection factories
│   │   └── logger.ts                 # Structured logging
│   ├── services/                     # Azure service abstractions
│   │   ├── azure-resource-client.ts
│   │   └── resource-graph-client-factory.ts
│   ├── tools/                        # MCP tool implementations
│   │   ├── query-resources.ts
│   │   ├── list-subscriptions.ts
│   │   ├── list-resource-groups.ts
│   │   ├── list-aks-clusters.ts
│   │   └── base-tool.ts
│   ├── types/                        # TypeScript definitions
│   │   └── resource-types.ts
│   ├── queries/                      # Predefined KQL queries
│   │   └── predefined-queries.ts
│   └── utils/                        # Server utilities
│       ├── contextual-mcp-server.ts  # Enhanced MCP server
│       └── server-factory.ts         # Server configuration
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript configuration
├── Dockerfile                        # Container configuration
└── README.md                         # Documentation
```

## Troubleshooting

**Authentication Issues**:
- Verify `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and secret/certificate configuration
- Check Azure AD application has `user_impersonation` delegated permission
- Ensure token is issued for correct tenant and scope

**Permission Errors**:
- Users need Reader+ permissions on target Azure subscriptions/resources
- Check Azure RBAC assignments in Azure portal
- Verify subscription is accessible via Azure CLI: `az account list`

**Performance Issues**:
- Increase cache size: `CACHE_MAX_SIZE` and `CACHE_TTL_MS`
- Monitor cache hit rates in debug logs: `LOG_LEVEL=debug`
- Consider certificate authentication for better security

**Token Issues**:
- Server automatically handles token refresh via OBO flow
- Check JWT clock tolerance if seeing timing issues: `JWT_CLOCK_TOLERANCE`
- Enable debug logging to see detailed authentication flows

## License

MIT License - see LICENSE file for details.
