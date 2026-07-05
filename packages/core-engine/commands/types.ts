import type { StructuralLoad, Support, Material, CrossSection } from '../model/types';
import type { Length, Force, ForcePerLength } from '../units/brands';

export type CommandType =
  | 'ADD_SUPPORT'
  | 'MOVE_SUPPORT'
  | 'REMOVE_SUPPORT'
  | 'ADD_LOAD'
  | 'MOVE_LOAD'
  | 'UPDATE_LOAD_MAGNITUDE'
  | 'REMOVE_LOAD'
  | 'REMOVE_OBJECT'
  | 'UPDATE_SPAN'
  | 'UPDATE_UDL_RANGE'
  | 'UPDATE_MATERIAL'
  | 'UPDATE_SECTION';

export interface BaseCommand {
  type: CommandType;
  timestamp: number;
}

export interface AddSupportCommand extends BaseCommand {
  type: 'ADD_SUPPORT';
  payload: { support: Support };
}

export interface MoveSupportCommand extends BaseCommand {
  type: 'MOVE_SUPPORT';
  payload: { id: string; newPosition: Length };
}

export interface AddLoadCommand extends BaseCommand {
  type: 'ADD_LOAD';
  payload: { load: StructuralLoad };
}

export interface MoveLoadCommand extends BaseCommand {
  type: 'MOVE_LOAD';
  payload: { id: string; newPosition: Length };
}

export interface UpdateSpanCommand extends BaseCommand {
  type: 'UPDATE_SPAN';
  payload: { newSpan: Length };
}

export interface UpdateLoadMagnitudeCommand extends BaseCommand {
  type: 'UPDATE_LOAD_MAGNITUDE';
  payload: { id: string; newMagnitude: Force | ForcePerLength };
}

export interface UpdateUdlRangeCommand extends BaseCommand {
  type: 'UPDATE_UDL_RANGE';
  payload: { id: string; startPosition: Length; endPosition: Length };
}

export interface UpdateMaterialCommand extends BaseCommand {
  type: 'UPDATE_MATERIAL';
  payload: { material: Material };
}

export interface UpdateSectionCommand extends BaseCommand {
  type: 'UPDATE_SECTION';
  payload: { section: CrossSection };
}

export interface RemoveObjectCommand extends BaseCommand {
  type: 'REMOVE_OBJECT'; // Can be used for both loads and supports by ID
  payload: { id: string };
}

export type StructuralCommand =
  | AddSupportCommand
  | MoveSupportCommand
  | AddLoadCommand
  | MoveLoadCommand
  | UpdateSpanCommand
  | UpdateLoadMagnitudeCommand
  | RemoveObjectCommand
  | UpdateUdlRangeCommand
  | UpdateMaterialCommand
  | UpdateSectionCommand;
