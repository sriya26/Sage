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

function renderEntry(entry) {
  document.getElementById('entry-date').textContent = formatDate(entry.date);
  document.getElementById('entry-text').textContent = entry.entry;

  const badge = document.getElementById('entry-emotion');
  badge.textContent = entry.emotion;
  badge.classList.add('emotion-' + entry.emotion.toLowerCase());

  if (entry.image) {
    const imgEl = document.createElement('img');
    imgEl.src = entry.image;
    imgEl.className = 'entry-attached-img';
    imgEl.alt = 'Attached photo';
    const box = document.querySelector('.entry-box');
    box.parentNode.insertBefore(imgEl, box);
  }

  if (entry.bookmarked) {
    const bm = document.createElement('span');
    bm.className = 'bookmark-badge';
    bm.textContent = '🔖 Bookmarked';
    document.querySelector('.emotion-row').appendChild(bm);
  }

  document.getElementById('delete-entry-btn').addEventListener('click', async () => {
    const ok = await showConfirm();
    if (!ok) return;
    const email = localStorage.getItem('user_email');
    try {
      const res = await fetch('http://localhost:5001/delete_entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entry._id, email }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('selected_entry');
        window.location.href = 'journey.html';
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const raw = localStorage.getItem('selected_entry');
  if (!raw) {
    window.location.href = 'journey.html';
    return;
  }

  const stub = JSON.parse(raw);
  const email = localStorage.getItem('user_email');

  // Render immediately from stub (no image), then enrich with full entry from server
  renderEntry(stub);

  fetch('http://localhost:5001/get_entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry_id: stub._id, email }),
  })
    .then(r => r.json())
    .then(full => {
      if (full.image && !document.querySelector('.entry-attached-img')) {
        const imgEl = document.createElement('img');
        imgEl.src = full.image;
        imgEl.className = 'entry-attached-img';
        imgEl.alt = 'Attached photo';
        const box = document.querySelector('.entry-box');
        box.parentNode.insertBefore(imgEl, box);
      }
    })
    .catch(() => {});
});
