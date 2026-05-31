"use client";

import { useTransition, type FormHTMLAttributes, type ReactNode } from "react";
import { toast } from "sonner";

type ActionResult = { ok: boolean; error?: string };

type Props = Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: (fd: FormData) => Promise<ActionResult>;
  /** Message toast affiché en cas de succès. null ou "" → pas de toast. */
  successMsg?: string | null;
  /** Reset le formulaire en cas de succès. Par défaut true pour les forms d'ajout. */
  resetOnSuccess?: boolean;
  children: ReactNode;
};

/**
 * Wrap un <form action={serverAction}> pour afficher automatiquement
 * les erreurs via toast et garder le bouton désactivé pendant la requête.
 */
export function ActionForm({
  action,
  successMsg,
  resetOnSuccess = false,
  children,
  ...formProps
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      {...formProps}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        startTransition(async () => {
          const res = await action(fd);
          if (!res.ok) {
            toast.error(res.error ?? "Erreur");
            return;
          }
          if (successMsg !== null) {
            toast.success(successMsg ?? "OK");
          }
          if (resetOnSuccess) form.reset();
        });
      }}
    >
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>
        {children}
      </fieldset>
    </form>
  );
}
