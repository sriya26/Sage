const EMOTION_COLOR = {
  joy:      '#7ddc7a',
  surprise: '#f1c40f',
  neutral:  '#90b4ce',
  sadness:  '#f39c12',
  fear:     '#e74c3c',
  disgust:  '#e67e22',
  anger:    '#e74c3c',
};

document.addEventListener('DOMContentLoaded', () => {
  const userEmail = localStorage.getItem('user_email');
  if (!userEmail) { window.location.href = '../index.html'; return; }

  fetch('http://localhost:5001/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail }),
  })
    .then(r => r.json())
    .then(data => {
      renderProfile(data);
      renderStats(data.stats);
      renderDonut(data.stats);
      renderRecentEntries(data.recent_entries);
    })
    .catch(err => console.error('Profile load error:', err));
});

function renderProfile({ name, email, gender, picture }) {
  const avatar = document.getElementById('avatar');
  if (picture) {
    const img = document.createElement('img');
    img.src = picture;
    avatar.appendChild(img);
  } else {
    avatar.textContent = (name || '?')[0].toUpperCase();
  }

  document.getElementById('profile-name').textContent = name || '—';
  document.getElementById('profile-email').textContent = email || '—';
  const genderEl = document.getElementById('profile-gender');
  if (gender) genderEl.textContent = gender;
  else genderEl.style.display = 'none';
}

function renderStats({ total, this_month, streak, dominant_emotion }) {
  document.getElementById('stat-total').textContent  = total ?? '—';
  document.getElementById('stat-month').textContent  = this_month ?? '—';
  document.getElementById('stat-streak').textContent = streak ? streak + (streak === 1 ? ' day' : ' days') : '—';

  const emotionEl = document.getElementById('stat-emotion');
  emotionEl.textContent = dominant_emotion
    ? dominant_emotion.charAt(0).toUpperCase() + dominant_emotion.slice(1)
    : '—';
  if (dominant_emotion) {
    emotionEl.style.color = EMOTION_COLOR[dominant_emotion] ?? '#254e72';
  }
}

function renderDonut({ emotion_counts, dominant_emotion }) {
  if (!emotion_counts || !Object.keys(emotion_counts).length) return;

  const labels  = Object.keys(emotion_counts).map(e => e.charAt(0).toUpperCase() + e.slice(1));
  const values  = Object.values(emotion_counts);
  const colors  = Object.keys(emotion_counts).map(e => EMOTION_COLOR[e] ?? '#ccc');

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: { left, top, width, height } } = chart;
      const cx = left + width / 2;
      const cy = top + height / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "600 15px 'Montserrat', sans-serif";
      ctx.fillStyle = '#254e72';
      ctx.fillText(
        dominant_emotion
          ? dominant_emotion.charAt(0).toUpperCase() + dominant_emotion.slice(1)
          : '',
        cx, cy - 9
      );
      ctx.font = "11px 'Montserrat', sans-serif";
      ctx.globalAlpha = 0.55;
      ctx.fillText('top mood', cx, cy + 10);
      ctx.restore();
    },
  };

  Chart.defaults.font.family = "'Montserrat', sans-serif";
  Chart.defaults.color = '#254e72';

  new Chart(document.getElementById('emotionDonut').getContext('2d'), {
    type: 'doughnut',
    plugins: [centerTextPlugin],
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6,
      }],
    },
    options: {
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 14, boxWidth: 12, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed} ${ctx.parsed === 1 ? 'entry' : 'entries'}`,
          },
        },
      },
    },
  });
}

function renderRecentEntries(entries) {
  const container = document.getElementById('recent-entries');
  if (!entries || !entries.length) {
    container.innerHTML = '<p style="color:#6b8caa;font-size:13px;">No entries yet.</p>';
    return;
  }

  entries.forEach(entry => {
    const em = (entry.emotion || 'neutral').toLowerCase();
    const row = document.createElement('div');
    row.className = 'recent-entry';
    row.innerHTML = `
      <div class="entry-meta">
        <span class="entry-date-label">${entry.date ? entry.date.slice(0, 10) : ''}</span>
        <span class="entry-preview-text">${entry.entry || ''}</span>
      </div>
      <span class="emotion-pill pill-${em}">${em}</span>
    `;
    row.addEventListener('click', () => {
      localStorage.setItem('selected_entry', JSON.stringify(entry));
      window.location.href = '../journey/entry-detail.html';
    });
    container.appendChild(row);
  });
}