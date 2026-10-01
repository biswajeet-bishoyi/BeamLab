/**
 * BeamLab B1.5 — Master External Object Mapper
 */

import { PropertyMapper } from './PropertyMapping';
import { CoordinateMapper, CoordinateTransformOptions } from './CoordinateMapping';
import { MaterialMapper } from './MaterialMapping';
import { SectionMapper } from './SectionMapping';
import { RelationshipMapper } from './RelationshipMapping';
import { MappingIssue } from '../InteropTypes';

export class ExternalObjectMapper {
  readonly properties: PropertyMapper;
  readonly coordinates: CoordinateMapper;
  readonly materials: MaterialMapper;
  readonly sections: SectionMapper;
  readonly relationships: RelationshipMapper;

  readonly issues: MappingIssue[] = [];

  constructor(options?: {
    coordinateOptions?: CoordinateTransformOptions;
  }) {
    this.properties = new PropertyMapper();
    this.coordinates = new CoordinateMapper(options?.coordinateOptions);
    this.materials = new MaterialMapper();
    this.sections = new SectionMapper();
    this.relationships = new RelationshipMapper();
  }

  logIssue(issue: MappingIssue): void {
    this.issues.push(issue);
  }

  clearIssues(): void {
    this.issues.length = 0;
  }
}
