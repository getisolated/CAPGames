// CAP Games — Leaderboard + Polls
const { useState: useStateL, useMemo: useMemoL } = React;

function LeaderboardView({ teams, myTeamId }) {
  return (
    <div className="lb-wrap">
      <div className="lb-podium">
        {[teams[1], teams[0], teams[2]].map((t, i) => {
          if (!t) return <div key={i}/>;
          const rank = teams.indexOf(t) + 1;
          const heights = { 1: 100, 2: 70, 3: 50 };
          return (
            <div key={t.id} className={"lb-podium-col rank-" + rank}>
              <div className="lb-podium-avatar" style={{ background: t.color }}>
                <span className="t-display">{t.short}</span>
                {rank === 1 && <div className="lb-podium-crown">★</div>}
              </div>
              <div className="lb-podium-name">{t.name.replace(/^Équipe\s+/i, "")}</div>
              <div className="lb-podium-score t-display">{t.score}</div>
              <div className="lb-podium-bar" style={{ height: heights[rank] }}>
                <div className="lb-podium-rank t-display">{rank}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lb-list">
        {teams.map((t, i) => (
          <div key={t.id} className={"lb-row" + (t.id === myTeamId ? " mine" : "")}>
            <div className="lb-rank t-display">{String(i + 1).padStart(2, "0")}</div>
            <div className="lb-avatar" style={{ background: t.color }}>{t.short}</div>
            <div className="lb-name-col">
              <div className="lb-name">{t.name}</div>
              <div className="lb-trend">
                <span className={"trend " + t.trend}>
                  {t.trend === "up" ? "▲" : t.trend === "down" ? "▼" : "—"} {Math.abs(t.delta)}
                </span>
                <span className="t-mono">·</span>
                <span className="t-mono lb-buzz">{t.buzzes} buzz</span>
              </div>
            </div>
            <div className="lb-score t-display">{t.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PollsView({ teams, myTeamId, isAdmin }) {
  const [openPollId, setOpenPollId] = useStateL(null);
  const [selections, setSelections] = useStateL({}); // pollId -> optionId (draft choice, can change)
  const [validated, setValidated] = useStateL({});   // pollId -> optionId (locked once validated)

  const polls = useMemoL(() => ([
    {
      id: "style",
      title: "L'équipe la plus stylée",
      question: "Qui a réussi le total look ?",
      eyebrow: "SONDAGE EN COURS",
      timeLeft: "02:14",
      status: "open",
      kind: "text",
      options: teams.map(t => ({
        id: t.id,
        label: t.name,
        sub: t.pollBlurb,
        votes: t.pollVotes,
        color: t.color,
        teamId: t.id,
      })),
    },
    {
      id: "moment",
      title: "Le meilleur moment",
      question: "Quelle photo capture la soirée ?",
      eyebrow: "PROCHAIN VOTE",
      timeLeft: "05:30",
      status: "open",
      kind: "mixed",
      options: [
        { id: "podium",  label: "Le podium karaoké",  sub: "21:48 · Salle B",       votes: 23, img: "linear-gradient(140deg, oklch(58% 0.2 28), oklch(28% 0.12 350))" },
        { id: "dj",      label: "Le drop du DJ",       sub: "22:14 · Main floor",    votes: 41, img: "linear-gradient(140deg, oklch(56% 0.18 280), oklch(20% 0.06 280))" },
        { id: "cocktail",label: "Le shaker en feu",    sub: "20:32 · Bar central",   votes: 17, img: "linear-gradient(140deg, oklch(68% 0.15 60), oklch(30% 0.08 30))" },
        { id: "selfie",  label: "Le selfie d'équipe",  sub: "21:05 · Photobooth",    votes: 35, img: "linear-gradient(140deg, oklch(60% 0.16 340), oklch(22% 0.08 320))" },
      ],
    },
    {
      id: "track",
      title: "Le morceau du set",
      question: "Quel track a fait vibrer la piste ?",
      eyebrow: "VOTE OUVERT",
      timeLeft: "08:00",
      status: "open",
      kind: "text",
      options: [
        { id: "t1", label: "Track A", sub: "House · 124 BPM",      votes: 12 },
        { id: "t2", label: "Track B", sub: "Disco · 118 BPM",      votes: 28 },
        { id: "t3", label: "Track C", sub: "Afro-house · 122 BPM", votes: 19 },
        { id: "t4", label: "Track D", sub: "French touch · 120 BPM", votes: 9 },
      ],
    },
    {
      id: "closed",
      title: "L'apéro de l'année",
      question: "Quel cocktail prendre la prochaine fois ?",
      eyebrow: "VOTE CLOS",
      timeLeft: null,
      status: "closed",
      kind: "image",
      options: [
        { id: "c1", label: "Spritz braise",  votes: 47, img: "linear-gradient(140deg, oklch(70% 0.18 45), oklch(35% 0.12 30))" },
        { id: "c2", label: "Or martini",     votes: 31, img: "linear-gradient(140deg, oklch(74% 0.13 80), oklch(40% 0.08 70))" },
        { id: "c3", label: "Nuit negroni",   votes: 22, img: "linear-gradient(140deg, oklch(45% 0.12 280), oklch(20% 0.06 280))" },
      ],
    },
  ]), [teams]);

  const openPoll = polls.find(p => p.id === openPollId);

  if (openPoll) {
    const pid = openPoll.id;
    return (
      <PollDetail
        poll={openPoll}
        myTeamId={myTeamId}
        isAdmin={isAdmin}
        selected={selections[pid] || null}
        validated={validated[pid] || null}
        onSelect={(optId) => {
          if (validated[pid]) return; // locked
          setSelections(s => ({ ...s, [pid]: s[pid] === optId ? null : optId }));
        }}
        onValidate={() => {
          const sel = selections[pid];
          if (!sel || validated[pid]) return;
          setValidated(v => ({ ...v, [pid]: sel }));
        }}
        onBack={() => setOpenPollId(null)}
      />
    );
  }

  return (
    <div className="pl-wrap">
      <div className="pl-head">
        <div className="t-eyebrow">SONDAGES DE LA SOIRÉE</div>
        <h2 className="pl-title t-display">
          À toi de<br/><span className="t-serif-it">choisir.</span>
        </h2>
        <div className="pl-meta t-mono">{polls.filter(p => p.status === "open").length} OUVERTS · {polls.filter(p => validated[p.id]).length} VOTÉS</div>
      </div>

      <div className="pl-list">
        {polls.map(p => {
          const myVote = validated[p.id];
          const totalVotes = p.options.reduce((s, o) => s + o.votes, 0) + (myVote ? 1 : 0);
          return (
            <button
              key={p.id}
              className={"pl-poll" + (p.status === "closed" ? " is-closed" : "") + (myVote ? " is-voted" : "")}
              onClick={() => setOpenPollId(p.id)}
            >
              <div className="pl-poll-thumbs" aria-hidden>
                {p.options.slice(0, 4).map((o, i) => (
                  <span
                    key={i}
                    className={"pl-poll-thumb" + (o.img ? " has-img" : "")}
                    style={{ background: o.img || `linear-gradient(140deg, ${o.color || "oklch(40% 0.1 30)"}, oklch(18% 0.04 30))` }}
                  >
                    {!o.img && <em className="t-display">{(o.label || "").slice(0, 2).toUpperCase()}</em>}
                  </span>
                ))}
              </div>
              <div className="pl-poll-body">
                <div className="pl-poll-row">
                  <span className={"chip " + (p.status === "closed" ? "gold" : (myVote ? "gold" : "live"))}>
                    {p.status === "closed" ? "CLOS" : (myVote ? "VOTÉ" : "OUVERT")}
                  </span>
                  <span className="t-mono pl-poll-time">
                    {p.timeLeft ? `${p.timeLeft} RESTANT` : "RÉSULTATS"}
                  </span>
                </div>
                <div className="pl-poll-title">{p.title}</div>
                <div className="pl-poll-q">{p.question}</div>
                <div className="pl-poll-foot">
                  <span className="t-mono">{isAdmin || p.status === "closed" ? `${totalVotes} VOTES` : (myVote ? "MERCI POUR TON VOTE" : "TON VOTE COMPTE")}</span>
                  <span className="pl-poll-arrow">
                    <Icon.ArrowRight/>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PollDetail({ poll, myTeamId, isAdmin, selected, validated, onSelect, onValidate, onBack }) {
  const closed = poll.status === "closed";
  const isLocked = !!validated; // user has confirmed → can't change
  const showResults = isAdmin || closed; // percentages: admin always sees them; players never see them on open polls
  const myChoice = validated || selected; // what's highlighted as my pick
  const totalVotes = poll.options.reduce((s, o) => s + o.votes + (validated === o.id ? 1 : 0), 0);

  return (
    <div className="pl-wrap pl-detail">
      <button className="pl-back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7"/>
        </svg>
        <span className="t-mono">SONDAGES</span>
      </button>

      <div className="pl-head">
        <div className="t-eyebrow">
          {poll.eyebrow}{poll.timeLeft ? ` · ${poll.timeLeft} RESTANT` : ""}
          {isAdmin && <span className="pl-admin-tag"> · VUE ADMIN</span>}
        </div>
        <h2 className="pl-title t-display">
          {poll.title}
        </h2>
        <div className="pl-q t-serif-it">{poll.question}</div>
      </div>

      <div className="pl-cards">
        {poll.options.map(o => {
          const teamLocked = o.teamId && o.teamId === myTeamId;
          const isMine = myChoice === o.id;
          const liveVotes = o.votes + (validated === o.id ? 1 : 0);
          const pct = totalVotes ? Math.round((liveVotes / totalVotes) * 100) : 0;
          const hasImg = !!o.img;
          const cardDisabled = teamLocked || closed || isLocked;
          return (
            <button
              key={o.id}
              className={
                "pl-card" +
                (hasImg && o.sub ? " pl-card--mixed" : "") +
                (hasImg && !o.sub ? " pl-card--image" : "") +
                (!hasImg ? " pl-card--text" : "") +
                (teamLocked ? " locked" : "") +
                (isMine ? " voted" : "") +
                (myChoice && !isMine ? " dimmed" : "") +
                (closed ? " closed" : "") +
                (isLocked && !isMine ? " is-final" : "")
              }
              disabled={cardDisabled}
              onClick={() => !cardDisabled && onSelect(o.id)}
            >
              {hasImg && (
                <div className="pl-card-img" style={{ background: o.img }}>
                  {!o.sub && <span className="pl-card-img-label t-display">{o.label}</span>}
                  {teamLocked && (
                    <div className="pl-card-lock">
                      <Icon.Lock/>
                      <span className="t-mono">TON ÉQUIPE</span>
                    </div>
                  )}
                </div>
              )}
              {!hasImg && (
                <div className="pl-card-img pl-card-img--mini" style={{ background: o.color ? `linear-gradient(150deg, ${o.color}, oklch(15% 0.04 30))` : "linear-gradient(150deg, oklch(40% 0.1 30), oklch(15% 0.04 30))" }}>
                  <span className="pl-card-emoji t-display">{(o.label || "").replace(/^Équipe\s+/i, "").slice(0, 2).toUpperCase()}</span>
                  {teamLocked && (
                    <div className="pl-card-lock">
                      <Icon.Lock/>
                      <span className="t-mono">TON ÉQUIPE</span>
                    </div>
                  )}
                </div>
              )}
              {(o.sub || !hasImg) && (
                <div className="pl-card-body">
                  <div className="pl-card-name">{o.label}</div>
                  {o.sub && <div className="pl-card-blurb">{o.sub}</div>}
                  {showResults ? (
                    <div className="pl-card-bar">
                      <div className="pl-card-bar-fill" style={{ width: pct + "%", background: o.color || "var(--tertiary)" }}/>
                      <div className="pl-card-bar-pct t-mono">{pct}% · {liveVotes}</div>
                    </div>
                  ) : (
                    <div className="pl-card-cta t-mono">
                      {teamLocked ? "INTERDIT" : (isLocked ? (isMine ? "TON CHOIX" : "VOTE VERROUILLÉ") : (isMine ? "SÉLECTIONNÉ" : "TOUCHE POUR CHOISIR"))}
                    </div>
                  )}
                </div>
              )}
              {!o.sub && hasImg && showResults && (
                <div className="pl-card-bar pl-card-bar--floating">
                  <div className="pl-card-bar-fill" style={{ width: pct + "%", background: o.color || "var(--tertiary)" }}/>
                  <div className="pl-card-bar-pct t-mono">{pct}% · {liveVotes}</div>
                </div>
              )}
              {isMine && (
                <div className="pl-card-checkmark">
                  <Icon.Check/>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!closed && (
        <div className="pl-validate">
          {isLocked ? (
            <div className="pl-validated">
              <span className="pl-validated-check">
                <Icon.Check/>
              </span>
              <div className="pl-validated-text">
                <div className="t-mono pl-validated-eyebrow">VOTE VALIDÉ</div>
                <div className="pl-validated-name">{poll.options.find(o => o.id === validated)?.label}</div>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary pl-validate-cta"
              onClick={onValidate}
              disabled={!selected}
              style={{ opacity: selected ? 1 : 0.45, cursor: selected ? "pointer" : "not-allowed" }}
            >
              {selected ? "Valider mon vote" : "Choisis une option"}
              {selected && <Icon.ArrowRight/>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LeaderboardScreen({ teams, myTeamId, isAdmin }) {
  const [tab, setTab] = useStateL("scores"); // scores | polls

  return (
    <div className="screen scores-screen">
      <StatusBar/>

      <div className="lb-head">
        <div>
          <div className="t-eyebrow">CLASSEMENT GÉNÉRAL</div>
          <h1 className="lb-title t-display">
            Le tableau<br/><span className="t-serif-it">d'honneur.</span>
          </h1>
        </div>
        <span className="chip live">MAJ 21:54</span>
      </div>

      <div className="lb-tabs">
        <button className={"lb-tab" + (tab === "scores" ? " on" : "")} onClick={() => setTab("scores")}>
          Scores
        </button>
        <button className={"lb-tab" + (tab === "polls" ? " on" : "")} onClick={() => setTab("polls")}>
          Sondage
          <span className="lb-tab-dot"/>
        </button>
      </div>

      <div className="scroll-area">
        {tab === "scores" ? (
          <LeaderboardView teams={teams} myTeamId={myTeamId}/>
        ) : (
          <PollsView teams={teams} myTeamId={myTeamId} isAdmin={isAdmin}/>
        )}
      </div>
    </div>
  );
}

window.LeaderboardScreen = LeaderboardScreen;
