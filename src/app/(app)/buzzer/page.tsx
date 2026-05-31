import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon, RoomIcon } from "@/components/cap/icons";
import { roomColor } from "@/lib/room-style";
import type { QuizRoom } from "@/lib/supabase/types";

export default async function BuzzerListPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("quiz_rooms")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <div className="screen">
      <div className="lb-head">
        <div>
          <div className="t-eyebrow">Quizz · Salons ouverts</div>
          <h1 className="lb-title t-display">
            Choisis<br />
            <span className="t-serif-it">ton salon.</span>
          </h1>
        </div>
        {rooms && <span className="chip live">{rooms.length} OUVERT(S)</span>}
      </div>

      <div className="scroll-area">
        {!rooms || rooms.length === 0 ? (
          <div className="px-6">
            <div className="ad-empty card">
              <div className="t-display">Aucun salon ouvert</div>
              <div className="t-mono ad-empty-sub">
                L&apos;animateur n&apos;a pas encore ouvert de quizz.
              </div>
            </div>
          </div>
        ) : (
          <ul className="pl-list" style={{ padding: "0 22px" }}>
            {(rooms as QuizRoom[]).map((room) => {
              return (
                <li key={room.id}>
                  <Link
                    href={`/buzzer/${room.id}`}
                    className="pl-poll"
                    style={{ gridTemplateColumns: "auto 1fr auto", padding: "16px 18px", gap: 14 }}
                  >
                    <div
                      className="g-icon-btn"
                      style={{
                        width: 48,
                        height: 48,
                        background: roomColor(room.color),
                        color: "oklch(98% 0.01 60)",
                        border: 0,
                      }}
                    >
                      <RoomIcon iconKey={room.icon} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="pl-poll-title">{room.name}</div>
                      <div className="pl-poll-q">Touche pour entrer dans le salon</div>
                    </div>
                    <span className="pl-poll-arrow">
                      <Icon.ArrowRight />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
