document.addEventListener('DOMContentLoaded', function () {
  const entriesContainer = document.getElementById('entries-container');
  const defaultSection = document.getElementById('default-section');
  const userEmail = localStorage.getItem('user_email');

  if (!userEmail) {
    window.location.href = '../index.html';
    return;
  }

  fetch('http://localhost:5000/get_journals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail })
  })
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        defaultSection.classList.add('hidden');

        const layoutWrapper = document.createElement('div');
        layoutWrapper.className = 'entries-illustration-wrapper';

        const entriesWrapper = document.createElement('div');
        entriesWrapper.className = 'entries-wrapper';

        data.forEach(entry => {
          const entryDiv = document.createElement('div');
          entryDiv.className = 'entry-box';

          const textDiv = document.createElement('div');
          textDiv.className = 'entry-preview';
          textDiv.textContent = `${entry.date}: ${entry.entry.slice(0, 60)}...`;

          const emotionDiv = document.createElement('div');
          emotionDiv.className = 'emotion-badge';
          emotionDiv.textContent = entry.emotion;

          switch (entry.emotion.toLowerCase()) {
            case 'joy':
              emotionDiv.classList.add('emotion-joy');
              break;
            case 'sadness':
              emotionDiv.classList.add('emotion-sadness');
              break;
            case 'anger':
            case 'fear':
              emotionDiv.classList.add('emotion-anger');
              break;
            case 'surprise':
              emotionDiv.classList.add('emotion-surprise');
              break;
            default:
              emotionDiv.style.backgroundColor = '#ccc';
          }

          entryDiv.appendChild(textDiv);
          entryDiv.appendChild(emotionDiv);
          entriesWrapper.appendChild(entryDiv);
        });

        // Add entries to the left side
        layoutWrapper.appendChild(entriesWrapper);

        // Add image + caption to right side
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
      console.error('Error fetching journals:', err);
      defaultSection.classList.remove('hidden');
    });
});
