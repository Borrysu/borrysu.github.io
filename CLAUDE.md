# borrysu.github.io｜AI 工作須知

這是老大的面板與小 app 總倉庫（GitHub Pages 使用者站，main 根目錄部署）。一個子資料夾一個面板：`current/`＝逐流 Current，`kakeibo/`＝塔塔記帳。新面板開新子資料夾，並在根目錄 `index.html` 加一張卡、在 README 表格加一列。

規則：
1. 倉庫公開。不放 service_role、私鑰、個人存取權杖、密碼、`.env`、個資。前端只准用 Supabase publishable key；資料一律走 kakeibo Supabase 的函式與分權鑰匙。push 前先 grep 一次。
2. 子資料夾內一律用相對路徑（`sw.js`、`manifest.json`、`icons/…`），不寫 `/borry-opportunities/` 這種絕對路徑，面板才能在任何子路徑獨立運作。
3. 2026-11-20 起這裡是正本（老大在決定卡選「新倉庫當正本，舊的轉址」）。舊倉庫 Borrysu/borry-opportunities 與 Borrysu/borry-kakeibo 的網站入口已換成轉址頁（轉到 /current/、/kakeibo/，保留 ?k= 與 #），舊程式留在它們的 git 歷史，不要再改舊倉庫。退回：舊倉庫有 tag `before-redirect-20261120`，`git revert` 轉址那個 commit 即可。
4. 改既有檔案前照大器規則先列出要改什麼。
