# BrightHive Academic Studio · Supabase 正式环境

## 当前状态

网站已连接 Supabase，Google 登录、家长账号和教师账号均已启用。数据库使用 Row Level Security 区分家长与教师权限，不包含测试账号或示例业务数据。

## 账号流程

### 教师

1. 使用 Google 登录。
2. 首次登录选择“教师账号”，填写老师姓名和课后班私下提供的教师邀请码。
3. 验证成功后自动进入 `teacher.html` 教师管理中心。
4. 教师可以管理学生与家长关联、课程与分班、作业进度、测评成绩与评语、费用账单和课后班动态。

教师邀请码只在 Supabase 数据库函数中以 SHA-256 摘要验证，网页源码不保存明文。教师身份同时由数据库 `staff_users` 和 RLS 策略验证，不能通过修改浏览器页面获得管理权限。

### 家长

1. 使用 Google 登录。
2. 首次登录选择“家长账号”，输入家长邀请码 `GSLDI2`。
3. 填写家长姓名、家庭地址、联系电话，以及每个孩子的姓名、生日、学校和 1–6 年级；至少上传一份孩子最近的考试成绩（PDF、JPG、PNG 或 WebP，最多 10 MB）。
4. 家长资料和孩子档案保存后自动关联到家长 Google 账号，随后进入家长中心。

家庭资料迁移需在 Supabase Dashboard → SQL Editor 执行 `supabase-family-registration-migration.sql`。它会创建家庭登记表、私有成绩单存储桶及家长/教师访问策略。成绩文件不会公开；家长只能访问自己的文件，教师可从教师中心“学生与账号”查看已授权家庭的资料，并使用限时链接查看成绩单。

要启用教师上传考试照片、发布成绩和自动对比，再执行 `supabase-score-photo-results-migration.sql`。教师照片保存在私有存储中。照片文字识别在老师的浏览器本地运行；首次使用会从 Tesseract.js CDN 下载识别库和英文模型。系统只提供候选分数，老师需核对后才会发布。照片中如为手写或模糊分数，请老师手动修改识别结果。

如果更新后的登记页面提示家庭登记服务尚未启用，表示该 SQL 迁移还没有在 Supabase 执行。完成迁移后重新打开页面即可。

## 数据结构

- `profiles`、`staff_users`：账号资料和教师身份
- `students`、`parent_students`：学生档案和家长授权关联
- `classes`、`enrollments`、`schedule_items`：课程、分班和课表
- `assignments`、`assignment_progress`：作业和完成情况
- `exams`、`exam_results`：测评、成绩和老师评语
- `tuition_invoices`：费用账单、到期和逾期状态
- `family_conversations`、`family_chat_messages`：旧版聊天表，当前网站不再使用；如已存在请保留，避免丢失历史数据
- `messages`、`message_reads`：旧版通知数据；网站已不再使用，已有数据保留
- `academy_updates`：课后班动态
- `parent_state`：家长当前选择的学生

## 权限

- 家长只能读取与自己关联学生的数据。
- 教师可以在教师管理中心新增、更新和删除课后班业务记录。
- 家长不能修改课程、成绩、账单或课后班动态。
- Supabase publishable/anon key 可以在网页中使用；绝不要把 service_role key 放入网站文件。

网站已移除聊天和通知模块。旧版聊天表、通知表如已存在会保留，网站不会读取或修改其中的历史数据。新数据库可按需运行 `supabase-schema.sql`。

## Google OAuth

Supabase callback URL：

`https://hkbkkuwtcyvsmzvkfyeq.supabase.co/auth/v1/callback`

本地回调白名单（添加到 Supabase Dashboard > Authentication > URL Configuration > Redirect URLs）：

- 固定端口：`http://127.0.0.1:7892/**`
- 启动器检测到 7892 被占用并显示备用端口时：`http://127.0.0.1:*/**`

这两条是 Supabase 的回调白名单，不能粘贴到浏览器地址栏。浏览器应打开启动器显示的实际网址，通常是 `http://127.0.0.1:端口/index.html`。

正式部署后，把 Supabase 的 Site URL 和 Redirect URLs 改为正式网站域名，并在 Google Auth Platform 填写正式主页、隐私政策和服务条款地址。

## 本地运行

在网站文件夹启动静态服务器，然后访问：

`http://127.0.0.1:7892/`

不要直接双击 `index.html`，OAuth 回调需要 HTTP 地址。

## 动态照片上传

教师管理中心的“课后班动态”页面支持直接选择本地照片上传。照片保存在 Supabase Storage 的 `academy-updates` 公共读取桶中，只有已验证教师可以上传、更新或删除；单张照片上限为 8 MB，支持 JPEG、PNG、WebP 和 GIF。删除动态时，网站也会删除对应照片。


