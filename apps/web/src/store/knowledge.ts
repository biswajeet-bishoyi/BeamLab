import { KnowledgeClient } from '@beamlab/knowledge-client';

export const knowledgeClient = new KnowledgeClient();

// Initialize the knowledge engine (loads static provider, indexes, etc.)
knowledgeClient.initialize().catch(console.error);
