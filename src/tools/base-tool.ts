import type { AzureResourceClient } from "../services/azure-resource-client.js";
import type { StandardResponse } from "../types/resource-types.js";
import { getLogger } from "@jhzhu89/azure-client-pool";

const toolLogger = getLogger("tool");

export type ServerDependencies = {
  azureResourceClient: AzureResourceClient;
};

export async function executeAzureQuery<T>(
  dependencies: ServerDependencies,
  query: string,
  operation: string,
): Promise<StandardResponse<T>> {
  toolLogger.debug("Starting Azure Resource Graph query", {
    operation,
    queryLength: query.length,
    queryPreview: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
  });

  try {
    const result = await dependencies.azureResourceClient.queryResources(query);

    toolLogger.debug("Azure Resource Graph query completed successfully", {
      operation,
      resultCount: result.count,
      dataLength: result.data?.length || 0,
    });

    return {
      count: result.count,
      data: result.data as T[],
      operation,
    };
  } catch (error) {
    toolLogger.debug("Azure Resource Graph query failed", {
      operation,
      error: error instanceof Error ? error.message : "Unknown error",
      errorName: error instanceof Error ? error.constructor.name : "Unknown",
      errorCode: (error as any)?.code,
      statusCode: (error as any)?.statusCode || (error as any)?.status,
      queryPreview: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
    });

    throw error;
  }
}

export function formatToolResponse<T>(response: StandardResponse<T>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}

export function formatErrorResponse(error: unknown, operation: string) {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error occurred";
  const errorName = error instanceof Error ? error.constructor.name : "Unknown";
  const statusCode = (error as any)?.statusCode || (error as any)?.status;
  const errorCode = (error as any)?.code;

  let errorText = `Error ${operation}: ${errorMessage}`;

  if (errorName !== "Error" && errorName !== "Unknown") {
    errorText += `\nError Type: ${errorName}`;
  }

  if (statusCode) {
    errorText += `\nStatus Code: ${statusCode}`;
  }

  if (errorCode) {
    errorText += `\nError Code: ${errorCode}`;
  }

  return {
    content: [
      {
        type: "text" as const,
        text: errorText,
      },
    ],
    isError: true,
  };
}
