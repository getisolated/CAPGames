import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon, RoomIcon } from "@/components/cap/icons";
import { ActionForm } from "@/components/cap/action-form";
import { roomColor } from "@/lib/room-style";
import type { QuizRoom } from "@/lib/supabase/types";
import { createRoom, deleteRoom, setRoomStatus } from "./actions";
import { RoomStylePicker } from "./room-style-picker";

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
          className="flex gap-2"
        >
          <Input name="name" placeholder="Nom du salon" required />
          <input type="hidden" name="color" value="ember" />
          <input type="hidden" name="icon" value="buzzer" />
          <Button type="submit">Créer</Button>
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
          Couleur et icône modifiables après création.
        </p>
      </section>

      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Salons</div>
          {rooms && <span className="ad-section-sub">{rooms.length} AU TOTAL</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {((rooms ?? []) as QuizRoom[]).map((room) => {
            const color = roomColor(room.color);
            return (
              <div key={room.id} className="card" style={{ padding: "14px 16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      background: color,
                      color: "oklch(98% 0.01 60)",
                      flexShrink: 0,
                    }}
                  >
                    <RoomIcon iconKey={room.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{room.name}</div>
                    <span
                      className={
                        "chip " +
                        (room.status === "open"
                          ? "live"
                          : room.status === "closed"
                            ? "gold"
                            : "")
                      }
                      style={{ marginTop: 4 }}
                    >
                      {room.status}
                    </span>
                  </div>
                  <Link href={`/admin/quizz/${room.id}`}>
                    <Button size="sm">Animer</Button>
                  </Link>
                  {room.status !== "open" && (
                    <ActionForm action={setRoomStatus} successMsg={null}>
                      <input type="hidden" name="id" value={room.id} />
                      <input type="hidden" name="status" value="open" />
                      <Button size="sm" variant="secondary">Ouvrir</Button>
                    </ActionForm>
                  )}
                  {room.status === "open" && (
                    <ActionForm action={setRoomStatus} successMsg={null}>
                      <input type="hidden" name="id" value={room.id} />
                      <input type="hidden" name="status" value="closed" />
                      <Button size="sm" variant="secondary">Fermer</Button>
                    </ActionForm>
                  )}
                  <ActionForm action={deleteRoom} successMsg="Salon supprimé.">
                    <input type="hidden" name="id" value={room.id} />
                    <Button size="sm" variant="destructive" aria-label="Supprimer">
                      <Icon.X />
                    </Button>
                  </ActionForm>
                </div>
                <RoomStylePicker
                  roomId={room.id}
                  currentColor={room.color}
                  currentIcon={room.icon}
                  compact
                />
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
