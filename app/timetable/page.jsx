"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Download, Moon, Sun, RefreshCw, Trash2, Palette } from "lucide-react";

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

  const [weeks, setWeeks] = useState(5);
  const [firstWeekType, setFirstWeekType] = useState("B");
  const [startDate, setStartDate] = useState("2025-11-17");
  const [mergeMulti, setMergeMulti] = useState(true);

  const [subjectColors, setSubjectColors] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("subjectColors")) || {};
    } catch {
      return {};
    }
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference on mount
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
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

      // Split by tab or 2+ spaces to handle copy-paste variations
      const parts = raw.split(/\t|\s{2,}/).map((x) => x.trim()).filter(Boolean);

      if (parts.length >= 5) {
        // Sometimes the period might be split if it has spaces, but usually it's the first item
        // We assume standard format: Period, Subject, Class, Teacher, Room
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
          // Normalize strings for comparison to avoid split blocks due to whitespace
          const sameSubject = buf && buf.subject.trim() === r.subject.trim();
          const sameCode = buf && buf.code.trim() === r.code.trim();
          const sameTeacher = buf && buf.teacher.trim() === r.teacher.trim();
          const sameRoom = buf && buf.room.trim() === r.room.trim();

          if (sameSubject && sameCode && sameTeacher && sameRoom) {
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
      // Determine week type based on start week and current cycle index
      const isEven = c % 2 === 0;
      const W = isEven ? firstWeekType : (firstWeekType === "A" ? "B" : "A");

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
    <div className="min-h-screen p-6 md:p-12 flex items-center justify-center">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column: Input & Settings */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                Timetable Generator
              </h1>
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Paste Timetable Data
                </label>
                <textarea
                  className="input-field h-48 font-mono text-xs resize-none"
                  placeholder="Paste your timetable text here..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={importTT} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <RefreshCw size={18} /> Import
                </button>
                <button
                  onClick={() => { setRawText(""); setTimetable(null); }}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Clear
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar size={20} /> Configuration
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 uppercase">Start Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 uppercase">First Week</label>
                <select
                  className="input-field"
                  value={firstWeekType}
                  onChange={(e) => setFirstWeekType(e.target.value)}
                >
                  <option value="A">Week A</option>
                  <option value="B">Week B</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 uppercase">Duration (Weeks)</label>
                <input
                  type="number"
                  className="input-field"
                  value={weeks}
                  min={1}
                  max={52}
                  onChange={(e) => setWeeks(+e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500 uppercase">Event Mode</label>
                <select
                  className="input-field"
                  value={mergeMulti ? "merged" : "per"}
                  onChange={(e) => setMergeMulti(e.target.value === "merged")}
                >
                  <option value="merged">Merge Blocks</option>
                  <option value="per">Individual Periods</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Colors */}
        <div className="space-y-6">
          {timetable ? (
            <>
              <div className="glass-panel rounded-2xl p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Palette size={20} /> Subject Colors
                </h2>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {subjects.map((s) => (
                    <div key={s} className="flex items-center justify-between group">
                      <span className="text-sm truncate max-w-[150px]" title={s}>{s}</span>
                      <div className="flex items-center gap-1">
                        {GOOGLE_COLORS.slice(0, 5).map((c) => (
                          <button
                            key={c.hex}
                            className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${subjectColors[s] === c.hex ? "ring-2 ring-offset-2 ring-indigo-500" : ""}`}
                            style={{ backgroundColor: c.hex }}
                            onClick={() => setSubjectColors((prev) => ({ ...prev, [s]: c.hex }))}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Preview</h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">
                    {Object.keys(timetable.A).length + Object.keys(timetable.B).length} Days Loaded
                  </span>
                </div>

                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {["A", "B"].map((W) => (
                    <div key={W} className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur py-2">Week {W}</h3>
                      {Object.keys(timetable[W]).map((d) => (
                        <div key={d} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-medium mb-2">{d}</h4>
                          <div className="space-y-2">
                            {timetable[W][d].map((b, i) => (
                              <div key={i} className="text-xs p-2 rounded bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                                <div>
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{b.subject}</span>
                                  <span className="text-gray-500 ml-2">({b.code})</span>
                                </div>
                                <div className="text-right text-gray-400">
                                  <div>{b.periods.join(", ")}</div>
                                  <div>{b.room}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={download} className="btn-primary w-full flex items-center justify-center gap-2">
                    <Download size={20} /> Download ICS File
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px] text-gray-400">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">No Timetable Loaded</p>
              <p className="text-sm mt-2 max-w-xs">Paste your timetable data on the left and click Import to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}