const pages = [
  ['progress', '↗', 'Progress', '成绩与进步', 'menu-assessments.png?v=3']
];

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const currentLanguage = localStorage.getItem('gsa-language') === 'en' ? 'en' : 'zh';
const isEnglish = currentLanguage === 'en';
const tr = (zh, en) => isEnglish ? en : zh;
const dateLocale = isEnglish ? 'en-US' : 'zh-CN';
let onboardingAccountType = 'parent';
let parentCodeVerified = false;

function initTechTitle() {
  const title = $('.tech-title');
  if (!title) return;
  const lettersHost = title.querySelector('.tech-letters');
  const selection = title.querySelector('.tech-selection');
  const label = title.querySelector('.tech-label');
  const specks = title.querySelector('.tech-specks');
  const characters = Array.from(tr('欢迎加入', 'Welcome'));
  lettersHost.innerHTML = characters.map((char, index) => `<span class="tech-letter" data-tech-index="${index}">${char}</span>`).join('');
  specks.innerHTML = Array.from({ length: 10 }, (_, index) => `<span style="--n:${index}"></span>`).join('');
  const letters = [...lettersHost.children];
  let activeIndex = 0;
  let timer;

  const activate = index => {
    activeIndex = (index + letters.length) % letters.length;
    letters.forEach((letter, i) => letter.classList.toggle('is-active', i === activeIndex));
    const active = letters[activeIndex];
    const titleBox = title.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    selection.style.setProperty('--frame-x', `${box.left - titleBox.left - 6}px`);
    selection.style.setProperty('--frame-y', `${box.top - titleBox.top - 4}px`);
    selection.style.setProperty('--frame-w', `${box.width + 12}px`);
    selection.style.setProperty('--frame-h', `${box.height + 8}px`);
    label.textContent = `${active.textContent}  ${Math.round(box.width)} × ${Math.round(box.height)}`;
  };

  const play = () => {
    clearInterval(timer);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => activate(activeIndex + 1), 900);
  };

  letters.forEach((letter, index) => {
    letter.addEventListener('pointerenter', () => { clearInterval(timer); activate(index); });
    letter.addEventListener('pointerleave', play);
    letter.addEventListener('pointerdown', () => activate(index));
  });
  new ResizeObserver(() => activate(activeIndex)).observe(title);
  requestAnimationFrame(() => { activate(0); play(); });
}

initTechTitle();

const driftPlane = $('#drift-plane');
function ensureDriftWall() {
  if (!driftPlane || driftPlane.childElementCount) return;
  driftPlane.innerHTML = Array.from({ length: 5 }, (_, column) => {
    const speed = [40, 49, 36, 46, 42][column];
    const delay = [3, 18, 10, 26, 7][column];
    const tiles = Array.from({ length: 10 }, () => '<span class="drift-tile"><img src="brighthive-logo.png?v=1" alt="" decoding="async" fetchpriority="low"></span>').join('');
    return `<div class="drift-column" style="--speed:${speed}s;--delay:${delay}s">${tiles}</div>`;
  }).join('');
}
const tones = ['green', 'blue', 'orange', 'purple'];
const weekdays = isEnglish ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const pageSubtitles = {
  home: tr('陪伴每一步成长，开启美好的学习一天。', 'Supporting every step toward a brighter day of learning.'),
  progress: tr('按科目查看上次与本次成绩、历史最高成绩、满分率和历次测评。', 'Compare previous and current scores by subject, highest score, perfect-score rate, and assessment history.'),
  updates: tr('查看老师发布的课堂活动、学习花絮和课后班动态。', 'See classroom activities, learning moments, and academy news.'),
  homework: tr('查看老师发布的作业、截止日期和最后更新时间。', 'Review assignments, due dates, and the latest teacher updates.'),
  attendance: tr('查看每天到校、离校、请假和缺席记录以及课程时间。', 'Review daily attendance, check-in, check-out, and class times.'),
  tuition: tr('查看费用账单、到期日期和缴费状态。', 'Review fees, due dates, and payment status.')
};

function applyLanguageUI() {
  document.documentElement.lang = isEnglish ? 'en' : 'zh-CN';
  document.title = tr('BrightHive Academic Studio · 课后班家长中心', 'BrightHive Academic Studio · Parent Portal');
  document.querySelectorAll('[data-language-toggle]').forEach(button => {
    button.textContent = isEnglish ? '中文' : 'English';
    button.setAttribute('aria-label', isEnglish ? '切换到中文' : 'Switch to English');
  });
  const googleButton = $('.social-login button');
  if (googleButton?.lastChild) googleButton.lastChild.textContent = tr('使用 Google 登录', 'Continue with Google');
  const loginSubtitle = $('.login-site-subtitle span');
  if (loginSubtitle) loginSubtitle.textContent = tr('课后学习家长与教师中心', 'A brighter start, every day');
  const onboarding = $('#onboarding-form');
  if (onboarding) {
    onboarding.querySelector('.onboarding-kicker').textContent = tr('BrightHive Academic Studio', 'BrightHive Academic Studio');
    const typeButtons = onboarding.querySelectorAll('[data-account-type]');
    if (typeButtons[0]) typeButtons[0].innerHTML = `<span>${tr('家长账号','Parent account')}</span><small>Parent</small>`;
    if (typeButtons[1]) typeButtons[1].innerHTML = `<span>${tr('教师账号','Teacher account')}</span><small>Teacher</small>`;
    onboarding.querySelectorAll('[data-reg-zh][data-reg-en]').forEach(element => {
      element.textContent = isEnglish ? element.dataset.regEn : element.dataset.regZh;
    });
    const invite = onboarding.querySelector('#onboarding-code');
    if (invite) invite.placeholder = tr('请输入教师邀请码', 'Enter teacher invitation code');
    const parentInvite = onboarding.querySelector('#parent-invite-code');
    if (parentInvite) parentInvite.placeholder = tr('请输入邀请码', 'Enter invitation code');
    const teacherName = onboarding.querySelector('.onboarding-name-text');
    if (teacherName) teacherName.textContent = tr('老师姓名', 'Teacher name');
    const teacherNameInput = onboarding.querySelector('#onboarding-student-name');
    if (teacherNameInput) teacherNameInput.placeholder = tr('请输入老师姓名', 'Enter teacher name');
    const teacherNameHelp = onboarding.querySelector('.onboarding-name-help');
    if (teacherNameHelp) teacherNameHelp.textContent = tr('请输入老师在课后班使用的姓名。', 'Enter the name you use at the academy.');
    const teacherInviteLabel = onboarding.querySelector('.onboarding-code-text');
    if (teacherInviteLabel) teacherInviteLabel.textContent = tr('教师邀请码', 'Teacher invitation code');
    onboarding.querySelector('#parent-continue').textContent = tr('继续填写资料', 'Continue to family details');
    onboarding.querySelector('#family-registration-submit').textContent = tr('保存资料并进入家长中心', 'Save details and open family portal');
    onboarding.querySelector('#parent-back').textContent = tr('返回邀请码', 'Back to invitation code');
    onboarding.querySelector('#teacher-submit').textContent = tr('进入教师管理中心', 'Enter Teacher Portal');
    onboarding.querySelector('.onboarding-logout').textContent = tr('退出登录', 'Sign out');
    if (parentCodeVerified) renderFamilyChildren();
    setOnboardingAccountType(onboardingAccountType);
  }
  const search = $('#search');
  if (search) { search.placeholder = tr('搜索课程、作业或成绩…', 'Search classes, homework, or scores…'); search.setAttribute('aria-label', tr('搜索课程作业成绩', 'Search portal')); }
  const searchKey = document.querySelector('.search kbd');
  if (searchKey) searchKey.textContent = tr('搜索', 'Search');
  const secure = $('.secure-badge');
  if (secure) secure.textContent = tr('● 已安全登录', '● Securely signed in');
  const back = $('.back-home');
  if (back) back.textContent = tr('← 返回主页', '← Back to home');
  const modal = $('#profile-modal');
  if (modal) {
    modal.querySelector('h2').textContent = tr('账号设置', 'Account settings');
    modal.querySelector('.settings-list label').firstChild.textContent = tr('家长姓名', 'Parent name');
    modal.querySelector('#save-profile').textContent = tr('保存设置', 'Save settings');
    modal.querySelector('.teacher-entry').textContent = tr('教师管理入口', 'Teacher portal');
    modal.querySelector('#logout').textContent = tr('退出登录', 'Sign out');
  }
  const footerLinks = document.querySelectorAll('footer a');
  if (footerLinks[0]) footerLinks[0].textContent = tr('隐私政策', 'Privacy');
  if (footerLinks[1]) footerLinks[1].textContent = tr('使用条款', 'Terms');
  const footerSpan = document.querySelector('footer span');
  if (footerSpan?.lastChild) footerSpan.lastChild.textContent = tr(' · Supabase 云端数据隔离', ' · Secure cloud data');
}

function setOnboardingAccountType(type) {
  onboardingAccountType = type === 'teacher' ? 'teacher' : 'parent';
  document.querySelectorAll('[data-account-type]').forEach(button => {
    const active = button.dataset.accountType === onboardingAccountType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const teacher = onboardingAccountType === 'teacher';
  const teacherFields = $('#teacher-onboarding-fields');
  const parentInvite = $('#parent-invite-step');
  const parentRegistration = $('#parent-registration-step');
  const intro = $('#onboarding > form > .onboarding-intro');
  if (teacherFields) teacherFields.hidden = !teacher;
  if (parentInvite) parentInvite.hidden = teacher || parentCodeVerified;
  if (parentRegistration) parentRegistration.hidden = teacher || !parentCodeVerified;
  if (intro) intro.textContent = teacher
    ? tr('填写教师姓名与邀请码，进入课后班管理中心。', 'Enter your teacher name and invitation code to open the management portal.')
    : tr('先输入课后班邀请码，再登记家长与孩子资料。', 'Enter the academy invitation code, then register your family details.');
  const submit = $('#teacher-submit');
  if (submit) submit.textContent = tr('进入教师管理中心', 'Enter Teacher Portal');
}

function renderFamilyChildren() {
  const host = $('#family-children');
  const countControl = $('#family-child-count');
  if (!host || !countControl) return;
  const count = Math.max(1, Math.min(6, Number(countControl.value) || 1));
  host.innerHTML = Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const grades = Array.from({ length: 6 }, (_, gradeIndex) => {
      const grade = gradeIndex + 1;
      return `<option value="Grade ${grade}">${tr(`第${['一','二','三','四','五','六'][gradeIndex]}年级`, `Grade ${grade}`)}</option>`;
    }).join('');
    return `<section class="family-child-card"><h3><span>${String(n).padStart(2, '0')}</span>${tr(`孩子 ${n}`, `Child ${n}`)}</h3><div class="family-child-grid"><label><span>${tr('孩子姓名 *','Child name *')}</span><input data-family-child="name" autocomplete="off" maxlength="100" required placeholder="${tr('请输入孩子姓名','Enter child name')}"></label><label><span>${tr('出生日期 *','Date of birth *')}</span><input data-family-child="birth_date" type="date" required max="${new Date().toISOString().slice(0,10)}"></label><label><span>${tr('所在学校 *','School *')}</span><input data-family-child="school" maxlength="160" required placeholder="${tr('请输入学校名称','Enter school name')}"></label><label><span>${tr('当前年级 *','Current grade *')}</span><select data-family-child="grade" required><option value="" selected disabled>${tr('请选择年级','Choose grade')}</option>${grades}</select></label><label class="family-report-field"><span>${tr('最近一次考试成绩（至少上传一份）','Most recent test result (upload at least one)')}</span><input data-family-child="exam_report" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"><small>${tr('家中至少一位孩子需上传一份成绩单。PDF、JPG、PNG 或 WebP，最大 10 MB。仅家长本人和授权老师可查看。','Upload at least one child’s recent result. PDF, JPG, PNG, or WebP, up to 10 MB. Only you and authorized teachers can view it.')}</small></label></div></section>`;
  }).join('');
}

applyLanguageUI();

const supabaseReady = Boolean(
  window.supabase &&
  window.GSA_SUPABASE?.url &&
  !window.GSA_SUPABASE.url.startsWith('YOUR_') &&
  window.GSA_SUPABASE?.anonKey &&
  !window.GSA_SUPABASE.anonKey.startsWith('YOUR_')
);
const sb = supabaseReady ? window.supabase.createClient(
  window.GSA_SUPABASE.url,
  window.GSA_SUPABASE.anonKey,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
) : null;

let currentUser = null;
let query = '';
let selectedStudentId = null;
let data = emptyData();
let toastTimer;

function emptyData() {
  return {
    students: [], classes: [], enrollments: [], schedules: [],
    exams: [], examResults: [], teacherComments: [], invoices: [],
    homeworkRecords: [], attendance: [], monthlyReports: [], scoreTrend: [],
    academyUpdates: [], familyRegistration: null
  };
}

function currentStudent() {
  return data.students.find(student => student.id === selectedStudentId) || null;
}

function initials(name) {
  return String(name || 'Parent').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'PA';
}

function studentName(student) {
  return student ? `${student.first_name} ${student.last_name}`.trim() : '';
}

function fmtDate(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!value) return '—';
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(dateLocale, options).format(date);
}

function fmtDateTime(value) {
  return fmtDate(value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function latestTimestamp(...values) {
  const timestamps = values.filter(Boolean).map(value => new Date(value)).filter(date => !Number.isNaN(date.getTime()));
  return timestamps.length ? new Date(Math.max(...timestamps.map(date => date.getTime()))).toISOString() : null;
}

function fmtTime(value) {
  return value ? String(value).slice(0, 5) : '—';
}

function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);
}

function safeMediaUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function pill(text, tone = 'green') {
  return `<span class="pill ${tone}">${esc(text)}</span>`;
}

function card(title, body, action = '') {
  return `<section class="card"><div class="card-head"><h2>${title}</h2>${action}</div>${body}</section>`;
}

function go(page, label = tr('查看全部 ↗', 'View all ↗')) {
  return `<button class="text-button" data-go="${page}">${label}</button>`;
}

function emptyState(title, body, icon = '🌱') {
  return `<section class="card empty-state simple-empty" aria-label="${tr('暂无内容','No content')}"><span>${tr('暂无','No data yet')}</span></section>`;
}

function loadingState() {
  $('#content').innerHTML = `<section class="card empty-state"><span class="loader"></span><h2>${tr('正在同步课后班数据','Syncing learning data')}</h2><p>${tr('请稍候。','Please wait.')}</p></section>`;
}

function showError(message) {
  $('#content').innerHTML = emptyState('暂时无法加载数据', message, '!');
}

function classById(id) {
  return data.classes.find(item => item.id === id);
}

function examForResult(result) {
  return data.exams.find(item => item.id === result.exam_id);
}

function normalizedScore(result) {
  const exam = examForResult(result);
  return exam?.max_score ? Math.round((Number(result.score) / Number(exam.max_score)) * 100) : Number(result.score) || 0;
}

function invoiceStatus(invoice) {
  const labels = isEnglish ? { due: 'Due', overdue: 'Overdue', paid: 'Paid', void: 'Void' } : { due: '待缴费', overdue: '已逾期', paid: '已缴费', void: '已作废' };
  const status = invoice.status === 'due' && isInvoiceOverdue(invoice) ? 'overdue' : invoice.status;
  const tone = status === 'paid' ? 'green' : status === 'void' ? 'blue' : 'orange';
  return pill(labels[status] || status, tone);
}

function isInvoiceOverdue(invoice) {
  if (invoice.status === 'overdue') return true;
  if (invoice.status !== 'due' || !invoice.due_date) return false;
  const due = new Date(`${String(invoice.due_date).slice(0,10)}T23:59:59`);
  return due < new Date();
}

async function loadPortalData() {
  data = emptyData();
  const [{ data: profile, error: profileError }, { data: links, error: linksError }] = await Promise.all([
    sb.from('profiles').select('full_name').eq('id', currentUser.id).maybeSingle(),
    sb.from('parent_students').select('student_id,relationship').eq('parent_id', currentUser.id)
  ]);
  if (profileError || linksError) throw new Error(profileError?.message || linksError?.message);
  if (profile?.full_name) currentUser.name = profile.full_name;

  const studentIds = (links || []).map(link => link.student_id);
  if (studentIds.length) {
    const { data: students, error } = await sb.from('students').select('*').in('id', studentIds).eq('status', 'active').order('last_name');
    if (error) throw new Error(error.message);
    data.students = students || [];
  }

  const [{ data: savedState, error: stateError }, { data: familyRegistration, error: registrationError }] = await Promise.all([
    sb.from('parent_state').select('selected_student_id').eq('user_id', currentUser.id).maybeSingle(),
    sb.from('family_registrations').select('children,created_at').eq('parent_id', currentUser.id).maybeSingle()
  ]);
  if (stateError || registrationError) throw new Error(stateError?.message || registrationError?.message);
  data.familyRegistration = familyRegistration || null;
  selectedStudentId = data.students.some(student => student.id === savedState?.selected_student_id)
    ? savedState.selected_student_id
    : data.students[0]?.id || null;

  await loadSelectedStudentData();
  updateUserUI();
}

async function loadSelectedStudentData() {
  data.classes = [];
  data.enrollments = [];
  data.schedules = [];
  data.exams = [];
  data.examResults = [];
  data.teacherComments = [];
  data.invoices = [];
  data.homeworkRecords = [];
  data.attendance = [];
  data.monthlyReports = [];
  data.scoreTrend = [];
  data.academyUpdates = [];
  const updatesQuery = sb.from('academy_updates').select('*').order('published_at', { ascending: false });

  if (!selectedStudentId) {
    const { data: updates, error: updatesError } = await updatesQuery;
    data.academyUpdates = updatesError ? [] : (updates || []);
    return;
  }

  const queries = await Promise.all([
    sb.from('enrollments').select('*').eq('student_id', selectedStudentId),
    sb.from('classes').select('*').order('subject'),
    sb.from('schedule_items').select('*').order('weekday').order('start_time'),
    sb.from('exams').select('*').order('exam_date'),
    sb.from('exam_results').select('*').eq('student_id', selectedStudentId),
    sb.from('tuition_invoices').select('*').eq('student_id', selectedStudentId).order('due_date', { ascending: false }),
    sb.from('student_homework_records').select('*').eq('student_id', selectedStudentId).order('assigned_on', { ascending: false }),
    sb.from('student_attendance').select('*').eq('student_id', selectedStudentId).order('attendance_date', { ascending: false }),
    sb.from('student_monthly_reports').select('*').eq('student_id', selectedStudentId).order('report_month', { ascending: false }),
    sb.from('student_score_trend').select('*').eq('student_id', selectedStudentId).order('recorded_on'),
    updatesQuery
  ]);
  const failed = queries.find((result, index) => result.error && index !== 10);
  if (failed) throw new Error(failed.error.message);
  const { data: teacherComments, error: commentsError } = await sb.from('student_teacher_comments').select('*').eq('student_id', selectedStudentId).order('comment_date', { ascending:false }).order('published_at', { ascending:false });
  data.teacherComments = commentsError ? [] : (teacherComments || []);
  [data.enrollments, data.classes, data.schedules] = queries.slice(0, 3).map(result => result.error ? [] : (result.data || []));
  [data.exams, data.examResults, data.invoices] = queries.slice(3, 6).map(result => result.error ? [] : (result.data || []));
  data.homeworkRecords = queries[6].data || [];
  data.attendance = queries[7].data || [];
  data.monthlyReports = queries[8].data || [];
  data.scoreTrend = queries[9].data || [];
  data.academyUpdates = queries[10].error ? [] : (queries[10].data || []);

  const enrolledClassIds = new Set(data.enrollments.map(item => item.class_id));
  data.classes = data.classes.filter(item => enrolledClassIds.has(item.id));
  data.schedules = data.schedules.filter(item => enrolledClassIds.has(item.class_id));
  const releasedExamIds = new Set(data.examResults.map(result => result.exam_id));
  data.exams = data.exams.filter(item => enrolledClassIds.has(item.class_id) || (!item.class_id && releasedExamIds.has(item.id)));
  data.academyUpdates = data.academyUpdates.filter(item => !item.student_id || item.student_id === selectedStudentId);
}

async function saveSelectedStudent() {
  if (!currentUser) return;
  const { error } = await sb.from('parent_state').upsert({ user_id: currentUser.id, selected_student_id: selectedStudentId }, { onConflict: 'user_id' });
  if (error) console.warn('Unable to save selected student:', error.message);
}

function renderChildren() {
  if (!data.students.length) {
    $('#children').innerHTML = '';
    return;
  }
  $('#children').innerHTML = data.students.map((student, index) => {
    const active = student.id === selectedStudentId;
    return `<button class="child ${active ? 'active' : ''}" data-student="${student.id}" aria-pressed="${active}">
      <span class="avatar" style="${index ? 'background:#fadce8;color:#a35373' : ''}">${esc(initials(studentName(student)))}</span>
      <span><strong>${esc(studentName(student))}</strong><small>${esc(student.grade)}</small></span>
      <span class="check">${active ? '✓' : '○'}</span>
    </button>`;
  }).join('');
}

function renderNav(page) {
  $('#nav').innerHTML = pages.map(item => `<a href="#${item[0]}" class="${item[0] === page && !query ? 'active' : ''}">
    <b>${item[1]}</b>${item[2]}
  </a>`).join('');
}

function homeMenu() {
  return `<section class="home-menu" aria-label="${tr('主页功能导航','Home navigation')}">
    <div class="home-menu-head"><div><span>EXPLORE</span><h2>${tr('功能导航','Explore')}</h2></div><p>${tr('选择你要查看的内容','Choose what you would like to view')}</p></div>
    <div class="home-menu-grid">${pages.map((item, index) => `<a href="#${item[0]}" class="home-menu-item home-menu-${index + 1}">
      <b class="menu-icon-image"><img src="${item[4]}" alt="" aria-hidden="true"></b><span><strong>${item[2]}</strong><small>${isEnglish ? pageSubtitles[item[0]] : item[3]}</small></span><em>›</em>
    </a>`).join('')}</div>
  </section>`;
}

function updatesPage() {
  if (!data.academyUpdates.length) return `<div class="updates-empty">${tr('暂无','No updates yet')}</div>`;
  return `<section class="updates-feed" aria-label="${tr('课后班动态','Academy updates')}">${data.academyUpdates.map((update, index) => {
    const imageUrl = safeMediaUrl(update.image_url);
    return `<article class="update-card update-tone-${index % 4 + 1}">
      <div class="update-meta"><span>${esc(update.category || tr('课堂动态','Class moment'))}</span><time>${fmtDateTime(update.published_at)}</time></div>
      ${imageUrl ? `<img class="update-photo" src="${esc(imageUrl)}" alt="${esc(update.title)}" loading="lazy">` : `<div class="update-illustration" aria-hidden="true"><img src="menu-updates.png?v=3" alt="" loading="lazy" decoding="async"></div>`}
      <div class="update-content"><p class="update-author">✦ ${esc(update.author_name || 'BrightHive Academic Studio')}</p><h2>${esc(update.title)}</h2><p>${esc(update.body)}</p><small>${tr('发布于','Published')} ${fmtDateTime(update.published_at)} · ${tr('最后更新','Updated')} ${fmtDateTime(update.updated_at || update.published_at)}</small></div>
    </article>`;
  }).join('')}</section>`;
}

function homeworkPage() {
  if (!currentStudent()) return emptyState('暂无作业', '学生档案关联后，老师发布的作业会显示在这里。');
  if (!data.homeworkRecords.length) return emptyState('暂无作业', '老师尚未填写作业记录。');
  return `<div class="homework-board">${data.homeworkRecords.map((item, index) => { const status = !item.has_homework ? pill(tr('没有作业','No homework'),'blue') : item.completion_status === 'completed' ? pill(tr('已完成','Completed'),'green') : pill(tr('未完成','Unfinished'),'orange'); return `<article class="homework-card homework-tone-${index % 4 + 1}">
    <div class="homework-card-head"><span>${esc(item.subject)}</span>${status}</div>
    <h2>${item.has_homework ? tr('作业记录','Homework record') : tr('今日没有作业','No homework assigned')}</h2>
    <p class="teacher-line">👩‍🏫 ${esc(item.teacher_name)} · ${tr('学生端只读','Read only')}</p>
    <div class="homework-result-grid"><div><small>${tr('成绩','Grade')}</small><strong>${esc(item.grade || '—')}</strong></div><div><small>${tr('答对','Correct')}</small><strong>${item.correct_count ?? '—'}</strong></div><div><small>${tr('答错','Wrong')}</small><strong>${item.wrong_count ?? '—'}</strong></div></div>
    <div class="homework-dates"><div><small>${tr('作业日期','Homework date')}</small><strong>${fmtDate(item.assigned_on)}</strong></div><div><small>${tr('最后更新','Last updated')}</small><strong>${fmtDateTime(item.updated_at)}</strong></div></div>
  </article>`; }).join('')}</div>`;
}

function homePage() {
  const student = currentStudent();
  const menu = homeMenu();
  if (!student) return menu + emptyState('尚未关联学生', '此家长账号已创建成功，课后班关联学生后即可查看费用、出勤和学习效果。');
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthAttendance = data.attendance.filter(item => String(item.attendance_date || '').slice(0, 7) === monthKey);
  const present = monthAttendance.filter(item => item.status === 'present').length;
  const attendanceRate = monthAttendance.length ? Math.round(present / monthAttendance.length * 100) : null;
  const monthHomework = data.homeworkRecords.filter(item => item.has_homework && String(item.assigned_on || '').slice(0, 7) === monthKey);
  const completed = monthHomework.filter(item => item.completion_status === 'completed').length;
  const homeworkRate = monthHomework.length ? Math.round(completed / monthHomework.length * 100) : null;
  const comparisons = subjectComparisons();
  const openInvoices = data.invoices.filter(item => ['due','overdue'].includes(item.status));
  const overdue = openInvoices.filter(isInvoiceOverdue);
  const nextInvoice = [...openInvoices].sort((a,b) => new Date(a.due_date) - new Date(b.due_date))[0];
  const summary = `${tr('本月到课','Present this month')} ${attendanceRate == null ? '—' : attendanceRate + '%'} · ${tr('作业完成率','Homework completion')} ${homeworkRate == null ? '—' : homeworkRate + '%'}`;
  return `<section class="parent-summary"><span>${tr('学习成效','LEARNING PROGRESS')}</span><h2>${esc(studentName(student))}</h2><p>${tr('用每次测评的真实成绩，看见在课后班学习的变化。','See real assessment results over time and the progress made at the academy.')}</p><small class="snapshot-support">${summary}</small></section>
    <section class="home-comparison"><div class="home-comparison-heading"><div><span>${tr('学习进步','LEARNING PROGRESS')}</span><h2>${tr('上次成绩 → 本次成绩','Previous → Current score')}</h2></div>${go('progress',tr('查看全部成绩','All scores'))}</div>${comparisonCards(comparisons, true)}</section>
    <section class="parent-priority-grid parent-priority-grid-compact">
      <a href="#tuition" class="priority-card ${overdue.length ? 'priority-alert' : ''}"><small>${tr('学费提醒','Fee reminder')}</small><strong>${openInvoices.length ? money(openInvoices.reduce((sum,item)=>sum+item.amount_cents,0)) : tr('无需缴费','No payment due')}</strong><span>${overdue.length ? tr(`${overdue.length} 笔已逾期`,` ${overdue.length} overdue`) : nextInvoice ? `${tr('到期','Due')} ${fmtDate(nextInvoice.due_date)}` : tr('目前没有待缴账单','No open invoice')}</span></a>
      <a href="#attendance" class="priority-card"><small>${tr('本月出勤','Attendance')}</small><strong>${attendanceRate == null ? '—' : attendanceRate + '%'}</strong><span>${present} ${tr('天到课','days present')} · ${monthAttendance.length-present} ${tr('天缺席/请假','absent/excused')}</span></a>
      <a href="#homework" class="priority-card"><small>${tr('作业完成率','Homework')}</small><strong>${homeworkRate == null ? '—' : homeworkRate + '%'}</strong><span>${completed}/${monthHomework.length} ${tr('项已完成','completed')}</span></a>
    </section>${menu}`;
}

function subjectComparisons() {
  const grouped = new Map();
  [...data.examResults]
    .filter(result => examForResult(result) && result.score != null && result.score !== '')
    .sort((a, b) => new Date(examForResult(b).exam_date || 0) - new Date(examForResult(a).exam_date || 0))
    .forEach(result => {
      const exam = examForResult(result);
      const course = classById(exam.class_id);
      const subject = exam.subject || course?.subject || tr('综合','General');
      if (!grouped.has(subject)) grouped.set(subject, []);
      grouped.get(subject).push({ result, exam, course });
    });
  return [...grouped.entries()].map(([subject, items], index) => {
    const current = items[0];
    const previous = items[1] || null;
    const now = normalizedScore(current.result);
    const before = previous ? normalizedScore(previous.result) : null;
    return { subject, index, current, previous, now, before, change: before == null ? null : now - before };
  });
}

function comparisonCards(comparisons, compact = false) {
  if (!comparisons.length) return `<div class="comparison-empty"><strong>${tr('暂无已发布成绩','No published scores yet')}</strong><p>${tr('老师发布测评成绩后，这里会按科目显示上次与本次对比。','When teachers publish assessment results, this section will compare the latest two scores for each subject.')}</p></div>`;
  return `<div class="comparison-grid ${compact ? 'comparison-grid-home' : ''}">${comparisons.map(item => {
    const { subject, index, current, previous, now, before, change } = item;
    const tone = change == null ? 'blue' : change >= 0 ? 'green' : 'orange';
    const status = change == null ? tr('等待下次测评','Next assessment pending') : change > 0 ? tr('有进步','Progress') : change < 0 ? tr('需要关注','Needs attention') : tr('保持稳定','Steady');
    const rawScore = current.exam?.max_score ? `${esc(current.result.score)} / ${esc(current.exam.max_score)}` : `${now}%`;
    return `<article class="compare-card compare-tone-${index % 4 + 1}"><div class="compare-card-title"><span>${esc(subject)}</span>${pill(status,tone)}</div><section><p><small>${tr('上次','Previous')}</small><strong>${before == null ? '—' : `${before}%`}</strong><small>${previous ? `${esc(previous.exam.title)} · ${fmtDate(previous.exam.exam_date)}` : tr('暂无上次成绩','No previous score')}</small></p><b aria-hidden="true">→</b><p><small>${tr('本次','Current')}</small><strong>${now}%</strong><small>${esc(current.exam.title)} · ${fmtDate(current.exam.exam_date)}</small></p></section><footer>${change == null ? tr('再有一次同科成绩即可对比','A second score in this subject enables comparison') : `${tr('成绩变化','Score change')} <strong class="${change >= 0 ? 'score-up' : 'score-down'}">${change > 0 ? '+' : ''}${change}%</strong> · ${tr('本次原始分','Current raw score')} ${rawScore}`}</footer></article>`;
  }).join('')}</div>`;
}

function schedulePage() {
  if (!currentStudent()) return emptyState('尚未关联学生', '学生档案关联后，课表会显示在这里。');
  if (!data.schedules.length) return emptyState(tr('暂无课程安排','No schedule yet'), tr('课后班尚未为该学生发布课表。','No schedule has been published for this student.'), '▦');
  return card(tr('每周课程表','Weekly Schedule'), `<div class="table-wrap"><div class="schedule-grid">${weekdays.map((day, index) => {
    const items = data.schedules.filter(item => item.weekday === index + 1);
    return `<div class="day"><h3>${day}</h3>${items.length ? items.map(item => { const course = classById(item.class_id); return `<div class="lesson"><strong>${esc(course?.title || tr('课程','Class'))}</strong><small>${fmtTime(item.start_time)} – ${fmtTime(item.end_time)}</small><small>${esc(course?.teacher_name || '')}${course?.room ? ` · ${esc(course.room)}` : ''}</small></div>`; }).join('') : `<small>${tr('无课程','No class')}</small>`}</div>`;
  }).join('')}</div></div><p class="notice">${tr('课表由课后班发布，如有调整会自动同步。','The academy publishes this schedule; updates sync automatically.')}</p>`);
}

function examsPage() {
  if (!currentStudent()) return emptyState('尚未关联学生', '学生档案关联后，测评成绩会显示在这里。');
  if (!data.examResults.length && !data.teacherComments.length) return emptyState('暂无测评成绩', '课后班尚未发布该学生的测评记录。', '▱');
  const rows = [...data.examResults].sort((a, b) => new Date(examForResult(b)?.exam_date) - new Date(examForResult(a)?.exam_date));
  const comments = rows.filter(result => result.teacher_comment);
  const commentCards = [
    ...data.teacherComments.map(item => `<div class="comment"><strong>${esc(item.teacher_name || tr('老师','Teacher'))} · ${tr('学习反馈','Learning feedback')}</strong><p>${esc(item.teacher_comment)}</p><small>${tr('评语日期','Comment date')} ${fmtDate(item.comment_date)} · ${tr('发布于','Published')} ${fmtDateTime(item.published_at)} · ${tr('最后更新','Updated')} ${fmtDateTime(item.updated_at || item.published_at)}</small></div>`),
    ...comments.map(result => { const exam = examForResult(result); const course = classById(exam?.class_id); return `<div class="comment"><strong>${esc(course?.teacher_name || tr('任课老师','Teacher'))} · ${esc(exam?.title || tr('学习反馈','Learning feedback'))}</strong><p>${esc(result.teacher_comment)}</p><small>${tr('评语日期','Comment date')} ${fmtDate(exam?.exam_date)} · ${tr('最后更新','Updated')} ${fmtDateTime(result.updated_at || result.published_at)}</small></div>`; })
  ];
  const scoreHistory = data.examResults.length ? card(tr('历次成绩','Assessment History'), `<div class="table-wrap"><table><thead><tr><th>${tr('测评日期','Date')}</th><th>${tr('老师','Teacher')}</th><th>${tr('科目','Subject')}</th><th>${tr('测评','Assessment')}</th><th>${tr('成绩','Score')}</th><th>${tr('老师发布于','Published')}</th><th>${tr('最后更新','Last updated')}</th></tr></thead><tbody>${rows.map(result => { const exam = examForResult(result); const course = classById(exam?.class_id); return `<tr><td>${fmtDate(exam?.exam_date)}</td><td>${esc(course?.teacher_name || tr('任课老师','Teacher'))}</td><td>${esc(exam?.subject || course?.subject || '—')}</td><td>${esc(exam?.title || '—')}</td><td><strong>${result.score == null ? tr('仅评语','Comment only') : normalizedScore(result)}</strong></td><td>${fmtDateTime(result.published_at)}</td><td>${fmtDateTime(result.updated_at || result.published_at)}</td></tr>`; }).join('')}</tbody></table></div><p class="notice">${tr('这里只显示课后班已正式发布的成绩和老师评语。','Only officially published scores and teacher comments appear here.')}</p>`) : '';
  return `${scoreHistory}<div style="margin-top:22px">${card(tr('老师评语 · 只读','Teacher Comments · Read only'), commentCards.length ? commentCards.join('') : `<div class="compact-empty">${tr('暂无老师评语。','No teacher comments yet.')}</div>`)}</div>`;
}

function progressPage() {
  if (!currentStudent()) return emptyState('尚未关联学生', '关联学生后即可查看成绩变化。');
  const familyChild = data.familyRegistration?.children?.find(child => child.student_id === selectedStudentId);
  const preEnrollmentReport = familyChild?.exam_report_path
    ? card(tr('入班前成绩资料','Pre-enrollment score report'), `<div class="pre-enrollment-report"><div><strong>${tr('报名时上传的成绩单','Score report uploaded during registration')}</strong><small>${tr('资料登记日期','File received')} · ${fmtDate(data.familyRegistration.created_at)}</small></div><button class="text-button" type="button" data-family-score-report="${esc(familyChild.exam_report_path)}">${tr('查看成绩单','View report')} ↗</button></div>`)
    : card(tr('入班前成绩资料','Pre-enrollment score report'), `<div class="compact-empty">${tr('该学生暂未上传入班前成绩单。','No pre-enrollment score report was uploaded for this student.')}</div>`);
  const comparisons = subjectComparisons();
  const scored = [...data.examResults].filter(result => examForResult(result) && result.score != null && result.score !== '' && Number(examForResult(result)?.max_score) > 0).sort((a,b)=>new Date(examForResult(b).exam_date)-new Date(examForResult(a).exam_date));
  const best = [...scored].sort((a,b)=>normalizedScore(b)-normalizedScore(a))[0];
  const bestExam = best ? examForResult(best) : null;
  const bestSubject = bestExam ? (bestExam.subject || classById(bestExam.class_id)?.subject || '—') : '—';
  const perfectCount = scored.filter(result => Number(result.score) >= Number(examForResult(result)?.max_score)).length;
  const perfectRate = scored.length ? Math.round(perfectCount / scored.length * 100) : null;
  const scoreSummary = `<section class="family-score-summary"><article><small>${tr('历史最高成绩','Highest score to date')}</small><strong>${best ? `${normalizedScore(best)}%` : '—'}</strong><span>${best ? `${esc(bestSubject)} · ${esc(best.score)} / ${esc(bestExam.max_score)} · ${fmtDate(bestExam.exam_date)}` : tr('老师发布成绩后显示','Shown after a score is published')}</span></article><article><small>${tr('满分率','Perfect-score rate')}</small><strong>${perfectRate == null ? '—' : `${perfectRate}%`}</strong><span>${scored.length ? `${perfectCount} / ${scored.length} ${tr('次测评满分','assessments at full marks')}` : tr('暂无已评分测评','No graded assessments yet')}</span></article></section>`;
  const historyRows = scored.length ? scored.map(result=>{const exam=examForResult(result),course=classById(exam.class_id);return `<tr><td>${fmtDate(exam.exam_date)}</td><td>${esc(exam.subject||course?.subject||'—')}</td><td>${esc(exam.title)}</td><td><strong>${esc(result.score)} / ${esc(exam.max_score)}</strong> (${normalizedScore(result)}%)</td><td>${esc(result.teacher_comment||'—')}</td></tr>`}).join('') : `<tr><td colspan="5">${tr('暂无测评记录','No assessment records yet')}</td></tr>`;
  const history = card(tr('历次测评成绩','Assessment history'), `<div class="table-wrap"><table><thead><tr><th>${tr('日期','Date')}</th><th>${tr('科目','Subject')}</th><th>${tr('测评','Assessment')}</th><th>${tr('成绩','Score')}</th><th>${tr('老师评语','Teacher comment')}</th></tr></thead><tbody>${historyRows}</tbody></table></div>`);
  return `<section class="progress-intro"><span>${tr('成绩与进步','SCORES & PROGRESS')}</span><h2>${tr('学习进步看得见','See learning progress clearly')}</h2><p>${tr('在这里查看入班前成绩资料、老师发布的成绩对比、历史最高成绩、满分率与历次测评记录。','Review the pre-enrollment report, teacher-published score comparisons, highest score, perfect-score rate, and assessment history.')}</p></section>${preEnrollmentReport}${scoreSummary}${comparisonCards(comparisons)}${history}`;
}

function attendancePage() {
  if (!currentStudent()) return emptyState('尚未关联学生', '关联学生后即可查看出勤。');
  const monthKey = new Date().toISOString().slice(0,7);
  const month = data.attendance.filter(item=>String(item.attendance_date||'').slice(0,7)===monthKey);
  const present = month.filter(item=>item.status==='present').length;
  const absent = month.filter(item=>item.status==='absent').length;
  const excused = month.filter(item=>item.status==='excused').length;
  const rate = month.length?Math.round(present/month.length*100):null;
  const labels = {present:tr('到课','Present'),absent:tr('缺席','Absent'),excused:tr('请假','Excused')};
  const rows = data.attendance.length ? `<div class="table-wrap"><table><thead><tr><th>${tr('日期','Date')}</th><th>${tr('状态','Status')}</th><th>${tr('到校','Check-in')}</th><th>${tr('离校','Check-out')}</th><th>${tr('老师备注','Teacher note')}</th><th>${tr('最后更新','Updated')}</th></tr></thead><tbody>${data.attendance.map(item=>`<tr><td>${fmtDate(item.attendance_date)}</td><td>${pill(labels[item.status]||item.status,item.status==='present'?'green':item.status==='absent'?'orange':'blue')}</td><td>${fmtTime(item.check_in)}</td><td>${fmtTime(item.check_out)}</td><td>${esc(item.note||'—')}</td><td>${fmtDateTime(item.updated_at)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="compact-empty">${tr('暂无出勤记录','No attendance records yet')}</div>`;
  return `<div class="stats attendance-stats"><div class="stat"><label>${tr('本月出勤率','Monthly attendance')}</label><strong>${rate==null?'—':rate+'%'}</strong><small>${month.length} ${tr('个记录日','recorded days')}</small></div><div class="stat"><label>${tr('到课','Present')}</label><strong>${present}</strong><small>${tr('天','days')}</small></div><div class="stat"><label>${tr('请假','Excused')}</label><strong>${excused}</strong><small>${tr('天','days')}</small></div><div class="stat"><label>${tr('缺席','Absent')}</label><strong>${absent}</strong><small>${tr('天','days')}</small></div></div>${card(tr('每日出勤记录','Daily attendance'),rows)}<div style="margin-top:22px">${schedulePage()}</div>`;
}

function tuitionPage() {
  if (!currentStudent()) return emptyState('尚未关联学生', '学生档案关联后，费用账单会显示在这里。');
  if (!data.invoices.length) return emptyState('暂无费用账单', '课后班尚未向该学生发布账单。', '▤');
  const due = data.invoices.filter(invoice => ['due','overdue'].includes(invoice.status));
  const overdue = data.invoices.filter(isInvoiceOverdue);
  const paid = data.invoices.filter(invoice => invoice.status === 'paid');
  return `<div class="stats"><div class="stat"><label>${tr('待缴金额','Amount due')}</label><strong>${money(due.reduce((sum,item)=>sum+item.amount_cents,0))}</strong><small>${due.length} ${tr('笔待处理','open invoices')}</small></div><div class="stat"><label>${tr('逾期金额','Overdue')}</label><strong>${money(overdue.reduce((sum,item)=>sum+item.amount_cents,0))}</strong><small>${overdue.length ? `${overdue.length} ${tr('笔已逾期','overdue invoices')}` : tr('无逾期账单','No overdue invoices')}</small></div><div class="stat"><label>${tr('已缴金额','Paid')}</label><strong>${money(paid.reduce((sum,item)=>sum+item.amount_cents,0))}</strong><small>${paid.length} ${tr('笔已缴账单','paid invoices')}</small></div></div>
    ${card(tr('账单明细','Invoice Details'), `<div class="table-wrap"><table><thead><tr><th>${tr('账单编号','Invoice')}</th><th>${tr('项目','Item')}</th><th>${tr('金额','Amount')}</th><th>${tr('课后班发布于','Published')}</th><th>${tr('到期日期','Due date')}</th><th>${tr('最后更新','Last updated')}</th><th>${tr('状态','Status')}</th></tr></thead><tbody>${data.invoices.map(invoice => `<tr><td>${esc(invoice.invoice_number)}</td><td>${esc(invoice.item)}</td><td>${money(invoice.amount_cents)}</td><td>${fmtDateTime(invoice.created_at)}</td><td>${fmtDate(invoice.due_date)}</td><td>${fmtDateTime(invoice.updated_at || invoice.paid_at || invoice.created_at)}</td><td>${invoiceStatus(invoice)}</td></tr>`).join('')}</tbody></table></div><p class="notice">${tr('如需缴费或核对账单，请联系课后班财务办公室。','Contact the academy office to pay or review an invoice.')}</p>`)}`;
}

function searchPage() {
  const needle = query.toLowerCase();
  const entries = [
    ...data.classes.map(item => ({ title: item.title, text: `${item.subject} ${item.teacher_name}`, page: 'attendance' })),
    ...data.academyUpdates.map(item => ({ title: item.title, text: item.body, page: 'updates' })),
    ...data.homeworkRecords.map(item => ({ title: item.has_homework ? item.subject : tr('今日没有作业','No homework today'), text: `${item.teacher_name || ''} · ${fmtDateTime(item.updated_at || item.assigned_on)} · ${item.grade || ''}`, page: 'homework' })),
    ...data.invoices.map(item => ({ title: item.item, text: item.invoice_number, page: 'tuition' }))
  ].filter(item => `${item.title} ${item.text}`.toLowerCase().includes(needle));
  return card(`${tr('搜索结果','Search results')} · ${entries.length}`, entries.length ? entries.map(item => `<div class="lesson"><div><strong>${esc(item.title)}</strong><small>${esc(item.text).slice(0,100)}</small></div><div style="margin-left:auto">${go(item.page,tr('打开 →','Open →'))}</div></div>`).join('') : `<div class="empty">${tr('没有匹配的课后班数据。','No matching results.')}</div>`);
}

function render() {
  if (!currentUser) return;
  let page = location.hash.slice(1) || 'progress';
  if (page === 'home' || page === 'reports') {
    page = 'progress';
    history.replaceState(null, '', '#progress');
  }
  if (!pages.some(item => item[0] === page)) page = 'progress';
  document.body.dataset.page = page;
  renderNav(page);
  renderChildren();
  $('#page-title').textContent = pages[0][isEnglish ? 2 : 3];
  $('#page-subtitle').textContent = pageSubtitles.progress;
  $('#content').innerHTML = progressPage();
}

function updateUserUI() {
  const mark = initials(currentUser.name);
  document.querySelectorAll('.user-name').forEach(element => element.textContent = currentUser.name);
  document.querySelectorAll('.user-initials').forEach(element => element.textContent = mark);
  $('#profile-email').textContent = currentUser.email;
  $('#profile-name').value = currentUser.name;
  const now = new Date();
  $('#today').innerHTML = `◷ ${new Intl.DateTimeFormat(dateLocale,{year:'numeric',month:'long',day:'numeric'}).format(now)}<small>${new Intl.DateTimeFormat(dateLocale,{weekday:'long'}).format(now)}</small>`;
}

async function enterPortal(user) {
  const meta = user.user_metadata || {};
  currentUser = { id: user.id, name: meta.full_name || meta.name || user.email?.split('@')[0] || '家长', email: user.email || '' };
  try {
    const { data: profile, error } = await sb.from('profiles').select('full_name,onboarding_complete,onboarding_student_name,role').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (profile?.role === 'teacher' || profile?.role === 'admin') {
      location.replace('teacher.html');
      return;
    }
    if (profile?.full_name) currentUser.name = profile.full_name;
    if (!profile?.onboarding_complete || profile?.role !== 'parent') {
      showOnboarding('', user.email || '');
      return;
    }
    const { data: familyRegistration, error: familyError } = await sb.from('family_registrations').select('parent_id').eq('parent_id', user.id).maybeSingle();
    if (familyError) throw familyError;
    if (!familyRegistration) {
      showOnboarding('', user.email || '');
      return;
    }
    await openPortal();
  } catch (error) {
    console.error(error);
    showAuth();
    $('#login-error').textContent = /family_registrations|schema cache|relation .* does not exist/i.test(error.message || '')
      ? tr('资料登记服务尚未启用，请管理员先执行家庭资料迁移脚本。','Family registration is not enabled yet. Ask the administrator to apply the family-registration migration.')
      : tr('账号初始化失败，请刷新后重试。','Account setup failed. Please refresh and try again.');
  }
}

async function openPortal() {
  $('#auth').hidden = true;
  $('#portal').hidden = false;
  if (driftPlane) driftPlane.replaceChildren();
  updateUserUI();
  loadingState();
  try {
    await loadPortalData();
    const requestedPage = sessionStorage.getItem('gsa-post-login-page');
    if (pages.some(item => item[0] === requestedPage)) {
      if (!location.hash || location.hash === '#') location.hash = requestedPage;
      sessionStorage.removeItem('gsa-post-login-page');
    }
    if (!location.hash || location.hash === '#') location.hash = 'home';
    render();
  } catch (error) {
    console.error(error);
    showError('请刷新页面重试；如果问题持续，请联系课后班办公室。');
  }
}

function showOnboarding(studentName = '', email = '') {
  ensureDriftWall();
  parentCodeVerified = false;
  $('#portal').hidden = true;
  $('#auth').hidden = false;
  $('.auth-panel').hidden = true;
  $('#onboarding').hidden = false;
  $('#onboarding-student-name').value = currentUser?.name || studentName;
  $('#onboarding-code').value = '';
  $('#parent-invite-code').value = '';
  $('#family-parent-name').value = currentUser?.name || '';
  $('#family-address').value = '';
  $('#family-phone').value = '';
  $('#family-email').value = email || currentUser?.email || '';
  $('#family-child-count').value = '1';
  renderFamilyChildren();
  $('#onboarding-error').textContent = '';
  setOnboardingAccountType('parent');
    setTimeout(() => (onboardingAccountType === 'teacher' ? $('#onboarding-student-name') : $('#parent-invite-code')).focus(), 0);
}

function showAuth() {
  ensureDriftWall();
  currentUser = null;
  data = emptyData();
  selectedStudentId = null;
  $('#portal').hidden = true;
  $('#profile-modal').hidden = true;
  $('#onboarding').hidden = true;
  $('.auth-panel').hidden = false;
  $('#auth').hidden = false;
  $('#login-error').textContent = '';
  history.replaceState(null, '', location.pathname);
}

function toast(text) {
  $('#toast').textContent = text;
  $('#toast').style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').style.display = 'none', 2400);
}

function openProfile() {
  $('#profile-name').value = currentUser.name;
  $('#profile-error').textContent = '';
  $('#profile-modal').hidden = false;
  $('#profile-name').focus();
}

function closeProfile() {
  $('#profile-modal').hidden = true;
}

async function saveProfile() {
  const name = $('#profile-name').value.trim();
  const error = $('#profile-error');
  error.textContent = '';
  if (name.length < 2) return void (error.textContent = '请输入至少 2 个字符的姓名。');
  const updates = { data: { full_name: name } };
  const [{ error: authError }, { error: profileError }] = await Promise.all([
    sb.auth.updateUser(updates),
    sb.from('profiles').update({ full_name: name }).eq('id', currentUser.id)
  ]);
  if (authError || profileError) return void (error.textContent = authError?.message || profileError?.message);
  currentUser.name = name;
  updateUserUI();
  render();
  closeProfile();
  toast('账号设置已保存');
}

document.addEventListener('click', async event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.familyScoreReport) {
    const reportWindow = window.open('about:blank', '_blank');
    try {
      const { data: link, error } = await sb.storage.from('family-exam-results').createSignedUrl(target.dataset.familyScoreReport, 300);
      if (error) throw error;
      if (!link?.signedUrl) throw new Error('Secure score report link was not returned.');
      if (reportWindow) reportWindow.location = link.signedUrl;
      else window.location.href = link.signedUrl;
    } catch (error) {
      reportWindow?.close();
      toast(tr('无法打开成绩单，请稍后重试。','Could not open the score report. Please try again.'));
    }
    return;
  }
  if (target.hasAttribute('data-language-toggle')) {
    localStorage.setItem('gsa-language', isEnglish ? 'zh' : 'en');
    location.reload();
    return;
  }
  if (target.dataset.student) {
    selectedStudentId = target.dataset.student;
    loadingState();
    try {
      await Promise.all([loadSelectedStudentData(), saveSelectedStudent()]);
      query = '';
      const search = $('#search');
      if (search) search.value = '';
      render();
    } catch (error) {
      showError('无法切换学生，请稍后重试。');
    }
  }
  if (target.dataset.go) {
    query = '';
    $('#search').value = '';
    if (location.hash === `#${target.dataset.go}`) render(); else location.hash = target.dataset.go;
  }
  if (target.id === 'menu') $('#sidebar').classList.toggle('open');
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    $('#sidebar').classList.remove('open');
    closeProfile();
  }
});

$('#search')?.addEventListener('input', event => {
  query = event.target.value.trim();
  render();
});

window.addEventListener('hashchange', () => {
  if (!currentUser) return;
  query = '';
  $('#search').value = '';
  $('#sidebar').classList.remove('open');
  render();
  window.scrollTo(0, 0);
});

document.querySelectorAll('[data-provider]').forEach(button => button.addEventListener('click', async () => {
  const error = $('#login-error');
  error.textContent = '';
  if (location.protocol === 'file:') {
    error.textContent = tr('Google 登录不能在本地文件中使用。请关闭此页面，双击“启动网站.bat”后再登录。','Google sign-in cannot run from a local file. Close this page and open the site with “启动网站.bat”.');
    return;
  }
  if (!sb) return void (error.textContent = tr('服务器尚未连接。','The server is not connected yet.'));
  if (pages.some(item => item[0] === location.hash.slice(1))) sessionStorage.setItem('gsa-post-login-page', location.hash.slice(1));
  const { error: oauthError } = await sb.auth.signInWithOAuth({ provider: button.dataset.provider, options: { redirectTo: location.origin + location.pathname } });
  if (oauthError) error.textContent = oauthError.message;
}));

document.querySelectorAll('[data-account-type]').forEach(button => button.addEventListener('click', () => {
  setOnboardingAccountType(button.dataset.accountType);
  $('#onboarding-error').textContent = '';
}));

$('#parent-continue').addEventListener('click', () => {
  const code = $('#parent-invite-code').value.trim().toUpperCase();
  const error = $('#onboarding-error');
  error.textContent = '';
  if (code !== 'GSLDI2') {
    error.textContent = tr('邀请码不正确，请向课后班确认。','That invitation code is not valid. Please check with the academy.');
    return;
  }
  parentCodeVerified = true;
  $('#family-parent-name').value ||= currentUser?.name || '';
  $('#family-email').value = currentUser?.email || '';
  renderFamilyChildren();
  setOnboardingAccountType('parent');
  setTimeout(() => $('#family-parent-name').focus(), 0);
});
$('#parent-back').addEventListener('click', () => {
  parentCodeVerified = false;
  setOnboardingAccountType('parent');
  $('#onboarding-error').textContent = '';
  $('#parent-invite-code').focus();
});
$('#family-child-count').addEventListener('change', renderFamilyChildren);

$('#onboarding-form').addEventListener('submit', async event => {
  event.preventDefault();
  const error = $('#onboarding-error');
  error.textContent = '';
  const form = $('#onboarding-form');
  if (onboardingAccountType === 'parent') {
    if (!parentCodeVerified) return void (error.textContent = tr('请先验证家长邀请码。','Verify the parent invitation code first.'));
    const parentName = $('#family-parent-name').value.trim();
    const address = $('#family-address').value.trim();
    const phone = $('#family-phone').value.trim();
    const childCards = [...$('#family-children').querySelectorAll('.family-child-card')];
    const children = childCards.map(card => ({
      name: card.querySelector('[data-family-child="name"]').value.trim(),
      birth_date: card.querySelector('[data-family-child="birth_date"]').value,
      school: card.querySelector('[data-family-child="school"]').value.trim(),
      grade: card.querySelector('[data-family-child="grade"]').value,
      report: card.querySelector('[data-family-child="exam_report"]').files[0] || null
    }));
    if (!children.some(child => child.report)) return void (error.textContent = tr('请至少上传一位孩子最近的考试成绩。','Upload a recent test result for at least one child.'));
    if (parentName.length < 2 || address.length < 5 || phone.length < 7 || children.some(child => !child.name || !child.birth_date || !child.school || !child.grade)) {
      return void (error.textContent = tr('请完整填写家长和每位孩子的必填资料。','Complete the required parent and child details.'));
    }
    for (const child of children) {
      if (child.report && (child.report.size > 10 * 1024 * 1024 || !['application/pdf','image/jpeg','image/png','image/webp'].includes(child.report.type))) {
        return void (error.textContent = tr('成绩单需为 PDF、JPG、PNG 或 WebP，且不超过 10 MB。','Each result must be PDF, JPG, PNG, or WebP and no larger than 10 MB.'));
      }
    }
    form.setAttribute('aria-busy', 'true');
    const uploadedPaths = [];
    try {
      for (const child of children) {
        child.exam_report_path = null;
        if (!child.report) continue;
        const extension = ({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[child.report.type];
        const path = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await sb.storage.from('family-exam-results').upload(path, child.report, { contentType: child.report.type, upsert: false });
        if (uploadError) throw uploadError;
        child.exam_report_path = path;
        uploadedPaths.push(path);
      }
      const payload = children.map(({name,birth_date,school,grade,exam_report_path}) => ({name,birth_date,school,grade,exam_report_path}));
      const { error: rpcError } = await sb.rpc('complete_parent_registration', {
        p_invite_code: $('#parent-invite-code').value.trim().toUpperCase(),
        p_parent_name: parentName, p_home_address: address, p_phone: phone, p_children: payload
      });
      if (rpcError) throw rpcError;
    } catch (saveError) {
      if (uploadedPaths.length) await sb.storage.from('family-exam-results').remove(uploadedPaths);
      console.error(saveError);
      form.removeAttribute('aria-busy');
      error.textContent = /family-exam-results|bucket|complete_parent_registration|schema cache|relation .* does not exist/i.test(saveError.message || '')
        ? tr('家庭资料服务尚未启用，请管理员先在 Supabase 执行家庭资料迁移脚本。','Family registration is not enabled yet. Ask the administrator to apply the Supabase migration.')
        : tr('保存失败，请检查网络后重试。','Could not save your details. Check your connection and try again.');
      return;
    }
    form.removeAttribute('aria-busy');
    $('#onboarding').hidden = true;
    const { data: { session } } = await sb.auth.getSession();
    if (session) await enterPortal(session.user); else showAuth();
    return;
  }
  const studentName = $('#onboarding-student-name').value.trim();
  const code = $('#onboarding-code').value.trim().toUpperCase();
  if (studentName.length < 2) return void (error.textContent = tr('请输入至少 2 个字符的老师姓名。','Enter a teacher name with at least 2 characters.'));
  if (!code) return void (error.textContent = tr('请输入教师邀请码。','Enter the teacher invitation code.'));
  form.setAttribute('aria-busy', 'true');
  const { error: rpcError } = await sb.rpc('complete_account_onboarding', { p_display_name: studentName, p_invite_code: code });
  if (rpcError) {
    form.removeAttribute('aria-busy');
    error.textContent = /invite|invalid/i.test(rpcError.message) ? tr('邀请码无效，请向课后班确认。','The invitation code is invalid. Please check with the academy.') : tr('暂时无法完成设置，请稍后重试。','Setup could not be completed. Please try again.');
    return;
  }
  form.removeAttribute('aria-busy');
  $('#onboarding').hidden = true;
  const { data: { session } } = await sb.auth.getSession();
  if (session) await enterPortal(session.user); else showAuth();
});

$('#onboarding-logout').addEventListener('click', async () => { await sb.auth.signOut(); showAuth(); });

$('#profile-button').addEventListener('click', openProfile);
$('#top-profile').addEventListener('click', openProfile);
document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', closeProfile));
$('#profile-modal').addEventListener('click', event => { if (event.target === $('#profile-modal')) closeProfile(); });
$('#save-profile').addEventListener('click', saveProfile);
$('#logout').addEventListener('click', async () => { await sb.auth.signOut(); showAuth(); });

async function initAuth() {
  if (!sb) {
    showAuth();
    $('#login-error').textContent = tr('服务器尚未连接。','The server is not connected yet.');
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (session) await enterPortal(session.user); else showAuth();
  sb.auth.onAuthStateChange((event, sessionValue) => {
    if (event === 'SIGNED_OUT') setTimeout(showAuth, 0);
    if (event === 'SIGNED_IN' && sessionValue && !currentUser) setTimeout(() => enterPortal(sessionValue.user), 0);
  });
}

initAuth();

if (new URLSearchParams(location.search).get('enrollment') === 'sent') {
  toast(tr(
    '报名申请已发送。请使用 Google 登录家长中心，输入邀请码 GSLDI2，再填写家长和孩子资料。',
    'Your enrolment enquiry was sent. Sign in to the family portal with Google, enter invitation code GSLDI2, and complete the family details.'
  ));
  history.replaceState(null, '', location.pathname + location.hash);
}






