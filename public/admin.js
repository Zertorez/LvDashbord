document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const adminSection = document.getElementById('admin-section');
    const loginSection = document.getElementById('login-section');
    const citySelector = document.getElementById('city-selector');
    const departmentIdsInput = document.getElementById('department-ids-input');
    const saveDepartmentsButton = document.getElementById('save-departments-button');
    const exceptionIdsInput = document.getElementById('exception-ids-input');
    const saveExceptionsButton = document.getElementById('save-exceptions-button');

    const newCityInput = document.getElementById('new-city-input');
    const newDepartmentIdsInput = document.getElementById('new-department-ids-input');
    const addCityButton = document.getElementById('add-city-button');
    const deleteCitySelector = document.getElementById('delete-city-selector');
    const deleteCityButton = document.getElementById('delete-city-button');
    const newAdminLogin = document.getElementById('new-admin-login');
    const newAdminPassword = document.getElementById('new-admin-password');
    const addAdminButton = document.getElementById('add-admin-button');
    const deleteAdminLogin = document.getElementById('delete-admin-login');
    const deleteAdminButton = document.getElementById('delete-admin-button');

    let isAdmin = false;

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const login = document.getElementById('admin-login').value;
        const password = document.getElementById('admin-password').value;

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
                    isAdmin = data.isAdmin;
                    loginSection.style.display = 'none';
                    adminSection.style.display = 'block';
                    loadCities();
                } else {
                    alert('Неверные учетные данные');
                }
            })
            .catch(error => console.error('Error during login:', error));
    });

    function loadCities() {
        fetch('/api/cities')
            .then(response => response.json())
            .then(data => {
                citySelector.innerHTML = '';
                deleteCitySelector.innerHTML = '';
                data.cities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    option.textContent = city;
                    citySelector.appendChild(option);

                    const deleteOption = document.createElement('option');
                    deleteOption.value = city;
                    deleteOption.textContent = city;
                    deleteCitySelector.appendChild(deleteOption);
                });
                citySelector.dispatchEvent(new Event('change'));
            })
            .catch(error => console.error('Error loading cities:', error));
    }

    citySelector.addEventListener('change', function () {
        const city = citySelector.value;
        fetch(`/api/departments?city=${city}`)
            .then(response => response.json())
            .then(data => {
                if (data.departmentIds) {
                    departmentIdsInput.value = data.departmentIds.join(', ');
                } else {
                    departmentIdsInput.value = '';
                }
            })
            .catch(error => console.error('Error fetching department IDs:', error));
    });

    saveDepartmentsButton.addEventListener('click', function () {
        const city = citySelector.value;
        const departmentIds = departmentIdsInput.value.split(',').map(id => id.trim());

        fetch('/api/departments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ city, departmentIds })
        })
            .then(response => response.json())
            .then(data => alert(data.message))
            .catch(error => console.error('Error updating department IDs:', error));
    });

    saveExceptionsButton.addEventListener('click', function () {
        const exceptionIds = exceptionIdsInput.value.split(',').map(id => id.trim());

        fetch('/api/exceptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ exceptionIds })
        })
            .then(response => response.json())
            .then(data => alert(data.message))
            .catch(error => console.error('Error updating exception IDs:', error));
    });

    addCityButton.addEventListener('click', function () {
        const city = newCityInput.value.trim();
        const departmentIds = newDepartmentIdsInput.value.split(',').map(id => id.trim());

        if (city && departmentIds.length > 0) {
            fetch('/api/cities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ city, departmentIds })
            })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    loadCities();
                })
                .catch(error => console.error('Error adding new city:', error));
        } else {
            alert('Please enter valid city name and department IDs.');
        }
    });

    deleteCityButton.addEventListener('click', function () {
        const city = deleteCitySelector.value;

        if (city) {
            fetch('/api/cities', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ city })
            })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    loadCities();
                })
                .catch(error => console.error('Error deleting city:', error));
        } else {
            alert('Please select a city to delete.');
        }
    });

    addAdminButton.addEventListener('click', function () {
        if (isAdmin) {
            const login = newAdminLogin.value.trim();
            const password = newAdminPassword.value.trim();
            const superAdminLogin = prompt('Введите логин супер администратора:');
            const superAdminPassword = prompt('Введите пароль супер администратора:');

            if (login && password && superAdminLogin && superAdminPassword) {
                fetch('/api/admins', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ login, password, superAdminLogin, superAdminPassword })
                })
                    .then(response => response.json())
                    .then(data => alert(data.message))
                    .catch(error => console.error('Error adding admin:', error));
            } else {
                alert('Please enter valid login, password, super admin login and super admin password.');
            }
        } else {
            alert('You do not have permission to add a new admin.');
        }
    });

    deleteAdminButton.addEventListener('click', function () {
        if (isAdmin) {
            const login = deleteAdminLogin.value.trim();
            const superAdminLogin = prompt('Введите логин супер администратора:');
            const superAdminPassword = prompt('Введите пароль супер администратора:');

            if (login && superAdminLogin && superAdminPassword) {
                fetch('/api/admins', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ login, superAdminLogin, superAdminPassword })
                })
                    .then(response => response.json())
                    .then(data => alert(data.message))
                    .catch(error => console.error('Error deleting admin:', error));
            } else {
                alert('Please enter valid login, super admin login and super admin password.');
            }
        } else {
            alert('You do not have permission to delete an admin.');
        }
    });

    fetch('/api/exceptions')
        .then(response => response.json())
        .then(data => {
            if (data.userExceptionIds) {
                exceptionIdsInput.value = data.userExceptionIds.join(', ');
            }
        })
        .catch(error => console.error('Error fetching user exception IDs:', error));
});
