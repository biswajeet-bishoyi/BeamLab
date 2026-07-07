import { type KnowledgeItem } from '../core/KnowledgeModel';
import { type KnowledgeRelationship } from '../core/KnowledgeRelationship';
import { KnowledgeEventBus } from '../events/KnowledgeEventBus';

export interface IKnowledgeProvider {
  name: string;
  version: string;
  
  initialize(eventBus: KnowledgeEventBus): Promise<void>;
  
  getItems(): Promise<KnowledgeItem[]>;
  getItem(id: string): Promise<KnowledgeItem | null>;
  
  getRelationships(): Promise<KnowledgeRelationship[]>;
  getRelationshipsForNode(id: string): Promise<KnowledgeRelationship[]>;
}
