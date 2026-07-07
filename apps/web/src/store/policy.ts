import { PolicyClient } from '@beamlab/policy-client';

// Singleton instance for the web app
export const policyClient = new PolicyClient();

// Initialize asynchronously (can be awaited during app bootstrap, or lazy loaded)
policyClient.initialize().catch((err: any) => {
  console.error("Failed to initialize PolicyClient", err);
});
