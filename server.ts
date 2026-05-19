import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Firebase Admin for server-side Storage operations
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let adminStorage: admin.storage.Storage | null = null;
let validatedBucketName = "";
let firebaseConfig: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    const configBucket = firebaseConfig.storageBucket?.replace('gs://', '') || "";
    
    // Initialize Admin
    let adminApp;
    if (!admin.apps.length) {
      adminApp = admin.initializeApp({
        projectId: firebaseConfig.projectId,
        storageBucket: configBucket
      });
    } else {
      adminApp = admin.app();
    }
    
    adminStorage = admin.storage(adminApp);
    
    // Explicitly set the preferred bucket from config
    const firebaseProjectId = firebaseConfig.projectId;
    
    const defaultBuckets = [
      configBucket,
      "spk-warehouse-access-control.firebasestorage.app", // User provided
      `${firebaseProjectId}.firebasestorage.app`,
      `${firebaseProjectId}.appspot.com`,
      firebaseConfig.firestoreDatabaseId ? `${firebaseConfig.firestoreDatabaseId}.firebasestorage.app` : "",
      firebaseConfig.firestoreDatabaseId ? `${firebaseConfig.firestoreDatabaseId}.appspot.com` : "",
      "ais-asia-northeast1-ad6001fe30.firebasestorage.app",
      "ais-asia-northeast1-ad6001fe30.appspot.com"
    ].filter(Boolean);

    // Initial guess
    validatedBucketName = configBucket || defaultBuckets[0];
    
    console.log(`[Firebase] Admin initialized for project: ${firebaseProjectId}`);
    adminApp.INTERNAL.getToken().then(() => {
      // Accessing info from internal object sometimes works, but safer to try metadata
    }).catch(() => {});
    
    // Attempt to get SA email if possible
    const options = adminApp.options;
    console.log(`[Firebase] Auth Options: ${JSON.stringify({ projectId: options.projectId, storageBucket: options.storageBucket })}`);
    
    console.log(`[Firebase] Configured Bucket: ${configBucket}`);
    console.log(`[Firebase] GCloud Project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
    console.log(`[Firebase] Initialized Bucket Guess: ${validatedBucketName}`);
    console.log(`[Firebase] Candidates: ${defaultBuckets.join(', ')}`);
  } catch (err) {
    console.error("Failed to initialize Firebase Admin on server:", err);
  }
}

app.use(express.json({ limit: '100mb' }));

// Health check with diagnostics
app.get("/api/health", async (req, res) => {
  const diagnostics: any = {
    status: "ok",
    firebaseAdmin: !!adminStorage,
    validatedBucket: validatedBucketName,
    env: {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      gcloudProject: process.env.GOOGLE_CLOUD_PROJECT
    }
  };
  
  res.json(diagnostics);
});

// Gemini Initialization
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Server-side Firebase Storage Upload Proxy
app.post("/api/storage/upload", async (req, res) => {
  try {
    const { base64Data, path: storagePath, contentType } = req.body;
    console.log(`[Storage] Upload request for ${storagePath} (${Math.round(base64Data?.length / 1024)} KB)`);

    if (!adminStorage) {
      return res.status(500).json({ error: "Firebase Admin Storage is not initialized." });
    }

    if (!base64Data || !storagePath) {
      return res.status(400).json({ error: "Missing base64Data or path" });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    const candidates = [
      "spk-warehouse-access-control.firebasestorage.app",
      validatedBucketName,
      firebaseConfig?.storageBucket?.replace('gs://', ''),
      firebaseConfig?.projectId ? `${firebaseConfig.projectId}.firebasestorage.app` : "",
      firebaseConfig?.projectId ? `${firebaseConfig.projectId}.appspot.com` : "",
      "" // Default bucket
    ].filter((v, i, a) => v !== undefined && v !== null && v !== "" && a.indexOf(v) === i);

    console.log(`[Storage] Trying candidates: ${candidates.join(', ')}`);

    const performUpload = async (bName: string) => {
      const bucket = bName ? adminStorage!.bucket(bName) : adminStorage!.bucket();
      const file = bucket.file(storagePath);
      await file.save(buffer, {
        resumable: false, 
        metadata: {
          contentType: contentType || 'application/pdf',
          metadata: { firebaseStorageDownloadTokens: token }
        }
      });
      return bucket.name; 
    };

    let finalBucketName = "";
    let lastUploadError: any = null;
    let errorSummary = "";

    for (const bucketCandidate of candidates) {
      try {
        const displayBucket = bucketCandidate || '(default)';
        console.log(`[Storage] Upload attempt -> ${displayBucket}`);
        finalBucketName = await performUpload(bucketCandidate);
        validatedBucketName = finalBucketName;
        console.log(`[Storage] SUCCESS -> ${finalBucketName}`);
        break;
      } catch (err: any) {
        lastUploadError = err;
        const msg = err.message || "Unknown error";
        const code = err.code || "NoCode";
        errorSummary += `[${bucketCandidate || 'default'}: ${code} ${msg}] `;
        
        console.warn(`[Storage] FAILED -> ${bucketCandidate || '(default)'} (Code: ${code}): ${msg}`);
        
        if (code === 403) {
          // If it's permission denied, we might be using the wrong service account or the bucket exists but we can't write
          // We continue to next candidate
          continue;
        }
        if (code === 404 || msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("does not exist")) {
          continue;
        }
        // For other errors, we might still want to try next candidates
        continue;
      }
    }

    if (!finalBucketName) {
      console.error("[Storage] All candidates failed. Summary:", errorSummary);
      
      let userError = "스토리지 버킷을 찾을 수 없거나 접근 권한이 없습니다.";
      if (errorSummary.includes("403")) {
        userError = "스토리지 접근 권한(IAM)이 없습니다. Firebase/GCP 콘솔에서 서비스 계정에 'Storage Object Admin' 권한을 추가해 주세요.";
      }

      return res.status(500).json({ 
        error: userError,
        detail: lastUploadError?.message || "All candidates failed",
        summary: errorSummary
      });
    }

    const url = `https://firebasestorage.googleapis.com/v0/b/${finalBucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    res.json({ url, path: storagePath });

  } catch (error: any) {
    console.error("Storage Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Server-side Gemini API Route
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { base64Data, mimeType = "application/pdf" } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data" });
    }

    console.log("Analyzing document with Gemini...");
    const ai = getAI();
    
    // Fallback models from gemini-api skill
    // Priority: Pro first if Flash is overloaded, then various Flash versions
    const models = [
      "gemini-3.1-pro-preview",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
    ];
    let lastError: any = null;
    let finalResponse: any = null;

    for (const modelName of models) {
      let retryCount = 0;
      const maxRetries = 1;

      console.log(`[Gemini] Attempting analysis with: ${modelName}`);

      while (retryCount <= maxRetries) {
        try {
          finalResponse = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data
                    }
                  },
                  {
                    text: `
                    You are a specialized document extractor for Swissport Korea. 
                    Extract personnel entry information and equipment/tool list from the provided application document.
                    
                    The document is in Korean and typically contains tables.
                    Identify and extract data from these sections exactly as they appear in the tables:
                    1. 방문자 인적사항 (Visitor Information Table):
                       Extract columns: 성명 (name), 생년월일 (birthDate), 소속 (company), 연락처 (phone), 출입증 종류 (badgeType), 방문증 신청 접수 번호 (receiptNo), 출입 허가구역 (accessZone).
                       Also extract matching rows from Section 2: 성명 (name), 방문일정 (visitDate), 방문목적 (purpose), 비고 (remarks). 
                       Map these two tables into single visitor objects based on the '성명' field.
                    2. 인솔자 정보 (Escort Information Table):
                       Extract columns: 성명 (name), 소속 (company), 연락처 (phone), 정규출입증 출입구역 (regularBadgeZone), 비고 (remarks).
                    3. 반입/사용 장비/공구 (Tool List): Extract 품명 (name), 수량 (quantity), 단위 (unit), 규격 (spec), 비고 (note) if present.
                    4. 신청자 성명 (Applicant Name): Extract the name next to '성명 :' in the confirmation section at the bottom.
                    
                    Return ONLY a valid JSON object matching the requested schema. Ensure quantity is a number.
                    If any value is missing, use an empty string or 0 as appropriate.
                    `
                  }
                ]
              }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  applicantName: { type: Type.STRING },
                  visitors: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        birthDate: { type: Type.STRING },
                        company: { type: Type.STRING },
                        phone: { type: Type.STRING },
                        badgeType: { type: Type.STRING },
                        receiptNo: { type: Type.STRING },
                        accessZone: { type: Type.STRING },
                        visitDate: { type: Type.STRING },
                        purpose: { type: Type.STRING },
                        remarks: { type: Type.STRING }
                      }
                    }
                  },
                  escorts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        company: { type: Type.STRING },
                        phone: { type: Type.STRING },
                        regularBadgeZone: { type: Type.STRING },
                        remarks: { type: Type.STRING }
                      }
                    }
                  },
                  tools: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                        spec: { type: Type.STRING },
                        note: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          });
          // If successful, break out of retry loop AND model loop
          if (finalResponse) {
            console.log(`[Gemini] Successfully analyzed with ${modelName}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.error(`[Gemini] Error with ${modelName} (Attempt ${retryCount + 1}):`, err.message);
          
          const errMsg = err.message?.toLowerCase() || "";
          const isQuota = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("resource_exhausted");
          const isUnavailable = errMsg.includes("503") || errMsg.includes("unavailable") || errMsg.includes("overloaded") || errMsg.includes("demand");
          const isInvalidKey = errMsg.includes("401") || errMsg.includes("unauthenticated") || errMsg.includes("key is not valid");
          
          if (isInvalidKey) {
            console.error("[Gemini] Invalid API Key detected.");
            break; // No point trying other models if key is bad
          }

          if ((isQuota || isUnavailable) && retryCount < maxRetries) {
            retryCount++;
            const waitTime = retryCount * 2000;
            console.warn(`[Gemini] Temporary error. Retrying ${modelName} in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            console.warn(`[Gemini] ${modelName} failed, moving to next model if available.`);
            break;
          }
        }
      }
      
      if (finalResponse) break; 
    }

    if (!finalResponse) {
      console.error("[Gemini] Final Failure: All AI models failed.");
      const errMsg = lastError?.message || "Unknown error";
      const isQuota = errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("quota");
      const isUnavailable = errMsg.toLowerCase().includes("503") || errMsg.toLowerCase().includes("unavailable");
      
      let userFriendlyError = "모든 분석 모델이 현재 바쁩니다. 잠시 후 다시 시도해주세요.";
      if (isQuota) userFriendlyError = "할당량 초과입니다. 잠시 후 다시 시도해주세요.";
      if (errMsg.includes("401")) userFriendlyError = "API 키 인증에 실패했습니다. 설정을 확인해주세요.";

      return res.status(isQuota ? 429 : 500).json({ 
        error: userFriendlyError,
        isQuotaError: isQuota,
        detail: errMsg
      });
    }

    const text = finalResponse.text;
    if (!text) {
      console.error("Empty response from AI");
      return res.status(500).json({ error: "Empty AI response" });
    }
    
    console.log("AI response received, parsing JSON...");
    
    // Clean up markdown markers if present
    const cleanedText = text.replace(/```json\n?|```/g, "").trim();

    try {
      const parsed = JSON.parse(cleanedText);
      res.json(parsed);
    } catch (parseError: any) {
      console.error("JSON Parse Error. Content:", text);
      res.status(500).json({ error: "Failed to parse AI response", raw: text });
    }
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
