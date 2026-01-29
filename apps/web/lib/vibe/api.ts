import OpenAI from "openai";
import type { VibeRequest } from "./types";

const SYSTEM_PROMPT = `You are a witty, internet-native copywriter for a location scoring app called NearbyIndex.
Your job is to write a single 1-2 sentence "vibe check" comment based on a location's convenience scores.

RULES:
- Maximum 120 characters
- Be playful and slightly roasty, but never mean
- Reference specific category contrasts when interesting (e.g., "lots of bars, no groceries")
- No emojis
- No hashtags
- Never mention specific addresses, neighborhoods, or place names
- Never reference crime, safety, property values, or protected classes
- End with a period or question mark

TONE EXAMPLES:
- Score 95: "Suspiciously perfect. Are you a real estate agent?"
- Score 23: "Certified off-grid vibes. Hope you like hiking for milk."
- High bars, low groceries: "Your liver's happy. Your fridge? Not so much."`;

function buildUserPrompt(request: VibeRequest): string {
  const categoryLabels: Record<string, string> = {
    groceries: "Groceries",
    restaurants: "Restaurants",
    transit: "Transit",
    healthcare: "Healthcare",
    education: "Education",
    parks: "Parks",
    shopping: "Shopping",
    entertainment: "Entertainment",
  };

  const categoryBreakdown = request.categories
    .map((c) => `- ${categoryLabels[c.id] || c.id}: ${c.score}`)
    .join("\n");

  return `Overall score: ${request.overall}/100

Category breakdown:
${categoryBreakdown}

Write a vibe check comment for this location.`;
}

function getLocaleInstruction(locale: string): string {
  const localeNames: Record<string, string> = {
    de: "German",
    es: "Spanish",
    fr: "French",
  };

  const localeName = localeNames[locale];
  if (!localeName) return "";

  return `\nRespond in ${localeName}. Keep the same playful tone but use culturally appropriate humor.`;
}

/**
 * Generate a vibe comment using OpenAI GPT-4o-mini
 */
export async function generateVibe(request: VibeRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt =
    SYSTEM_PROMPT + getLocaleInstruction(request.locale || "en");
  const userPrompt = buildUserPrompt(request);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 100,
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Ensure the comment is not too long (120 char limit)
  if (content.length > 150) {
    // Allow some leeway but truncate if way over
    return content.substring(0, 147) + "...";
  }

  return content;
}
