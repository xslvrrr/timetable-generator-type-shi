"use client";

import { useState } from "react";

// Google Calendar Material Event Colors
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

export default function TimetablePage() {
  // Timetable JSON after import
  const [timetable, setTimetable] = useState(null);

  // UI selections
  const [color, setColor] = useState("#4285f4");
  const [weeks, setWeeks] = useState(10);

  // Default start date = 2025
  const [startDate, setStartDate] = useState("2025-01-27");

  // Raw text input for parsing
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");

  //-----------------------------------------------------------------------
  // PARSER
  //-----------------------------------------------------------------------
  const parseTimetable = () => {
    try {
      const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
      const result = { A: {}, B: {} };

      let currentWeek = null;
      let currentDay = null;

      for (const line of lines) {
        if (/^Week\s*A$/i.test(line)) { currentWeek = "A"; continue; }
        if (/^Week\s*B$/i.test(line)) { currentWeek = "B"; continue; }

        if (/^(Monday|Tuesday|Wednesday|Thursday|Friday)$/i.test(line)) {
          currentDay = line;
          result[currentWeek][currentDay] = [];
          continue;
        }

        // Columns: Period | Subject | Code | Teacher | Room
        const parts = line.split(/\s{2,}|\t/g).filter(Boolean);
        if (parts.length >= 5) {
          const [period, subject, code, teacher, room] = parts;
          result[currentWeek][currentDay].push({
            period, subject, code, teacher, room
          });
        }
      }

      // Merge identical consecutive rows
      for (const week of ["A", "B"]) {
        for (const day of Object.keys(result[week])) {
          const rows = result[week][day];
          const grouped = [];
          let buffer = null;

          for (const row of rows) {
            if (!buffer) {
              buffer = {
                subject: row.subject,
                code: row.code,
                teacher: row.teacher,
                room: row.room,
                periods: [row.period]
              };
              continue;
            }

            // Matching row → extend period block
            if (
              buffer.subject === row.subject &&
              buffer.code === row.code &&
              buffer.teacher === row.teacher
            ) {
              buffer.periods.push(row.period);
            } else {
              grouped.push(buffer);
              buffer = {
                subject: row.subject,
                code: row.code,
                teacher: row.teacher,
                room: row.room,
                periods: [row.period]
              };
            }
          }

          if (buffer) grouped.push(buffer);
          result[week][day] = grouped;
        }
      }

      setTimetable(result);
      setError("");
    } catch (e) {
      console.error(e);
      setError("Failed to parse timetable. Check text formatting.");
    }
  };

  //-----------------------------------------------------------------------
  // ICS GENERATION
  //-----------------------------------------------------------------------
  const downloadICS = () => {
    if (!timetable) return;

    const start = new Date(startDate);
    const MILLI_DAY = 86400000;

    const dayToOffset = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
    };

    let events = [];

    // Week loop
    for (let w = 0; w < weeks; w++) {
      const weekLetter = w % 2 === 0 ? "A" : "B";

      for (const day of Object.keys(timetable[weekLetter])) {
        const offsetDays = (w * 7) + dayToOffset[day];
        const baseDate = new Date(start.getTime() + offsetDays * MILLI_DAY);

        for (const block of timetable[weekLetter][day]) {
          // For default calendar apps, assign 09:00 start per period
          block.periods.forEach((period, i) => {
            const eventStart = new Date(baseDate);
            eventStart.setHours(9 + (parseInt(period.replace("P", "")) - 1), 0, 0);

            const eventEnd = new Date(eventStart.getTime() + 50 * 60000);

            events.push({
              summary: `${block.subject} (${block.code})`,
              location: block.room,
              description: `Teacher: ${block.teacher} | Week ${weekLetter}`,
              start: eventStart,
              end: eventEnd
            });
          });
        }
      }
    }

    // Build ICS
    const pad = n => String(n).padStart(2, "0");

    const formatDate = d =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
      `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

    let ics = `BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\n`;

    for (const ev of events) {
      ics += `BEGIN:VEVENT\n`;
      ics += `SUMMARY:${ev.summary}\n`;
      ics += `DTSTART:${formatDate(ev.start)}\n`;
      ics += `DTEND:${formatDate(ev.end)}\n`;
      ics += `LOCATION:${ev.location}\n`;
      ics += `DESCRIPTION:${ev.description}\n`;
      ics += `COLOR:${color}\n`;
      ics += `END:VEVENT\n`;
    }

    ics += "END:VCALENDAR";

    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "timetable.ics";
    a.click();
  };

  //-----------------------------------------------------------------------
  // RENDER
  //-----------------------------------------------------------------------
  return (
    <div className="min-h-screen w-full p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* HEADER */}
        <h1 className="text-3xl font-bold text-center">Timetable → Calendar Converter</h1>
        <p className="text-center text-gray-600 dark:text-gray-400">
          Paste your school timetable and export as Google Calendar / iCloud .ICS
        </p>

        {/* MAIN CARD */}
        <div className="p-6 rounded-xl bg-white dark:bg-gray-800 shadow border dark:border-gray-700 space-y-6">

          {/* RAW INPUT */}
          <div className="space-y-2">
            <label className="font-semibold">Paste Timetable Text</label>
            <textarea
              className="w-full h-56 p-3 border rounded bg-gray-50 dark:bg-gray-700 dark:text-white"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            {error && <p className="text-red-500">{error}</p>}
            <button
              onClick={parseTimetable}
              className="px-4 py-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Import Timetable
            </button>
          </div>

          {/* OPTIONS */}
          <div className="space-y-4">
            <div>
              <label className="font-semibold">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="font-semibold">Number of Weeks</label>
              <input
                type="number"
                value={weeks}
                onChange={e => setWeeks(parseInt(e.target.value))}
                className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="font-semibold">Event Colour</label>
              <div className="grid grid-cols-5 gap-3 mt-2">
                {GOOGLE_COLORS.map(c => (
                  <div
                    key={c.hex}
                    onClick={() => setColor(c.hex)}
                    className={`h-10 rounded cursor-pointer border-2
                      ${color === c.hex ? "border-black dark:border-white" : "border-transparent"}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* EXPORT */}
          {timetable && (
            <button
              onClick={downloadICS}
              className="px-4 py-3 w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded"
            >
              Download .ICS File
            </button>
          )}
        </div>
      </div>
    </div>
  );
}