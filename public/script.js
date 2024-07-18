document.addEventListener('DOMContentLoaded', function () {
    const dateFilter = {
        startDate: null,
        endDate: null
    };

    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 0));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));

    document.getElementById('start-date').value = startOfWeek.toISOString().split('T')[0];
    document.getElementById('end-date').value = endOfWeek.toISOString().split('T')[0];

    document.getElementById('search-button').addEventListener('click', function () {
        const startDateInput = document.getElementById('start-date').value;
        const endDateInput = document.getElementById('end-date').value;

        if (startDateInput && endDateInput) {
            dateFilter.startDate = new Date(startDateInput).toISOString().split('T')[0];
            dateFilter.endDate = new Date(endDateInput).toISOString().split('T')[0];
            console.log("Fetching employees...");
            fetchEmployees();
        } else {
            alert('Пожалуйста, выберите обе даты.');
        }
    });

    document.getElementById('login-button').addEventListener('click', function () {
        window.location.href = 'login.html';
    });

    function loadCities() {
        fetch('/api/cities')
            .then(response => response.json())
            .then(data => {
                const citySelector = document.getElementById('city-selector');
                citySelector.innerHTML = '';
                data.cities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    option.textContent = city;
                    citySelector.appendChild(option);
                });
            })
            .catch(error => console.error('Error loading cities:', error));
    }

    async function fetchEmployees() {
        showLoader();
        try {
            const city = document.getElementById('city-selector').value;
            console.log(`Selected city: ${city}`);
            const response = await fetch(`/api/employees?city=${city}`);
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            const employees = await response.json();
            console.log("Employees fetched:", employees);

            const today = new Date().toISOString().split('T')[0];

            for (const employee of employees) {
                console.log(`Fetching turnover and photo for user ${employee.ID}`);
                const turnoverResponse = await fetch(`/api/getUserTurnover/${employee.ID}/${dateFilter.startDate}/${dateFilter.endDate}`);
                if (turnoverResponse.ok) {
                    const turnoverData = await turnoverResponse.json();
                    employee.turnover = turnoverData ? turnoverData.turnover : 0;
                    console.log(`Turnover for user ${employee.ID}: ${employee.turnover}`);
                } else {
                    employee.turnover = 0;
                    console.error(`Error fetching turnover for user ${employee.ID}: ${turnoverResponse.statusText}`);
                }

                const photoResponse = await fetch(`/api/getUserPhoto/${employee.ID}`);
                if (photoResponse.ok) {
                    const photoData = await photoResponse.json();
                    employee.photo = photoData ? photoData.photo_url : 'https://via.placeholder.com/150';
                    console.log(`Photo URL for user ${employee.ID}: ${employee.photo}`);
                } else {
                    employee.photo = 'https://via.placeholder.com/150';
                    console.error(`Error fetching photo for user ${employee.ID}: ${photoResponse.statusText}`);
                }
            }

            await displayEmployees(employees);
        } catch (error) {
            console.error('Error fetching employee data:', error);
        } finally {
            hideLoader();
        }
    }

    async function displayEmployees(employees) {
        const dashboard = document.getElementById('employee-dashboard');
        while (dashboard.firstChild) {
            dashboard.removeChild(dashboard.firstChild);
        }

        if (!employees || !Array.isArray(employees)) {
            throw new Error('Invalid data format');
        }

        const excludedIds = ["7749", "16311", "395"];
        const processedEmployeeIds = new Set();

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        async function processEmployees() {
            let totalDealsProcessed = 0;
            const processedEmployees = [];

            for (const employee of employees) {
                if (employee.ACTIVE && !excludedIds.includes(employee.ID) && !processedEmployeeIds.has(employee.ID)) {
                    processedEmployeeIds.add(employee.ID);

                    const response = await fetch(`/api/deals/success?userId=${employee.ID}&startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}`);
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                    const dealsData = await response.json();

                    let totalOpportunity = 0;
                    let bestDeal = { amount: 0, title: "N/A", id: null };
                    let worstDeal = { amount: Infinity, title: "N/A", id: null };
                    const processedDealIds = new Set();

                    dealsData.forEach(deal => {
                        if (!processedDealIds.has(deal.ID)) {
                            processedDealIds.add(deal.ID);

                            const amount = parseFloat(deal.OPPORTUNITY);
                            totalOpportunity += amount;

                            if (amount > bestDeal.amount) {
                                bestDeal = { amount, title: deal.TITLE, id: deal.ID };
                            }
                            if (amount < worstDeal.amount) {
                                worstDeal = { amount, title: deal.TITLE, id: deal.ID };
                            }
                        }
                    });

                    totalDealsProcessed += processedDealIds.size;

                    if (totalOpportunity > 0) {
                        processedEmployees.push({
                            id: employee.ID,
                            name: `${employee.NAME} ${employee.LAST_NAME}`,
                            opportunity: totalOpportunity,
                            photo: employee.photo,
                            position: employee.WORK_POSITION,
                            phone: employee.PERSONAL_MOBILE,
                            email: employee.EMAIL,
                            bestDeal,
                            worstDeal: (bestDeal.id !== worstDeal.id) ? worstDeal : { amount: 0, title: "N/A", id: null }
                        });
                    }

                    await delay(500);
                }
            }

            processedEmployees.sort((a, b) => b.opportunity - a.opportunity);

            processedEmployees.forEach((employee, index) => {
                const employeeDiv = document.createElement('div');
                employeeDiv.className = 'employee';
                employeeDiv.innerHTML = `
                <div class="employee-header">
                    <div style="display: flex; align-items: center;">
                        <span class="employee-number">${index + 1}</span>
                        <img src="${employee.photo}" alt="${employee.name}" class="employee-photo" />
                        <button class="thank-button">Поблагодарить</button>
                    </div>
                    <div style="flex-grow: 1;">
                        <span class="name">${employee.name}</span>
                        <span class="earnings">${employee.opportunity.toFixed(2)}</span>
                    </div>
                </div>
                <div class="employee-details">
                    <div class="contact-info">
                        <p>Телефон: ${employee.phone || 'N/A'}</p>
                        <p>Email: ${employee.email || 'N/A'}</p>
                    </div>
                    <div class="deal-info">
                        <p>Максимальная сделка: ${employee.bestDeal.title} (${employee.bestDeal.amount.toFixed(2)})
                            <a href="https://anlasvegas.bitrix24.ru/crm/deal/details/${employee.bestDeal.id}/" class="crm-button" target="_blank">Показать в CRM</a>
                        </p>
                        <p>Минимальная сделка: ${employee.worstDeal.title} (${employee.worstDeal.amount.toFixed(2)})
                            <a href="https://anlasvegas.bitrix24.ru/crm/deal/details/${employee.worstDeal.id}/" class="crm-button" target="_blank">Показать в CRM</a>
                        </p>
                    </div>
                </div>
                `;

                if (index === 0) {
                    employeeDiv.querySelector('.employee-number').innerHTML = '<img src="/photo/The_Gold_Cup.png" alt="Gold Cup" class="trophy-icon" />';
                } else if (index === 1) {
                    employeeDiv.querySelector('.employee-number').innerHTML = '<img src="/photo/Silver_Cup.png" alt="Silver Cup" class="trophy-icon" />';
                } else if (index === 2) {
                    employeeDiv.querySelector('.employee-number').innerHTML = '<img src="/photo/The_Bronze_Cup.png" alt="Bronze Cup" class="trophy-icon" />';
                }

                employeeDiv.addEventListener('click', () => {
                    const details = employeeDiv.querySelector('.employee-details');
                    details.classList.toggle('visible');
                });
                dashboard.appendChild(employeeDiv);
            });

            const totalDealsDiv = document.createElement('div');
            totalDealsDiv.className = 'total-deals';
            totalDealsDiv.innerHTML = `<span class="total-deals-count">Total Deals Processed: ${totalDealsProcessed}</span>`;
            dashboard.appendChild(totalDealsDiv);
        }

        await processEmployees();
    }

    function showLoader() {
        document.getElementById('loader').style.display = 'block';
    }

    function hideLoader() {
        document.getElementById('loader').style.display = 'none';
    }

    loadCities();

    fetch('/api/session')
        .then(response => response.json())
        .then(data => {
            if (data.loggedIn) {
                document.getElementById('login-button').style.display = 'none';
                const profileContainer = document.getElementById('profile-container');
                profileContainer.style.display = 'flex';
                document.getElementById('profile-photo').src = data.user.photo || 'https://via.placeholder.com/150';
                document.getElementById('profile-name').textContent = data.user.name;

                profileContainer.addEventListener('click', () => {
                    window.location.href = `profile.html?login=${data.user.login}`;
                });
            } else {
                document.getElementById('login-button').style.display = 'block';
                document.getElementById('profile-container').style.display = 'none';
            }
        })
        .catch(error => console.error('Error:', error));
});

