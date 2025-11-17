"use client";

export default function ColorPicker({ subject, colors, setColors }) {
  const current = colors[subject] || "#3b82f6";

  const update = (value) => {
    const next = { ...colors, [subject]: value };
    localStorage.setItem("subjectColors", JSON.stringify(next));
    setColors(next);
  };

  return (
    <input
      type="color"
      value={current}
      onChange={(e) => update(e.target.value)}
      className="w-8 h-8 cursor-pointer rounded border"
      title={`Color for ${subject}`}
    />
  );
}
