import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "super_admin" | "admin" | "usuario";

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
        JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY no configurado en secrets de la función" }),
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

    const { email, password, role } = (await req.json()) as {
      email?: string;
      password?: string;
      role?: AppRole;
    };
    if (!email?.trim() || !password || password.length < 8) {
      return new Response(JSON.stringify({ error: "Email y contraseña (mín. 8) requeridos" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (role !== "admin" && role !== "usuario") {
      return new Response(JSON.stringify({ error: "Rol inválido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: isSuper } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "super_admin" as AppRole,
    });
    const { data: isAdm } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin" as AppRole,
    });
    const callerIsSuper = !!isSuper;
    const callerIsAdmin = !!isAdm;

    if (role === "admin" && !callerIsSuper) {
      return new Response(JSON.stringify({ error: "Solo super_admin puede crear admins" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (role === "usuario" && !callerIsSuper && !callerIsAdmin) {
      return new Response(JSON.stringify({ error: "Sin permiso" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Error al crear usuario" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const newId = created.user.id;

    // El trigger puede haber insertado 'usuario'; ajustamos rol explícito
    await adminClient.from("user_roles").delete().eq("user_id", newId);
    const { error: roleErr } = await adminClient.from("user_roles").insert({
      user_id: newId,
      role: role as AppRole,
    });
    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("user_status").upsert(
      {
        user_id: newId,
        email: email.trim(),
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return new Response(JSON.stringify({ ok: true, user_id: newId }), {
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
