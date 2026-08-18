/* 河南三支一扶 · 上岸备考学习网 应用逻辑 */
(function () {
  "use strict";

  var Data = window.SZYF_DATA || {
    meta: { stats: {}, plan: [] },
    knowledge: [], shizheng: [], koujue: [], questions: []
  };

  var LS = {
    know: "szyf_know",       // 背诵掌握情况 {subjectId: [已掌握索引]}
    wrong: "szyf_wrong",     // 错题本 [questionId]
    done: "szyf_done",       // 刷题已做 [questionId]
    stats: "szyf_stats",     // 刷题统计 {total, correct}
  };

  function read(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var store = {
    know: read(LS.know, {}),
    wrong: read(LS.wrong, []),
    done: read(LS.done, []),
    stats: read(LS.stats, { total: 0, correct: 0 }),
  };

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function el(id) { return document.getElementById(id); }

  var App = window.App = {};

  /* ---------- 导航 ---------- */
  App.go = function (page) {
    document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
    var target = el("page-" + page);
    if (target) target.classList.add("active");
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-page") === page);
    });
    if (page === "home") App.renderHome();
    else if (page === "recite") App.renderRecite();
    else if (page === "shizheng") App.renderShizheng();
    else if (page === "koujue") App.renderKoujue();
    else if (page === "quiz") App.renderQuizHome();
    else if (page === "wrong") App.renderWrong();
    window.scrollTo({ top: 0 });
  };

  document.querySelectorAll(".nav a").forEach(function (a) {
    a.addEventListener("click", function () { App.go(a.getAttribute("data-page")); });
  });

  /* ---------- 首页 ---------- */
  App.renderHome = function () {
    var stats = Data.meta.stats || {};
    var knownTotal = 0, knowTotal = 0;
    Data.knowledge.forEach(function (k) {
      knowTotal += (k.cards || []).length;
      knownTotal += ((store.know[k.id] || []).length);
    });
    var html = "";
    html += '<div class="hero">'
      + '<h1>河南三支一扶 · <span class="zhuan">上岸备考</span></h1>'
      + '<p>一站式备考：考点背诵 · 时政热点 · 速记口诀 · 真题刷题 · 错题复盘。资料覆盖 2013—2025 真题、2026 冲刺卷、公基速记、三农乡村振兴、时政月报，助你高效上岸。</p>'
      + '<div class="tags">'
      + '<span class="tag">📚 ' + (Data.knowledge.length) + ' 个考点专题</span>'
      + '<span class="tag">📰 ' + (Data.shizheng.length) + ' 期时政月报</span>'
      + '<span class="tag">🧠 ' + (Data.koujue.length) + ' 套速记口诀</span>'
      + '<span class="tag">📝 ' + (Data.questions.length) + ' 道真题/练习题</span>'
      + '</div></div>';

    html += '<div class="stat-grid">'
      + statCard(Data.questions.length, "题库总题量", "")
      + statCard(knowTotal - knownTotal, "待背考点", "gold")
      + statCard(knownTotal, "已掌握考点", "green")
      + statCard(store.wrong.length, "错题待复习", "blue")
      + '</div>';

    // 学习计划
    html += '<div class="section-title"><span class="bar"></span>30 天上岸学习计划</div><div class="plan-list">';
    (Data.meta.plan || []).forEach(function (p, i) {
      html += '<div class="plan-item"><div class="idx">' + (i + 1) + '</div>'
        + '<div><div class="t">' + esc(p.t) + '</div><div class="d">' + esc(p.d) + '</div></div></div>';
    });
    html += '</div>';

    // 功能区入口
    html += '<div class="section-title"><span class="bar"></span>开始学习</div><div class="card-grid">';
    html += entryCard("recite", "📚", "考点背诵", "三农 · 法律 · 常识 · 省情 · 一号文件，闪卡记忆", knownTotal + "/" + knowTotal + " 已掌握");
    html += entryCard("shizheng", "📰", "时政热点", "2025—2026 各月考点汇总", Data.shizheng.length + " 期");
    html += entryCard("koujue", "🧠", "速记口诀", "常识口诀 88 条 · 常识 4600 问", Data.koujue.length + " 套");
    html += entryCard("quiz", "📝", "真题刷题", "2013—2025 真题 + 2026 冲刺卷，含解析", Data.questions.length + " 题");
    html += entryCard("wrong", "❌", "错题本", "自动收集错题，集中复盘", store.wrong.length + " 题");
    html += '</div>';

    el("page-home").innerHTML = html;
  };

  function statCard(num, lbl, cls) {
    return '<div class="stat-card"><div class="num ' + cls + '">' + num + '</div><div class="lbl">' + lbl + '</div></div>';
  }
  function entryCard(page, ic, t, d, badge) {
    return '<div class="entry-card" onclick="App.go(\'' + page + '\')">'
      + '<span class="badge">' + esc(badge) + '</span>'
      + '<div class="ic">' + ic + '</div><div class="t">' + t + '</div><div class="d">' + d + '</div></div>';
  }

  /* ---------- 考点背诵 ---------- */
  var deckState = { subject: null, idx: 0, flipped: false, order: [] };

  App.renderRecite = function () {
    var html = '<div class="section-title"><span class="bar"></span>考点背诵 · 闪卡记忆</div>';
    if (deckState.subject) { App.renderDeck(); return; }
    html += '<div class="card-grid">';
    Data.knowledge.forEach(function (k) {
      var known = (store.know[k.id] || []).length;
      var total = (k.cards || []).length;
      var pct = total ? Math.round(known / total * 100) : 0;
      html += '<div class="entry-card" onclick="App.openDeck(\'' + k.id + '\')">'
        + '<div class="ic">' + (k.icon || "📖") + '</div>'
        + '<div class="t">' + esc(k.title) + '</div>'
        + '<div class="d">' + esc(k.desc || "") + '</div>'
        + '<div class="bar-wrap"><div class="bar-fill" style="width:' + pct + '%"></div></div>'
        + '<div class="d" style="margin-top:6px">' + known + '/' + total + ' 已掌握</div>'
        + '</div>';
    });
    html += '</div>';
    el("page-recite").innerHTML = html;
  };

  App.openDeck = function (id) {
    var k = Data.knowledge.filter(function (x) { return x.id === id; })[0];
    if (!k || !(k.cards && k.cards.length)) return;
    deckState = { subject: id, idx: 0, flipped: false, order: [] };
    App.renderRecite();
  };

  App.renderDeck = function () {
    var k = Data.knowledge.filter(function (x) { return x.id === deckState.subject; })[0];
    if (!k) { deckState.subject = null; App.renderRecite(); return; }
    var cards = k.cards;
    var known = store.know[k.id] || [];
    var idx = deckState.idx;
    var card = cards[idx];
    var flipped = deckState.flipped;

    var html = '<div class="deck-toolbar">'
      + '<button class="btn small" onclick="App.closeDeck()">← 返回专题</button>'
      + '<strong>' + esc(k.title) + '</strong>'
      + '<span class="progress-tip" style="margin:0">' + (idx + 1) + ' / ' + cards.length + '</span>'
      + '<span style="margin-left:auto" class="btn small" onclick="App.shuffleDeck()">🔀 随机</span>'
      + '</div>';

    html += '<div class="flashcard" onclick="App.flipCard()">'
      + '<span class="fc-tag">' + esc(k.title) + '</span>'
      + '<div class="fc-inner">';
    if (!flipped) {
      html += '<div class="fc-q">' + esc(card.q) + '</div>'
        + '<div class="fc-hint">👆 点击卡片查看答案</div>';
    } else {
      html += '<div class="fc-a' + (card.q === card.a ? ' plain' : '') + '">' + esc(card.a) + '</div>';
      if (card.tip) html += '<div class="fc-tip">💡 ' + esc(card.tip) + '</div>';
    }
    html += '</div></div>';

    var isKnown = known.indexOf(idx) >= 0;
    html += '<div class="rating-row">'
      + '<button class="rate-btn again' + (isKnown ? '' : ' on') + '" onclick="App.rateCard(false)">😕 再复习</button>'
      + '<button class="rate-btn know' + (isKnown ? ' on' : '') + '" onclick="App.rateCard(true)">✅ 已掌握</button>'
      + '</div>';

    html += '<div class="card-nav">'
      + '<button class="btn" onclick="App.prevCard()">← 上一张</button>'
      + '<button class="btn primary" onclick="App.nextCard()">下一张 →</button>'
      + '</div>';

    var known2 = (store.know[k.id] || []).length;
    html += '<div class="progress-tip">本专题已掌握 ' + known2 + ' / ' + cards.length + ' 个考点</div>';

    el("page-recite").innerHTML = html;
  };

  App.flipCard = function () { deckState.flipped = !deckState.flipped; App.renderDeck(); };
  App.nextCard = function () {
    deckState.idx = (deckState.idx + 1) % Data.knowledge.filter(function (x) { return x.id === deckState.subject; })[0].cards.length;
    deckState.flipped = false; App.renderDeck();
  };
  App.prevCard = function () {
    var len = Data.knowledge.filter(function (x) { return x.id === deckState.subject; })[0].cards.length;
    deckState.idx = (deckState.idx - 1 + len) % len;
    deckState.flipped = false; App.renderDeck();
  };
  App.shuffleDeck = function () { deckState.idx = Math.floor(Math.random() * deckStateOrder().length); deckState.flipped = false; App.renderDeck(); };
  function deckStateOrder() {
    var k = Data.knowledge.filter(function (x) { return x.id === deckState.subject; })[0];
    return k.cards;
  }
  App.rateCard = function (know) {
    var k = Data.knowledge.filter(function (x) { return x.id === deckState.subject; })[0];
    var arr = store.know[k.id] || [];
    var idx = deckState.idx;
    if (know) { if (arr.indexOf(idx) < 0) arr.push(idx); }
    else { arr = arr.filter(function (i) { return i !== idx; }); }
    store.know[k.id] = arr;
    write(LS.know, store.know);
    App.renderDeck();
  };
  App.closeDeck = function () { deckState.subject = null; App.renderRecite(); };

  /* ---------- 时政热点 ---------- */
  App.renderShizheng = function () {
    var html = '<div class="section-title"><span class="bar"></span>时政热点</div>'
      + '<div class="deck-toolbar"><span class="btn small" onclick="App.toggleAllShizheng()">展开 / 收起全部月份</span>'
      + '<span style="font-size:12.5px;color:#8a857c">点击月份看条目标题，点击条目看详情</span></div>'
      + '<div class="doc-list">';
    Data.shizheng.forEach(function (m, mi) {
      html += '<div class="doc-item month" id="sz-' + mi + '" onclick="App.toggleShizheng(' + mi + ')">';
      html += '<div class="head"><span class="dot"></span><span class="tt">' + esc(m.month) + '</span>'
        + '<span class="dt">' + (m.items || []).length + ' 条 ▾</span></div>';
      html += '<div class="detail">';
      (m.items || []).forEach(function (it, ii) {
        html += '<div class="doc-item sub" id="szi-' + mi + '-' + ii + '" onclick="App.toggleShizhengItem(event,' + mi + ',' + ii + ')">';
        html += '<div class="head"><span class="tt">' + (ii + 1) + '. ' + esc(it.title) + '</span>'
          + (it.detail ? '<span class="dt">' + it.detail.length + ' 字 ▾</span>' : '')
          + '</div>';
        if (it.detail) {
          html += '<div class="detail">' + esc(it.detail) + '</div>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    el("page-shizheng").innerHTML = html;
  };
  App.toggleShizheng = function (i) {
    var d = el("sz-" + i);
    if (d) d.classList.toggle("open");
  };
  App.toggleShizhengItem = function (ev, mi, ii) {
    if (ev) ev.stopPropagation();
    var d = el("szi-" + mi + "-" + ii);
    if (d) d.classList.toggle("open");
  };
  App.toggleAllShizheng = function () {
    var all = document.querySelectorAll("#page-shizheng .doc-item.month");
    var anyOpen = document.querySelector("#page-shizheng .doc-item.month.open");
    all.forEach(function (d) { d.classList.toggle("open", !anyOpen); });
  };

  /* ---------- 速记口诀 ---------- */
  App.renderKoujue = function () {
    var html = '<div class="section-title"><span class="bar"></span>速记口诀</div><div class="doc-list">';
    Data.koujue.forEach(function (k, ki) {
      html += '<div class="doc-item" id="kj-' + ki + '" onclick="App.toggleKoujue(' + ki + ')">';
      html += '<div class="head"><span class="dot"></span><span class="tt">' + (k.icon || "") + ' ' + esc(k.title) + '</span>'
        + '<span class="dt">' + (k.items || []).length + ' 条</span></div>';
      html += '<div class="detail">';
      (k.items || []).forEach(function (it) {
        html += '<div style="margin-bottom:10px"><b>' + esc(it.title) + '</b>';
        if (it.content) html += '<div style="color:#6B645C;white-space:pre-wrap">' + esc(it.content) + '</div>';
        html += '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    el("page-koujue").innerHTML = html;
  };
  App.toggleKoujue = function (i) {
    var d = el("kj-" + i);
    if (d) d.classList.toggle("open");
  };

  /* ---------- 刷题 ---------- */
  var quiz = { mode: null, list: [], idx: 0, answers: [], graded: [], source: "", seed: null };

  App.renderQuizHome = function () {
    if (quiz.mode) { App.renderQuiz(); return; }
    var catGroups = {};
    var groupCount = {};
    var catOrder = [];
    var CAT_ORDER = ["真题", "冲刺卷", "练习题", "会议自测", "时政模拟", "不定项"];
    var CAT_LABELS = {
      "真题": "📕 历年真题 · 按年份刷",
      "冲刺卷": "📗 2026 考前冲刺卷",
      "练习题": "📘 公基练习题 · 按内容刷",
      "会议自测": "📙 重要会议自测",
      "时政模拟": "📰 时政模拟题",
      "不定项": "✍️ 不定项专项练习"
    };
    Data.questions.forEach(function (q) {
      var c = q.category || "其他";
      var g = q.group || q.source || "其他";
      if (!catGroups[c]) { catGroups[c] = []; catOrder.push(c); }
      if (!groupCount[g]) { groupCount[g] = 0; catGroups[c].push(g); }
      groupCount[g]++;
    });
    catOrder.sort(function (a, b) {
      var ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
      if (ia < 0) ia = 99;
      if (ib < 0) ib = 99;
      return ia - ib;
    });

    var html = '<div class="section-title"><span class="bar"></span>真题刷题</div>';

    html += '<div class="card-grid" style="margin-bottom:18px">';
    html += '<div class="entry-card" onclick="App.startPractice(\'all\',\'顺序\')"><div class="ic">🎯</div><div class="t">顺序练习</div><div class="d">按题库顺序逐题作答，即时反馈解析</div></div>';
    html += '<div class="entry-card" onclick="App.startPractice(\'all\',\'随机\')"><div class="ic">🔀</div><div class="t">随机练习</div><div class="d">随机抽题，检验真实水平</div></div>';
    html += '<div class="entry-card" onclick="App.startMock()"><div class="ic">⏱️</div><div class="t">模拟考试</div><div class="d">统一作答后判分，体验考场节奏</div></div>';
    html += '<div class="entry-card" onclick="App.startWrong()"><div class="ic">❌</div><div class="t">错题重做</div><div class="d">只练错题本里的题，攻克薄弱点</div></div>';
    html += '</div>';

    catOrder.forEach(function (c) {
      html += '<div class="section-title"><span class="bar"></span>' + (CAT_LABELS[c] || esc(c)) + '</div><div class="card-grid">';
      catGroups[c].forEach(function (g) {
        var badge = "", title = g;
        if (g.indexOf("·") >= 0) {
          var parts = g.split("·");
          badge = parts[0];
          title = parts.slice(1).join("·");
        }
        html += '<div class="entry-card" onclick="App.startPractice(\'' + esc(g) + '\',\'顺序\')">'
          + (badge ? '<span class="badge">' + esc(badge) + '</span>' : '')
          + '<div class="ic">📝</div><div class="t">' + esc(title) + '</div>'
          + '<div class="d">共 ' + groupCount[g] + ' 题</div></div>';
      });
      html += '</div>';
    });
    el("page-quiz").innerHTML = html;
  };

  function questionList(group) {
    if (group === "all") return Data.questions.slice();
    return Data.questions.filter(function (q) { return (q.group || q.source) === group; });
  }

  App.startPractice = function (category, mode) {
    var list = questionList(category);
    if (mode === "随机") list = shuffle(list);
    if (!list.length) { alert("该分类暂无题目"); return; }
    quiz = { mode: "practice", list: list, idx: 0, answers: [], graded: [], source: category };
    App.renderQuiz();
  };
  App.startWrong = function () {
    var ids = store.wrong;
    if (!ids.length) { alert("错题本为空，先去刷题吧！"); return; }
    var list = Data.questions.filter(function (q) { return ids.indexOf(q.id) >= 0; });
    quiz = { mode: "practice", list: list, idx: 0, answers: [], graded: [], source: "错题重做" };
    App.renderQuiz();
  };
  App.startMock = function () {
    var list = shuffle(Data.questions.slice());
    if (!list.length) { alert("题库为空"); return; }
    quiz = { mode: "mock", list: list.slice(0, 40), idx: 0, answers: [], graded: [], source: "模拟考试" };
    App.renderQuiz();
  };
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  App.renderQuiz = function () {
    if (quiz.mode === "practice") return App.renderQuizPractice();
    return App.renderQuizMock();
  };

  function quizHeaderHtml() {
    return '<div class="deck-toolbar">'
      + '<button class="btn small" onclick="App.exitQuiz()">← 返回</button>'
      + '<strong>' + esc(quiz.source) + '</strong>'
      + '<span class="progress-tip" style="margin:0">' + (quiz.idx + 1) + ' / ' + quiz.list.length + '</span>'
      + '<span style="margin-left:auto" class="btn small" onclick="App.exitQuiz()">退出</span>'
      + '</div>';
  }

  function isMulti(q) { return q.type === "多选题" || q.type === "不定项"; }
  function isJudge(q) { return q.type === "判断题"; }
  function normAns(s) {
    s = String(s || "").trim();
    if (s === "正确" || s === "错误") return s;
    return s.replace(/[^A-H]/g, "").split("").sort().join("");
  }
  function ansCorrect(q, picked) { return normAns(picked) === normAns(q.answer); }
  function judgeVal(oi) { return oi === 0 ? "正确" : "错误"; }

  App.renderQuizPractice = function () {
    var q = quiz.list[quiz.idx];
    if (!q) { App.showQuizResult(); return; }
    var picked = quiz.answers[quiz.idx];
    var graded = quiz.graded[quiz.idx];
    var multi = isMulti(q);
    var html = quizHeaderHtml();

    html += '<div class="quiz-card">';
    html += '<div class="quiz-meta">'
      + '<span class="pill type">' + esc(q.type || "题目") + '</span>'
      + '<span class="pill src">' + esc(q.source || q.category || "") + '</span>'
      + (multi ? '<span class="pill" style="background:#FBF3DF;color:#8a6414">多选 · 可勾选多项</span>' : '')
      + '</div>';
    html += '<div class="quiz-stem">' + esc(q.stem) + '</div>';
    var opts = (q.options && q.options.length) ? q.options : (isJudge(q) ? ["正确", "错误"] : []);
    opts.forEach(function (opt, oi) {
      var val = isJudge(q) ? judgeVal(oi) : optKey(oi);
      var cls = "option";
      var isSel = picked != null && picked.indexOf(val) >= 0;
      if (graded) {
        cls += " disabled";
        if (q.answer && q.answer.indexOf(val) >= 0) cls += " correct";
        else if (isSel) cls += " wrong";
      } else if (isSel) {
        cls += " selected";
      }
      html += '<div class="option ' + cls + '" onclick="App.pickOption(' + oi + ')">'
        + '<span class="key">' + (isJudge(q) ? (oi === 0 ? "✓" : "✗") : val) + '</span><span>' + esc(opt) + '</span></div>';
    });

    if (graded) {
      var correct = ansCorrect(q, picked);
      html += '<div class="explain show">'
        + '<div class="ans-line ' + (correct ? '' : 'wrong') + '">' + (correct ? '✅ 回答正确' : '❌ 回答错误，正确答案：' + esc(q.answer)) + '</div>'
        + (q.explanation ? '<div>' + esc(q.explanation) + '</div>' : '')
        + '</div>';
      html += '<div class="quiz-actions"><button class="btn primary" onclick="App.nextQuiz()">下一题 →</button></div>';
    } else if (multi) {
      var selCount = (picked || "").length;
      html += '<div class="quiz-actions">'
        + '<button class="btn primary" onclick="App.confirmMulti()"' + (selCount ? '' : ' disabled') + '>确认答案</button>'
        + '<span class="btn small" style="opacity:.7">已选 ' + selCount + ' 项</span>'
        + '</div>';
    } else {
      html += '<div class="quiz-actions"><span class="btn small" style="opacity:.7">请选择一个答案</span></div>';
    }
    html += '</div>';
    el("page-quiz").innerHTML = html;
  };

  App.renderQuizMock = function () {
    var q = quiz.list[quiz.idx];
    if (!q) { App.finishMock(); return; }
    var picked = quiz.answers[quiz.idx];
    var multi = isMulti(q);
    var html = quizHeaderHtml();
    html += '<div class="quiz-card">';
    html += '<div class="quiz-meta">'
      + '<span class="pill type">' + esc(q.type || "题目") + '</span>'
      + '<span class="pill src">' + esc(q.source || "") + '</span>'
      + (multi ? '<span class="pill" style="background:#FBF3DF;color:#8a6414">多选</span>' : '')
      + '</div>';
    html += '<div class="quiz-stem">' + esc(q.stem) + '</div>';
    var opts = (q.options && q.options.length) ? q.options : (isJudge(q) ? ["正确", "错误"] : []);
    opts.forEach(function (opt, oi) {
      var val = isJudge(q) ? judgeVal(oi) : optKey(oi);
      var isSel = picked != null && picked.indexOf(val) >= 0;
      html += '<div class="option ' + (isSel ? "selected" : "") + '" onclick="App.pickOptionMock(' + oi + ')">'
        + '<span class="key">' + (isJudge(q) ? (oi === 0 ? "✓" : "✗") : val) + '</span><span>' + esc(opt) + '</span></div>';
    });
    html += '<div class="quiz-actions">'
      + (quiz.idx > 0 ? '<button class="btn" onclick="App.mockNav(-1)">← 上一题</button>' : '')
      + (quiz.idx < quiz.list.length - 1 ? '<button class="btn primary" onclick="App.mockNav(1)">下一题 →</button>' : '<button class="btn primary" onclick="App.finishMock()">交卷</button>')
      + '<button class="btn" onclick="App.finishMock()">交卷</button>'
      + '</div>';
    html += '</div>';
    el("page-quiz").innerHTML = html;
  };

  function recordResult(q, correct) {
    store.done.push(q.id); store.done = uniq(store.done); write(LS.done, store.done);
    store.stats.total++; if (correct) store.stats.correct++; write(LS.stats, store.stats);
    if (!correct) { store.wrong.push(q.id); store.wrong = uniq(store.wrong); write(LS.wrong, store.wrong); }
  }

  App.pickOption = function (oi) {
    var q = quiz.list[quiz.idx];
    var key = isJudge(q) ? judgeVal(oi) : optKey(oi);
    if (isMulti(q)) {
      // 多选：切换勾选
      var cur = quiz.answers[quiz.idx] || "";
      if (cur.indexOf(key) >= 0) cur = cur.replace(key, "");
      else cur = (cur + key).split("").sort().join("");
      quiz.answers[quiz.idx] = cur;
      App.renderQuizPractice();
      return;
    }
    // 单选：立即判分
    quiz.answers[quiz.idx] = key;
    quiz.graded[quiz.idx] = true;
    recordResult(q, ansCorrect(q, key));
    App.renderQuizPractice();
  };
  App.confirmMulti = function () {
    var q = quiz.list[quiz.idx];
    quiz.graded[quiz.idx] = true;
    recordResult(q, ansCorrect(q, quiz.answers[quiz.idx]));
    App.renderQuizPractice();
  };
  App.pickOptionMock = function (oi) {
    var q = quiz.list[quiz.idx];
    var key = isJudge(q) ? judgeVal(oi) : optKey(oi);
    if (isMulti(q)) {
      var cur = quiz.answers[quiz.idx] || "";
      if (cur.indexOf(key) >= 0) cur = cur.replace(key, "");
      else cur = (cur + key).split("").sort().join("");
      quiz.answers[quiz.idx] = cur;
    } else {
      quiz.answers[quiz.idx] = key;
    }
    App.renderQuizMock();
  };
  App.mockNav = function (d) { quiz.idx += d; App.renderQuizMock(); };
  App.nextQuiz = function () {
    quiz.idx++;
    if (quiz.idx >= quiz.list.length) { App.showQuizResult(); return; }
    App.renderQuizPractice();
  };
  App.exitQuiz = function () { quiz.mode = null; App.renderQuizHome(); };

  App.showQuizResult = function () {
    var list = quiz.list;
    var correct = 0;
    list.forEach(function (q, i) { if (ansCorrect(q, quiz.answers[i])) correct++; });
    var pct = Math.round(correct / list.length * 100);
    var html = '<div class="quiz-card result-panel">'
      + '<div class="big">' + pct + ' 分</div>'
      + '<div class="score">答对 ' + correct + ' / ' + list.length + ' 题</div>'
      + '<p style="color:#6B645C">' + (pct >= 80 ? '🎉 优秀！保持手感，稳了！' : pct >= 60 ? '👍 不错，继续巩固薄弱点！' : '💪 别灰心，多背考点多刷题，一定上岸！') + '</p>'
      + '<div class="quiz-actions" style="justify-content:center">'
      + '<button class="btn primary" onclick="App.exitQuiz()">返回刷题</button>'
      + '<button class="btn" onclick="App.reviewResult()">查看错题解析</button>'
      + '</div></div>';
    el("page-quiz").innerHTML = html;
  };

  App.finishMock = function () {
    var unanswered = quiz.answers.filter(function (a) { return a == null; }).length;
    if (unanswered > 0) {
      if (!confirm("还有 " + unanswered + " 题未作答，确定交卷吗？")) return;
    }
    var list = quiz.list;
    var correct = 0;
    list.forEach(function (q, i) {
      var ok = ansCorrect(q, quiz.answers[i]);
      if (ok) correct++;
      store.done.push(q.id); store.done = uniq(store.done);
      store.stats.total++; if (ok) store.stats.correct++;
      if (!ok && quiz.answers[i] != null) { store.wrong.push(q.id); store.wrong = uniq(store.wrong); }
    });
    write(LS.done, store.done); write(LS.stats, store.stats); write(LS.wrong, store.wrong);
    quiz.mode = "mock-result";
    App.showQuizResult();
  };

  App.reviewResult = function () {
    var list = quiz.list;
    var html = quizHeaderHtml() + '<div class="detail-list">';
    list.forEach(function (q, i) {
      var my = quiz.answers[i];
      var ok = ansCorrect(q, my);
      html += '<div class="wrong-item">'
        + '<div class="stem">' + (i + 1) + '. ' + esc(q.stem) + '</div>'
        + '<div class="row">我的答案：<span class="' + (ok ? 'ok' : 'no') + '">' + esc(my || "未作答") + '</span>　正确答案：<span class="ok">' + esc(q.answer) + '</span></div>'
        + (q.explanation ? '<div class="row">' + esc(q.explanation) + '</div>' : '')
        + '</div>';
    });
    html += '</div><div class="quiz-actions" style="justify-content:center"><button class="btn primary" onclick="App.exitQuiz()">返回刷题</button></div>';
    el("page-quiz").innerHTML = html;
  };

  function optKey(i) { return String.fromCharCode(65 + i); }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  /* ---------- 错题本 ---------- */
  App.renderWrong = function () {
    var ids = store.wrong;
    var html = '<div class="section-title"><span class="bar"></span>错题本</div>';
    if (!ids.length) {
      html += '<div class="empty"><div class="big">✅</div><p>暂无错题，继续保持！</p></div>';
      el("page-wrong").innerHTML = html; return;
    }
    var list = Data.questions.filter(function (q) { return ids.indexOf(q.id) >= 0; });
    html += '<div class="deck-toolbar">'
      + '<span>共 ' + list.length + ' 道错题</span>'
      + '<span class="btn small" onclick="App.startWrong()" style="margin-left:auto">重做错题</span>'
      + '<span class="btn small" onclick="App.clearWrong()">清空</span>'
      + '</div>';
    list.forEach(function (q) {
      html += '<div class="wrong-item">'
        + '<div class="stem">' + esc(q.stem) + '</div>'
        + '<div class="row">正确答案：<span class="ok">' + esc(q.answer) + '</span>'
        + (q.source ? '　·　' + esc(q.source) : '')
        + '</div>'
        + (q.explanation ? '<div class="row">' + esc(q.explanation) + '</div>' : '')
        + '</div>';
    });
    el("page-wrong").innerHTML = html;
  };
  App.clearWrong = function () {
    if (!confirm("确定清空错题本吗？")) return;
    store.wrong = []; write(LS.wrong, store.wrong); App.renderWrong();
  };

  /* ---------- 搜索 ---------- */
  App.onSearchInput = function (val) {
    val = (val || "").trim();
    if (!val) { App.go(App.currentPage || "home"); return; }
    App.currentPage = App.currentPage || "home";
    App.renderSearch(val);
    document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
    el("page-search").classList.add("active");
    document.querySelectorAll(".nav a").forEach(function (a) { a.classList.remove("active"); });
  };
  App.currentPage = "home";

  App.renderSearch = function (kw) {
    kw = kw.toLowerCase();
    var html = '<div class="section-title"><span class="bar"></span>搜索：「' + esc(kw) + '」</div><div class="search-results">';
    var total = 0;

    // 考点
    var knowRes = [];
    Data.knowledge.forEach(function (k) {
      (k.cards || []).forEach(function (c) {
        if ((c.q + " " + c.a).toLowerCase().indexOf(kw) >= 0) knowRes.push({ h: c.q, s: c.a, m: k.title, id: k.id });
      });
    });
    if (knowRes.length) {
      total += knowRes.length;
      html += '<div class="res-group"><h4>📚 考点（' + knowRes.length + '）</h4>';
      knowRes.slice(0, 30).forEach(function (r) {
        html += '<div class="result-item" onclick="App.openDeck(\'' + r.id + '\')"><div class="h">' + hl(r.h, kw) + '</div><div class="s">' + hl(r.s, kw) + '</div><div class="m">' + esc(r.m) + '</div></div>';
      });
      html += '</div>';
    }

    // 题目
    var qRes = Data.questions.filter(function (q) {
      return (q.stem + " " + (q.options || []).join(" ") + " " + (q.explanation || "")).toLowerCase().indexOf(kw) >= 0;
    });
    if (qRes.length) {
      total += qRes.length;
      html += '<div class="res-group"><h4>📝 题目（' + qRes.length + '）</h4>';
      qRes.slice(0, 30).forEach(function (q) {
        html += '<div class="result-item" onclick="App.jumpQuiz(\'' + q.id + '\')"><div class="h">' + hl(q.stem, kw) + '</div><div class="m">' + esc(q.source || "") + ' · 答案 ' + esc(q.answer) + '</div></div>';
      });
      html += '</div>';
    }

    // 时政
    var szRes = [];
    Data.shizheng.forEach(function (m) {
      (m.items || []).forEach(function (it) {
        if ((it.title + " " + (it.detail || "")).toLowerCase().indexOf(kw) >= 0) szRes.push({ h: it.title, s: it.detail || "", m: m.month });
      });
    });
    if (szRes.length) {
      total += szRes.length;
      html += '<div class="res-group"><h4>📰 时政（' + szRes.length + '）</h4>';
      szRes.slice(0, 20).forEach(function (r) {
        html += '<div class="result-item"><div class="h">' + hl(r.h, kw) + '</div><div class="s">' + hl(r.s, kw) + '</div><div class="m">' + esc(r.m) + '</div></div>';
      });
      html += '</div>';
    }

    // 口诀
    var kjRes = [];
    Data.koujue.forEach(function (k) {
      (k.items || []).forEach(function (it) {
        if ((it.title + " " + (it.content || "")).toLowerCase().indexOf(kw) >= 0) kjRes.push({ h: it.title, s: it.content || "", m: k.title });
      });
    });
    if (kjRes.length) {
      total += kjRes.length;
      html += '<div class="res-group"><h4>🧠 口诀（' + kjRes.length + '）</h4>';
      kjRes.slice(0, 20).forEach(function (r) {
        html += '<div class="result-item"><div class="h">' + hl(r.h, kw) + '</div><div class="s">' + hl(r.s, kw) + '</div><div class="m">' + esc(r.m) + '</div></div>';
      });
      html += '</div>';
    }

    if (!total) html += '<div class="empty"><div class="big">🔍</div><p>未找到相关内容，换个关键词试试</p></div>';
    html += '</div>';
    el("page-search").innerHTML = html;
  };

  App.jumpQuiz = function (id) {
    var list = Data.questions;
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) { idx = i; break; }
    if (idx < 0) return;
    quiz = { mode: "practice", list: [list[idx]], idx: 0, answers: [], graded: [], source: "搜索跳转" };
    App.go("quiz");
  };

  function hl(text, kw) {
    var s = esc(text);
    var idx = s.toLowerCase().indexOf(kw.toLowerCase());
    if (idx < 0) return s;
    return s.slice(0, idx) + '<span class="hl">' + s.slice(idx, idx + kw.length) + '</span>' + s.slice(idx + kw.length);
  }

  /* ---------- 弹层 ---------- */
  App.showModal = function (title, body) {
    el("modalTitle").innerHTML = title;
    el("modalBody").innerHTML = body;
    el("overlay").classList.add("show");
  };
  App.closeModal = function () { el("overlay").classList.remove("show"); };
  el("overlay").addEventListener("click", function (e) { if (e.target === el("overlay")) App.closeModal(); });

  /* ---------- 启动 ---------- */
  App.go("home");
})();
