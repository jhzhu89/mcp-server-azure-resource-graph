# Azure Resource Graph MCP Server

A Model Context Protocol (MCP) server that provides AI assistants access to Azure resources through Azure Resource Graph queries. Built with TypeScript and Express.

## Features

- **Dual Authentication Modes**: Application mode (Azure CLI) and delegated mode (JWT + OBO flow)
- **Smart Client Caching**: Intelligent caching with per-user and per-configuration isolation
- **Resource Querying**: Execute KQL queries against Azure Resource Graph
- **Resource Management**: 
  - List Azure subscriptions
  - List resource groups with optional subscription filtering
  - List AKS clusters with optional subscription and resource group filtering
  - Execute custom KQL queries
- **HTTP Transport**: RESTful MCP server using Express
- **Docker Support**: Containerized deployment

## Architecture

The server implements a layered architecture:

- **MCP Server**: Custom contextual MCP implementation with dependency injection
- **Tool Layer**: Modular tool system for Azure resource operations
- **Service Layer**: Azure Resource Graph client abstraction and server factory
- **Client Management**: Azure authentication via `@jhzhu89/azure-client-pool` with intelligent caching

## Authentication

The server supports two authentication modes through the `@jhzhu89/azure-client-pool` library:

### Application Mode (Default)
- **Uses**: Azure CLI credentials (`az login`)
- **Best for**: Local development, single-user applications
- **Caching**: Simple global cache
- **Setup**: Minimal configuration required
- **Access**: Uses your Azure CLI user permissions

### Delegated Mode
- **Uses**: On-Behalf-Of (OBO) flow with user JWT tokens
- **Best for**: Multi-user web applications, production environments
- **Caching**: Per-user and per-tenant with configuration fingerprinting
- **Setup**: Requires Azure AD app registration with client secret or certificate
- **Access**: Preserves user identity and permissions through OBO flow

### Smart Caching

The library automatically caches clients based on:
- **Authentication context** (user identity, tenant)
- **Client configuration** (endpoints, options)

This prevents conflicts while maximizing client reuse across different users and configurations.

## Available Tools

- **`query-azure-resources`**: Execute custom KQL queries against Azure Resource Graph
- **`list-subscriptions`**: List all accessible Azure subscriptions  
- **`list-resource-groups`**: List resource groups with optional subscription filtering
- **`list-aks-clusters`**: List AKS clusters with optional subscription and resource group filtering

## Prerequisites

- **Runtime**: Node.js 18+ or Bun
- **Azure Environment**: Azure subscription with Reader or higher permissions
- **Authentication**: 
  - **Application mode**: Azure CLI installation and authentication (`az login`)
  - **Delegated mode**: Azure AD application registration with appropriate permissions

## Setup

### Application Mode Setup (Recommended for Development)

1. **Install Azure CLI** and run `az login`
2. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd mcp-server-azure-resource-graph
   bun install  # or npm install
   ```
3. **Configure environment**:
   ```bash
   cp azure_ad.env.example azure_ad.env
   # Edit azure_ad.env and set AZURE_AUTH_MODE=application
   ```

### Delegated Mode Setup (For Production/Multi-user)

1. **Create Azure AD Application**:
   - Register application in Azure AD portal
   - Configure API permissions: `Azure Service Management` → `user_impersonation` (delegated)
   - Generate client secret or upload certificate

2. **Configure environment**:
   ```bash
   cp azure_ad.env.example azure_ad.env
   # Set AZURE_AUTH_MODE=delegated and other required variables
   ```

3. **Required permissions**:
   - **Application**: `user_impersonation` scope
   - **Users**: Reader or higher on target Azure subscriptions/resources

## Installation and Usage

### Using Bun (Recommended)

```bash
# Start the server
bun run index.ts
```

### Using Node.js

```bash
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

The server starts at `http://localhost:3000/mcp` and accepts POST requests.

### Authentication Methods

**Application Mode**:
- Uses Azure CLI credentials automatically
- No additional authentication required in tool calls
- Suitable for local development and single-user scenarios

**Delegated Mode**:
- Requires access token in tool calls: `access_token` parameter
- Token must have `user_impersonation` scope for configured tenant
- Alternative: `Authorization: Bearer <token>` header (if supported by client)
- Suitable for multi-user scenarios and web applications

## Configuration

Environment variables can be configured in `azure_ad.env`:

### Application Mode Configuration
```bash
export AZURE_AUTH_MODE="application"
```

### Delegated Mode Configuration
```bash
export AZURE_AUTH_MODE="delegated"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_TENANT_ID="your-tenant-id"

# Authentication Method 1: Client Secret
export AZURE_CLIENT_SECRET="your-client-secret"

# Authentication Method 2: Certificate (alternative to secret)
# export AZURE_CLIENT_CERTIFICATE_PATH="/path/to/certificate.pem"
# export AZURE_CLIENT_CERTIFICATE_PASSWORD="cert-password-if-required"
```

### When to Use Which Mode?

| Scenario | Application Mode | Delegated Mode |
|----------|------------------|----------------|
| Local development | ✅ Simple setup with `az login` | ❌ Requires additional config |
| Single-user apps | ✅ Direct Azure CLI integration | ❌ Unnecessary complexity |
| Multi-user web apps | ❌ No user context | ✅ Proper user delegation |
| Production APIs | ❌ Requires Azure CLI on server | ✅ Standard OAuth2 flow |

## Example Usage

Once connected to an MCP client, you can:

- "List all my Azure subscriptions"
- "Show me all resource groups in subscription X"  
- "List all AKS clusters in resource group Y"
- "Query for virtual machines in East US region"

Users only see resources they have permission to access in Azure.

## Development

```bash
# Build TypeScript
npm run build

# Debug mode
LOG_LEVEL=debug bun run index.ts
```

## Project Structure

```
├── index.ts                          # Express server entry point
├── src/
│   ├── services/                     # Service layer
│   │   ├── azure-resource-client.ts  # Resource Graph wrapper
│   │   ├── contextual-mcp-server.ts  # Enhanced MCP server
│   │   ├── resource-graph-client-factory.ts  # Client factory
│   │   └── server-factory.ts         # Server configuration
│   ├── tools/                        # MCP tool implementations
│   │   ├── base-tool.ts              # Common tool utilities
│   │   ├── query-resources.ts        # Custom KQL queries
│   │   ├── list-subscriptions.ts     # Subscription listing
│   │   ├── list-resource-groups.ts   # Resource group listing
│   │   └── list-aks-clusters.ts      # AKS cluster listing
│   ├── types/                        # TypeScript definitions
│   │   └── resource-types.ts         # Azure resource types
│   └── queries/                      # Predefined queries
│       └── predefined-queries.ts     # KQL query templates
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript configuration
├── Dockerfile                        # Container configuration
└── README.md                         # Documentation
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
- Verify subscription access: `az account list`

**Configuration Issues**:
- Validate environment variables are loaded: `echo $AZURE_AUTH_MODE`
- Check auth mode spelling: must be exactly `application` or `delegated`
- For delegated mode, ensure either secret OR certificate is configured, not both

## License

MIT License - see LICENSE file for details.
