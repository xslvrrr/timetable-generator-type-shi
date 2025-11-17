"use client";
import { useState, useEffect } from "react";
import { Download, Calendar } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ColorPicker from "@/components/ColorPicker";

export default function Page() {
  const [weeks, setWeeks] = useState(4);
  const [startDate, setStartDate] = useState("2024-11-17");
  const [firstWeekType, setFirstWeekType] = useState("A");
  const [mergePeriods, setMergePeriods] = useState(true);
  const [colors, setColors] = useState({});

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("subjectColors") || "{}");
    setColors(saved);
  }, []);

  const timetable = {
    A: { Monday: [ { periods: ['P1', 'P2'], subject: 'Physics', code: 'PPHY.B', teacher: 'Mr S Harrison', room: 'G4' }, { periods: ['P3b', 'P4', 'P5'], subject: 'Extension Mathematics 1', code: 'PMAX1.A', teacher: 'Mr A Sharma', room: 'E4' }, { periods: ['P6b', 'P7', 'P8'], subject: 'Chemistry', code: 'PCHE.C', teacher: 'Ms F Deb Chaudhuri', room: 'G4' } ], Tuesday: [ { periods: ['P1', 'P2'], subject: 'Chemistry', code: 'PCHE.C', teacher: 'Ms D Pahwa', room: 'G4' }, { periods: ['P3b', 'P4', 'P5'], subject: 'SOR', code: 'PSOR1.A', teacher: 'Ms B Mannes', room: 'E4' }, { periods: ['P6b', 'P7'], subject: 'Physics', code: 'PPHY.B', teacher: "Mx O'Leary", room: 'G4' }, { periods: ['P8'], subject: 'Pause', code: '1.2PAUSE.2', teacher: 'Ms F McNicol', room: 'C9' } ], Wednesday: [ { periods: ['P1', 'P2'], subject: 'SOR', code: 'PSOR1.A', teacher: 'Ms B Mannes', room: 'E4' }, { periods: ['P3b', 'P4', 'P5'], subject: 'Physics', code: 'PPHY.B', teacher: "Mx O'Leary", room: 'G4' } ], Thursday: [ { periods: ['P1', 'P2'], subject: 'Physics', code: 'PPHY.B', teacher: 'Mr S Harrison', room: 'G4' }, { periods: ['P3b', 'P4', 'P5'], subject: 'Chemistry', code: 'PCHE.C', teacher: 'Ms F Deb Chaudhuri', room: 'G4' }, { periods: ['P6b', 'P7', 'P8'], subject: 'SOR', code: 'PSOR1.A', teacher: 'Ms B Mannes', room: 'E4' } ], Friday: [ { periods: ['P1', 'P2'], subject: 'Extension Mathematics 1', code: 'PMAX1.A', teacher: 'Mr A Sharma', room: 'E4' }, { periods: ['P3b', 'P4', 'P5'], subject: 'Chemistry', code: 'PCHE.C', teacher: 'Ms D Pahwa', room: 'G4' }, { periods: ['P6b', 'P7', 'P8'], subject: 'Physics', code: 'PPHY.B', teacher: "Mx O'Leary", room: 'G4' } ] }, B: { Monday: [ { periods: ['P1', 'P2'], subject: 'Physics', code: 'PPHY.B', teacher: "Mx O'Leary", room: 'G4' }, { periods: ['P3b', 'P4', 'P5'], subject: 'Extension Mathematics 1', code: 'PMAX1.A', teacher: 'Mr A Sharma', room: 'E4' }, { periods: ['P6b', 'P7', 'P8'], subject: 'Chemistry', code: 'PCHE.C', teacher: 'Ms F Deb Chaudhuri', room: 'G4' } ], Tuesday: [ { periods: ['P1', 'P2'], subject: 'SOR', code: 'PSOR1.A', teacher: 'Ms B Mannes', room: 'E4' }, { periods: ['P3b', 'P4', 'P5'], subject: 'Chemistry', code: 'PCHE.C', teacher: 'Ms D Pahwa', room: 'G4' }, { periods: ['P6b', 'P7'], subject: 'Physics', code: 'PPHY.B', teacher: "Mx O'Leary", room: 'G4' }, { periods: ['P8'], subject: 'Pause', code: '1.2PAUSE.2', teacher: 'Ms F McNicol', room: 'C9' } ], Wednesday: [ { periods: ['P1', 'P2'], subject: 'Chemistry', code: 'PCHE.C', teacher: 'Ms D Pahwa', room: 'G4' }, { periods: ['P3b', 'P4', 'P5'], subject: 'Physics', code: 'PPHY.B', teacher: 'Mr S Harrison', room: 'G4' } ], Thursday: [ { periods: ['P1', 'P2'], subject: 'Physics', code: 'PPHY.B', teacher: 'Mr S Harrison', room: 'G4' }, { periods: ['P3b'], subject: 'SOR', code: 'PSOR1.A', teacher: 'Ms B Mannes', room: 'E4' }, { periods: ['P4', 'P5'], subject: 'Extension Mathematics 1', code: 'PMAX1.A', teacher: 'Mr A Sharma', room: 'E4' }, { periods: ['P6b', 'P7', 'P8'], subject: 'Chemistry', code: 'PCHE.C', teacher: 'Ms D Pahwa', room: 'G4' } ], Friday: [ { periods: ['P1', 'P2'], subject: 'Chemistry', code: 'PCHE.C', teacher: 'Ms F Deb Chaudhuri', room: 'G4' }, { periods: ['P3b', 'P4', 'P5'], subject: 'Physics', code: 'PPHY.B', teacher: 'Mr S Harrison', room: 'G4' }, { periods: ['P6b', 'P7', 'P8'], subject: 'Extension Mathematics 1', code: 'PMAX1.A', teacher: 'Mr A Sharma', room: 'E4' } ] }
  };

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

  const colorFor = (subject) => colors[subject] || "#3b82f6";

  const fmtTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
  const fmtDate = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

  const getRanges = (periods, isPause) => {
    if (mergePeriods) {
      const start = periodTimes[periods[0]].start;
      const last = periods[periods.length - 1];
      const end = isPause && last === "P8"
        ? periodTimes["P8_Pause"].start + periodTimes["P8_Pause"].duration
        : periodTimes[last].start + periodTimes[last].duration;
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
CALSCALE:GREGORIAN
PRODID:-//Timetable//EN
X-WR-CALNAME:School Timetable\n`;

    const start = new Date(startDate);
    const dayOffset = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };

    for (let w = 0; w < weeks; w++) {
      const weekType = w % 2 === 0 ? firstWeekType : firstWeekType === "A" ? "B" : "A";
      const base = new Date(start);
      base.setDate(start.getDate() + w * 7);

      Object.entries(timetable[weekType]).forEach(([day, events]) => {
        const dayDate = new Date(base);
        dayDate.setDate(base.getDate() + dayOffset[day]);

        events.forEach((info) => {
          const ranges = getRanges(info.periods, info.subject === "Pause");
          ranges.forEach(({ start, end }) => {
            const uid = `${fmtDate(dayDate)}-${info.code}-${start}@school`;

            ics += `BEGIN:VEVENT
DTSTART:${fmtDate(dayDate)}T${fmtTime(start)}00
DTEND:${fmtDate(dayDate)}T${fmtTime(end)}00
SUMMARY:${info.subject} (${info.code})
LOCATION:${info.room}
COLOR:${colorFor(info.subject)}
DESCRIPTION:Teacher: ${info.teacher}\\nPeriods: ${info.periods.join(", ")}
UID:${uid}
END:VEVENT
`;
          });
        });
      });
    }

    return ics + "END:VCALENDAR";
  };

  const downloadICS = () => {
    const blob = new Blob([generateICS()], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "school_timetable.ics";
    a.click();
  };

  const allSubjects = Array.from(
    new Set(
      Object.values(timetable)
        .flatMap((d) => Object.values(d).flatMap((x) => x.map((c) => c.subject)))
    )
  );

  return (
    <main className="min-h-screen p-6 bg-white dark:bg-gray-900 dark:text-gray-100 transition">
      <div className="max-w-4xl mx-auto bg-gray-50 dark:bg-gray-800 rounded-xl p-8 shadow-lg">
        <div className="flex justify-between mb-6 items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="text-indigo-500" /> Timetable Generator
          </h1>
          <ThemeToggle />
        </div>

        {/* Color pickers */}
        <h2 className="font-semibold mb-2">Subject Colors</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
          {allSubjects.map((sub) => (
            <div key={sub} className="flex items-center justify-between bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
              <span>{sub}</span>
              <ColorPicker subject={sub} colors={colors} setColors={setColors} />
            </div>
          ))}
        </div>

        {/* Settings */}
        <label>Start Date</label>
        <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-white dark:bg-gray-700 border dark:border-gray-600" />

        <label>First Week</label>
        <select value={firstWeekType} onChange={(e)=>setFirstWeekType(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-white dark:bg-gray-700 border dark:border-gray-600">
          <option>A</option><option>B</option>
        </select>

        <label>Week Cycles</label>
        <input type="number" value={weeks} min="1" max="20" onChange={(e)=>setWeeks(+e.target.value)}
          className="w-full p-2 mb-4 rounded bg-white dark:bg-gray-700 border dark:border-gray-600" />

        <label>Event Mode</label>
        <select value={mergePeriods} onChange={(e)=>setMergePeriods(e.target.value === "true")}
          className="w-full p-2 mb-6 rounded bg-white dark:bg-gray-700 border dark:border-gray-600">
          <option value="true">Merged classes</option>
          <option value="false">Per period</option>
        </select>

        <button onClick={downloadICS}
          className="w-full py-3 font-semibold bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white rounded-lg flex gap-2 justify-center">
          <Download /> Download .ics
        </button>
      </div>
    </main>
  );
}