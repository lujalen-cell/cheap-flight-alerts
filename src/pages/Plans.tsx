import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/components/protected-route";
import { useDocumentHead } from "@/hooks/use-document-head";

const API_BASE = "https://h68xudyvad.execute-api.us-east-1.amazonaws.com";
const DEST_FORMAT_RE = /^[A-Za-z]{3}$/;

// Travelpayouts 回傳的是 IATA 機場代碼，這裡對照常見的幾個城市轉成中文名稱，
// 沒對照到的代碼就直接顯示代碼本身，不會讓畫面空白——因為目的地現在開放自由輸入，
// 使用者可能打任何機場代碼。
const CITY_NAMES: Record<string, string> = {
  TYO: "東京", SEL: "首爾", NRT: "東京（成田）", HND: "東京（羽田）",
  KIX: "大阪", ICN: "首爾", BKK: "曼谷", SIN: "新加坡", HKG: "香港",
  MNL: "馬尼拉", CGK: "雅加達", OKA: "沖繩",
};

const AIRLINE_NAMES: Record<string, string> = {
  CI: "中華航空", BR: "長榮航空", JX: "星宇航空", IT: "台灣虎航", MM: "樂桃航空",
  NH: "全日空", JL: "日本航空", GK: "捷星日本", TR: "酷航", VJ: "越捷航空",
  KE: "大韓航空", OZ: "韓亞航空", "7C": "濟州航空", TW: "德威航空", LJ: "真航空",
  ZE: "易斯達航空", BX: "釜山航空", RS: "永宗航空", UO: "香港快運", CX: "國泰航空",
  HX: "香港航空", PR: "菲律賓航空", GA: "印尼鷹航", QG: "公民航空",
};

function cityName(code: string) {
  return CITY_NAMES[code] ?? code;
}

function airlineName(code?: string | null) {
  if (!code) return null;
  return AIRLINE_NAMES[code] ?? code;
}

type CheapestFare = {
  available: boolean;
  price?: number;
  currency?: string;
  airline?: string;
};

const HOW_IT_WORKS = [
  {
    title: "每 30 分鐘即時查價",
    desc: "不用自己開好幾個網站比價，系統自動幫你盯著。",
  },
  {
    title: "達標才通知，不洗版信箱",
    desc: "同一條航線 24 小時內只提醒一次，除非又大降價。",
  },
  {
    title: "到價立刻寄信",
    desc: "搶在別人訂位前，你先知道。",
  },
];

type SubscriptionRow = {
  email: string;
  route: string;
  destination: string;
  target_price: number;
  currency: string;
};

export default function PlansPage() {
  useDocumentHead({
    title: "訂閱方案 — DEALFLIGHT 盯盤航空",
    description: "訂閱台北出發的降價通知：自己新增想監控的目的地，設定目標價，到價立刻寄信給你。",
  });

  const { user } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [savingRoute, setSavingRoute] = useState<string | null>(null);
  const [newDestination, setNewDestination] = useState("");
  const [newTargetPrice, setNewTargetPrice] = useState("");
  const [editTargets, setEditTargets] = useState<Record<string, string>>({});

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["m1_subscriptions", user.email],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/subscriptions?email=${encodeURIComponent(user.email ?? "")}`
      );
      if (!res.ok) throw new Error("failed to load subscriptions");
      const data = await res.json();
      return (data.items ?? []) as SubscriptionRow[];
    },
    enabled: !!user.email,
  });

  const rows = subscriptions ?? [];

  const cheapestQueries = useQueries({
    queries: rows.map((row) => ({
      queryKey: ["m1_cheapest", row.route],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/cheapest?route=${row.route}`);
        if (!res.ok) throw new Error("failed to load cheapest fare");
        return (await res.json()) as CheapestFare;
      },
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  async function submitSubscription(destinationRaw: string, priceRaw: string, routeKeyForSaving: string) {
    const destination = destinationRaw.trim().toUpperCase();
    const price = parseInt(priceRaw.replace(/,/g, ""), 10);
    if (!DEST_FORMAT_RE.test(destination)) {
      toast.error("目的地請輸入 3 碼機場代碼，例如 HKG、BKK");
      return false;
    }
    if (!price || price <= 0) {
      toast.error("請輸入有效的目標價");
      return false;
    }
    setSavingRoute(routeKeyForSaving);
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, destination, target_price: price }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error === "invalid destination, expected 3-letter airport code"
          ? "目的地代碼格式不對，請確認是不是真實存在的機場代碼"
          : "儲存失敗，請再試一次");
        return false;
      }
      toast.success("已開始追蹤，到價會寄信通知你");
      await queryClient.invalidateQueries({ queryKey: ["m1_subscriptions", user.email] });
      return true;
    } catch {
      toast.error("儲存失敗，請再試一次");
      return false;
    } finally {
      setSavingRoute(null);
    }
  }

  async function handleAddNew() {
    const ok = await submitSubscription(newDestination, newTargetPrice, "__new__");
    if (ok) {
      setNewDestination("");
      setNewTargetPrice("");
    }
  }

  async function handleUpdateExisting(row: SubscriptionRow) {
    const price = editTargets[row.route] ?? String(row.target_price);
    await submitSubscription(row.destination, price, row.route);
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
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
            <span className="hidden sm:block font-mono text-[11px] text-cream/50">
              {user.email}
            </span>
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
        <div className="font-mono text-xs tracking-[0.25em] text-gold">SUBSCRIBE</div>
        <h1 className="font-display text-4xl mt-2">我的降價提醒</h1>
        <p className="mt-2 text-ink/60 text-sm">
          從台北（TPE）出發，自己新增想監控的目的地、設定目標價，系統每 30 分鐘幫你比價，到價立刻寄信到{" "}
          <span className="font-mono">{user.email}</span>
        </p>

        <div className="mt-6 grid sm:grid-cols-3 gap-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.title} className="rounded-2xl bg-cream ring-1 ring-black/5 p-4">
              <p className="font-display text-base">{item.title}</p>
              <p className="mt-1 text-xs text-ink/60">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-cream ring-1 ring-black/5 p-6">
          <h2 className="font-display text-xl">新增監控航線</h2>
          <p className="mt-1 text-xs text-ink/50">
            目的地請輸入 3 碼機場代碼（例如東京成田 NRT、香港 HKG、曼谷 BKK），出發地固定台北 TPE。
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <label className="flex-1">
              <span className="font-mono text-[11px] tracking-wider text-ink/50">目的地機場代碼</span>
              <input
                type="text"
                inputMode="text"
                maxLength={3}
                placeholder="例如 HKG"
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase())}
                className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40 uppercase"
              />
            </label>
            <label className="flex-1">
              <span className="font-mono text-[11px] tracking-wider text-ink/50">目標價 (NT$)</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="例如 8000"
                value={newTargetPrice}
                onChange={(e) => setNewTargetPrice(e.target.value.replace(/[^0-9,]/g, ""))}
                className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={savingRoute === "__new__"}
                onClick={handleAddNew}
                className="w-full sm:w-auto bg-brand text-ink font-semibold px-6 py-2.5 rounded-full ring-1 ring-black/10 hover:bg-brand-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                新增追蹤
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-10 rounded-3xl bg-cream ring-1 ring-black/5 p-10 text-center font-mono text-xs text-ink/40">
            讀取中…
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-cream ring-1 ring-black/5 p-10 text-center">
            <p className="font-mono text-xs text-ink/40">你還沒有追蹤任何航線，用上面的表單新增第一條吧</p>
          </div>
        ) : (
          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            {rows.map((row, idx) => {
              const cheapestResult = cheapestQueries[idx];
              const cheapest = cheapestResult?.data;
              const destCode = row.route.split("-")[1] ?? row.destination;
              return (
                <div
                  key={row.route}
                  className="rounded-3xl bg-cream ring-1 ring-black/5 p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl">
                        台北 ✈ {cityName(destCode)}
                        {cityName(destCode) !== destCode && (
                          <span className="ml-1 font-mono text-xs text-ink/40">{destCode}</span>
                        )}
                      </h2>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] px-3 py-1 rounded-full bg-teal/10 text-teal ring-1 ring-teal/30">
                      已訂閱
                    </span>
                  </div>

                  <p className="mt-3 font-mono text-xs text-ink/60">
                    目前目標價 NT${Number(row.target_price).toLocaleString()}
                  </p>

                  <div className="mt-4 rounded-xl bg-paper-2 px-3.5 py-3">
                    <span className="font-mono text-[11px] tracking-wider text-ink/50">
                      即時最低價
                    </span>
                    {cheapestResult?.isLoading ? (
                      <p className="mt-0.5 font-mono text-xs text-ink/40">查詢中…</p>
                    ) : cheapestResult?.isError || !cheapest?.available ? (
                      <p className="mt-0.5 font-mono text-xs text-ink/40">暫時查不到即時報價</p>
                    ) : (
                      <p className="mt-0.5 flex items-baseline gap-2">
                        <span className="font-mono text-lg font-semibold text-ink">
                          NT${Number(cheapest.price).toLocaleString()}
                        </span>
                        {airlineName(cheapest.airline) && (
                          <span className="font-mono text-[11px] text-ink/50">
                            {airlineName(cheapest.airline)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <label className="block mt-3">
                    <span className="font-mono text-[11px] tracking-wider text-ink/50">
                      調整目標價 (NT$)
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editTargets[row.route] ?? String(row.target_price)}
                      onChange={(e) =>
                        setEditTargets((t) => ({
                          ...t,
                          [row.route]: e.target.value.replace(/[^0-9,]/g, ""),
                        }))
                      }
                      className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={savingRoute === row.route}
                    onClick={() => handleUpdateExisting(row)}
                    className="mt-4 w-full bg-brand text-ink font-semibold py-3 rounded-full ring-1 ring-black/10 hover:bg-brand-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    更新目標價
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
