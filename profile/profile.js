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
      renderBookmarkedEntries(data.bookmarked_entries);
      initSettings(data);
    })
    .catch(err => console.error('Profile load error:', err));
});

function initSettings({ name, email, picture }) {
  const toggle      = document.getElementById('settings-toggle');
  const panel       = document.getElementById('settings-section');
  const nameInput   = document.getElementById('settings-name');
  const emailInput  = document.getElementById('settings-email');
  const picInput    = document.getElementById('pic-input');
  const saveBtn     = document.getElementById('save-settings-btn');
  const feedback    = document.getElementById('save-feedback');
  const signoutBtn  = document.getElementById('signout-btn');
  const settingsAv  = document.getElementById('settings-avatar');

  // Populate fields
  nameInput.value  = name  || '';
  emailInput.value = email || '';

  // Mirror avatar into settings panel
  if (picture) {
    const img = document.createElement('img');
    img.src = picture;
    settingsAv.appendChild(img);
  } else {
    settingsAv.textContent = (name || '?')[0].toUpperCase();
  }

  // Toggle settings panel
  toggle.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('open');
    toggle.classList.toggle('active', isOpen);
  });

  // Preview new photo locally before upload
  picInput.addEventListener('change', () => {
    const file = picInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      settingsAv.innerHTML = '';
      const img = document.createElement('img');
      img.src = e.target.result;
      settingsAv.appendChild(img);
      // Also update main avatar preview
      const mainAv = document.getElementById('avatar');
      mainAv.innerHTML = '';
      const img2 = document.createElement('img');
      img2.src = e.target.result;
      mainAv.appendChild(img2);
    };
    reader.readAsDataURL(file);
  });

  // Save changes
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    feedback.textContent = '';

    const formData = new FormData();
    formData.append('email', email);

    const newName = nameInput.value.trim();
    if (newName && newName !== name) formData.append('name', newName);
    if (picInput.files[0]) formData.append('picture', picInput.files[0]);

    try {
      const res  = await fetch('http://localhost:5001/update_profile', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        feedback.textContent = '✓ Saved successfully';
        if (newName) {
          document.getElementById('profile-name').textContent = newName;
          const mainAv = document.getElementById('avatar');
          if (!mainAv.querySelector('img')) mainAv.textContent = newName[0].toUpperCase();
        }
      } else {
        feedback.style.color = '#c0392b';
        feedback.textContent = 'Something went wrong.';
      }
    } catch {
      feedback.style.color = '#c0392b';
      feedback.textContent = 'Could not reach server.';
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Sign out
  signoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user_email');
    window.location.href = '../index.html';
  });
}

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
        <span class="entry-date-label">${formatDate(entry.date)}</span>
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

function renderBookmarkedEntries(entries) {
  const container = document.getElementById('bookmarked-entries');
  if (!entries || !entries.length) {
    container.innerHTML = '<p style="color:#6b8caa;font-size:13px;">No saved entries yet. Tap the bookmark icon while writing to save an entry.</p>';
    return;
  }

  entries.forEach(entry => {
    const em = (entry.emotion || 'neutral').toLowerCase();
    const row = document.createElement('div');
    row.className = 'recent-entry';
    row.innerHTML = `
      <div class="entry-meta">
        <span class="entry-date-label">${formatDate(entry.date)}</span>
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