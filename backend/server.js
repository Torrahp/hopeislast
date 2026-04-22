import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRoutes from './routes/uploadRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import surveyRoutes from './routes/surveyRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set in .env');
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors({
  origin: [process.env.LIFF_ORIGIN, process.env.ADMIN_ORIGIN].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. เปิดโฟลเดอร์ uploads ให้หน้าบ้านดึงรูปไปแสดงผลได้
app.use('/uploads', express.static('uploads'));

// 2. ใช้งาน Route อัปโหลด
app.use('/api', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/admin', adminRoutes);

// ทดสอบ Route พื้นฐาน
app.get('/', (req, res) => {
  res.send('Plant Disease API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});