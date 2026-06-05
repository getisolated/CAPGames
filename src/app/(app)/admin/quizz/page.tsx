import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/cap/icons";
import { ActionForm } from "@/components/cap/action-form";
import type { QuizRoom } from "@/lib/supabase/types";
import { createRoom, deleteRoom, setRoomStatus } from "./actions";
import { RoomStyleModal } from "./room-style-modal";
import { ModeRadio } from "./mode-radio";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  closed: "Fermé",
};

export default async function AdminQuizListPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("quiz_rooms")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 18 }}>
      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Créer un salon</div>
        </div>
        <ActionForm
          action={createRoom}
          successMsg="Salon créé."
          resetOnSuccess
          className="flex flex-col gap-2"
        >
          <Input name="name" placeholder="Nom du salon" required />
          <input type="hidden" name="color" value="ember" />
          <input type="hidden" name="icon" value="buzzer" />
          <ModeRadio />
          <Button type="submit" className="w-full">Créer</Button>
        </ActionForm>
        <p
          className="t-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--text-4)",
            marginTop: 6,
          }}
        >
          Mode buzzer : les équipes buzzent. Mode questions : vote sur des questions préparées.
        </p>
      </section>

      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Salons</div>
          {rooms && <span className="ad-section-sub">{rooms.length} AU TOTAL</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {((rooms ?? []) as QuizRoom[]).map((room) => {
            return (
              <div key={room.id} className="card" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <RoomStyleModal
                    roomId={room.id}
                    roomName={room.name}
                    currentColor={room.color}
                    currentIcon={room.icon}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{room.name}</div>
                  </div>
                </div>

                <div className="cg-actions">
                  <Link href={`/admin/quizz/${room.id}`}>
                    <Button className="w-full">
                      Éditer <Icon.ArrowRight />
                    </Button>
                  </Link>
                  {room.status !== "open" && (
                    <ActionForm action={setRoomStatus} successMsg={null}>
                      <input type="hidden" name="id" value={room.id} />
                      <input type="hidden" name="status" value="open" />
                      <Button variant="secondary" className="w-full">Ouvrir</Button>
                    </ActionForm>
                  )}
                  {room.status === "open" && (
                    <ActionForm action={setRoomStatus} successMsg={null}>
                      <input type="hidden" name="id" value={room.id} />
                      <input type="hidden" name="status" value="closed" />
                      <Button variant="secondary" className="w-full">Fermer</Button>
                    </ActionForm>
                  )}
                  <ActionForm action={deleteRoom} successMsg="Salon supprimé.">
                    <input type="hidden" name="id" value={room.id} />
                    <Button variant="destructive" className="w-full">
                      <Icon.X /> Supprimer
                    </Button>
                  </ActionForm>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className={
                      "chip " +
                      (room.status === "open"
                        ? "live"
                        : room.status === "closed"
                          ? "gold"
                          : "")
                    }
                  >
                    {STATUS_LABEL[room.status] ?? room.status}
                  </span>
                  <span className="chip">
                    {room.mode === "questions" ? "Questions" : "Buzzer"}
                  </span>
                </div>
              </div>
            );
          })}
          {(!rooms || rooms.length === 0) && (
            <div className="ad-empty card">
              <div className="t-display">Aucun salon</div>
              <div className="ad-empty-sub">Crée ton premier salon ci-dessus.</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
