"use client";
import { useState } from "react";
import { Download, Calendar } from "lucide-react";

export default function TimetablePage() {
  const [weeks, setWeeks] = useState(4);
  const [startDate, setStartDate] = useState("2024-11-17");
  const [firstWeekType, setFirstWeekType] = useState("A");
  const [mergePeriods, setMergePeriods] = useState(true);

  const periodTimes = {
    P1: { start: 525, duration: 38 },
    P2: { start: 563, duration: 39 },
    P3b: { start: 632, duration: 40 },
    P4: { start: 672, duration: 37 },
    P5: { start: 709, duration: 40 },
    P6b: { start: 779, duration: 38 },
    P7: { start: 817, duration: 40 },
    P8: { start: 857, duration: 40 },
    P8_Pause: { start: 857, duration: 29 },
  };

  const timetable = { /* your original timetable object */ };

  const formatTime = (m) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;

  const formatDate = (d) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

  const getRanges = (periods, isPause) => {
    if (mergePeriods) {
      const start = periodTimes[periods[0]].start;
      const end = isPause && periods.includes("P8")
        ? periodTimes["P8_Pause"].start + periodTimes["P8_Pause"].duration
        : periodTimes[periods[periods.length - 1]].start +
          periodTimes[periods[periods.length - 1]].duration;
      return [{ start, end }];
    }
    return periods.map((p) => ({
      start: periodTimes[p].start,
      end: periodTimes[p].start + periodTimes[p].duration,
    }));
  };

  const generateICS = () => {
    let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Timetable Generator//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:School Timetable
X-WR-TIMEZONE:Australia/Sydney\n`;

    const start = new Date(startDate);
    const dayOffset = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };

    for (let wk = 0; wk < weeks; wk++) {
      const weekType =
        wk % 2 === 0 ? firstWeekType : firstWeekType === "A" ? "B" : "A";

      const base = new Date(start);
      base.setDate(start.getDate() + wk * 7);

      Object.entries(timetable[weekType]).forEach(([day, events]) => {
        const eventDay = new Date(base);
        eventDay.setDate(base.getDate() + dayOffset[day]);

        events.forEach((info) => {
          const isPause = info.subject === "Pause";
          const ranges = getRanges(info.periods, isPause);

          ranges.forEach(({ start, end }) => {
            const uid = `${formatDate(eventDay)}-${info.code}-${start}@school`;

            ics += `BEGIN:VEVENT
DTSTART:${formatDate(eventDay)}T${formatTime(start)}00
DTEND:${formatDate(eventDay)}T${formatTime(end)}00
SUMMARY:${info.subject} (${info.code})
LOCATION:${info.room}
DESCRIPTION:Teacher: ${info.teacher}\\nPeriods: ${info.periods.join(", ")}
UID:${uid}
STATUS:CONFIRMED
END:VEVENT
`;
          });
        });
      });
    }

    return ics + "END:VCALENDAR";
  };

  const downloadICS = () => {
    const blob = new Blob([generateICS()], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timetable.ics";
    a.click();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-800">Timetable Calendar Generator</h1>
        </div>

        <label className="block mb-2 font-medium">Start Date</label>
        <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded-lg" />

        <label className="block mb-2 font-medium">First Week</label>
        <select value={firstWeekType} onChange={(e)=>setFirstWeekType(e.target.value)}
          className="w-full mb-4 p-2 border rounded-lg">
          <option value="A">Week A</option>
          <option value="B">Week B</option>
        </select>

        <label className="block mb-2 font-medium">Weeks to Generate</label>
        <input type="number" min="1" max="20" value={weeks}
          onChange={(e)=>setWeeks(+e.target.value)} className="w-full mb-4 p-2 border rounded-lg" />

        <label className="block mb-2 font-medium">Event Mode</label>
        <select value={mergePeriods} onChange={(e)=>setMergePeriods(e.target.value === "true")}
          className="w-full mb-6 p-2 border rounded-lg">
          <option value="true">Merge multi-period classes</option>
          <option value="false">Separate per-period events</option>
        </select>

        <button onClick={downloadICS}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2">
          <Download className="w-5 h-5" />
          Download .ics
        </button>
      </div>
    </main>
  );
}
