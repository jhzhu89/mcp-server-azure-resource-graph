export const QUERIES = {
  LIST_SUBSCRIPTIONS: `
    ResourceContainers
    | where type == 'microsoft.resources/subscriptions'
    | project subscriptionId, name, properties.displayName, properties.state
  `,
  
  LIST_RESOURCE_GROUPS: (subscriptionId?: string) => `
    ResourceContainers
    | where type == 'microsoft.resources/subscriptions/resourcegroups'
    ${subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : ''}
    | project subscriptionId, name, location, properties
  `,
  
  LIST_AKS_CLUSTERS: (subscriptionId?: string, resourceGroupName?: string) => `
    Resources
    | where type == 'microsoft.containerservice/managedclusters'
    ${subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : ''}
    ${resourceGroupName ? `| where resourceGroup == '${resourceGroupName}'` : ''}
    | project name, subscriptionId, resourceGroup, location, 
              properties.kubernetesVersion, properties.nodeResourceGroup,
              properties.fqdn, properties.powerState.code
  `
};
