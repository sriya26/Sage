// login.js
const authBox = document.getElementById('auth-box');
const formTitle = document.getElementById('form-title');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const messageBox = document.getElementById('message-box');

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = 'message-box show ' + type;
  setTimeout(() => {
    messageBox.classList.remove('show');
  }, 3000);
}

showSignup.addEventListener('click', function(e) {
  e.preventDefault();
  formTitle.textContent = 'Sign Up';
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

showLogin.addEventListener('click', function(e) {
  e.preventDefault();
  formTitle.textContent = 'Welcome!';
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

loginButton.addEventListener('click', function() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    showMessage('Please fill in both email and password.', 'error');
    return;
  }

  fetch('http://localhost:5000/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('user_email', email);
      showMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'journey/journey.html';
      }, 1000);
    } else {
      showMessage('Invalid credentials. Please sign up!', 'error');
      formTitle.textContent = 'Sign Up';
      loginForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
    }
  })
  .catch(err => console.error(err));
});

signupButton.addEventListener('click', function() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  const gender = document.getElementById('signup-gender').value;

  if (!name || !email || !password || !gender) {
    showMessage('Please fill in all required fields.', 'error');
    return;
  }

  const picture = document.getElementById('signup-picture').files[0];

  const formData = new FormData();
  formData.append('name', name);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('gender', gender);
  if (picture) formData.append('picture', picture);

  showMessage('Submitting your details...', 'analysing');

  fetch('http://localhost:5000/signup', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('user_email', email);
      showMessage('Signup successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'journey/journey.html';
      }, 1000);
    } else {
      showMessage('Error signing up. Try again.', 'error');
    }
  })
  .catch(err => console.error(err));
});
