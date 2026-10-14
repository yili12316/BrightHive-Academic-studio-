(() => {
  const form = document.querySelector('#enrollment-form');
  const status = document.querySelector('#form-status');
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

  async function redirectRegisteredParent() {
    if (!window.supabase?.createClient || !window.GSA_SUPABASE?.url || !window.GSA_SUPABASE?.anonKey) return;
    try {
      const portal = window.supabase.createClient(window.GSA_SUPABASE.url, window.GSA_SUPABASE.anonKey);
      const { data: { session }, error: sessionError } = await portal.auth.getSession();
      if (sessionError || !session?.user) return;
      const { data: profile, error: profileError } = await portal.from('profiles')
        .select('role,onboarding_complete').eq('id', session.user.id).maybeSingle();
      if (profileError || profile?.role !== 'parent' || profile.onboarding_complete !== true) return;
      const { data: registration, error: registrationError } = await portal.from('family_registrations')
        .select('parent_id').eq('parent_id', session.user.id).maybeSingle();
      if (!registrationError && registration) window.location.replace('../index.html#home');
    } catch (error) {
      console.warn('Could not check the existing family account; keeping the enrollment page open.', error);
    }
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
  redirectRegisteredParent();

  function showStatus(message, state = 'error') {
    status.textContent = message;
    status.dataset.state = state;
  }

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    status.textContent = '';
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
    if (!payload.consent) {
      showStatus(language === 'en' ? 'Please agree to the information-use notice.' : '请先勾选信息使用说明。');
      return;
    }
    if (!window.supabase?.createClient || !window.GSA_SUPABASE?.url || !window.GSA_SUPABASE?.anonKey) {
      showStatus(language === 'en' ? 'The enrolment service is not connected yet. Please email Brighthive168@gmail.com.' : '报名服务尚未连接，请直接发送邮件至 Brighthive168@gmail.com。');
      return;
    }
    const original = submit.innerHTML;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.innerHTML = `<span>${language === 'en' ? 'Sending…' : '正在发送…'}</span><b aria-hidden="true">…</b>`;
    try {
      const client = window.supabase.createClient(window.GSA_SUPABASE.url, window.GSA_SUPABASE.anonKey);
      const { data: result, error } = await client.functions.invoke('enrollment-request', { body: payload });
      if (error || !result?.ok) {
        const reason = result?.error || error?.message || '';
        if (/not configured|RESEND_API_KEY/i.test(reason)) throw new Error('SERVICE_NOT_CONFIGURED');
        throw new Error('SEND_FAILED');
      }
      form.reset();
      savedChildValues = [];
      childrenContainer.innerHTML = '';
      renderChildren();
      showStatus(language === 'en' ? 'Your enquiry has been sent. Taking you to the BrightHive Academic Studio family portal…' : '报名咨询已发送。正在前往 BrightHive Academic Studio 家长中心…', 'success');
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => window.location.assign('../index.html?enrollment=sent'), 1800);
    } catch (error) {
      const message = error.message === 'SERVICE_NOT_CONFIGURED'
        ? (language === 'en' ? 'Online enrolment email is being set up. Please email Brighthive168@gmail.com for now.' : '在线报名邮件服务正在配置，请先发送邮件至 Brighthive168@gmail.com。')
        : (language === 'en' ? 'We couldn’t send your enquiry. Please try again or email Brighthive168@gmail.com.' : '暂时未能发送，请重试，或直接发送邮件至 Brighthive168@gmail.com。');
      showStatus(message);
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.innerHTML = original;
    }
  });
})();




