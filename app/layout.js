export const metadata = {
  title: "School Timetable ICS Generator",
  description: "Generate personalised ICS school calendars with week A/B rotation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
