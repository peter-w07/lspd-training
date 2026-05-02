/* ============================================================
   LSPD Academy Study Hub — app.js
   Fetches data.json and powers flashcards, quizzes, matching.
   ============================================================ */

let DATA = null;
let CATEGORIES = null;

let state = {
  category: 'laws',
  mode: 'flashcards',
  fc: { index: 0, flipped: false },
  quiz: { questions: [], current: 0, score: 0, answered: false, streak: 0, bestStreak: 0 },
  match: { pairs: [], selected: null, matched: 0, mistakes: 0, time: 0, timer: null }
};

/* ============== UTIL ============== */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'html') e.innerHTML = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  children.flat().forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

function getItems() {
  if (state.category === '__browse') return [];
  return CATEGORIES[state.category].items;
}

/* ============== DATA LOAD ============== */

async function loadData() {
  try {
    const res = await fetch('data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
    CATEGORIES = DATA.categories;
    // pick first category
    state.category = Object.keys(CATEGORIES)[0];
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('appRoot').style.display = 'block';
    if (DATA.meta) {
      if (DATA.meta.title) document.getElementById('siteTitle').firstChild.textContent = DATA.meta.title + ' ';
      if (DATA.meta.subtitle) document.getElementById('siteSubtitle').textContent = DATA.meta.subtitle;
      if (DATA.meta.version) document.getElementById('versionTag').textContent = 'v' + DATA.meta.version;
    }
    init();
  } catch (err) {
    document.getElementById('loadingState').style.display = 'none';
    const errEl = document.getElementById('errorState');
    errEl.style.display = 'block';
    document.getElementById('errorMsg').textContent = err.message + (location.protocol === 'file:' ? ' — note: opening directly via file:// blocks fetch. Use a local server or deploy to a host.' : '');
  }
}

/* ============== HEADER + NAV ============== */

function buildNav() {
  const nav = document.getElementById('catNav');
  nav.innerHTML = '';
  Object.keys(CATEGORIES).forEach(key => {
    const cat = CATEGORIES[key];
    const btn = el('button', {
      class: 'cat-btn' + (key === state.category ? ' active' : ''),
      onclick: () => { state.category = key; state.fc.index = 0; state.fc.flipped = false; updateNav(); render(); }
    },
      cat.icon ? el('span', { class: 'icon' }, cat.icon) : null,
      cat.label,
      el('span', { class: 'count' }, `(${cat.items.length})`)
    );
    nav.appendChild(btn);
  });

  const browseBtn = el('button', {
    class: 'cat-btn' + (state.category === '__browse' ? ' active' : ''),
    onclick: () => { state.category = '__browse'; updateNav(); render(); }
  }, el('span', { class: 'icon' }, '★'), 'Browse All');
  nav.appendChild(browseBtn);
}

function updateNav() {
  const btns = document.querySelectorAll('.cat-btn');
  btns.forEach(b => b.classList.remove('active'));
  const keys = Object.keys(CATEGORIES);
  const idx = state.category === '__browse'
    ? keys.length
    : keys.indexOf(state.category);
  if (btns[idx]) btns[idx].classList.add('active');
}

function updateStats() {
  let total = 0;
  Object.values(CATEGORIES).forEach(c => total += c.items.length);
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-cat').textContent = Object.keys(CATEGORIES).length;
  document.getElementById('stat-streak').textContent = state.quiz.bestStreak;
}

/* ============== FLASHCARDS ============== */

function renderFlashcards() {
  const items = getItems();
  if (state.fc.index >= items.length) state.fc.index = 0;
  const item = items[state.fc.index];

  const root = document.getElementById('modeContent');
  root.innerHTML = '';

  const stage = el('div', { class: 'fc-stage' });
  const card = el('div', {
    class: 'flashcard' + (state.fc.flipped ? ' flipped' : ''),
    onclick: () => { state.fc.flipped = !state.fc.flipped; renderFlashcards(); }
  });

  const front = el('div', { class: 'fc-face' },
    el('div', { class: 'fc-label' }, 'Term'),
    el('div', { class: 'term' }, item.term),
    el('div', { class: 'fc-meta' }, item.tier || '')
  );

  const back = el('div', { class: 'fc-face fc-back' },
    el('div', { class: 'fc-label' }, 'Definition'),
    el('div', { class: 'term' }, item.def),
    el('div', { class: 'fc-meta' }, 'Click to flip')
  );

  card.appendChild(front);
  card.appendChild(back);
  stage.appendChild(card);
  root.appendChild(stage);

  const prevAttrs = {
    class: 'nav-btn',
    onclick: (e) => { e.stopPropagation(); state.fc.index = Math.max(0, state.fc.index - 1); state.fc.flipped = false; renderFlashcards(); }
  };
  if (state.fc.index === 0) prevAttrs.disabled = 'true';
  const nextAttrs = {
    class: 'nav-btn',
    onclick: (e) => { e.stopPropagation(); state.fc.index = Math.min(items.length - 1, state.fc.index + 1); state.fc.flipped = false; renderFlashcards(); }
  };
  if (state.fc.index === items.length - 1) nextAttrs.disabled = 'true';

  const controls = el('div', { class: 'fc-controls' },
    el('button', prevAttrs, '← Prev'),
    el('div', { class: 'progress-text' },
      el('strong', {}, String(state.fc.index + 1)),
      ' / ',
      String(items.length)
    ),
    el('button', nextAttrs, 'Next →')
  );
  root.appendChild(controls);

  const bar = el('div', { class: 'progress-bar' },
    el('div', { class: 'progress-fill', style: `width:${((state.fc.index + 1) / items.length) * 100}%` })
  );
  root.appendChild(bar);

  const actions = el('div', { class: 'action-row', style: 'margin-top:24px' },
    el('button', {
      class: 'btn-ghost',
      onclick: () => { CATEGORIES[state.category].items = shuffle(CATEGORIES[state.category].items); state.fc.index = 0; state.fc.flipped = false; renderFlashcards(); }
    }, '↻ Shuffle Deck'),
    el('button', {
      class: 'btn-ghost',
      onclick: () => { state.fc.index = 0; state.fc.flipped = false; renderFlashcards(); }
    }, '◄◄ Restart')
  );
  root.appendChild(actions);
}

/* ============== QUIZ ============== */

function buildQuiz() {
  const items = getItems();
  const questions = [];
  const pool = shuffle(items);

  pool.forEach((item, i) => {
    const askDirection = i % 2 === 0 ? 'term-to-def' : 'def-to-term';
    let prompt, correct, options;

    if (askDirection === 'term-to-def') {
      prompt = `Which of the following best describes "${item.term}"?`;
      correct = item.def;
      const distractors = shuffle(items.filter(x => x.def !== item.def)).slice(0, 3).map(x => x.def);
      options = shuffle([correct, ...distractors]);
    } else {
      prompt = `Which term matches this description?\n\n"${item.def}"`;
      correct = item.term;
      const distractors = shuffle(items.filter(x => x.term !== item.term)).slice(0, 3).map(x => x.term);
      options = shuffle([correct, ...distractors]);
    }

    questions.push({ prompt, options, correct, source: item });
  });

  state.quiz = { questions, current: 0, score: 0, answered: false, streak: 0, bestStreak: state.quiz.bestStreak || 0 };
}

function renderQuiz() {
  if (!state.quiz.questions.length) buildQuiz();
  const q = state.quiz.questions[state.quiz.current];
  const root = document.getElementById('modeContent');
  root.innerHTML = '';

  if (!q) { renderQuizSummary(); return; }

  const card = el('div', { class: 'quiz-card' });
  const header = el('div', { class: 'q-header' },
    el('div', { class: 'q-num' }, `Question ${state.quiz.current + 1} of ${state.quiz.questions.length}`),
    el('div', { class: 'q-score' }, `Score: ${state.quiz.score} · Streak: ${state.quiz.streak}`)
  );
  card.appendChild(header);

  const promptText = el('div', { class: 'q-text' });
  promptText.textContent = q.prompt;
  card.appendChild(promptText);

  const opts = el('div', { class: 'q-options' });
  q.options.forEach((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    const btn = el('button', {
      class: 'q-opt',
      onclick: () => answerQuiz(opt, btn, q)
    },
      el('span', { class: 'letter' }, letter + '.'),
      el('span', {}, opt)
    );
    opts.appendChild(btn);
  });
  card.appendChild(opts);

  const fb = el('div', { class: 'q-feedback', id: 'qfb' });
  card.appendChild(fb);

  root.appendChild(card);

  const actions = el('div', { class: 'action-row' },
    el('button', {
      class: 'btn-primary',
      id: 'nextBtn',
      style: 'opacity:0.4;pointer-events:none',
      onclick: nextQuestion
    }, state.quiz.current === state.quiz.questions.length - 1 ? 'Finish ▸' : 'Next ▸'),
    el('button', {
      class: 'btn-ghost',
      onclick: () => { buildQuiz(); renderQuiz(); }
    }, '↻ Restart Quiz')
  );
  root.appendChild(actions);
}

function answerQuiz(selected, btn, q) {
  if (state.quiz.answered) return;
  state.quiz.answered = true;

  const allBtns = document.querySelectorAll('.q-opt');
  allBtns.forEach(b => b.disabled = true);

  const correct = selected === q.correct;

  if (correct) {
    btn.classList.add('correct');
    state.quiz.score++;
    state.quiz.streak++;
    if (state.quiz.streak > state.quiz.bestStreak) state.quiz.bestStreak = state.quiz.streak;
  } else {
    btn.classList.add('wrong');
    state.quiz.streak = 0;
    allBtns.forEach(b => {
      const txt = b.textContent.replace(/^[A-D]\.\s*/, '').trim();
      if (txt === q.correct.trim()) b.classList.add('correct');
    });
  }

  const fb = document.getElementById('qfb');
  fb.classList.add('show');
  fb.innerHTML = correct
    ? `<strong>Correct.</strong> ${escapeHtml(q.source.term)} — ${escapeHtml(q.source.def)}`
    : `<strong>Incorrect.</strong> The correct answer was: <em>${escapeHtml(q.correct)}</em><br><br>${escapeHtml(q.source.term)} — ${escapeHtml(q.source.def)}`;

  const nb = document.getElementById('nextBtn');
  nb.style.opacity = '1';
  nb.style.pointerEvents = 'auto';

  updateStats();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function nextQuestion() {
  state.quiz.current++;
  state.quiz.answered = false;
  if (state.quiz.current >= state.quiz.questions.length) renderQuizSummary();
  else renderQuiz();
}

function renderQuizSummary() {
  const root = document.getElementById('modeContent');
  root.innerHTML = '';
  const total = state.quiz.questions.length;
  const pct = Math.round((state.quiz.score / total) * 100);
  let verdict, msg;
  if (pct === 100) { verdict = 'Perfect Score'; msg = 'You\'re ready for the academy.'; }
  else if (pct >= 90) { verdict = 'Outstanding'; msg = 'Sergeant material.'; }
  else if (pct >= 75) { verdict = 'Solid'; msg = 'Officer ready — keep sharpening.'; }
  else if (pct >= 60) { verdict = 'Passing'; msg = 'Cadet level — review the misses.'; }
  else { verdict = 'Needs Review'; msg = 'Hit the books before clocking on.'; }

  const summary = el('div', { class: 'quiz-summary' },
    el('div', { class: 'label' }, 'Final Result'),
    el('div', { class: 'pct' }, `${pct}%`),
    el('div', { class: 'verdict' }, verdict),
    el('div', { class: 'breakdown' }, `${state.quiz.score} of ${total} correct · Best streak: ${state.quiz.bestStreak}`),
    el('button', {
      class: 'btn-primary',
      onclick: () => { buildQuiz(); renderQuiz(); }
    }, '↻ New Quiz')
  );
  root.appendChild(summary);
  updateStats();
}

/* ============== MATCHING ============== */

function buildMatch() {
  const items = getItems();
  const sample = shuffle(items).slice(0, Math.min(8, items.length));
  state.match = {
    pairs: sample,
    selected: null,
    matched: 0,
    mistakes: 0,
    time: 0,
    timer: null,
    terms: shuffle(sample.map((x, i) => ({ id: i, text: x.term }))),
    defs: shuffle(sample.map((x, i) => ({ id: i, text: x.def })))
  };
  if (state.match.timer) clearInterval(state.match.timer);
  state.match.timer = setInterval(() => {
    state.match.time++;
    const t = document.getElementById('match-time');
    if (t) t.textContent = formatTime(state.match.time);
  }, 1000);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function renderMatch() {
  if (!state.match.pairs.length) buildMatch();
  const root = document.getElementById('modeContent');
  root.innerHTML = '';

  const status = el('div', { class: 'match-status' },
    'Pairs Matched: ',
    el('strong', {}, `${state.match.matched} / ${state.match.pairs.length}`),
    ' · Mistakes: ',
    el('strong', {}, String(state.match.mistakes)),
    ' · Time: ',
    el('strong', { id: 'match-time' }, formatTime(state.match.time))
  );
  root.appendChild(status);

  const grid = el('div', { class: 'match-grid' });
  const colT = el('div', { class: 'match-col' }, el('h3', {}, 'Terms'));
  const colD = el('div', { class: 'match-col' }, el('h3', {}, 'Definitions'));

  state.match.terms.forEach(t => {
    const attrs = {
      class: 'match-item' + (t.matched ? ' matched' : '') + (state.match.selected && state.match.selected.side === 'term' && state.match.selected.id === t.id ? ' selected' : ''),
      onclick: () => selectMatch('term', t)
    };
    if (t.matched) attrs.disabled = 'true';
    const btn = el('button', attrs, t.text);
    btn.dataset.id = t.id;
    btn.dataset.side = 'term';
    colT.appendChild(btn);
  });

  state.match.defs.forEach(d => {
    const attrs = {
      class: 'match-item' + (d.matched ? ' matched' : '') + (state.match.selected && state.match.selected.side === 'def' && state.match.selected.id === d.id ? ' selected' : ''),
      onclick: () => selectMatch('def', d)
    };
    if (d.matched) attrs.disabled = 'true';
    const btn = el('button', attrs, d.text);
    btn.dataset.id = d.id;
    btn.dataset.side = 'def';
    colD.appendChild(btn);
  });

  grid.appendChild(colT);
  grid.appendChild(colD);
  root.appendChild(grid);

  const actions = el('div', { class: 'action-row' },
    el('button', {
      class: 'btn-ghost',
      onclick: () => { buildMatch(); renderMatch(); }
    }, '↻ New Round')
  );
  root.appendChild(actions);

  if (state.match.matched === state.match.pairs.length) {
    if (state.match.timer) { clearInterval(state.match.timer); state.match.timer = null; }
    const summary = el('div', {
      class: 'quiz-summary',
      style: 'margin-top:24px'
    },
      el('div', { class: 'label' }, 'Round Complete'),
      el('div', { class: 'pct' }, formatTime(state.match.time)),
      el('div', { class: 'verdict' }, state.match.mistakes === 0 ? 'Flawless' : `${state.match.mistakes} Mistake${state.match.mistakes === 1 ? '' : 's'}`),
      el('div', { class: 'breakdown' }, `${state.match.pairs.length} pairs matched`),
      el('button', {
        class: 'btn-primary',
        onclick: () => { buildMatch(); renderMatch(); }
      }, '↻ Play Again')
    );
    root.appendChild(summary);
  }
}

function selectMatch(side, item) {
  if (item.matched) return;
  if (!state.match.selected) {
    state.match.selected = { side, id: item.id };
    renderMatch();
    return;
  }
  if (state.match.selected.side === side && state.match.selected.id === item.id) {
    state.match.selected = null;
    renderMatch();
    return;
  }
  if (state.match.selected.side === side) {
    state.match.selected = { side, id: item.id };
    renderMatch();
    return;
  }
  const aId = state.match.selected.id;
  const bId = item.id;
  if (aId === bId) {
    state.match.terms.find(t => t.id === aId).matched = true;
    state.match.defs.find(d => d.id === bId).matched = true;
    state.match.matched++;
    state.match.selected = null;
    renderMatch();
  } else {
    state.match.mistakes++;
    state.match.selected = null;
    renderMatch();
    const wrongBtn = document.querySelector(`.match-item[data-id="${bId}"][data-side="${side}"]`);
    if (wrongBtn) {
      wrongBtn.classList.add('flash-wrong');
      setTimeout(() => { wrongBtn.classList.remove('flash-wrong'); }, 400);
    }
  }
}

/* ============== BROWSE ============== */

function renderBrowse() {
  const root = document.getElementById('modeContent');
  root.innerHTML = '';

  const all = [];
  Object.entries(CATEGORIES).forEach(([k, v]) => {
    v.items.forEach(it => all.push({ ...it, _cat: v.label }));
  });

  const search = el('input', {
    class: 'search-bar',
    placeholder: `Search all ${all.length} terms and definitions…`,
    type: 'text',
    oninput: (e) => filterBrowse(e.target.value, all)
  });
  root.appendChild(search);

  const list = el('div', { class: 'browse-list', id: 'browseList' });
  root.appendChild(list);
  filterBrowse('', all);
}

function filterBrowse(q, all) {
  const list = document.getElementById('browseList');
  list.innerHTML = '';
  const ql = q.toLowerCase();
  const filtered = !q ? all : all.filter(it =>
    it.term.toLowerCase().includes(ql) || it.def.toLowerCase().includes(ql)
  );

  if (!filtered.length) {
    list.appendChild(el('div', {
      style: 'padding:40px;text-align:center;color:var(--ink-faint);font-size:12px;letter-spacing:0.2em;text-transform:uppercase'
    }, 'No matches'));
    return;
  }

  filtered.forEach(it => {
    const item = el('div', { class: 'browse-item' },
      el('div', {},
        el('div', { class: 'browse-term' }, it.term),
        el('div', {
          style: 'font-size:9px;letter-spacing:0.25em;color:var(--ink-faint);text-transform:uppercase;margin-top:6px'
        }, `${it._cat}${it.tier ? ' · ' + it.tier : ''}`)
      ),
      el('div', { class: 'browse-def' }, it.def)
    );
    list.appendChild(item);
  });
}

/* ============== ROUTER ============== */

function render() {
  if (state.category === '__browse') {
    renderBrowse();
    return;
  }

  if (state.mode === 'flashcards') renderFlashcards();
  else if (state.mode === 'quiz') { buildQuiz(); renderQuiz(); }
  else if (state.mode === 'match') { buildMatch(); renderMatch(); }
}

function init() {
  buildNav();
  updateStats();
  render();

  document.querySelectorAll('.mode-card').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.mode = b.dataset.mode;
      if (state.category === '__browse') {
        state.category = Object.keys(CATEGORIES)[0];
        updateNav();
      }
      render();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (state.mode !== 'flashcards' || state.category === '__browse') return;
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') {
      state.fc.index = Math.max(0, state.fc.index - 1);
      state.fc.flipped = false;
      renderFlashcards();
    } else if (e.key === 'ArrowRight') {
      state.fc.index = Math.min(getItems().length - 1, state.fc.index + 1);
      state.fc.flipped = false;
      renderFlashcards();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      state.fc.flipped = !state.fc.flipped;
      renderFlashcards();
    }
  });
}

loadData();
