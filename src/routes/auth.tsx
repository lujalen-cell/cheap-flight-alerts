import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "登入 / 註冊 — DEALFLIGHT 盯盤航空" },
      {
        name: "description",
        content: "登入 DEALFLIGHT，設定航線目標價，便宜機票一跌破立刻 email 通知你。",
      },
      { property: "og:title", content: "登入 / 註冊 — DEALFLIGHT 盯盤航空" },
      { property: "og:description", content: "登入 DEALFLIGHT，設定航線目標價，到價立刻通知。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/alerts", replace: true });
    });
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google 登入失敗，請再試一次");
      return;
    }
    if (result.redirected) return; // browser is navigating to Google
    setBusy(false);
    navigate({ to: "/alerts" });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("請輸入有效的 Email 地址");
      return;
    }
    if (password.length < 6) {
      toast.error("密碼至少 6 碼");
      return;
    }
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        toast.error("登入失敗：帳號或密碼錯誤");
        return;
      }
      toast.success("登入成功");
      navigate({ to: "/alerts" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: displayName || undefined },
        },
      });
      setBusy(false);
      if (error) {
        toast.error(`註冊失敗：${error.message}`);
        return;
      }
      if (!data.session) {
        setCheckEmail(true);
        return;
      }
      toast.success("註冊成功");
      navigate({ to: "/alerts" });
    }
  }

  return (
    <div className="min-h-screen bg-ink text-cream font-body antialiased flex flex-col">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="inline-block size-5 rounded-full chrome ring-1 ring-black/20" />
            <span className="font-display text-lg tracking-wide">DEALFLIGHT</span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-cream/50">TPE.行情</span>
          </Link>
          <Link to="/" className="font-mono text-xs tracking-wider text-cream/60 hover:text-cream">
            ← 回首頁
          </Link>
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-5 py-14">
        <div className="w-full max-w-md">
          <div className="font-mono text-xs tracking-[0.25em] text-gold text-center">MEMBER ACCESS</div>
          <h1 className="font-display text-4xl text-center mt-3 chrome-text">
            {checkEmail ? "去收信吧" : mode === "signin" ? "登入盯盤室" : "加入盯盤室"}
          </h1>

          {checkEmail ? (
            <div className="mt-8 rounded-3xl bg-cream text-ink ring-1 ring-black/5 p-8 text-center">
              <div className="mx-auto size-12 rounded-full bg-teal/10 ring-1 ring-teal/30 grid place-items-center">
                <span className="font-display text-teal text-xl">✓</span>
              </div>
              <p className="mt-4 text-sm text-ink/70">
                確認信已寄到 <span className="font-mono">{email}</span>
                ，點信裡的連結完成註冊後再回來登入。
              </p>
              <button
                type="button"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                }}
                className="mt-6 font-mono text-xs tracking-wider text-ink/50 underline underline-offset-4 hover:text-ink cursor-pointer"
              >
                回到登入
              </button>
            </div>
          ) : (
            <div className="mt-8 rounded-3xl bg-cream text-ink ring-1 ring-black/5 p-6">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-ink text-cream font-semibold py-3 rounded-full ring-1 ring-white/15 hover:bg-ink-soft transition-colors disabled:opacity-50 cursor-pointer"
              >
                <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                使用 Google 繼續
              </button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-ink/10" />
                <span className="font-mono text-[11px] text-ink/40">或用 Email</span>
                <span className="h-px flex-1 bg-ink/10" />
              </div>

              <form onSubmit={handleEmail} className="space-y-4">
                {mode === "signup" && (
                  <label className="block">
                    <span className="font-mono text-[11px] tracking-wider text-ink/50">顯示名稱（選填）</span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="常旅客小明"
                      className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-ink/40"
                    />
                  </label>
                )}
                <label className="block">
                  <span className="font-mono text-[11px] tracking-wider text-ink/50">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@mail.tw"
                    className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-ink/40"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[11px] tracking-wider text-ink/50">密碼</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 碼"
                    className="mt-1 w-full font-mono text-sm bg-paper-2 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-ink/40"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-brand text-cream font-semibold py-3 rounded-full ring-1 ring-white/15 hover:bg-brand-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {mode === "signin" ? "登入" : "建立帳號"}
                </button>
              </form>

              <p className="mt-4 text-center font-mono text-[11px] text-ink/50">
                {mode === "signin" ? "還沒有帳號？" : "已經有帳號了？"}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="ml-1 text-brand underline underline-offset-4 hover:text-brand-2 cursor-pointer"
                >
                  {mode === "signin" ? "免費註冊" : "直接登入"}
                </button>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
