const express = require('express');
const app = express();
// const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const session = require('express-session');
// const MySQLStore = require('express-mysql-session')(session);
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const path = require('path');

dotenv.config();
const { Pool } = require('pg');

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'https://exp-tracker-postgres.onrender.com', // Vercel frontend URL
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
}));
app.use(cookieParser());

// Serve static files from the "public" directory
app.use(express.static('public'));

// Database connection

// const db = mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     // port: process.env.DB_PORT || 3306 // Port number (default to 3306)
// });


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432, // Default PostgreSQL port
});

// Check if database connection works
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.stack);
        return;
    }
    console.log('Connected to PostgreSQL:', res.rows[0]);

    // Create tables if they do not exist
    const createTables = async () => {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    username VARCHAR(50) NOT NULL,
                    password VARCHAR(255) NOT NULL
                )
            `);
    
            await pool.query(`
                CREATE TABLE IF NOT EXISTS expenses (
                    id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(id),
                    category VARCHAR(50),
                    amount DECIMAL(10, 2),
                    date DATE
                )
            `);
    
            await pool.query(`
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id VARCHAR(128) PRIMARY KEY,
                    expires TIMESTAMP NOT NULL,
                    data JSONB
                )
            `);
    
            console.log("Tables created/checked");
        } catch (err) {
            console.error("Error creating tables:", err);
        }
    };
    
    createTables();
});

// Session store configuration
const sessionStore = new pgSession({
    pool: pool, // Connection pool
    tableName: 'sessions' // Use a custom table name for sessions
});
// const sessionStore = new MySQLStore({}, db.promise());




//**** Session middleware
// Initialize the PostgreSQL session store

app.use(session({
    store: sessionStore, // Use the updated PostgreSQL session store
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 600000, // Session expiration time (600,000 ms = 10 minutes)
        httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
        secure: process.env.NODE_ENV === 'production' // Use HTTPS in production
    }
}));

// app.use(session({
//     key: 'user_sid',
//     secret: process.env.SESSION_SECRET || 'your_secret_key',
//     resave: false,
//     saveUninitialized: false,
//     store: sessionStore,
//     cookie: {
//         maxAge: 600000,
//         httpOnly: true,
//         secure: process.env.NODE_ENV === 'production' // Set to true if using HTTPS
//     }
// }));

//****  Middleware to clear cookie if session doesn't exist
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
});



// User registration route

app.post('/api/register', async (req, res) => {
    try {
        console.log("Received registration request:", req.body);

        const { rows: existingUsers } = await pool.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
        if (existingUsers.length > 0) return res.status(409).json("User already exists");

        // Hashing password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(req.body.password, salt);

        const newUserQuery = 'INSERT INTO users(email, username, password) VALUES($1, $2, $3)';
        await pool.query(newUserQuery, [req.body.email, req.body.username, hashedPassword]);

        return res.status(200).json("User created successfully");
    } catch (err) {
        console.log("Internal server error:", err);
        res.status(500).json("Internal Server Error");
    }
});


// app.post('/api/register', async (req, res) => {
//     try {
//         console.log("Received registration request:", req.body);
//         const users = `SELECT * FROM users WHERE email = ?`;
//         db.query(users, [req.body.email], (err, data) => {
//             if (data.length > 0) return res.status(409).json("User already exists");

//             // Hashing password
//             const salt = bcrypt.genSaltSync(10);
//             const hashedPassword = bcrypt.hashSync(req.body.password, salt);

//             const newUser = `INSERT INTO users(email, username, password) VALUES(?)`;
//             const value = [req.body.email, req.body.username, hashedPassword];
//             db.query(newUser, [value], (err) => {
//                 if (err) {
//                     console.log("Error inserting user:", err);
//                     return res.status(400).json("Something went wrong");
//                 }
//                 return res.status(200).json("User created successfully");
//             });
//         });
//     } catch (err) {
//         console.log("Internal server error:", err);
//         res.status(500).json("Internal Server Error");
//     }
// });



// database connection route

app.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT 1');
        res.status(200).json({ message: 'Database connection successful', result: result.rows });
    } catch (err) {
        res.status(500).json({ message: 'Database connection failed', error: err });
    }
});


// app.get('/db-test', (req, res) => {
//     db.query('SELECT 1', (err, result) => {
//         if (err) {
//             res.status(500).json({ message: 'Database connection failed', error: err });
//         } else {
//             res.status(200).json({ message: 'Database connection successful', result });
//         }
//     });
// });




// User login route

app.post('/login', async (req, res) => {
    try {
        const { rows: users } = await pool.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
        if (users.length === 0) return res.status(404).json("User not found");

        const isPasswordValid = bcrypt.compareSync(req.body.password, users[0].password);
        if (!isPasswordValid) return res.status(400).json("Invalid Email or Password");

        req.session.user = users[0];
        res.status(200).json({ message: "Login successful", userId: users[0].id });
    } catch (err) {
        res.status(500).json("Internal Server Error");
    }
});

// app.post('/login', async (req, res) => {
//     try {
//         const users = `SELECT * FROM users WHERE email = ?`;
//         db.query(users, [req.body.email], (err, data) => {
//             if (data.length === 0) return res.status(404).json("User not found");

//             const isPasswordValid = bcrypt.compareSync(req.body.password, data[0].password);
//             if (!isPasswordValid) return res.status(400).json("Invalid Email or Password");

//             req.session.user = data[0];
//             res.status(200).json({ message: "Login successful", userId: data[0].id });
//         });
//     } catch (err) {
//         res.status(500).json("Internal Server Error");
//     }
// });



//*** Endpoint to get current user information
app.get('/current-user', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ username: req.session.user.username });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

//**** Middleware to check if the user is authenticated
function authenticateUser(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json("Unauthorized");
    }
    next();
}




// Route to add a new expense

app.post('/expenses', authenticateUser, async (req, res) => {
    const { category, amount, date } = req.body;
    const userId = req.session.user.id;

    try {
        await pool.query('INSERT INTO expenses (user_id, category, amount, date) VALUES ($1, $2, $3, $4)', [userId, category, amount, date]);
        res.status(201).json("Expense added successfully");
    } catch (err) {
        res.status(400).json("Error adding expense");
    }
});

// app.post('/expenses', authenticateUser, (req, res) => {
//     const { category, amount, date } = req.body;
//     const userId = req.session.user.id;

//     const addExpenseQuery = `INSERT INTO expenses (user_id, category, amount, date) VALUES (?, ?, ?, ?)`;
//     const values = [userId, category, amount, date];

//     db.query(addExpenseQuery, values, (err) => {
//         if (err) {
//             return res.status(400).json("Error adding expense");
//         }
//         res.status(201).json("Expense added successfully");
//     });
// });




// Route to get all expenses for the authenticated user

app.get('/expenses', authenticateUser, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const { rows: expenses } = await pool.query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC', [userId]);
        res.status(200).json(expenses);
    } catch (err) {
        res.status(400).json("Error retrieving expenses");
    }
});


// app.get('/expenses', authenticateUser, (req, res) => {
//     const userId = req.session.user.id;

//     const getExpensesQuery = `SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC`;

//     db.query(getExpensesQuery, [userId], (err, results) => {
//         if (err) {
//             return res.status(400).json("Error retrieving expenses");
//         }
//         res.status(200).json(results);
//     });
// });




// Route to update an existing expense

app.put('/expenses/:id', authenticateUser, async (req, res) => {
    const expenseId = req.params.id;
    const { category, amount, date } = req.body;
    const userId = req.session.user.id;

    try {
        const result = await pool.query('UPDATE expenses SET category = $1, amount = $2, date = $3 WHERE id = $4 AND user_id = $5', [category, amount, date, expenseId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json("Expense not found or not authorized");
        }
        res.status(200).json("Expense updated successfully");
    } catch (err) {
        res.status(400).json("Error updating expense");
    }
});

// app.put('/expenses/:id', authenticateUser, (req, res) => {
//     const expenseId = req.params.id;
//     const { category, amount, date } = req.body;
//     const userId = req.session.user.id;

//     const updateExpenseQuery = `UPDATE expenses SET category = ?, amount = ?, date = ? WHERE id = ? AND user_id = ?`;
//     const values = [category, amount, date, expenseId, userId];

//     db.query(updateExpenseQuery, values, (err, result) => {
//         if (err) {
//             return res.status(400).json("Error updating expense");
//         }
//         if (result.affectedRows === 0) {
//             return res.status(404).json("Expense not found or not authorized");
//         }
//         res.status(200).json("Expense updated successfully");
//     });
// });





// Route to delete an existing expense
app.delete('/expenses/:id', authenticateUser, async (req, res) => {
    const expenseId = req.params.id;
    const userId = req.session.user.id;

    try {
        const result = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [expenseId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json("Expense not found or not authorized");
        }
        res.status(200).json("Expense deleted successfully");
    } catch (err) {
        res.status(400).json("Error deleting expense");
    }
});


// app.delete('/expenses/:id', authenticateUser, (req, res) => {
//     const expenseId = req.params.id;
//     const userId = req.session.user.id;

//     const deleteExpenseQuery = `DELETE FROM expenses WHERE id = ? AND user_id = ?`;

//     db.query(deleteExpenseQuery, [expenseId, userId], (err, result) => {
//         if (err) {
//             return res.status(400).json("Error deleting expense");
//         }
//         if (result.affectedRows === 0) {
//             return res.status(404).json("Expense not found or not authorized");
//         }
//         res.status(200).json("Expense deleted successfully");
//     });
// });

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json("Error logging out");
        }
        res.clearCookie('user_sid');
        res.status(200).json("Logout successful");
    });
});

// Route to check session status
app.get('/check-session', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ userId: req.session.user.id });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

// Serve the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

// // Serve the registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/register.html'));
});

// // Serve the expenses page (protected route)
app.get('/expenses', authenticateUser, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the homepage
app.get('/', (req, res) => {
    res.send("Welcome to the Expense Tracker");
});




// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}...`);
});
