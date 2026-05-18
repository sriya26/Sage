function formatDate(dateStr) {
  if (!dateStr) return '';
  const iso = dateStr.slice(0, 10);
  const parts = iso.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts.map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMOTION_VALENCE = {
  joy:      1.0,
  surprise: 0.5,
  neutral:  0.0,
  sadness: -0.5,
  fear:    -0.75,
  disgust: -1.0,
  anger:   -1.0,
};

const EMOTION_COLOR = {
  joy:      '#7ddc7a',
  surprise: '#f1c40f',
  neutral:  '#90b4ce',
  sadness:  '#f39c12',
  fear:     '#9b59b6',
  disgust:  '#e67e22',
  anger:    '#e74c3c',
};

// ── Greeting ──────────────────────────────────────────────────────────
function updateGreeting(journalData) {
  const now   = new Date();
  const hour  = now.getHours();
  const label = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const today = localDateStr(now);
  const journaledToday = journalData.some(e => e.date && e.date.slice(0, 10) === today);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[now.getDay()];
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  document.getElementById('greeting-eyebrow').textContent = `${dayName} · ${dateLabel}`;
  document.getElementById('greeting-name').textContent    = `${label}.`;
  document.getElementById('greeting-sub').textContent     = journaledToday
    ? 'You\'ve already written today. How are you feeling now?'
    : 'What\'s on your mind today?';
}

// ── Week calendar ─────────────────────────────────────────────────────
let _weekOffset = 0;   // 0 = current week, -1 = last week, +1 = next week
let _calJournalData = [];

function renderWeekCalendar(journalData, offset) {
  if (journalData !== undefined) _calJournalData = journalData;
  if (offset !== undefined) _weekOffset = offset;

  const section = document.getElementById('week-calendar');
  section.classList.remove('hidden');

  const entryMap = {};
  _calJournalData.forEach(e => {
    if (e.date) entryMap[e.date.slice(0, 10)] = e.emotion;
  });

  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff + _weekOffset * 7);

  // Label: week range e.g. "May 12 – 18, 2026"
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const yearLabel = sunday.getFullYear();
  document.getElementById('weekcal-month').textContent =
    `${fmt(monday)} – ${sunday.getDate()}, ${yearLabel}`;

  // Disable next button if we're on current or future week
  const nextBtn = document.getElementById('weekcal-next');
  if (nextBtn) nextBtn.disabled = _weekOffset >= 0;

  const grid = document.getElementById('weekcal-grid');
  grid.innerHTML = '';

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayStr = localDateStr(now);

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = localDateStr(day);
    const emotion = entryMap[dateStr];

    let dotColor = 'transparent';
    if (emotion) {
      const key = emotion.toLowerCase();
      if (key === 'joy' || key === 'surprise')         dotColor = '#7ddc7a';
      else if (key === 'neutral')                       dotColor = '#90b4ce';
      else                                              dotColor = '#f39c12';
    }

    const cell = document.createElement('div');
    cell.className = 'weekday-cell' + (dateStr === todayStr ? ' today' : '');
    cell.innerHTML = `
      <span class="wday">${dayNames[i]}</span>
      <span class="wdate">${day.getDate()}</span>
      <span class="wdot" style="background:${dotColor}"></span>
    `;
    grid.appendChild(cell);
  }
}

// ── Entry list (day-stub format) ──────────────────────────────────────
const _shortDays   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const _shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let _activeFilter = 'all';
let _searchQuery  = '';

function buildEntryEl(entry) {
  const rawDate = entry.date;
  let dayName = '', dayNum = '', monthName = '';

  if (rawDate && typeof rawDate === 'string') {
    const iso = rawDate.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-').map(Number);
      const dateObj   = new Date(y, m - 1, d);
      if (!isNaN(dateObj.getTime())) {
        dayName   = _shortDays[dateObj.getDay()];
        dayNum    = d;
        monthName = _shortMonths[m - 1];
      }
    }
  }
  if (!dayName && rawDate) {
    const dateObj = new Date(rawDate);
    if (!isNaN(dateObj.getTime())) {
      dayName   = _shortDays[dateObj.getDay()];
      dayNum    = dateObj.getDate();
      monthName = _shortMonths[dateObj.getMonth()];
    }
  }

  const emotion = entry.emotion ? entry.emotion.toLowerCase() : 'neutral';
  const color   = EMOTION_COLOR[emotion] ?? '#ccc';
  const snip    = entry.entry.length > 90 ? entry.entry.slice(0, 90) + '…' : entry.entry;

  const el = document.createElement('div');
  el.className = 'entry-new';

  const dayStub = document.createElement('div');
  dayStub.className = 'day-stub';
  dayStub.innerHTML = `<span class="wday-s">${dayName}</span><span class="wdate-s">${dayNum}</span><span class="wmonth-s">${monthName}</span>`;

  const bodyCol = document.createElement('div');
  bodyCol.className = 'entry-body-col';
  if (entry.bookmarked) {
    const bm = document.createElement('span');
    bm.className = 'entry-bookmark-dot';
    bm.title = 'Bookmarked';
    bodyCol.appendChild(bm);
  }
  const snipEl = document.createElement('p');
  snipEl.className = 'entry-snip';
  snipEl.textContent = snip;
  bodyCol.appendChild(snipEl);

  const moodtag = document.createElement('span');
  moodtag.className = 'moodtag';
  moodtag.style.background = color;
  moodtag.textContent = emotion;

  const delBtn = document.createElement('button');
  delBtn.className = 'del-btn';
  delBtn.title = 'Delete entry';
  delBtn.setAttribute('aria-label', 'Delete entry');
  delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
  delBtn.addEventListener('click', async e => {
    e.stopPropagation();
    const ok = await showConfirm();
    if (ok) deleteEntry(entry._id);
  });

  const rightCol = document.createElement('div');
  rightCol.className = 'entry-right';
  rightCol.appendChild(moodtag);
  rightCol.appendChild(delBtn);

  el.appendChild(dayStub);
  el.appendChild(bodyCol);
  el.appendChild(rightCol);

  el.addEventListener('click', () => {
    localStorage.setItem('selected_entry', JSON.stringify(entry));
    window.location.href = 'entry-detail.html';
  });

  return el;
}

function renderFilteredEntries(journalData) {
  const container = document.getElementById('entries-container');
  container.innerHTML = '';
  let filtered = _activeFilter === 'all'
    ? journalData
    : journalData.filter(e => (e.emotion || 'neutral').toLowerCase() === _activeFilter);
  if (_searchQuery) {
    const q = _searchQuery.toLowerCase();
    filtered = filtered.filter(e => (e.entry || '').toLowerCase().includes(q));
  }
  if (!filtered.length) {
    container.innerHTML = '<p style="color:#6b8caa;font-size:13px;padding:8px 2px;">No entries found.</p>';
    return;
  }
  filtered.forEach(entry => container.appendChild(buildEntryEl(entry)));
}

function buildFilterBar(journalData) {
  const bar = document.getElementById('emotion-filter-bar');
  bar.innerHTML = '';

  const emotions = [...new Set(journalData.map(e => (e.emotion || 'neutral').toLowerCase()))];
  if (emotions.length < 2) return;

  const chips = [{ key: 'all', label: 'All' }, ...emotions.map(em => ({
    key: em,
    label: em.charAt(0).toUpperCase() + em.slice(1),
  }))];

  chips.forEach(({ key, label }) => {
    const btn = document.createElement('button');
    btn.className = 'filter-chip' + (key === _activeFilter ? ' active' : '');
    if (key !== 'all') btn.style.setProperty('--chip-color', EMOTION_COLOR[key] ?? '#90b4ce');

    if (key !== 'all') {
      const dot = document.createElement('span');
      dot.className = 'filter-dot';
      btn.appendChild(dot);
    }
    btn.appendChild(document.createTextNode(label));

    btn.addEventListener('click', () => {
      _activeFilter = key;
      bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      renderFilteredEntries(journalData);
    });

    bar.appendChild(btn);
  });
}

function renderEntries(journalData) {
  const entriesBlock   = document.getElementById('entries-block');
  const defaultSection = document.getElementById('default-section');

  if (!journalData || !journalData.length) {
    defaultSection.classList.remove('hidden');
    return;
  }

  defaultSection.classList.add('hidden');
  entriesBlock.classList.remove('hidden');
  _activeFilter = 'all';
  _searchQuery  = '';

  buildFilterBar(journalData);
  renderFilteredEntries(journalData);

  const searchInput = document.getElementById('entries-search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = () => {
      _searchQuery = searchInput.value.trim();
      renderFilteredEntries(journalData);
    };
  }
}

// ── Custom confirm ────────────────────────────────────────────────────
function showConfirm() {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirmOverlay');
    overlay.classList.add('open');

    function onConfirm() { cleanup(); resolve(true); }
    function onCancel()  { cleanup(); resolve(false); }

    function cleanup() {
      overlay.classList.remove('open');
      document.getElementById('confirmDelete').removeEventListener('click', onConfirm);
      document.getElementById('confirmCancel').removeEventListener('click', onCancel);
    }

    document.getElementById('confirmDelete').addEventListener('click', onConfirm);
    document.getElementById('confirmCancel').addEventListener('click', onCancel);
  });
}

// ── Delete entry ──────────────────────────────────────────────────────
async function deleteEntry(id) {
  const email = localStorage.getItem('user_email');
  try {
    const res = await fetch('http://localhost:5001/delete_entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: id, email }),
    });
    const data = await res.json();
    if (data.success) window.location.reload();
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// ── Mood chart ────────────────────────────────────────────────────────
function renderMoodChart(entries) {
  if (!entries.length) return;

  const chartSection = document.getElementById('mood-chart-section');
  chartSection.classList.remove('hidden');

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  Chart.defaults.font.family = "'Montserrat', sans-serif";
  Chart.defaults.color = '#254e72';

  const labels = entries.map(e => {
    const d = new Date(e.date);
    return isNaN(d)
      ? e.date
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const scores = entries.map(e => EMOTION_VALENCE[e.emotion.toLowerCase()] ?? 0);
  const colors = entries.map(e => EMOTION_COLOR[e.emotion.toLowerCase()] ?? '#ccc');

  const ctx = document.getElementById('moodChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: scores,
        borderColor: '#254e72',
        backgroundColor: 'rgba(37, 78, 114, 0.07)',
        pointBackgroundColor: colors,
        pointBorderColor: colors,
        pointRadius: 8,
        pointHoverRadius: 10,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => formatDate(entries[items[0].dataIndex].date),
            label: (item)  => '  ' + entries[item.dataIndex].emotion,
          }
        }
      },
      scales: {
        y: {
          min: -1.2,
          max: 1.2,
          ticks: {
            stepSize: 0.5,
            callback: v => ({
              '1':     'Joy',
              '0.5':   'Surprise',
              '0':     'Neutral',
              '-0.5':  'Sadness',
              '-0.75': 'Fear',
              '-1':    'Anger',
            })[String(v)] ?? '',
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
        },
        x: {
          ticks: { maxTicksLimit: 10, maxRotation: 45, font: { size: 11 } },
          grid: { display: false },
        }
      }
    }
  });

  const seen   = new Set();
  const legend = document.getElementById('mood-legend');
  entries.forEach(e => {
    const key = e.emotion.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const dot   = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.backgroundColor = EMOTION_COLOR[key] ?? '#ccc';
    const lbl   = document.createElement('span');
    lbl.className = 'legend-label';
    lbl.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    const item  = document.createElement('div');
    item.className = 'legend-item';
    item.appendChild(dot);
    item.appendChild(lbl);
    legend.appendChild(item);
  });
}

// ── Insights (plist style) ────────────────────────────────────────────
function renderInsights(data) {
  const section   = document.getElementById('insights-section');
  section.classList.remove('hidden');
  const container = document.getElementById('insights-cards');

  if (data.insufficient_data) {
    container.innerHTML = `<p class="insights-empty">Journal for a few more days to unlock your patterns.</p>`;
    return;
  }

  const items = [];

  const pat = data.peak_anxiety_time;
  if (pat) {
    const when = pat.time_of_day ? `${pat.day} ${pat.time_of_day}s` : `${pat.day}s`;
    items.push({
      color: '#6b8caa',
      head:  `Anxiety peaks on ${when}`,
      sub:   `You most often log fear or difficult emotions on ${when}.`,
    });
  }

  const streak = data.longest_low_mood_streak;
  if (streak && streak.length > 1) {
    items.push({
      color: '#f39c12',
      head:  `${streak.length}-day low mood streak`,
      sub:   `Your longest run of difficult emotions in the past 3 months was ${streak.length} days.`,
    });
  }

  const dom = data.dominant_emotion_this_week;
  if (dom) {
    const cap = dom.charAt(0).toUpperCase() + dom.slice(1);
    items.push({
      color: EMOTION_COLOR[dom] ?? '#ccc',
      head:  `${cap} leads this week`,
      sub:   `${cap} has been your most frequent emotion over the last 7 days.`,
    });
  }

  const trend = data.mood_trend;
  if (trend) {
    const map = {
      improving: { color: '#7ddc7a', head: 'Mood is improving',    sub: 'Your average mood score is higher than last week. Keep going.' },
      declining: { color: '#f39c12', head: 'Mood has dipped',      sub: 'Your average mood is lower than last week. Be gentle with yourself.' },
      stable:    { color: '#90b4ce', head: 'Mood has been steady', sub: 'Your emotional tone has been consistent week over week.' },
    };
    items.push(map[trend]);
  }

  if (!items.length) {
    container.innerHTML = `<p class="insights-empty">Keep journaling to unlock your patterns.</p>`;
    return;
  }

  items.forEach(({ color, head, sub }) => {
    const el = document.createElement('div');
    el.className = 'pitem';
    el.innerHTML = `
      <span class="pdot" style="background:${color}"></span>
      <div>
        <div class="phead">${head}</div>
        <p class="psub">${sub}</p>
      </div>
    `;
    container.appendChild(el);
  });
}

// ── Weekly report ─────────────────────────────────────────────────────
function renderWeeklyReport(report) {
  const section = document.getElementById('weekly-report-section');
  section.classList.remove('hidden');

  document.getElementById('report-summary').textContent = report.summary;

  const barsContainer = document.getElementById('report-bars');
  const order = ['joy', 'surprise', 'neutral', 'sadness', 'fear', 'disgust', 'anger'];
  const sorted = Object.entries(report.percentages).sort(
    (a, b) => order.indexOf(a[0]) - order.indexOf(b[0])
  );

  sorted.forEach(([emotion, pct]) => {
    const color = EMOTION_COLOR[emotion] ?? '#ccc';
    const row   = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span class="bar-label">${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%; background:${color};"></div>
      </div>
      <span class="bar-pct">${pct}%</span>
    `;
    barsContainer.appendChild(row);
  });
}

// ── Boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const defaultSection = document.getElementById('default-section');
  const userEmail      = localStorage.getItem('user_email');

  if (!userEmail) {
    window.location.href = '../index.html';
    return;
  }

  // Week calendar prev/next navigation
  document.getElementById('weekcal-prev').addEventListener('click', () => renderWeekCalendar(undefined, _weekOffset - 1));
  document.getElementById('weekcal-next').addEventListener('click', () => renderWeekCalendar(undefined, _weekOffset + 1));

  Promise.all([
    fetch('http://localhost:5001/mood_history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail }),
    }).then(r => r.json()),

    fetch('http://localhost:5001/get_journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail }),
    }).then(r => r.json()),

    fetch('http://localhost:5001/weekly_report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail }),
    }).then(r => r.json()),

    fetch('http://localhost:5001/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail }),
    }).then(r => r.json()),
  ])
  .then(([moodData, journalData, reportData, insightsData]) => {
    const jd = Array.isArray(journalData) ? journalData : [];
    jd.sort((a, b) => new Date(b.date) - new Date(a.date));
    updateGreeting(jd);
    renderWeekCalendar(jd);
    renderEntries(jd);
    renderMoodChart(Array.isArray(moodData) ? moodData : []);
    if (reportData && !reportData.error)   renderWeeklyReport(reportData);
    if (insightsData && !insightsData.error) renderInsights(insightsData);
  })
  .catch(err => {
    console.error('Error loading data:', err);
    defaultSection.classList.remove('hidden');
    updateGreeting([]);
    renderWeekCalendar([]);
  });
});