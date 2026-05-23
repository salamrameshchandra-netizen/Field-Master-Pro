/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BowlerType, Fielder, MatchFormat } from "./types";

/**
 * Resolves a coordinate to its corresponding cricket fielding position name.
 * @param x current x coordinate (scaled 0-600)
 * @param y current y coordinate (scaled 0-600)
 * @param isLeftHanded whether the striker is left-handed
 */
export function resolvePositionName(x: number, y: number, isLeftHanded: boolean): string {
  const cx = 300;
  const cy = 340; // Striker End Crease Center

  const dx = x - cx;
  const dy = cy - y; // moving up on screen is positive y-cartesian
  
  // If LHB, flip the off side and leg side
  // For RHB: positive adjusted dx is Leg Side (East), negative is Off Side (West)
  const adjDx = isLeftHanded ? -dx : dx;
  
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate angle in degrees [0, 360]
  let angleDeg = Math.atan2(dy, adjDx) * 180 / Math.PI;
  if (angleDeg < 0) {
    angleDeg += 360;
  }
  
  const isClose = distance <= 50;
  const isInfield = distance > 50 && distance <= 145;
  const isOutfield = distance > 145;
  
  // 1. BEHIND THE WICKET (Keeper, Slips, Fine Leg, Leg Slip, Gully, Fly Slip, Third Man)
  // Angles: roughly 225 deg to 315 deg represents South on the screen (behind the striker)
  if (angleDeg >= 225 && angleDeg <= 315) {
    // Wicket Keeper region is directly behind: [264, 276]
    if (angleDeg >= 264 && angleDeg <= 276) {
      if (distance <= 45) return "Wicket Keeper (Close)";
      if (distance <= 110) return "Wicket Keeper (Standard)";
      return "Wicket Keeper (Deep)";
    }
    
    // Off-side behind: [225, 264)
    if (angleDeg >= 225 && angleDeg < 264) {
      if (isClose) {
        // Slips cordon
        if (angleDeg >= 256) return "First Slip";
        if (angleDeg >= 248) return "Second Slip";
        if (angleDeg >= 240) return "Third Slip";
        return "Fourth Slip";
      }
      if (isInfield) {
        if (angleDeg >= 245) return "Fly Slip";
        if (angleDeg >= 235) return "Gully";
        return "Backward Point";
      }
      return "Third Man";
    }
    
    // Leg-side behind: (276, 315]
    if (angleDeg > 276 && angleDeg <= 315) {
      if (isClose) {
        return "Leg Slip";
      }
      if (isInfield) {
        if (angleDeg <= 295) return "Short Fine Leg";
        return "Backward Square Leg";
      }
      if (angleDeg <= 295) return "Fine Leg";
      return "Deep Fine Leg";
    }
  }
  
  // 2. OFF SIDE (angles from 90 to 225 deg)
  // West is 180 (Square Point)
  // North-West is 135 (Covers)
  // North is 90 (Straight / Mid-Off)
  if (angleDeg >= 90 && angleDeg < 225) {
    // Point region (160 to 198)
    if (angleDeg >= 160 && angleDeg <= 198) {
      if (isClose) return "Silly Point";
      if (isInfield) {
        if (angleDeg >= 180) return "Backward Point";
        return "Point";
      }
      return "Deep Point";
    }
    
    // Backward Point / Third Man transition (198 to 225)
    if (angleDeg > 198 && angleDeg < 225) {
      if (isClose) return "Silly Point";
      if (isInfield) return "Backward Point";
      return "Third Man/Deep Point";
    }
    
    // Cover region (112 to 160)
    if (angleDeg >= 112 && angleDeg < 160) {
      if (isClose) return "Silly Point";
      if (isInfield) {
        if (angleDeg <= 130) return "Extra Cover";
        if (angleDeg <= 145) return "Cover";
        return "Cover Point";
      }
      if (angleDeg <= 130) return "Deep Extra Cover";
      return "Deep Cover";
    }
    
    // Mid-Off / Bowler region (90 to 112)
    if (angleDeg >= 90 && angleDeg < 112) {
      if (isClose) {
        if (distance < 20) return "Bowler (Crease End)";
        return "Silly Mid-Off";
      }
      if (isInfield) {
        return "Mid-Off";
      }
      return "Long-Off";
    }
  }
  
  // 3. LEG SIDE (angles from 315 to 360, and 0 to 90 deg)
  // East is 0/360 (Square Leg)
  // North-East is 45 (Mid-Wicket)
  // North is 90 (Bowler / Mid-On)
  let normLegAngle = angleDeg;
  if (normLegAngle >= 315) {
    normLegAngle -= 360; // now in range [-45, 90)
  }
  
  if (normLegAngle >= -45 && normLegAngle < 90) {
    // Bowler / Mid-On region (72 to 90)
    if (normLegAngle >= 72 && normLegAngle < 90) {
      if (isClose) {
        if (distance < 20) return "Bowler (Crease End)";
        return "Silly Mid-On";
      }
      if (isInfield) return "Mid-On";
      return "Long-On";
    }
    
    // Mid-Wicket region (35 to 72)
    if (normLegAngle >= 35 && normLegAngle < 72) {
      if (isClose) return "Short Mid-Wicket";
      if (isInfield) return "Mid-Wicket";
      return "Deep Mid-Wicket";
    }
    
    // Square Leg region (-15 to 35)
    if (normLegAngle >= -15 && normLegAngle < 35) {
      if (isClose) return "Short Leg";
      if (isInfield) return "Square Leg";
      return "Deep Square Leg";
    }
    
    // Backward Square Leg / Fine Leg transition (-45 to -15)
    if (normLegAngle >= -45 && normLegAngle < -15) {
      if (isClose) return "Short Leg (Backward)";
      if (isInfield) return "Backward Square Leg";
      return "Deep Fine Leg";
    }
  }
  
  // Absolute fallback classifiers
  if (isClose) return "Close Deflector";
  if (isInfield) {
    if (x < 300) return isLeftHanded ? "Infield Leg" : "Infield Off";
    return isLeftHanded ? "Infield Off" : "Infield Leg";
  }
  if (x < 300) return isLeftHanded ? "Deep Leg" : "Deep Off";
  return isLeftHanded ? "Deep Off" : "Deep Leg";
}

/**
 * Interface representing preset templates
 */
export interface TacticPreset {
  id: string;
  title: string;
  description: string;
  bowlerType: BowlerType;
  format: MatchFormat;
  fielders: { id: string; x: number; y: number; role: "wicket_keeper" | "bowler" | "fielder"; defaultName: string; positionName: string }[];
  notes: string;
}

/**
 * Standard professional cricket fielding presets
 */
export const FIELDING_PRESETS: TacticPreset[] = [
  {
    id: "fast_attacking_red",
    title: "Fast Attacking (3 Slips & Gully)",
    description: "Classic Red-Ball attacking field layout designed to apply maximum pressure on a new batsman. Focuses on safe catching options behind the wicket.",
    bowlerType: BowlerType.FAST,
    format: MatchFormat.TEST,
    notes: "Perfect for new ball seam bowlers (e.g. outswing). Keep the length fuller to entice the drive into the slip cordon. Ensure First & Second slip do not stand too close. Third slip stands slightly wider.",
    fielders: [
      { id: "F1", x: 300, y: 485, role: "wicket_keeper", defaultName: "Wicket Keeper", positionName: "Wicket Keeper" },
      { id: "F2", x: 300, y: 260, role: "bowler", defaultName: "Bowler", positionName: "Bowler (Crease End)" },
      { id: "F3", x: 282, y: 462, role: "fielder", defaultName: "First Slip", positionName: "First Slip" },
      { id: "F4", x: 266, y: 454, role: "fielder", defaultName: "Second Slip", positionName: "Second Slip" },
      { id: "F5", x: 251, y: 444, role: "fielder", defaultName: "Third Slip", positionName: "Third Slip" },
      { id: "F6", x: 215, y: 420, role: "fielder", defaultName: "Gully", positionName: "Gully" },
      { id: "F7", x: 180, y: 340, role: "fielder", defaultName: "Point", positionName: "Point" },
      { id: "F8", x: 190, y: 240, role: "fielder", defaultName: "Cover", positionName: "Cover" },
      { id: "F9", x: 250, y: 180, role: "fielder", defaultName: "Mid-Off", positionName: "Mid-Off" },
      { id: "F10", x: 350, y: 180, role: "fielder", defaultName: "Mid-On", positionName: "Mid-On" },
      { id: "F11", x: 420, y: 480, role: "fielder", defaultName: "Fine Leg", positionName: "Fine Leg" }
    ]
  },
  {
    id: "fast_t20_death",
    title: "Fast Defensive (T20 Death Overs)",
    description: "Defensive field configuration with 5 fielders boundary riding. Protects against straight boundaries and cover lofted shots.",
    bowlerType: BowlerType.FAST,
    format: MatchFormat.T20,
    notes: "Designed for yorkers or wide-line execution. Long-off and Long-on are deep to protect boundaries. Deep point and deep mid-wicket guard the slog-sweeps and slice-cuts.",
    fielders: [
      { id: "F1", x: 300, y: 465, role: "wicket_keeper", defaultName: "Wicket Keeper", positionName: "Wicket Keeper" },
      { id: "F2", x: 300, y: 260, role: "bowler", defaultName: "Bowler", positionName: "Bowler" },
      { id: "F3", x: 90, y: 340, role: "fielder", defaultName: "Deep Point", positionName: "Deep Point" },
      { id: "F4", x: 105, y: 200, role: "fielder", defaultName: "Deep Cover", positionName: "Deep Cover" },
      { id: "F5", x: 230, y: 70, role: "fielder", defaultName: "Long-Off", positionName: "Long-Off" },
      { id: "F6", x: 370, y: 70, role: "fielder", defaultName: "Long-On", positionName: "Long-On" },
      { id: "F7", x: 495, y: 200, role: "fielder", defaultName: "Deep Mid-Wicket", positionName: "Deep Mid-Wicket" },
      { id: "F8", x: 505, y: 340, role: "fielder", defaultName: "Deep Square Leg", positionName: "Deep Square Leg" },
      { id: "F9", x: 200, y: 270, role: "fielder", defaultName: "Extra Cover", positionName: "Extra Cover" },
      { id: "F10", x: 400, y: 290, role: "fielder", defaultName: "Mid-Wicket", positionName: "Mid-Wicket" },
      { id: "F11", x: 370, y: 430, role: "fielder", defaultName: "Short Fine Leg", positionName: "Short Fine Leg" }
    ]
  },
  {
    id: "off_spin_attack",
    title: "Off-Spin Attacking (Turning Pitch)",
    description: "Highly aggressive off-spinner fielding with close-in catching fielders (Silly Point, Short Leg) waiting for bat-pad catches.",
    bowlerType: BowlerType.OFF_SPIN,
    format: MatchFormat.TEST,
    notes: "Bowl dynamically outside off stump to spin back into the batsman. Silly Point and Short Leg catch bat-pad deflections and inside edges. Slip waits for offturn leading edges.",
    fielders: [
      { id: "F1", x: 300, y: 395, role: "wicket_keeper", defaultName: "Wicket Keeper (Spinner)", positionName: "Wicket Keeper" },
      { id: "F2", x: 300, y: 260, role: "bowler", defaultName: "Bowler", positionName: "Bowler" },
      { id: "F3", x: 275, y: 412, role: "fielder", defaultName: "First Slip", positionName: "First Slip" },
      { id: "F4", x: 265, y: 315, role: "fielder", defaultName: "Silly Point", positionName: "Silly Point" },
      { id: "F5", x: 335, y: 315, role: "fielder", defaultName: "Short Leg", positionName: "Short Leg" },
      { id: "F6", x: 360, y: 280, role: "fielder", defaultName: "Short Mid-Wicket", positionName: "Short Mid-Wicket" },
      { id: "F7", x: 350, y: 210, role: "fielder", defaultName: "Mid-On", positionName: "Mid-On" },
      { id: "F8", x: 250, y: 210, role: "fielder", defaultName: "Mid-Off", positionName: "Mid-Off" },
      { id: "F9", x: 190, y: 320, role: "fielder", defaultName: "Backward Point", positionName: "Backward Point" },
      { id: "F10", x: 200, y: 250, role: "fielder", defaultName: "Cover", positionName: "Cover" },
      { id: "F11", x: 400, y: 340, role: "fielder", defaultName: "Square Leg", positionName: "Square Leg" }
    ]
  },
  {
    id: "leg_spin_classic",
    title: "Leg-Spin Classic Layout",
    description: "A balanced legendary leg-spin field containing a slip catching, and deep fielders protecting the boundary on the leg side sweep.",
    bowlerType: BowlerType.LEG_SPIN,
    format: MatchFormat.TEST,
    notes: "Maintains a Slip for the leg-break double-edges. Cover point blocks the cut, and Mid-Wicket blocks the heave. Deep mid-wicket protects against lofts.",
    fielders: [
      { id: "F1", x: 300, y: 395, role: "wicket_keeper", defaultName: "Wicket Keeper", positionName: "Wicket Keeper" },
      { id: "F2", x: 300, y: 260, role: "bowler", defaultName: "Bowler", positionName: "Bowler" },
      { id: "F3", x: 274, y: 410, role: "fielder", defaultName: "First Slip", positionName: "First Slip" },
      { id: "F4", x: 322, y: 410, role: "fielder", defaultName: "Leg Slip", positionName: "Leg Slip" },
      { id: "F5", x: 268, y: 305, role: "fielder", defaultName: "Silly Mid-Off", positionName: "Silly Mid-Off" },
      { id: "F6", x: 200, y: 310, role: "fielder", defaultName: "Cover Point", positionName: "Cover Point" },
      { id: "F7", x: 190, y: 340, role: "fielder", defaultName: "Point", positionName: "Point" },
      { id: "F8", x: 390, y: 320, role: "fielder", defaultName: "Mid-Wicket", positionName: "Mid-Wicket" },
      { id: "F9", x: 360, y: 220, role: "fielder", defaultName: "Mid-On", positionName: "Mid-On" },
      { id: "F10", x: 230, y: 90, role: "fielder", defaultName: "Long-Off", positionName: "Long-Off" },
      { id: "F11", x: 480, y: 210, role: "fielder", defaultName: "Deep Mid-Wicket", positionName: "Deep Mid-Wicket" }
    ]
  },
  {
    id: "t20_powerplay_pacers",
    title: "T20 Powerplay Outswing",
    description: "Fielding for opening pacers in T20 Powerplays (only 2 fielders allowed outside the 30-yard circle, e.g., Third Man and Fine Leg).",
    bowlerType: BowlerType.FAST,
    format: MatchFormat.T20,
    notes: "Crucial to keep the boundaries of Third Man and Fine Leg protected while having a packed inner-ring of 7 catchers/stoppers to stop singles.",
    fielders: [
      { id: "F1", x: 300, y: 465, role: "wicket_keeper", defaultName: "Wicket Keeper", positionName: "Wicket Keeper" },
      { id: "F2", x: 300, y: 260, role: "bowler", defaultName: "Bowler", positionName: "Bowler" },
      { id: "F3", x: 275, y: 430, role: "fielder", defaultName: "First Slip", positionName: "First Slip" },
      { id: "F4", x: 190, y: 340, role: "fielder", defaultName: "Point", positionName: "Point" },
      { id: "F5", x: 180, y: 270, role: "fielder", defaultName: "Cover", positionName: "Cover" },
      { id: "F6", x: 240, y: 220, role: "fielder", defaultName: "Mid-Off", positionName: "Mid-Off" },
      { id: "F7", x: 360, y: 220, role: "fielder", defaultName: "Mid-On", positionName: "Mid-On" },
      { id: "F8", x: 410, y: 310, role: "fielder", defaultName: "Mid-Wicket", positionName: "Mid-Wicket" },
      { id: "F9", x: 370, y: 380, role: "fielder", defaultName: "Short Fine Leg", positionName: "Short Fine Leg" },
      { id: "F10", x: 100, y: 480, role: "fielder", defaultName: "Third Man", positionName: "Third Man" },
      { id: "F11", x: 500, y: 480, role: "fielder", defaultName: "Deep Fine Leg", positionName: "Deep Fine Leg" } // outside circle
    ]
  }
];

export function getPresetById(id: string): TacticPreset | undefined {
  return FIELDING_PRESETS.find(p => p.id === id);
}
