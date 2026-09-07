/**
 * IfcStructuralSchema.ts
 *
 * buildingSMART IFC4 StructuralAnalysisDomain schema representations
 * per ISO 16739-1:
 * - IfcStructuralAnalysisModel
 * - IfcStructuralPointConnection & IfcBoundaryNodeCondition
 * - IfcStructuralCurveMember & IfcStructuralSurfaceMember
 * - IfcStructuralLoadGroup, IfcStructuralPointAction & IfcStructuralCurveAction
 */

export interface IfcCartesianPoint {
  readonly id?: number;
  readonly coordinates: [number, number, number]; // [X, Y, Z] in meters
}

export interface IfcDirection {
  readonly id?: number;
  readonly directionRatios: [number, number, number]; // [dx, dy, dz]
}

export interface IfcAxis2Placement3D {
  readonly id?: number;
  readonly location: IfcCartesianPoint;
  readonly axis?: IfcDirection; // Z-axis orientation
  readonly refDirection?: IfcDirection; // X-axis orientation
}

export type BoundaryStiffness = number | 'FIXED' | 'FREE';

export interface IfcBoundaryNodeCondition {
  readonly id?: number;
  readonly name?: string;
  // Translational stiffness (N/m or FIXED/FREE)
  readonly translationalStiffnessX: BoundaryStiffness;
  readonly translationalStiffnessY: BoundaryStiffness;
  readonly translationalStiffnessZ: BoundaryStiffness;
  // Rotational stiffness (N*m/rad or FIXED/FREE)
  readonly rotationalStiffnessX: BoundaryStiffness;
  readonly rotationalStiffnessY: BoundaryStiffness;
  readonly rotationalStiffnessZ: BoundaryStiffness;
}

export interface IfcStructuralPointConnection {
  readonly id?: number;
  readonly globalId: string;
  readonly name: string;
  readonly location: IfcCartesianPoint;
  readonly condition?: IfcBoundaryNodeCondition;
}

export type IfcStructuralCurveMemberTypeEnum =
  | 'RIGID_JOINED_MEMBER'
  | 'PIN_JOINED_MEMBER'
  | 'CABLE'
  | 'TENSION_MEMBER'
  | 'COMPRESSION_MEMBER'
  | 'USERDEFINED';

export interface IfcStructuralCurveMember {
  readonly id?: number;
  readonly globalId: string;
  readonly name: string;
  readonly predefinedType: IfcStructuralCurveMemberTypeEnum;
  readonly startConnectionId: string; // GlobalId of start point connection
  readonly endConnectionId: string; // GlobalId of end point connection
  readonly placement?: IfcAxis2Placement3D;
  readonly profileName?: string; // e.g. "W14X90", "IPE300", "HEB200"
  readonly materialName?: string; // e.g. "Steel S355", "Concrete C30/37"
  // End release flags (true if pinned/free for rotation)
  readonly startRelease?: { rx: boolean; ry: boolean; rz: boolean };
  readonly endRelease?: { rx: boolean; ry: boolean; rz: boolean };
}

export type IfcStructuralSurfaceMemberTypeEnum =
  | 'BENDING_ELEMENT'
  | 'MEMBRANE_ELEMENT'
  | 'SHELL'
  | 'USERDEFINED';

export interface IfcStructuralSurfaceMember {
  readonly id?: number;
  readonly globalId: string;
  readonly name: string;
  readonly predefinedType: IfcStructuralSurfaceMemberTypeEnum;
  readonly thickness_m: number;
  readonly boundaryConnectionIds: string[]; // Ordered point connection globalIds
  readonly materialName?: string;
}

export type IfcActionTypeEnum =
  | 'PERMANENT_G'
  | 'VARIABLE_Q'
  | 'EXTRAORDINARY'
  | 'WIND'
  | 'SEISMIC'
  | 'TEMPERATURE'
  | 'USERDEFINED';

export type IfcLoadGroupTypeEnum =
  | 'LOAD_GROUP'
  | 'LOAD_CASE'
  | 'LOAD_COMBINATION'
  | 'USERDEFINED';

export interface IfcStructuralLoadGroup {
  readonly id?: number;
  readonly globalId: string;
  readonly name: string;
  readonly actionType: IfcActionTypeEnum;
  readonly predefinedType: IfcLoadGroupTypeEnum;
  readonly coefficient?: number; // e.g. 1.2 for DL, 1.6 for LL
}

export interface IfcStructuralPointAction {
  readonly id?: number;
  readonly globalId: string;
  readonly name: string;
  readonly connectionGlobalId: string;
  readonly loadGroupGlobalId: string;
  // Forces in kN [Fx, Fy, Fz]
  readonly forces_kN: [number, number, number];
  // Moments in kNm [Mx, My, Mz]
  readonly moments_kNm: [number, number, number];
}

export interface IfcStructuralCurveAction {
  readonly id?: number;
  readonly globalId: string;
  readonly name: string;
  readonly memberGlobalId: string;
  readonly loadGroupGlobalId: string;
  readonly distributionType: 'UNIFORM' | 'LINEAR';
  // Linear load intensity in kN/m [wx, wy, wz]
  readonly startForce_kN_m: [number, number, number];
  readonly endForce_kN_m?: [number, number, number];
}

export interface IfcStructuralAnalysisModel {
  readonly globalId: string;
  readonly name: string;
  readonly description?: string;
  readonly isLoaded: boolean;
  readonly connections: IfcStructuralPointConnection[];
  readonly curveMembers: IfcStructuralCurveMember[];
  readonly surfaceMembers: IfcStructuralSurfaceMember[];
  readonly loadGroups: IfcStructuralLoadGroup[];
  readonly pointActions: IfcStructuralPointAction[];
  readonly curveActions: IfcStructuralCurveAction[];
}
