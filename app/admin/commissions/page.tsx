import { createClient } from "@/lib/supabase/server";
import { CommissionRow } from "@/components/admin/CommissionRow";

type Row = {
  id: string;
  stage: string;
  brief: string;
  reference_urls: string[] | null;
  quoted_kes: number | null;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
};

export default async function AdminCommissionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("commissions")
    .select("id, stage, brief, reference_urls, quoted_kes, created_at, profiles(full_name, phone)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <div className="mt-12">
      <h1 className="font-display text-4xl tracking-[0.15em]">PRIVATE EDIT</h1>

      {!data?.length ? (
        <p className="mt-16 text-sm text-ink-dim">No commissions yet.</p>
      ) : (
        <ul className="mt-10 space-y-px">
          {data.map((c) => (
            <CommissionRow key={c.id} commission={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
