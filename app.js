(() => {
  const questions = window.EXAM_DATA || [];
  const storageKey = 'securities-quiz-2019-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (_) {}
  const state = { current: Number(saved.current) || 0, answers: saved.answers || {}, selected: null };

  const $ = (id) => document.getElementById(id);
  const els = {
    category: $('category'), currentNo: $('currentNo'), bigNo: $('bigNo'), questionText: $('questionText'),
    options: $('options'), feedback: $('feedback'), feedbackIcon: $('feedbackIcon'), feedbackHeading: $('feedbackHeading'),
    answerLine: $('answerLine'), analysisText: $('analysisText'), submitBtn: $('submitBtn'), nextBtn: $('nextBtn'),
    prevBtn: $('prevBtn'), progressBar: $('progressBar'), correctCount: $('correctCount'), questionGrid: $('questionGrid'),
    answeredStat: $('answeredStat'), rightStat: $('rightStat'), wrongStat: $('wrongStat'), answerSheet: $('answerSheet'),
    overlay: $('overlay'), toast: $('toast'), glossaryCards: $('glossaryCards')
  };

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
      const classes = ['q-dot', i === state.current ? 'is-current' : '', result ? (result.correct ? 'is-right' : 'is-wrong') : ''].filter(Boolean).join(' ');
      return `<button class="${classes}" data-index="${i}" aria-label="第 ${q.id} 题${result ? (result.correct ? '，正确' : '，错误') : ''}">${q.id}</button>`;
    }).join('');
  }

  function render() {
    const q = questions[state.current];
    if (!q) { els.questionText.textContent = '题库加载失败，请刷新页面重试。'; return; }
    const result = state.answers[q.id];
    state.selected = result?.selected || null;
    const number = String(q.id).padStart(2, '0');
    els.category.textContent = q.category;
    els.currentNo.textContent = number;
    els.bigNo.textContent = number;
    els.questionText.textContent = q.question;
    els.progressBar.style.width = `${q.id}%`;
    els.options.innerHTML = q.options.map((option) => {
      const selected = state.selected === option.key;
      let status = selected ? 'selected' : '';
      if (result && option.key === q.answer) status = 'correct';
      if (result && selected && option.key !== q.answer) status = 'incorrect';
      return `<button class="option ${status}" data-key="${option.key}" role="radio" aria-checked="${selected}" ${result ? 'disabled' : ''}><span class="option-key">${option.key}</span><span>${option.text}</span></button>`;
    }).join('');

    els.feedback.hidden = !result;
    if (result) {
      els.feedback.classList.toggle('wrong', !result.correct);
      els.feedbackIcon.textContent = result.correct ? '✓' : '×';
      els.feedbackHeading.textContent = result.correct ? '回答正确' : '回答错误';
      els.answerLine.textContent = result.correct ? '继续保持这个节奏' : `正确答案：${q.answer}`;
      els.analysisText.textContent = q.analysis;
      const termNames = (window.QUESTION_TERMS || {})[q.id] || [];
      els.glossaryCards.innerHTML = termNames.map((name, index) => {
        const content = (window.TERM_GLOSSARY || {})[name] || ['这是本题涉及的专业概念。', '结合题干和原题解析一起理解即可。'];
        return `<article class="term-card"><div class="term-title"><span>${String(index + 1).padStart(2, '0')}</span><h3>${name}</h3></div><p><b>它是什么：</b>${content[0]}</p><p class="analogy"><b>打个比方：</b>${content[1]}</p></article>`;
      }).join('');
    }
    els.submitBtn.hidden = Boolean(result);
    els.submitBtn.disabled = !state.selected;
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
    if (state.answers[questions[state.current].id]) return;
    state.selected = key;
    els.submitBtn.disabled = false;
    [...els.options.children].forEach((button) => {
      const selected = button.dataset.key === key;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-checked', String(selected));
    });
  }

  function submit() {
    if (!state.selected) return;
    const q = questions[state.current];
    state.answers[q.id] = { selected: state.selected, correct: state.selected === q.answer };
    render();
  }

  function navigate(index) {
    state.current = Math.max(0, Math.min(questions.length - 1, index));
    state.selected = null;
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
    showToast(`完成！答对 ${s.right} 题，正确率 ${Math.round(s.right / questions.length * 100)}%`);
  }

  function openSheet() { els.answerSheet.classList.add('open'); els.overlay.hidden = false; }
  function closeSheet() { els.answerSheet.classList.remove('open'); els.overlay.hidden = true; }

  els.options.addEventListener('click', (e) => { const button = e.target.closest('.option'); if (button) choose(button.dataset.key); });
  els.submitBtn.addEventListener('click', submit);
  els.nextBtn.addEventListener('click', () => state.current === questions.length - 1 ? finish() : navigate(state.current + 1));
  els.prevBtn.addEventListener('click', () => navigate(state.current - 1));
  els.questionGrid.addEventListener('click', (e) => { const button = e.target.closest('.q-dot'); if (button) navigate(Number(button.dataset.index)); });
  $('resetBtn').addEventListener('click', () => {
    if (confirm('确定清空全部答题记录，重新开始吗？')) { state.answers = {}; state.current = 0; state.selected = null; render(); showToast('答题记录已清空'); }
  });
  $('sheetBtn').addEventListener('click', openSheet);
  $('closeSheetBtn').addEventListener('click', closeSheet);
  els.overlay.addEventListener('click', closeSheet);
  document.querySelector('.brand').addEventListener('click', (e) => { e.preventDefault(); navigate(0); });
  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '4' && !state.answers[questions[state.current].id]) choose(['A','B','C','D'][Number(e.key)-1]);
    if (e.key === 'Enter' && !els.submitBtn.hidden && !els.submitBtn.disabled) submit();
    if (e.key === 'Escape') closeSheet();
  });

  render();
})();
