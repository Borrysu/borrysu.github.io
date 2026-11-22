# borrysu.github.io

老大的面板與小 app 總倉庫，網址 https://borrysu.github.io/ 。一個子資料夾一個面板：

| 子資料夾 | 面板 | 網址 | 舊倉庫（已轉址） |
|---|---|---|---|
| `current/` | 逐流 Current（原機會雷達、通告板） | https://borrysu.github.io/current/ | Borrysu/borry-opportunities |
| `kakeibo/` | 塔塔記帳 | https://borrysu.github.io/kakeibo/ | Borrysu/borry-kakeibo |
| `qiyu/` | 器宇（系統全景面板，正本在大器工作區 系統盤點與統一規則/AI工作夾/02_Render/1122_系統架構面板_琉璃定稿，產生定稿.py 產出） | https://borrysu.github.io/qiyu/ | 無 |

- 2026-11-20 用 `git subtree add` 連歷史複製進來（取當時 GitHub main 的已上線版本）。
- 2026-11-20 起這裡是正本。舊倉庫 borry-opportunities、borry-kakeibo 的網址已換成轉址頁（保留 `?k=` 與 `#`），舊程式留在它們的 git 歷史；退回用舊倉庫的 tag `before-redirect-20261120`。
- 倉庫必須公開（GitHub Pages 免費方案），所以不放金鑰與個資。前端只用 Supabase publishable key；資料走 kakeibo Supabase 的函式（RPC／Edge Function）與分權鑰匙（使用者自己的 `?k=`），不寫進程式碼。
- 根目錄 `404.html` 會把 `/kakeibo/k/<金鑰>/` 轉成 `/kakeibo/?k=<金鑰>`。
