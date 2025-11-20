"use client";

import { useEffect, useMemo, useState } from "react";

/* Google Calendar colours */
const GOOGLE_COLORS = [
  { name: "Tomato", hex: "#d50000" },
  { name: "Flamingo", hex: "#db4437" },
  { name: "Tangerine", hex: "#f4b400" },
  { name: "Banana", hex: "#fbc02d" },
  { name: "Sage", hex: "#0f9d58" },
  { name: "Basil", hex: "#0b8043" },
  { name: "Peacock", hex: "#039be5" },
  { name: "Blueberry", hex: "#4285f4" },
  { name: "Lavender", hex: "#5e35b1" },
  { name: "Grape", hex: "#8e24aa" },
];

const periodTimes = {
  P1: { start: 8 * 60 + 45, duration: 38 },
  P2: { start: 9 * 60 + 23, duration: 39 },
  P3b: { start: 10 * 60 + 32, duration: 40 },
  P4: { start: 11 * 60 + 12, duration: 37 },
  P5: { start: 11 * 60 + 49, duration: 40 },
  P6b: { start: 12 * 60 + 59, duration: 38 },
  P7: { start: 13 * 60 + 37, duration: 40 },
  P8: { start: 14 * 60 + 17, duration: 40 },
  P8_Pause: { start: 14 * 60 + 17, duration: 29 },
};

const pad = (n) => String(n).padStart(2, "0");
const fmt = (min) => `${pad(Math.floor(min / 60))}${pad(min % 60)}`;

const fmtICS = (d) =>
  d.getFullYear() +
  pad(d.getMonth() + 1) +
  pad(d.getDate()) +
  "T" +
  pad(d.getHours()) +
  pad(d.getMinutes()) +
  pad(d.getSeconds());

export default function Page() {
  const [rawText, setRawText] = useState("");
  const [timetable, setTimetable] = useState(null);
  const [error, setError] = useState("");

  const [weeks, setWeeks] = useState(4);
  const [firstWeekType, setFirstWeekType] = useState("A");
  const [startDate, setStartDate] = useState("2025-11-17");
  const [mergeMulti, setMergeMulti] = useState(true);

  const [subjectColors, setSubjectColors] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("subjectColors")) || {};
    } catch {
      return {};
    }
  });

  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem("subjectColors", JSON.stringify(subjectColors));
  }, [subjectColors]);

  function parse(text) {
    const lines = text.split(/\r?\n/);
    const data = { A: {}, B: {} };

    let week = null;
    let day = null;

    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const weekMatch = trimmed.match(/^Week\s*([AB])\b/i);
      if (weekMatch) {
        week = weekMatch[1].toUpperCase();
        day = null;
        continue;
      }

      const dayMatch = trimmed.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday)$/i);
      if (dayMatch) {
        day = dayMatch[1];
        if (!week) week = "A";
        data[week][day] = data[week][day] || [];
        continue;
      }

      const parts = raw.split("\t").map((x) => x.trim()).filter(Boolean);
      if (parts.length >= 5) {
        const [period, subject, code, teacher, room] = parts;
        if (!week) week = "A";
        if (!day) day = "Monday";

        data[week][day] = data[week][day] || [];
        data[week][day].push({
          period,
          subject,
          code,
          teacher,
          room,
        });
      }
    }

    // merge multi-blocks
    for (const w of ["A", "B"]) {
      for (const d of Object.keys(data[w])) {
        const rows = data[w][d];
        const merged = [];
        let buf = null;

        for (const r of rows) {
          if (
            buf &&
            buf.subject === r.subject &&
            buf.code === r.code &&
            buf.teacher === r.teacher &&
            buf.room === r.room
          ) {
            buf.periods.push(r.period);
          } else {
            if (buf) merged.push(buf);
            buf = { ...r, periods: [r.period] };
          }
        }
        if (buf) merged.push(buf);
        data[w][d] = merged;
      }
    }

    return data;
  }

  function importTT() {
    try {
      const p = parse(rawText);
      setTimetable(p);
      setError("");
    } catch (e) {
      setError("Failed to parse.");
    }
  }

  const dayIndex = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };

  function getTimes(periods, isPause) {
    const first = periods[0];
    const last = periods[periods.length - 1];

    const sMin = periodTimes[first].start;
    const eMin = isPause
      ? periodTimes["P8_Pause"].start + periodTimes["P8_Pause"].duration
      : periodTimes[last].start + periodTimes[last].duration;

    return { sMin, eMin };
  }

  function generateICS(tt) {
    const base = new Date(startDate);
    base.setHours(0, 0, 0, 0);

    let events = [];

    for (let c = 0; c < weeks; c++) {
      const W = c % 2 === 0 ? "A" : "B";
      for (const day of Object.keys(tt?.[W] || {})) {
        const blocks = tt[W][day];
        const offset = c * 7 + (dayIndex[day] || 0);

        const d0 = new Date(base.getTime() + offset * 86400000);

        for (const b of blocks) {
          const isPause = /pause/i.test(b.subject);

          if (mergeMulti) {
            const { sMin, eMin } = getTimes(b.periods, isPause);
            const s = new Date(d0); s.setHours(sMin / 60 | 0, sMin % 60, 0);
            const e = new Date(d0); e.setHours(eMin / 60 | 0, eMin % 60, 0);

            events.push({
              s,
              e,
              subject: b.subject,
              code: b.code,
              teacher: b.teacher,
              room: b.room,
              periods: b.periods.join(", "),
              color: subjectColors[b.subject] || "",
              week: W,
            });
          } else {
            for (const p of b.periods) {
              const { sMin, eMin } = getTimes([p], isPause);
              const s = new Date(d0); s.setHours(sMin / 60 | 0, sMin % 60, 0);
              const e = new Date(d0); e.setHours(eMin / 60 | 0, eMin % 60, 0);

              events.push({
                s,
                e,
                subject: b.subject,
                code: b.code,
                teacher: b.teacher,
                room: b.room,
                periods: p,
                color: subjectColors[b.subject] || "",
                week: W,
              });
            }
          }
        }
      }
    }

    let out =
      "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Timetable//EN\nCALSCALE:GREGORIAN\n";

    events.forEach((ev, i) => {
      out += "BEGIN:VEVENT\n";
      out += `UID:${i}-${Date.now()}\n`;
      out += `SUMMARY:${ev.subject} (${ev.code})\n`;
      out += `DTSTART:${fmtICS(ev.s)}\n`;
      out += `DTEND:${fmtICS(ev.e)}\n`;
      out += `LOCATION:${ev.room}\n`;
      if (ev.color) out += `X-COLOR:${ev.color}\n`;
      out += `DESCRIPTION:Teacher: ${ev.teacher}\\nPeriods: ${ev.periods}\\nWeek: ${ev.week}\n`;
      out += "END:VEVENT\n";
    });

    out += "END:VCALENDAR\n";
    return out;
  }

  const subjects = useMemo(() => {
    if (!timetable) return [];
    const S = new Set();
    for (const W of ["A", "B"]) {
      for (const d of Object.keys(timetable[W] || {})) {
        for (const b of timetable[W][d]) S.add(b.subject);
      }
    }
    return [...S].sort();
  }, [timetable]);

  function download() {
    const ics = generateICS(timetable);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timetable.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Timetable → ICS</h1>
        <button className="secondary" onClick={() => setIsDark((s) => !s)}>
          {isDark ? "Light" : "Dark"}
        </button>
      </div>

      <div className="card">
        <label>Paste your timetable (tab-separated)</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <button className="primary" onClick={importTT}>Import</button>
          <button className="secondary" onClick={() => { setRawText(""); setTimetable(null); }}>Clear</button>
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <div className="grid grid-3" style={{ marginTop: "24px" }}>
          <div>
            <label>Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div>
            <label>First Week</label>
            <select value={firstWeekType} onChange={(e)=>setFirstWeekType(e.target.value)}>
              <option>A</option><option>B</option>
            </select>
          </div>

          <div>
            <label>Week cycles</label>
            <input type="number" value={weeks} min={1} max={52} onChange={(e) => setWeeks(+e.target.value)} />
          </div>

          <div>
            <label>Event mode</label>
            <select value={mergeMulti ? "merged" : "per"} onChange={(e) => setMergeMulti(e.target.value === "merged")}>
              <option value="merged">Merge multi-period</option>
              <option value="per">Individual per period</option>
            </select>
          </div>
        </div>

        <h3 style={{ marginTop: "30px" }}>Subject colours</h3>
        {!timetable && <p style={{ fontSize: "14px" }}>Import timetable to see subjects.</p>}

        {timetable && (
          <div className="grid grid-1" style={{ marginTop: "12px" }}>
            {subjects.map((s) => (
              <div key={s} style={{ marginBottom: "10px" }}>
                <div style={{ marginBottom: "4px" }}>{s}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {GOOGLE_COLORS.map((c) => (
                    <div
                      key={c.hex}
                      className={`color-swatch ${subjectColors[s] === c.hex ? "color-selected" : ""}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() =>
                        setSubjectColors((prev) => ({ ...prev, [s]: c.hex }))
                      }
                    />
                  ))}
                  <button
                    className="secondary"
                    style={{ padding: "4px 8px" }}
                    onClick={() => {
                      const copy = { ...subjectColors };
                      delete copy[s];
                      setSubjectColors(copy);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ marginTop: "30px" }}>Preview</h3>
        <div className="preview-box">
          {!timetable && <p>No timetable imported</p>}
          {timetable && ["A", "B"].map((W) => (
            <div key={W}>
              <strong>Week {W}</strong>
              {Object.keys(timetable[W]).map((d) => (
                <div key={d} style={{ marginLeft: "10px", marginTop: "4px" }}>
                  <strong>{d}</strong>
                  <ul>
                    {timetable[W][d].map((b, i) => (
                      <li key={i}>
                        {b.periods.join(", ")} — {b.subject} ({b.code})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button className="primary" disabled={!timetable} onClick={download}>
            Download ICS
          </button>
          <button className="secondary" onClick={() => { setTimetable(null); }}>
            Reset
          </button>
        </div>
      </div>

    </div>
  );
}