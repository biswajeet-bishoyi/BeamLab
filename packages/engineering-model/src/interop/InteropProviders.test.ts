import { describe, it, expect } from 'vitest';
import { CsvInteropProvider } from './providers/CsvInteropProvider';
import { DxfInteropProvider } from './providers/DxfInteropProvider';
import { IfcInteropProvider } from './providers/IfcInteropProvider';
import { Sap2000InteropProvider } from './providers/Sap2000InteropProvider';
import { StaadInteropProvider } from './providers/StaadInteropProvider';
import { EngineeringNode, EngineeringMember } from '../geometry/Geometry';
import { EngineeringSupport } from '../boundary/Boundary';

describe('B1.5 Interop Providers', () => {
  describe('CsvInteropProvider', () => {
    const csvContent = `
# Structural Frame CSV Definition
NODE, n1, Node-1, 0, 0, 0
NODE, n2, Node-2, 6, 0, 0
NODE, n3, Node-3, 6, 0, 3.5
NODE, n4, Node-4, 0, 0, 3.5
MEMBER, m1, Col-1, n1, n4
MEMBER, m2, Beam-1, n4, n3
MEMBER, m3, Col-2, n2, n3
SUPPORT, sup1, n1, 1, 1, 1, 1, 1, 1
SUPPORT, sup2, n2, 1, 1, 1, 0, 0, 0
`;

    it('imports nodes, members, and supports from CSV', () => {
      const provider = new CsvInteropProvider();
      const model = provider.importModel(csvContent);

      const nodes = model.objects.getByType<EngineeringNode>('Node');
      const members = model.objects.getByType<EngineeringMember>('Member');
      const supports = model.objects.getByType<EngineeringSupport>('Support');

      expect(nodes.length).toBe(4);
      expect(members.length).toBe(3);
      expect(supports.length).toBe(2);

      const n3 = nodes.find(n => n.identity.id === 'n3');
      expect(n3?.x).toBe(6);
      expect(n3?.z).toBe(3.5);

      const sup1 = supports.find(s => s.identity.id === 'sup1');
      expect(sup1?.restraints.dx).toBe(true);
      expect(sup1?.restraints.rx).toBe(true);

      const sup2 = supports.find(s => s.identity.id === 'sup2');
      expect(sup2?.restraints.dx).toBe(true);
      expect(sup2?.restraints.rx).toBe(false);
    });

    it('exports model to CSV format', () => {
      const provider = new CsvInteropProvider();
      const model = provider.importModel(csvContent);
      const exported = provider.exportModel(model);

      expect(exported).toContain('NODE,n1,Node-1,0,0,0');
      expect(exported).toContain('MEMBER,m1,Col-1,n1,n4');
      expect(exported).toContain('SUPPORT,sup1,n1,1,1,1,1,1,1');
    });
  });

  describe('DxfInteropProvider', () => {
    // Standard ASCII DXF with two connected lines sharing a common vertex (0, 0, 3500)
    const dxfContent = `
0
SECTION
2
ENTITIES
0
LINE
8
COLUMNS
10
0.0
20
0.0
30
0.0
11
0.0
21
0.0
31
3500.0
0
LINE
8
BEAMS
10
0.0
20
0.0
30
3500.0
11
6000.0
21
0.0
31
3500.0
0
ENDSEC
0
EOF
`;

    it('imports DXF wireframe, converts mm to m, and merges coincident vertices', () => {
      const provider = new DxfInteropProvider();
      const model = provider.importModel(dxfContent, {
        sourceUpAxis: 'Z',
        lengthScaleFactor: 0.001,
      });

      const nodes = model.objects.getByType<EngineeringNode>('Node');
      const members = model.objects.getByType<EngineeringMember>('Member');

      // 3 unique vertices (0,0,0), (0,0,3.5), (6,0,3.5)
      expect(nodes.length).toBe(3);
      expect(members.length).toBe(2);

      const middleNode = nodes.find(n => Math.abs(n.z - 3.5) < 1e-4 && Math.abs(n.x) < 1e-4);
      expect(middleNode).toBeDefined();
    });

    it('exports model to DXF LINE and POINT entities', () => {
      const provider = new DxfInteropProvider();
      const model = provider.importModel(dxfContent, {
        sourceUpAxis: 'Z',
        lengthScaleFactor: 0.001,
      });
      const exported = provider.exportModel(model, { lengthUnit: 'm' });

      expect(exported).toContain('SECTION');
      expect(exported).toContain('ENTITIES');
      expect(exported).toContain('POINT');
      expect(exported).toContain('LINE');
      expect(exported).toContain('EOF');
    });
  });

  describe('IfcInteropProvider', () => {
    const ifcContent = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('IFC structural test'),'2;1');
FILE_NAME('test.ifc','2026-09-07T00:00:00',('User'),('BeamLab'),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#10=IFCCARTESIANPOINT((0.,0.,0.));
#11=IFCCARTESIANPOINT((0.,0.,4.0));
#20=IFCSTRUCTURALPOINTCONNECTION('guid-1',$,'Joint-1',$,$,#10,$);
#21=IFCSTRUCTURALPOINTCONNECTION('guid-2',$,'Joint-2',$,$,#11,$);
#30=IFCSTRUCTURALCURVEMEMBER('guid-m1',$,'Column-A',$,$,$,.RIGID_JOINED_MEMBER.);
#40=IFCRELCONNECTSSTRUCTURALMEMBER(#30,#20,$,$,$,$);
#41=IFCRELCONNECTSSTRUCTURALMEMBER(#30,#21,$,$,$,$);
ENDSEC;
END-ISO-10303-21;
`;

    it('imports IFC Structural Point Connections and Curve Members', () => {
      const provider = new IfcInteropProvider();
      const model = provider.importModel(ifcContent);

      const nodes = model.objects.getByType<EngineeringNode>('Node');
      const members = model.objects.getByType<EngineeringMember>('Member');

      expect(nodes.length).toBe(2);
      expect(members.length).toBe(1);

      const mem = members[0]!;
      expect(mem.identity.name).toBe('Column-A');
      expect(mem.startNodeId).toBe('node-20');
      expect(mem.endNodeId).toBe('node-21');
    });

    it('exports model to ISO-10303-21 IFC4 STEP-SPF syntax', () => {
      const provider = new IfcInteropProvider();
      const model = provider.importModel(ifcContent);
      const exported = provider.exportModel(model);

      expect(exported).toContain('ISO-10303-21;');
      expect(exported).toContain('FILE_SCHEMA((\'IFC4\'));');
      expect(exported).toContain('IFCCARTESIANPOINT');
      expect(exported).toContain('IFCSTRUCTURALPOINTCONNECTION');
      expect(exported).toContain('IFCSTRUCTURALCURVEMEMBER');
      expect(exported).toContain('IFCRELCONNECTSSTRUCTURALMEMBER');
      expect(exported).toContain('END-ISO-10303-21;');
    });
  });

  describe('Sap2000InteropProvider', () => {
    const s2kContent = `
; CSI SAP2000 Text File
TABLE:  "JOINT COORDINATES"
   Joint=1   CoordSys=GLOBAL   CoordType=Cartesian   XorR=0   Y=0   Z=0   SpecialJt=No
   Joint=2   CoordSys=GLOBAL   CoordType=Cartesian   XorR=6.0   Y=0   Z=3.0   SpecialJt=No

TABLE:  "CONNECTIVITY - FRAME"
   Frame=1   JointI=1   JointJ=2   IsCurved=No

TABLE:  "JOINT RESTRAINT ASSIGNMENTS"
   Joint=1   U1=Yes   U2=Yes   U3=Yes   R1=Yes   R2=Yes   R3=Yes

END TABLE DATA
`;

    it('imports SAP2000 joint coordinates, frame connectivity, and restraints', () => {
      const provider = new Sap2000InteropProvider();
      const model = provider.importModel(s2kContent);

      const nodes = model.objects.getByType<EngineeringNode>('Node');
      const members = model.objects.getByType<EngineeringMember>('Member');
      const supports = model.objects.getByType<EngineeringSupport>('Support');

      expect(nodes.length).toBe(2);
      expect(members.length).toBe(1);
      expect(supports.length).toBe(1);

      const sup = supports[0]!;
      expect(sup.restraints.dx).toBe(true);
      expect(sup.restraints.rx).toBe(true);
    });

    it('exports model to CSI SAP2000 s2k table format', () => {
      const provider = new Sap2000InteropProvider();
      const model = provider.importModel(s2kContent);
      const exported = provider.exportModel(model);

      expect(exported).toContain('TABLE:  "JOINT COORDINATES"');
      expect(exported).toContain('TABLE:  "CONNECTIVITY - FRAME"');
      expect(exported).toContain('TABLE:  "JOINT RESTRAINT ASSIGNMENTS"');
      expect(exported).toContain('U1=Yes');
      expect(exported).toContain('END TABLE DATA');
    });
  });

  describe('StaadInteropProvider', () => {
    const staadContent = `
STAAD SPACE
START JOB INFORMATION
ENGINEER DATE 07-Sep-26
JOB NAME TEST PORTAL
END JOB INFORMATION
INPUT WIDTH 79
UNIT METER KN
JOINT COORDINATES
1 0.0 0.0 0.0 ;
2 0.0 4.0 0.0 ;
3 5.0 4.0 0.0 ;
4 5.0 0.0 0.0 ;
MEMBER INCIDENCES
1 1 2 ;
2 2 3 ;
3 4 3 ;
SUPPORTS
1 FIXED
4 PINNED
PERFORM ANALYSIS
FINISH
`;

    it('imports STAAD command file, transposing Y-up to Z-up', () => {
      const provider = new StaadInteropProvider();
      const model = provider.importModel(staadContent);

      const nodes = model.objects.getByType<EngineeringNode>('Node');
      const members = model.objects.getByType<EngineeringMember>('Member');
      const supports = model.objects.getByType<EngineeringSupport>('Support');

      expect(nodes.length).toBe(4);
      expect(members.length).toBe(3);
      expect(supports.length).toBe(2);

      const n2 = nodes.find(n => n.identity.id === 'node-2');
      expect(n2?.z).toBe(4.0); // STAAD Y elevation transposed to BeamLab Z
    });

    it('exports model to STAAD command format', () => {
      const provider = new StaadInteropProvider();
      const model = provider.importModel(staadContent);
      const exported = provider.exportModel(model);

      expect(exported).toContain('STAAD SPACE');
      expect(exported).toContain('JOINT COORDINATES');
      expect(exported).toContain('MEMBER INCIDENCES');
      expect(exported).toContain('SUPPORTS');
      expect(exported).toContain('FIXED');
      expect(exported).toContain('PINNED');
      expect(exported).toContain('PERFORM ANALYSIS');
      expect(exported).toContain('FINISH');
    });
  });
});
