import { Link } from "react-router-dom";
import { useDocumentHead } from "@/hooks/use-document-head";

const UPDATED = "2026年8月31日";
const CONTACT_EMAIL = "lu.jalen@gmail.com";

export default function PrivacyPage() {
  useDocumentHead({
    title: "隱私權政策 — DEALFLIGHT 盯盤航空",
    description: "DEALFLIGHT 盯盤航空的隱私權政策：我們蒐集哪些資料、如何使用，以及你的權利。",
  });

  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← 回首頁
        </Link>

        <h1 className="mt-6 text-3xl font-bold">隱私權政策</h1>
        <p className="mt-2 text-sm text-muted-foreground">最後更新：{UPDATED}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold text-foreground">一、我們是誰</h2>
            <p className="mt-2">
              DEALFLIGHT 盯盤航空（以下稱「本服務」）是一項機票比價通知服務，讓使用者設定目標航線與目標價格，
              當票價低於目標時即以 Email 通知使用者。本服務由禾嘉產業有限公司提供。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">二、我們蒐集哪些資料</h2>
            <p className="mt-2">當你註冊並使用本服務時，我們會蒐集以下資料：</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium text-foreground">帳號資訊：</span>
                若你使用 Google 登入，我們會取得 Google 提供的電子郵件地址、姓名與大頭貼網址，用於建立與識別你的帳號。
              </li>
              <li>
                <span className="font-medium text-foreground">個人設定：</span>
                你的顯示名稱、常用出發機場等偏好設定。
              </li>
              <li>
                <span className="font-medium text-foreground">機票通知設定：</span>
                你建立的每一筆比價提醒，包含出發地、目的地、目標價格與接收通知的 Email 地址。
              </li>
            </ul>
            <p className="mt-2">
              我們不會主動蒐集你的付款資訊、裝置定位或瀏覽行為，本服務目前也未使用任何廣告追蹤或分析工具。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">三、我們如何使用這些資料</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>驗證你的身分並讓你登入本服務</li>
              <li>依你設定的條件監控票價，並在到價時寄送通知 Email</li>
              <li>維護與改善本服務的功能與穩定性</li>
            </ul>
            <p className="mt-2">我們不會將你的個人資料出售給第三方，也不會用於與本服務無關的行銷用途。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">四、資料儲存與第三方服務</h2>
            <p className="mt-2">
              本服務使用以下第三方服務來運作，這些服務可能依其自身隱私權政策處理你的資料：
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium text-foreground">Supabase</span>
                ：用於帳號驗證與資料庫儲存。
              </li>
              <li>
                <span className="font-medium text-foreground">Google OAuth</span>
                ：用於提供「使用 Google 繼續」的登入方式。
              </li>
              <li>
                <span className="font-medium text-foreground">Vercel</span>
                ：用於網站託管。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">五、你的權利</h2>
            <p className="mt-2">你可以隨時：</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>在「機票提醒」頁面新增、修改或刪除你的比價提醒</li>
              <li>來信要求我們刪除你的帳號與所有相關資料</li>
              <li>來信查詢我們持有你的哪些個人資料</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">六、聯絡我們</h2>
            <p className="mt-2">
              若你對本隱私權政策或你的個人資料有任何問題，歡迎透過以下 Email 與我們聯絡：
              <br />
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">七、政策變更</h2>
            <p className="mt-2">
              我們可能不時更新本隱私權政策，更新後會顯示於本頁面並更新上方的「最後更新」日期。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
