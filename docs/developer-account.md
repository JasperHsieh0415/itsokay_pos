# Developer 帳號

Developer 擁有目前所有 admin 與 chef API 權限，登入任一入口取得的憑證可通行兩者。
一般 admin／chef 使用同一組密碼（users 中的 admin 密碼），但登入憑證只適用各自頁面的 API。
初始共用密碼使用 ADMIN_API_KEY；不再使用 CHEF_API_KEY。從 admin 帳號設定修改後，兩個入口都改用新密碼。
帳號名稱不會預填或顯示在前端，登入錯誤不透露帳號是否存在。

## 初始設定

1. 套用 `0006_create_users.sql` 與 `0007_add_developer_role.sql`。
   0007 保留既有帳號，增加 developer 角色，並限制最多一個 developer。
2. 伺服器設定 `DEVELOPER_USERNAME` 與 `DEVELOPER_PASSWORD`。
   本機值放在被 Git 忽略的 `.dev.vars`；請勿放在 `VITE_*` 變數或提交明碼。
   本次已在本機 `.dev.vars` 補上缺少的值：預設帳號 developer、隨機初始密碼。
   正式環境需自行透過 Cloudflare Secrets 設定：

   ```sh
   npx wrangler secret put DEVELOPER_USERNAME
   npx wrangler secret put DEVELOPER_PASSWORD
   ```

   帳號不可為保留名稱 admin 或 chef；developer 的登入憑證使用既有 `ADMIN_API_KEY` 簽署。
3. 在 admin 或 chef 的原密碼欄輸入 `帳號:密碼`（半形冒號），即可使用 developer 登入。
   畫面不顯示帳號欄、developer 選項或此輸入格式提示；後端仍完整驗證帳密與停用狀態。
   冒號後的密碼保留原樣，可包含其他冒號；一般共用密碼會優先以完整字串驗證。
   第一次成功登入會將加鹽密碼雜湊存入 users；不會覆寫已存在或停用的帳號。

## 修改與停用

Developer 可在 admin 的「帳號設定」修改自己的密碼；修改成功後，兩個入口的舊憑證皆失效。
一般 admin 的修改密碼 API 只操作自己的帳號，不會改到 developer。
修改後以資料庫密碼為準，環境變數的初始密碼無法覆蓋新密碼。

若要停用 developer，將該 users 資料列的 active 設為 0；停用後的既有憑證在下次請求時失效。
不要刪除資料列作為停用方式，因為仍存在的初始環境設定可再次建立帳號。
本次未對正式 D1 或 Cloudflare Secrets 執行變更。
