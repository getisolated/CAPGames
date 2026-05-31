"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { env, isEmailDomainAllowed } from "@/lib/env";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function requestOtp(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Adresse e-mail invalide." };
  }

  if (!isEmailDomainAllowed(email)) {
    return { ok: false, error: "Ce domaine d'e-mail n'est pas autorisé." };
  }

  // Bypass dev : on connecte directement l'utilisateur sans OTP.
  if (env.AUTH_BYPASS_OTP) {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: false,
        error: "AUTH_BYPASS_OTP nécessite SUPABASE_SERVICE_ROLE_KEY.",
      };
    }

    const service = createServiceClient();

    // S'assure que l'utilisateur existe (création silencieuse sinon)
    const { data: existing } = await service.auth.admin.listUsers();
    const found = existing?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email
    );
    if (!found) {
      const { error: createErr } = await service.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (createErr) return { ok: false, error: createErr.message };
    }

    // Génère un OTP côté admin et le vérifie immédiatement via le client
    // standard pour que les cookies de session soient posés sur notre domaine.
    const { data: linkData, error: linkErr } =
      await service.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
    if (linkErr || !linkData?.properties?.email_otp) {
      return {
        ok: false,
        error: linkErr?.message ?? "Impossible de générer le token bypass.",
      };
    }

    const supabase = await createClient();
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: linkData.properties.email_otp,
      type: "email",
    });
    if (verifyErr) {
      return { ok: false, error: verifyErr.message };
    }
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function verifyOtp(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "").trim();

  if (!email || !token) {
    return { ok: false, error: "Email et code requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) {
    return { ok: false, error: "Code invalide ou expiré." };
  }
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
