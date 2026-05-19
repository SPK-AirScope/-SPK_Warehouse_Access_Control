import { Type } from "@google/genai";

export const aiService = {
  async analyzeApplicationPdf(base64Data: string, mimeType: string = "application/pdf") {
    try {
      console.log("Starting AI Analysis via server proxy...");
      
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ base64Data, mimeType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.error || "Server error during AI analysis") as any;
        error.detail = errorData.detail;
        error.raw = errorData.raw;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error("AI Analysis Client Error:", error);
      throw error;
    }
  }
};
