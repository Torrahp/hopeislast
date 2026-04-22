import pool from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, '..', '..', 'AI_SERVICE', 'models');

if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MODELS_DIR),
    filename: (_req, file, cb) => {
        const ts = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `model_${ts}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.pth') {
        cb(null, true);
    } else {
        cb(new Error('Only .pth files are allowed'), false);
    }
};

export const uploadModelMiddleware = multer({ storage, fileFilter }).single('model');

export const listModels = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM ai_models ORDER BY uploaded_at DESC'
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const uploadModel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ .pth' });
        }
        const { notes } = req.body;
        const result = await pool.query(
            `INSERT INTO ai_models (filename, original_name, notes)
             VALUES ($1, $2, $3) RETURNING *`,
            [req.file.filename, req.file.originalname, notes || null]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const activateModel = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const modelRes = await client.query(
            'SELECT * FROM ai_models WHERE model_id = $1',
            [id]
        );
        if (modelRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'ไม่พบ model' });
        }
        const model = modelRes.rows[0];

        await client.query('UPDATE ai_models SET is_active = FALSE');
        await client.query(
            'UPDATE ai_models SET is_active = TRUE WHERE model_id = $1',
            [id]
        );

        // Tell AI Service to reload — path is relative to AI_SERVICE dir
        const modelPath = `models/${model.filename}`;
        const aiRes = await axios.post('http://127.0.0.1:8000/reload-model', {
            model_path: modelPath,
        });

        if (!aiRes.data.success) {
            await client.query('ROLLBACK');
            return res.status(500).json({
                success: false,
                message: `AI Service ไม่สามารถโหลด model: ${aiRes.data.error}`,
            });
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Activate model "${model.original_name}" สำเร็จ` });
    } catch (error) {
        await client.query('ROLLBACK');
        const msg = error.code === 'ECONNREFUSED'
            ? 'ไม่สามารถเชื่อมต่อ AI Service ได้ — ตรวจสอบว่า AI Service กำลังทำงาน'
            : error.message;
        res.status(500).json({ success: false, message: msg });
    } finally {
        client.release();
    }
};

export const deleteModel = async (req, res) => {
    const { id } = req.params;
    try {
        const modelRes = await pool.query(
            'SELECT * FROM ai_models WHERE model_id = $1',
            [id]
        );
        if (modelRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบ model' });
        }
        const model = modelRes.rows[0];

        if (model.is_active) {
            return res.status(400).json({
                success: false,
                message: 'ไม่สามารถลบ model ที่กำลัง active อยู่ได้',
            });
        }

        const filePath = path.join(MODELS_DIR, model.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await pool.query('DELETE FROM ai_models WHERE model_id = $1', [id]);
        res.json({ success: true, message: 'ลบ model สำเร็จ' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
