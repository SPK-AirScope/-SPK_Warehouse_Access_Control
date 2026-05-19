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
        const text = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(text);
        } catch (e) {
          // If not JSON, it might be an HTML error page from a proxy
          const looksLikeHtml = text.trim().startsWith('<');
          throw new Error(looksLikeHtml 
            ? `서버가 JSON 대신 HTML을 반환했습니다 (상태 코드: ${response.status}). 백엔드 서버가 실행 중인지 확인하세요.` 
            : `서버 오류: ${text.slice(0, 100)}`);
        }
        
        const error = new Error(errorData.error || "Server error during AI analysis") as any;
        error.detail = errorData.detail;
        error.raw = errorData.raw;
        throw error;
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`분석 결과 형식이 올바르지 않습니다: ${text.slice(0, 100)}`);
      }
    } catch (error) {
      console.error("AI Analysis Client Error:", error);
      throw error;
    }
  }
};
