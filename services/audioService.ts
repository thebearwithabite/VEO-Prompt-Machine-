/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

/**
 * Transcribes audio into a formatted screenplay.
 */
export const transcribeAudio = async (
  audioBase64: string,
  mimeType: string
): Promise<{ result: string; tokens: { input: number; output: number } }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Listen to the attached audio.
    Your task is to transcribe it into a Standard Screenplay Format.
    1. Identify distinct speakers and format their dialogue (CHARACTER NAME centered).
    2. Infer Scene Headings (e.g., INT. STUDIO - DAY) based on context.
    3. Include parentheticals for tone (e.g., (laughing), (whispering)).
    4. Return ONLY the formatted script text.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
        ],
      },
    ],
  });

  return {
    result: response.text || '',
    tokens: {
      input: response.usageMetadata?.promptTokenCount || 0,
      output: response.usageMetadata?.candidatesTokenCount || 0,
    },
  };
};