import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCounterpartDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { interestId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: interest, error } = await supabase
      .from("interests")
      .select("tenant_id, owner_id")
      .eq("id", data.interestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!interest) throw new Error("Interest not found");
    if (interest.tenant_id !== userId && interest.owner_id !== userId) {
      throw new Error("Forbidden");
    }
    const otherId = interest.tenant_id === userId ? interest.owner_id : interest.tenant_id;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", otherId)
      .maybeSingle();
    return { userId: otherId, displayName: p?.display_name ?? "" };
  });

export const listRecentProfilesForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roles) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
