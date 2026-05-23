/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Fielder, DrawingPath, BatterHand } from "../types";
import { resolvePositionName } from "../utils";
import { Pencil, Trash2, ArrowRight, UserPlus, Undo, Check, HelpCircle } from "lucide-react";

interface CricketFieldProps {
  fielders: Fielder[];
  onUpdateFielders: (fielders: Fielder[]) => void;
  selectedFielderId: string | null;
  onSelectFielder: (id: string | null) => void;
  isLeftHanded: boolean;
  drawings: DrawingPath[];
  onUpdateDrawings: (drawings: DrawingPath[]) => void;
}

export default function CricketField({
  fielders,
  onUpdateFielders,
  selectedFielderId,
  onSelectFielder,
  isLeftHanded,
  drawings,
  onUpdateDrawings,
}: CricketFieldProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Interactive boards state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeDrawMode, setActiveDrawMode] = useState<"drag" | "chalk">("drag");
  const [chalkColor, setChalkColor] = useState<string>("#eab308"); // Yellow default
  const [chalkWidth, setChalkWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [showRulerGuide, setShowRulerGuide] = useState<boolean>(true);
  const [labelsToggle, setLabelsToggle] = useState<boolean>(true);

  // Offset storage to ensure smooth dragging relative to the center of the fielder token
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Jiggling indicator on click/point
  const [jigglingId, setJigglingId] = useState<string | null>(null);

  // Get SVG mouse coordinates
  const getCoordinates = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * 600;
    const y = ((clientY - rect.top) / rect.height) * 600;
    return { x, y };
  };

  // MOUSE EVENTS FOR PLAYERS (DRAG & DROP) AND CHALKBOARD DRAWING
  const handleStart = (id: string, e: React.MouseEvent<SVGElement> | React.TouchEvent<SVGElement>, currentX: number, currentY: number) => {
    if (activeDrawMode !== "drag") return;
    e.stopPropagation();
    onSelectFielder(id);
    setDraggedId(id);

    // Apply active jiggle for 500ms to mimic physically touching the puck on the board
    setJigglingId(id);
    setTimeout(() => {
      setJigglingId((prev) => (prev === id ? null : prev));
    }, 500);

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      let clientX, clientY;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const svgX = ((clientX - rect.left) / rect.width) * 600;
      const svgY = ((clientY - rect.top) / rect.height) * 600;
      // Store offset
      setDragOffset({ x: svgX - currentX, y: svgY - currentY });
    }
  };

  const handlePointerDown = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (activeDrawMode === "chalk") {
      e.preventDefault();
      const coords = getCoordinates(e);
      if (coords) {
        setIsDrawing(true);
        setCurrentPoints([coords]);
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    if (activeDrawMode === "drag" && draggedId) {
      // Keep inside field boundaries
      let targetX = coords.x - dragOffset.x;
      let targetY = coords.y - dragOffset.y;
      
      // Bound coordinates strictly within the SVG
      targetX = Math.max(15, Math.min(585, targetX));
      targetY = Math.max(15, Math.min(585, targetY));

      const updatedFielders = fielders.map((f) => {
        if (f.id === draggedId) {
          const posName = resolvePositionName(targetX, targetY, isLeftHanded);
          return {
            ...f,
            x: Math.round(targetX),
            y: Math.round(targetY),
            positionName: posName,
          };
        }
        return f;
      });
      onUpdateFielders(updatedFielders);
    } else if (activeDrawMode === "chalk" && isDrawing) {
      setCurrentPoints((prev) => [...prev, coords]);
    }
  };

  const handlePointerUp = () => {
    if (draggedId) {
      setDraggedId(null);
    }
    if (activeDrawMode === "chalk" && isDrawing) {
      setIsDrawing(false);
      if (currentPoints.length > 1) {
        const newDrawing: DrawingPath = {
          id: `draw_${Date.now()}`,
          points: currentPoints,
          color: chalkColor,
          width: chalkWidth,
          type: "freehand",
        };
        onUpdateDrawings([...drawings, newDrawing]);
      }
      setCurrentPoints([]);
    }
  };

  const undoLastDrawing = () => {
    if (drawings.length > 0) {
      onUpdateDrawings(drawings.slice(0, drawings.length - 1));
    }
  };

  const clearAllDrawings = () => {
    if (confirm("Clear all tactical chalk drawings?")) {
      onUpdateDrawings([]);
    }
  };

  return (
    <div className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Dynamic Header Controls */}
      <div className="w-full flex flex-wrap gap-2 items-center justify-between mb-4 pb-4 border-b border-slate-800">
        <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            id="mode-drag-btn"
            onClick={() => {
              setActiveDrawMode("drag");
              onSelectFielder(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition duration-200 flex items-center gap-1.5 ${
              activeDrawMode === "drag"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🛡️</span> Setup Fielder Pos
          </button>
          <button
            id="mode-chalk-btn"
            onClick={() => setActiveDrawMode("chalk")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition duration-200 flex items-center gap-1.5 ${
              activeDrawMode === "chalk"
                ? "bg-amber-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Pencil className="w-3.5 h-3.5" /> Sketch Chalk
          </button>
        </div>

        {/* Chalk Editing options to present when sketch chalk is active */}
        {activeDrawMode === "chalk" && (
          <div className="flex items-center gap-3 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 animate-fadeIn">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-mono">COLOR:</span>
              <div className="flex gap-1">
                {[
                  { value: "#f87171", label: "Red Target" },
                  { value: "#eab308", label: "Yellow Pivot" },
                  { value: "#60a5fa", label: "Blue Move" },
                  { value: "#ffffff", label: "White Note" },
                ].map((col) => (
                  <button
                    key={col.value}
                    onClick={() => setChalkColor(col.value)}
                    title={col.label}
                    className={`w-4.5 h-4.5 rounded-full border ${
                      chalkColor === col.value ? "border-white scale-125 shadow-lg" : "border-transparent"
                    }`}
                    style={{ backgroundColor: col.value }}
                  />
                ))}
              </div>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-mono">WIDTH:</span>
              <select
                value={chalkWidth}
                onChange={(e) => setChalkWidth(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-[10px] rounded px-1.5 py-0.5 text-white active:outline-none focus:outline-none"
              >
                <option value={2}>Thin (2px)</option>
                <option value={4}>Medium (4px)</option>
                <option value={6}>Thick (6px)</option>
              </select>
            </div>

            <button
              onClick={undoLastDrawing}
              disabled={drawings.length === 0}
              className="text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              title="Undo last line"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={clearAllDrawings}
              disabled={drawings.length === 0}
              className="text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors"
              title="Clear drawings"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Toggle Settings */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={labelsToggle}
              onChange={(e) => setLabelsToggle(e.target.checked)}
              className="rounded border-slate-800 text-emerald-600 focus:ring-emerald-600 bg-slate-950"
            />
            Show Labels
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showRulerGuide}
              onChange={(e) => setShowRulerGuide(e.target.checked)}
              className="rounded border-slate-800 text-emerald-600 focus:ring-emerald-600 bg-slate-950"
            />
            Guides & Angles
          </label>
        </div>
      </div>

      {/* Field board */}
      <div className="relative w-full aspect-square max-w-[540px] select-none">
        
        {/* Help indicators overlays */}
        {activeDrawMode === "chalk" && (
          <div className="absolute top-2 left-2 z-10 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded px-2.5 py-1 text-[10px] pointer-events-none font-mono">
            ✍️ Click and draw lines directly on the pitch
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 600 600"
          className={`w-full h-full rounded-xl select-none ${
            activeDrawMode === "chalk" ? "cursor-pencil" : "cursor-default"
          }`}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          id="cricket-pitch-svg"
        >
          {/* DEFINITIONS & GRASS TEMPLATE */}
          <defs>
            {/* Outfield mow striped pattern for extreme stadium visual appeal */}
            <radialGradient id="grassGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e3e23" />
              <stop offset="60%" stopColor="#1b3920" />
              <stop offset="100%" stopColor="#142c18" />
            </radialGradient>
            
            {/* Crease Pattern */}
            <pattern id="outfieldStripes" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="20" height="40" fill="#1b3c21" opacity="0.3"/>
              <rect x="20" width="20" height="40" fill="#16311b" opacity="0.3"/>
            </pattern>
          </defs>

          {/* MAIN FIELD BODY */}
          {/* Outfield background */}
          <rect width="600" height="600" fill="#0f172a" /> {/* Space beyond ground */}
          
          {/* Stadium Boundary Wall shadow */}
          <circle cx="300" cy="300" r="285" fill="#0c111d" />

          {/* Stadium Grass Outfield */}
          <circle cx="300" cy="300" r="280" fill="url(#grassGrad)" />
          <circle cx="300" cy="300" r="280" fill="url(#outfieldStripes)" />

          {/* Outer Boundary Rope Line */}
          <circle cx="300" cy="300" r="275" fill="none" stroke="#f1f5f9" strokeWidth="3" opacity="0.9" />
          {/* Inner boundary flags or markers (little dashed line) */}
          <circle cx="300" cy="300" r="275" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray="2, 10" opacity="0.4" />

          {/* 30-YARD INFELD CIRCLE (White dash-line for T20 tactics) */}
          {/* Historically made consisting of two semi-circles centered on the wickets plus straight connectors, 
              but standard coaching boards depict it as a circle of radius 135-140 around center pitch. Let's make it beautiful. */}
          <circle cx="300" cy="300" r="140" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6, 6" opacity="0.55" />
          
          {/* 30 Yards tag for users to check match configurations */}
          <text x="300" y="152" fill="#ffffff" opacity="0.4" fontSize="9" textAnchor="middle" fontWeight="bold" letterSpacing="1" className="font-mono">
            30 YARD CIRCLE
          </text>
          
          {/* SECTOR GUIDES (If enabled, shows Off / Leg, Straight / Behind boundaries) */}
          {showRulerGuide && (
            <g opacity="0.2">
              {/* Vertical line through pitch */}
              <line x1="300" y1="20" x2="300" y2="580" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3, 3" />
              {/* Horizontal line through batter crease */}
              <line x1="20" y1="340" x2="580" y2="340" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3, 3" />
              
              {/* Off side and Leg Side indicators */}
              <text x={isLeftHanded ? "420" : "180"} y="50" fill="#f8fafc" fontSize="12" fontWeight="semibold" textAnchor="middle" letterSpacing="2">
                OFF SIDE
              </text>
              <text x={isLeftHanded ? "180" : "420"} y="50" fill="#f8fafc" fontSize="12" fontWeight="semibold" textAnchor="middle" letterSpacing="2">
                LEG SIDE
              </text>

              {/* Angles text guides */}
              <text x="560" y="336" fill="#94a3b8" fontSize="8" className="font-mono" textAnchor="end">
                {isLeftHanded ? "Off Point (0°)" : "Square Leg (0°)"}
              </text>
              <text x="40" y="336" fill="#94a3b8" fontSize="8" className="font-mono">
                {isLeftHanded ? "Square Leg (180°)" : "Point (180°)"}
              </text>
              <text x="300" y="45" fill="#94a3b8" fontSize="8" className="font-mono" textAnchor="middle">
                Straight (90°)
              </text>
              <text x="300" y="565" fill="#94a3b8" fontSize="8" className="font-mono" textAnchor="middle">
                Behind (270°)
              </text>
            </g>
          )}

          {/* THE CENTRAL CRICKET PITCH */}
          <g id="cricket-pitch-detail">
            {/* Sand-Grass blend Pitch clay rectangle */}
            <rect x="286" y="245" width="28" height="110" fill="#d4c297" rx="2" stroke="#af965f" strokeWidth="1.5" />
            
            {/* Bowling creases lines */}
            {/* Bowler crease (top end) */}
            <line x1="278" y1="260" x2="322" y2="260" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="286" y1="250" x2="286" y2="260" stroke="#ffffff" strokeWidth="1" />
            <line x1="314" y1="250" x2="314" y2="260" stroke="#ffffff" strokeWidth="1" />

            {/* Batsman popping crease (bottom end) */}
            <line x1="276" y1="340" x2="324" y2="340" stroke="#ffffff" strokeWidth="1.5" />
            {/* Return creases */}
            <line x1="286" y1="340" x2="286" y2="352" stroke="#ffffff" strokeWidth="1" />
            <line x1="314" y1="340" x2="314" y2="352" stroke="#ffffff" strokeWidth="1" />

            {/* THREE WICKETS / STUMPS */}
            {/* Top End Stumps (Bowler End) */}
            <circle cx="294" cy="250" r="1.5" fill="#ef4444" />
            <circle cx="300" cy="250" r="1.5" fill="#ef4444" />
            <circle cx="306" cy="250" r="1.5" fill="#ef4444" />
            
            {/* Bottom End Stumps (Striker/Batter End) */}
            <circle cx="294" cy="350" r="1.5" fill="#ef4444" />
            <circle cx="300" cy="350" r="1.5" fill="#ef4444" />
            <circle cx="306" cy="350" r="1.5" fill="#ef4444" />
          </g>

          {/* BOWLER / BATTER GRAPHICS AT THE PITCH */}
          {/* Batsman active visual stance indicator */}
          <g transform={`translate(${isLeftHanded ? 276 : 324}, 336)`}>
            <circle cx="0" cy="0" r="5" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1" />
            {/* Mini bat represent direction */}
            <line x1="0" y1="0" x2={isLeftHanded ? "6" : "-6"} y2="-6" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" />
            <text x="0" y="11" fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle" opacity="0.8">
              BAT
            </text>
          </g>
          
          {/* Bowler Run-up direction representation */}
          <g transform="translate(300, 218)">
            <path d="M 0 0 L 0 15 M -4 8 L 0 15 L 4 8" fill="none" stroke="#60a5fa" strokeWidth="2.5" />
            <text x="0" y="-4" fill="#60a5fa" fontSize="8" fontWeight="bold" textAnchor="middle">
              BOWLER
            </text>
          </g>

          {/* RENDER ALREADY DRAWN CHALK DRAWINGS */}
          {drawings.map((path) => {
            if (path.points.length < 2) return null;
            // Generate SVG path coordinate line
            const dString = path.points
              .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
              .join(" ");
            return (
              <path
                key={path.id}
                d={dString}
                fill="none"
                stroke={path.color}
                strokeWidth={path.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
            );
          })}

          {/* RENDER CURRENT IN-PROGRESS DRAWING */}
          {isDrawing && currentPoints.length >= 2 && (
            <path
              d={currentPoints.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ")}
              fill="none"
              stroke={chalkColor}
              strokeWidth={chalkWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          )}

          {/* RENDER FIELDERS (DRAGGABLE TOKENS) */}
          {fielders.map((fielder) => {
            const isSelected = selectedFielderId === fielder.id;
            const isWicketKeeper = fielder.role === "wicket_keeper";
            const isBowler = fielder.role === "bowler";
            
            // Pick color theme depending on target role
            let circleColor = "#10b981"; // Emerald for general fielder
            let hoverStroke = "#a7f3d0";
            if (isWicketKeeper) {
              circleColor = "#ef4444"; // Red for keeper
              hoverStroke = "#fca5a5";
            } else if (isBowler) {
              circleColor = "#3b82f6"; // Blue for bowler
              hoverStroke = "#93c5fd";
            }

            // Clean initials
            let initials = fielder.id;
            if (isWicketKeeper) initials = "WK";
            else if (isBowler) initials = "BW";
            else {
              // Convert index to simple value
              initials = fielder.id.replace("F", "");
            }

            return (
              <g key={fielder.id} className="select-none">
                {/* Visual hover pulse shadow for selected player */}
                {isSelected && (
                  <circle
                    cx={fielder.x}
                    cy={fielder.y}
                    r="22"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeDasharray="3, 3"
                    className="animate-pulse"
                  />
                )}

                {/* Sub-label under player showing their assigned name (if labels toggle active) */}
                {labelsToggle && (
                  <g transform={`translate(${fielder.x}, ${fielder.y + 24})`}>
                    {/* Background label card */}
                    <rect
                      x="-55"
                      y="-7"
                      width="110"
                      height="13.5"
                      fill="#1e293b"
                      rx="3"
                      stroke={isSelected ? "#fbbf24" : "#475569"}
                      strokeWidth="1"
                      opacity="0.9"
                    />
                    <text
                      x="0"
                      y="3"
                      fill="#ffffff"
                      fontSize="7.5"
                      fontWeight="600"
                      textAnchor="middle"
                      className="font-sans tracking-tight"
                    >
                      {fielder.customName || fielder.positionName}
                    </text>
                  </g>
                )}

                {/* Unified interactive player token group with Point (hover) & Click jiggles */}
                <g
                  className={`svg-jiggle cursor-grab active:cursor-grabbing ${jigglingId === fielder.id ? "svg-jiggle-active" : ""}`}
                  onMouseDown={(e) => handleStart(fielder.id, e, fielder.x, fielder.y)}
                  onTouchStart={(e) => handleStart(fielder.id, e, fielder.x, fielder.y)}
                  style={{ pointerEvents: "all" }}
                >
                  {/* Player Token Circle */}
                  <circle
                    cx={fielder.x}
                    cy={fielder.y}
                    r="13"
                    fill={circleColor}
                    stroke={isSelected ? "#fbbf24" : "#ffffff"}
                    strokeWidth="2"
                    style={{ filter: "drop-shadow(0px 3px 4px rgba(0,0,0,0.4))" }}
                  />

                  {/* Initial labels inside */}
                  <text
                    x={fielder.x}
                    y={fielder.y + 3.5}
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                  >
                    {initials}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="w-full mt-3 flex justify-between items-center text-[11px] text-slate-400 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
        <div>
          <span>🔴 Keeper</span>
          <span className="ml-2.5">🔵 Bowler</span>
          <span className="ml-2.5">🟢 Fielders</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Double-click / tap a node to edit player name</span>
        </div>
      </div>
    </div>
  );
}
