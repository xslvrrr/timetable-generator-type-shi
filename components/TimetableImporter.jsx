"use client";
import { useState } from "react";

export default function TimetableImporter({ onImport }) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");

  const parse = () => {
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

        const parts = line.split(/\s{2,}|\t/g).filter(Boolean);
        if (parts.length >= 5) {
          const [period, subject, code, teacher, room] = parts;
          result[currentWeek][currentDay].push({ period, subject, code, teacher, room });
        }
      }

      // Merge consecutive identical subjects into blocks
      for (const week of ["A","B"]) {
        for (const day of Object.keys(result[week])) {
          const rows = result[week][day];
          const grouped = [];
          let buffer = null;

          for (const row of rows) {
            if (!buffer) {
              buffer = { subject: row.subject, code: row.code, teacher: row.teacher, room: row.room, periods: [row.period] };
              continue;
            }
            if (buffer.subject === row.subject && buffer.code === row.code && buffer.teacher === row.teacher) {
              buffer.periods.push(row.period);
            } else {
              grouped.push(buffer);
              buffer = { subject: row.subject, code: row.code, teacher: row.teacher, room: row.room, periods: [row.period] };
            }
          }
          if (buffer) grouped.push(buffer);
          result[week][day] = grouped;
        }
      }

      onImport(result);
      setError("");
    } catch (e) {
      setError("Failed to parse timetable. Check formatting.");
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <textarea
        className="w-full h-48 p-2 border rounded bg-white dark:bg-gray-700 text-sm"
        placeholder="Paste your full timetable text here..."
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      <button 
        onClick={parse}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full"
      >
        Import Timetable
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
