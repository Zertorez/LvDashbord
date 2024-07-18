document.getElementById('register-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    const bitrixId = document.getElementById('bitrix-id').value;

    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login, password, bitrixId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = 'login.html';
        } else {
            alert('Ошибка регистрации');
        }
    })
    .catch(error => console.error('Error:', error));
});
