# Azure Resource Graph MCP Server

A Model Context Protocol (MCP) server that provides AI assistants secure access to Azure resources through Azure Resource Graph queries. Built with TypeScript and featuring flexible authentication modes.

## Key Features

- **Dual Authentication Modes**: Application mode (Azure CLI) and delegated mode (JWT + OBO flow)
- **JWT Token Validation**: JWKS-based token validation for delegated authentication
- **Multi-User Support**: Isolated user sessions with proper context management
- **Smart Caching**: LRU-based client and credential caching with configurable TTL
- **Resource Access**: 
  - List Azure subscriptions accessible to the authenticated user
  - Query resource groups with optional filtering by subscription
  - Retrieve AKS clusters with detailed cluster information
  - Execute custom KQL queries against Azure Resource Graph
- **Docker Support**: Container support for deployment

## Architecture Overview

The server implements a layered architecture with clear separation of concerns:

- **Authentication Layer**: JWT validation, credential management, and auth strategies
- **Client Management**: Azure Resource Graph client caching with LRU eviction
- **Contextual MCP Server**: Custom MCP implementation with dependency injection
- **Tool Layer**: Modular tool system for Azure resource operations
- **Service Layer**: Azure Resource Graph client abstraction

## Authentication Model

The server supports two authentication modes:

**Application Mode (Default)**:
- Uses Azure CLI credentials for local development
- Suitable for single-user scenarios and development environments
- No additional token validation required

**Delegated Mode**:
- JWT token validation using Azure AD JWKS endpoints
- On-Behalf-Of (OBO) flow preserves user identity
- Multi-tenant support with configurable validation
- User permissions enforced at Azure RBAC level
- Suitable for multi-user scenarios and web applications

Both modes support client and credential caching with configurable expiration times.

## Available Tools

- **`query-azure-resources`**: Execute custom KQL queries against Azure Resource Graph
- **`list-subscriptions`**: List all accessible Azure subscriptions  
- **`list-resource-groups`**: List resource groups with optional subscription filtering
- **`list-aks-clusters`**: List AKS clusters with optional subscription and resource group filtering

## Prerequisites

- **Runtime**: Node.js 18+ or Bun runtime
- **Azure Environment**: Azure subscription with appropriate RBAC permissions
- **Authentication**: 
  - Application mode: Azure CLI installation and login
  - Delegated mode: Azure AD application registration with API permissions

## Azure Setup

### Application Mode (Default)

1. **Install Azure CLI**: Download and install Azure CLI
2. **Login**: Run `az login` to authenticate with your Azure account
3. **Required Permissions**: Reader or higher on target Azure subscriptions/resources

### Delegated Mode

1. **Create Azure AD Application**:
   - Register application in Azure AD portal
   - Configure API permissions: `Azure Service Management` → `user_impersonation` (delegated)
   - Generate client secret or upload certificate

2. **Required Permissions**:
   - **Application**: `user_impersonation` scope only
   - **Users**: Reader or higher on target Azure subscriptions/resources
   
   **Note**: Users access resources based on their own Azure permissions via OBO flow.

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

**Environment Variables** (create from examples):

```bash
# Application Mode (Default) - uses Azure CLI credentials
cp .env.application.example azure_ad.env

# Delegated Mode - requires Azure AD app registration  
cp .env.delegated.example azure_ad.env
```

**Application Mode Configuration**:
```bash
export AZURE_AUTH_MODE="application"
export AZURE_CLIENT_ID="your-application-client-id"  # Optional for CLI mode
export AZURE_TENANT_ID="your-azure-ad-tenant-id"     # Optional for CLI mode

# Optional Configuration
export LOG_LEVEL="info"                    # debug, info, warn, error
export CACHE_MAX_SIZE="100"                # Maximum cached clients
export CACHE_TTL_MS="3600000"              # Cache TTL (1 hour)
```

**Delegated Mode Configuration**:
```bash
export AZURE_AUTH_MODE="delegated"
export AZURE_CLIENT_ID="your-application-client-id"
export AZURE_TENANT_ID="your-azure-ad-tenant-id"

# Authentication Method 1: Client Secret
export AZURE_CLIENT_SECRET="your-client-secret"

# Authentication Method 2: Certificate (alternative to secret)
# export AZURE_CLIENT_CERTIFICATE_PATH="/path/to/certificate.pem"
# export AZURE_CLIENT_CERTIFICATE_PASSWORD="cert-password-if-required"

# JWT Configuration
export JWT_CLOCK_TOLERANCE="300"           # JWT validation tolerance (seconds)
export JWT_CACHE_MAX_AGE="86400000"        # JWKS cache duration (24 hours)
export JWKS_REQUESTS_PER_MINUTE="10"       # Rate limit for JWKS requests

# Cache Configuration
export CACHE_MAX_SIZE="100"                # Maximum cached clients
export CACHE_TTL_MS="3600000"              # Cache TTL (1 hour)
```

## Usage

### Running the Server

```bash
# Load configuration
source azure_ad.env

# Development with Bun
bun run index.ts

# Development with Node.js
npm run build && npm start

# Docker
docker build -t azure-resource-graph-mcp .
docker run -p 3000:3000 --env-file azure_ad.env azure-resource-graph-mcp
```

The server will start at `http://localhost:3000/mcp` and accept POST requests.

### Authentication Methods

**Application Mode**:
- Uses Azure CLI credentials automatically
- No additional authentication required in tool calls
- Suitable for local development and single-user scenarios

**Delegated Mode**:
- Requires access token in tool calls: `access_token` parameter
- Required for Python MCP clients due to header limitations
- Token automatically excluded from schema documentation for security
- Alternative: `Authorization: Bearer <token>` header (if supported by client)
- Token must have `user_impersonation` scope for configured tenant

### Example Usage

Once connected to an MCP client:

- "List all my Azure subscriptions"
- "Show me all resource groups in subscription X"  
- "List all AKS clusters in resource group Y"
- "Query for virtual machines in East US region"

**Note**: Users only see resources they have permission to access in Azure.

## Development

```bash
# Build TypeScript
npm run build

# Debug mode
LOG_LEVEL=debug bun run index.ts

# Test authentication modes
AZURE_AUTH_MODE=application bun run index.ts
AZURE_AUTH_MODE=delegated bun run index.ts
```

## Project Structure

```
├── index.ts                                    # Express server entry point
├── src/
│   ├── azure-authentication/                   # Authentication system
│   │   ├── authenticated-provider.ts           # Main provider interface
│   │   ├── configuration.ts                    # Configuration management
│   │   ├── request-mapper.ts                   # MCP request mapping
│   │   ├── client-lifecycle/                   # Client management
│   │   │   ├── base-manager.ts                 # Abstract client manager
│   │   │   ├── application-manager.ts          # Application mode manager
│   │   │   ├── delegated-manager.ts            # Delegated mode manager
│   │   │   └── client-types.ts                 # Client factory interfaces
│   │   ├── credential-management/              # Credential providers
│   │   │   ├── strategies.ts                   # Authentication strategies
│   │   │   ├── application-provider.ts         # Azure CLI provider
│   │   │   ├── delegated-provider.ts           # OBO credential provider
│   │   │   ├── auth-context.ts                 # Authentication contexts
│   │   │   └── credential-types.ts             # Provider interfaces
│   │   ├── token-validation/                   # JWT validation
│   │   │   ├── jwt-validator.ts                # JWKS validation
│   │   │   └── parsed-token.ts                 # Token parsing
│   │   └── dependency-injection/               # Factory functions
│   │       └── factory-functions.ts            # DI setup
│   ├── services/                               # Service layer
│   │   ├── azure-resource-client.ts            # Resource Graph wrapper
│   │   ├── resource-graph-client-factory.ts    # Client factory
│   │   ├── contextual-mcp-server.ts            # Enhanced MCP server
│   │   └── server-factory.ts                   # Server configuration
│   ├── tools/                                  # MCP tool implementations
│   │   ├── base-tool.ts                        # Common tool utilities
│   │   ├── query-resources.ts                  # Custom KQL queries
│   │   ├── list-subscriptions.ts               # Subscription listing
│   │   ├── list-resource-groups.ts             # Resource group listing
│   │   └── list-aks-clusters.ts                # AKS cluster listing
│   ├── types/                                  # TypeScript definitions
│   │   └── resource-types.ts                   # Azure resource types
│   └── queries/                                # Predefined queries
│       └── predefined-queries.ts               # KQL query templates
├── package.json                                # Dependencies & scripts
├── tsconfig.json                               # TypeScript configuration
├── Dockerfile                                  # Container configuration
└── README.md                                   # Documentation
```

## Troubleshooting

**Authentication Issues**:
- **Application Mode**: Ensure `az login` is successful and has access to target subscriptions
- **Delegated Mode**: Verify `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and secret/certificate configuration
- Check Azure AD application has `user_impersonation` delegated permission
- Ensure token is issued for correct tenant and scope

**Permission Errors**:
- Users need Reader+ permissions on target Azure subscriptions/resources
- Check Azure RBAC assignments in Azure portal
- Verify subscription is accessible via Azure CLI: `az account list`

**Configuration Issues**:
- Validate environment variables are properly loaded: `echo $AZURE_AUTH_MODE`
- Check auth mode spelling: must be exactly `application` or `delegated`
- For delegated mode, ensure either secret OR certificate is configured, not both

**Performance Issues**:
- Monitor cache statistics in debug logs: `LOG_LEVEL=debug`
- Adjust cache sizes: `CACHE_MAX_SIZE` and various `CACHE_*_TTL` settings
- Consider certificate authentication for better security in delegated mode

**Token Issues** (Delegated Mode):
- Server handles token refresh automatically via OBO flow  
- Check JWT clock tolerance if seeing timing issues: `JWT_CLOCK_TOLERANCE`
- Enable debug logging to see detailed authentication flows

## License

MIT License - see LICENSE file for details.
