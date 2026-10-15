(() => {
  const form = document.querySelector('#enrollment-form');
  const submit = form?.querySelector('[type="submit"]');
  const savedLanguage = localStorage.getItem('gsa-language');
  let language = savedLanguage === 'zh' ? 'zh' : 'en';

  function translate(nextLanguage) {
    language = nextLanguage;
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-zh][data-en]').forEach(element => {
      element.innerHTML = element.dataset[language];
    });
    document.querySelectorAll('[data-ph-zh][data-ph-en]').forEach(input => {
      input.placeholder = input.dataset[language === 'en' ? 'phEn' : 'phZh'];
    });
    document.querySelectorAll('[data-title-zh][data-title-en]').forEach(element => {
      element.title = element.dataset[language === 'en' ? 'titleEn' : 'titleZh'];
    });
    document.querySelectorAll('[data-aria-label-zh][data-aria-label-en]').forEach(element => {
      element.setAttribute('aria-label', element.dataset[language === 'en' ? 'ariaLabelEn' : 'ariaLabelZh']);
    });
    document.querySelectorAll('[data-alt-zh][data-alt-en]').forEach(element => {
      element.alt = element.dataset[language === 'en' ? 'altEn' : 'altZh'];
    });
    document.querySelectorAll('[data-content-zh][data-content-en]').forEach(element => {
      element.setAttribute('content', element.dataset[language === 'en' ? 'contentEn' : 'contentZh']);
    });
    const pageTitle = document.querySelector('title[data-zh][data-en]');
    if (pageTitle) document.title = pageTitle.dataset[language];
    document.querySelectorAll('[data-language-toggle]').forEach(button => {
      button.textContent = language === 'en' ? '中文' : 'English';
      button.setAttribute('aria-label', language === 'en' ? '切换到中文' : 'Switch to English');
    });
    localStorage.setItem('gsa-language', language);
    window.dispatchEvent(new CustomEvent('gsa-language-change', { detail: { language } }));
  }

  document.querySelectorAll('[data-language-toggle]').forEach(button => button.addEventListener('click', () => translate(language === 'en' ? 'zh' : 'en')));
  const childCount = form?.querySelector('#number-of-children');
  const childrenContainer = form?.querySelector('#children-container');
  let savedChildValues = [];
  function renderChildren() {
    if (!childrenContainer || !childCount) return;
    childrenContainer.querySelectorAll('.child-entry').forEach((card, index) => {
      savedChildValues[index] = Object.fromEntries(['name', 'grade', 'dismissal_time', 'school'].map(field => [
        field,
        card.querySelector(`[data-child-field="${field}"]`)?.value || ''
      ]));
    });
    const count = Math.max(1, Math.min(6, Number(childCount.value) || 1));
    const t = (zh, en) => language === 'en' ? en : zh;
    const gradeOptions = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
    const gradeLabels = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
    const schools = [
      'Clara Barton Elementary School', 'Eastvale Elementary School', 'Harada Elementary School',
      'Ronald Reagan Elementary School', 'Rosa Parks Elementary School', 'Philistine Rondo School of Discovery',
      'VanderMolen Elementary School', 'Other elementary school / Not listed', 'Elementary school not yet assigned'
    ];
    const schoolLabel = school => {
      if (school === 'Other elementary school / Not listed') return t('其他小学 / 名单中没有', school);
      if (school === 'Elementary school not yet assigned') return t('尚未分配小学', school);
      return school;
    };
    childrenContainer.innerHTML = Array.from({ length: count }, (_, index) => {
      const number = index + 1;
      const gradeList = gradeOptions.map((grade, gradeIndex) => `<option value="${grade}">${t(gradeLabels[gradeIndex], grade)}</option>`).join('');
      const schoolList = schools.map(school => `<option value="${school}">${schoolLabel(school)}</option>`).join('');
      return `<section class="child-entry" aria-labelledby="child-title-${number}">
        <div class="child-entry-heading"><span>${String(number).padStart(2, '0')}</span><h3 id="child-title-${number}">${t(`孩子 ${number}`, `Child ${number}`)}</h3></div>
        <div class="form-grid">
          <label><span>${t('学生姓名 *', 'Student name *')}</span><input data-child-field="name" name="children[${index}][name]" autocomplete="off" maxlength="80" required placeholder="${t('请输入学生姓名', 'Enter student name')}"></label>
          <label><span>${t('目前年级 *', 'Current grade *')}</span><select data-child-field="grade" name="children[${index}][grade]" required><option value="" selected disabled>${t('请选择一至六年级', 'Select grade 1–6')}</option>${gradeList}</select></label>
          <label><span>${t('学校放学时间（约） *', 'School dismissal time (approx.) *')}</span><input data-child-field="dismissal_time" name="children[${index}][dismissal_time]" type="time" step="60" required aria-describedby="dismissal-time-hint-${number}"><small class="field-hint" id="dismissal-time-hint-${number}">${t('请按 Eastvale 当地时间选择。', 'Select the local Eastvale time.')}</small></label>
          <label class="full-field"><span>${t('就读或计划就读的小学 *', 'Elementary school (current or planned) *')}</span><select data-child-field="school" name="children[${index}][school]" required><option value="" selected disabled>${t('请选择小学', 'Select an elementary school')}</option><optgroup label="${t('Eastvale 地区小学', 'Eastvale area elementary schools')}">${schoolList.slice(0, schoolList.indexOf('<option value="Other elementary school'))}</optgroup>${schoolList.slice(schoolList.indexOf('<option value="Other elementary school'))}</select></label>
        </div>
      </section>`;
    }).join('');
    childrenContainer.querySelectorAll('.child-entry').forEach((card, index) => {
      Object.entries(savedChildValues[index] || {}).forEach(([field, value]) => {
        const control = card.querySelector(`[data-child-field="${field}"]`);
        if (control) control.value = value;
      });
    });
  }
  childCount?.addEventListener('change', renderChildren);
  window.addEventListener('gsa-language-change', renderChildren);
  translate(language);
  renderChildren();

  function buildEmailDraft(payload, method) {
    const label = (zh, en) => language === 'en' ? en : zh;
    const lines = [
      'BrightHive Academic Studio — Enrollment Application',
      '',
      `${label('家长姓名', 'Parent / guardian name')}: ${payload.parent_name}`,
      `${label('家长邮箱', 'Parent email')}: ${payload.parent_email}`,
      `${label('联系电话', 'Phone number')}: ${payload.parent_phone}`,
      `${label('报名孩子人数', 'Number of children')}: ${payload.number_of_children}`,
      ...payload.children.flatMap((child, index) => [
        '',
        `${label('孩子', 'Child')} ${index + 1}: ${child.name}`,
        `${label('年级', 'Grade')}: ${child.grade}`,
        `${label('小学', 'Elementary school')}: ${child.school}`,
        `${label('放学时间', 'School dismissal time')}: ${child.dismissal_time}`
      ]),
      '',
      `${label('希望开始时间', 'Preferred start')}: ${payload.preferred_start}`,
      `${label('补充说明', 'Additional information')}: ${payload.message || '—'}`
    ];
    const subject = label('BrightHive Academic Studio 报名申请', 'BrightHive Academic Studio Enrollment Application');
    const body = lines.join('\n');
    const recipient = 'Brighthive168@gmail.com';
    if (method === 'gmail') {
      const params = new URLSearchParams({ view: 'cm', fs: '1', to: recipient, su: subject, body });
      return `https://mail.google.com/mail/?${params}`;
    }
    if (method === 'outlook') {
      const params = new URLSearchParams({ to: recipient, subject, body });
      return `https://outlook.live.com/mail/0/deeplink/compose?${params}`;
    }
    return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const children = Array.from(childrenContainer?.querySelectorAll('.child-entry') || []).map(card => ({
      name: String(card.querySelector('[data-child-field="name"]')?.value || '').trim(),
      grade: String(card.querySelector('[data-child-field="grade"]')?.value || '').trim(),
      dismissal_time: String(card.querySelector('[data-child-field="dismissal_time"]')?.value || '').trim(),
      school: String(card.querySelector('[data-child-field="school"]')?.value || '').trim()
    }));
    const payload = {
      parent_name: String(data.get('parent_name') || '').trim(),
      parent_email: String(data.get('parent_email') || '').trim(),
      parent_phone: String(data.get('parent_phone') || '').trim(),
      number_of_children: Number(data.get('number_of_children') || 0),
      children,
      preferred_start: String(data.get('preferred_start') || 'Flexible'),
      message: String(data.get('message') || '').trim(),
      consent: data.get('consent') === 'on',
      company_website: String(data.get('company_website') || '')
    };
    const method = String(data.get('email_method') || 'default');
    window.location.href = buildEmailDraft(payload, method);
  });
})();




