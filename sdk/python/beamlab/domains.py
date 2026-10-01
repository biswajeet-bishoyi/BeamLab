"""
BeamLab Python SDK - Specialized Engineering Domains:
- Catenary Cable Mechanics
- Earth Retaining Wall Geotechnics
- Blast Wave Dynamics & Extreme Loading
"""

from dataclasses import dataclass
from typing import Dict, List, Tuple
import math


@dataclass
class Catenary:
    """
    Elastic / Inelastic Catenary Cable Profile & Mechanics
    """
    span: float          # Horizontal span L (m)
    sag: float           # Midspan sag s (m)
    unit_weight: float   # Cable self-weight w (N/m)
    elastic_modulus: float = 1.6e11  # Steel strand E (Pa)
    area: float = 0.002              # Cross-sectional area (m²)

    @property
    def catenary_parameter(self) -> float:
        """Parameter c = H / w (m) approximated from span and sag"""
        # For small to moderate sag: s ≈ L² / (8c) => c ≈ L² / (8s)
        # Using exact relation: s = c * (cosh(L / (2c)) - 1)
        c = (self.span ** 2) / (8.0 * self.sag)
        # 3 Newton-Raphson iterations for exact c
        for _ in range(5):
            f = c * (math.cosh(self.span / (2.0 * c)) - 1.0) - self.sag
            df = math.cosh(self.span / (2.0 * c)) - 1.0 - (self.span / (2.0 * c)) * math.sinh(self.span / (2.0 * c))
            if abs(df) > 1e-12:
                c -= f / df
        return c

    @property
    def horizontal_tension(self) -> float:
        """Horizontal cable tension H (N)"""
        return self.catenary_parameter * self.unit_weight

    @property
    def max_tension(self) -> float:
        """Maximum tension at supports T_max = H + w * s (N)"""
        return self.horizontal_tension + self.unit_weight * self.sag

    @property
    def arc_length(self) -> float:
        """Total un-deformed cable arc length S (m)"""
        c = self.catenary_parameter
        return 2.0 * c * math.sinh(self.span / (2.0 * c))

    def elevation(self, x: float) -> float:
        """
        Calculates cable elevation y(x) with origin at midspan (x in [-L/2, L/2])
        """
        c = self.catenary_parameter
        return c * (math.cosh(x / c) - 1.0)

    def discretize(self, num_points: int = 50) -> List[Tuple[float, float]]:
        """Returns list of (x, y) coordinates along the catenary cable"""
        dx = self.span / (num_points - 1)
        half_span = self.span / 2.0
        points = []
        for i in range(num_points):
            x = -half_span + i * dx
            points.append((x, self.elevation(x)))
        return points


@dataclass
class RetainingWall:
    """
    Cantilever & Gravity Earth Retaining Wall Geotechnical Stability
    """
    height: float          # Stem height H (m)
    base_width: float      # Footing width B (m)
    stem_thickness: float  # Stem thickness t (m)
    toe_width: float       # Toe length B_toe (m)
    soil_friction_deg: float   # Soil friction angle phi (degrees)
    soil_unit_weight: float    # Soil unit weight gamma (kN/m³)
    concrete_unit_weight: float = 24.0  # Concrete gamma (kN/m³)
    surcharge: float = 0.0              # Uniform surcharge q (kPa)
    base_friction_coef: float = 0.45    # Friction coefficient tan(delta)

    @property
    def ka(self) -> float:
        """Rankine active earth pressure coefficient"""
        phi_rad = math.radians(self.soil_friction_deg)
        return (1.0 - math.sin(phi_rad)) / (1.0 + math.sin(phi_rad))

    @property
    def active_thrust(self) -> float:
        """Total active thrust Pa per linear meter (kN/m)"""
        pa_soil = 0.5 * self.ka * self.soil_unit_weight * (self.height ** 2)
        pa_surch = self.ka * self.surcharge * self.height
        return pa_soil + pa_surch

    @property
    def overturning_moment(self) -> float:
        """Overturning moment about toe Mot (kNm/m)"""
        pa_soil = 0.5 * self.ka * self.soil_unit_weight * (self.height ** 2)
        arm_soil = self.height / 3.0
        pa_surch = self.ka * self.surcharge * self.height
        arm_surch = self.height / 2.0
        return pa_soil * arm_soil + pa_surch * arm_surch

    def stability_factors(self) -> Dict[str, float]:
        """
        Computes overturning FS, sliding FS, and eccentricity
        """
        # Concrete weights
        stem_weight = self.stem_thickness * self.height * self.concrete_unit_weight
        stem_arm = self.toe_width + self.stem_thickness / 2.0

        footing_thickness = 0.6  # Default 0.6m
        footing_weight = self.base_width * footing_thickness * self.concrete_unit_weight
        footing_arm = self.base_width / 2.0

        # Soil backfill weight over heel
        heel_width = self.base_width - self.toe_width - self.stem_thickness
        soil_weight = heel_width * self.height * self.soil_unit_weight
        soil_arm = self.toe_width + self.stem_thickness + heel_width / 2.0

        total_weight = stem_weight + footing_weight + soil_weight
        resisting_moment = (
            stem_weight * stem_arm +
            footing_weight * footing_arm +
            soil_weight * soil_arm
        )

        mot = self.overturning_moment
        fs_ot = resisting_moment / mot if mot > 0 else float("inf")

        pa = self.active_thrust
        resisting_shear = total_weight * self.base_friction_coef
        fs_slide = resisting_shear / pa if pa > 0 else float("inf")

        x_res = (resisting_moment - mot) / total_weight
        eccentricity = abs(self.base_width / 2.0 - x_res)
        kern_limit = self.base_width / 6.0

        return {
            "factor_of_safety_overturning": fs_ot,
            "factor_of_safety_sliding": fs_slide,
            "eccentricity": eccentricity,
            "kern_limit": kern_limit,
            "within_kern": eccentricity <= kern_limit,
            "active_thrust_kN": pa,
            "total_vertical_weight_kN": total_weight,
        }


@dataclass
class BlastAnalysis:
    """
    Kingery-Bulmash Blast Wavefront and SDOF Structural Dynamics
    """
    tnt_mass: float        # Equivalent charge mass W (kg TNT)
    standoff: float        # Distance R (m)
    target_mass: float = 1000.0   # SDOF target mass (kg)
    target_stiffness: float = 5e6 # SDOF stiffness (N/m)

    @property
    def scaled_distance(self) -> float:
        """Scaled distance Z = R / W^(1/3) in m/kg^(1/3)"""
        return self.standoff / (self.tnt_mass ** (1.0 / 3.0))

    @property
    def peak_overpressure(self) -> float:
        """
        Peak incident overpressure Pso (kPa) via Kingery-Bulmash empirical formula
        """
        z = self.scaled_distance
        # Standard UFC 3-340-02 polynomial fit for spherical burst
        log_z = math.log10(z)
        # Approximate incident overpressure formula (in kPa)
        # Valid across 0.5 <= Z <= 40
        log_p = 2.064 - 1.407 * log_z + 0.185 * (log_z ** 2)
        p_bar = 10.0 ** log_p
        return p_bar * 100.0  # Convert to kPa

    @property
    def positive_phase_duration(self) -> float:
        """Positive phase duration td (milliseconds)"""
        z = self.scaled_distance
        w_cubed = self.tnt_mass ** (1.0 / 3.0)
        # Scaled duration td / W^(1/3) ≈ 1.2 * Z^0.35 (ms / kg^(1/3))
        scaled_td = 1.2 * (z ** 0.35)
        return scaled_td * w_cubed

    def overpressure_at_time(self, t_ms: float) -> float:
        """
        Instantaneous overpressure P(t) via modified Friedlander equation (kPa)
        """
        td = self.positive_phase_duration
        if t_ms < 0 or t_ms > td:
            return 0.0
        p0 = self.peak_overpressure
        b = 1.2  # Decay waveform parameter
        tau = t_ms / td
        return p0 * (1.0 - tau) * math.exp(-b * tau)

    def sdof_response(self) -> Dict[str, float]:
        """
        Equivalent SDOF single-degree-of-freedom peak displacement & dynamic load factor (DLF)
        """
        omega_n = math.sqrt(self.target_stiffness / self.target_mass)
        t_n = (2.0 * math.pi) / omega_n  # Natural period (s)
        td_sec = self.positive_phase_duration / 1000.0

        # Frequency ratio td / Tn
        ratio = td_sec / t_n
        # Dynamic Load Factor (DLF) envelope for triangular blast
        if ratio < 0.2:
            dlf = 2.0 * math.pi * ratio  # Impulsive regime
        elif ratio < 2.0:
            dlf = 1.0 + math.sin(math.pi * ratio)  # Dynamic regime
        else:
            dlf = 1.8  # Quasi-static regime

        static_force = self.peak_overpressure * 1000.0  # N
        static_disp = static_force / self.target_stiffness
        peak_disp = static_disp * dlf

        return {
            "scaled_distance_Z": self.scaled_distance,
            "peak_overpressure_kPa": self.peak_overpressure,
            "duration_ms": self.positive_phase_duration,
            "natural_period_s": t_n,
            "dlf": dlf,
            "peak_displacement_m": peak_disp,
        }
