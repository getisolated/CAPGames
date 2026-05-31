import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/cap/icons";
import {
  createRoom,
  deleteRoom,
  setRoomStatus,
} from "./actions";

async function submitCreateRoom(fd: FormData) {
  "use server";
  await createRoom(fd);
}
async function submitDeleteRoom(fd: FormData) {
  "use server";
  await deleteRoom(fd);
}
async function submitSetRoomStatus(fd: FormData) {
  "use server";
  await setRoomStatus(fd);
}

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
        <form action={submitCreateRoom} className="flex gap-2">
          <Input name="name" placeholder="Nom du salon" required />
          <Button type="submit">Créer</Button>
        </form>
      </section>

      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Salons</div>
          {rooms && <span className="ad-section-sub">{rooms.length} AU TOTAL</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(rooms ?? []).map((room) => (
            <div
              key={room.id}
              className="card"
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
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
                {room.status}
              </span>
              <span style={{ flex: 1, fontWeight: 600 }}>{room.name}</span>
              <Link href={`/admin/quizz/${room.id}`}>
                <Button size="sm">Animer</Button>
              </Link>
              {room.status !== "open" && (
                <form action={submitSetRoomStatus}>
                  <input type="hidden" name="id" value={room.id} />
                  <input type="hidden" name="status" value="open" />
                  <Button size="sm" variant="secondary">Ouvrir</Button>
                </form>
              )}
              {room.status === "open" && (
                <form action={submitSetRoomStatus}>
                  <input type="hidden" name="id" value={room.id} />
                  <input type="hidden" name="status" value="closed" />
                  <Button size="sm" variant="secondary">Fermer</Button>
                </form>
              )}
              <form action={submitDeleteRoom}>
                <input type="hidden" name="id" value={room.id} />
                <Button size="sm" variant="destructive" aria-label="Supprimer">
                  <Icon.X />
                </Button>
              </form>
            </div>
          ))}
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
