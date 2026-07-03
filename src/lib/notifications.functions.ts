import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({
  targetUserId: z.string().uuid(),
  type: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  body: z.string().max(500).optional().nullable(),
  link: z.string().max(500).optional().nullable(),
});

/**
 * Create a notification for another user. Only allowed when the caller and
 * the target are the two parties of an existing interest.
 */
export const notifyCounterpart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller shares an interest with the target user
    const { data: shared } = await supabase
      .from("interests")
      .select("id")
      .or(
        `and(tenant_id.eq.${userId},owner_id.eq.${data.targetUserId}),and(owner_id.eq.${userId},tenant_id.eq.${data.targetUserId})`,
      )
      .limit(1)
      .maybeSingle();
    if (!shared) {
      throw new Error("Not allowed to notify this user");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: data.targetUserId,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      link: data.link ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
