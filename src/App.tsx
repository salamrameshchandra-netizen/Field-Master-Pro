/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { BowlerType, BatterHand, MatchFormat, Fielder, DrawingPath, SavedTactic } from "./types";
import { resolvePositionName, FIELDING_PRESETS } from "./utils";
import CricketField from "./components/CricketField";
import SidebarControls from "./components/SidebarControls";
import {
  Download,
  Terminal,
  Cpu,
  Bookmark,
  Shield,
  Clock,
  Printer,
  ChevronRight,
  User,
  Sparkles,
  Award,
  BookOpen,
  Info,
  Trash2,
  RefreshCw
} from "lucide-react";

const INITIAL_FIELDERS: Fielder[] = [
  { id: "F1", x: 300, y: 485, role: "wicket_keeper", defaultName: "Wicket Keeper", positionName: "Wicket Keeper" },
  { id: "F2", x: 300, y: 260, role: "bowler", defaultName: "Bowler", positionName: "Bowler (Crease End)" },
  { id: "F3", x: 282, y: 462, role: "fielder", defaultName: "First Slip", positionName: "First Slip" },
  { id: "F4", x: 266, y: 454, role: "fielder", defaultName: "Second Slip", positionName: "Second Slip" },
  { id: "F5", x: 215, y: 420, role: "fielder", defaultName: "Gully", positionName: "Gully" },
  { id: "F6", x: 180, y: 340, role: "fielder", defaultName: "Point", positionName: "Point" },
  { id: "F7", x: 190, y: 240, role: "fielder", defaultName: "Cover", positionName: "Cover" },
  { id: "F8", x: 250, y: 180, role: "fielder", defaultName: "Mid-Off", positionName: "Mid-Off" },
  { id: "F9", x: 350, y: 180, role: "fielder", defaultName: "Mid-On", positionName: "Mid-On" },
  { id: "F10", x: 410, y: 310, role: "fielder", defaultName: "Mid-Wicket", positionName: "Mid-Wicket" },
  { id: "F11", x: 420, y: 480, role: "fielder", defaultName: "Fine Leg", positionName: "Fine Leg" }
];

interface AIAnalysis {
  assessment: string;
  gaps: string[];
  recommendations: {
    fielderId: string;
    action: string;
    reason: string;
    newPositionName: string;
  }[];
  coachingTip: string;
}

export default function App() {
  const [fielders, setFielders] = useState<Fielder[]>(() => {
    // Attempt load default stance resolved names
    return INITIAL_FIELDERS.map((f) => ({
      ...f,
      positionName: resolvePositionName(f.x, f.y, false),
    }));
  });

  const [selectedFielderId, setSelectedFielderId] = useState<string | null>(null);
  const [isLeftHanded, setIsLeftHanded] = useState<boolean>(false);
  const [format, setFormat] = useState<MatchFormat>(MatchFormat.TEST);
  const [bowlerType, setBowlerType] = useState<BowlerType>(BowlerType.FAST);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [notes, setNotes] = useState<string>(
    "1. Keep bowling the channel of uncertainty (fifth off stump line).\n2. Force the batter to drive into the packed off-side ring.\n3. Keep third-slip wide for thick out-edges."
  );
  
  // Custom Saved tactics
  const [savedTactics, setSavedTactics] = useState<SavedTactic[]>([]);
  
  // Title & Target for the custom tactic being prepared
  const [customStrategyTitle, setCustomStrategyTitle] = useState<string>("Inswing Threat Assembly");
  const [targetBatsman, setTargetBatsman] = useState<string>("Top-Order Right Hander");

  // AI Strategic assistance states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("");

  // Playbook saving and customize handlers for inline editing
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>("");
  const [saveDesc, setSaveDesc] = useState<string>("");
  const [saveTarget, setSaveTarget] = useState<string>("");

  // Tabs toggle to switch between Tactical Configuration and Interactive How-To Guide
  const [activeTab, setActiveTab] = useState<"config" | "guide">("config");

  const handleUpdateFielderName = (name: string) => {
    if (!selectedFielderId) return;
    setFielders((prev) =>
      prev.map((f) => (f.id === selectedFielderId ? { ...f, customName: name } : f))
    );
  };

  const handleUpdateFielderJersey = (numStr: string) => {
    if (!selectedFielderId) return;
    const num = numStr ? parseInt(numStr, 10) : undefined;
    setFielders((prev) =>
      prev.map((f) => (f.id === selectedFielderId ? { ...f, jerseyNumber: num } : f))
    );
  };

  // PDF download generation state
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load Saved tactics on mount
  useEffect(() => {
    const stored = localStorage.getItem("cricket_saved_tactics");
    if (stored) {
      try {
        setSavedTactics(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved strategies from disk", e);
      }
    }
  }, []);

  // Recalculate position names when batsman hand stance flips!
  const handleSetLeftHanded = (val: boolean) => {
    setIsLeftHanded(val);
    const updated = fielders.map((f) => ({
      ...f,
      positionName: resolvePositionName(f.x, f.y, val),
    }));
    setFielders(updated);
    // Clear AI advice since coordinates change significance
    setAiAnalysis(null);
  };

  // Save current whiteboard layout to playbook list
  const handleSaveTactic = (title: string, description: string, target: string) => {
    const newTactic: SavedTactic = {
      id: `tactic_${Date.now()}`,
      title,
      description,
      bowlerType,
      batterHand: isLeftHanded ? BatterHand.LEFT : BatterHand.RIGHT,
      format,
      fielders: JSON.parse(JSON.stringify(fielders)),
      drawings: JSON.parse(JSON.stringify(drawings)),
      notes,
      targetBatsman: target || "General Batsman",
      createdAt: new Date().toLocaleDateString()
    };

    const newArray = [...savedTactics, newTactic];
    setSavedTactics(newArray);
    localStorage.setItem("cricket_saved_tactics", JSON.stringify(newArray));
    
    setCustomStrategyTitle(title);
    if (target) setTargetBatsman(target);
  };

  // Load selection from list
  const handleLoadTactic = (tactic: SavedTactic) => {
    setFielders(tactic.fielders);
    setIsLeftHanded(tactic.batterHand === BatterHand.LEFT);
    setFormat(tactic.format);
    setBowlerType(tactic.bowlerType);
    setDrawings(tactic.drawings || []);
    setNotes(tactic.notes);
    setCustomStrategyTitle(tactic.title);
    setTargetBatsman(tactic.targetBatsman || "General Target");
    // Clear old advice
    setAiAnalysis(null);
  };

  // Delete selection
  const handleDeleteTactic = (id: string) => {
    const filtered = savedTactics.filter((t) => t.id !== id);
    setSavedTactics(filtered);
    localStorage.setItem("cricket_saved_tactics", JSON.stringify(filtered));
  };

  // Reset Fielder nodes back to absolute default setups
  const handleResetField = () => {
    if (confirm("Reset layout back to standard starting field?")) {
      const reset = INITIAL_FIELDERS.map((f) => ({
        ...f,
        positionName: resolvePositionName(f.x, f.y, isLeftHanded),
      }));
      setFielders(reset);
      setDrawings([]);
      setAiAnalysis(null);
    }
  };

  // Trigger Gemini Coach advisor
  const handleConsultAICoach = async () => {
    setIsAnalyzing(true);
    setAiError(null);
    setAiAnalysis(null);

    const stages = [
      "Calculating fielder spacing intervals...",
      "Simulating power batsman hitting arcs...",
      "Auditing third-man sweep vulnerability...",
      "Contacting world-class strategists...",
      "Synthesizing match playbook recommendations..."
    ];

    let currentStage = 0;
    setLoadingStep(stages[currentStage]);
    const timer = setInterval(() => {
      if (currentStage < stages.length - 1) {
        currentStage++;
        setLoadingStep(stages[currentStage]);
      }
    }, 1800);

    try {
      const response = await fetch("/api/tactician/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bowlerType,
          batterHand: isLeftHanded ? BatterHand.LEFT : BatterHand.RIGHT,
          format,
          fielders,
          notes,
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || "Tactical feedback query failed.");
      }

      setAiAnalysis(responseData);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "An unexpected error occurred while consulting the AI brain.");
    } finally {
      clearInterval(timer);
      setIsAnalyzing(false);
    }
  };

  // Dynamic PDF tactical report trigger
  const handleDownloadPDFReport = async () => {
    setIsExporting(true);
    
    // Lazy imports for high bundling performance & startup speeds
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");

    const originalGetComputedStyle = window.getComputedStyle;

    try {
      const printableSection = document.getElementById("coaching-printable-briefing");
      if (!printableSection) {
        throw new Error("Target Briefing dossier layout node not found.");
      }

      // Check if browser returns OKLCH or OKLAB and intercept it
      const canvasEl = document.createElement("canvas");
      const ctx = canvasEl.getContext("2d");
      const convertColor = (val: any): any => {
        if (typeof val === "string" && (
          val.includes("oklch") || 
          val.includes("oklab") || 
          val.includes("lch") || 
          val.includes("lab")
        )) {
          if (ctx) {
            try {
              ctx.fillStyle = val;
              const resolved = ctx.fillStyle;
              if (
                resolved && 
                !resolved.includes("oklch") && 
                !resolved.includes("oklab") && 
                !resolved.includes("lch") && 
                !resolved.includes("lab")
              ) {
                return resolved;
              }
            } catch (colorErr) {
              // ignore and fallback
            }
          }
          // Safe neutral transparent fallback if canvas context fails
          return "rgba(0, 0, 0, 0)";
        }
        return val;
      };

      // Wrap getComputedStyle to intercept oklch computed colors
      window.getComputedStyle = function (element, pseudoElt) {
        const style = originalGetComputedStyle(element, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            if (prop === "getPropertyValue") {
              return function (propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                return convertColor(val);
              };
            }
            const value = Reflect.get(target, prop);
            if (typeof value === "function") {
              return value.bind(target);
            }
            if (typeof prop === "string") {
              return convertColor(value);
            }
            return value;
          }
        }) as CSSStyleDeclaration;
      };

      // Convert layout node into higher scale canvas
      const canvas = await html2canvas(printableSection, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#0b1329",
        scrollY: -window.scrollY
      });

      // Restore original getComputedStyle immediately after html2canvas completes
      window.getComputedStyle = originalGetComputedStyle;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 Standard size width
      const pageHeight = 297; // A4 standard size height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Wrap onto next page if content list runs long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      pdf.save(`Cricket_Field_Brief_${timestamp}.pdf`);

    } catch (e: any) {
      console.error(e);
      alert(`Briefing Print Failed: ${e.message}`);
    } finally {
      // Ensure we always restore getComputedStyle even on failure
      window.getComputedStyle = originalGetComputedStyle;
      setIsExporting(false);
    }
  };

  // Calculated metrics for real-time Coverage Analysis (Sleek Theme telemetry)
  const offSideCount = fielders.filter((f) => {
    // If Batsman is Left Handed, the Off Side is the Right of the pitch (X > 300)
    // If Batsman is Right Handed, the Off Side is the Left of the pitch (X < 300)
    return isLeftHanded ? f.x > 300 : f.x < 300;
  }).length;
  const offSidePct = Math.round((offSideCount / 11) * 100);

  // Boundary risk indicator calculated dynamically based on outer layout spacing
  const outfieldCount = fielders.filter((f) => {
    const dx = f.x - 300;
    const dy = f.y - 300;
    return Math.sqrt(dx * dx + dy * dy) > 135; // Spacing outside 30-yard ring
  }).length;
  const boundaryRiskText = outfieldCount <= 2 ? "High" : outfieldCount <= 4 ? "Medium" : "Low";
  const boundaryRiskColor = outfieldCount <= 2 ? "text-red-400" : outfieldCount <= 4 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* HEADER NAVIGATION */}
      <nav className="h-16 border-b border-slate-800 flex items-center justify-between px-6 sm:px-8 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <svg className="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-bold text-lg sm:text-xl tracking-tight uppercase">
            FieldMaster <span className="text-emerald-500">Pro</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] bg-slate-800 border border-slate-700 text-slate-400 font-mono px-2 py-0.5 rounded uppercase">
            v1.5 Premium
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ACTIVE SESSION: {bowlerType} / {format} COUPLING
          </div>
          <button
            onClick={handleDownloadPDFReport}
            id="export-pdf-main-btn"
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Compiling Brief..." : "Export PDF for Coach"}
          </button>
        </div>
      </nav>

      {/* CORE WORKSPACE GRID (3-COLUMN SYSTEM) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-slate-800">
        
        {/* LEFT COLUMN: CONTROLS & COMPOSITION BOOK (LG: 3 COLS) */}
        <aside className="lg:col-span-3 border-r border-slate-800 bg-slate-900/40 p-5 sm:p-6 flex flex-col gap-5 overflow-y-auto max-h-none lg:max-h-[calc(100vh-4rem-2.5rem)] custom-scrollbar">
          
          {/* Active Navigation Tabs Header */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 gap-1 shrink-0 mb-1">
            <button
              onClick={() => setActiveTab("config")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all duration-200 ${
                activeTab === "config"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/45"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              📊 Tactical Board
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all duration-200 ${
                activeTab === "guide"
                  ? "bg-slate-800 text-slate-100 border border-slate-700/60 shadow-md shadow-slate-950/45"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              📖 How To Use
            </button>
          </div>

          {activeTab === "config" ? (
            <>
              {/* Bowler profile & Match Setup */}
              <section className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2.5">
                  Bowler & Match Profile
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-slate-400 font-mono uppercase block mb-1">RELEASING STYLE</label>
                    <select
                      value={bowlerType}
                      onChange={(e) => setBowlerType(e.target.value as BowlerType)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      {Object.values(BowlerType).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 font-mono uppercase block mb-1">BATTER STANCE</label>
                      <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button
                          id="stance-rhb-btn"
                          onClick={() => handleSetLeftHanded(false)}
                          className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                            !isLeftHanded ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-500 hover:text-slate-200"
                          }`}
                        >
                          RHB
                        </button>
                        <button
                          id="stance-lhb-btn"
                          onClick={() => handleSetLeftHanded(true)}
                          className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                            isLeftHanded ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-500 hover:text-slate-200"
                          }`}
                        >
                          LHB
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-400 font-mono uppercase block mb-1">MATCH FORMAT</label>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as MatchFormat)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-white outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value={MatchFormat.TEST}>Test Crease</option>
                        <option value={MatchFormat.ODI}>ODI (50ov)</option>
                        <option value={MatchFormat.T20}>T20 Format</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Tactical presets */}
              <section className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Tactical Presets
                </label>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                  {FIELDING_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        const updated = preset.fielders.map((f) => {
                          const posName = resolvePositionName(f.x, f.y, isLeftHanded);
                          const ex = fielders.find((e) => e.id === f.id);
                          return {
                            id: f.id,
                            x: f.x,
                            y: f.y,
                            role: f.role,
                            defaultName: f.defaultName,
                            customName: ex?.customName || "",
                            jerseyNumber: ex?.jerseyNumber,
                            positionName: posName,
                          } as Fielder;
                        });
                        setFielders(updated);
                        setBowlerType(preset.bowlerType);
                        setFormat(preset.format);
                      }}
                      className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-lg p-2.5 transition flex flex-col gap-0.5 group"
                    >
                      <span className="text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center justify-between">
                        {preset.title}
                        <span className="text-[8px] px-1 bg-slate-950 text-slate-500 rounded font-mono">
                          {preset.format}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400 leading-normal truncate w-full">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Coaching saved playbook */}
              <section className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Saved Playbooks
                </label>
                {savedTactics.length > 0 ? (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 mb-3 custom-scrollbar">
                    {savedTactics.map((t) => (
                      <div key={t.id} className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between gap-1">
                        <button
                          onClick={() => handleLoadTactic(t)}
                          className="flex-1 text-left truncate"
                        >
                          <p className="text-[11px] font-bold text-slate-200 truncate">{t.title}</p>
                          <p className="text-[8px] text-slate-500 font-mono">
                            {t.bowlerType} • {t.targetBatsman || "General"}
                          </p>
                        </button>
                        <button
                          onClick={() => handleDeleteTactic(t.id)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 italic mb-3">No tactical plays saved to playroom list.</div>
                )}

                {isSaving ? (
                  <div className="flex flex-col gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <input
                      type="text"
                      placeholder="Strategy Title..."
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs rounded p-2 text-white outline-none focus:border-emerald-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Target Profile..."
                      value={saveTarget}
                      onChange={(e) => setSaveTarget(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs rounded p-2 text-white outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-end gap-1.5 mt-1">
                      <button type="button" onClick={() => setIsSaving(false)} className="text-[10px] text-slate-400 px-2 py-1">Cancel</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!saveTitle) return;
                          handleSaveTactic(saveTitle, saveDesc, saveTarget);
                          setSaveTitle("");
                          setSaveTarget("");
                          setIsSaving(false);
                        }}
                        className="bg-emerald-600 text-white text-[10px] px-3 py-1 font-bold rounded"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsSaving(true)}
                      className="flex-1 bg-slate-900 border border-slate-800 hover:border-emerald-600 text-slate-200 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span className="text-emerald-400 text-xs">💾</span> Save Alignment
                    </button>
                    <button
                      onClick={handleResetField}
                      title="Reset layout"
                      className="bg-slate-900 border border-slate-800 hover:border-red-600 text-slate-400 hover:text-white p-2 rounded-lg text-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 font-mono">
                  <span>🕹️</span> Control Basics
                </h4>
                <div className="space-y-4 text-[11px] text-slate-300">
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-300 flex items-center justify-center font-bold text-[9px] shrink-0 border border-emerald-900/40">1</span>
                    <p className="leading-relaxed">
                      <strong>Deploy Players:</strong> Select <span className="text-emerald-400 font-semibold">Setup Fielder Pos</span> mode from the green toolbar above the circular field, then hold and drag any player node with your mouse or finger around the grass outfield.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-300 flex items-center justify-center font-bold text-[9px] shrink-0 border border-emerald-900/40">2</span>
                    <p className="leading-relaxed">
                      <strong>Jiggle Interaction:</strong> Player nodes will play a playful 3D jiggle vibration whenever you hover ("point") or click them to signify successful selection feedback.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-300 flex items-center justify-center font-bold text-[9px] shrink-0 border border-emerald-900/40">3</span>
                    <p className="leading-relaxed">
                      <strong>Tactical Chalkboard:</strong> Toggle to <span className="text-amber-400 font-semibold">Sketch Chalk</span> mode to sketch transition vectors, bowling attack lanes, or batsman weakness channels on the turf. Change widths and colors in real-time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 font-mono">
                  <span>🧠</span> Strategy & Export
                </h4>
                <div className="space-y-4 text-[11px] text-slate-300">
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 flex items-center justify-center font-bold text-[9px] shrink-0 border border-indigo-900/30">4</span>
                    <p className="leading-relaxed">
                      <strong>Coaching Presets:</strong> Quickly load historic preset layouts like Test slips, bodyline traps, spin blocks, or ODI death-bowl sectors, modifying current alignments securely.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 flex items-center justify-center font-bold text-[9px] shrink-0 border border-indigo-900/30">5</span>
                    <p className="leading-relaxed">
                      <strong>Consult AI Coach:</strong> Invoke Gemini AI Coach (scroll to bottom panel) to scan player coordinates, locate coverage holes or vulnerability sectors, and receive smart placements tips.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 flex items-center justify-center font-bold text-[9px] shrink-0 border border-indigo-900/30">6</span>
                    <p className="leading-relaxed">
                      <strong>Compile PDF Report:</strong> Press the <span className="text-emerald-400 font-semibold">Export PDF for Coach</span> button in the top header bar to generate standard high-fidelity A4 field schematics and notes files.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 flex gap-2 text-[10px] text-emerald-200">
                <span className="text-sm shrink-0">💡</span>
                <p className="leading-normal">
                  <strong>Pro-Tip:</strong> Select any node on the pitch, then scroll to the <strong>Active Node Customizer</strong> tab in the right-side section to assign actual player names and jersey numbers!
                </p>
              </div>
            </div>
          )}

        </aside>

        {/* CENTER COLUMN: CANVAS FIELD VISUALIZER (LG: 6 COLS) */}
        <section className="lg:col-span-6 relative bg-slate-950 flex flex-col items-center justify-between p-6 overflow-y-auto max-h-none lg:max-h-[calc(100vh-4rem-2.5rem)] custom-scrollbar">
          
          {/* Subtle Radial Glow in back of Sandbox field */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_70%)]" />
          </div>

          <div className="w-full max-w-[540px] z-10 flex-1 flex flex-col justify-center gap-4">
            
            {/* The Cricket Field Board */}
            <CricketField
              fielders={fielders}
              onUpdateFielders={setFielders}
              selectedFielderId={selectedFielderId}
              onSelectFielder={setSelectedFielderId}
              isLeftHanded={isLeftHanded}
              drawings={drawings}
              onUpdateDrawings={setDrawings}
            />

            {/* Quick mini-status indicator overlay tags */}
            <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>COMPASS RADIAL SCALE: 1:200m</span>
              </div>
              <div>STRIKER: {isLeftHanded ? "LEFT HAND" : "RIGHT HAND"}</div>
            </div>

          </div>

          {/* Compact Mini Fielder scrollable folder list underneath */}
          <div className="w-full max-w-[540px] mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4 z-10 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-emerald-500"></span> Fielders Registry (11/11)
              </h4>
              <span className="text-[9px] font-mono text-emerald-400">SYNCED LIVE</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
              {fielders.map((fielder) => {
                const isSelected = selectedFielderId === fielder.id;
                const isWK = fielder.role === "wicket_keeper";
                const isBW = fielder.role === "bowler";
                let circleColor = "bg-emerald-950/40 text-emerald-400 border-emerald-900/40";
                if (isWK) circleColor = "bg-red-950/40 text-red-400 border-red-900/40";
                else if (isBW) circleColor = "bg-blue-950/40 text-blue-400 border-blue-900/40";

                return (
                  <button
                    key={fielder.id}
                    onClick={() => {
                      setSelectedFielderId(fielder.id);
                      const element = document.getElementById("fielder-custom-name-input");
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left shrink-0 transition-all ${
                      isSelected
                        ? "bg-slate-800 border-emerald-500"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded text-[10px] font-bold border flex items-center justify-center shrink-0 ${circleColor}`}>
                      {isWK ? "WK" : isBW ? "BW" : fielder.id.replace("F", "")}
                    </span>
                    <div className="max-w-[85px] truncate">
                      <p className="text-[7.5px] font-mono text-slate-500 uppercase font-black truncate">
                        {fielder.positionName}
                      </p>
                      <p className="text-[10px] text-white font-medium truncate">
                        {fielder.customName || fielder.defaultName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: COVERAGE TELEMETRY & NOTES PANEL (LG: 3 COLS) */}
        <aside className="lg:col-span-3 border-l border-slate-800 bg-slate-900/40 p-5 sm:p-6 flex flex-col justify-between gap-6 overflow-y-auto max-h-none lg:max-h-[calc(100vh-4rem-2.5rem)] custom-scrollbar">
          
          <div className="flex flex-col gap-6">
            
            {/* Dynamic Telemetry stats */}
            <section className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
                Coverage Analysis
              </h3>
              
              <div className="space-y-4">
                {/* Gauge 1: Off side bias */}
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/60">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] text-slate-400">Off-Side Bias</span>
                    <span className="text-[11px] font-bold text-emerald-400 font-mono">{offSidePct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${offSidePct}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">
                    {offSidePct > 60
                      ? "Heavy Off-side focus. Target the fifth-stump line."
                      : offSidePct < 40
                      ? "Leg-side trap enabled. Guard against long leg whips."
                      : "Balanced distribution across both sectors."}
                  </p>
                </div>

                {/* Gauge 2: boundary safety */}
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/60">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] text-slate-400">Boundary Risk</span>
                    <span className={`text-[11px] font-bold uppercase font-mono ${boundaryRiskColor}`}>
                      {boundaryRiskText}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        boundaryRiskText === "High" ? "bg-red-500" : boundaryRiskText === "Medium" ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: boundaryRiskText === "High" ? "25%" : boundaryRiskText === "Medium" ? "60%" : "95%" }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">
                    {outfieldCount} players guarding deep boundaries (outside 30-yard rim).
                  </p>
                </div>
              </div>
            </section>

            {/* Selected fielder coordinator editor */}
            <section className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2.5">
                Active Node Customizer
              </label>

              {selectedFielderId ? (
                (() => {
                  const fObj = fielders.find((f) => f.id === selectedFielderId);
                  if (!fObj) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1 text-[10px] font-mono">
                        <span className="text-slate-400 font-bold">Node: {fObj.id}</span>
                        <span className="text-emerald-400">{fObj.positionName}</span>
                      </div>
                      
                      <div>
                        <label className="text-[9px] text-slate-500 block mb-1">PLAYER SURNAME / NAME</label>
                        <input
                          id="fielder-custom-name-input"
                          type="text"
                          value={fObj.customName || ""}
                          onChange={(e) => handleUpdateFielderName(e.target.value)}
                          placeholder={fObj.defaultName}
                          className="w-full bg-slate-900 border border-slate-800 text-xs rounded p-2 text-white focus:outline-none focus:border-emerald-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-500 block mb-1">JERSEY NUMBER</label>
                        <input
                          type="number"
                          value={fObj.jerseyNumber || ""}
                          onChange={(e) => handleUpdateFielderJersey(e.target.value)}
                          placeholder="e.g. 17"
                          min="0"
                          max="99"
                          className="w-full bg-slate-900 border border-slate-800 text-xs rounded p-2 text-white focus:outline-none focus:border-emerald-500 font-medium font-mono"
                        />
                      </div>

                      <div className="text-[8.5px] text-slate-500 font-mono text-right">
                        COORD: X:{fObj.x} / Y:{fObj.y}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-3 text-slate-400 text-xs text-center border border-dashed border-slate-800 rounded-lg">
                  Click any fielder marker inside the turf diagram to edit name and jersey.
                </div>
              )}
            </section>

            {/* Coach custom tactical goals directions edit box */}
            <section className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Bowling Line Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-slate-900 border border-slate-800/60 rounded-lg p-2.5 text-xs text-slate-300 leading-normal resize-none focus:outline-none focus:border-emerald-600 focus:ring-0 custom-scrollbar font-sans"
                placeholder="Ex. Bowler to strictly lock on off-stump Channel of Uncertainty..."
              />
            </section>

          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={handleResetField}
              className="w-full py-2 bg-slate-800 border border-slate-700 hover:bg-slate-705 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>♻️</span> Reset Pitch Alignment
            </button>
          </div>

        </aside>

      </div>

      {/* COOP AI BRAIN COACH ADVICE ADAPTER */}
      <section className="bg-slate-950 max-w-7xl w-full mx-auto px-4 py-8">
        <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-y-12 translate-x-12">
            <Cpu className="w-80 h-80 text-white" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-950/60 pb-5 mb-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-900/60 text-indigo-400 border border-indigo-800/60 flex items-center justify-center text-xs">🧠</span>
                Gemini Tactics Strategist Advice
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Trigger our server-side evaluator to scan player coordinates, map defensive/offensive spaces, and suggest placements.
              </p>
            </div>

            <button
              onClick={handleConsultAICoach}
              disabled={isAnalyzing}
              id="consult-ai-btn"
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {isAnalyzing ? "AI Planning..." : "Analyze Field Spacing"}
            </button>
          </div>

          {/* AI COACH FEEDBACK SCREEN */}
          {isAnalyzing && (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-pulse gap-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-indigo-400 font-mono text-xs">{loadingStep}</p>
              <p className="text-[10px] text-slate-500">Applying professional cricket physics logic...</p>
            </div>
          )}

          {aiError && (
            <div className="bg-red-950/30 border border-red-500/20 text-red-300 p-4 rounded-xl flex flex-col gap-2">
              <span className="text-xs font-bold flex items-center gap-1.5">⚠️ Tactical Analyser Obstruction</span>
              <p className="text-xs">{aiError}</p>
            </div>
          )}

          {aiAnalysis ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
              
              <div className="md:col-span-5 flex flex-col gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-[10px] font-bold text-indigo-400 font-mono uppercase mb-2">FIELD ASSESSMENT</h4>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    "{aiAnalysis.assessment}"
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex-1">
                  <h4 className="text-[10px] font-bold text-red-400 font-mono uppercase mb-3">VULNERABILITIES & HOLES</h4>
                  <ul className="flex flex-col gap-2.5">
                    {aiAnalysis.gaps.map((gap, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex gap-2 items-start leading-relaxed">
                        <span className="text-red-500 shrink-0">⚠️</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="md:col-span-7 flex flex-col gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-[10px] font-bold text-emerald-400 font-mono uppercase mb-3">RECOMMENDED PLACEMENT ADJUSTMENTS</h4>
                  <div className="flex flex-col gap-2.5">
                    {aiAnalysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex gap-3">
                        <span className="w-7 h-7 rounded bg-emerald-950 border border-emerald-900 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {rec.fielderId}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white mb-0.5">
                            {rec.action} <span className="text-[10px] text-emerald-400">({rec.newPositionName})</span>
                          </p>
                          <p className="text-[11px] text-slate-400 leading-normal">{rec.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-900/30 flex gap-3 items-start">
                  <span className="text-lg">🏆</span>
                  <div>
                    <h5 className="text-[10px] font-bold text-indigo-300 font-mono">INSIDER COACHING BRIEF</h5>
                    <p className="text-xs text-indigo-200 mt-1 leading-relaxed italic">
                      "{aiAnalysis.coachingTip}"
                    </p>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            !isAnalyzing && !aiError && (
              <div className="bg-slate-950/40 border border-slate-800 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                <Clock className="w-8 h-8 text-slate-600" />
                <h4 className="text-xs font-semibold text-slate-400">No tactical report requested yet.</h4>
                <p className="text-[11px] text-slate-500 max-w-sm">
                   Configure the player positions and click "Analyze Field Spacing" above to request a professional breakdown.
                </p>
              </div>
            )
          )}

        </div>
      </section>

      {/* PDF DOSSIER SHEET SECTION (For crisp print rendering) */}
      <section className="bg-slate-950 px-4 pb-20 max-w-7xl w-full mx-auto">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">COACH REPORT PREVIEW</span>
          <span className="text-[10px] bg-indigo-950 border border-indigo-900 text-indigo-400 rounded-full px-2 py-0.5 font-mono">PDF Target Sheet</span>
        </div>

        <div
          id="coaching-printable-briefing"
          className="bg-[#0b1329] border-2 border-slate-800 rounded-2xl p-8 text-slate-100 font-sans shadow-2xl relative overflow-hidden flex flex-col gap-8 max-w-[800px] mx-auto scale-95 origin-top"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
            <div>
              <div className="bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white rounded font-mono inline-block mb-2">
                CRICKET MASTER TACTICS BRIEFING
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {customStrategyTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Profile: {targetBatsman} | Aligning Bowl: {bowlerType}
              </p>
            </div>
            <div className="text-right font-mono text-xs text-slate-500">
              <p>DATE: {new Date().toLocaleDateString()}</p>
              <p>GAME: {format}</p>
              <p>STANCE: {isLeftHanded ? "LHB" : "RHB"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-bold text-emerald-500 font-mono tracking-widest uppercase mb-2">
                  1. GENERAL DIRECTIONS
                </h4>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    placeholder="Directions..."
                    className="w-full bg-transparent border-none p-0 text-xs text-slate-300 leading-relaxed resize-none focus:outline-none focus:ring-0 active:ring-0"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-emerald-500 font-mono tracking-widest uppercase mb-2">
                  2. MATCH PLACEMENT REGISTER
                </h4>
                <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[10px] font-mono text-slate-400 uppercase">
                      <tr>
                        <th className="p-2">Pos</th>
                        <th className="p-2">Player Jersey / Name</th>
                        <th className="p-2">Sub-Alignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {fielders.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-900/40">
                          <td className="p-2 font-bold text-slate-200">
                            {f.id === "F1" ? "WK" : f.id === "F2" ? "BW" : f.id.replace("F", "")}
                          </td>
                          <td className="p-2 truncate max-w-[120px]">
                            {f.customName || f.defaultName} {f.jerseyNumber ? `(No. ${f.jerseyNumber})` : ""}
                          </td>
                          <td className="p-2 text-emerald-400 font-mono text-[10px]">{f.positionName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-emerald-500 font-mono tracking-widest uppercase mb-1">
                3. TACTICS SCHEME SUMMARY
              </h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                This schematic register represents a custom field designed using the Cricket Field Tactician board. Ensure the bowlers bowl to the field structure.
              </p>
              
              <div className="aspect-square bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-center">
                <svg viewBox="0 0 400 400" className="w-full h-full max-w-[280px]">
                  <circle cx="200" cy="200" r="185" fill="#132717" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="200" cy="200" r="100" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                  <rect x="190" y="160" width="20" height="80" fill="#ccba8e" rx="1" />
                  
                  {/* Pitch creases */}
                  <line x1="185" y1="170" x2="215" y2="170" stroke="#fff" strokeWidth="1" />
                  <line x1="185" y1="230" x2="215" y2="230" stroke="#fff" strokeWidth="1" />
                  
                  {/* Miniature field circles representation */}
                  {fielders.map((f) => {
                    const mappedX = (f.x / 600) * 400;
                    const mappedY = (f.y / 600) * 400;
                    const isWK = f.role === "wicket_keeper";
                    const isBW = f.role === "bowler";
                    const color = isWK ? "#ef4444" : isBW ? "#3b82f6" : "#10b981";
                    
                    return (
                      <g key={f.id}>
                        <circle cx={mappedX} cy={mappedY} r="7" fill={color} stroke="#ffffff" strokeWidth="0.8" />
                        <text x={mappedX} y={mappedY + 2.5} fill="#fff" fontSize="5.5" fontWeight="bold" textAnchor="middle">
                          {isWK ? "WK" : isBW ? "BW" : f.id.replace("F", "")}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {aiAnalysis && (
                <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-900/40 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold font-mono">
                    🏆 GEMINI BRIEFING NOTE:
                  </div>
                  <p className="text-[10px] text-indigo-200 italic leading-relaxed mt-1">
                    "{aiAnalysis.assessment}"
                  </p>
                </div>
              )}
            </div>

          </div>

          <div className="border-t border-slate-800 pt-3 text-center text-[10px] text-slate-500 font-mono">
            Generated via Cricket Field Tactician | Powered by Gemini AI
          </div>
        </div>
      </section>

      {/* FOOTER STATUS BAR */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between text-[10px] text-slate-500 uppercase font-mono tracking-wider">
        <div className="flex gap-4">
          <span>Session ID: CK-992-AUS</span>
          <span>Format: {format}</span>
          <span className="text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Synced to Tablet
          </span>
        </div>
        <div>© 2026 FIELDMASTER SYSTEMS</div>
      </footer>

    </div>
  );
}
