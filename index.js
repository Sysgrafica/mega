
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir arquivos estáticos
app.use(express.static('.'));

// Middleware para parsing JSON
app.use(express.json());

// Middleware para CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para relatórios de vendas
app.get('/reports-sales', (req, res) => {
    res.sendFile(path.join(__dirname, 'reports-sales.html'));
});

// Rota para relatórios de vendedores
app.get('/reports-sellers', (req, res) => {
    res.sendFile(path.join(__dirname, 'reports-sellers.html'));
});

// Middleware para capturar todas as outras rotas e servir o index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`GrafSys rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});
