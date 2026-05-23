/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Fielder, BowlerType, BatterHand, MatchFormat, SavedTactic } from "../types";
import { FIELDING_PRESETS, resolvePositionName, TacticPreset } from "../utils";
import { Users, Info, Shield, Layers, Save, FolderOpen, Trash2, Edit3, User, RefreshCw } from "lucide-react";

interface SidebarControlsProps {
  fielders: Fielder[];
  onUpdateFielders: (fielders: Fielder[]) => void;
  selectedFielderId: string | null;
  onSelectFielder: (id: string | null) => void;
  isLeftHanded: boolean;
  onSetLeftHanded: (val: boolean) => void;
  format: MatchFormat;
  onSetFormat: (format: MatchFormat) => void;
  bowlerType: BowlerType;
  onSetBowlerType: (type: BowlerType) => void;
  savedTactics: SavedTactic[];
  onSaveTactic: (title: string, desc: string, targetBatsman: string) => void;
  onLoadTactic: (tactic: SavedTactic) => void;
  onDeleteTactic: (id: string) => void;
  onResetField: () => void;
}

export default function SidebarControls({
  fielders,
  onUpdateFielders,
  selectedFielderId,
  onSelectFielder,
  isLeftHanded,
  onSetLeftHanded,
  format,
  onSetFormat,
  bowlerType,
  onSetBowlerType,
  savedTactics,
  onSaveTactic,
  onLoadTactic,
  onDeleteTactic,
  onResetField,
}: SidebarControlsProps) {
  // Find selected fielder metadata
  const selectedFielder = fielders.find((f) => f.id === selectedFielderId);

  // Saved tactic modal inputs
  const [saveTitle, setSaveTitle] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saveTarget, setSaveTarget] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const handleUpdateFielderName = (name: string) => {
    if (!selectedFielderId) return;
    onUpdateFielders(
      fielders.map((f) => (f.id === selectedFielderId ? { ...f, customName: name } : f))
    );
  };

  const handleUpdateFielderJersey = (numStr: string) => {
    if (!selectedFielderId) return;
    const num = numStr ? parseInt(numStr, 10) : undefined;
    onUpdateFielders(
      fielders.map((f) => (f.id === selectedFielderId ? { ...f, jerseyNumber: num } : f))
    );
  };

  const handleApplyPreset = (preset: TacticPreset) => {
    // We adjust preset field coordinates for batter stance!
    const updatedFielders = preset.fielders.map((f) => {
      // Re-resolve position in case batter side calls for a flip
      const relativeX = f.x;
      const relativeY = f.y;
      const posName = resolvePositionName(relativeX, relativeY, isLeftHanded);
      
      // Keep existing custom names if already there or use preset name
      const existing = fielders.find((ex) => ex.id === f.id);
      
      return {
        id: f.id,
        x: relativeX,
        y: relativeY,
        role: f.role,
        defaultName: f.defaultName,
        customName: existing?.customName || "",
        jerseyNumber: existing?.jerseyNumber,
        positionName: posName,
      } as Fielder;
    });

    onUpdateFielders(updatedFielders);
    onSetBowlerType(preset.bowlerType);
    onSetFormat(preset.format);
  };

  const triggerSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTitle) return;
    onSaveTactic(saveTitle, saveDesc, saveTarget);
    setSaveTitle("");
    setSaveDesc("");
    setSaveTarget("");
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col gap-5 text-slate-100">
      
      {/* 1. MATCH STANCE & DETAILS PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-emerald-500" /> Match Setup & Tactics
        </h3>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Batsman style selector */}
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-500 font-mono mb-1">BATSMAN STANCE</label>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                id="stance-rhb-btn"
                onClick={() => onSetLeftHanded(false)}
                className={`flex-1 py-1 text-xs font-semibold rounded transition ${
                  !isLeftHanded ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                RHB
              </button>
              <button
                id="stance-lhb-btn"
                onClick={() => onSetLeftHanded(true)}
                className={`flex-1 py-1 text-xs font-semibold rounded transition ${
                  isLeftHanded ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                LHB
              </button>
            </div>
          </div>

          {/* Match format config */}
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-500 font-mono mb-1">MATCH FORMAT</label>
            <select
              value={format}
              onChange={(e) => onSetFormat(e.target.value as MatchFormat)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 font-medium active:outline-none focus:outline-none focus:border-emerald-600"
            >
              <option value={MatchFormat.TEST}>Test Crease</option>
              <option value={MatchFormat.ODI}>ODI (50 overs)</option>
              <option value={MatchFormat.T20}>T20 Match</option>
            </select>
          </div>
        </div>

        {/* Bowler profile details */}
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-500 font-mono mb-1">BOWLER RELEASING TYPE</label>
          <select
            value={bowlerType}
            onChange={(e) => onSetBowlerType(e.target.value as BowlerType)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-medium focus:border-emerald-600"
          >
            {Object.values(BowlerType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. SELECTED PLAYER CONFIGURATOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-emerald-500" /> Player Position Editor
        </h3>

        {selectedFielder ? (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 animate-fadeIn">
            {/* Display automatic position identification */}
            <div className="flex items-center justify-between mb-3.5 border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-400 font-bold tracking-tight">
                {selectedFielder.id === "F1"
                  ? "Wicket Keeper"
                  : selectedFielder.id === "F2"
                  ? "Bowler Position"
                  : `Fielder #${selectedFielder.id.replace("F", "")}`}
              </span>
              <span className="bg-emerald-950 text-emerald-400 px-2.5 py-0.5 rounded text-[10px] font-mono border border-emerald-900">
                {selectedFielder.positionName}
              </span>
            </div>

            {/* Editing custom fielder names */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">
                  TACTICAL SURNAME / PLAYER NAME
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedFielder.customName || ""}
                    onChange={(e) => handleUpdateFielderName(e.target.value)}
                    placeholder={selectedFielder.defaultName}
                    id="fielder-custom-name-input"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 active:outline-none focus:outline-none focus:border-emerald-600 pl-8"
                  />
                  <Edit3 className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Jersey number */}
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">
                  JERSEY NUMBER (OPTIONAL)
                </label>
                <input
                  type="number"
                  value={selectedFielder.jerseyNumber || ""}
                  onChange={(e) => handleUpdateFielderJersey(e.target.value)}
                  placeholder="e.g. 18"
                  min="0"
                  max="99"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Coordinate info */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
                <span>COORD: X:{selectedFielder.x} Y:{selectedFielder.y}</span>
                <span className="text-amber-400 font-semibold">
                  * Drag bubble to adjust position
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 bg-slate-950 p-3.5 rounded-lg border border-slate-800/60 text-slate-400 text-xs text-center justify-center">
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Select any fielder on the canvas to customize their name tag & jersey numbers.</span>
          </div>
        )}
      </div>

      {/* 3. TACTICS PRESETS SYSTEM */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-emerald-500" /> Pro Field Presets
        </h3>
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Quickly switch the fielders into standard match scenarios for bowlers:
        </p>
        <div className="flex flex-col gap-2">
          {FIELDING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className="w-full text-left bg-slate-950 border border-slate-800 rounded-lg p-2.5 hover:border-emerald-700 hover:bg-slate-900 transition flex flex-col gap-1 text-slate-200 group"
            >
              <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center justify-between">
                {preset.title}
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono uppercase">
                  {preset.bowlerType.split(" ")[0]}
                </span>
              </span>
              <span className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. SAVED TACTICS BOOK */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <FolderOpen className="w-4 h-4 text-emerald-500" /> Coaching Playbook
        </h3>

        {/* List of custom tactics saved */}
        {savedTactics.length > 0 ? (
          <div className="flex flex-col gap-2 mb-4 max-h-[160px] overflow-y-auto pr-1">
            {savedTactics.map((tactic) => (
              <div
                key={tactic.id}
                className="bg-slate-950 border border-slate-800 p-2 rounded-lg flex items-center justify-between gap-2 hover:border-slate-700"
              >
                <button
                  onClick={() => onLoadTactic(tactic)}
                  className="flex-1 text-left"
                >
                  <p className="text-xs font-bold text-slate-200 truncate">{tactic.title}</p>
                  <p className="text-[9px] text-slate-500 font-mono">
                    {tactic.bowlerType} • {tactic.batterHand === BatterHand.LEFT ? "LHB" : "RHB"}
                  </p>
                </button>
                <button
                  onClick={() => onDeleteTactic(tactic.id)}
                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/40 transition"
                  title="Delete strategy"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 mb-3 italic">
            No custom strategies saved to local playbooks yet.
          </div>
        )}

        {/* Modal-like Trigger for saving Tactics */}
        {isSaving ? (
          <form onSubmit={triggerSaveModal} className="flex flex-col gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 animate-slideUp">
            <input
              type="text"
              placeholder="Strategy Title (e.g. Kohli Wide Arc)"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              required
              className="bg-slate-900 border border-slate-800 text-xs rounded p-1.5 text-white focus:border-emerald-600"
            />
            <input
              type="text"
              placeholder="Batsman Target / Scenario"
              value={saveTarget}
              onChange={(e) => setSaveTarget(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs rounded p-1.5 text-white focus:border-emerald-600"
            />
            <textarea
              placeholder="Strategic Notes for the team..."
              value={saveDesc}
              onChange={(e) => setSaveDesc(e.target.value)}
              rows={2}
              className="bg-slate-900 border border-slate-800 text-xs rounded p-1.5 text-white resize-none focus:border-emerald-600"
            />
            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={() => setIsSaving(false)}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1 font-semibold rounded"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsSaving(true)}
              className="flex-1 bg-slate-950 border border-slate-800 hover:border-emerald-600 text-slate-200 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5 text-emerald-500" /> Save Current Layout
            </button>
            <button
              onClick={onResetField}
              title="Reset fielders to standard points"
              className="bg-slate-950 border border-slate-800 hover:border-red-600 text-slate-400 hover:text-white p-2 rounded-lg text-xs transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
