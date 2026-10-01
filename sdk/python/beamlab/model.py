"""
BeamLab Python Model - Structural Mechanics & Matrix Assembly
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import math
import numpy as np


@dataclass
class Node:
    id: int
    x: float
    y: float
    z: float = 0.0
    fixed: List[bool] = field(default_factory=lambda: [False, False, False])  # [ux, uy, rz]


@dataclass
class Member:
    id: int
    start_node: Node
    end_node: Node
    A: float  # Cross-sectional area (m²)
    I: float  # Second moment of area (m⁴)
    E: float  # Young's modulus (Pa)

    @property
    def length(self) -> float:
        dx = self.end_node.x - self.start_node.x
        dy = self.end_node.y - self.start_node.y
        return math.sqrt(dx * dx + dy * dy)

    @property
    def angle(self) -> float:
        dx = self.end_node.x - self.start_node.x
        dy = self.end_node.y - self.start_node.y
        return math.atan2(dy, dx)

    def local_stiffness(self) -> np.ndarray:
        """6x6 local beam stiffness matrix in 2D"""
        L = self.length
        E = self.E
        A = self.A
        I = self.I

        k = np.zeros((6, 6))
        ea_l = E * A / L
        ei_l3 = 12 * E * I / (L**3)
        ei_l2 = 6 * E * I / (L**2)
        ei_l = 4 * E * I / L

        k[0, 0] = ea_l
        k[0, 3] = -ea_l
        k[3, 0] = -ea_l
        k[3, 3] = ea_l

        k[1, 1] = ei_l3
        k[1, 2] = ei_l2
        k[1, 4] = -ei_l3
        k[1, 5] = ei_l2

        k[2, 1] = ei_l2
        k[2, 2] = ei_l
        k[2, 4] = -ei_l2
        k[2, 5] = ei_l / 2

        k[4, 1] = -ei_l3
        k[4, 2] = -ei_l2
        k[4, 4] = ei_l3
        k[4, 5] = -ei_l2

        k[5, 1] = ei_l2
        k[5, 2] = ei_l / 2
        k[5, 4] = -ei_l2
        k[5, 5] = ei_l

        return k

    def transformation_matrix(self) -> np.ndarray:
        """6x6 coordinate rotation matrix"""
        theta = self.angle
        c = math.cos(theta)
        s = math.sin(theta)

        T = np.zeros((6, 6))
        T[0:2, 0:2] = [[c, s], [-s, c]]
        T[2, 2] = 1.0
        T[3:5, 3:5] = [[c, s], [-s, c]]
        T[5, 5] = 1.0
        return T

    def global_stiffness(self) -> np.ndarray:
        """K_global = T^T * K_local * T"""
        T = self.transformation_matrix()
        k_local = self.local_stiffness()
        return T.T @ k_local @ T


class Model:
    """Computational Structural Frame Model"""

    def __init__(self, name: str = "BeamLab Frame Model"):
        self.name = name
        self.nodes: List[Node] = []
        self.members: List[Member] = []
        self.nodal_loads: Dict[int, List[float]] = {}  # node_id -> [Fx, Fy, Mz]

    def add_node(
        self, x: float, y: float, z: float = 0.0, fixed: Optional[List[bool]] = None
    ) -> Node:
        node_id = len(self.nodes)
        node = Node(id=node_id, x=x, y=y, z=z, fixed=fixed or [False, False, False])
        self.nodes.append(node)
        return node

    def add_member(
        self, start_node: Node, end_node: Node, A: float, I: float, E: float = 200e9
    ) -> Member:
        member_id = len(self.members)
        member = Member(
            id=member_id,
            start_node=start_node,
            end_node=end_node,
            A=A,
            I=I,
            E=E,
        )
        self.members.append(member)
        return member

    def add_nodal_load(
        self, node: Node, fx: float = 0.0, fy: float = 0.0, mz: float = 0.0
    ):
        self.nodal_loads[node.id] = [fx, fy, mz]

    def assemble_stiffness_matrix(self) -> Tuple[np.ndarray, np.ndarray]:
        """Assemble global stiffness matrix K and force vector F"""
        num_dofs = len(self.nodes) * 3
        K = np.zeros((num_dofs, num_dofs))
        F = np.zeros(num_dofs)

        for member in self.members:
            k_g = member.global_stiffness()
            i1 = member.start_node.id * 3
            i2 = member.end_node.id * 3
            dofs = [i1, i1 + 1, i1 + 2, i2, i2 + 1, i2 + 2]

            for r_idx, r in enumerate(dofs):
                for c_idx, c in enumerate(dofs):
                    K[r, c] += k_g[r_idx, c_idx]

        for node_id, load in self.nodal_loads.items():
            base_dof = node_id * 3
            F[base_dof] += load[0]
            F[base_dof + 1] += load[1]
            F[base_dof + 2] += load[2]

        return K, F

    def solve(self) -> np.ndarray:
        """Solve for nodal displacements satisfying boundary conditions"""
        K, F = self.assemble_stiffness_matrix()
        num_dofs = len(self.nodes) * 3

        # Identify free and constrained DOFs
        constrained_dofs = []
        for node in self.nodes:
            base = node.id * 3
            for i, is_fixed in enumerate(node.fixed):
                if is_fixed:
                    constrained_dofs.append(base + i)

        free_dofs = [i for i in range(num_dofs) if i not in constrained_dofs]

        if not free_dofs:
            return np.zeros(num_dofs)

        K_ff = K[np.ix_(free_dofs, free_dofs)]
        F_f = F[free_dofs]

        u_f = np.linalg.solve(K_ff, F_f)

        u = np.zeros(num_dofs)
        u[free_dofs] = u_f
        return u

    def to_dict(self) -> dict:
        """Serialize to BeamLab JSON interoperable payload"""
        return {
            "name": self.name,
            "nodes": [
                {"id": n.id, "x": n.x, "y": n.y, "z": n.z, "fixed": n.fixed}
                for n in self.nodes
            ],
            "members": [
                {
                    "id": m.id,
                    "startNode": m.start_node.id,
                    "endNode": m.end_node.id,
                    "A": m.A,
                    "I": m.I,
                    "E": m.E,
                }
                for m in self.members
            ],
            "loads": self.nodal_loads,
        }
