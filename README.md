# Azure Resource Graph MCP Server

A Model Context Protocol (MCP) server that provides access to Azure resources through Azure Resource Graph queries. This server enables AI assistants to query and retrieve information about Azure resources across subscriptions.

## Key Features

- **Multi-User Support**: Uses Azure AD On-Behalf-Of (OBO) authentication flow to support multiple Azure users
- **Secure Authentication**: Each user's Azure identity is preserved through the OBO flow - queries are executed with the user's own permissions
- **List Subscriptions**: Retrieve all Azure subscriptions accessible to the authenticated user
- **List Resource Groups**: Get resource groups across subscriptions with filtering options
- **List AKS Clusters**: Query Azure Kubernetes Service clusters with detailed information
- **Custom Resource Queries**: Execute custom KQL queries against Azure Resource Graph

## Authentication Model

This server uses **Azure AD On-Behalf-Of (OBO) authentication**, which means:

- **Multi-User Ready**: Multiple Azure users can use the same server instance
- **User Identity Preservation**: Each user's queries are executed with their own Azure permissions
- **Delegated Access**: The server acts on behalf of the authenticated user, not with its own identity
- **Secure**: Users only see resources they have access to in their Azure environment

## Available Tools

- `list-subscriptions`: List all accessible Azure subscriptions
- `list-resource-groups`: List resource groups with optional filtering by subscription and location
- `list-aks-clusters`: List AKS clusters with detailed cluster information
- `query-resources`: Execute custom KQL queries against Azure Resource Graph

## Prerequisites

- Node.js or Bun runtime
- Azure subscription with appropriate permissions
- Azure AD application registration with Resource Graph API permissions

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

Install dependencies:

```bash
bun install
```

Or with npm:

```bash
npm install
```

## Configuration

1. Copy the environment configuration:
   ```bash
   cp azure_ad.env.example azure_ad.env
   ```

2. Update `azure_ad.env` with your Azure AD application details:
   ```bash
   export AZURE_CLIENT_ID="your-client-id"
   export AZURE_CLIENT_SECRET="your-client-secret"
   export AZURE_TENANT_ID="your-tenant-id"
   ```

3. Source the environment variables:
   ```bash
   source azure_ad.env
   ```

## Usage

### Running the Server

Start the MCP server:

```bash
bun run index.ts
```

Or with npm:

```bash
npm run build
npm start
```

The server will start on port 3000 and be available at `http://localhost:3000/mcp`.

### Example Queries

Once connected, you can use the following commands:

- "List all my Azure subscriptions"
- "Show me all resource groups in subscription X"
- "List all AKS clusters with their status"
- "Query for virtual machines in East US region"

**Note**: Each user will only see resources they have permission to access in their Azure environment. The On-Behalf-Of authentication ensures queries are executed with the user's own identity and permissions.

## Development

Build the project:

```bash
bun run build
```

The TypeScript files will be compiled to the `dist` directory.

## Project Structure

```
src/
├── auth/              # Azure authentication management
├── queries/           # Predefined KQL queries
├── services/          # Core service implementations
├── tools/             # MCP tool definitions
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Troubleshooting

- **Authentication Issues**: Ensure your Azure AD application has the `user_impersonation` permission and the environment variables are properly set
- **Permission Errors**: Verify that the authenticated user has Reader access to the subscriptions being queried. Remember, users can only access resources they have permissions for in their Azure environment
- **Token Expiration**: The server handles token refresh automatically using the On-Behalf-Of (OBO) flow
- **Multi-User Issues**: Each user authenticates independently - if one user has access issues, it doesn't affect other users

## License

This project was created using `bun init` in bun v1.2.10. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
