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

document.addEventListener('DOMContentLoaded', function () {
  const raw = localStorage.getItem('selected_entry');
  if (!raw) {
    window.location.href = 'journey.html';
    return;
  }

  const entry = JSON.parse(raw);

  document.getElementById('entry-date').textContent = formatDate(entry.date);
  document.getElementById('entry-text').textContent = entry.entry;

  const badge = document.getElementById('entry-emotion');
  badge.textContent = entry.emotion;
  badge.classList.add('emotion-' + entry.emotion.toLowerCase());
});
