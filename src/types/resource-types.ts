export interface SubscriptionInfo {
  subscriptionId: string;
  name: string;
  displayName?: string;
  state?: string;
}

export interface ResourceGroupInfo {
  subscriptionId: string;
  name: string;
  location: string;
  properties?: any;
}

export interface AksClusterInfo {
  name: string;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  kubernetesVersion?: string;
  nodeResourceGroup?: string;
  fqdn?: string;
  powerState?: string;
}

export interface StandardResponse<T> {
  count: number;
  data: T[];
  operation: string;
}
