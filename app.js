// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const app = express();

app.use(bodyParser.json());

// Directorio para almacenar logs
const LOGS_DIR = path.join(__dirname, 'error_logs');

// Asegurar que el directorio de logs existe
async function ensureLogsDir() {
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
    } catch (err) {
        console.error('Error creating logs directory:', err);
    }
}

ensureLogsDir();

// Endpoint para recibir errores
app.post('/api/log-error', async (req, res) => {
    try {
        const {
            deviceInfo,
            errorType,
            errorMessage,
            stackTrace,
            timestamp,
            appVersion
        } = req.body;

        const logEntry = {
            timestamp,
            deviceInfo,
            errorType,
            errorMessage,
            stackTrace,
            appVersion
        };

        // Crear nombre de archivo con fecha
        const date = new Date(timestamp);
        const fileName = `error_${date.toISOString().split('T')[0]}.json`;
        const filePath = path.join(LOGS_DIR, fileName);

        // Leer archivo existente o crear uno nuevo
        let logs = [];
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            logs = JSON.parse(fileContent);
        } catch (err) {
            // Archivo no existe, usar array vacío
        }

        // Agregar nuevo error y guardar
        logs.push(logEntry);
        await fs.writeFile(filePath, JSON.stringify(logs, null, 2));

        res.status(200).json({ message: 'Error logged successfully' });
    } catch (err) {
        console.error('Error logging:', err);
        res.status(500).json({ error: 'Error saving log' });
    }
});

// Endpoint para ver resumen de errores
app.get('/api/error-summary', async (req, res) => {
    try {
        const files = await fs.readdir(LOGS_DIR);
        const summary = {
            totalErrors: 0,
            errorsByType: {},
            recentErrors: []
        };

        for (const file of files) {
            const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf8');
            const logs = JSON.parse(content);
            
            logs.forEach(log => {
                summary.totalErrors++;
                summary.errorsByType[log.errorType] = (summary.errorsByType[log.errorType] || 0) + 1;
                summary.recentErrors.push({
                    timestamp: log.timestamp,
                    errorType: log.errorType,
                    message: log.errorMessage
                });
            });
        }

        // Mantener solo los 10 errores más recientes
        summary.recentErrors.sort((a, b) => b.timestamp - a.timestamp);
        summary.recentErrors = summary.recentErrors.slice(0, 10);

        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: 'Error generating summary' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Error logging server running on port ${PORT}`);
});
