import pool from '../config/database.js';
import jwt from 'jsonwebtoken';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const TRAIN_SCRIPT_PATH = path.join(__dirname, '..', '..', 'AI_SERVICE', 'train_template.py');

export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
        }

        const result = await pool.query(
            "SELECT user_id, role FROM users WHERE email = $1 AND role = 'admin'",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'อีเมลหรือข้อมูลไม่ถูกต้อง' });
        }

        const user = result.rows[0];

        const isMatch = (password === user.user_id);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        // สร้าง Token โดยไม่มี display_name ใน payload
        const token = jwt.sign(
            { id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            message: 'Login สำเร็จ',
            token,
            user: { id: user.user_id, role: user.role }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
    }
};
// --- ฟังก์ชันเปลี่ยน Role (จำกัดแค่ user และ Plant Pathologist) ---
export const updateMemberRole = async (req, res) => {
    try {
        const { target_user_id, new_role } = req.body;

        // ล็อกให้เปลี่ยนได้แค่ 2 อย่างนี้เท่านั้น
        const allowedRoles = ['user', 'Plant Pathologist'];
        if (!allowedRoles.includes(new_role)) {
            return res.status(400).json({ success: false, message: "Role นี้ไม่อนุญาตให้ตั้งค่า" });
        }

        await pool.query(
            "UPDATE users SET role = $1 WHERE user_id = $2",
            [new_role, target_user_id]
        );

        res.json({ success: true, message: `เปลี่ยนสิทธิ์เป็น ${new_role} สำเร็จ` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getAllMembers = async (req, res) => {
    try {
        // SQL Query: Select specific fields including phone_number
        const query = `
            SELECT 
                user_id, 
                display_name, 
                email, 
                phone_number, 
                role, 
                picture_url 
            FROM users 
            WHERE role IN ('user', 'Plant Pathologist')
            ORDER BY user_id DESC
        `;

        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });

    } catch (error) {
        // Detailed error logging for debugging
        console.error("❌ [API Error] Fetching members failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const getAllPlots = async (req, res) => {
    try {
        const query = `
            SELECT
                p.plot_id,
                p.plot_name,
                p.province,
                p.district,
                p.locality,
                p.latitude,
                p.longitude,
                p.soil_type,
                p.space,
                u.display_name AS owner_name,
                COUNT(sr.record_id) AS survey_count,
                MAX(sr.survey_date)::date AS latest_survey_date,
                (
                    SELECT COALESCE(json_agg(DISTINCT si.disease_name), '[]'::json)
                    FROM survey_images si
                    JOIN survey_records sr2 ON si.record_id = sr2.record_id
                    WHERE sr2.plot_id = p.plot_id
                      AND si.disease_name IS NOT NULL
                      AND sr2.record_id = (
                          SELECT record_id FROM survey_records
                          WHERE plot_id = p.plot_id
                          ORDER BY survey_date DESC
                          LIMIT 1
                      )
                ) AS latest_diseases,
                (
                    SELECT json_agg(ds ORDER BY ds.first_seen ASC)
                    FROM (
                        SELECT
                            si.disease_name,
                            MIN(sr2.survey_date)::date AS first_seen,
                            MAX(sr2.survey_date)::date AS last_seen
                        FROM survey_images si
                        JOIN survey_records sr2 ON si.record_id = sr2.record_id
                        WHERE sr2.plot_id = p.plot_id
                          AND si.disease_name IS NOT NULL
                        GROUP BY si.disease_name
                    ) ds
                ) AS disease_timeline,
                (
                    SELECT COALESCE(json_agg(DISTINCT ap.adjacent_plants_name), '[]'::json)
                    FROM adjacent_plants ap
                    JOIN survey_records sr2 ON ap.record_id = sr2.record_id
                    WHERE sr2.plot_id = p.plot_id
                ) AS all_adj_plants,
                (
                    SELECT COALESCE(json_agg(DISTINCT w.weed_name), '[]'::json)
                    FROM weeds w
                    JOIN survey_records sr2 ON w.record_id = sr2.record_id
                    WHERE sr2.plot_id = p.plot_id
                ) AS all_weeds,
                (
                    SELECT COALESCE(json_agg(DISTINCT h.herbicide_name), '[]'::json)
                    FROM herbicides h
                    JOIN survey_records sr2 ON h.record_id = sr2.record_id
                    WHERE sr2.plot_id = p.plot_id
                ) AS all_herbicides
            FROM plots p
            JOIN users u ON p.user_id = u.user_id
            LEFT JOIN survey_records sr ON p.plot_id = sr.plot_id
            GROUP BY p.plot_id, u.display_name
            ORDER BY p.created_at DESC
        `;

        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPlotRecordDetails = async (req, res) => {
    const { plotId } = req.params;
    try {
        const query = `
            SELECT
                sr.record_id,
                sr.plant_species,
                sr.plant_age,
                sr.survey_date,
                p.soil_type,
                p.space,
                -- Disease summary with confidence
                (
                    SELECT json_agg(ds ORDER BY ds.total_plants DESC)
                    FROM (
                        SELECT
                            disease_name,
                            SUM(plant_count)            AS total_plants,
                            ROUND(AVG(severity)::numeric, 1)    AS avg_severity,
                            ROUND(AVG(confidence)::numeric, 1)  AS avg_confidence
                        FROM survey_images
                        WHERE record_id = sr.record_id
                          AND disease_name IS NOT NULL
                        GROUP BY disease_name
                    ) ds
                ) AS diseases,
                -- Adjacent plants as JSON array
                (
                    SELECT json_agg(adjacent_plants_name ORDER BY adjacent_plants_name)
                    FROM adjacent_plants
                    WHERE record_id = sr.record_id
                ) AS adj_plants,
                -- Weeds as JSON array
                (
                    SELECT json_agg(weed_name ORDER BY weed_name)
                    FROM weeds
                    WHERE record_id = sr.record_id
                ) AS weeds_list,
                -- Herbicides as JSON array
                (
                    SELECT json_agg(herbicide_name ORDER BY herbicide_name)
                    FROM herbicides
                    WHERE record_id = sr.record_id
                ) AS herbs_list
            FROM survey_records sr
            JOIN plots p ON sr.plot_id = p.plot_id
            WHERE sr.plot_id = $1
            ORDER BY sr.survey_date DESC
        `;
        const result = await pool.query(query, [plotId]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSurveyImagesByRecord = async (req, res) => {
    const { recordId } = req.params;
    try {
        const query = `
            SELECT * FROM survey_images 
            WHERE record_id = $1 
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [recordId]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ฟังก์ชันใหม่สำหรับดึงรูปภาพและผลวิเคราะห์เมื่อกดปุ่ม
export const getPlotSurveys = async (req, res) => {
    console.log(`Admin requested surveys for plot_id: ${req.params.plot_id}`);
    try {
        const { plot_id } = req.params;
        const query = `
            SELECT image_path, disease_name, severity, plant_count 
            FROM survey_images 
            WHERE plot_id = $1 
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [plot_id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const DISEASE_CLASS_INDEX = {
    'Healthy': 0,
    'Mosaic Disease': 1,
    'Bacterial Blight': 2,
    'Brown Streak Disease': 3,
};

export const exportDatasetStats = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT disease_name, COUNT(*) AS count
            FROM survey_images
            WHERE disease_name IS NOT NULL
            GROUP BY disease_name
            ORDER BY disease_name
        `);
        const total = result.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
        res.json({ success: true, data: result.rows, total });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const exportDataset = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT image_path, disease_name
            FROM survey_images
            WHERE disease_name IS NOT NULL
            ORDER BY created_at DESC
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่มีข้อมูลรูปภาพที่มี Expert Label' });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="training_dataset.zip"');

        const archive = archiver('zip', { zlib: { level: 6 } });
        archive.on('error', (err) => { throw err; });
        archive.pipe(res);

        const csvLines = ['filename,label,class_index'];
        for (const row of result.rows) {
            const filePath = path.join(UPLOADS_DIR, row.image_path);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: `images/${row.image_path}` });
                const classIdx = DISEASE_CLASS_INDEX[row.disease_name] ?? -1;
                csvLines.push(`${row.image_path},${row.disease_name},${classIdx}`);
            }
        }

        archive.append(csvLines.join('\n'), { name: 'labels.csv' });

        if (fs.existsSync(TRAIN_SCRIPT_PATH)) {
            archive.file(TRAIN_SCRIPT_PATH, { name: 'train_template.py' });
        }

        await archive.finalize();
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export const getLegacyPredictionLogs = async (req, res) => {
    try {
        const { disease, date_from, date_to } = req.query;

        let conditions = [];
        let values = [];
        let idx = 1;

        if (disease && disease !== 'all') {
            conditions.push(`disease_name = $${idx++}`);
            values.push(disease);
        }
        if (date_from) {
            conditions.push(`created_at >= $${idx++}`);
            values.push(date_from);
        }
        if (date_to) {
            conditions.push(`created_at < $${idx++}`);
            // +1 day so the end date is inclusive
            const next = new Date(date_to);
            next.setDate(next.getDate() + 1);
            values.push(next.toISOString().split('T')[0]);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await pool.query(
            `SELECT log_id, user_id, disease_name, confidence_score, image_base64, created_at
             FROM prediction_logs
             ${where}
             ORDER BY created_at DESC
             LIMIT 500`,
            values
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getLegacyLogImage = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT image_base64 FROM prediction_logs WHERE log_id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบ log' });
        }
        res.json({ success: true, image_base64: result.rows[0].image_base64 });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPredictionLogs = async (req, res) => {
    try {
        const query = `
            SELECT
                image_id,
                record_id,
                image_path,
                disease_name,
                severity,
                created_at,
                confidence,
                ai_predicted_disease
            FROM survey_images
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching logs from survey_images:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};