document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const login = urlParams.get('login');

    fetch(`/api/profile?login=${login}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('profile-photo').src = data.photo || 'https://via.placeholder.com/150';
            document.getElementById('profile-name').textContent = data.name;
            document.getElementById('profile-lastname').textContent = data.lastname;
            document.getElementById('profile-phone').textContent = data.phone;
            document.getElementById('profile-email').textContent = data.email;
        })
        .catch(error => console.error('Error:', error));
});
