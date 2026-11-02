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
            order_id TEXT UNIQUE,
            customer TEXT,
            player_id TEXT NOT NULL,
            in_game_name TEXT,
            uc_amount INTEGER NOT NULL,
            package_name TEXT,
            price INTEGER NOT NULL,
            payment_method TEXT NOT NULL,
            payment_account TEXT,
            receipt_name TEXT,
            receipt_size INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating orders table:', err.message);
            return;
        }
        console.log('Orders table ready');
        // Migrate older databases that lack the newer columns
        const columns = [
            ['order_id', 'TEXT'],
            ['customer', 'TEXT'],
            ['in_game_name', 'TEXT'],
            ['package_name', 'TEXT'],
            ['payment_account', 'TEXT'],
            ['receipt_name', 'TEXT'],
            ['receipt_size', 'INTEGER DEFAULT 0']
        ];
        db.all(`PRAGMA table_info(orders)`, [], (e, rows) => {
            if (e) return;
            const existing = new Set((rows || []).map((r) => r.name));
            columns.forEach(([name, type]) => {
                if (!existing.has(name)) {
                    db.run(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
                }
            });
        });
    });
}

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// 1. Log a new order
// NOTE: this records an order request only. Payment is NEVER marked verified
// here — verification is done manually by the store owner via PATCH below.
app.post('/api/orders', (req, res) => {
    const {
        orderId, customer, playerId, inGameName, uc, packageName,
        amount, paymentMethod, paymentAccount, receiptName, receiptSize
    } = req.body;

    const player_id = playerId || req.body.player_id;
    const uc_amount = uc || req.body.uc_amount;
    const price = amount || req.body.price;
    const payment_method = paymentMethod || req.body.payment_method;

    if (!player_id || !uc_amount || !price || !payment_method) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Basic validation — never trust the client
    if (!Number.isFinite(Number(price)) || Number(price) <= 0 || Number(price) > 10000000) {
        return res.status(400).json({ error: 'Invalid price' });
    }
    if (!Number.isFinite(Number(uc_amount)) || Number(uc_amount) <= 0 || Number(uc_amount) > 1000000) {
        return res.status(400).json({ error: 'Invalid UC amount' });
    }
    if (!/^\d{8,12}$/.test(String(player_id))) {
        return res.status(400).json({ error: 'Invalid Player ID' });
    }

    const receiptNameSafe = String(receiptName || '').replace(/[^\w. -]/g, '').slice(0, 120);
    const finalOrderId = /^PUBG-\d{6}$/.test(String(orderId || ''))
        ? String(orderId)
        : 'PUBG-' + Math.floor(100000 + Math.random() * 900000);

    const query = `
        INSERT INTO orders
            (order_id, customer, player_id, in_game_name, uc_amount, package_name,
             price, payment_method, payment_account, receipt_name, receipt_size, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `;

    db.run(query, [
        finalOrderId,
        String(customer || '').slice(0, 80),
        String(player_id),
        String(inGameName || '').slice(0, 80),
        Number(uc_amount),
        String(packageName || '').slice(0, 80),
        Number(price),
        String(payment_method).slice(0, 40),
        String(paymentAccount || '').slice(0, 40),
        receiptNameSafe,
        Number(receiptSize) || 0
    ], function (err) {
        if (err) {
            console.error('Database insert error:', err.message);
            return res.status(500).json({ error: 'Failed to record order' });
        }
        res.status(201).json({
            success: true,
            orderId: finalOrderId,
            status: 'Pending',
            message: 'Order recorded. Payment verification is manual.'
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

// 2b. Fetch a single order by its public order id (for customer tracking)
app.get('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    if (!/^PUBG-\d{6}$/i.test(orderId)) {
        return res.status(400).json({ error: 'Invalid order id' });
    }
    const query = `SELECT * FROM orders WHERE order_id = ? COLLATE NOCASE`;
    db.get(query, [orderId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve order' });
        }
        if (!row) return res.status(404).json({ error: 'Order not found' });
        res.json({
            orderId: row.order_id || `#${row.id}`,
            status: row.status,
            uc: row.uc_amount,
            amount: row.price,
            paymentMethod: row.payment_method,
            playerId: row.player_id,
            inGameName: row.in_game_name,
            customer: row.customer,
            createdAt: row.created_at
        });
    });
});

// 3. Update order status (manual verification only)
app.patch('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Verified', 'Rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    // Accept both the numeric row id and the public "PUBG-123456" order id
    const numericId = String(id).replace(/^#/, '');
    const isPublicId = /^PUBG-\d{6}$/i.test(numericId);
    const query = isPublicId
        ? `UPDATE orders SET status = ? WHERE order_id = ? COLLATE NOCASE`
        : `UPDATE orders SET status = ? WHERE id = ?`;

    db.run(query, [status, isPublicId ? numericId : numericId], function (err) {
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
            SUM(CASE WHEN status = 'Verified' THEN 1 ELSE 0 END) as verifiedOrders,
            SUM(CASE WHEN status = 'Verified' THEN price ELSE 0 END) as totalRevenue
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
            verifiedOrders: row.verifiedOrders || 0,
            completedOrders: row.verifiedOrders || 0,
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
