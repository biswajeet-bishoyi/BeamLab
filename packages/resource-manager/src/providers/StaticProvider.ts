import { Resource } from '../core/ResourceModel';
import { ResourceSchema } from '../core/ResourceSchema';
import { IResourceProvider } from './IResourceProvider';
import { SteelSectionProperties } from '../core/properties/SteelSectionProperties';
import { ConcreteProperties } from '../core/properties/ConcreteProperties';
import { MaterialProperties } from '../core/properties/MaterialProperties';
import { LoadProperties } from '../core/properties/LoadProperties';

const BEAMLAB_SCHEMAS: import('../core/ResourceSchema').ResourceSchema<any>[] = [
  {
    resourceType: 'SteelSection',
    displayName: 'Steel Section',
    description: 'Structural steel profile geometry and mechanical properties.',
    properties: [
      { name: 'sectionName', displayName: 'Section Name', description: 'Standard designation', type: 'string', category: 'General' },
      { name: 'depth', displayName: 'Depth', description: 'Overall depth', unit: 'mm', type: 'number', category: 'Geometry' },
      { name: 'width', displayName: 'Width', description: 'Flange width', unit: 'mm', type: 'number', category: 'Geometry' },
      { name: 'crossSectionalArea', displayName: 'Area', description: 'Cross sectional area', unit: 'mm²', type: 'number', category: 'Mechanical' },
      { name: 'massPerMeter', displayName: 'Mass', description: 'Mass per linear meter', unit: 'kg/m', type: 'number', category: 'Mechanical' },
      { name: 'yieldStrength', displayName: 'Yield Strength', description: 'Minimum yield strength', unit: 'MPa', type: 'number', category: 'Material' }
    ]
  },
  {
    resourceType: 'ConcreteGrade',
    displayName: 'Concrete Grade',
    description: 'Standard concrete mixes and their properties.',
    properties: [
      { name: 'grade', displayName: 'Grade Designation', description: 'e.g. M20, M25', type: 'string', category: 'General' },
      { name: 'compressiveStrength', displayName: 'Compressive Strength', description: 'Characteristic compressive strength at 28 days', unit: 'MPa', type: 'number', category: 'Mechanical' },
      { name: 'elasticModulus', displayName: 'Elastic Modulus', description: 'Modulus of elasticity', unit: 'MPa', type: 'number', category: 'Mechanical' },
      { name: 'density', displayName: 'Density', description: 'Material density', unit: 'kg/m³', type: 'number', category: 'Physical' }
    ]
  }
];

const BEAMLAB_RESOURCES: Resource<any>[] = [
  {
    id: 'BL-RES-ISMB-200',
    type: 'SteelSection',
    name: 'ISMB 200',
    description: 'Indian Standard Medium Weight Beam 200',
    version: { version: '1.0.0', status: 'Active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    properties: {
      sectionName: 'ISMB 200',
      designation: 'ISMB 200',
      depth: 200,
      width: 100,
      webThickness: 5.7,
      flangeThickness: 10.8,
      crossSectionalArea: 3233,
      massPerMeter: 25.4,
      momentOfInertiaX: 2129.8 * 10000,
      momentOfInertiaY: 152.3 * 10000,
      radiusOfGyrationX: 83.2,
      radiusOfGyrationY: 21.5,
      elasticModulusX: 212.9 * 1000,
      elasticModulusY: 30.5 * 1000,
      plasticModulusX: 242.8 * 1000,
      plasticModulusY: 48.4 * 1000,
      yieldStrength: 250
    } as SteelSectionProperties,
    metadata: { source: 'IS 800:2007', tags: ['Steel', 'I-Section', 'Indian Standard'] }
  },
  {
    id: 'BL-RES-ISMB-300',
    type: 'SteelSection',
    name: 'ISMB 300',
    description: 'Indian Standard Medium Weight Beam 300',
    version: { version: '1.0.0', status: 'Active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    properties: {
      sectionName: 'ISMB 300',
      designation: 'ISMB 300',
      depth: 300,
      width: 140,
      webThickness: 7.5,
      flangeThickness: 12.4,
      crossSectionalArea: 5626,
      massPerMeter: 44.2,
      momentOfInertiaX: 8603.6 * 10000,
      momentOfInertiaY: 453.9 * 10000,
      radiusOfGyrationX: 123.7,
      radiusOfGyrationY: 28.4,
      elasticModulusX: 573.6 * 1000,
      elasticModulusY: 64.8 * 1000,
      plasticModulusX: 651.7 * 1000,
      plasticModulusY: 102.3 * 1000,
      yieldStrength: 250
    } as SteelSectionProperties,
    metadata: { source: 'IS 800:2007', tags: ['Steel', 'I-Section', 'Indian Standard'] }
  },
  {
    id: 'BL-RES-M20',
    type: 'ConcreteGrade',
    name: 'M20 Concrete',
    description: 'Standard M20 Grade Concrete',
    version: { version: '1.0.0', status: 'Active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    properties: {
      grade: 'M20',
      compressiveStrength: 20,
      elasticModulus: 22360,
      density: 2500,
      poissonsRatio: 0.2,
      thermalExpansion: 0.00001
    } as ConcreteProperties,
    metadata: { source: 'IS 456:2000', tags: ['Concrete', 'Indian Standard'] }
  },
  {
    id: 'BL-RES-FE415',
    type: 'Material',
    name: 'Fe 415 Steel',
    description: 'High Yield Strength Deformed Bars',
    version: { version: '1.0.0', status: 'Active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    properties: {
      designation: 'Fe415',
      elasticModulus: 200000,
      poissonsRatio: 0.3,
      density: 7850,
      yieldStrength: 415,
      ultimateStrength: 485,
      thermalExpansion: 0.000012
    } as MaterialProperties,
    metadata: { source: 'IS 1786:2008', tags: ['Rebar', 'Steel', 'Indian Standard'] }
  },
  {
    id: 'BL-RES-LOAD-POINT',
    type: 'LoadPattern',
    name: 'Point Load Template',
    description: 'Generic point load definition',
    version: { version: '1.0.0', status: 'Active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    properties: {
      type: 'Point',
      direction: 'Global_Z',
      isPattern: true
    } as LoadProperties,
    metadata: { source: 'BeamLab Core', tags: ['Load', 'Template'] }
  }
];

export class StaticProvider implements IResourceProvider {
  public name = "BeamLab Core Resource Pack";
  public description = "Standard collection of resources including IS codes and basic primitives.";
  public version = "0.1.0";

  public getSchemas() {
    return BEAMLAB_SCHEMAS;
  }

  public async getResourceById(id: string): Promise<Resource<any> | null> {
    return BEAMLAB_RESOURCES.find(r => r.id === id) || null;
  }

  public async getResourcesByType(type: string): Promise<Resource<any>[]> {
    return BEAMLAB_RESOURCES.filter(r => r.type === type);
  }

  public async getAllResources(): Promise<Resource<any>[]> {
    return BEAMLAB_RESOURCES;
  }
}
