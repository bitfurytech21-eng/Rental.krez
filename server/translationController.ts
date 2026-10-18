import { Request, Response } from 'express';
import { logger } from './logger';
import { GoogleGenAI } from '@google/genai';

/**
 * Server-side Real Estate & Financial Translation Controller
 * Protects provider credentials and performs high-precision multi-language translation.
 */
export async function handleTranslationRequest(req: Request, res: Response) {
  try {
    const { texts, targetLanguage, sourceLanguage = 'en' } = req.body;

    if (!targetLanguage || !texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'targetLanguage and non-empty texts array required' });
    }

    // If target language is English, return inputs as-is
    if (targetLanguage === 'en') {
      return res.json({
        translations: texts,
        targetLanguage,
        sourceLanguage: 'en',
        cached: true,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a professional luxury real estate and financial translator for Kretz Real Estate.
Translate the following array of text strings into target language code "${targetLanguage}".

Rules:
1. Preserve all proper nouns ("Kretz", "Reental", "KP1-102"), brand names, URLs, property reference IDs, and numbers.
2. Preserve financial figures, currency symbols (€, $), percentages (%), dates, and mathematical expressions.
3. Use professional European luxury real estate, legal, and investment terminology.
4. Return ONLY a valid JSON array of translated strings in the exact same order as the input array.

Input JSON array:
${JSON.stringify(texts)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const content = response.text;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length === texts.length) {
            return res.json({
              translations: parsed,
              targetLanguage,
              sourceLanguage,
            });
          }
        }
      } catch (aiErr: any) {
        logger.log({
          level: 'warn',
          category: 'api',
          requestId: (req as any).id || 'req-translate',
          eventType: 'TRANSLATION_MODEL_WARN',
          outcome: 'warning',
          message: aiErr?.message || 'Gemini translation model note',
        });
      }
    }

    // Fallback: Return original input strings safely without crashing
    return res.json({
      translations: texts,
      targetLanguage,
      sourceLanguage,
      note: 'Fallback mode (Original text retained)',
    });
  } catch (err: any) {
    logger.log({
      level: 'error',
      category: 'api',
      requestId: (req as any).id || 'req-translate',
      eventType: 'TRANSLATION_ENDPOINT_ERROR',
      outcome: 'failure',
      message: err?.message || 'handleTranslationRequest error',
    });
    return res.status(500).json({
      error: 'Translation endpoint failure',
      message: err.message || 'Internal error',
      translations: req.body?.texts || [],
    });
  }
}
