
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTIONS } from "../constants";
import { PersonalityMode } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Fixed: Initializing with apiKey named parameter and using process.env.API_KEY directly
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateChatResponse(
    prompt: string, 
    personality: PersonalityMode, 
    history: any[] = [], 
    attachments: any[] = [],
    customInstruction?: string
  ) {
    const parts: any[] = [{ text: prompt }];
    
    for (const attachment of attachments) {
      if (attachment.type.startsWith('image/')) {
        parts.push({
          inlineData: {
            data: attachment.base64.split(',')[1],
            mimeType: attachment.type
          }
        });
      } else {
        if (attachment.text) {
          parts[0].text += `\n\n[Arquivo Anexo: ${attachment.name}]\nConteúdo:\n${attachment.text}`;
        }
      }
    }

    const instruction = personality === 'Custom' && customInstruction 
      ? customInstruction 
      : SYSTEM_INSTRUCTIONS[personality] || SYSTEM_INSTRUCTIONS['Normal'];

    // Fixed: Using ai.models.generateContent with both model name and contents history
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history,
        { role: 'user', parts }
      ],
      config: {
        systemInstruction: instruction,
        temperature: 0.9,
      }
    });
    // Fixed: Accessing response.text as a property, not a method
    return response.text;
  }

  async getHoroscope() {
    const today = new Date().toLocaleDateString('pt-BR');
    const prompt = `Gere o horóscopo completo para o signo de Câncer para o dia de hoje (${today}). Inclua previsões para Amor, Saúde, Dinheiro e uma frase de impacto do dia.`;
    // Fixed: Calling generateContent directly on the model via ai.models.generateContent
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "Você é um astrólogo moderno, místico e vibrante.",
        temperature: 0.7,
      }
    });
    // Fixed: Accessing response.text as a property
    return response.text;
  }
}
