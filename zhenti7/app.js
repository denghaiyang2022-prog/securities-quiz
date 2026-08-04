(() => {
  const questions = window.EXAM_DATA || [];
  const storageKey = 'securities-quiz-answers-only-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (_) {}

  const state = {
    current: Math.min(Number(saved.current) || 0, Math.max(questions.length - 1, 0)),
    answers: saved.answers || {},
    selected: [],
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    category: $('category'),
    caseMaterial: $('caseMaterial'),
    caseMaterialText: $('caseMaterialText'),
    currentNo: $('currentNo'),
    bigNo: $('bigNo'),
    questionText: $('questionText'),
    options: $('options'),
    feedback: $('feedback'),
    feedbackIcon: $('feedbackIcon'),
    feedbackHeading: $('feedbackHeading'),
    answerLine: $('answerLine'),
    submitBtn: $('submitBtn'),
    nextBtn: $('nextBtn'),
    prevBtn: $('prevBtn'),
    progressBar: $('progressBar'),
    correctCount: $('correctCount'),
    questionGrid: $('questionGrid'),
    answeredStat: $('answeredStat'),
    rightStat: $('rightStat'),
    wrongStat: $('wrongStat'),
    answerSheet: $('answerSheet'),
    overlay: $('overlay'),
    toast: $('toast'),
  };

  const groupTotals = questions.reduce((acc, q) => {
    const key = `${q.paper}__${q.type}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const normalizeAnswer = (value) =>
    Array.isArray(value)
      ? value.slice().sort().join('')
      : String(value || '').split('').sort().join('');

  const isMulti = (q) => q.type === 'multi' || q.type === 'case' || String(q.answer || '').length > 1;
  const currentAnswer = () => normalizeAnswer(state.selected);
  const groupKey = (q) => `${q.paper}__${q.type}`;

  function save() {
    localStorage.setItem(storageKey, JSON.stringify({ current: state.current, answers: state.answers }));
  }

  function stats() {
    const values = Object.values(state.answers);
    const right = values.filter((a) => a.correct).length;
    return { answered: values.length, right, wrong: values.length - right };
  }

  function renderGrid() {
    els.questionGrid.innerHTML = questions.map((q, i) => {
      const result = state.answers[q.id];
      const classes = [
        'q-dot',
        i === state.current ? 'is-current' : '',
        result ? (result.correct ? 'is-right' : 'is-wrong') : '',
      ].filter(Boolean).join(' ');
      const status = result ? (result.correct ? '，正确' : '，错误') : '';
      return `<button class="${classes}" data-index="${i}" aria-label="${q.category}第${q.questionNo}题${status}">${q.questionNo}</button>`;
    }).join('');
  }

  function render() {
    const q = questions[state.current];
    if (!q) {
      els.questionText.textContent = '题库加载失败，请刷新页面重试。';
      return;
    }

    const result = state.answers[q.id];
    state.selected = result?.selected ? String(result.selected).split('') : [];
    const localNo = Number(q.questionNo || state.current + 1);
    const number = String(localNo).padStart(2, '0');
    const totalInGroup = groupTotals[groupKey(q)] || questions.length;

    els.category.textContent = q.category;
    if (els.caseMaterial && els.caseMaterialText) {
      els.caseMaterial.hidden = !q.material;
      els.caseMaterialText.textContent = q.material || '';
    }
    els.currentNo.textContent = number;
    els.bigNo.textContent = number;
    els.questionText.textContent = q.question;
    document.querySelector('.question-count').innerHTML = `<b id="currentNo">${number}</b> / 本组${totalInGroup}题`;
    els.progressBar.style.width = `${((state.current + 1) / questions.length) * 100}%`;
    els.options.setAttribute('role', isMulti(q) ? 'group' : 'radiogroup');
    els.options.setAttribute('aria-label', isMulti(q) ? '请选择全部正确答案' : '请选择一个答案');
    els.options.innerHTML = q.options.map((option) => {
      const selected = state.selected.includes(option.key);
      let status = selected ? 'selected' : '';
      if (result && q.answer.includes(option.key)) status = 'correct';
      if (result && selected && !q.answer.includes(option.key)) status = 'incorrect';
      return `<button class="option ${status}" data-key="${option.key}" role="${isMulti(q) ? 'checkbox' : 'radio'}" aria-checked="${selected}" ${result ? 'disabled' : ''}><span class="option-key">${option.key}</span><span>${option.text}</span></button>`;
    }).join('');

    els.feedback.hidden = !result;
    if (result) {
      els.feedback.classList.toggle('wrong', !result.correct);
      els.feedbackIcon.textContent = result.correct ? '✓' : '×';
      els.feedbackHeading.textContent = result.correct ? '回答正确' : '回答错误';
      els.answerLine.textContent = `你的答案：${result.selected || '未选'}；正确答案：${q.answer}`;
    }

    els.submitBtn.hidden = Boolean(result);
    els.submitBtn.disabled = state.selected.length === 0;
    els.submitBtn.textContent = isMulti(q) ? '确认多选答案' : '确认答案';
    els.nextBtn.hidden = !result;
    els.nextBtn.textContent = state.current === questions.length - 1 ? '查看成绩 →' : '下一题 →';
    els.prevBtn.disabled = state.current === 0;

    const s = stats();
    els.correctCount.textContent = s.right;
    els.answeredStat.textContent = s.answered;
    els.rightStat.textContent = s.right;
    els.wrongStat.textContent = s.wrong;
    renderGrid();
    save();
  }

  function choose(key) {
    const q = questions[state.current];
    if (state.answers[q.id]) return;
    if (isMulti(q)) {
      state.selected = state.selected.includes(key)
        ? state.selected.filter((item) => item !== key)
        : [...state.selected, key].sort();
    } else {
      state.selected = [key];
    }
    els.submitBtn.disabled = false;
    [...els.options.children].forEach((button) => {
      const selected = state.selected.includes(button.dataset.key);
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-checked', String(selected));
    });
  }

  function submit() {
    if (state.selected.length === 0) return;
    const q = questions[state.current];
    const selected = currentAnswer();
    state.answers[q.id] = { selected, correct: selected === normalizeAnswer(q.answer) };
    render();
  }

  function navigate(index) {
    state.current = Math.max(0, Math.min(questions.length - 1, index));
    state.selected = [];
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSheet();
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  function finish() {
    const s = stats();
    if (s.answered < questions.length) {
      const nextEmpty = questions.findIndex((q) => !state.answers[q.id]);
      showToast(`已答 ${s.answered} 题，还有 ${questions.length - s.answered} 题未完成`);
      if (nextEmpty >= 0) setTimeout(() => navigate(nextEmpty), 650);
      return;
    }
    showToast(`完成！答对 ${s.right} 题，正确率 ${Math.round((s.right / questions.length) * 100)}%`);
  }

  function openSheet() {
    els.answerSheet.classList.add('open');
    els.overlay.hidden = false;
  }

  function closeSheet() {
    els.answerSheet.classList.remove('open');
    els.overlay.hidden = true;
  }

  els.options.addEventListener('click', (e) => {
    const button = e.target.closest('.option');
    if (button) choose(button.dataset.key);
  });
  els.submitBtn.addEventListener('click', submit);
  els.nextBtn.addEventListener('click', () => (state.current === questions.length - 1 ? finish() : navigate(state.current + 1)));
  els.prevBtn.addEventListener('click', () => navigate(state.current - 1));
  els.questionGrid.addEventListener('click', (e) => {
    const button = e.target.closest('.q-dot');
    if (button) navigate(Number(button.dataset.index));
  });
  $('resetBtn').addEventListener('click', () => {
    if (confirm('确定清空全部答题记录，重新开始吗？')) {
      state.answers = {};
      state.current = 0;
      state.selected = [];
      render();
      showToast('答题记录已清空');
    }
  });
  $('sheetBtn').addEventListener('click', openSheet);
  $('closeSheetBtn').addEventListener('click', closeSheet);
  els.overlay.addEventListener('click', closeSheet);
  document.querySelector('.brand').addEventListener('click', (e) => {
    e.preventDefault();
    navigate(0);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '4' && !state.answers[questions[state.current].id]) {
      choose(['A', 'B', 'C', 'D'][Number(e.key) - 1]);
    }
    if (e.key === 'Enter' && !els.submitBtn.hidden && !els.submitBtn.disabled) submit();
    if (e.key === 'Escape') closeSheet();
  });

  render();
})();
