"""
Unit tests for BeamLab Python Scientific SDK
"""

import math
import numpy as np
from beamlab import Model, Node, Member, Catenary, RetainingWall, BlastAnalysis, SolveFarmClient


def test_model_assembly_and_solve():
    """Test 2D cantilever beam under point load at tip"""
    model = Model(name="Cantilever Beam")
    
    # 2 nodes: fixed base at (0, 0), tip at (4, 0)
    n1 = model.add_node(x=0.0, y=0.0, fixed=[True, True, True])
    n2 = model.add_node(x=4.0, y=0.0, fixed=[False, False, False])
    
    # Beam member: L = 4.0m, Steel E = 200 GPa, Area = 0.01 m², I = 0.0001 m⁴
    E = 200e9
    A = 0.01
    I = 0.0001
    L = 4.0
    model.add_member(start_node=n1, end_node=n2, A=A, I=I, E=E)
    
    # Apply vertical downward load P = -10,000 N at tip
    P = -10000.0
    model.add_nodal_load(node=n2, fy=P)
    
    u = model.solve()
    assert len(u) == 6
    
    # Theoretical cantilever tip deflection: delta = P * L^3 / (3 * E * I)
    expected_delta = (P * (L ** 3)) / (3.0 * E * I)
    tip_uy = u[n2.id * 3 + 1]
    
    np.testing.assert_allclose(tip_uy, expected_delta, rtol=1e-3)


def test_catenary_cable():
    """Test catenary mechanics and profile"""
    span = 200.0   # 200m span
    sag = 20.0     # 20m sag
    weight = 150.0 # 150 N/m self-weight
    
    cable = Catenary(span=span, sag=sag, unit_weight=weight)
    
    assert cable.catenary_parameter > 0
    # Horizontal tension H = c * w ≈ 37.5 kN
    h_tension = cable.horizontal_tension
    assert h_tension > 30000.0
    
    # Max tension at support = H + w * s
    assert math.isclose(cable.max_tension, h_tension + weight * sag, rel_tol=1e-4)
    
    # Midspan elevation is 0.0, supports elevation equals sag
    assert math.isclose(cable.elevation(0.0), 0.0, abs_tol=1e-6)
    assert math.isclose(cable.elevation(span / 2.0), sag, rel_tol=1e-3)
    
    pts = cable.discretize(21)
    assert len(pts) == 21


def test_retaining_wall():
    """Test geotechnical stability analysis of cantilever retaining wall"""
    wall = RetainingWall(
        height=5.0,
        base_width=3.5,
        stem_thickness=0.4,
        toe_width=0.8,
        soil_friction_deg=30.0,
        soil_unit_weight=18.0,
        concrete_unit_weight=24.0,
        surcharge=10.0,
    )
    
    # Ka for phi = 30° should be (1 - 0.5) / (1 + 0.5) = 1/3 = 0.3333
    assert math.isclose(wall.ka, 1.0 / 3.0, rel_tol=1e-4)
    
    stability = wall.stability_factors()
    # Typical well-proportioned wall has FS_ot > 2.0, FS_slide > 1.2
    assert stability["factor_of_safety_overturning"] > 1.5
    assert stability["factor_of_safety_sliding"] > 1.0
    assert stability["within_kern"] is True


def test_blast_analysis():
    """Test Kingery-Bulmash blast overpressure and SDOF response"""
    blast = BlastAnalysis(tnt_mass=250.0, standoff=15.0)
    
    # Scaled distance Z = 15 / 250^(1/3) ≈ 15 / 6.30 ≈ 2.38 m/kg^(1/3)
    expected_z = 15.0 / (250.0 ** (1.0 / 3.0))
    assert math.isclose(blast.scaled_distance, expected_z, rel_tol=1e-4)
    
    # Overpressure should be realistic for near-field explosion
    p_peak = blast.peak_overpressure
    assert p_peak > 50.0  # kPa
    
    # Duration > 0
    t_d = blast.positive_phase_duration
    assert t_d > 0.0
    
    # Friedlander curve at t=0 equals peak, at t=td equals 0
    assert math.isclose(blast.overpressure_at_time(0.0), p_peak, rel_tol=1e-5)
    assert math.isclose(blast.overpressure_at_time(t_d), 0.0, abs_tol=1e-5)
    
    sdof = blast.sdof_response()
    assert sdof["dlf"] > 0
    assert sdof["peak_displacement_m"] > 0


def test_solve_farm_client():
    """Test Cloud Solve Farm Client API submission and streaming"""
    client = SolveFarmClient(endpoint_url="http://mock-farm.internal")
    
    job_id = client.submit_job(
        payload={"nodes": 100, "elements": 180},
        priority=2,
        subdomains=4,
        solver_type="FETI",
    )
    assert job_id.startswith("job-")
    
    status = client.get_status(job_id)
    assert status["jobId"] == job_id
    assert status["status"] in ["QUEUED", "COMPLETED"]
    
    residuals = list(client.stream_residuals(job_id))
    assert len(residuals) >= 2
    assert residuals[-1]["residual"] < residuals[0]["residual"]
    
    res = client.get_result(job_id)
    assert res["converged"] is True
