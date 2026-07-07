import { ResourceClient } from '@beamlab/resource-client';

export const resourceClient = new ResourceClient();

resourceClient.initialize().catch((err: any) => {
  console.error("Failed to initialize ResourceClient", err);
});
