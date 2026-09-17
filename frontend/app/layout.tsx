// app/layout.tsx
//
// Root layout for the Next.js App Router. Wraps every route group
// ((operator), (customer)) with the global shell.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YLT Travels — Transit OS",
  description: "High-performance bus booking & ERP platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-brand-700">
                YLT Travels
              </span>
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                Transit OS
              </span>
            </div>
            <nav className="flex flex-wrap gap-4 text-sm text-slate-600">
              <a href="/search" className="hover:text-brand-600">Search</a>
              <a href="/operator/dashboard" className="hover:text-brand-600">Dashboard</a>
              <a href="/operator/bookings" className="hover:text-brand-600">Bookings</a>
              <a href="/directors" className="hover:text-brand-600">Directors</a>
              <a href="/employees" className="hover:text-brand-600">Employees</a>
              <a href="/expenses" className="hover:text-brand-600">Expenses</a>
              <a href="/settings" className="hover:text-brand-600">Settings</a>
              <a href="/login" className="hover:text-brand-600">Login</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
