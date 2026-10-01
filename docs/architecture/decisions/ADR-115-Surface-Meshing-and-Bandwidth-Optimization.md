# ADR-115: 2D Surface Meshing & Bandwidth Optimization Engine

## Status
Accepted

## Context
Finite element analysis of reinforced concrete slabs, transfer decks, shear walls, and core wall systems requires converting CAD/BIM architectural boundary definitions into conforming 2D quadrilateral meshes.

Key engineering requirements:
1. **Regular & Polygon Domains**: Automatic generation of quad elements over rectangular floor bays as well as irregular polygonal slabs with interior column hard-points and cutouts (staircases, MEP shafts, elevator cores).
2. **Matrix Bandwidth & Profile**: Arbitrary node creation causes large differences between connected node indices, creating huge bandwidth $\beta = \max |i - j|$ in the global stiffness matrix $[K]$. High bandwidth causes Cholesky factor fill-in, exhausting memory and slowing sparse matrix equation solves.
3. **Cuthill-McKee & Reverse Cuthill-McKee (RCM)**: Re-ordering node numbering through breadth-first search degree ordering dramatically reduces matrix profile and bandwidth.

## Decision
We implement `SurfaceMeshEngine` in `@beamlab/fem-engine/src/mesh/`:

1. **Structured Quad Grid Meshing (`generateStructuredQuadMesh`)**:
   - Discretizes regular rectangular slab bays $[0, L_x] \times [0, L_y]$ into $n_x \times n_y$ elements with counter-clockwise node connectivity.
   - Computes element centroid, surface area, and global nodal coordinates.

2. **Boundary-Conforming Planar Polygon Meshing (`generatePlanarPolygonMesh`)**:
   - Uses Ray-Casting Point-in-Polygon (PIP) classification.
   - Accurately excludes interior void openings (elevator shafts, stairwells).
   - Resolves shared corner nodes through spatial hashing.

3. **Reverse Cuthill-McKee (RCM) Optimization**:
   - Automatically builds element node adjacency graphs.
   - Identifies minimum degree pseudo-peripheral root nodes.
   - Computes the Cuthill-McKee sequence and reverses it to produce the bandwidth-minimized node ordering.
   - Remaps element connectivity arrays to the new node numbering.

## Consequences
- Enables automated meshing of complex floor plates and shear walls directly from geometric boundaries.
- Minimizes global stiffness matrix bandwidth for high-performance direct and iterative equation solvers.
- Feeds into internal stress field calculations (Sprint B19.3) and the 3D Plate & Shell Studio (Sprint B19.5).
