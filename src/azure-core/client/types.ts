import { type TokenCredential } from "@azure/identity";
import { type AzureScope } from "../auth/types.js";

export interface AzureClientFactory<TClient, TOptions = void> {
  readonly scope: AzureScope;
  createClient(credential: TokenCredential, options?: TOptions): TClient;
  
  /**
   * Generate a unique fingerprint for the client configuration.
   * 
   * This fingerprint represents the "identity" of a client instance.
   * Two sets of options that would create functionally identical clients
   * should produce the same fingerprint.
   * 
   * @param options - The options that define the client configuration
   * @returns A fingerprint string, or undefined if options don't affect client identity
   */
  getClientFingerprint?(options?: TOptions): string | undefined;
}
