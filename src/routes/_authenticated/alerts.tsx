import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "我的提醒 — DEALFLIGHT 盯盤航空" },
      { name: "description", content: "管理你的機票目標價提醒：新增航線、調整目標價、暫停或刪除監控。" },
      { property: "og:title", content: "我的提醒 — DEALFLIGHT 盯盤航空" },
      { property: "og:description", content: "管理你的機票目標價提醒。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsPage,
});

const DESTINATIONS = [
  { code: "NRT", city: "東京（成田）" },
  { code: "HND", city: "東京（羽田）" },
  { code: "KIX", city: "大阪" },
  { code: "ICN", city: "首爾" },
  { code: "BKK", city: "曼谷" },
  { code: "SIN", city: "新加坡" },
  { code: "HKG", city: "香港" },
  { code: "MNL", city: "馬尼拉" },
  { code: "CGK", city: "雅加達" },
  { code: "OKA", city: "沖繩" },
];

type Alert = {
  id: string;
  destination: string;
  origin: string;
  target_price: number;
  active: boolean;
  created_at: string;
};

function AlertsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [destination, setDestination] = useState("NRT");
  const [targetPrice, setTargetPrice] = useState("5000");
  const [saving, setSaving] = useState(false);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["flight_alerts", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_alerts")
        .select("id, origin, destination, target_price, active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Alert[];
    },
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["flight_alerts", user.id] });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const price = parseInt(targetPrice.replace(/,/g, ""), 10);
    if (!price || price <= 0) {
      toast.error("請輸入有效的目標價");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("flight_alerts").insert({
      user_id: user.id,
      destination,
      target_price: price,
      notify_email: user.email ?? "",
    });
    setSaving(false);
    if (error) {
      toast.error("儲存失敗，請再試一次");
      return;
    }
    toast.success(`已開始監控 TPE → ${destination}`);
    setTargetPrice("5000");
    refresh();
  }

  async function toggleActive(alert: Alert) {
    const { error } = await supabase
      .from("flight_alerts")
      .update({ active: !alert.active })
      .eq("id", alert.id);
    if (error) {
      toast.error("更新失敗");
      return;
    }
    refresh();
  }

  async function removeAlert(id: string) {
    const { error } = await supabase.from("flight_alerts").delete().eq("id", id);
    if (error) {
      toast.error("刪除失敗");
      return;
    }
    toast.success("已刪除提醒");
    refresh();
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-paper font-body text-ink antialiased">
      <header className="sticky top-0 z-50 bg-ink text-cream">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="inline-block size-5 rounded-full chrome ring-1 ring-black/20" />
            <span className="font-display text-lg tracking-wide">DEALFLIGHT</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block font-mono text-[11px] text-cream/50">{user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="font-mono text-xs tracking-wider text-cream/70 hover:text-cream cursor-pointer"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="font-mono text-xs tracking-[0.25em] text-brand">MY WATCHLIST</div>
        <h1 className="font-display text-4xl mt-2">我的盯盤清單</h1>
        <p className="mt-2 text-ink/60 text-sm">
          價格跌破目標價時，通知信會寄到 <span className="font-mono">{user.email}</span>
        </p>

        <div className="mt-10 grid lg:grid-cols-[1fr_1.4fr] gap-8 items-start">
          {/* ADD FORM */}
          <form onSubmit={handleAdd} className="rounded-3xl bg-cream ring-1 ring-black/5 p-6">
            <h2 className="font-display text-xl">新增航線監控</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="block">
                <span className="font-mono text-[11px] tracking-wider text-ink/50">出發</span>
                <div className="mt-1 font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 text-ink/60">
                  台北 TPE
                </div>
              </label>
              <label className="block">
                <span className="font-mono text-[11px] tracking-wider text-ink/50">目的地</span>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.city} {d.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block col-span-2">
                <span className="font-mono text-[11px] tracking-wider text-ink/50">目標價 (NT$)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value.replace(/[^0-9,]/g, ""))}
                  className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full bg-brand text-cream font-semibold py-3 rounded-full ring-1 ring-white/15 hover:bg-brand-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              開始監控
            </button>
          </form>

          {/* LIST */}
          <div>
            {isLoading ? (
              <div className="rounded-3xl bg-cream ring-1 ring-black/5 p-10 text-center font-mono text-xs text-ink/40">
                讀取中…
              </div>
            ) : !alerts || alerts.length === 0 ? (
              <div className="rounded-3xl bg-cream ring-1 ring-black/5 p-10 text-center">
                <div className="font-display text-2xl">還沒有監控中的航線</div>
                <p className="mt-2 text-sm text-ink/60">從左邊新增第一條，到價立刻通知你。</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {alerts.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-2xl bg-cream ring-1 ring-black/5 p-5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-display text-2xl tracking-tight">
                        {a.origin} <span className="text-ink/30">→</span> {a.destination}
                      </div>
                      <div className="mt-1 font-mono text-xs text-ink/50">
                        目標價 NT${a.target_price.toLocaleString()} ·{" "}
                        {a.active ? (
                          <span className="text-teal">監控中</span>
                        ) : (
                          <span className="text-ink/40">已暫停</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleActive(a)}
                        className={`font-mono text-[11px] px-3 py-1.5 rounded-full ring-1 cursor-pointer ${
                          a.active
                            ? "bg-teal/10 text-teal ring-teal/30"
                            : "bg-paper-2 text-ink/50 ring-black/10"
                        }`}
                      >
                        {a.active ? "暫停" : "恢復"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAlert(a.id)}
                        className="font-mono text-[11px] px-3 py-1.5 rounded-full ring-1 ring-black/10 text-ink/50 hover:text-brand hover:ring-brand/40 cursor-pointer"
                      >
                        刪除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
