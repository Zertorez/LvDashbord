const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const schedule = require('node-schedule');
const app = express();
const PORT = process.env.PORT || 3000;

const EMPLOYEES_WEBHOOK_URL = 'https://anlasvegas.bitrix24.ru/rest/1/dcmwwzrc8za517se/user.get';
const DEALS_WEBHOOK_URL = 'https://anlasvegas.bitrix24.ru/rest/1/dcmwwzrc8za517se/crm.deal.list';

// Подключение к базе данных SQLite
const db = new sqlite3.Database('user_turnover.db');

// Создание таблиц, если их нет
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS user_turnover (
    user_id INTEGER,
    date TEXT,
    turnover REAL NOT NULL,
    PRIMARY KEY (user_id, date)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS user_photos (
    user_id INTEGER PRIMARY KEY,
    photo_url TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS user_work_days (
    user_id INTEGER PRIMARY KEY,
    department INTEGER,
    work_days INTEGER
  )`);
});

app.use(express.static('public'));
app.use(express.json());

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Убедитесь, что это false, если не используете HTTPS
}));

const citiesFilePath = path.join(__dirname, 'cities.json');
const adminsFilePath = path.join(__dirname, 'admins.json');
const usersFilePath = path.join(__dirname, 'users.json'); // Файл для хранения пользователей

const superAdmin = {
    login: 'Zertorez',
    password: 'Zertorezich137!'
};

// Функция для чтения данных из файла
function readFromFile(filePath) {
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    }
    return [];
}

// Функция для записи данных в файл
function writeToFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Инициализация данных из файла при запуске сервера
let departmentIdsByCity = readFromFile(citiesFilePath);
let userExceptionIds = ["7749", "16311", "395"];
let admins = readFromFile(adminsFilePath);
let users = readFromFile(usersFilePath); // Чтение данных пользователей

// Проверка логина и пароля для администратора и пользователей
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    if (login === superAdmin.login && password === superAdmin.password) {
        req.session.user = { login, isAdmin: true };
        res.json({ success: true, isAdmin: true });
    } else {
        const admin = admins[login];
        if (admin && bcrypt.compareSync(password, admin.password)) {
            req.session.user = { login, isAdmin: false };
            res.json({ success: true, isAdmin: false });
        } else {
            const user = users.find(u => u.login === login);
            if (user && bcrypt.compareSync(password, user.password)) {
                req.session.user = { login, bitrixId: user.bitrixId };
                res.json({ success: true });
            } else {
                res.json({ success: false });
            }
        }
    }
});

// Проверка состояния сессии
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        const user = users.find(u => u.login === req.session.user.login);
        if (user) {
            axios.get(`https://anlasvegas.bitrix24.ru/rest/1/dcmwwzrc8za517se/user.get?ID=${user.bitrixId}`)
                .then(response => {
                    const bitrixUserData = response.data.result[0];
                    res.json({
                        loggedIn: true,
                        user: {
                            name: `${bitrixUserData.NAME} ${bitrixUserData.LAST_NAME}`,
                            photo: bitrixUserData.PERSONAL_PHOTO || 'https://via.placeholder.com/150',
                            email: bitrixUserData.EMAIL,
                            phone: bitrixUserData.PERSONAL_MOBILE,
                            login: user.login // Добавление логина пользователя
                        }
                    });
                })
                .catch(error => {
                    console.error('Error fetching Bitrix24 user data:', error);
                    res.status(500).json({ error: 'Failed to fetch user data from Bitrix24' });
                });
        } else {
            res.status(404).json({ loggedIn: false });
        }
    } else {
        res.json({ loggedIn: false });
    }
});

// Регистрация нового пользователя
app.post('/api/register', (req, res) => {
    const { login, password, bitrixId } = req.body;

    if (users.find(u => u.login === login)) {
        return res.json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    users.push({ login, password: hashedPassword, bitrixId });
    writeToFile(usersFilePath, users);
    res.json({ success: true });
});

// Получение профиля пользователя
app.get('/api/profile', (req, res) => {
    const login = req.query.login; // Допустим, логин передается как query параметр
    const user = users.find(u => u.login === login);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Симуляция вызова Bitrix24 API для получения данных профиля
    axios.get(`https://anlasvegas.bitrix24.ru/rest/1/dcmwwzrc8za517se/user.get?ID=${user.bitrixId}`)
        .then(response => {
            const bitrixUserData = response.data.result[0];
            const profileData = {
                name: bitrixUserData.NAME,
                lastname: bitrixUserData.LAST_NAME,
                phone: bitrixUserData.PERSONAL_MOBILE,
                email: bitrixUserData.EMAIL,
                photo: bitrixUserData.PERSONAL_PHOTO || 'https://via.placeholder.com/150'
            };
            res.json(profileData);
        })
        .catch(error => {
            console.error('Error fetching Bitrix24 user data:', error);
            res.status(500).json({ error: 'Failed to fetch user data from Bitrix24' });
        });
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/departments', (req, res) => {
    const city = req.query.city;
    if (city && departmentIdsByCity[city]) {
        res.json({ departmentIds: departmentIdsByCity[city] });
    } else {
        res.status(400).json({ error: 'Invalid city' });
    }
});

app.post('/api/departments', (req, res) => {
    const { city, departmentIds } = req.body;
    if (city && Array.isArray(departmentIds)) {
        departmentIdsByCity[city] = departmentIds.map(Number);
        writeToFile(citiesFilePath, departmentIdsByCity);
        res.json({ message: 'Department IDs updated successfully' });
    } else {
        res.status(400).json({ error: 'Invalid data' });
    }
});

app.post('/api/cities', (req, res) => {
    const { city, departmentIds } = req.body;
    if (city && Array.isArray(departmentIds)) {
        departmentIdsByCity[city] = departmentIds.map(Number);
        writeToFile(citiesFilePath, departmentIdsByCity);
        res.json({ message: 'City and department IDs added successfully' });
    } else {
        res.status(400).json({ error: 'Invalid data' });
    }
});

app.delete('/api/cities', (req, res) => {
    const { city } = req.body;
    if (city && departmentIdsByCity[city]) {
        delete departmentIdsByCity[city];
        writeToFile(citiesFilePath, departmentIdsByCity);
        res.json({ message: 'City deleted successfully' });
    } else {
        res.status(400).json({ error: 'Invalid city' });
    }
});

app.get('/api/exceptions', (req, res) => {
    res.json({ userExceptionIds });
});

app.post('/api/exceptions', (req, res) => {
    const { exceptionIds } = req.body;
    if (Array.isArray(exceptionIds)) {
        userExceptionIds = exceptionIds.map(Number);
        res.json({ message: 'User exception IDs updated successfully' });
    } else {
        res.status(400).json({ error: 'Invalid data' });
    }
});

app.post('/api/admins', (req, res) => {
    const { login, password, superAdminLogin, superAdminPassword } = req.body;
    if (superAdminLogin === superAdmin.login && superAdminPassword === superAdmin.password) {
        if (login && password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            admins[login] = { password: hashedPassword };
            writeToFile(adminsFilePath, admins);
            res.json({ message: 'Admin added successfully' });
        } else {
            res.status(400).json({ error: 'Invalid data' });
        }
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
});

app.delete('/api/admins', (req, res) => {
    const { login, superAdminLogin, superAdminPassword } = req.body;
    if (superAdminLogin === superAdmin.login && superAdminPassword === superAdmin.password) {
        if (login && admins[login]) {
            delete admins[login];
            writeToFile(adminsFilePath, admins);
            res.json({ message: 'Admin deleted successfully' });
        } else {
            res.status(400).json({ error: 'Invalid data' });
        }
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
});

app.get('/api/cities', (req, res) => {
    const cities = Object.keys(departmentIdsByCity);
    res.json({ cities });
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.get('/api/employees', async (req, res) => {
    try {
        const axiosInstance = axios.create({
            timeout: 5000
        });

        const city = req.query.city || 'kazan';
        const departmentIds = departmentIdsByCity[city] || [];

        let employees = [];

        for (const departmentId of departmentIds) {
            const response = await axiosInstance.get(EMPLOYEES_WEBHOOK_URL, {
                params: {
                    'FILTER[UF_DEPARTMENT]': departmentId,
                    'FILTER[ACTIVE]': 'Y'
                }
            });

            if (response.data.result) {
                employees = employees.concat(response.data.result);
            }
        }

        res.json(employees);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

app.get('/api/deals/success', async (req, res) => {
    const userId = req.query.userId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!userId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing userId, startDate or endDate parameter' });
    }

    try {
        const axiosInstance = axios.create({
            timeout: 5000
        });

        const dealsResponse = await axiosInstance.get(DEALS_WEBHOOK_URL, {
            params: {
                'FILTER[>=CLOSEDATE]': startDate,
                'FILTER[<=CLOSEDATE]': endDate,
                'FILTER[STAGE_ID]': ['C54:WON', 'C52:WON'],
                'FILTER[ASSIGNED_BY_ID]': userId
            }
        });

        const deals = dealsResponse.data.result;

        res.json(deals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch deals' });
    }
});

async function updateDatabase() {
    try {
        const axiosInstance = axios.create({
            timeout: 5000
        });

        const usersResponse = await axiosInstance.get(EMPLOYEES_WEBHOOK_URL);
        const users = usersResponse.data.result;

        const today = new Date().toISOString().split('T')[0];

        for (const user of users) {
            const userId = user.ID;
            const dealsResponse = await axiosInstance.get(DEALS_WEBHOOK_URL, {
                params: {
                    'FILTER[ASSIGNED_BY_ID]': userId,
                    'FILTER[STAGE_ID]': ['C54:WON', 'C52:WON'],
                    'FILTER[>=CLOSEDATE]': today,
                    'FILTER[<=CLOSEDATE]': today
                }
            });

            const deals = dealsResponse.data.result;
            let totalTurnover = 0;

            for (const deal of deals) {
                totalTurnover += parseFloat(deal.OPPORTUNITY);
            }

            db.run(`INSERT INTO user_turnover (user_id, date, turnover) VALUES (?, ?, ?)
                    ON CONFLICT(user_id, date) DO UPDATE SET turnover=excluded.turnover`, [userId, today, totalTurnover]);

            db.run(`INSERT OR REPLACE INTO user_photos (user_id, photo_url) VALUES (?, ?)`,
                [userId, user.PERSONAL_PHOTO || 'https://via.placeholder.com/150']);
        }

        console.log('Database updated successfully.');
    } catch (error) {
        console.error('Error updating database:', error);
    }
}

async function updateWorkDays() {
    try {
        db.all(`SELECT DISTINCT user_id FROM user_turnover`, (err, rows) => {
            if (err) {
                console.error('Error fetching user IDs from turnover table:', err);
                return;
            }

            rows.forEach(row => {
                const userId = row.user_id;
                db.get(`SELECT COUNT(DISTINCT date) as work_days FROM user_turnover WHERE user_id = ?`, [userId], (err, countRow) => {
                    if (err) {
                        console.error(`Error counting work days for user ${userId}:`, err);
                        return;
                    }

                    const workDays = countRow.work_days;
                    db.run(`INSERT OR REPLACE INTO user_work_days (user_id, department, work_days) VALUES (?, ?, ?)`, [userId, 0, workDays], (err) => {
                        if (err) {
                            console.error(`Error inserting/updating work days for user ${userId}:`, err);
                        } else {
                            console.log(`Inserted/Updated work days for user ${userId}: ${workDays}`);
                        }
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error updating work days:', error);
    }
}

// Schedule work days update at 11 PM every day
schedule.scheduleJob('0 23 * * *', updateWorkDays);

// Initial update on server start
updateDatabase();
updateWorkDays();

app.get('/api/getUserTurnover/:user_id/:startDate/:endDate', (req, res) => {
    const { user_id, startDate, endDate } = req.params;
    db.all(`SELECT * FROM user_turnover WHERE user_id = ? AND date BETWEEN ? AND ?`, [user_id, startDate, endDate], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (rows.length === 0) {
            // Fetch missing data from Bitrix
            fetchDealsFromBitrix(user_id, startDate, endDate)
                .then(deals => {
                    let totalTurnover = 0;
                    deals.forEach(deal => {
                        totalTurnover += parseFloat(deal.OPPORTUNITY);
                    });
                    db.run(`INSERT INTO user_turnover (user_id, date, turnover) VALUES (?, ?, ?)`, [user_id, startDate, totalTurnover], (err) => {
                        if (err) {
                            console.error(`Error inserting fetched turnover for user ${user_id} on ${startDate}:`, err);
                            return res.status(500).json({ error: 'Failed to update turnover' });
                        }
                        res.json({ user_id, date: startDate, turnover: totalTurnover });
                    });
                })
                .catch(error => {
                    console.error(`Error fetching deals from Bitrix for user ${user_id} on ${startDate}:`, error);
                    res.status(500).json({ error: 'Failed to fetch data from Bitrix' });
                });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/getUserPhoto/:user_id', (req, res) => {
    const { user_id } = req.params;
    db.get(`SELECT photo_url FROM user_photos WHERE user_id = ?`, [user_id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row);
    });
});

app.post('/api/saveUserPhoto', (req, res) => {
    const { user_id, photo_url } = req.body;
    if (user_id && photo_url) {
        db.run(`INSERT OR REPLACE INTO user_photos (user_id, photo_url) VALUES (?, ?)`, [user_id, photo_url], (err) => {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Failed to save photo URL' });
            }
            res.json({ message: 'Photo URL saved successfully' });
        });
    } else {
        res.status(400).json({ error: 'Invalid data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
