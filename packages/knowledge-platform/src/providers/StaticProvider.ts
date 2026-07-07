import { IKnowledgeProvider } from './IKnowledgeProvider';
import { type KnowledgeItem } from '../core/KnowledgeModel';
import { type KnowledgeRelationship as KnowledgeRelationshipType } from '../core/KnowledgeRelationship';
import { KnowledgeEventBus } from '../events/KnowledgeEventBus';

// BeamLab Core Knowledge Pack v0.1
const KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  // Concepts
  {
    id: 'BL-KNOW-CONCEPT-0001',
    category: 'Structural Concepts',
    title: 'Beam',
    summary: 'A structural element that primarily resists loads applied laterally to its axis.',
    detailedExplanation: 'Beams are characterized by their profile (shape of cross-section), their length, and their material. They primarily experience bending moments and shear forces.',
    keywords: ['bending', 'flexure', 'shear', 'horizontal'],
    engineeringDomain: 'General',
    difficulty: 'Beginner',
    references: [],
    source: 'BeamLab Core Pack',
    version: { knowledgeVersion: '1.0', sourceVersion: '1.0', reviewStatus: 'Approved', updatedAt: new Date().toISOString() }
  },
  {
    id: 'BL-KNOW-CONCEPT-0002',
    category: 'Structural Concepts',
    title: 'Column',
    summary: 'A structural element that transmits, through compression, the weight of the structure above to other structural elements below.',
    detailedExplanation: 'Columns frequently experience axial compression and bending (beam-columns). Slenderness ratio is a critical parameter controlling buckling.',
    keywords: ['compression', 'buckling', 'vertical', 'axial'],
    engineeringDomain: 'General',
    difficulty: 'Beginner',
    references: [],
    source: 'BeamLab Core Pack',
    version: { knowledgeVersion: '1.0', sourceVersion: '1.0', reviewStatus: 'Approved', updatedAt: new Date().toISOString() }
  },
  
  // Steel Design
  {
    id: 'BL-KNOW-STEEL-0001',
    category: 'Steel Design',
    title: 'Lateral Torsional Buckling',
    summary: 'A buckling failure mode where an unrestrained beam twists and deflects laterally under bending load.',
    detailedExplanation: 'When a beam is bent, the compression flange behaves like a column. If not braced laterally, it buckles out-of-plane, taking the tension flange with it and causing twisting.',
    keywords: ['LTB', 'buckling', 'bending', 'unrestrained'],
    engineeringDomain: 'Steel Design',
    difficulty: 'Advanced',
    references: ['IS 800:2007 Clause 8.2.2'],
    source: 'BeamLab Core Pack',
    version: { knowledgeVersion: '1.0', sourceVersion: '1.0', reviewStatus: 'Approved', updatedAt: new Date().toISOString() }
  },
  {
    id: 'BL-KNOW-STEEL-0002',
    category: 'Steel Design',
    title: 'Plastic Moment',
    summary: 'The moment at which the entire cross-section has yielded.',
    detailedExplanation: 'Calculated as Mp = Zp * fy, where Zp is the plastic section modulus and fy is the yield strength. This is the absolute maximum theoretical moment capacity before a plastic hinge forms.',
    keywords: ['yield', 'moment capacity', 'Zp', 'hinge'],
    engineeringDomain: 'Steel Design',
    difficulty: 'Intermediate',
    references: ['IS 800:2007 Clause 8.2.1'],
    source: 'BeamLab Core Pack',
    version: { knowledgeVersion: '1.0', sourceVersion: '1.0', reviewStatus: 'Approved', updatedAt: new Date().toISOString() }
  },

  // Concrete
  {
    id: 'BL-KNOW-CONCRETE-0001',
    category: 'Concrete Design',
    title: 'Flexure in Concrete',
    summary: 'The behavior of reinforced concrete elements under bending.',
    detailedExplanation: 'Concrete is assumed to have zero tensile strength. All tension is taken by steel reinforcement. The ultimate capacity depends on whether the section is under-reinforced or over-reinforced.',
    keywords: ['bending', 'rebar', 'tension', 'compression block'],
    engineeringDomain: 'Concrete Design',
    difficulty: 'Intermediate',
    references: ['IS 456:2000 Annex G'],
    source: 'BeamLab Core Pack',
    version: { knowledgeVersion: '1.0', sourceVersion: '1.0', reviewStatus: 'Approved', updatedAt: new Date().toISOString() }
  },

  // Loads
  {
    id: 'BL-KNOW-LOADS-0001',
    category: 'Structural Loads',
    title: 'Dead Load',
    summary: 'Static, permanent loads acting on a structure.',
    detailedExplanation: 'Dead loads consist of the weight of all materials of construction incorporated into the building, including walls, floors, roofs, ceilings, stairways, built-in partitions, finishes, cladding and other similarly incorporated architectural and structural items.',
    keywords: ['permanent', 'self-weight', 'gravity'],
    engineeringDomain: 'General',
    difficulty: 'Beginner',
    references: ['IS 875 Part 1'],
    source: 'BeamLab Core Pack',
    version: { knowledgeVersion: '1.0', sourceVersion: '1.0', reviewStatus: 'Approved', updatedAt: new Date().toISOString() }
  },
  {
    id: 'BL-KNOW-LOADS-0002',
    category: 'Structural Loads',
    title: 'Live Load',
    summary: 'Transient, variable loads that change over time.',
    detailedExplanation: 'Live loads are produced by the use and occupancy of the building or other structure and do not include construction or environmental loads such as wind load, snow load, rain load, earthquake load, flood load, or dead load.',
    keywords: ['occupancy', 'transient', 'variable'],
    engineeringDomain: 'General',
    difficulty: 'Beginner',
    references: ['IS 875 Part 2'],
    source: 'BeamLab Core Pack',
    version: { knowledgeVersion: '1.0', sourceVersion: '1.0', reviewStatus: 'Approved', updatedAt: new Date().toISOString() }
  },

  // Materials
  {
    id: 'BL-KNOW-MAT-0001',
    category: 'Materials',
    title: 'Structural Steel',
    summary: 'A category of steel used for making construction materials in a variety of shapes.',
    detailedExplanation: 'Standard structural steel (e.g. ASTM A992 or IS 2062) has a yield strength typically ranging from 250 MPa to 350 MPa. It is characterized by high ductility, high strength-to-weight ratio, and isotropic properties.',
    keywords: ['steel', 'yield', 'ductility', 'isotropic'],
    engineeringDomain: 'Materials',
    difficulty: 'Beginner',
    references: ['IS 2062'],
    source: 'BeamLab Core Pack',
    version: { knowledgeVersion: '1.0', sourceVersion: '1.0', reviewStatus: 'Approved', updatedAt: new Date().toISOString() }
  },

  // Standards Metadata
  {
    id: 'BL-KNOW-STD-IS800',
    category: 'Engineering Standards',
    title: 'IS 800:2007 General Construction in Steel — Code of Practice',
    summary: 'The Indian Standard code of practice for general construction in steel.',
    detailedExplanation: 'IS 800 covers the design of structural steelwork, primarily employing the Limit State Design method. It prescribes safety factors, load combinations, and capacity formulas for various failure modes.',
    keywords: ['code', 'IS 800', 'India', 'limit state'],
    engineeringDomain: 'Steel Design',
    difficulty: 'Intermediate',
    references: [],
    source: 'BeamLab Core Pack',
    version: { knowledgeVersion: '1.0', sourceVersion: '2007', reviewStatus: 'Approved', updatedAt: new Date().toISOString() }
  }
];

const KNOWLEDGE_RELATIONSHIPS: KnowledgeRelationshipType[] = [
  { sourceId: 'BL-KNOW-CONCEPT-0001', targetId: 'BL-KNOW-STEEL-0001', type: 'Checked By' },
  { sourceId: 'BL-KNOW-STEEL-0001', targetId: 'BL-KNOW-STD-IS800', type: 'Defined In' },
  { sourceId: 'BL-KNOW-STEEL-0001', targetId: 'BL-KNOW-STEEL-0002', type: 'Related To' },
  { sourceId: 'BL-KNOW-CONCEPT-0001', targetId: 'BL-KNOW-CONCRETE-0001', type: 'Uses' },
  { sourceId: 'BL-KNOW-CONCEPT-0001', targetId: 'BL-KNOW-LOADS-0001', type: 'Depends On' },
  { sourceId: 'BL-KNOW-CONCEPT-0001', targetId: 'BL-KNOW-LOADS-0002', type: 'Depends On' },
  { sourceId: 'BL-KNOW-CONCEPT-0001', targetId: 'BL-KNOW-MAT-0001', type: 'Uses' },
  { sourceId: 'BL-KNOW-STD-IS800', targetId: 'BL-KNOW-MAT-0001', type: 'References' }
];

export class StaticProvider implements IKnowledgeProvider {
  name = 'StaticProvider';
  version = '0.1.0';
  private eventBus?: KnowledgeEventBus;

  async initialize(eventBus: KnowledgeEventBus): Promise<void> {
    this.eventBus = eventBus;
    this.eventBus.emit('KnowledgeLoaded', { provider: this.name, count: KNOWLEDGE_ITEMS.length });
  }

  async getItems(): Promise<KnowledgeItem[]> {
    return [...KNOWLEDGE_ITEMS];
  }

  async getItem(id: string): Promise<KnowledgeItem | null> {
    return KNOWLEDGE_ITEMS.find(item => item.id === id) || null;
  }

  async getRelationships(): Promise<KnowledgeRelationshipType[]> {
    return [...KNOWLEDGE_RELATIONSHIPS];
  }

  async getRelationshipsForNode(id: string): Promise<KnowledgeRelationshipType[]> {
    return KNOWLEDGE_RELATIONSHIPS.filter(r => r.sourceId === id || r.targetId === id);
  }
}
