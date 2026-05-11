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

function renderMoodChart(entries) {
  if (!entries.length) return;

  const chartSection = document.getElementById('mood-chart-section');
  chartSection.classList.remove('hidden');

  // Sort oldest → newest so x-axis runs left to right
  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  Chart.defaults.font.family = "'Montserrat', sans-serif";
  Chart.defaults.color = '#254e72';

  const labels = entries.map(e => {
    const d = new Date(e.date);
    return isNaN(d)
      ? e.date
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const scores  = entries.map(e => EMOTION_VALENCE[e.emotion.toLowerCase()] ?? 0);
  const colors  = entries.map(e => EMOTION_COLOR[e.emotion.toLowerCase()] ?? '#ccc');

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
          ticks: {
            maxTicksLimit: 10,
            maxRotation: 45,
            font: { size: 11 },
          },
          grid: { display: false },
        }
      }
    }
  });

  // Render legend
  const seen = new Set();
  const legend = document.getElementById('mood-legend');
  entries.forEach(e => {
    const key = e.emotion.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.backgroundColor = EMOTION_COLOR[key] ?? '#ccc';
    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.appendChild(dot);
    item.appendChild(label);
    legend.appendChild(item);
  });
}

const INSIGHT_ICONS = {
  clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24"><path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 16.25"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="17" x2="12" y2="19"/><line x1="16" y1="19" x2="16" y2="21"/></svg>`,
  star:  `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  up:    `<svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  down:  `<svg viewBox="0 0 24 24"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>`,
  flat:  `<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="15 8 19 12 15 16"/></svg>`,
};

function renderInsights(data) {
  const section = document.getElementById('insights-section');
  section.classList.remove('hidden');
  const container = document.getElementById('insights-cards');

  if (data.insufficient_data) {
    container.innerHTML = `<p class="insights-empty">Journal for a few more days to unlock your patterns.</p>`;
    return;
  }

  const cards = [];

  // Peak anxiety time
  const pat = data.peak_anxiety_time;
  if (pat) {
    const when = pat.time_of_day ? `${pat.day} ${pat.time_of_day}s` : `${pat.day}s`;
    cards.push({
      icon: INSIGHT_ICONS.clock,
      headline: `Anxiety peaks on ${when}`,
      detail: `You most often log fear or difficult emotions on ${when}.`,
    });
  }

  // Longest low mood streak
  const streak = data.longest_low_mood_streak;
  if (streak && streak.length > 1) {
    cards.push({
      icon: INSIGHT_ICONS.cloud,
      headline: `${streak.length}-day low mood streak`,
      detail: `Your longest run of difficult emotions in the past 3 months was ${streak.length} days.`,
    });
  }

  // Dominant emotion this week
  const dom = data.dominant_emotion_this_week;
  if (dom) {
    const cap = dom.charAt(0).toUpperCase() + dom.slice(1);
    cards.push({
      icon: INSIGHT_ICONS.star,
      headline: `${cap} leads this week`,
      detail: `${cap} has been your most frequent emotion over the last 7 days.`,
    });
  }

  // Mood trend
  const trend = data.mood_trend;
  if (trend) {
    const map = {
      improving: { icon: INSIGHT_ICONS.up,   headline: 'Mood is improving',   detail: 'Your average mood score is higher than last week. Keep going.' },
      declining: { icon: INSIGHT_ICONS.down,  headline: 'Mood has dipped',     detail: 'Your average mood is lower than last week. Be gentle with yourself.' },
      stable:    { icon: INSIGHT_ICONS.flat,  headline: 'Mood has been steady', detail: 'Your emotional tone has been consistent week over week.' },
    };
    cards.push(map[trend]);
  }

  if (!cards.length) {
    container.innerHTML = `<p class="insights-empty">Keep journaling to unlock your patterns.</p>`;
    return;
  }

  cards.forEach(({ icon, headline, detail }) => {
    const el = document.createElement('div');
    el.className = 'insight-card';
    el.innerHTML = `
      <div class="insight-icon-wrap">${icon}</div>
      <div class="insight-headline">${headline}</div>
      <p class="insight-detail">${detail}</p>
    `;
    container.appendChild(el);
  });
}

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
    const row = document.createElement('div');
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

document.addEventListener('DOMContentLoaded', function () {
  const entriesContainer = document.getElementById('entries-container');
  const defaultSection   = document.getElementById('default-section');
  const userEmail        = localStorage.getItem('user_email');

  if (!userEmail) {
    window.location.href = '../index.html';
    return;
  }

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
    if (insightsData && !insightsData.error) renderInsights(insightsData);
    renderMoodChart(Array.isArray(moodData) ? moodData : []);
    if (reportData && !reportData.error) renderWeeklyReport(reportData);

    if (journalData && journalData.length > 0) {
      defaultSection.classList.add('hidden');

      const layoutWrapper = document.createElement('div');
      layoutWrapper.className = 'entries-illustration-wrapper';

      const entriesWrapper = document.createElement('div');
      entriesWrapper.className = 'entries-wrapper';

      journalData.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry-box';

        const textDiv = document.createElement('div');
        textDiv.className = 'entry-preview';
        textDiv.textContent = `${formatDate(entry.date)}: ${entry.entry.slice(0, 60)}...`;

        const emotionDiv = document.createElement('div');
        emotionDiv.className = 'emotion-badge';
        emotionDiv.textContent = entry.emotion;

        switch (entry.emotion.toLowerCase()) {
          case 'joy':     emotionDiv.classList.add('emotion-joy');      break;
          case 'sadness': emotionDiv.classList.add('emotion-sadness');  break;
          case 'anger':
          case 'fear':    emotionDiv.classList.add('emotion-anger');    break;
          case 'surprise':emotionDiv.classList.add('emotion-surprise'); break;
          default:        emotionDiv.style.backgroundColor = '#ccc';
        }

        entryDiv.style.cursor = 'pointer';
        entryDiv.addEventListener('click', () => {
          localStorage.setItem('selected_entry', JSON.stringify(entry));
          window.location.href = 'entry-detail.html';
        });

        entryDiv.appendChild(textDiv);
        entryDiv.appendChild(emotionDiv);
        entriesWrapper.appendChild(entryDiv);
      });

      layoutWrapper.appendChild(entriesWrapper);

      const imageSection = document.createElement('div');
      imageSection.className = 'illustration-right';
      imageSection.innerHTML = `
        <img src="../assets/meditation.png" alt="Meditation" class="main-image">
        <p class="caption">Start your journey</p>
      `;
      layoutWrapper.appendChild(imageSection);
      entriesContainer.appendChild(layoutWrapper);
      entriesContainer.classList.remove('hidden');
    } else {
      defaultSection.classList.remove('hidden');
    }
  })
  .catch(err => {
    console.error('Error loading data:', err);
    defaultSection.classList.remove('hidden');
  });
});
