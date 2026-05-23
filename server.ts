/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());
  
  const PORT = 3000;

  // 1. AI Coach Analyze Endpoint (Server-Side proxying the Gemini API)
  app.post("/api/tactician/analyze", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({
          error: "Gemini API key is not configured in your environment. Please add it to the Secrets panel in AI Studio settings."
        });
      }

      const { bowlerType, batterHand, format, fielders, notes } = req.body;

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptSystem = `You are an elite, world-renowned international cricket coach, strategist, and analytics mastermind. 
Analyze the provided field placement layout, identify defensive/offensive gaps, and suggest professional adjustments based on cricket physics, angles, and bowler type.`;

      const promptBody = `
COACH CHALLENGE PARAMETERS:
- Bowler Type: ${bowlerType}
- Batter Stance: ${batterHand}
- Format of Match: ${format}
- Coach Notes / Scenario: "${notes || 'No extra target bowler notes'}"

CURRENT STRATEGIC FIELD ALIGNMENTS:
${fielders.map((f: any) => `- Player #${f.id} (${f.customName || f.defaultName}) is placed at location "${f.positionName}" (SVG X:${f.x}, Y:${f.y})`).join("\n")}

Please respond in strict, valid JSON conforming to the following structure:
{
  "assessment": "One or two sentences summarizing the overall theme (e.g., 'An aggressive slip cordon attacking the off-stump of a right-handed batter...').",
  "gaps": [
    "Vulnerability 1: Unprotected boundaries or single pockets (e.g., 'No cover protection...').",
    "Vulnerability 2..."
  ],
  "recommendations": [
    {
      "fielderId": "Which fielder identifier to move, pick from current: F1 to F11",
      "action": "Specific movement instruction (e.g., 'Move Third Slip wider to Gully')",
      "reason": "Tactical justification.",
      "newPositionName": "Calculated final position name"
    }
  ],
  "coachingTip": "A punchy motivational tip / bowling line of attack for the team."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptBody,
        config: {
          systemInstruction: promptSystem,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assessment: { type: Type.STRING },
              gaps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fielderId: { type: Type.STRING },
                    action: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    newPositionName: { type: Type.STRING }
                  },
                  required: ["fielderId", "action", "reason", "newPositionName"]
                }
              },
              coachingTip: { type: Type.STRING }
            },
            required: ["assessment", "gaps", "recommendations", "coachingTip"]
          }
        }
      });

      const textOutput = response.text || "{}";
      const analysis = JSON.parse(textOutput);
      res.json(analysis);

    } catch (err: any) {
      console.error("Gemini Analyser Error:", err);
      res.status(500).json({ error: err.message || "Failed to analyze field layout" });
    }
  });

  // 2. Vite Middleware or Static Assets delivery
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA Fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cricket Pitch Server listening on port ${PORT}`);
  });
}

startServer();
