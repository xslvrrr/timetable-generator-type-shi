"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * app/timetable/page.jsx
 *
 * - Paste-in timetable (tab separated)
 * - Parses Week A / Week B, days on separate lines, and lines like:
 *     P1\tStage 6 Physics Preliminary\tPPHY.B\tMr S Harrison\tG4
 * - Google Calendar colours + per-subject colour persistence
 * - Dark mode toggle (class on documentElement)
 * - ICS export using defined period times
 */

/* ---------- Google Calendar-ish palette ---------- */
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

/* ---------- Period times in minutes from midnight ---------- */
const periodTimes = {
  P1: { start: 8 * 60 + 45, duration: 38 },
  P2: { start: 9 * 60 + 23, duration: 39 },
  P3b: { start: 10 * 60 + 32, duration: 40 },
  P4: { start: 11 * 60 + 12, duration: 37 },
  P5: { start: 11 * 60 + 49, duration: 40 },
  P6b: { start: 12 * 60 + 59, duration: 38 },
  P7: { start: 13 * 60 + 37, duration: 40 },
  P8: { start: 14 * 60 + 17, duration: 40 },
  P8_Pause: { start: 14 * 60 + 17, duration: 29 }, // pause length variant
};

/* ---------- Helper formatting ---------- */
const pad2 = (n) => String(n).padStart(2, "0");
const formatTimeHM = (minutes) => `${pad2(Math.floor(minutes / 60))}${pad2(minutes % 60)}`;

/* Format local floating date/time for ICS (no 'Z', local time) */
const formatLocalICS = (d) => {
  return (
    d.getFullYear().toString() +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    "T" +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds())
  );
};

/* ---------- Page component ---------- */
export default function TimetablePage() {
  const [rawText, setRawText] = useState("");
  const [timetable, setTimetable] = useState(null); // structure: { A: { Monday: [{periods:[], subject, code, teacher, room}, ...] }, B: {...} }
  const [error, setError] = useState("");
  const [weeks, setWeeks] = useState(4); // number of week cycles
  const [startDate, setStartDate] = useState("2025-11-17"); // default 2025
  const [mergeMultiPeriod, setMergeMultiPeriod] = useState(true);

  // colour per subject persisted to localStorage
  const [subjectColors, setSubjectColors] = useState(() => {
    try {
      const raw = localStorage.getItem("subjectColors");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // theme persisted
  const [isDark, setIsDark] = useState(() => {
    try {
      const v = localStorage.getItem("theme");
      return v === "dark";
    } catch {
      return false;
    }
  });

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Persist subject colors when changed
  useEffect(() => {
    try {
      localStorage.setItem("subjectColors", JSON.stringify(subjectColors));
    } catch {}
  }, [subjectColors]);

  /* ---------- PARSER: robust for your tab-separated paste ---------- */
  function parseRawToTimetable(text) {
    setError("");
    if (!text || !text.trim()) {
      setError("No text to parse.");
      return;
    }

    // split into lines, preserve possible empty lines for readability — we'll ignore empties but keep ordering
    const rawLines = text.split(/\r?\n/);

    // result skeleton
    const result = { A: {}, B: {} };

    let currentWeek = null; // "A" or "B"
    let currentDay = null; // "Monday", etc.

    for (let rawLine of rawLines) {
      if (!rawLine) continue; // ignore empty

      const line = rawLine.trim();

      // Detect Week header even if the header line contains additional tab columns (like: "Week A\tPeriod\tCourse...")
      const weekMatch = line.match(/^Week\s*([AB])\b/i);
      if (weekMatch) {
        currentWeek = weekMatch[1].toUpperCase();
        currentDay = null;
        continue;
      }

      // Detect day header — they appear alone with no tabs in your input: "Monday"
      const dayMatch = line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday)$/i);
      if (dayMatch) {
        currentDay = dayMatch[1];
        if (!currentWeek) {
          // If day found before an explicit week header, assume Week A by default
          currentWeek = "A";
        }
        if (!result[currentWeek][currentDay]) result[currentWeek][currentDay] = [];
        continue;
      }

      // Attempt to parse a tab-separated period line
      // Your sample lines have leading indentation (a tab) before the period; split on tabs and filter empties.
      // Example: "\tP1\tStage 6 Physics Preliminary\tPPHY.B\tMr S Harrison\tG4"
      const parts = rawLine.split("\t").map((p) => p.trim()).filter(Boolean);

      // Expect at least 5 columns: period, subject, code, teacher, room
      if (parts.length >= 5) {
        const [periodRaw, subjectRaw, codeRaw, teacherRaw, roomRaw] = parts;
        // sanity checks
        const period = periodRaw.replace(/\s+/g, "");
        const subject = subjectRaw;
        const code = codeRaw;
        const teacher = teacherRaw;
        const room = roomRaw;

        if (!currentWeek) {
          // If we see period lines before a Week header, default to A
          currentWeek = "A";
        }
        if (!currentDay) {
          // If period lines appear with no day header, this is malformed; collect under "Monday" by default
          currentDay = "Monday";
          if (!result[currentWeek][currentDay]) result[currentWeek][currentDay] = [];
        }
        if (!result[currentWeek][currentDay]) result[currentWeek][currentDay] = [];

        result[currentWeek][currentDay].push({
          period,
          subject,
          code,
          teacher,
          room,
        });
      } else {
        // line didn't match anything useful — ignore but record if helpful
        // console.warn("Ignored line:", rawLine);
      }
    }

    // Now merge consecutive identical rows into multi-period blocks (subject+code+teacher match)
    for (const week of ["A", "B"]) {
      for (const day of Object.keys(result[week])) {
        const rows = result[week][day] || [];
        const grouped = [];
        let buffer = null;

        for (const row of rows) {
          if (!buffer) {
            buffer = {
              subject: row.subject,
              code: row.code,
              teacher: row.teacher,
              room: row.room,
              periods: [row.period],
            };
            continue;
          }

          if (
            buffer.subject === row.subject &&
            buffer.code === row.code &&
            buffer.teacher === row.teacher &&
            buffer.room === row.room
          ) {
            buffer.periods.push(row.period);
          } else {
            grouped.push(buffer);
            buffer = {
              subject: row.subject,
              code: row.code,
              teacher: row.teacher,
              room: row.room,
              periods: [row.period],
            };
          }
        }
        if (buffer) grouped.push(buffer);
        result[week][day] = grouped;
      }
    }

    return result;
  }

  /* ---------- ICS GENERATION ---------- */
  const getEventTimes = (periods, isPause = false) => {
    const first = periods[0];
    const last = periods[periods.length - 1];

    const startMinutes = periodTimes[first].start;
    let endMinutes;

    // pause special case: if it's Pause and includes P8, use P8_Pause
    if (isPause && periods.includes("P8")) {
      endMinutes = periodTimes["P8_Pause"].start + periodTimes["P8_Pause"].duration;
    } else {
      endMinutes = periodTimes[last].start + periodTimes[last].duration;
    }

    return { start: startMinutes, end: endMinutes };
  };

  function generateICSFromTimetable(tt) {
    if (!tt) return "";

    // base date
    const base = new Date(startDate);
    // ensure time portion cleared
    base.setHours(0, 0, 0, 0);

    const dayIndex = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };

    // create VEVENTs by iterating weeks and days
    const events = [];

    for (let cycle = 0; cycle < weeks; cycle++) {
      // alternate weeks: week 0 => A, week 1 => B, week 2 => A ...
      const weekType = cycle % 2 === 0 ? "A" : "B";

      for (const day of Object.keys(tt[weekType] || {})) {
        const blocks = tt[weekType][day];
        if (!blocks || blocks.length === 0) continue;

        const dayOffset = cycle * 7 + (dayIndex[day] ?? 0);
        const eventDate = new Date(base.getTime() + dayOffset * 24 * 60 * 60 * 1000);

        for (const block of blocks) {
          const eventIsPause = block.subject && /pause/i.test(block.subject);

          if (mergeMultiPeriod) {
            const { start: sMin, end: eMin } = getEventTimes(block.periods, eventIsPause);
            const startDt = new Date(eventDate);
            startDt.setHours(Math.floor(sMin / 60), sMin % 60, 0, 0);
            const endDt = new Date(eventDate);
            endDt.setHours(Math.floor(eMin / 60), eMin % 60, 0, 0);

            events.push({
              summary: `${block.subject} (${block.code})`,
              location: block.room,
              teacher: block.teacher,
              start: startDt,
              end: endDt,
              color: subjectColors[block.subject] || "",
              week: weekType,
              periods: block.periods.join(", "),
            });
          } else {
            // make separate events per period
            for (const p of block.periods) {
              const { start: sMin, end: eMin } = getEventTimes([p], eventIsPause);
              const startDt = new Date(eventDate);
              startDt.setHours(Math.floor(sMin / 60), sMin % 60, 0, 0);
              const endDt = new Date(eventDate);
              endDt.setHours(Math.floor(eMin / 60), eMin % 60, 0, 0);

              events.push({
                summary: `${block.subject} (${block.code})`,
                location: block.room,
                teacher: block.teacher,
                start: startDt,
                end: endDt,
                color: subjectColors[block.subject] || "",
                week: weekType,
                periods: p,
              });
            }
          }
        }
      }
    }

    // Build ICS content (local times, no timezone identifier; many calendar apps accept floating local times)
    let ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Timetable Generator//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ].join("\n") + "\n";

    events.forEach((ev, i) => {
      ics += "BEGIN:VEVENT\n";
      ics += `UID:timetable-${i}-${Date.now()}\n`;
      ics += `SUMMARY:${ev.summary}\n`;
      ics += `DTSTART:${formatLocalICS(ev.start)}\n`;
      ics += `DTEND:${formatLocalICS(ev.end)}\n`;
      ics += `LOCATION:${ev.location}\n`;
      // custom color property (many apps ignore it, but it's useful for exporting metadata)
      if (ev.color) ics += `X-COLOR:${ev.color}\n`;
      ics += `DESCRIPTION:Teacher: ${ev.teacher} \\nPeriods: ${ev.periods} \\nWeek: ${ev.week}\n`;
      ics += "STATUS:CONFIRMED\n";
      ics += "END:VEVENT\n";
    });

    ics += "END:VCALENDAR\n";
    return ics;
  }

  /* ---------- UI handlers ---------- */
  function handleImportClick() {
    try {
      const parsed = parseRawToTimetable(rawText);
      // If parsed object has no days (user error) -> show helpful message
      if (
        (!parsed.A || Object.keys(parsed.A).length === 0) &&
        (!parsed.B || Object.keys(parsed.B).length === 0)
      ) {
        setError("No Week A or Week B data detected. Please paste the timetable exactly as provided (with tabs).");
        setTimetable(null);
      } else {
        setTimetable(parsed);
        setError("");
      }
    } catch (e) {
      setError("Parsing failed: " + (e.message || e));
      setTimetable(null);
    }
  }

  function handleDownloadICS() {
    if (!timetable) {
      setError("No timetable loaded.");
      return;
    }
    const ics = generateICSFromTimetable(timetable);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "school_timetable.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // collect list of unique subjects for the colour picker grid
  const allSubjects = useMemo(() => {
    if (!timetable) return [];
    const set = new Set();
    for (const w of ["A", "B"]) {
      for (const d of Object.keys(timetable[w] || {})) {
        for (const b of timetable[w][d]) set.add(b.subject);
      }
    }
    return Array.from(set).sort();
  }, [timetable]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Timetable → ICS</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Paste tab-separated timetable (like your sample) and export an .ics file. Default start year: 2025.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark((s) => !s)}
              className="px-3 py-2 rounded border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </div>
        </header>

        {/* main card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border dark:border-gray-700 space-y-4">
          <label className="block font-medium">Paste timetable (tab-separated)</label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste the raw timetable here (including Week A / Week B headers)."
            className="w-full min-h-[220px] border p-3 rounded bg-gray-50 dark:bg-gray-700 dark:text-white"
          />

          <div className="flex gap-3">
            <button
              onClick={handleImportClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
            >
              Import Timetable
            </button>

            <button
              onClick={() => { setRawText(""); setTimetable(null); setError(""); }}
              className="px-4 py-2 border rounded"
            >
              Clear
            </button>
          </div>

          {error && <div className="text-red-500 mt-2">{error}</div>}

          {/* settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full p-2 rounded border bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Week cycles</label>
              <input
                type="number"
                min={1}
                max={52}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="mt-2 w-full p-2 rounded border bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Event mode</label>
              <select
                value={mergeMultiPeriod ? "merged" : "per-period"}
                onChange={(e) => setMergeMultiPeriod(e.target.value === "merged")}
                className="mt-2 w-full p-2 rounded border bg-white dark:bg-gray-700"
              >
                <option value="merged">Merge multi-period classes</option>
                <option value="per-period">Create event per period</option>
              </select>
            </div>
          </div>

          {/* subject colour pickers */}
          <div>
            <h3 className="font-semibold">Subject colours (persisted)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pick a colour for each subject (these appear as X-COLOR in ICS metadata)</p>

            <div className="mt-3 space-y-3">
              {!timetable && <div className="text-sm text-gray-500">Import a timetable to edit colours</div>}

              {timetable && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {allSubjects.map((s) => (
                      <div key={s} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
                        <div className="truncate pr-2">{s}</div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {GOOGLE_COLORS.map((c) => (
                              <button
                                key={c.hex}
                                title={`${s} → ${c.name}`}
                                onClick={() => setSubjectColors((prev) => ({ ...prev, [s]: c.hex }))}
                                className={`w-6 h-6 rounded border-2 ${subjectColors[s] === c.hex ? "border-black dark:border-white" : "border-transparent"}`}
                                style={{ backgroundColor: c.hex }}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              const next = { ...subjectColors };
                              delete next[s];
                              setSubjectColors(next);
                            }}
                            className="text-xs px-2 py-1 border rounded text-gray-600 dark:text-gray-300"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* preview + download */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Preview & Export</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">Imported weeks: {timetable ? (Object.keys(timetable.A || {}).length + Object.keys(timetable.B || {}).length) : 0}</div>
            </div>

            {/* simple preview */}
            <div className="space-y-2 max-h-48 overflow-auto">
              {timetable ? (
                ["A", "B"].map((wk) => (
                  <div key={wk} className="p-2 rounded bg-gray-50 dark:bg-gray-700 border dark:border-gray-600">
                    <div className="font-medium mb-1">Week {wk}</div>
                    {Object.keys(timetable[wk] || {}).length === 0 ? <div className="text-sm text-gray-500">No days</div> : (
                      Object.entries(timetable[wk]).map(([day, blocks]) => (
                        <div key={day} className="mb-2">
                          <div className="text-sm font-semibold">{day}</div>
                          <ul className="text-sm pl-4 list-disc">
                            {blocks.map((b, i) => (
                              <li key={i}>
                                {b.periods.join(", ")} — {b.subject} ({b.code}) • {b.teacher} • {b.room}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No timetable loaded</div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDownloadICS}
                disabled={!timetable}
                className={`px-4 py-2 rounded text-white ${timetable ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"}`}
              >
                Download .ICS
              </button>

              <button
                onClick={() => {
                  setTimetable(null);
                  setRawText("");
                  setError("");
                }}
                className="px-4 py-2 rounded border"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <footer className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Note: For best results paste the timetable exactly as exported from your source (tab-separated values). The colour in ICS is added as `X-COLOR` metadata — some calendar apps ignore it, but it's useful for later mapping.
        </footer>
      </div>
    </div>
  );
}