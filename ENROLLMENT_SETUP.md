# BrightHive Academic Studio 报名网站与家长课后班中心

报名网站已作为独立静态站点放在 `enrollment-site/`，首页为 `enrollment-site/index.html`。家长课后班中心仍由项目根目录 `index.html` 提供。两者可在同一个本地服务中分别访问：

- 家长课后班中心：`http://127.0.0.1:7892/index.html`
- 报名网站：`http://127.0.0.1:7892/enrollment-site/`

报名表通过 Supabase Edge Function `enrollment-request` 调用 Resend，将报名咨询发送到 `Brighthive168@gmail.com`。网站源码只包含 Supabase publishable key；Resend API key 只存于 Supabase Secrets。报名表本身不写入 Supabase 数据库。

## 启用自动邮件

启用需要一个 Resend API key、一个已经在 Resend 验证的发件邮箱/域名，以及 Supabase 项目访问权限。请不要把 API key 发到聊天或放到网页文件。

1. 在 Resend 验证你拥有的发件域名/邮箱并生成 API key。
2. 在 Supabase 项目 `hkbkkuwtcyvsmzvkfyeq` 的 **Edge Functions → Secrets** 中添加：
   - `RESEND_API_KEY`：Resend API key。
   - `RESEND_FROM_EMAIL`：该已验证域名下的发件人，例如 `BrightHive Academic Studio Admissions <admissions@your-verified-domain.com>`（替换为你实际验证的地址）。
   - `ALLOWED_ORIGINS`：网站来源；本地预览可填写 `http://127.0.0.1:7892`，正式部署后再加正式网站的 HTTPS 来源。
3. 部署 `supabase/functions/enrollment-request/index.ts` 到 Supabase 项目，函数名为 `enrollment-request`，并保持 `verify_jwt = false`（此公开报名表使用函数自身的来源检查、字段校验和 honeypot；不要把 service role key放进客户端）。
4. 从报名网站提交一条真实可识别为测试的信息，确认 `Brighthive168@gmail.com` 收到邮件，并核实回复地址指向表单填写的家长邮箱。

本环境目前没有检测到 Supabase CLI，也没有可用的 Resend 发件密钥/已验证发件邮箱，因此代码、目标邮箱和独立页面已准备好，但邮件发送要等上述 Secrets 配置并部署函数后才会实际启用。密钥由你直接在 Supabase Dashboard 的 Secrets 输入框中粘贴；配置后可再完成函数部署和端到端测试。


