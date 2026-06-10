// ============================================
// Express server — API + static frontend
// ============================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import './db/seed.js';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import referenceRoutes from './routes/reference.js';
import notificationRoutes from './routes/notifications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');
const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api', referenceRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(express.static(rootDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MCDA Healthcare running at http://localhost:${PORT}`);
});
