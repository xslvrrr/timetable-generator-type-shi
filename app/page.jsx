import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-10 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-300">
        Click below to open the timetable generator.
      </p>
      <Link 
        href="/timetable"
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
      >
        Open Timetable Generator
      </Link>
    </main>
  );
}
