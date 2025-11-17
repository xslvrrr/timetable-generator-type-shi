import React, { useState } from "react";
import { Download, Calendar } from "lucide-react";

const TimetableCalendarGenerator = () => {
  const [weeks, setWeeks] = useState(4);
  const [startDate, setStartDate] = useState("2024-11-17");
  const [firstWeekType, setFirstWeekType] = useState("A"); // A or B
  const [mergePeriods, setMergePeriods] = useState(true); // toggle full-block events

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

  const timetable = { /* your original timetable unchanged */ };

  const formatTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
  const formatDate = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const getEventRange = (periods, isPause) => {
    if (mergePeriods) {
      const start = periodTimes[periods[0]].start;
      const end = isPause && periods.includes("P8")
        ? periodTimes["P8_Pause"].start + periodTimes["P8_Pause"].duration
        : periodTimes[periods[periods.length - 1]].start + periodTimes[periods[periods.length - 1]].duration;
      return [{ start, end }];
    }

    return periods.map(period => ({
      start: periodTimes[period].start,
      end: periodTimes[period].start + periodTimes[period].duration,
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
    const dayOffsetMap = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };

    for (let wk = 0; wk < weeks; wk++) {
      const weekType = (wk % 2 === 0 ? firstWeekType : firstWeekType === "A" ? "B" : "A");
      const baseDate = new Date(start);
      baseDate.setDate(start.getDate() + wk * 7);

      Object.entries(timetable[weekType]).forEach(([day, events]) => {
        const eventDate = new Date(baseDate);
        eventDate.setDate(baseDate.getDate() + dayOffsetMap[day]);

        events.forEach((classInfo) => {
          const isPause = classInfo.subject === "Pause";
          const ranges = getEventRange(classInfo.periods, isPause);

          ranges.forEach(({ start, end }) => {
            const uid = `${formatDate(eventDate)}-${classInfo.code}-${start}@timetable`;

            ics += `BEGIN:VEVENT
DTSTART:${formatDate(eventDate)}T${formatTime(start)}00
DTEND:${formatDate(eventDate)}T${formatTime(end)}00
SUMMARY:${classInfo.subject} (${classInfo.code})
LOCATION:${classInfo.room}
DESCRIPTION:Teacher: ${classInfo.teacher}\\nPeriods: ${classInfo.periods.join(", ")}
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
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "timetable.ics";
    a.click();
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        
        <div className="flex gap-3 items-center mb-6">
          <Calendar className="w-8 h-8 text-indigo-600" />
          <h1 className="font-bold text-3xl text-gray-800">Timetable Calendar Generator</h1>
        </div>

        {/* Start Date Picker */}
        <label className="block mb-2 font-medium text-sm text-gray-700">Start Date:</label>
        <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg" />

        {/* Week A/B Toggle */}
        <label className="block mb-2 font-medium text-sm text-gray-700">First Week Type:</label>
        <select value={firstWeekType} onChange={(e)=>setFirstWeekType(e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg">
          <option value="A">Week A</option>
          <option value="B">Week B</option>
        </select>

        {/* Weeks to Generate */}
        <label className="block mb-2 font-medium text-sm text-gray-700">Number of Week Cycles:</label>
        <input type="number" min="1" max="20" value={weeks} onChange={e=>setWeeks(+e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg" />

        {/* Merge toggle */}
        <label className="block mb-2 font-medium text-sm text-gray-700">Event Mode:</label>
        <select value={mergePeriods} onChange={e=>setMergePeriods(e.target.value === "true")}
          className="w-full px-4 py-2 mb-6 border border-gray-300 rounded-lg">
          <option value="true">Merge multi-period classes</option>
          <option value="false">Separate event per period</option>
        </select>

        <button onClick={downloadICS}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 flex items-center gap-2 justify-center mb-6">
          <Download className="w-5 h-5" /> Download (.ics)
        </button>
      </div>
    </div>
  );
};

export default TimetableCalendarGenerator;
