const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const db = new sqlite3.Database('user_turnover.db');

const EMPLOYEES_WEBHOOK_URL = 'https://anlasvegas.bitrix24.ru/rest/1/dcmwwzrc8za517se/user.get';
const DEALS_WEBHOOK_URL = 'https://anlasvegas.bitrix24.ru/rest/1/dcmwwzrc8za517se/crm.deal.list';

// Departments
const DEPARTMENTS = [478, 33, 3, 5, 154, 204, 156];

async function fetchEmployees(departments) {
    try {
        let employees = [];
        for (const departmentId of departments) {
            console.log(`Fetching employees from department: ${departmentId}`);
            const response = await axios.get(EMPLOYEES_WEBHOOK_URL, {
                params: {
                    'FILTER[UF_DEPARTMENT]': departmentId,
                    'FILTER[ACTIVE]': 'Y'
                }
            });
            console.log('Employees response:', response.data);
            employees = employees.concat(response.data.result);
        }
        return employees;
    } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
    }
}

async function fetchDeals(userId, date) {
    const params = {
        'FILTER[ASSIGNED_BY_ID]': userId,
        'FILTER[STAGE_ID]': ['C54:WON', 'C52:WON'],
        'FILTER[>=CLOSEDATE]': date,
        'FILTER[<=CLOSEDATE]': date
    };
    try {
        console.log(`Fetching deals for user ${userId} on ${date} from: ${DEALS_WEBHOOK_URL}`);
        console.log('Request params:', params);
        const response = await axios.get(DEALS_WEBHOOK_URL, { params });
        console.log('Deals response:', response.data);
        return response.data.result;
    } catch (error) {
        console.error(`Error fetching deals for user ${userId} on ${date}:`, error);
        return [];
    }
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

async function populateDatabase() {
    const employees = await fetchEmployees(DEPARTMENTS);

    let currentDate = new Date('2024-06-01');
    const endDate = new Date();

    while (currentDate <= endDate) {
        const formattedDate = currentDate.toISOString().split('T')[0];
        console.log(`Processing date: ${formattedDate}`);

        for (const employee of employees) {
            const userId = employee.ID;

            // Проверка наличия данных в базе
            const row = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM user_turnover WHERE user_id = ? AND date = ?`, [userId, formattedDate], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });

            if (!row) {
                const deals = await fetchDeals(userId, formattedDate);

                let totalTurnover = 0;
                for (const deal of deals) {
                    totalTurnover += parseFloat(deal.OPPORTUNITY);
                }

                db.run(`INSERT INTO user_turnover (user_id, date, turnover) VALUES (?, ?, ?)
                        ON CONFLICT(user_id, date) DO UPDATE SET turnover=excluded.turnover`,
                    [userId, formattedDate, totalTurnover], (err) => {
                        if (err) {
                            console.error(`Error inserting turnover for user ${userId} on ${formattedDate}:`, err);
                        } else {
                            console.log(`Inserted/Updated turnover for user ${userId} on ${formattedDate}: ${totalTurnover}`);
                        }
                    });

                db.run(`INSERT OR REPLACE INTO user_photos (user_id, photo_url) VALUES (?, ?)`,
                    [userId, employee.PERSONAL_PHOTO || 'https://via.placeholder.com/150'], (err) => {
                        if (err) {
                            console.error(`Error inserting photo URL for user ${userId}:`, err);
                        } else {
                            console.log(`Inserted/Updated photo URL for user ${userId}: ${employee.PERSONAL_PHOTO || 'https://via.placeholder.com/150'}`);
                        }
                    });
            }
        }

        currentDate = addDays(currentDate, 1);
    }

    console.log('Database population complete.');
    db.close();
}

populateDatabase();
