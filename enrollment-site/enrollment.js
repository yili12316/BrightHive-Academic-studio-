(() => {
  const form = document.querySelector('#enrollment-form');
  const artForm = document.querySelector('#art-registration-form');
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

  function initScrollReveal() {
    const revealTargets = document.querySelectorAll([
      '.hero-copy', '.hero-art', '.hero-footnote', '.section-heading',
      '.value-card', '.program-card', '.pricing-card', '.pricing-apply', '.art-price-card', '.art-apply-link',
      '.steps-visual', '.steps-list article', '.site-footer'
    ].join(','));
    if (document.body.classList.contains('apply-page') || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

    revealTargets.forEach(element => {
      const siblings = [...element.parentElement.children].filter(sibling => sibling.matches('.value-card,.program-card,.pricing-card,.art-price-card,.steps-list article'));
      const index = Math.max(0, siblings.indexOf(element));
      element.style.setProperty('--reveal-delay', `${Math.min(index * 90, 270)}ms`);
      element.classList.add('scroll-reveal');
      revealObserver.observe(element);
    });
  }

  initScrollReveal();

  async function saveApplication(formElement, payload, statusId) {
    const status = document.getElementById(statusId);
    const button = formElement.querySelector('[type="submit"]');
    const buttonLabel = button?.querySelector('span');
    const config = window.GSA_SUPABASE;
    const label = (zh, en) => language === 'en' ? en : zh;
    if (!config?.url || !config?.anonKey) {
      if (status) status.textContent = label('报名服务暂时不可用，请稍后重试。', 'The application service is temporarily unavailable. Please try again later.');
      return;
    }
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    }
    const previousLabel = buttonLabel?.textContent;
    if (buttonLabel) buttonLabel.textContent = label('正在安全提交…', 'Submitting securely…');
    if (status) {
      status.dataset.state = '';
      status.textContent = '';
    }
    try {
      const response = await fetch(`${config.url.replace(/\/+$/, '')}/functions/v1/enrollment-request`, {
        method: 'POST',
        headers: {
          apikey: config.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true || result.saved !== true) throw new Error('Application was not saved');
      if (status) {
        status.dataset.state = 'success';
        status.textContent = label('已收到报名资料。招生团队会尽快与您联系。', 'Application received. Our admissions team will contact you soon.');
      }
      formElement.reset();
      if (formElement === form) {
        savedChildValues = [];
        renderChildren();
      }
    } catch {
      if (status) {
        status.dataset.state = 'error';
        status.textContent = label('提交失败，资料还没有保存。请稍后重试，或直接邮件联系 Brighthive168@gmail.com。', 'Submission failed and your details were not saved. Please try again or email Brighthive168@gmail.com.');
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
      if (buttonLabel && previousLabel) buttonLabel.textContent = previousLabel;
    }
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
      company_website: String(data.get('company_website') || ''),
      application_type: 'after_school'
    };
    void saveApplication(form, payload, 'enrollment-status');
  });

  artForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!artForm.reportValidity()) return;
    const data = new FormData(artForm);
    const selectedProgram = artForm.querySelector('[name="session_length"]')?.selectedOptions?.[0];
    const sessionLength = String(selectedProgram?.dataset.program || '');
    const payload = {
      application_type: 'art',
      parent_name: String(data.get('parent_name') || '').trim(),
      parent_email: String(data.get('parent_email') || '').trim(),
      parent_phone: String(data.get('parent_phone') || '').trim(),
      number_of_children: 1,
      children: [{
        name: String(data.get('student_name') || '').trim(),
        grade: String(selectedProgram?.dataset.age || '').trim(),
        school: '',
        dismissal_time: ''
      }],
      class_length: sessionLength,
      message: String(data.get('message') || '').trim(),
      consent: data.get('consent') === 'on',
      company_website: String(data.get('company_website') || '')
    };
    void saveApplication(artForm, payload, 'art-registration-status');
  });

})();

