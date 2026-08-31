# Lovable → GitHub → Vercel → Supabase 部署避坑手冊

> 根據「一人公司線上課程」實作 cheap-flight-alerts 專案時，實際踩過的坑整理而成。
> 目的：下次做同類型專案（Lovable 起手 → 自己的 GitHub + Vercel + Supabase 部署，含 Google OAuth）時，
> 依照下面的檢查清單「主動排查」，不要等出事才一個一個修。

---

## 0. 這份文件怎麼用

每次接到「幫我把 Lovable 專案部署到 Vercel／設定 OAuth／串 Supabase」這類任務時：

1. 先把下面每一節的檢查項目當成 TODO list 過一遍，**不要等使用者回報錯誤才查**。
2. 每完成一個階段（部署、OAuth、資料庫），一定要做「第 6 節：端對端驗證」，不能只看設定畫面顯示綠燈或沒有紅字就當作完成。
3. 遇到「畫面上看起來都填對了，但功能還是不行」的情況，優先懷疑「有其他隱藏的必填欄位」或「設定沒有真的存到後端」，方法見第 5 節。

---

## 1. Git / GitHub 相關陷阱

### 1.1 Feature branch 沒有 merge 進 main（這次浪費最多時間的坑）

**問題**：在 feature branch（例如 `vite-spa-conversion`）上做了一連串修正並且回報「修好了」，但 Vercel 的 Production 部署是接 `main` branch，這些修正其實從來沒有真的上線。使用者實測還是跟修之前一樣的錯誤。

**排查方式**：
- 每次 push 完，**不要只看「有 push 成功」**，要確認是 push 到哪個 branch。
- `git branch -a` 檢查目前有哪些 branch，確認修正是不是只存在於某個 feature branch。
- 用 Vercel 的 `list_deployments` 核對最新 Production deployment 的 `githubCommitSha` / `githubCommitRef`，是不是等於你剛剛 push 的 commit、且 `target: "production"`、`githubCommitRef: "main"`。
- 如果不是，代表這次修正根本沒有部署上去，要 `git checkout main && git merge --ff-only <feature-branch> && git push`。

### 1.2 Cowork 雲端環境無法直接 `git push` 到使用者的 GitHub

**問題**：Cowork 的雲端 container 有 git proxy 限制，會出現：
```
remote: access denied by the git proxy: <repo> is not in this session's authorized repository set
```

**解法（device-bridge bundle workflow）**：
1. 雲端環境內 `git bundle create /tmp/xxx.bundle main`
2. `SendUserFile` 把 bundle 送到對話裡，拿到 `file_uuid`
3. `device_commit_files` 把 bundle 寫進使用者電腦上已連接資料夾（例如 Downloads）
4. 用 `device_bash` 在使用者電腦上：
   - 找到（或重新 clone）本機的 repo
   - `git fetch <bundle路徑> main:incoming-branch`
   - `git checkout main && git merge --ff-only incoming-branch`
   - `git push https://<user>:<PAT>@github.com/<owner>/<repo>.git main:main`
5. 輸出記得用 `sed -E 's#https://[^@]*@#https://***@#g'` 把 PAT 從 log 裡遮掉。
6. 前提：使用者的電腦要有連結（remote-devices 工具可用），且該 repo 本機要有 clone 過，或用這個 bundle 流程重新 clone。

### 1.3 PAT（Personal Access Token）衛生

**問題**：整個專案期間重複使用同一組 PAT，多次以明碼形式出現在對話與指令紀錄裡，變成長期掛在外面、沒有 expiry 的風險缺口。而且這個 repo 有接 Vercel 自動部署，PAT 外流 = 有人可以直接 push 惡意程式碼到正式網站。

**下次做法**：
- 每次需要 push 時才請使用者臨時開一組新的 PAT。
- 用完立刻請使用者去 revoke，不要留著重複用。
- 不要把 PAT 寫進任何檔案、memory、或長期保存的地方。

---

## 2. Vercel 部署檢查

- 確認 Vercel Project 是接對 GitHub repo，且 Production 環境對應的是 `main` branch（不是其他 branch）。
- 環境變數（例如 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`）要親自去 Vercel Dashboard 的 Environment Variables 頁面核對，確認是指到「使用者自己的」 Supabase project，不是 Lovable 自動建立的那個（Lovable Cloud 專案通常會有自己的一組 auto-provision 的 Supabase URL，遷移時很容易漏改）。
- 每次修改後，用 `list_deployments` 確認有沒有真的觸發新的 Production deployment，並核對 commit SHA 是最新的。

---

## 3. Supabase 設定檢查（這次最後才發現的大坑，優先度應該提高）

### 3.1 Authentication → URL Configuration（幾乎每個新專案都會漏）

**問題**：Supabase 專案剛建立時，`Site URL` 預設是 `http://localhost:3000`，`Redirect URLs` 允許清單是空的。就算 OAuth（Google 等）設定完全正確、也拿到授權，Supabase 登入成功後要把使用者導回網站時，因為正式網域不在允許清單裡，會**退回預設的 localhost**，導致瀏覽器出現「拒絕連線 / ERR_CONNECTION_REFUSED」。這個症狀很容易被誤判成「OAuth 設定有問題」，但其實 OAuth 那段完全沒事。

**下次直接主動檢查（不要等使用者回報才查）**：
1. 進 Supabase Dashboard → Authentication → URL Configuration
2. `Site URL` 改成正式網域，例如 `https://your-app.vercel.app`
3. `Redirect URLs` 加入：
   - `https://your-app.vercel.app/**`（萬用字元，涵蓋所有路徑）
   - `https://your-app.vercel.app`（裸網域）
4. 存檔後，一定要實際跑一次登入流程驗證會導到正確頁面，不能只看設定畫面顯示存檔成功。

### 3.2 Authentication → Providers（例如 Google）

**問題**：Provider 面板的 Client ID 欄位可能殘留錯誤的 placeholder（例如不小心貼成 Supabase 專案的顯示名稱，而不是真正的 Google OAuth Client ID），會出現：
```
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: missing OAuth secret"}
```

**檢查方式**：進 Providers 面板，把 Client ID / Client Secret 欄位的值跟 Google Cloud Console 建立的 OAuth Client 資訊逐字核對，不要相信畫面上「看起來有填」。

---

## 4. Google OAuth Consent Screen 設定檢查

### 4.1 建立 OAuth Client 時

- Authorized JavaScript origins：填正式網域（`https://your-app.vercel.app`）
- Authorized redirect URIs：**必須跟 Supabase Providers 頁面顯示的 Callback URL 完全一致**（通常是 `https://<project-ref>.supabase.co/auth/v1/callback`）

### 4.2 發布到 Production 前的隱藏必填欄位

**問題**：Google Cloud Console 的「發布應用程式」按鈕即使所有「看起來有星號」的欄位都填了，還是會顯示「應用程式的 OAuth 設定未完成」，但不會直接告訴你哪個欄位缺。

**排查方式（重要）**：畫面上的錯誤訊息不夠具體時，**直接點下那個已停用（disabled）的按鈕本身**，通常會跳出 tooltip 講出真正卡住的完整清單。這次實測發現：

> 必須提供有效的應用程式名稱、支援電子郵件地址、首頁網址**和隱私權政策網址**，才能將應用程式切換為外部正式環境模式。

其中「隱私權政策連結」欄位在畫面上沒有標星號，但實際上是 Production 發布的硬性條件。**下次直接假設隱私權政策連結是必填**，優先檢查網站上有沒有這個頁面（例如 `/privacy`），沒有的話要先建立（誠實描述實際資料蒐集行為，不能是假連結或空白頁），部署後再回來填。

### 4.3 不要上傳 App Logo

除非已經準備好要走完整的 Google 審核驗證流程，否則**不要上傳 Logo**。品牌頁面本身有寫：「上傳標誌之後，您必須將應用程式送交驗證，但應用程式設為僅供內部使用或發布狀態為『測試中』除外。」上傳 Logo 會讓「不經審核直接發布」這條路徑失效。

### 4.4 Testing 模式的使用者上限

新建的 OAuth App 預設是「測試中」狀態，只有加進「測試使用者」名單的帳號可以登入，連開發者自己的帳號都不例外。要嘛先加測試帳號讓開發者能測試，要嘛確認需求後直接發布到 Production（會跳出「未經 Google 驗證」的警示畫面，但只要沒有要求機密／受限制範圍、沒有 Logo、網域數量在 10 個以內，就不需要走完整驗證）。

### 4.5 資料存取權（Scopes）要手動加

`資料存取權` 頁面預設是空的，不會自動帶入 `email` / `profile` / `openid` 這些基本 scope，要手動用「新增或移除範圍」勾選並儲存。存檔後建議重新整理頁面確認真的存進去了（曾經發生過存檔動作沒有真的生效、下次進來又變回空清單的狀況）。

---

## 5. Google Cloud Console 除錯方法論

- 很多「XX 未完成」類型的錯誤訊息，畫面上不會直接列出缺什麼，**去點擊那個被停用的按鈕本身**，通常會跳出完整清單的 tooltip。
- 讀取畫面上的長字串（例如 Client ID / Secret）時，如果截圖出現殘影或重疊亂碼，改用 `read_page` 搭配該元素的 `ref_id` 直接讀文字節點，比截圖辨識可靠。
- 畫面上常有 promo banner／tooltip 會讓版面往下推移，導致按照舊座標點擊會點到別的東西（例如不小心點開全域搜尋框、打字打進搜尋欄）。**每次點擊前如果畫面剛跳轉或剛關閉過彈窗，重新截圖確認當下座標再點**。

---

## 6. 每個階段收尾前，一定要做「端對端驗證」

這是這次最大的教訓：**設定畫面顯示「已儲存」「無錯誤」，不代表功能真的能用。**

- OAuth 設定完＝實際去網站點一次登入按鈕，確認真的能跳到 Google 選帳戶畫面，且能選帳戶登入成功、導回正確頁面（不是 404、不是 localhost 連線失敗）。
- 部署完＝實際打開部署後的網址，確認新功能／新頁面真的存在（不是 404 fallback）。
- 任何一次「我修好了」的結論，前面都應該先有一次「我實測過了」的動作。

---

## 7. 一般性提醒

- 任何要正式對外、會蒐集使用者資料（email、OAuth 登入資訊等）的網站，上線前要有真實的隱私權政策頁面，內容要對應網站實際的資料蒐集行為，不能用假連結或複製別人的內容交差。這份政策不是律師審過的正式法律文件，只是技術性基本版，之後蒐集的資料類型變多（例如加了廣告追蹤、金流）要記得回來更新。
- 任何長期存在的憑證（PAT、API Key）只要在對話紀錄裡明碼出現過，就要當作有外流風險處理，用完即撤銷／輪替，不要長期複用。
