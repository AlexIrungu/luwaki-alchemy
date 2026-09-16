import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadCustomers, loadSubscribers } from "@/lib/customers";

/** One field, quoted, with a leading apostrophe on anything a spreadsheet would run as a formula. */
const cell = (value: string | null) => {
  const text = value ?? "";
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  // A route handler is a public endpoint: it re-checks the role itself.
  const { error } = await requireAdmin();
  if (error) return new NextResponse("Not found", { status: 404 });

  const subscribers = await loadSubscribers(await loadCustomers());
  const rows = [
    ["email", "name", "source", "subscribed_at"].join(","),
    ...subscribers.map((s) => [cell(s.email), cell(s.name), cell(s.source), cell(s.since)].join(",")),
  ];
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(`﻿${rows.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="luwaki-newsletter-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
