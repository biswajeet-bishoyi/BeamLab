# ADR-104: Vehicular Live Load Trains & Bridge Standards Domain

## Status
Accepted

## Context
Bridge superstructures are subject to dynamic moving vehicular live loads with distinct multi-axle configurations, varying axle spacings, transverse track widths, and accompanying uniformly distributed lane loads. International bridge design specifications prescribe distinct idealized vehicular load models:
1. **AASHTO LRFD Bridge Design Specifications (9th/10th Ed)**:
   - **HL-93 Design Truck**: 3 axles ($35\text{ kN}, 142\text{ kN}, 142\text{ kN}$) with a fixed $4.3\text{ m}$ front-to-middle axle spacing and a variable $4.3\text{ m}$ to $9.0\text{ m}$ middle-to-rear spacing to maximize positive moments on long spans and negative moments at piers.
   - **HL-93 Design Tandem**: 2 axles of $110\text{ kN}$ each spaced at $1.2\text{ m}$, which governs short spans below approximately $12\text{ m}$.
   - **Design Lane Load**: Uniform $9.3\text{ kN/m}$ load distributed transversely over a $3.0\text{ m}$ width within a $3.6\text{ m}$ design lane, combined with the truck or tandem without dynamic allowance.
   - **Fatigue Truck**: Single HL-93 truck with constant $9.0\text{ m}$ rear axle spacing and reduced dynamic load allowance ($15\%$).
2. **Eurocode 1: Actions on Structures - Part 2: Traffic loads on bridges (EN 1991-2)**:
   - **Load Model 1 (LM1)**: Double-axle Tandem System (TS) ($2 \times 300\text{ kN}$ on Lane 1, $2 \times 200\text{ kN}$ on Lane 2, $2 \times 100\text{ kN}$ on Lane 3, axle spacing $1.2\text{ m}$, track width $2.0\text{ m}$) coupled with Uniformly Distributed Loads (UDL) ($9.0\text{ kN/m}^2$ on Lane 1, $2.5\text{ kN/m}^2$ on Lanes 2 & 3).
   - **Load Model 2 (LM2)**: Single heavy $400\text{ kN}$ axle for local deck slab design and short expansion joints.
   - **Load Model 3 (LM3)**: Specialized heavy transport vehicle trains.
3. **IRC 6:2017 (Standard Specifications and Code of Practice for Road Bridges - India)**:
   - **Class 70R (Tracked)**: $700\text{ kN}$ military/industrial tracked carrier over a $4.57\text{ m}$ contact length.
   - **Class 70R (Wheeled)**: $1000\text{ kN}$ heavy 7-axle bogie train.
   - **Class A**: Standard 8-axle highway design train totaling $554\text{ kN}$.

BeamLab requires a standardized, strongly typed vehicular domain library that models these standard axle configurations, calculates total weights, generates axle longitudinal offsets, and provides extensibility for user-defined custom axle trains.

## Decision
We implement `VehicularCatalog` and the `VehicularTrain` data domain within `@beamstudio/bridge-engine/src/vehicles/`:
1. **Strongly-Typed Axle Discretization**:
   - Each axle defines total axle load ($W_{axle}$), single-wheel load ($W_{wheel} = W_{axle} / 2$), transverse center-to-center track width ($b_{track}$), tire contact patch dimensions ($L_{patch} \times W_{patch}$), and distance to subsequent trailing axle ($\Delta x_{next}$).
2. **Standard Load Model Generators**:
   - Pre-configured factory methods for `AASHTO HL-93 Truck` (with parameterized rear axle spacing $\in [4.3\text{ m}, 9.0\text{ m}]$), `AASHTO Tandem`, `AASHTO Fatigue Truck`, `Eurocode LM1` (Lanes 1 & 2), `Eurocode LM2`, `IRC Class 70R` (Tracked & Wheeled), and `IRC Class A`.
3. **Parametric Extensibility**:
   - `createCustomVehicle` allows instant synthesis of arbitrary multi-axle configurations (cranes, wind turbine blade haulers, modular transporters) with validated axle spacing arrays.
4. **Lane Load Coupling**:
   - Explicit flags and magnitudes for associated design lane uniform loads ($w_{lane}$), permitting decoupled or concurrent application during influence line integration.

## Consequences
- Guarantees seamless compatibility across US (AASHTO), European (Eurocode), and Indian (IRC) highway bridge engineering standards.
- Serves as the mathematical input foundation for the subsequent Müller-Breslau influence line engine (Sprint B17.2) and the moving load stepping analyzer (Sprint B17.3).
- Enables 3D visual rendering of realistic chassis geometries, wheels, and contact force arrows in the interactive Bridge Studio UI (Sprint B17.5).
