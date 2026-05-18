// login.js
const authBox    = document.getElementById('auth-box');
const formTitle  = document.getElementById('form-title');
const loginForm  = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const resetForm  = document.getElementById('reset-form');
const showSignup = document.getElementById('show-signup');
const showLogin  = document.getElementById('show-login');
const loginButton  = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const messageBox   = document.getElementById('message-box');

function showForm(form, title) {
  [loginForm, signupForm, resetForm].forEach(f => f.classList.add('hidden'));
  form.classList.remove('hidden');
  formTitle.textContent = title;
}

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = 'message-box show ' + type;
  setTimeout(() => {
    messageBox.classList.remove('show');
  }, 3000);
}

showSignup.addEventListener('click', function(e) {
  e.preventDefault();
  showForm(signupForm, 'Sign Up');
});

showLogin.addEventListener('click', function(e) {
  e.preventDefault();
  showForm(loginForm, 'Welcome Back!');
});

document.getElementById('show-reset').addEventListener('click', function(e) {
  e.preventDefault();
  showForm(resetForm, 'Reset Password');
});

document.getElementById('show-login-from-reset').addEventListener('click', function(e) {
  e.preventDefault();
  showForm(loginForm, 'Welcome Back!');
});

document.getElementById('reset-button').addEventListener('click', function() {
  const email       = document.getElementById('reset-email').value.trim();
  const newPassword = document.getElementById('reset-password').value.trim();

  if (!email || !newPassword) {
    showMessage('Please enter your email and a new password.', 'error');
    return;
  }

  fetch('http://localhost:5001/reset_password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, new_password: newPassword }),
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showMessage('Password reset! Please log in.', 'success');
      setTimeout(() => showForm(loginForm, 'Welcome Back!'), 1500);
    } else {
      showMessage(data.error || 'No account found with that email.', 'error');
    }
  })
  .catch(err => console.error(err));
});

loginButton.addEventListener('click', function() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    showMessage('Please fill in both email and password.', 'error');
    return;
  }

  fetch('http://localhost:5001/login', {
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

  fetch('http://localhost:5001/signup', {
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
