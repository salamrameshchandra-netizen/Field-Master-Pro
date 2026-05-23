/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum BowlerType {
  FAST = "Fast Bowler",
  MEDIUM = "Medium Pace",
  OFF_SPIN = "Off-Spinner",
  LEG_SPIN = "Leg-Spinner",
  LEFT_ARM_ORTHODOX = "Left-Arm Orthodox",
  LEFT_ARM_UNORTHODOX = "Left-Arm Unorthodox"
}

export enum MatchFormat {
  TEST = "Test Match (Red Ball)",
  ODI = "One Day International (50 Overs)",
  T20 = "T20 Match (20 Overs)"
}

export enum BatterHand {
  RIGHT = "Right-Handed Batsman (RHB)",
  LEFT = "Left-Handed Batsman (LHB)"
}

export interface Fielder {
  id: string; // F1 to F11
  x: number;  // X coordinate in SVG (scale 0-600)
  y: number;  // Y coordinate in SVG (scale 0-600)
  role: "wicket_keeper" | "bowler" | "fielder";
  defaultName: string; // E.g., "Fielder 3" or "Wicket Keeper"
  customName?: string; // Customizable by coach
  jerseyNumber?: number; // Customizable jersey
  positionName: string; // Dynamically calculated position name
}

export interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  type: "freehand" | "line" | "circle";
  closed?: boolean;
}

export interface SavedTactic {
  id: string;
  title: string;
  description: string;
  bowlerType: BowlerType;
  batterHand: BatterHand;
  format: MatchFormat;
  fielders: Fielder[];
  drawings: DrawingPath[];
  notes: string;
  targetBatsman?: string;
  createdAt: string;
}

export interface PositionMetadata {
  name: string;
  abbreviation: string;
  description: string;
}
