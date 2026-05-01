import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY no configurado en secrets" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: uData, error: userErr } = await userClient.auth.getUser();
    const caller = uData.user;
    if (userErr || !caller) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: isSuper } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "super_admin",
    });
    const { data: isAdm } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isSuper && !isAdm) {
      return new Response(JSON.stringify({ error: "Sin permiso" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { target_user_id, is_active } = (await req.json()) as {
      target_user_id?: string;
      is_active?: boolean;
    };
    if (!target_user_id || typeof is_active !== "boolean") {
      return new Response(JSON.stringify({ error: "Body inválido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: targetSuper } = await adminClient.rpc("has_role", {
      _user_id: target_user_id,
      _role: "super_admin",
    });
    if (targetSuper && is_active === false) {
      return new Response(JSON.stringify({ error: "No se puede desactivar un super_admin" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { error: upErr } = await adminClient
      .from("user_status")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("user_id", target_user_id);

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
