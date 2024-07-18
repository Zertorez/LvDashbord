document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;

    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = `profile.html?login=${login}`;
        } else {
            alert('Неверный логин или пароль');
        }
    })
    .catch(error => console.error('Error:', error));
});
