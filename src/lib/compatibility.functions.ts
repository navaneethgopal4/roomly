import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({
  listingId: z.string().uuid(),
});

interface ScoreResult {
  score: number;
  explanation: string;
  source: "llm" | "fallback";
}

function ruleBasedScore(args: {
  rent: number;
  budgetMin: number;
  budgetMax: number;
  listingLocation: string;
  preferredLocation: string;
}): ScoreResult {
  const { rent, budgetMin, budgetMax, listingLocation, preferredLocation } = args;
  let budgetScore = 0;
  if (rent >= budgetMin && rent <= budgetMax) budgetScore = 50;
  else {
    const mid = (budgetMin + budgetMax) / 2;
    const range = Math.max(budgetMax - budgetMin, 1);
    const distance = Math.abs(rent - mid) / range;
    budgetScore = Math.max(0, 50 - Math.round(distance * 50));
  }
  const a = listingLocation.toLowerCase();
  const b = preferredLocation.toLowerCase();
  let locScore = 0;
  if (a === b) locScore = 50;
  else if (a.includes(b) || b.includes(a)) locScore = 35;
  else {
    const aWords = new Set(a.split(/[\s,]+/).filter(Boolean));
    const overlap = b.split(/[\s,]+/).filter((w) => w && aWords.has(w)).length;
    locScore = Math.min(30, overlap * 15);
  }
  const score = Math.max(0, Math.min(100, budgetScore + locScore));
  const explanation = `Rent ₹${rent} vs budget ₹${budgetMin}–₹${budgetMax}; location "${listingLocation}" vs preferred "${preferredLocation}". Rule-based fallback score.`;
  return { score, explanation, source: "fallback" };
}

async function callLLM(tenant: {
  preferred_location: string;
  budget_min: number;
  budget_max: number;
  move_in_date: string;
  bio: string | null;
}, listing: {
  title: string;
  location: string;
  rent_monthly: number;
  available_from: string;
  room_type: string;
  furnishing: string;
  description: string | null;
}): Promise<ScoreResult | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;

  const prompt = `Given this room listing:
${JSON.stringify(listing)}

and this tenant profile:
${JSON.stringify(tenant)}

Compute a compatibility score from 0 to 100 based primarily on budget match and location match, with secondary consideration for move-in date alignment and room type. Return JSON only: { "score": number, "explanation": string }. The explanation must be 1-2 short sentences.`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a strict JSON-only API. Reply with valid JSON matching the schema requested. No prose, no markdown." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      console.error("LLM gateway error", resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
    const explanation = String(parsed.explanation ?? "").slice(0, 600);
    if (Number.isNaN(score) || !explanation) return null;
    return { score, explanation, source: "llm" };
  } catch (e) {
    console.error("LLM call failed", e);
    return null;
  }
}

export const computeCompatibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { listingId } = data;

    // Check cache first
    const { data: cached } = await supabase
      .from("compatibility_scores")
      .select("score, explanation, source")
      .eq("listing_id", listingId)
      .eq("tenant_id", userId)
      .maybeSingle();
    if (cached) return cached;

    const [{ data: listing }, { data: tenant }] = await Promise.all([
      supabase.from("listings").select("*").eq("id", listingId).maybeSingle(),
      supabase.from("tenant_profiles").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    if (!listing) throw new Error("Listing not found");
    if (!tenant) throw new Error("Create your tenant profile first");

    let result = await callLLM(
      {
        preferred_location: tenant.preferred_location,
        budget_min: tenant.budget_min,
        budget_max: tenant.budget_max,
        move_in_date: tenant.move_in_date,
        bio: tenant.bio,
      },
      {
        title: listing.title,
        location: listing.location,
        rent_monthly: listing.rent_monthly,
        available_from: listing.available_from,
        room_type: listing.room_type,
        furnishing: listing.furnishing,
        description: listing.description,
      },
    );
    if (!result) {
      result = ruleBasedScore({
        rent: listing.rent_monthly,
        budgetMin: tenant.budget_min,
        budgetMax: tenant.budget_max,
        listingLocation: listing.location,
        preferredLocation: tenant.preferred_location,
      });
    }

    await supabase.from("compatibility_scores").upsert(
      {
        listing_id: listingId,
        tenant_id: userId,
        score: result.score,
        explanation: result.explanation,
        source: result.source,
      },
      { onConflict: "listing_id,tenant_id" },
    );

    return result;
  });
