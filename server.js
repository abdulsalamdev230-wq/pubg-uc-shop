const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// Database Initialization
// -------------------------------------------------------------
const dbPath = path.join(__dirname, 'orders.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database orders.db');
        createTables();
    }
});

function createTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL,
            uc_amount INTEGER NOT NULL,
            price INTEGER NOT NULL,
            payment_method TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating orders table:', err.message);
        } else {
            console.log('Orders table ready');
        }
    });
}

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// 1. Log a new order
app.post('/api/orders', (req, res) => {
    const { player_id, uc_amount, price, payment_method } = req.body;

    if (!player_id || !uc_amount || !price || !payment_method) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        INSERT INTO orders (player_id, uc_amount, price, payment_method)
        VALUES (?, ?, ?, ?)
    `;

    db.run(query, [player_id, uc_amount, price, payment_method], function (err) {
        if (err) {
            console.error('Database insert error:', err.message);
            return res.status(500).json({ error: 'Failed to record order' });
        }
        res.status(201).json({
            success: true,
            orderId: this.lastID,
            message: 'Order recorded successfully'
        });
    });
});

// 2. Fetch all orders (for admin dashboard)
app.get('/api/orders', (req, res) => {
    const query = `SELECT * FROM orders ORDER BY created_at DESC`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database query error:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve orders' });
        }
        res.json(rows);
    });
});

// 3. Update order status
app.patch('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    const query = `UPDATE orders SET status = ? WHERE id = ?`;
    db.run(query, [status, id], function (err) {
        if (err) {
            console.error('Database update error:', err.message);
            return res.status(500).json({ error: 'Failed to update status' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true, message: `Order status updated to ${status}` });
    });
});

// 4. Retrieve dashboard metrics
app.get('/api/stats', (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as totalOrders,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingOrders,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedOrders,
            SUM(CASE WHEN status = 'Completed' THEN price ELSE 0 END) as totalRevenue
        FROM orders
    `;
    db.get(query, [], (err, row) => {
        if (err) {
            console.error('Database aggregation error:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve stats' });
        }
        res.json({
            totalOrders: row.totalOrders || 0,
            pendingOrders: row.pendingOrders || 0,
            completedOrders: row.completedOrders || 0,
            totalRevenue: row.totalRevenue || 0
        });
    });
});

// -------------------------------------------------------------
// Serve Static Site securely
// -------------------------------------------------------------

// Security Middleware: Prevent public access to sensitive backend/database files
app.use((req, res, next) => {
    const filePath = req.path.toLowerCase();
    if (
        filePath.endsWith('.db') || 
        filePath.endsWith('.sqlite') || 
        filePath === '/server.js' || 
        filePath === '/package.json' || 
        filePath === '/package-lock.json'
    ) {
        return res.status(403).send('Forbidden: Access Denied');
    }
    next();
});

// Serve frontend assets
app.use(express.static(path.join(__dirname)));

// Fallback to home page
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`UC Store Server is running at http://localhost:${PORT}`);
});
