# borrysu.github.io

老大的面板與小 app 總倉庫，網址 https://borrysu.github.io/ 。一個子資料夾一個面板：

| 子資料夾 | 面板 | 網址 | 來源（現役正本） |
|---|---|---|---|
| `current/` | 逐流 Current（原機會雷達、通告板） | https://borrysu.github.io/current/ | Borrysu/borry-opportunities |
| `kakeibo/` | 塔塔記帳 | https://borrysu.github.io/kakeibo/ | Borrysu/borry-kakeibo |

- 2026-11-20 用 `git subtree add` 連歷史複製進來（取當時 GitHub main 的已上線版本）。
- 舊倉庫 borry-opportunities、borry-kakeibo 與舊網址仍是現役正本；之後以哪邊為主，待老大定。定之前不要只改這裡。
- 倉庫必須公開（GitHub Pages 免費方案），所以不放金鑰與個資。前端只用 Supabase publishable key；資料走 kakeibo Supabase 的函式（RPC／Edge Function）與分權鑰匙（使用者自己的 `?k=`），不寫進程式碼。
- 根目錄 `404.html` 會把 `/kakeibo/k/<金鑰>/` 轉成 `/kakeibo/?k=<金鑰>`。
