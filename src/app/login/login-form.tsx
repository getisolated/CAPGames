"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Wordmark } from "@/components/cap/wordmark";
import { Icon } from "@/components/cap/icons";
import { requestOtp, verifyOtp } from "./actions";

const OTP_LEN = 6;

export function LoginForm({ bypassOtp }: { bypassOtp: boolean }) {
  const [stage, setStage] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(() => Array(OTP_LEN).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const valid = /\S+@\S+\.\S+/.test(email);

  function sendOtp() {
    if (!valid) return;
    const fd = new FormData();
    fd.set("email", email);
    startTransition(async () => {
      const res = await requestOtp(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (bypassOtp) {
        router.push(next);
        router.refresh();
      } else {
        toast.success("Code envoyé. Vérifie ta boîte de réception.");
        setStage("sent");
      }
    });
  }

  function submitCode(codeArr: string[]) {
    if (!codeArr.every((c) => c) || isPending) return;
    const fd = new FormData();
    fd.set("email", email);
    fd.set("token", codeArr.join(""));
    startTransition(async () => {
      const res = await verifyOtp(fd);
      if (!res.ok) {
        toast.error(res.error);
        setCode(Array(OTP_LEN).fill(""));
        inputsRef.current[0]?.focus();
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  function handleCodeChange(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const nextCode = [...code];
    nextCode[i] = v;
    setCode(nextCode);
    if (v && i < OTP_LEN - 1) inputsRef.current[i + 1]?.focus();
    submitCode(nextCode);
  }

  function handleCodePaste(
    e: React.ClipboardEvent<HTMLInputElement>,
    startIndex: number
  ) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    e.preventDefault();
    const nextCode = [...code];
    let idx = startIndex;
    for (const ch of digits) {
      if (idx >= OTP_LEN) break;
      nextCode[idx] = ch;
      idx += 1;
    }
    setCode(nextCode);
    const lastFilled = Math.min(idx, OTP_LEN) - 1;
    inputsRef.current[Math.max(0, lastFilled)]?.focus();
    submitCode(nextCode);
  }

  return (
    <div className="auth-body">
      <div className="auth-hero">
        <Image
          src="/logo-gold.png"
          alt="CAP Games"
          width={200}
          height={200}
          className="auth-logo"
          priority
        />
        <Wordmark size={56} />
      </div>

      <div className="auth-form">
        {stage === "email" && (
          <>
            <p className="auth-sub">
              Connecte-toi avec ton e-mail pro pour rejoindre ton équipe,
              buzzer, voter et récupérer les photos de la soirée.
            </p>

            <div className="auth-field">
              <div className="auth-field-icon">
                <Icon.Mail />
              </div>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="prenom.nom@capvision.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary auth-cta"
              onClick={sendOtp}
              disabled={!valid || isPending}
            >
              {isPending
                ? "Veuillez patienter…"
                : bypassOtp
                  ? "Se connecter"
                  : "Recevoir le code"}
              <Icon.ArrowRight />
            </button>

            <div className="auth-foot">
              <span className="t-mono">
                {bypassOtp
                  ? "Mode dev : connexion sans OTP."
                  : "Réservé aux collaborateurs."}
              </span>
            </div>
          </>
        )}

        {stage === "sent" && (
          <>
            <p className="auth-sub">
              On t&apos;a envoyé un code à{" "}
              <strong style={{ color: "var(--tertiary-glow)" }}>{email}</strong>
              . Saisis-le pour entrer dans la soirée.
            </p>

            <div className="auth-code">
              {code.map((c, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  value={c}
                  onChange={(e) => handleCodeChange(i, e.target.value.slice(-1))}
                  onPaste={(e) => handleCodePaste(e, i)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !c && i > 0) {
                      inputsRef.current[i - 1]?.focus();
                    }
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  disabled={isPending}
                />
              ))}
            </div>

            <button
              type="button"
              className="btn btn-ghost auth-cta"
              onClick={() => {
                setStage("email");
                setCode(Array(OTP_LEN).fill(""));
              }}
            >
              Changer d&apos;e-mail
            </button>

            <div className="auth-foot">
              <span className="t-mono">Réservé aux collaborateurs.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
