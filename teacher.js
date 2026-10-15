const tq = selector => document.querySelector(selector);
const teacherEnglish = localStorage.getItem('gsa-language') === 'en';
const tt = (zh, en) => teacherEnglish ? en : zh;
const te = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const teacherReady = Boolean(window.supabase && window.GSA_SUPABASE?.url && !window.GSA_SUPABASE.url.startsWith('YOUR_'));
const teacherSb = teacherReady ? window.supabase.createClient(window.GSA_SUPABASE.url, window.GSA_SUPABASE.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

let teacherUser = null;
let teacherProfile = null;
let teacherView = 'data';
let teacherDashboardStudentId = null;
let teacherGradeSubject = null;
let teacherScoreStudentId = null;
let teacherScoreSubject = 'Reading';
let teacherData = { students:[], classes:[], enrollments:[], parents:[], parentLinks:[], familyRegistrations:[], assignments:[], progress:[], exams:[], results:[], invoices:[], updates:[], dashboards:[], trends:[], homeworkRecords:[], attendance:[], monthlyReports:[] };
let teacherToastTimer;

function withTimeout(promise, milliseconds = 8000) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(tt('网络连接较慢，请重试。','The connection is taking too long. Please retry.'))), milliseconds); });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

function showTeacherAccess(profile) {
  teacherProfile = profile || {};
  tq('#teacher-loading').hidden = true;
  tq('#teacher-app').hidden = true;
  tq('#teacher-access').hidden = false;
  setTimeout(() => tq('#teacher-invite-code').focus(), 0);
}

const teacherViews = {
  data: [tt('学生与账号','Students & Accounts'), tt('查看家长登记的学生资料和成绩单。','Review student details and test reports submitted by families.')],
  progress: [tt('成绩与进步','Scores & Progress'), tt('上传或修改成绩照片、分数和评语，并查看对比、最高成绩和满分率。','Upload or edit score photos, results, and comments; review comparisons, highest scores, and perfect-score rates.')],
  updates: [tt('课后班动态','Academy Updates'), tt('发布课堂活动、照片和学习花絮。','Publish class moments, photos, and academy news.')],
  homework: [tt('作业','Homework'), tt('填写学生作业、完成状态、成绩、答对答错和科目。','Record homework, completion, grade, correct and wrong answers, and subject.')],
  attendance: [tt('出勤与课程','Attendance & Classes'), tt('记录到校、离校、请假和缺席，并查看课程安排。','Record check-in, check-out, absences, and class schedules.')],
  fees: [tt('费用账单','Fees & Invoices'), tt('向学生发布费用、到期日和缴费状态。','Publish fees, due dates, and payment status.')],
  reports: [tt('月度学习报告','Monthly Learning Report'), tt('总结本月亮点、需要加强的地方和下月目标。','Summarize strengths, improvement areas, and next month’s goal.')]
};

function teacherToast(message, error = false) {
  const toast = tq('#teacher-toast');
  toast.textContent = message;
  toast.style.background = error ? '#d33f57' : '#3c3c3c';
  toast.style.display = 'block';
  clearTimeout(teacherToastTimer);
  teacherToastTimer = setTimeout(() => toast.style.display = 'none', 2600);
}

function teacherDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(teacherEnglish ? 'en-US' : 'zh-CN', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(date);
}
function teacherDateInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function studentLabel(student) { return `${student.first_name || ''} ${student.last_name || ''}`.trim(); }
function studentAccountLabel(student) {
  const link = teacherData.parentLinks.find(item => item.student_id === student.id);
  const parent = link ? byId(teacherData.parents, link.parent_id) : null;
  const account = parent ? (parent.email || parent.full_name) : tt('未关联账号','Unlinked account');
  return `${studentLabel(student)} · ${account}`;
}
function classLabel(course) { return `${course.subject} · ${course.title}`; }
function teacherSubjectKey(value) {
  const key=String(value||'').trim().toLocaleLowerCase();
  if(['阅读','read','reading'].includes(key)) return 'Reading';
  if(['数学','math','mathematics'].includes(key)) return 'Math';
  if(['听力','listen','listening'].includes(key)) return 'Listening';
  if(['语法','grammar','grammer'].includes(key)) return 'Grammar';
  return value;
}
function byId(list, id) { return list.find(item => item.id === id); }
function opts(list, label, includeAll = false) {
  const first = includeAll ? `<option value="">${tt('所有家长','All families')}</option>` : `<option value="">${tt('请选择','Choose…')}</option>`;
  return first + list.map(item => `<option value="${te(item.id)}">${te(label(item))}</option>`).join('');
}
function studentPicker(name = 'student_ids', students = teacherData.students) {
  const items = students.map(student=>`<label class="student-picker-option" data-picker-option><input type="checkbox" name="${name}" value="${te(student.id)}"><span><strong>${te(studentLabel(student))}</strong>${student.grade?`<small>${te(student.grade)}</small>`:''}</span></label>`).join('');
  return `<div class="student-picker" data-student-picker><div class="student-picker-tools"><input type="search" data-student-search placeholder="${tt('搜索学生姓名','Search students')}" aria-label="${tt('搜索学生','Search students')}"><button type="button" data-student-select-all>${tt('全选','Select all')}</button><button type="button" data-student-clear>${tt('清空','Clear')}</button></div><div class="student-picker-list">${items||`<div class="teacher-empty">${tt('暂无学生','No students')}</div>`}</div><small data-student-count>${tt('已选择 0 位学生','0 students selected')}</small></div>`;
}
function studentInputRows(fields, students = teacherData.students) {
  const rows = students.map(student => `<article class="batch-student-row" data-batch-row="${te(student.id)}" hidden><h3>${te(studentAccountLabel(student))}</h3><div class="teacher-form-row">${fields.map(field => {
    const label = tt(field.zh, field.en);
    const control = field.options
      ? `<select data-batch-field="${te(field.name)}" disabled${field.required ? ' required' : ''}>${field.options.map(option => `<option value="${te(option.value)}">${tt(option.zh, option.en)}</option>`).join('')}</select>`
      : field.multiline
        ? `<textarea data-batch-field="${te(field.name)}" disabled${field.required ? ' required' : ''} placeholder="${te(field.placeholder || '')}"></textarea>`
        : `<input data-batch-field="${te(field.name)}" type="${te(field.type || 'text')}" disabled${field.required ? ' required' : ''}${field.min !== undefined ? ` min="${te(field.min)}"` : ''}${field.step ? ` step="${te(field.step)}"` : ''}${field.placeholder ? ` placeholder="${te(field.placeholder)}"` : ''}>`;
    return `<label>${label}${control}</label>`;
  }).join('')}</div></article>`).join('');
  return `<div class="batch-student-rows" data-batch-records>${rows}</div>`;
}
function batchValue(form, studentId, field, fallback = '') {
  const row = [...form.querySelectorAll('[data-batch-row]')].find(item => item.dataset.batchRow === studentId);
  return row?.querySelector(`[data-batch-field="${CSS.escape(field)}"]`)?.value ?? fallback;
}
function setBatchValue(form, studentId, field, value) {
  const row = [...form.querySelectorAll('[data-batch-row]')].find(item => item.dataset.batchRow === studentId);
  const control = row?.querySelector(`[data-batch-field="${CSS.escape(field)}"]`);
  if (control) control.value = value ?? '';
}
function panel(title, description, body) { return `<section class="teacher-panel"><h2>${title}</h2><p>${description}</p>${body}</section>`; }
function emptyList() { return `<div class="teacher-empty">${tt('暂无记录','No records yet')}</div>`; }
function listRow(icon, title, detail, actions = '') { return `<div class="teacher-row"><span class="teacher-row-icon">${icon}</span><div class="teacher-row-main"><strong>${title}</strong><small>${detail}</small></div>${actions}</div>`; }
function del(table, id, extra = '') { return `<button class="teacher-delete" type="button" data-delete-table="${table}" data-delete-id="${te(id)}" ${extra}>${tt('删除','Delete')}</button>`; }

async function loadTeacherData() {
  const requests = [
    ['students', teacherSb.from('students').select('*').order('created_at', { ascending:false })],
    ['classes', teacherSb.from('classes').select('*').order('created_at', { ascending:false })],
    ['enrollments', teacherSb.from('enrollments').select('*')],
    ['parents', teacherSb.from('profiles').select('id,full_name,email,onboarding_complete,role').eq('role','parent').order('created_at', { ascending:false })],
    ['parentLinks', teacherSb.from('parent_students').select('*')],
    ['assignments', teacherSb.from('assignments').select('*').order('published_at', { ascending:false })],
    ['progress', teacherSb.from('assignment_progress').select('*')],
    ['exams', teacherSb.from('exams').select('*').order('exam_date', { ascending:false })],
    ['results', teacherSb.from('exam_results').select('*').order('published_at', { ascending:false })],
    ['invoices', teacherSb.from('tuition_invoices').select('*').order('created_at', { ascending:false })],
    ['updates', teacherSb.from('academy_updates').select('*').order('published_at', { ascending:false })],
    ['dashboards', teacherSb.from('student_dashboard_metrics').select('*')],
    ['trends', teacherSb.from('student_score_trend').select('*').order('recorded_on', { ascending:false })],
    ['homeworkRecords', teacherSb.from('student_homework_records').select('*').order('assigned_on', { ascending:false })],
    ['attendance', teacherSb.from('student_attendance').select('*').order('attendance_date', { ascending:false })],
    ['monthlyReports', teacherSb.from('student_monthly_reports').select('*').order('report_month', { ascending:false })]
  ];
  const results = await Promise.all(requests.map(item => item[1]));
  const failed = results.find(result => result.error);
  if (failed) throw failed.error;
  requests.forEach((item, index) => { teacherData[item[0]] = results[index].data || []; });
  const familyResult = await teacherSb.from('family_registrations').select('*').order('updated_at', { ascending:false });
  if (familyResult.error && !/family_registrations|schema cache|relation .* does not exist/i.test(familyResult.error.message || '')) throw familyResult.error;
  teacherData.familyRegistrations = familyResult.data || [];
  if (!teacherData.students.some(item => item.id === teacherDashboardStudentId)) teacherDashboardStudentId = teacherData.students[0]?.id || null;
}

function overviewPage() {
  const cards = [
    [tt('学生','Students'), teacherData.students.length], [tt('课程','Classes'), teacherData.classes.length],
    [tt('未完成作业记录','Open homework'), teacherData.progress.filter(item => !['submitted','graded'].includes(item.status)).length],
    [tt('课后班动态','Updates'), teacherData.updates.length], [tt('测评','Assessments'), teacherData.exams.length],
    [tt('费用账单','Invoices'), teacherData.invoices.length]
  ];
  return `<section class="teacher-dashboard">${cards.map(item => `<article class="teacher-stat"><small>${item[0]}</small><strong>${item[1]}</strong></article>`).join('')}</section>
  <section class="teacher-quick">${Object.entries(teacherViews).filter(([key]) => key !== 'overview').map(([key,value]) => `<button type="button" data-teacher-view="${key}">${value[0]}<br><small>${value[1]}</small></button>`).join('')}</section>`;
}

function updatesAdminPage() {
  const form = `<form id="update-composer" class="teacher-form" data-admin-form="updates"><label class="update-file-label">${tt('上传照片','Upload photo')}<input id="update-photo-input" name="image_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required><span>${tt('选择手机或电脑里的照片，最大 8 MB','Choose a photo from this device, up to 8 MB')}</span></label><label>${tt('动态标题','Title')}<input name="title" required maxlength="120"></label><div class="teacher-form-row"><label>${tt('分类','Category')}<input name="category" value="${tt('课堂动态','Class moment')}" maxlength="40"></label><label>${tt('发布老师','Author')}<input name="author_name" value="${te(teacherProfile.full_name)}" required></label></div><div class="student-audience-tools"><label><input type="checkbox" name="send_to_all"> ${tt('发送给所有家长','Send to all families')}</label></div><div class="teacher-field"><span>${tt('选择家长对应的学生（可多选）','Choose students / families (multiple)')}</span>${studentPicker()}</div><label>${tt('动态内容','Post')}<textarea name="body" required maxlength="2000"></textarea></label><button class="teacher-submit" type="submit">${tt('上传并发布动态','Upload & publish')}</button></form>`;
  const rows = teacherData.updates.length ? teacherData.updates.map(item => listRow('✦', te(item.title), `${te(item.category)} · ${te(item.author_name)} · ${teacherDate(item.published_at)}`, del('academy_updates', item.id))).join('') : emptyList();
  return `<button class="teacher-create-update" type="button" data-open-update-composer aria-label="${tt('上传新动态','Upload new update')}">+</button><div class="teacher-section-grid">${panel(tt('发布新动态','New Update'),tt('直接选择照片，填写内容后发布给家长。','Choose a photo, add the details, and publish it to families.'),form)}${panel(tt('已发布动态','Published Updates'),tt('没有动态时显示“暂无”。','When there are no updates, “No records yet” is shown.'),`<div class="teacher-list">${rows}</div>`)}</div>`;
}

function studentsAdminPage() {
  const familyRows = teacherData.familyRegistrations.length ? teacherData.familyRegistrations.map(registration => {
    const children = Array.isArray(registration.children) ? registration.children : [];
    const childLines = children.map(child => `<div class="family-admin-child"><strong>${te(child.name)}</strong><span>${te(child.birth_date)} · ${te(child.school)} · ${te(child.grade)}</span>${child.exam_report_path ? `<button class="teacher-edit" type="button" data-family-report="${te(child.exam_report_path)}">${tt('查看成绩单','View test result')}</button>` : `<small>${tt('未上传成绩单','No result uploaded')}</small>`}</div>`).join('');
    return `<article class="family-admin-record"><header><strong>${te(registration.parent_name)}</strong><span>${te(registration.email)} · ${te(registration.phone)}</span></header><p>${te(registration.home_address)}</p>${childLines}<small>${tt('最后更新','Last updated')}: ${teacherDate(registration.updated_at)}</small></article>`;
  }).join('') : emptyList();
  const familyPanel = panel(tt('家长登记资料','Family Registrations'),tt('家长提交的联系资料、孩子信息和成绩单。','Parent contact details, child information, and uploaded test results.'),`<div class="family-admin-list">${familyRows}</div>`);
  return `<div class="teacher-stack">${familyPanel}</div>`;
}
function homeworkAdminPage() {
  const fields=[
    {name:'has_homework',zh:'是否有作业',en:'Has homework',options:[{value:'true',zh:'有作业',en:'Yes'},{value:'false',zh:'没有作业',en:'No homework'}]},
    {name:'completion_status',zh:'完成状态',en:'Completion',options:[{value:'unfinished',zh:'未完成',en:'Unfinished'},{value:'completed',zh:'已完成',en:'Completed'}]},
    {name:'subject',zh:'科目',en:'Subject',required:true,placeholder:tt('例如：数学','Example: Math')},
    {name:'grade',zh:'成绩',en:'Grade',placeholder:tt('例如：95 或 A','Example: 95 or A')},
    {name:'correct_count',zh:'答对几个',en:'Correct answers',type:'number',min:0,step:1},
    {name:'wrong_count',zh:'答错几个',en:'Wrong answers',type:'number',min:0,step:1}
  ];
  const form = `<form id="homework-record-form" class="teacher-form" data-admin-form="homework-record"><input name="record_id" type="hidden"><div class="teacher-field"><span>${tt('选择学生（可多选）','Choose students (multiple)')}</span>${studentPicker()}</div><p class="student-batch-note">${tt('每位学生会显示独立的作业和成绩输入项；日期与老师信息统一填写。','Each student gets separate homework and score fields. Date and teacher are shared.')}</p>${studentInputRows(fields)}<div class="teacher-form-row"><label>${tt('作业日期','Homework date')}<input name="assigned_on" type="date" required></label><label>${tt('老师','Teacher')}<input name="teacher_name" value="${te(teacherProfile.full_name)}" required></label></div><button class="teacher-submit" type="submit">${tt('保存学生作业','Save student homework')}</button></form>`;
  const rows = teacherData.homeworkRecords.length ? teacherData.homeworkRecords.map(item => { const status = item.has_homework ? (item.completion_status === 'completed' ? tt('已完成','Completed') : tt('未完成','Unfinished')) : tt('没有作业','No homework'); const detail = `${te(item.subject)} · ${status} · ${tt('成绩','Grade')} ${te(item.grade || '—')} · ✓ ${te(item.correct_count ?? '—')} / ✕ ${te(item.wrong_count ?? '—')} · ${teacherDate(item.assigned_on)}`; return listRow('✓',te(studentAccountLabel(byId(teacherData.students,item.student_id)||{})),detail,`<button class="teacher-edit" type="button" data-edit-record="homework" data-edit-id="${te(item.id)}">${tt('修改','Edit')}</button>${del('student_homework_records',item.id)}`); }).join('') : emptyList();
  return `<div class="teacher-section-grid">${panel(tt('填写学生作业','Student Homework'),tt('老师填写，家长和学生只能查看。','Teachers edit; families and students can only view.'),form)}${panel(tt('学生作业记录','Homework Records'),tt('可以修改或删除已保存的记录。','Edit or remove saved records.'),`<div class="teacher-list">${rows}</div>`)}</div>`;
}

function progressAdminPage() {
  const roster = teacherData.students;
  if (!roster.some(student => student.id === teacherScoreStudentId)) teacherScoreStudentId = roster[0]?.id || null;
  const activeStudent = byId(roster, teacherScoreStudentId);
  const subjects = [
    ['Reading',tt('阅读','Reading')],['Math',tt('数学','Math')],['Listening',tt('听力','Listening')],['Grammar',tt('语法','Grammar')]
  ];
  const scoreOptions = subjects.map(([value,label])=>`<option value="${value}" ${teacherScoreSubject===value?'selected':''}>${label}</option>`).join('');
  const studentOptions = roster.map(student=>`<option value="${te(student.id)}" ${student.id===teacherScoreStudentId?'selected':''}>${te(studentAccountLabel(student))}</option>`).join('');
  const form = `<form id="score-upload-form" class="teacher-form score-upload-form" data-admin-form="ocr-score"><input name="editing_exam_id" type="hidden">
    <div class="teacher-form-row"><label>${tt('学生','Student')}<select name="student_id" data-score-student required>${studentOptions||`<option value="">${tt('暂无学生','No students')}</option>`}</select></label><label>${tt('科目','Subject')}<select name="subject" data-score-subject required>${scoreOptions}</select></label></div>
    <div class="teacher-form-row"><label>${tt('考试日期','Test date')}<input name="exam_date" type="date" value="${teacherDateInputValue()}" required></label><label>${tt('满分','Maximum score')}<input name="max_score" type="number" min="1" max="10000" step="0.01" value="100" required></label></div>
    <label class="score-image-upload">${tt('上传考试成绩照片','Upload a photo of the test result')}<input name="score_image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required><small>${tt('支持清晰的打印成绩照片。非百分制考试请先填写实际满分。识别在本机浏览器完成；手写或模糊照片请手动核对成绩。','Clear photos of printed results work best. Set the correct maximum for non-percentage tests. OCR runs in this browser; verify handwritten or unclear results manually.')}</small></label>
    <button class="teacher-submit" type="button" data-run-score-ocr ${roster.length?'':'disabled'}>${tt('自动读取成绩','Read score from photo')}</button>
    <div class="score-ocr-status" data-score-ocr-status role="status"></div><progress class="score-ocr-progress" data-score-ocr-progress max="1" value="0" hidden></progress>
    <div class="score-recognized" data-score-review hidden><label>${tt('成绩','Score')}<input name="score" type="number" min="0" max="10000" step="0.01" required></label><label>${tt('老师评语（家长可见）','Teacher comment (visible to family)')}<textarea name="teacher_comment" maxlength="2000" rows="3" placeholder="${tt('填写本次学习表现或下一步建议','Add feedback or a next step')} "></textarea></label><details><summary>${tt('查看识别文字','View recognized text')}</summary><pre data-score-ocr-text></pre></details><p class="score-verify-note">${tt('请确认学生、科目、考试日期和分数无误后发布。','Confirm the student, subject, test date, and score before publishing.')}</p><div class="teacher-form-actions"><button class="teacher-submit" type="submit" data-save-score>${tt('发布成绩并更新对比','Publish score and update comparison')}</button><button class="teacher-edit" type="button" data-cancel-score-edit hidden>${tt('取消修改','Cancel edit')}</button></div></div>
  </form>`;
  const analysis = teacherScoreAnalysis(teacherScoreStudentId, teacherScoreSubject);
  const historyRows = teacherData.results.filter(result=>result.student_id===teacherScoreStudentId && result.score!=null && Number(examForTeacherResult(result)?.max_score)>0 && subjectForTeacherExam(examForTeacherResult(result))===teacherScoreSubject).sort((a,b)=>new Date(examForTeacherResult(b)?.exam_date)-new Date(examForTeacherResult(a)?.exam_date)).map(result=>{
    const exam=examForTeacherResult(result);
    const actions=`<button class="teacher-edit" type="button" data-edit-score-result data-student-id="${te(result.student_id)}" data-exam-id="${te(result.exam_id)}">${tt('修改','Edit')}</button>${result.report_path?`<button class="teacher-edit" type="button" data-score-report="${te(result.report_path)}">${tt('查看照片','View photo')}</button>`:''}<button class="teacher-delete" type="button" data-delete-table="exam_results" data-delete-id="${te(result.id)}" data-student-id="${te(result.student_id)}" data-exam-id="${te(result.exam_id)}" data-report-path="${te(result.report_path||'')}">${tt('删除','Delete')}</button>`;
    const comment=result.teacher_comment?` · ${te(result.teacher_comment)}`:'';
    return listRow('↗',`${te(subjectForTeacherExam(exam))} · ${te(result.score)} / ${te(exam?.max_score)}`,`${teacherDate(exam?.exam_date)} · ${Math.round(Number(result.score)/Number(exam?.max_score)*100)}%${result.report_path?` · ${tt('附有原始照片','Original photo saved')}`:''}${comment}`,actions);
  }).join('') || emptyList();
  const commentary = `<p class="score-ocr-intro">${tt('上传清晰的成绩单照片，系统会先识别分数；老师核对后发布。发布后自动与同一学生、同一科目的上次成绩比较，并计算历史最高分和满分率。','Upload a clear score photo. The system reads a suggested score for teacher review. Once published, it compares the same student and subject with the previous result, and calculates the highest score and perfect-score rate.')}</p>`;
  const cards = `<div class="score-admin-summary"><article><small>${tt('上次成绩','Previous score')}</small><strong>${analysis.previous ? `${analysis.previous.percent}%` : '—'}</strong><span>${analysis.previous ? `${analysis.previous.result.score} / ${analysis.previous.exam.max_score} · ${teacherDate(analysis.previous.exam.exam_date)}` : tt('暂无上次记录','No previous result')}</span></article><article><small>${tt('历史最高成绩','Highest to date')}</small><strong>${analysis.best ? `${analysis.best.percent}%` : '—'}</strong><span>${analysis.best ? `${analysis.best.result.score} / ${analysis.best.exam.max_score} · ${teacherDate(analysis.best.exam.exam_date)}` : tt('暂无成绩','No results yet')}</span></article><article><small>${tt('满分率','Perfect-score rate')}</small><strong>${analysis.perfectRate == null ? '—' : `${analysis.perfectRate}%`}</strong><span>${analysis.perfectRate == null ? tt('暂无测评','No assessments') : `${analysis.perfectCount} / ${analysis.count} ${tt('次','tests')}`}</span></article></div><p class="score-comparison-status">${analysis.latest ? `${tt('最近一次','Latest')}: ${analysis.latest.percent}%${analysis.previous ? ` · ${tt('相比上次','vs. previous')} <strong class="${analysis.latest.percent>=analysis.previous.percent?'score-up':'score-down'}">${analysis.latest.percent>analysis.previous.percent?'+':''}${analysis.latest.percent-analysis.previous.percent}%</strong>` : ` · ${tt('等待下次测评进行对比','Waiting for the next assessment to compare')}`}` : tt('发布首个成绩后会显示自动对比。','Automatic comparison appears after the first score is published.')}</p>`;
  const rows = `<div class="teacher-list">${historyRows}</div>`;
  const scoreWorkflow = `<div class="teacher-stack">${panel(tt('上传并发布成绩','Upload & Publish Score'),'',`${commentary}${form}`)}${panel(tt('成绩分析','Score Analysis'),tt('按学生和科目查看上次成绩、历史最高成绩、满分率及历次记录。','Review the previous score, highest score, perfect-score rate, and score history by student and subject.'),activeStudent?`${cards}<div class="teacher-list">${rows}</div>`:emptyList())}</div>`;
  return `<div class="teacher-stack"><div class="teacher-form-row score-analysis-filters"><label>${tt('学生','Student')}<select data-score-student-filter>${studentOptions||`<option value="">${tt('暂无学生','No students')}</option>`}</select></label><label>${tt('科目','Subject')}<select data-score-subject-filter>${scoreOptions}</select></label></div>${scoreWorkflow}</div>`;
}

function examForTeacherResult(result) { return teacherData.exams.find(exam=>exam.id===result.exam_id) || null; }
function subjectForTeacherExam(exam) { return teacherSubjectKey(exam?.subject || teacherData.classes.find(item=>item.id===exam?.class_id)?.subject || ''); }
function teacherScoreAnalysis(studentId, subject) {
  const items = teacherData.results.map(result=>({result,exam:examForTeacherResult(result)}))
    .filter(item=>item.result.student_id===studentId && subjectForTeacherExam(item.exam)===subject && item.result.score!=null && Number(item.exam.max_score)>0)
    .map(item=>({...item,percent:Math.round(Number(item.result.score)/Number(item.exam.max_score)*100)}))
    .sort((a,b)=>new Date(b.exam.exam_date)-new Date(a.exam.exam_date) || new Date(b.result.published_at)-new Date(a.result.published_at));
  const perfectCount=items.filter(item=>Number(item.result.score)>=Number(item.exam.max_score)).length;
  return {items,count:items.length,latest:items[0]||null,previous:items[1]||null,best:[...items].sort((a,b)=>b.percent-a.percent || new Date(a.exam.exam_date)-new Date(b.exam.exam_date))[0]||null,perfectCount,perfectRate:items.length?Math.round(perfectCount/items.length*100):null};
}

function editPhotoScoreResult(studentId, examId) {
  const result=teacherData.results.find(item=>item.student_id===studentId&&item.exam_id===examId);
  const exam=teacherData.exams.find(item=>item.id===examId);
  const form=tq('#score-upload-form');
  if(!result||!exam||!form)return;
  form.elements.editing_exam_id.value=examId;
  form.elements.student_id.value=studentId;
  form.elements.subject.value=subjectForTeacherExam(exam);
  form.elements.exam_date.value=String(exam.exam_date||'').slice(0,10);
  form.elements.max_score.value=exam.max_score;
  form.elements.score.value=result.score??'';
  form.elements.teacher_comment.value=result.teacher_comment||'';
  form.elements.score_image.value='';
  form.elements.score_image.required=false;
  ['student_id','subject','exam_date','max_score'].forEach(name=>{form.elements[name].disabled=true;});
  form.querySelector('[data-score-review]').hidden=false;
  form.querySelector('[data-score-ocr-status]').textContent=tt('正在修改已发布成绩；可选上传替换照片。','Editing a published result; upload a replacement photo if needed.');
  form.querySelector('[data-save-score]').textContent=tt('保存修改','Save changes');
  form.querySelector('[data-cancel-score-edit]').hidden=false;
  form.scrollIntoView({behavior:'smooth',block:'center'});
}

function attendanceAdminPage() {
  const fields=[{name:'status',zh:'出勤状态',en:'Status',options:[{value:'present',zh:'到课',en:'Present'},{value:'excused',zh:'请假',en:'Excused'},{value:'absent',zh:'缺席',en:'Absent'}]},{name:'check_in',zh:'到校时间',en:'Check-in',type:'time'},{name:'check_out',zh:'离校时间',en:'Check-out',type:'time'},{name:'note',zh:'老师备注',en:'Teacher note',placeholder:tt('例如：按时到校，完成阅读练习。','Example: Arrived on time and completed reading practice.')}];
  const form = `<form class="teacher-form" data-admin-form="attendance"><div class="teacher-field"><span>${tt('选择学生（可多选）','Choose students (multiple)')}</span>${studentPicker()}</div><p class="student-batch-note">${tt('每位学生可单独填写出勤状态、时间和备注；日期与老师信息统一填写。','Set attendance, times, and notes per student. Date and teacher are shared.')}</p>${studentInputRows(fields)}<div class="teacher-form-row"><label>${tt('日期','Date')}<input name="attendance_date" type="date" required></label><label>${tt('记录老师','Teacher')}<input name="teacher_name" value="${te(teacherProfile.full_name)}" required></label></div><button class="teacher-submit" type="submit">${tt('保存出勤记录','Save attendance')}</button></form>`;
  const statusLabel = value => ({present:tt('到课','Present'),absent:tt('缺席','Absent'),excused:tt('请假','Excused')})[value] || value;
  const rows = teacherData.attendance.length ? teacherData.attendance.map(item => listRow('◷',te(studentAccountLabel(byId(teacherData.students,item.student_id)||{})),`${teacherDate(item.attendance_date)} · ${statusLabel(item.status)} · ${te(item.check_in||'—')}–${te(item.check_out||'—')} · ${te(item.note||tt('无备注','No note'))}`,del('student_attendance',item.id))).join('') : emptyList();
  const classes = teacherData.classes.length ? teacherData.classes.map(item=>listRow('Aa',te(classLabel(item)),`${te(item.teacher_name)} · ${te(item.room||'—')} · ${te(item.term||'—')}`)).join('') : emptyList();
  return `<div class="teacher-stack"><div class="teacher-section-grid">${panel(tt('每日出勤','Daily Attendance'),tt('相同学生和日期再次保存会更新原记录。','Saving the same student and date updates the record.'),form)}${panel(tt('出勤记录','Attendance Records'),'',`<div class="teacher-list">${rows}</div>`)}</div>${panel(tt('课程信息','Class Information'),tt('已安排课程在这里查看，家长端会同步显示。','Review scheduled classes here; families see the same schedule.'),`<div class="teacher-list">${classes}</div>`)}</div>`;
}

function reportsAdminPage() {
  const fields=[{name:'teacher_summary',zh:'老师总结',en:'Teacher summary',multiline:true,required:true,placeholder:tt('总结这位学生本月的整体表现。','Summarize this student’s month.')},{name:'strengths',zh:'本月亮点',en:'Strengths',multiline:true},{name:'needs_improvement',zh:'需要加强',en:'Needs improvement',multiline:true},{name:'next_goal',zh:'下月目标',en:'Next goal',multiline:true}];
  const form = `<form class="teacher-form" data-admin-form="monthly-report"><div class="teacher-field"><span>${tt('选择学生（可多选）','Choose students (multiple)')}</span>${studentPicker()}</div><p class="student-batch-note">${tt('每位学生都会有独立的月报内容输入项；报告月份与老师信息统一填写。','Each student gets separate monthly report fields. Month and teacher are shared.')}</p><div class="teacher-form-row"><label>${tt('报告月份','Report month')}<input name="report_month" type="month" required></label><label>${tt('老师','Teacher')}<input name="teacher_name" value="${te(teacherProfile.full_name)}" required></label></div>${studentInputRows(fields)}<button class="teacher-submit" type="submit">${tt('发布月度报告','Publish monthly report')}</button></form>`;
  const rows = teacherData.monthlyReports.length ? teacherData.monthlyReports.map(item=>listRow('◎',te(studentAccountLabel(byId(teacherData.students,item.student_id)||{})),`${String(item.report_month||'').slice(0,7)} · ${te(item.teacher_summary)} · ${te(item.teacher_name)}`,del('student_monthly_reports',item.id))).join('') : emptyList();
  return `<div class="teacher-section-grid">${panel(tt('填写月度学习报告','Monthly Learning Report'),tt('家长端只读；相同学生和月份再次保存会更新报告。','Family view is read-only; saving the same student and month updates the report.'),form)}${panel(tt('已发布报告','Published Reports'),'',`<div class="teacher-list">${rows}</div>`)}</div>`;
}

function feesAdminPage() {
  const fields=[{name:'invoice_number',zh:'账单编号',en:'Invoice number',required:true},{name:'item',zh:'费用项目',en:'Item',required:true},{name:'amount',zh:'金额（美元）',en:'Amount (USD)',type:'number',min:0,step:'0.01',required:true},{name:'due_date',zh:'到期日期',en:'Due date',type:'date',required:true},{name:'status',zh:'状态',en:'Status',options:[{value:'due',zh:'待缴',en:'Due'},{value:'overdue',zh:'逾期',en:'Overdue'},{value:'paid',zh:'已缴',en:'Paid'},{value:'void',zh:'已取消',en:'Void'}]}];
  const form = `<form id="invoice-form" class="teacher-form" data-admin-form="invoices"><input name="record_id" type="hidden"><div class="teacher-field"><span>${tt('选择学生（可多选）','Choose students (multiple)')}</span>${studentPicker()}</div><p class="student-batch-note">${tt('每位学生可单独填写账单项目、金额、日期和状态。','Enter separate billing details for each student.')}</p>${studentInputRows(fields)}<button class="teacher-submit" type="submit">${tt('保存账单','Save invoice')}</button></form>`;
  const rows = teacherData.invoices.length ? teacherData.invoices.map(item => listRow('$',te(item.item),`${te(studentLabel(byId(teacherData.students,item.student_id)||{}))} · $${(item.amount_cents/100).toFixed(2)} · ${te(item.status)}`,`<button class="teacher-edit" type="button" data-edit-record="invoice" data-edit-id="${te(item.id)}">${tt('修改','Edit')}</button>${del('tuition_invoices',item.id)}`)).join('') : emptyList();
  return `<div class="teacher-section-grid">${panel(tt('新建账单','New Invoice'),'',form)}${panel(tt('账单列表','Invoices'),'',`<div class="teacher-list">${rows}</div>`)}</div>`;
}

function renderTeacher() {
  const meta = teacherViews[teacherView] || teacherViews.data;
  tq('#teacher-title').textContent = meta[0];
  tq('#teacher-subtitle').textContent = meta[1];
  document.querySelectorAll('[data-teacher-view]').forEach(button => button.classList.toggle('active', button.dataset.teacherView === teacherView));
  const pages = { data:studentsAdminPage, progress:progressAdminPage, homework:homeworkAdminPage, attendance:attendanceAdminPage, fees:feesAdminPage, reports:reportsAdminPage, updates:updatesAdminPage };
  tq('#teacher-content').innerHTML = pages[teacherView]();
}

function formValue(data, name) { return String(data.get(name) || '').trim(); }
function nullable(value) { return value === '' ? null : value; }
function nullableNumber(data, name) { const value = formValue(data, name); return value === '' ? null : Number(value); }
function selectedStudentIds(form) { return [...new Set([...form.querySelectorAll('input[name="student_ids"]:checked')].map(input=>input.value))]; }
function updateStudentPicker(picker) {
  if (!picker) return;
  const count = picker.querySelectorAll('input[name="student_ids"]:checked').length;
  const output = picker.querySelector('[data-student-count]');
  if (output) output.textContent = tt(`已选择 ${count} 位学生`,`${count} students selected`);
}
function updateBatchRows(form) {
  if (!form) return;
  const selected=new Set(selectedStudentIds(form));
  form.querySelectorAll('[data-batch-row]').forEach(row=>{const visible=selected.has(row.dataset.batchRow);row.hidden=!visible;row.querySelectorAll('input,select,textarea').forEach(input=>input.disabled=!visible);});
}
function validateBatchSelection(form, fd, studentIds) {
  const allFamilies = formValue(fd,'send_to_all') === 'on';
  const needsStudents = ['homework-record','attendance','monthly-report','invoices','direct-comments'].includes(form.dataset.adminForm)
    || (form.dataset.adminForm === 'updates' && !allFamilies);
  if (needsStudents && !studentIds.length) {
    form.removeAttribute('aria-busy');
    teacherToast(tt('请至少选择一位学生。','Select at least one student.'), true);
    return false;
  }
  if (formValue(fd,'record_id') && studentIds.length !== 1) {
    form.removeAttribute('aria-busy');
    teacherToast(tt('修改单条记录时只能选择一位学生。','Choose exactly one student when editing a single record.'), true);
    return false;
  }
  return true;
}

function editManualRecord(kind, id) {
  if (kind === 'trend') {
    const item = byId(teacherData.trends, id);
    const form = tq('#score-trend-form');
    if (!item || !form) return;
    form.elements.record_id.value = item.id;
    form.elements.student_id.value = item.student_id;
    form.elements.recorded_on.value = String(item.recorded_on || '').slice(0, 10);
    form.elements.score.value = item.score;
    form.elements.label.value = item.label;
    form.scrollIntoView({ behavior:'smooth', block:'center' });
  }
  if (kind === 'homework') {
    const item = byId(teacherData.homeworkRecords, id);
    const form = tq('#homework-record-form');
    if (!item || !form) return;
    form.elements.record_id.value = item.id;
    const checks=[...form.querySelectorAll('input[name="student_ids"]')];
    checks.forEach(input=>{input.checked=input.value===item.student_id;input.disabled=input.value!==item.student_id;});
    updateStudentPicker(form.querySelector('[data-student-picker]'));
    updateBatchRows(form);
    for(const [field,value] of Object.entries({has_homework:String(item.has_homework),completion_status:item.completion_status,subject:item.subject,grade:item.grade||'',correct_count:item.correct_count??'',wrong_count:item.wrong_count??''})) setBatchValue(form,item.student_id,field,value);
    form.elements.assigned_on.value = String(item.assigned_on || '').slice(0,10);
    form.elements.teacher_name.value = item.teacher_name;
    form.scrollIntoView({ behavior:'smooth', block:'center' });
  }
  if (kind === 'invoice') {
    const item = byId(teacherData.invoices, id);
    const form = tq('#invoice-form');
    if (!item || !form) return;
    form.elements.record_id.value = item.id;
    const checks=[...form.querySelectorAll('input[name="student_ids"]')];
    checks.forEach(input=>{input.checked=input.value===item.student_id;input.disabled=input.value!==item.student_id;});
    updateStudentPicker(form.querySelector('[data-student-picker]'));
    updateBatchRows(form);
    for(const [field,value] of Object.entries({invoice_number:item.invoice_number,item:item.item,amount:(Number(item.amount_cents||0)/100).toFixed(2),due_date:String(item.due_date||'').slice(0,10),status:item.status})) setBatchValue(form,item.student_id,field,value);
    form.scrollIntoView({ behavior:'smooth', block:'center' });
  }
}

async function uploadAcademyUpdatePhoto(file) {
  if (!(file instanceof File) || !file.size) throw new Error(tt('请选择一张照片。','Choose a photo.'));
  if (!file.type.startsWith('image/')) throw new Error(tt('只能上传图片文件。','Only image files can be uploaded.'));
  if (file.size > 8 * 1024 * 1024) throw new Error(tt('照片不能超过 8 MB。','The photo must be 8 MB or smaller.'));
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5) || 'jpg';
  const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${teacherUser.id}/${unique}.${extension}`;
  const { error } = await withTimeout(teacherSb.storage.from('academy-updates').upload(path, file, { cacheControl:'3600', contentType:file.type, upsert:false }), 20000);
  if (error) throw error;
  const { data } = teacherSb.storage.from('academy-updates').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error(tt('照片网址生成失败。','Unable to create the photo URL.'));
  return { publicUrl:data.publicUrl, path };
}

function academyPhotoPath(publicUrl) {
  const marker = '/storage/v1/object/public/academy-updates/';
  const index = String(publicUrl || '').indexOf(marker);
  return index < 0 ? null : decodeURIComponent(String(publicUrl).slice(index + marker.length));
}

let scoreOcrScriptPromise;
async function ensureScoreOcr() {
  if (window.Tesseract) return window.Tesseract;
  if (!scoreOcrScriptPromise) scoreOcrScriptPromise = new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async=true;
    script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('OCR library did not initialize'));
    script.onerror=()=>reject(new Error('OCR library could not be loaded'));
    document.head.appendChild(script);
  });
  return scoreOcrScriptPromise;
}

function extractScoreSuggestion(text, maximum) {
  const normalized=String(text||'').replace(/[，,]/g,' ').replace(/[：]/g,':');
  const max=Number(maximum);
  const candidates=[];
  const ratioPatterns=[/(\d{1,4}(?:\.\d{1,2})?)\s*\/\s*(\d{1,4}(?:\.\d{1,2})?)/g,/(\d{1,4}(?:\.\d{1,2})?)\s+(?:out\s+of|of)\s+(\d{1,4}(?:\.\d{1,2})?)/gi];
  const labelledRatio=normalized.match(/(?:score|points?|成绩|得分)[^\d]{0,12}(\d{1,4}(?:\.\d{1,2})?)\s*(?:\/|out\s+of|of)\s*(\d{1,4}(?:\.\d{1,2})?)/i);
  if(labelledRatio){const score=Number(labelledRatio[1]),denominator=Number(labelledRatio[2]);if(denominator>0&&score>=0&&score<=denominator)candidates.push({score,maximum:denominator});}
  for(const pattern of ratioPatterns){for(const match of normalized.matchAll(pattern)){const score=Number(match[1]),denominator=Number(match[2]);if(denominator===max&&score>=0&&score<=denominator)candidates.push({score,maximum:denominator});}}
  const labelled=normalized.match(/(?:score|points?|成绩|得分)\s*[:=\-]?\s*(\d{1,4}(?:\.\d{1,2})?)(\s*%)?/i);
  if(labelled){const score=Number(labelled[1]);if(score>=0&&score<=max)candidates.push({score,maximum:labelled[2]?100:max});}
  if(!candidates.length && max===100){
    const percentages=[...normalized.matchAll(/(?:^|\s)(\d{1,3}(?:\.\d{1,2})?)\s*%/g)].map(match=>Number(match[1])).filter(score=>score>=0&&score<=max);
    candidates.push(...percentages.map(score=>({score,maximum:100})));
  }
  return candidates.length?candidates[0]:null;
}

async function runScoreOcr(form, button) {
  const file=form.querySelector('[name="score_image"]').files[0];
  const status=form.querySelector('[data-score-ocr-status]');
  const progress=form.querySelector('[data-score-ocr-progress]');
  const review=form.querySelector('[data-score-review]');
  const textOutput=form.querySelector('[data-score-ocr-text]');
  if(!file)return teacherToast(tt('请先选择成绩照片。','Choose a score photo first.'),true);
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)return teacherToast(tt('请上传 JPG、PNG 或 WebP 照片，最大 10 MB。','Upload a JPG, PNG, or WebP photo up to 10 MB.'),true);
  button.disabled=true;form.setAttribute('aria-busy','true');progress.hidden=false;progress.value=0;status.textContent=tt('正在准备本地识别…首次使用会下载识别模型。','Preparing local OCR… the recognition model downloads on first use.');
  let worker;
  try{
    const Tesseract=await ensureScoreOcr();
    worker=await Tesseract.createWorker('eng',1,{logger:message=>{if(message.status==='recognizing text'&&Number.isFinite(message.progress))progress.value=message.progress;}});
    status.textContent=tt('正在从照片读取印刷文字…','Reading printed text from the photo…');
    const {data}=await worker.recognize(file);
    const suggestion=extractScoreSuggestion(data.text,form.elements.max_score.value);
    textOutput.textContent=data.text||tt('未识别到文字。','No text was detected.');
    if(suggestion==null){review.hidden=false;form.elements.score.value='';status.textContent=tt('没有可靠识别出分数。请看原图并手动输入成绩。','No reliable score was found. Review the photo and enter the score manually.');}
    else{review.hidden=false;form.elements.max_score.value=String(suggestion.maximum);form.elements.score.value=String(suggestion.score);status.textContent=tt(`识别到候选成绩 ${suggestion.score} / ${suggestion.maximum}，请核对后发布。`,`Suggested score: ${suggestion.score} / ${suggestion.maximum}. Review it before publishing.`);}
  }catch(error){console.error(error);review.hidden=false;status.textContent=tt('自动读取失败，请检查网络或手动输入成绩。','OCR could not run. Check your connection or enter the score manually.');}
  finally{if(worker)await worker.terminate();button.disabled=false;form.removeAttribute('aria-busy');progress.hidden=true;}
}

async function publishPhotoScore(form) {
  const editingExamId=form.elements.editing_exam_id.value||'';
  const studentId=form.elements.student_id.value;
  const subject=form.elements.subject.value;
  const score=Number(form.elements.score.value);
  const maxScore=Number(form.elements.max_score.value);
  const examDate=form.elements.exam_date.value;
  const file=form.elements.score_image.files[0];
  const existing=editingExamId?teacherData.results.find(item=>item.student_id===studentId&&item.exam_id===editingExamId):null;
  if(!byId(teacherData.students,studentId)||!['Reading','Math','Listening','Grammar'].includes(subject)||(!file&&!existing)||!examDate||!Number.isFinite(maxScore)||maxScore<=0||!Number.isFinite(score)||score<0||score>maxScore){form.removeAttribute('aria-busy');return teacherToast(tt('请核对学生、科目、日期、满分和成绩。','Check the student, subject, date, maximum score, and result.'),true);}
  let uploadedPath=null,createdExamId=null;
  try{
    if(file){
      const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type];
      if(!ext||file.size>10*1024*1024)throw new Error(tt('成绩照片需为 JPG、PNG 或 WebP，且不超过 10 MB。','Use a JPG, PNG, or WebP photo no larger than 10 MB.'));
      uploadedPath=`${teacherUser.id}/${crypto.randomUUID()}.${ext}`;
      const upload=await teacherSb.storage.from('teacher-score-reports').upload(uploadedPath,file,{contentType:file.type,upsert:false});
      if(upload.error)throw upload.error;
    }
    if(existing){
      const update={score,teacher_comment:nullable(form.elements.teacher_comment.value.trim()),published_at:new Date().toISOString()};
      if(uploadedPath)update.report_path=uploadedPath;
      const {error}=await teacherSb.from('exam_results').update(update).eq('student_id',studentId).eq('exam_id',editingExamId);
      if(error)throw error;
      if(uploadedPath&&existing.report_path)await teacherSb.storage.from('teacher-score-reports').remove([existing.report_path]);
    }else{
      const title=`${subject} · ${examDate}`;
      const examInsert=await teacherSb.from('exams').insert({class_id:null,subject,title,exam_date:examDate,max_score:maxScore}).select('id').single();
      if(examInsert.error)throw examInsert.error;
      createdExamId=examInsert.data.id;
      const resultInsert=await teacherSb.from('exam_results').insert({student_id:studentId,exam_id:createdExamId,score,teacher_comment:nullable(form.elements.teacher_comment.value.trim()),published_at:new Date().toISOString(),report_path:uploadedPath});
      if(resultInsert.error)throw resultInsert.error;
    }
  }catch(error){
    if(createdExamId)await teacherSb.from('exams').delete().eq('id',createdExamId);
    if(uploadedPath)await teacherSb.storage.from('teacher-score-reports').remove([uploadedPath]);
    form.removeAttribute('aria-busy');
    teacherToast(error.message||tt('成绩保存失败，请重试。','Could not save this score. Please retry.'),true);
    return;
  }
  form.removeAttribute('aria-busy');
  teacherToast(existing?tt('成绩修改已保存，家长端对比已更新。','Score changes saved; the family comparison is updated.'):tt('成绩已发布，家长端对比已更新。','Score published; the family comparison is updated.'));
  await loadTeacherData();
  renderTeacher();
}

async function submitAdminForm(form) {
  const kind = form.dataset.adminForm;
  const fd = new FormData(form);
  const studentIds = selectedStudentIds(form);
  form.setAttribute('aria-busy','true');
  if (!validateBatchSelection(form,fd,studentIds)) return;
  if(kind==='ocr-score')return publishPhotoScore(form);
  if (kind === 'direct-comments') {
    const payload=studentIds.map(student_id=>({student_id,comment_date:formValue(fd,'comment_date'),teacher_comment:batchValue(form,student_id,'teacher_comment').trim(),teacher_name:teacherProfile.full_name||tt('老师','Teacher')}));
    if(payload.some(item=>!item.teacher_comment)){form.removeAttribute('aria-busy');return teacherToast(tt('请为每位已选学生填写评语。','Enter a comment for every selected student.'),true);}
    const {error}=await teacherSb.from('student_teacher_comments').insert(payload);
    if(error){form.removeAttribute('aria-busy');return teacherToast(error.message,true);}
    form.removeAttribute('aria-busy');
    teacherToast(tt('评语已发布给所选学生','Comment published to selected students'));
    await loadTeacherData();
    renderTeacher();
    return;
  }
  if (kind === 'direct-results') {
    const maxScore=Number(formValue(fd,'max_score'));
    const subject=formValue(fd,'subject');
    const examDate=formValue(fd,'exam_date');
    const subjectLabel=form.querySelector('[data-grade-subject]')?.selectedOptions?.[0]?.textContent?.trim()||subject;
    const title=`${subjectLabel} · ${examDate}`;
    const classes=teacherData.classes.filter(item=>teacherSubjectKey(item.subject)===subject);
    const studentClass=new Map();
    for(const classroom of classes){
      for(const enrollment of teacherData.enrollments.filter(item=>item.class_id===classroom.id)){
        if(!studentClass.has(enrollment.student_id)) studentClass.set(enrollment.student_id,classroom.id);
      }
    }
    const scoreInputs=[...form.querySelectorAll('[data-direct-score]')];
    const groupedScores=new Map();
    for(const input of scoreInputs){
      if(input.value.trim()==='') continue;
      const score=Number(input.value);
      if(!Number.isFinite(score)||score<0||score>maxScore){
        form.removeAttribute('aria-busy');
        input.focus();
        return teacherToast(tt(`成绩需在 0 到 ${maxScore} 之间。`,`Scores must be between 0 and ${maxScore}.`),true);
      }
      const studentId=input.dataset.directScore;
      const comment=form.querySelector(`[data-direct-comment="${CSS.escape(studentId)}"]`);
      const classId=studentClass.get(studentId);
      if(!classId){form.removeAttribute('aria-busy');return teacherToast(tt('找不到该学生对应的科目课程。','Could not find a matching class for this student.'),true);}
      if(!groupedScores.has(classId)) groupedScores.set(classId,[]);
      groupedScores.get(classId).push({student_id:studentId,score,teacher_comment:nullable(comment?.value.trim()||''),published_at:new Date().toISOString()});
    }
    if(!groupedScores.size){form.removeAttribute('aria-busy');return teacherToast(tt('请至少填写一位学生的成绩。','Enter a score for at least one student.'),true);}
    const createdExamIds=[];
    let saveError=null;
    for(const [classId,scores] of groupedScores){
      const {data:exam,error:examError}=await teacherSb.from('exams').insert({class_id:classId,title,exam_date:examDate,max_score:maxScore}).select('id').single();
      if(examError||!exam){saveError=examError||new Error(tt('测评保存失败。','Unable to save the assessment.'));break;}
      createdExamIds.push(exam.id);
      const result=await teacherSb.from('exam_results').upsert(scores.map(item=>({...item,exam_id:exam.id})),{onConflict:'student_id,exam_id'});
      if(result.error){saveError=result.error;break;}
    }
    if(saveError){if(createdExamIds.length) await teacherSb.from('exams').delete().in('id',createdExamIds);form.removeAttribute('aria-busy');return teacherToast(saveError.message,true);}
    form.removeAttribute('aria-busy');
    teacherToast(tt('成绩已保存','Scores saved'));
    await loadTeacherData();
    renderTeacher();
    return;
  }
  let request;
  let uploadedPhotoPath = null;
  if (kind === 'students') request = teacherSb.from('students').insert({ first_name:formValue(fd,'first_name'), last_name:formValue(fd,'last_name'), grade:formValue(fd,'grade'), student_number:nullable(formValue(fd,'student_number')) });
  if (kind === 'classes') request = teacherSb.from('classes').insert({ subject:formValue(fd,'subject'), title:formValue(fd,'title'), teacher_name:formValue(fd,'teacher_name'), room:nullable(formValue(fd,'room')), term:nullable(formValue(fd,'term')), color:formValue(fd,'color') || 'green' });
  if (kind === 'enrollments') request = teacherSb.from('enrollments').upsert({ student_id:formValue(fd,'student_id'), class_id:formValue(fd,'class_id'), progress:Number(formValue(fd,'progress') || 0) }, { onConflict:'student_id,class_id' });
  if (kind === 'family') request = teacherSb.from('parent_students').upsert({ parent_id:formValue(fd,'parent_id'), student_id:formValue(fd,'student_id'), relationship:formValue(fd,'relationship') || 'Parent' }, { onConflict:'parent_id,student_id' });
  if (kind === 'assignments') request = teacherSb.from('assignments').insert({ class_id:formValue(fd,'class_id'), title:formValue(fd,'title'), due_at:nullable(formValue(fd,'due_at')), total_points:nullable(formValue(fd,'total_points')) });
  if (kind === 'progress') request = teacherSb.from('assignment_progress').upsert({ student_id:formValue(fd,'student_id'), assignment_id:formValue(fd,'assignment_id'), status:formValue(fd,'status'), progress:Number(formValue(fd,'progress') || 0), score:nullable(formValue(fd,'score')) }, { onConflict:'student_id,assignment_id' });
  if (kind === 'results') request = teacherSb.from('exam_results').upsert({ student_id:formValue(fd,'student_id'), exam_id:formValue(fd,'exam_id'), score:Number(formValue(fd,'score')), teacher_comment:nullable(formValue(fd,'teacher_comment')), published_at:new Date().toISOString() }, { onConflict:'student_id,exam_id' });
  if (kind === 'invoices') {
    const recordId=formValue(fd,'record_id');
    const values=studentIds.map(student_id=>({student_id,invoice_number:batchValue(form,student_id,'invoice_number').trim(),item:batchValue(form,student_id,'item').trim(),amount_cents:Math.round(Number(batchValue(form,student_id,'amount'))*100),due_date:batchValue(form,student_id,'due_date'),status:batchValue(form,student_id,'status')}));
    if (values.some(item=>!item.invoice_number||!item.item||!Number.isFinite(item.amount_cents)||!item.due_date)) {form.removeAttribute('aria-busy');return teacherToast(tt('请填写每位学生的账单编号、项目、金额和到期日期。','Complete invoice number, item, amount, and due date for each student.'),true);}
    if (!recordId && values.some(value=>teacherData.invoices.some(item=>item.invoice_number===value.invoice_number))) {
      form.removeAttribute('aria-busy');
      return teacherToast(tt('账单编号已存在，请换一个编号再保存。','An invoice number already exists. Choose another and retry.'), true);
    }
    request=recordId?teacherSb.from('tuition_invoices').update(values[0]).eq('id',recordId):teacherSb.from('tuition_invoices').insert(values);
  }
  if (kind === 'dashboard') request = teacherSb.from('student_dashboard_metrics').upsert({ student_id:formValue(fd,'student_id'), average_score:nullableNumber(fd,'average_score'), homework_completion:nullableNumber(fd,'homework_completion'), completed_homework:nullableNumber(fd,'completed_homework'), subject_count:nullableNumber(fd,'subject_count') }, { onConflict:'student_id' });
  if (kind === 'trend') {
    const payload = { student_id:formValue(fd,'student_id'), label:formValue(fd,'label'), score:Number(formValue(fd,'score')), recorded_on:formValue(fd,'recorded_on') };
    const recordId = formValue(fd,'record_id');
    request = recordId ? teacherSb.from('student_score_trend').update(payload).eq('id',recordId) : teacherSb.from('student_score_trend').insert(payload);
  }
  if (kind === 'homework-record') {
    const payload = studentIds.map(student_id=>({student_id,has_homework:batchValue(form,student_id,'has_homework')==='true',completion_status:batchValue(form,student_id,'completion_status'),grade:nullable(batchValue(form,student_id,'grade').trim()),correct_count:batchValue(form,student_id,'correct_count')===''?null:Number(batchValue(form,student_id,'correct_count')),wrong_count:batchValue(form,student_id,'wrong_count')===''?null:Number(batchValue(form,student_id,'wrong_count')),subject:batchValue(form,student_id,'subject').trim(),assigned_on:formValue(fd,'assigned_on'),teacher_name:formValue(fd,'teacher_name')}));
    if(payload.some(item=>!item.subject)){form.removeAttribute('aria-busy');return teacherToast(tt('请为每位已选学生填写科目。','Enter a subject for every selected student.'),true);}
    const recordId = formValue(fd,'record_id');
    request = recordId ? teacherSb.from('student_homework_records').update(payload[0]).eq('id',recordId) : teacherSb.from('student_homework_records').insert(payload);
  }
  if (kind === 'attendance') request = teacherSb.from('student_attendance').upsert(studentIds.map(student_id=>({ student_id, attendance_date:formValue(fd,'attendance_date'), status:batchValue(form,student_id,'status'), check_in:nullable(batchValue(form,student_id,'check_in')), check_out:nullable(batchValue(form,student_id,'check_out')), note:nullable(batchValue(form,student_id,'note').trim()), teacher_name:formValue(fd,'teacher_name') })), { onConflict:'student_id,attendance_date' });
  if (kind === 'monthly-report') {
    const reports=studentIds.map(student_id=>({student_id,report_month:`${formValue(fd,'report_month')}-01`,teacher_summary:batchValue(form,student_id,'teacher_summary').trim(),strengths:nullable(batchValue(form,student_id,'strengths').trim()),needs_improvement:nullable(batchValue(form,student_id,'needs_improvement').trim()),next_goal:nullable(batchValue(form,student_id,'next_goal').trim()),teacher_name:formValue(fd,'teacher_name')}));
    if(reports.some(item=>!item.teacher_summary)){form.removeAttribute('aria-busy');return teacherToast(tt('请为每位已选学生填写老师总结。','Enter a summary for every selected student.'),true);}
    request=teacherSb.from('student_monthly_reports').upsert(reports,{onConflict:'student_id,report_month'});
  }
  if (kind === 'updates') {
    try {
      const upload = await uploadAcademyUpdatePhoto(fd.get('image_file'));
      uploadedPhotoPath = upload.path;
      const recipients=formValue(fd,'send_to_all')==='on'?[null]:studentIds;
      if (!recipients.length) throw new Error(tt('请先选择学生，或选择发送给所有家长。','Choose students or select all families.'));
      request = teacherSb.from('academy_updates').insert(recipients.map(student_id=>({ student_id, title:formValue(fd,'title'), body:formValue(fd,'body'), author_name:formValue(fd,'author_name'), category:formValue(fd,'category') || tt('课堂动态','Class moment'), image_url:upload.publicUrl })));
    } catch (uploadError) {
      form.removeAttribute('aria-busy');
      return teacherToast(uploadError.message || tt('照片上传失败。','Photo upload failed.'), true);
    }
  }
  if (!request) { form.removeAttribute('aria-busy'); return; }
  const { error } = await request;
  form.removeAttribute('aria-busy');
  if (error) {
    if (uploadedPhotoPath) await teacherSb.storage.from('academy-updates').remove([uploadedPhotoPath]);
    return teacherToast(error.message, true);
  }
  form.reset();
  teacherToast(tt('保存成功','Saved successfully'));
  await loadTeacherData();
  renderTeacher();
}

async function deleteRecord(button) {
  if (!confirm(tt('确定要永久删除这条记录吗？','Permanently delete this record?'))) return;
  const table = button.dataset.deleteTable;
  const updateItem = table === 'academy_updates' ? byId(teacherData.updates, button.dataset.deleteId) : null;
  const updatePhotoPath = updateItem && !teacherData.updates.some(item=>item.id!==updateItem.id && item.image_url===updateItem.image_url) ? academyPhotoPath(updateItem.image_url) : null;
  const scoreItem = table === 'exam_results' ? teacherData.results.find(item=>item.student_id===button.dataset.studentId && item.exam_id===button.dataset.examId) : null;
  const scoreExamId = scoreItem?.exam_id;
  const scorePhotoPath = scoreItem?.report_path || button.dataset.reportPath || null;
  let request = teacherSb.from(table).delete();
  if (table === 'enrollments') request = request.eq('student_id',button.dataset.studentId).eq('class_id',button.dataset.classId);
  else if (table === 'parent_students') request = request.eq('parent_id',button.dataset.parentId).eq('student_id',button.dataset.studentId);
  else if (table === 'assignment_progress') request = request.eq('student_id',button.dataset.studentId).eq('assignment_id',button.dataset.assignmentId);
  else if (table === 'exam_results') request = request.eq('student_id',button.dataset.studentId).eq('exam_id',button.dataset.examId);
  else request = request.eq('id',button.dataset.deleteId);
  const { error } = await request;
  if (error) return teacherToast(error.message, true);
  if (updatePhotoPath) await teacherSb.storage.from('academy-updates').remove([updatePhotoPath]);
  if (scorePhotoPath) await teacherSb.storage.from('teacher-score-reports').remove([scorePhotoPath]);
  if (scoreExamId && !teacherData.exams.find(item=>item.id===scoreExamId)?.class_id) {
    const remaining=await teacherSb.from('exam_results').select('student_id').eq('exam_id',scoreExamId).limit(1);
    if(!remaining.error&&!remaining.data?.length)await teacherSb.from('exams').delete().eq('id',scoreExamId);
  }
  teacherToast(tt('记录已删除','Record deleted'));
  await loadTeacherData();
  renderTeacher();
}

document.addEventListener('click', async event => {
  const view = event.target.closest('[data-teacher-view]');
  if (view) { teacherView = view.dataset.teacherView; renderTeacher(); window.scrollTo(0,0); }
  const scoreEdit=event.target.closest('[data-edit-score-result]');
  if(scoreEdit)editPhotoScoreResult(scoreEdit.dataset.studentId,scoreEdit.dataset.examId);
  const scoreEditCancel=event.target.closest('[data-cancel-score-edit]');
  if(scoreEditCancel)renderTeacher();
  const createUpdate = event.target.closest('[data-open-update-composer]');
  if (createUpdate) { const composer = tq('#update-composer'); composer?.scrollIntoView({ behavior:'smooth', block:'start' }); setTimeout(() => tq('#update-photo-input')?.click(), 250); }
  const remove = event.target.closest('[data-delete-table]');
  if (remove) deleteRecord(remove);
  const ocrButton=event.target.closest('[data-run-score-ocr]');
  if(ocrButton){const form=ocrButton.closest('#score-upload-form');if(form)runScoreOcr(form,ocrButton);}
  const scoreReport=event.target.closest('[data-score-report]');
  if(scoreReport){
    const reportWindow=window.open('about:blank','_blank');
    try{const {data,error}=await teacherSb.storage.from('teacher-score-reports').createSignedUrl(scoreReport.dataset.scoreReport,300);if(error)throw error;if(reportWindow)reportWindow.location=data.signedUrl;else window.location.href=data.signedUrl;}
    catch(error){reportWindow?.close();teacherToast(tt('无法打开成绩照片，请检查存储迁移。','Could not open the score photo. Check the storage migration.'),true);}
  }
  const edit = event.target.closest('[data-edit-record]');
  if (edit) editManualRecord(edit.dataset.editRecord, edit.dataset.editId);
  const familyReport = event.target.closest('[data-family-report]');
  if (familyReport) {
    const reportWindow = window.open('about:blank', '_blank');
    try {
      const { data, error } = await teacherSb.storage.from('family-exam-results').createSignedUrl(familyReport.dataset.familyReport, 300);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Could not create a secure file link');
      if (reportWindow) reportWindow.location = data.signedUrl;
      else window.location.href = data.signedUrl;
    } catch (error) {
      reportWindow?.close();
      teacherToast(tt('无法打开成绩单，请检查存储权限。','Could not open the result. Check storage permissions.'), true);
    }
  }
  const selectAll=event.target.closest('[data-student-select-all]');
  if(selectAll){const picker=selectAll.closest('[data-student-picker]');picker.querySelectorAll('input[name="student_ids"]:not(:disabled)').forEach(input=>{if(!input.closest('[data-picker-option]').hidden) input.checked=true;});updateStudentPicker(picker);updateBatchRows(picker.closest('form'));}
  const clear=event.target.closest('[data-student-clear]');
  if(clear){const picker=clear.closest('[data-student-picker]');picker.querySelectorAll('input[name="student_ids"]:not(:disabled)').forEach(input=>input.checked=false);updateStudentPicker(picker);updateBatchRows(picker.closest('form'));}
});
document.addEventListener('submit', event => { const form = event.target.closest('[data-admin-form]'); if (form) { event.preventDefault(); submitAdminForm(form); } });
document.addEventListener('change', event => {
  if (event.target.matches('[data-editor-student]')) { teacherDashboardStudentId = event.target.value; renderTeacher(); }
  if (event.target.matches('[data-grade-subject]')) { teacherGradeSubject=event.target.value;renderTeacher(); }
  if(event.target.matches('[data-score-student],[data-score-student-filter]')){teacherScoreStudentId=event.target.value||null;renderTeacher();}
  if(event.target.matches('[data-score-subject],[data-score-subject-filter]')){teacherScoreSubject=event.target.value||'Reading';renderTeacher();}
  if(event.target.matches('#score-upload-form [name="score_image"]')){const form=event.target.closest('#score-upload-form');const button=form?.querySelector('[data-run-score-ocr]');if(form&&button)runScoreOcr(form,button);}
  if (event.target.matches('input[name="student_ids"]')) {const picker=event.target.closest('[data-student-picker]');updateStudentPicker(picker);updateBatchRows(event.target.closest('form'));}
  if (event.target.matches('input[name="send_to_all"]')) {const form=event.target.closest('form');form.querySelectorAll('[data-student-picker] input[name="student_ids"]').forEach(input=>input.disabled=event.target.checked);form.querySelectorAll('[data-student-picker]').forEach(picker=>picker.classList.toggle('is-disabled',event.target.checked));}
});
document.addEventListener('input',event=>{
  if(event.target.matches('[data-student-search]')){const picker=event.target.closest('[data-student-picker]');const query=event.target.value.trim().toLocaleLowerCase();picker.querySelectorAll('[data-picker-option]').forEach(option=>option.hidden=!option.textContent.toLocaleLowerCase().includes(query));}
});
tq('#teacher-language').addEventListener('click', () => { localStorage.setItem('gsa-language', teacherEnglish ? 'zh' : 'en'); location.reload(); });
tq('#teacher-signout').addEventListener('click', async () => { await teacherSb.auth.signOut(); location.href = 'index.html'; });
tq('#teacher-access-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = tq('#teacher-access-error');
  const code = tq('#teacher-invite-code').value.trim().toUpperCase();
  errorBox.textContent = '';
  if (!code) return void (errorBox.textContent = tt('请输入教师邀请码。','Enter the teacher invitation code.'));
  form.setAttribute('aria-busy','true');
  try {
    const displayName = (teacherProfile?.full_name || teacherUser?.user_metadata?.full_name || teacherUser?.email?.split('@')[0] || 'Teacher').trim();
    const { data:role, error } = await withTimeout(teacherSb.rpc('complete_account_onboarding', { p_display_name:displayName, p_invite_code:code }), 10000);
    if (error || !['teacher','admin'].includes(role)) throw new Error('Invalid teacher invitation code');
    location.reload();
  } catch (error) {
    form.removeAttribute('aria-busy');
    errorBox.textContent = /invalid|invite/i.test(error.message || '') ? tt('教师邀请码不正确，请重新输入。','The teacher invitation code is incorrect.') : (error.message || tt('暂时无法验证，请重试。','Unable to verify right now. Please retry.'));
  }
});

async function initTeacher() {
  try {
    if (!teacherSb) throw new Error(tt('服务器尚未连接。','Server is not connected.'));
    const { data:{ session } } = await withTimeout(teacherSb.auth.getSession(), 6000);
    if (!session) return void (location.href = 'index.html');
    teacherUser = session.user;
    const { data:profile, error } = await withTimeout(teacherSb.from('profiles').select('full_name,role').eq('id',teacherUser.id).single(), 6000);
    if (error) throw error;
    if (!['teacher','admin'].includes(profile.role)) return void showTeacherAccess(profile);
    teacherProfile = profile;
    tq('#teacher-name').textContent = profile.full_name || teacherUser.email;
    tq('#teacher-initials').textContent = (profile.full_name || 'T').trim().slice(0,2).toUpperCase();
    tq('#teacher-language').textContent = teacherEnglish ? '中文' : 'English';
    tq('#teacher-signout').textContent = tt('退出登录','Sign out');
    tq('#teacher-loading').hidden = true;
    tq('#teacher-app').hidden = false;
    renderTeacher();
    try {
      await withTimeout(loadTeacherData(), 10000);
      renderTeacher();
    } catch (dataError) {
      console.error(dataError);
      teacherToast(tt('管理中心已打开，数据同步较慢，请稍后刷新。','The portal is open, but data sync is slow. Please refresh shortly.'), true);
    }
  } catch (error) {
    tq('#teacher-loading').innerHTML = `<div class="teacher-error">${te(error.message || tt('无法打开教师中心。','Unable to open teacher portal.'))}<button type="button" onclick="location.reload()">${tt('重新连接','Retry')}</button><a href="index.html">${tt('返回主页','Back to home')}</a></div>`;
  }
}

initTeacher();



