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
            title: (items) => entries[items[0].dataIndex].date.slice(0, 10),
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
  ])
  .then(([moodData, journalData, reportData]) => {
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
        textDiv.textContent = `${entry.date}: ${entry.entry.slice(0, 60)}...`;

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
