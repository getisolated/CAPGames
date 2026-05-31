import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { env } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { next } = await searchParams;
  if (user) {
    redirect(next ?? "/");
  }

  return (
    <div className="cg-app">
      <div className="shell-leak" />
      <div className="screen">
        <div className="statusbar" />
        <LoginForm bypassOtp={env.AUTH_BYPASS_OTP} />
      </div>
    </div>
  );
}
