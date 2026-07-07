import { Standard, Clause } from '../models';

export interface IStandardProvider {
  getStandard(id: string): Promise<Standard | undefined>;
  getClauses(standardId: string): Promise<Clause[]>;
  getAllStandards(): Promise<Standard[]>;
}

export class StaticProvider implements IStandardProvider {
  private standards: Standard[] = [
    {
      id: 'IS-800:2007',
      name: 'General Construction in Steel — Code of Practice',
      revision: '2007',
      provider: 'StaticProvider',
      description: 'Indian Standard for general steel construction.'
    },
    {
      id: 'AISC-360-16',
      name: 'Specification for Structural Steel Buildings',
      revision: '2016',
      provider: 'StaticProvider',
      description: 'American standard for steel buildings.'
    }
  ];

  private clauses: Record<string, Clause[]> = {
    'IS-800:2007': [
      {
        id: 'cl-8.2.1.2',
        standardId: 'IS-800:2007',
        title: 'Design Compressive Strength',
        description: 'The design compressive strength of a member is given by P_d = A_e * f_cd.',
        applicability: ['Compression Members'],
        severity: 'Error'
      }
    ],
    'AISC-360-16': [
      {
        id: 'cl-E3',
        standardId: 'AISC-360-16',
        title: 'Flexural Buckling of Members without Slender Elements',
        description: 'The nominal compressive strength, Pn, shall be determined based on the limit state of flexural buckling.',
        applicability: ['Compression Members'],
        severity: 'Error'
      }
    ]
  };

  public async getStandard(id: string): Promise<Standard | undefined> {
    return this.standards.find(s => s.id === id);
  }

  public async getClauses(standardId: string): Promise<Clause[]> {
    return this.clauses[standardId] || [];
  }

  public async getAllStandards(): Promise<Standard[]> {
    return this.standards;
  }
}

export class JSONProvider implements IStandardProvider {
  // In a real implementation, this would load from a .json file or remote URL
  public async getStandard(id: string): Promise<Standard | undefined> {
    throw new Error('JSONProvider not implemented');
  }

  public async getClauses(standardId: string): Promise<Clause[]> {
    throw new Error('JSONProvider not implemented');
  }

  public async getAllStandards(): Promise<Standard[]> {
    return [];
  }
}
