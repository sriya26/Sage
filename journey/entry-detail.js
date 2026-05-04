document.addEventListener('DOMContentLoaded', function () {
  const raw = localStorage.getItem('selected_entry');
  if (!raw) {
    window.location.href = 'journey.html';
    return;
  }

  const entry = JSON.parse(raw);

  document.getElementById('entry-date').textContent = entry.date.slice(0, 10);
  document.getElementById('entry-text').textContent = entry.entry;

  const badge = document.getElementById('entry-emotion');
  badge.textContent = entry.emotion;
  badge.classList.add('emotion-' + entry.emotion.toLowerCase());
});
