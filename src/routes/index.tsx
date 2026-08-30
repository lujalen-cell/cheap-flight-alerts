import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DEALFLIGHT 盯盤航空 — 便宜機票，自動幫你盯" },
      {
        name: "description",
        content:
          "設定出發地、目的地與目標價，DEALFLIGHT 全天候掃描廉航票價，價格一跌破立刻 email 通知你。免費、隨時取消。",
      },
      { property: "og:title", content: "DEALFLIGHT 盯盤航空 — 便宜機票，自動幫你盯" },
      {
        property: "og:description",
        content:
          "設定出發地、目的地與目標價，價格一跌破立刻 email 通知你。免費、隨時取消。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TICKER_DEALS = [
  { route: "TPE → NRT", price: "NT$5,200", was: "NT$8,900" },
  { route: "TPE → BKK", price: "NT$4,100", was: "NT$7,200" },
  { route: "TPE → ICN", price: "NT$4,800", was: "NT$9,100" },
  { route: "TPE → HND", price: "NT$5,600", was: "NT$9,800" },
];

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

const DEALS = [
  { tag: "限時", tagStyle: "brand" as const, date: "3/18 出發", route: ["TPE", "NRT"], meta: "東京 · 單程 · 經濟艙", price: "NT$5,200", was: "NT$8,900", off: "-42%" },
  { tag: "降價 45%", tagStyle: "gold" as const, date: "3/22 出發", route: ["TPE", "BKK"], meta: "曼谷 · 單程 · 經濟艙", price: "NT$4,100", was: "NT$7,200", off: "-43%" },
  { tag: "限時", tagStyle: "brand" as const, date: "3/25 出發", route: ["TPE", "ICN"], meta: "首爾 · 單程 · 經濟艙", price: "NT$4,800", was: "NT$9,100", off: "-47%" },
  { tag: "降價 30%", tagStyle: "gold" as const, date: "3/28 出發", route: ["TPE", "HND"], meta: "東京 · 單程 · 經濟艙", price: "NT$5,600", was: "NT$9,800", off: "-43%" },
  { tag: "限時", tagStyle: "brand" as const, date: "4/02 出發", route: ["TPE", "CGK"], meta: "雅加達 · 單程 · 經濟艙", price: "NT$6,300", was: "NT$11,000", off: "-43%" },
  { tag: "降價 38%", tagStyle: "gold" as const, date: "4/05 出發", route: ["TPE", "SIN"], meta: "新加坡 · 單程 · 經濟艙", price: "NT$4,500", was: "NT$7,800", off: "-42%" },
];

const STEPS = [
  { num: "01", title: "設定目標價", desc: "選航線、定你能接受的低價，留下 email 就好。", accent: "border-brand" },
  { num: "02", title: "我們幫你盯盤", desc: "系統每 30 秒掃描各家票價，比價、追蹤、記下每一跳。", accent: "border-gold" },
  { num: "03", title: "到價立刻通知", desc: "一低於目標，手機先響。快一步，就是便宜一截。", accent: "border-brand-2" },
];

function ChromeDot({ size = "size-5" }: { size?: string }) {
  return <span className={`inline-block ${size} rounded-full chrome ring-1 ring-black/20`} />;
}

function Index() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [destination, setDestination] = useState("NRT");
  const [targetPrice, setTargetPrice] = useState("5000");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseInt(targetPrice.replace(/,/g, ""), 10);
    if (!price || price <= 0) {
      toast.error("請輸入有效的目標價");
      return;
    }
    if (!user) {
      toast.info("先登入，才能幫你盯這條航線");
      navigate({ to: "/auth" });
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
    setSubmitted(true);
    toast.success(`已開始監控 TPE → ${destination}，低於 NT$${price.toLocaleString()} 立刻通知你`);
  }

  return (
    <div className="min-h-screen bg-paper font-body text-ink antialiased">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-ink text-cream">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <ChromeDot />
            <span className="font-display text-lg tracking-wide">DEALFLIGHT</span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-cream/50">TPE.行情</span>
          </a>
          <nav className="hidden sm:flex items-center gap-7 font-mono text-xs tracking-wider text-cream/70">
            <a href="#deals" className="hover:text-cream">行情</a>
            <a href="#alert" className="hover:text-cream">訂閱</a>
            <a href="#how" className="hover:text-cream">怎麼運作</a>
          </nav>
          {user ? (
            <Link
              to="/alerts"
              className="font-mono text-xs tracking-wider bg-brand text-cream px-4 py-2 rounded-full ring-1 ring-white/15 hover:bg-brand-2 transition-colors"
            >
              我的提醒
            </Link>
          ) : (
            <Link
              to="/auth"
              className="font-mono text-xs tracking-wider bg-brand text-cream px-4 py-2 rounded-full ring-1 ring-white/15 hover:bg-brand-2 transition-colors"
            >
              登入 / 註冊
            </Link>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="bg-ink text-cream relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-20">
          <div className="rv flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-gold">
            <span className="size-2 rounded-full bg-brand live" /> LIVE · 即時機票行情
          </div>
          <h1 className="rv [animation-delay:80ms] font-display leading-[0.98] mt-5 text-[clamp(2.6rem,8vw,6rem)] tracking-tight text-balance chrome-text">
            便宜機票，自動幫你盯
          </h1>
          <p className="rv [animation-delay:160ms] mt-5 max-w-xl font-body text-cream/70 text-pretty">
            盯盤式盯價。目標價設好，價格一跳，我們比誰都快推給你——不用搶、不用刷，撿到就是賺到。
          </p>

          {/* TICKER */}
          <div className="rv [animation-delay:240ms] mt-10 rounded-2xl bg-paper-2 border border-line overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-ink-soft text-cream/80 font-mono text-[11px] tracking-wider">
              <span>TOP DEALS · TPE 出發</span>
              <span className="text-gold">每 30 秒更新</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line">
              {TICKER_DEALS.map((d) => (
                <div key={d.route} className="p-4">
                  <div className="font-mono text-xs text-ink/60">{d.route}</div>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="font-display text-3xl text-brand">{d.price}</span>
                  </div>
                  <div className="font-mono text-[11px] text-ink/50 line-through">{d.was}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ALERT FORM */}
      <section id="alert" className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="rv grid lg:grid-cols-[1fr_1.15fr] gap-10 items-center">
            <div>
              <div className="font-mono text-xs tracking-[0.25em] text-brand">(a) 設定目標價</div>
              <h2 className="font-display text-4xl mt-3 leading-tight text-balance">價格一跳水，手機先響。</h2>
              <p className="mt-4 text-ink/60 max-w-md text-pretty">
                填好出發、目的地跟你能接受的目標價。低於它，我們立刻推通知給你。免搶票、免熬夜刷價。
              </p>
            </div>

            {submitted ? (
              <div className="rounded-3xl bg-cream ring-1 ring-black/5 p-8 text-center">
                <div className="mx-auto size-12 rounded-full bg-teal/10 ring-1 ring-teal/30 grid place-items-center">
                  <span className="font-display text-teal text-xl">✓</span>
                </div>
                <h3 className="font-display text-2xl mt-4">監控已啟動</h3>
                <p className="mt-2 text-sm text-ink/60">
                  TPE → {destination}，價格低於 NT$
                  {parseInt(targetPrice.replace(/,/g, ""), 10).toLocaleString()} 時，
                  第一時間寄信到你的帳號信箱。
                </p>
                <div className="mt-6 flex items-center justify-center gap-4">
                  <Link
                    to="/alerts"
                    className="font-mono text-xs tracking-wider bg-ink text-cream px-4 py-2 rounded-full ring-1 ring-white/15 hover:bg-ink-soft transition-colors"
                  >
                    管理我的提醒
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="font-mono text-xs tracking-wider text-ink/50 underline underline-offset-4 hover:text-ink cursor-pointer"
                  >
                    再設定一條航線
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-3xl bg-cream ring-1 ring-black/5 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="font-mono text-[11px] tracking-wider text-ink/50">出發</span>
                    <div className="mt-1 font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 text-ink/60">台北 TPE</div>
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
                  <label className="block">
                    <span className="font-mono text-[11px] tracking-wider text-ink/50">目標價 (NT$)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value.replace(/[^0-9,]/g, ""))}
                      className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </label>
                  <div className="block">
                    <span className="font-mono text-[11px] tracking-wider text-ink/50">通知信箱</span>
                    <div className="mt-1 font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 text-ink/60 truncate">
                      {user ? user.email : "登入帳號的 Email"}
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-5 w-full bg-brand text-cream font-semibold py-3 rounded-full ring-1 ring-white/15 hover:bg-brand-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {user ? "監控這條航線" : "登入後開始監控"}
                </button>
                <p className="mt-3 text-center font-mono text-[11px] text-ink/40">免費 · 隨時取消 · 到價才通知</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* DEAL GRID */}
      <section id="deals" className="bg-paper-2 border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="font-mono text-xs tracking-[0.25em] text-brand">(b) 現行行情</div>
              <h2 className="font-display text-4xl mt-2">現在就降的便宜票</h2>
            </div>
            <span className="font-mono text-xs text-ink/50">6 條航線 · 更新於 14:32</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEALS.map((d, i) => (
              <div
                key={d.route.join("")}
                className="rv group bg-cream rounded-2xl ring-1 ring-black/5 p-5 hover:-translate-y-1 transition-transform"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                      d.tagStyle === "brand" ? "bg-brand text-cream" : "bg-gold text-ink"
                    }`}
                  >
                    {d.tag}
                  </span>
                  <span className="font-mono text-[11px] text-ink/40">{d.date}</span>
                </div>
                <div className="mt-3 font-display text-2xl tracking-tight">
                  {d.route[0]} <span className="text-ink/30">→</span> {d.route[1]}
                </div>
                <div className="mt-1 font-mono text-xs text-ink/50">{d.meta}</div>
                <div className="mt-4 flex items-end gap-3">
                  <span className="font-display text-4xl text-brand">{d.price}</span>
                  <span className="font-mono text-xs text-ink/40 line-through mb-1">{d.was}</span>
                  <span className="font-mono text-[11px] text-teal mb-1">{d.off}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS + FOOTER */}
      <section id="how" className="bg-ink text-cream">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="font-mono text-xs tracking-[0.25em] text-gold">(c) 怎麼運作</div>
          <h2 className="font-display text-4xl mt-2 max-w-2xl text-balance">盯盤三步，到價就出手。</h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                className={`rv border-l-2 ${s.accent} pl-4`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="font-mono text-xs text-gold">{s.num}</div>
                <div className="font-display text-xl mt-1">{s.title}</div>
                <p className="mt-2 text-sm text-cream/60">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <footer className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ChromeDot size="size-4" />
              <span className="font-display tracking-wide">DEALFLIGHT</span>
            </div>
            <span className="font-mono text-[11px] text-cream/40">只是通知，不是訂票 · 價格僅供參考 · © 2026</span>
          </div>
        </footer>
      </section>
    </div>
  );
}
