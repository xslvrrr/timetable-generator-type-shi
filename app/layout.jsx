import "./globals.css";

export const metadata = {
  title: "Timetable → ICS",
  description: "Convert tab-separated school timetable into an ICS file.",
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
