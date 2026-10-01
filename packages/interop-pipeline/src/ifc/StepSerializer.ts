/**
 * StepSerializer.ts
 *
 * Serializes IfcStructuralAnalysisModel into buildingSMART IFC4 (ISO 10303-21 STEP-SPF) format.
 * Generates official schema-compliant structural analysis models with 6-DOF boundary conditions,
 * 1D curve members, 2D surface members, and structural actions.
 */

import {
  IfcStructuralAnalysisModel,
  IfcBoundaryNodeCondition,
  BoundaryStiffness,
} from './IfcStructuralSchema';

export class StepSerializer {
  private idCounter = 1;
  private lines: string[] = [];

  private nextId(): number {
    return this.idCounter++;
  }

  private formatCoord(num: number): string {
    const formatted = num.toFixed(4);
    return formatted.includes('.') ? formatted : `${formatted}.`;
  }

  private formatStiffness(val: BoundaryStiffness): string {
    if (val === 'FIXED') return '.FIXED.';
    if (val === 'FREE') return '.FREE.';
    return typeof val === 'number' ? this.formatCoord(val) : '.FIXED.';
  }

  private generateGuid(seed?: string): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
    let res = '';
    const rnd = seed ? seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : Math.random() * 1e9;
    for (let i = 0; i < 22; i++) {
      res += chars.charAt(Math.floor((rnd * (i + 1) * 31) % chars.length));
    }
    return res;
  }

  /**
   * Serializes an IfcStructuralAnalysisModel into an ISO 10303-21 STEP physical file string.
   */
  serialize(model: IfcStructuralAnalysisModel): string {
    this.idCounter = 1;
    this.lines = [];

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

    // 1. Header Section
    this.lines.push('ISO-10303-21;');
    this.lines.push('HEADER;');
    this.lines.push("FILE_DESCRIPTION(('ViewDefinition [StructuralAnalysisView_V1.0]','IFC4 Structural Analysis Model'),'2;1');");
    this.lines.push(`FILE_NAME('${model.name || 'structural_model'}.ifc','${new Date().toISOString()}',('BeamLab User'),('BeamLab'),'BeamLab OpenBIM Pipeline v1.0','BeamLab','');`);
    this.lines.push("FILE_SCHEMA(('IFC4'));");
    this.lines.push('ENDSEC;');
    this.lines.push('DATA;');

    // 2. Foundation Metadata & Units
    const orgId = this.nextId();
    this.lines.push(`#${orgId}=IFCORGANIZATION($,'BeamLab Inc.',$,$,$);`);

    const appId = this.nextId();
    this.lines.push(`#${appId}=IFCAPPLICATION(#${orgId},'1.0','BeamLab Structural Platform','BeamLab');`);

    const personId = this.nextId();
    this.lines.push(`#${personId}=IFCPERSON($,'Structural Engineer',$,$,$,$,$,$);`);

    const personOrgId = this.nextId();
    this.lines.push(`#${personOrgId}=IFCPERSONANDORGANIZATION(#${personId},#${orgId},$);`);

    const ownerHistId = this.nextId();
    this.lines.push(`#${ownerHistId}=IFCOWNERHISTORY(#${personOrgId},#${appId},$,.NOCHANGE.,1788768000,#${personOrgId},#${appId},1788768000);`);

    // Standard SI Units (Meter, Newton, Radian)
    const unitLengthId = this.nextId();
    this.lines.push(`#${unitLengthId}=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);`);
    const unitForceId = this.nextId();
    this.lines.push(`#${unitForceId}=IFCSIUNIT(*,.FORCEUNIT.,.KILO.,.NEWTON.);`);
    const unitAngleId = this.nextId();
    this.lines.push(`#${unitAngleId}=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);`);
    const unitAssignId = this.nextId();
    this.lines.push(`#${unitAssignId}=IFCUNITASSIGNMENT((#${unitLengthId},#${unitForceId},#${unitAngleId}));`);

    // World Coordinate System Origin & Directions
    const worldOriginId = this.nextId();
    this.lines.push(`#${worldOriginId}=IFCCARTESIANPOINT((0.,0.,0.));`);
    const worldAxisZId = this.nextId();
    this.lines.push(`#${worldAxisZId}=IFCDIRECTION((0.,0.,1.));`);
    const worldAxisXId = this.nextId();
    this.lines.push(`#${worldAxisXId}=IFCDIRECTION((1.,0.,0.));`);
    const worldPlacementId = this.nextId();
    this.lines.push(`#${worldPlacementId}=IFCAXIS2PLACEMENT3D(#${worldOriginId},#${worldAxisZId},#${worldAxisXId});`);

    // Geometric Context
    const geomContextId = this.nextId();
    this.lines.push(`#${geomContextId}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#${worldPlacementId},$);`);

    // Project
    const projGuid = this.generateGuid(model.globalId + '_proj');
    const projId = this.nextId();
    this.lines.push(`#${projId}=IFCPROJECT('${projGuid}',#${ownerHistId},'${model.name || 'BeamLab Project'}',$,$,$,$,(#${geomContextId}),#${unitAssignId});`);

    // 3. Point Connections
    const connectionStepMap = new Map<string, number>(); // GlobalId -> Step ID
    const connectionEntities: number[] = [];

    for (const conn of model.connections) {
      // Cartesian point
      const ptId = this.nextId();
      const [x, y, z] = conn.location.coordinates;
      this.lines.push(`#${ptId}=IFCCARTESIANPOINT((${this.formatCoord(x)},${this.formatCoord(y)},${this.formatCoord(z)}));`);

      // Boundary condition if present
      let condId: number | null = null;
      if (conn.condition) {
        condId = this.nextId();
        const c = conn.condition;
        const condName = c.name || conn.name || 'Support';
        this.lines.push(
          `#${condId}=IFCBOUNDARYNODECONDITION('${condName}',${this.formatStiffness(c.translationalStiffnessX)},${this.formatStiffness(c.translationalStiffnessY)},${this.formatStiffness(c.translationalStiffnessZ)},${this.formatStiffness(c.rotationalStiffnessX)},${this.formatStiffness(c.rotationalStiffnessY)},${this.formatStiffness(c.rotationalStiffnessZ)});`
        );
      }

      const connStepId = this.nextId();
      const connGuid = conn.globalId || this.generateGuid(conn.name);
      const condParam = condId ? `#${condId}` : '$';
      this.lines.push(`#${connStepId}=IFCSTRUCTURALPOINTCONNECTION('${connGuid}',#${ownerHistId},'${conn.name}',$,$,#${ptId},${condParam});`);

      connectionStepMap.set(conn.globalId, connStepId);
      connectionEntities.push(connStepId);
    }

    // 4. Curve Members
    const curveMemberStepMap = new Map<string, number>();
    const memberEntities: number[] = [];

    for (const member of model.curveMembers) {
      const memStepId = this.nextId();
      const memGuid = member.globalId || this.generateGuid(member.name);
      const predType = `.${member.predefinedType || 'RIGID_JOINED_MEMBER'}.`;
      const profDesc = member.profileName ? `'${member.profileName}'` : '$';
      const matType = member.materialName ? `'${member.materialName}'` : '$';

      this.lines.push(`#${memStepId}=IFCSTRUCTURALCURVEMEMBER('${memGuid}',#${ownerHistId},'${member.name}',${profDesc},${matType},$,${predType});`);
      curveMemberStepMap.set(member.globalId, memStepId);
      memberEntities.push(memStepId);

      // RelConnects for Start and End nodes
      const startConnStepId = connectionStepMap.get(member.startConnectionId);
      const endConnStepId = connectionStepMap.get(member.endConnectionId);

      if (startConnStepId) {
        const relStartId = this.nextId();
        this.lines.push(`#${relStartId}=IFCRELCONNECTSSTRUCTURALMEMBER('${this.generateGuid()}',#${ownerHistId},$,$,#${memStepId},#${startConnStepId},$,$,$,$);`);
      }
      if (endConnStepId) {
        const relEndId = this.nextId();
        this.lines.push(`#${relEndId}=IFCRELCONNECTSSTRUCTURALMEMBER('${this.generateGuid()}',#${ownerHistId},$,$,#${memStepId},#${endConnStepId},$,$,$,$);`);
      }
    }

    // 4b. Surface Members
    for (const sm of (model.surfaceMembers || [])) {
      const smStepId = this.nextId();
      const smGuid = sm.globalId || this.generateGuid(sm.name);
      const predType = `.${sm.predefinedType || 'SHELL'}.`;
      const matType = sm.materialName ? `'${sm.materialName}'` : '$';
      this.lines.push(`#${smStepId}=IFCSTRUCTURALSURFACEMEMBER('${smGuid}',#${ownerHistId},'${sm.name}',$,${matType},$,${predType},${this.formatCoord(sm.thickness_m)});`);
      memberEntities.push(smStepId);
    }

    // 5. Load Groups & Cases
    const loadGroupStepMap = new Map<string, number>();
    for (const lg of model.loadGroups) {
      const lgStepId = this.nextId();
      const lgGuid = lg.globalId || this.generateGuid(lg.name);
      const lgType = `.${lg.predefinedType || 'LOAD_CASE'}.`;
      const actionType = `.${lg.actionType || 'PERMANENT_G'}.`;
      const coeff = lg.coefficient ? this.formatCoord(lg.coefficient) : '$';

      this.lines.push(`#${lgStepId}=IFCSTRUCTURALLOADGROUP('${lgGuid}',#${ownerHistId},'${lg.name}',$,$,${lgType},${actionType},${coeff});`);
      loadGroupStepMap.set(lg.globalId, lgStepId);
    }

    // 6. Point Actions (Nodal Loads)
    for (const pa of model.pointActions) {
      const paStepId = this.nextId();
      const connStepId = connectionStepMap.get(pa.connectionGlobalId);
      const lgStepId = loadGroupStepMap.get(pa.loadGroupGlobalId);

      if (connStepId && lgStepId) {
        const [fx, fy, fz] = pa.forces_kN;
        const [mx, my, mz] = pa.moments_kNm;
        // IfcStructuralLoadSingleForce
        const loadValId = this.nextId();
        this.lines.push(`#${loadValId}=IFCSTRUCTURALLOADSINGLEFORCE('${pa.name}',${this.formatCoord(fx)},${this.formatCoord(fy)},${this.formatCoord(fz)},${this.formatCoord(mx)},${this.formatCoord(my)},${this.formatCoord(mz)});`);
        this.lines.push(`#${paStepId}=IFCSTRUCTURALPOINTACTION('${pa.globalId}',#${ownerHistId},'${pa.name}',$,$,#${connStepId},#${lgStepId},.TRUE.,#${loadValId});`);
      }
    }

    // 7. Curve Actions (Line Loads)
    for (const ca of model.curveActions) {
      const caStepId = this.nextId();
      const memStepId = curveMemberStepMap.get(ca.memberGlobalId);
      const lgStepId = loadGroupStepMap.get(ca.loadGroupGlobalId);

      if (memStepId && lgStepId) {
        const [wx, wy, wz] = ca.startForce_kN_m;
        const loadValId = this.nextId();
        this.lines.push(`#${loadValId}=IFCSTRUCTURALLOADLINEARFORCE('${ca.name}',${this.formatCoord(wx)},${this.formatCoord(wy)},${this.formatCoord(wz)},$,$,$);`);
        const distType = `.${ca.distributionType || 'UNIFORM'}.`;
        this.lines.push(`#${caStepId}=IFCSTRUCTURALCURVEACTION('${ca.globalId}',#${ownerHistId},'${ca.name}',$,$,#${memStepId},#${lgStepId},.TRUE.,${distType},#${loadValId});`);
      }
    }

    // 8. IfcStructuralAnalysisModel Container
    const modelStepId = this.nextId();
    const modelGuid = model.globalId || this.generateGuid('AnalysisModel');
    const connRefs = connectionEntities.map(id => `#${id}`).join(',');
    const memRefs = memberEntities.map(id => `#${id}`).join(',');
    const isLoaded = model.isLoaded ? '.TRUE.' : '.FALSE.';

    this.lines.push(`#${modelStepId}=IFCSTRUCTURALANALYSISMODEL('${modelGuid}',#${ownerHistId},'${model.name || 'Structural Analysis Model'}',$,$,.STRUCTURAL_ANALYSIS_MODEL.,(${connRefs}),$,(${memRefs}),${isLoaded});`);

    // RelAggregates linking Project to Analysis Model
    const relAggId = this.nextId();
    this.lines.push(`#${relAggId}=IFCRELAGGREGATES('${this.generateGuid()}',#${ownerHistId},$,$,#${projId},(#${modelStepId}));`);

    this.lines.push('ENDSEC;');
    this.lines.push('END-ISO-10303-21;');

    return this.lines.join('\n');
  }
}
