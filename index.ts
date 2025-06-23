import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { AzureAuthManager } from "./src/auth/azure-auth-manager.js";
import { ResourceGraphManager } from "./src/services/resource-graph-manager.js";
import { createServer } from "./src/utils/server-factory.js";

const app = express();
app.use(express.json());

const authManager = new AzureAuthManager();
const resourceGraphManager = new ResourceGraphManager(authManager);

app.post('/mcp', async (req, res) => {
  console.log('MCP request received:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    bodyKeys: req.body ? Object.keys(req.body) : 'no body'
  });
  
  try {
    const server = createServer(authManager, resourceGraphManager);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      console.log('Request closed, cleaning up transport and server');
      transport.close();
      server.close();
    });

    console.log('Connecting server to transport...');
    await server.connect(transport);
    console.log('Handling request...');
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req, res) => {
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete('/mcp', async (req, res) => {
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Azure Resource Graph MCP Server listening on port ${PORT}`);
});
