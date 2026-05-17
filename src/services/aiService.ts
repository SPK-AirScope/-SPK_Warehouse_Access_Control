import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const aiService = {
  async analyzeApplicationPdf(base64Data: string, mimeType: string = "application/pdf") {
    try {
      console.log("Starting AI Analysis for file type:", mimeType);
      console.log("Base64 string length:", base64Data.length);
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
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
                It can be:
                - 방문출입 신청서 (Visitor Entry Application)
                - 공구류 반입 신청서 (Tool Entry Application)
                - Combined Application

                Identify and extract data from these sections exactly as they appear in the tables:
                1. 방문자 인적사항 (Visitor Information Table):
                   Extract columns: 성명 (name), 생년월일 (birthDate), 소속 (company), 연락처 (phone), 출입증 종류 (badgeType), 방문증 신청 접수 번호 (receiptNo), 출입 허가구역 (accessZone).
                   Also extract matching rows from Section 2: 성명 (name), 방문일정 (visitDate), 방문목적 (purpose), 비고 (remarks). 
                   Map these two tables into single visitor objects based on the '성명' field.
                2. 인솔자 정보 (Escort Information Table):
                   Extract columns: 성명 (name), 소속 (company), 연락처 (phone), 정규출입증 출입구역 (regularBadgeZone), 비고 (remarks).
                3. 반입/사용 장비/공구 (Tool List): Extract 품명 (name), 수량 (quantity), 단위 (unit), 규격 (spec), 비고 (note) if present in a combined or separate document.
                4. 신청자 성명 (Applicant Name): Extract the name next to '성명 :' in the confirmation section at the bottom.
                
                Strict Guidelines:
                - Treat the table rows as individual entries.
                - If '방문일정' is present for a visitor, use it as 'visitDate'.
                - Ensure 'purpose' captures the full '방문목적' text.
                - If a field is empty or not found, return an empty string "".
                - For "quantity", return a NUMBER. If not specified, return 0.
                
                Return ONLY a valid JSON object.
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

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      console.log("AI Analysis Success");
      return JSON.parse(text);
    } catch (error) {
      console.error("AI Analysis Error Details:", error);
      throw error;
    }
  }
};
