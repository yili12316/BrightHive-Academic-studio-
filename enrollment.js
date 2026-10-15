(() => {
  const form = document.querySelector('#enrollment-form');
  const status = document.querySelector('#form-status');
  const submit = form?.querySelector('[type="submit"]');
  const allowedPrograms = new Set(['Reading', 'Math', 'Listening', 'Grammar']);
  let language = localStorage.getItem('gsa-language') === 'en' ? 'en' : 'zh';

  function translate(nextLanguage) {
    language = nextLanguage;
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-zh][data-en]').forEach(element => {
      element.innerHTML = element.dataset[language];
    });
    document.querySelectorAll('[data-ph-zh][data-ph-en]').forEach(input => {
      input.placeholder = input.dataset[language === 'en' ? 'phEn' : 'phZh'];
    });
    document.querySelectorAll('[data-language-toggle]').forEach(button => {
      button.textContent = language === 'en' ? '中文' : 'English';
      button.setAttribute('aria-label', language === 'en' ? '切换到中文' : 'Switch to English');
    });
    localStorage.setItem('gsa-language', language);
  }

  document.querySelectorAll('[data-language-toggle]').forEach(button => button.addEventListener('click', () => translate(language === 'en' ? 'zh' : 'en')));
  translate(language);

  function showStatus(message, state = 'error') {
    status.textContent = message;
    status.dataset.state = state;
  }

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    status.textContent = '';
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const programs = [...form.querySelectorAll('input[name="programs"]:checked')].map(input => input.value);
    if (!programs.length) {
      showStatus(language === 'en' ? 'Please select at least one learning area.' : '请至少选择一个感兴趣的学习方向。');
      form.querySelector('.interest-fieldset')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (programs.some(value => !allowedPrograms.has(value))) {
      showStatus(language === 'en' ? 'Please refresh the page and try again.' : '请刷新页面后重试。');
      return;
    }
    const payload = {
      parent_name: String(data.get('parent_name') || '').trim(),
      parent_email: String(data.get('parent_email') || '').trim(),
      parent_phone: String(data.get('parent_phone') || '').trim(),
      student_name: String(data.get('student_name') || '').trim(),
      student_grade: String(data.get('student_grade') || '').trim(),
      programs,
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
      showStatus(language === 'en' ? 'Thank you — your enquiry has been sent to BrightHive Academic Studio. We’ll be in touch.' : '谢谢，报名咨询已发送至 BrightHive Academic Studio。老师会通过您留下的联系方式与您联系。', 'success');
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
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


