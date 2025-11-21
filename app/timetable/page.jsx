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
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem("subjectColors");
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Failed to load subject colors:", error);
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
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("subjectColors", JSON.stringify(subjectColors));
    } catch (error) {
      console.error("Failed to save subject colors:", error);
    }
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
    if (!rawText.trim()) {
      setError("Please enter timetable data before importing.");
      return;
    }

    try {
      const p = parse(rawText);
      const hasData = Object.keys(p.A).length > 0 || Object.keys(p.B).length > 0;

      if (!hasData) {
        setError("No valid timetable data found. Please check your input format.");
        return;
      }

      setTimetable(p);
      setError("");
    } catch (error) {
      console.error("Parse error:", error);
      setError(`Failed to parse timetable: ${error.message || "Unknown error"}`);
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
    if (!timetable) return;

    try {
      const ics = generateICS(timetable);
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      // Create descriptive filename with date range
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (weeks * 7));
      const filename = `timetable_${startDate}_${weeks}weeks.ics`;

      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      setError("Failed to generate calendar file. Please try again.");
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center relative z-10">
      <div className="glass-card w-full max-w-6xl overflow-hidden flex flex-col lg:flex-row">

        {/* Left Column: Input & Settings */}
        <div className="w-full lg:w-5/12 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                <Calendar size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                Timetable
              </h1>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Raw Data
              </label>
              <textarea
                className="input-field h-40 font-mono text-xs resize-none"
                placeholder="Paste your timetable text here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={importTT}
                className="btn-primary flex items-center justify-center gap-2 w-full"
                disabled={!rawText.trim()}
                aria-label="Import timetable data"
              >
                <RefreshCw size={16} /> Import
              </button>
              <button
                onClick={() => { setRawText(""); setTimetable(null); setError(""); }}
                className="btn-secondary flex items-center justify-center gap-2 w-full"
                disabled={!rawText && !timetable}
                aria-label="Clear all data"
              >
                <Trash2 size={16} /> Clear
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Configuration
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-400">START DATE</label>
                  <input
                    type="date"
                    className="input-field py-1.5"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-400">FIRST WEEK</label>
                  <select
                    className="input-field py-1.5"
                    value={firstWeekType}
                    onChange={(e) => setFirstWeekType(e.target.value)}
                  >
                    <option value="A">Week A</option>
                    <option value="B">Week B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-400">WEEKS</label>
                  <input
                    type="number"
                    className="input-field py-1.5"
                    value={weeks}
                    min={1}
                    max={52}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (val >= 1 && val <= 52) setWeeks(val);
                    }}
                    aria-label="Number of weeks to generate"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-400">MODE</label>
                  <select
                    className="input-field py-1.5"
                    value={mergeMulti ? "merged" : "per"}
                    onChange={(e) => setMergeMulti(e.target.value === "merged")}
                  >
                    <option value="merged">Merged</option>
                    <option value="per">Individual</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Colors */}
        <div className="w-full lg:w-7/12 p-6 md:p-8 bg-white dark:bg-gray-900">
          {timetable ? (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preview</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                    {Object.keys(timetable.A).length + Object.keys(timetable.B).length} Days
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Palette size={16} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subjects</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                  {subjects.map((s) => (
                    <div key={s} className="group relative">
                      <div
                        className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500 border border-transparent"
                        style={{
                          backgroundColor: subjectColors[s] ? `${subjectColors[s]}20` : 'rgba(128,128,128,0.1)',
                          color: subjectColors[s] || 'inherit',
                          borderColor: subjectColors[s] || 'transparent'
                        }}
                      >
                        {s}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex bg-white dark:bg-gray-800 shadow-xl rounded-lg p-2 gap-1 z-50 border border-gray-200 dark:border-gray-700">
                          {GOOGLE_COLORS.slice(0, 5).map((c) => (
                            <button
                              key={c.hex}
                              className="w-4 h-4 rounded-full hover:scale-110 transition-transform"
                              style={{ backgroundColor: c.hex }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubjectColors((prev) => ({ ...prev, [s]: c.hex }));
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 mb-6">
                <div className="space-y-8">
                  {["A", "B"].map((W) => (
                    <div key={W}>
                      <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur py-2 mb-3 border-b border-gray-100 dark:border-gray-800 z-10">
                        <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Week {W}</h3>
                      </div>
                      <div className="space-y-4">
                        {Object.keys(timetable[W]).map((d) => (
                          <div key={d} className="relative pl-4 border-l-2 border-gray-100 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                            <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">{d}</h4>
                            <div className="space-y-2">
                              {timetable[W][d].map((b, i) => (
                                <div key={i} className="group relative p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 transition-all hover:shadow-sm">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{b.subject}</div>
                                      <div className="text-xs text-gray-500 mt-0.5">{b.code} • {b.teacher}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">
                                        {b.periods.join(", ")}
                                      </div>
                                      <div className="text-[10px] text-gray-400 mt-1">{b.room}</div>
                                    </div>
                                  </div>
                                  {subjectColors[b.subject] && (
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                                      style={{ backgroundColor: subjectColors[b.subject] }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={download}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm uppercase tracking-wide"
                  disabled={!timetable}
                  aria-label="Download calendar file"
                >
                  <Download size={18} /> Download Calendar File
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <Calendar size={40} className="opacity-20" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready to Generate</h3>
              <p className="text-sm max-w-xs mx-auto leading-relaxed">
                Paste your timetable data on the left panel and click Import to visualize your schedule and export it to your calendar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}