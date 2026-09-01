import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/components/protected-route";
import { useDocumentHead } from "@/hooks/use-document-head";

const API_BASE = "https://h68xudyvad.execute-api.us-east-1.amazonaws.com";

const PLANS = [
  {
    plan_name: "tokyo" as const,
    route: "TPE-TYO",
    label: "台北 ✈ 東京",
    defaultTarget: "9000",
  },
  {
    plan_name: "seoul" as const,
    route: "TPE-SEL",
    label: "台北 ✈ 首爾",
    defaultTarget: "5800",
  },
];

// Travelpayouts 回傳的是 IATA 航空公司代碼，這裡對照常見的幾家轉成中文名稱，
// 沒對照到的代碼就直接顯示代碼本身，不會讓畫面空白。
const AIRLINE_NAMES: Record<string, string> = {
  CI: "中華航空",
  BR: "長榮航空",
  JX: "星宇航空",
  IT: "台灣虎航",
  MM: "樂桃航空",
  NH: "全日空",
  JL: "日本航空",
  GK: "捷星日本",
  TR: "酷航",
  VJ: "越捷航空",
  KE: "大韓航空",
  OZ: "韓亞航空",
  "7C": "濟州航空",
  TW: "德威航空",
  LJ: "真航空",
  ZE: "易斯達航空",
  BX: "釜山航空",
  RS: "永宗航空",
};

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
  plan_name: string;
  target_price: number;
  currency: string;
};

export default function PlansPage() {
  useDocumentHead({
    title: "訂閱方案 — DEALFLIGHT 盯盤航空",
    description: "訂閱台北飛東京、首爾的降價通知，設定目標價，到價立刻寄信給你。",
  });

  const { user } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [targets, setTargets] = useState<Record<string, string>>(() =>
    Object.fromEntries(PLANS.map((p) => [p.plan_name, p.defaultTarget]))
  );

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

  const subscribedByPlan = new Map((subscriptions ?? []).map((s) => [s.plan_name, s]));

  const cheapestQueries = useQueries({
    queries: PLANS.map((plan) => ({
      queryKey: ["m1_cheapest", plan.route],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/cheapest?route=${plan.route}`);
        if (!res.ok) throw new Error("failed to load cheapest fare");
        return (await res.json()) as CheapestFare;
      },
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  async function handleSubscribe(planName: string) {
    const price = parseInt((targets[planName] ?? "").replace(/,/g, ""), 10);
    if (!price || price <= 0) {
      toast.error("請輸入有效的目標價");
      return;
    }
    setSavingPlan(planName);
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, plan_name: planName, target_price: price }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      toast.success("已開始追蹤，到價會寄信通知你");
      await queryClient.invalidateQueries({ queryKey: ["m1_subscriptions", user.email] });
    } catch {
      toast.error("儲存失敗，請再試一次");
    } finally {
      setSavingPlan(null);
    }
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
            <Link
              to="/alerts"
              className="font-mono text-xs tracking-wider text-cream/70 hover:text-cream"
            >
              我的提醒
            </Link>
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
        <h1 className="font-display text-4xl mt-2">訂閱方案</h1>
        <p className="mt-2 text-ink/60 text-sm">
          選一條線、設定目標價，系統每 30 分鐘幫你比價，到價立刻寄信到{" "}
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

        {isLoading ? (
          <div className="mt-10 rounded-3xl bg-cream ring-1 ring-black/5 p-10 text-center font-mono text-xs text-ink/40">
            讀取中…
          </div>
        ) : (
          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            {PLANS.map((plan, idx) => {
              const subscribed = subscribedByPlan.get(plan.plan_name);
              const cheapestResult = cheapestQueries[idx];
              const cheapest = cheapestResult?.data;
              return (
                <div
                  key={plan.plan_name}
                  className="rounded-3xl bg-cream ring-1 ring-black/5 p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl">{plan.label}</h2>
                    </div>
                    {subscribed && (
                      <span className="shrink-0 font-mono text-[11px] px-3 py-1 rounded-full bg-teal/10 text-teal ring-1 ring-teal/30">
                        已訂閱
                      </span>
                    )}
                  </div>

                  {subscribed && (
                    <p className="mt-3 font-mono text-xs text-ink/60">
                      目前目標價 NT${Number(subscribed.target_price).toLocaleString()}
                    </p>
                  )}

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
                      目標價 (NT$)
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={targets[plan.plan_name]}
                      onChange={(e) =>
                        setTargets((t) => ({
                          ...t,
                          [plan.plan_name]: e.target.value.replace(/[^0-9,]/g, ""),
                        }))
                      }
                      className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={savingPlan === plan.plan_name}
                    onClick={() => handleSubscribe(plan.plan_name)}
                    className="mt-4 w-full bg-brand text-ink font-semibold py-3 rounded-full ring-1 ring-black/10 hover:bg-brand-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {subscribed ? "更新目標價" : "開始追蹤"}
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
