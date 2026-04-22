import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

import fs from 'fs';
import path from 'path';


export const createFullSurvey = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            is_edit,
            plot_id: providedPlotId,
            record_id: providedRecordId, // สำคัญมากสำหรับการ Update Record เดิม
            plot_name,
            user_id,
            province,
            district: districtRaw,
            county,
            locality: localityRaw,
            town,
            latitude,
            longitude,
            soil_type,
            space,
            plant_species,
            plant_date,
            images,
            weed_names,
            herbicide_names,
            adjacent_plants_name
        } = req.body;

        const district = districtRaw || county || "";
        const locality = localityRaw || town || "";

        let finalPlotId = providedPlotId;
        let finalRecordId = providedRecordId;

        // --- 1. จัดการตาราง PLOTS ---
        if (!finalPlotId) {
            finalPlotId = `PLOT-${uuidv4().substring(0, 8).toUpperCase()}`;
            await client.query(
                `INSERT INTO plots (plot_id, user_id, plot_name, province, district, locality, latitude, longitude, soil_type, space)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [finalPlotId, user_id, plot_name, province, district, locality, latitude, longitude, soil_type, space]
            );
        } else {
            await client.query(
                `UPDATE plots SET 
                    plot_name = $1, province = $2, district = $3, locality = $4, 
                    latitude = $5, longitude = $6, soil_type = $7, space = $8 
                 WHERE plot_id = $9`,
                [plot_name, province, district, locality, latitude, longitude, soil_type, space, finalPlotId]
            );
        }

        // --- 2. จัดการตาราง SURVEY_RECORDS (เช็ค is_edit เพื่อไม่ให้เกิดการสร้างใหม่ซ้ำซ้อน) ---
        if (is_edit && finalRecordId) {
            // โหมดแก้ไข: อัปเดตข้อมูลเดิมใน Record ID ที่ส่งมา
            await client.query(
                `UPDATE survey_records SET plant_species = $1, plant_age = $2 WHERE record_id = $3`,
                [plant_species, plant_date, finalRecordId]
            );

            // ล้างข้อมูลตารางลูกเก่าออกก่อน (Overwrite)
            await client.query("DELETE FROM survey_images WHERE record_id = $1", [finalRecordId]);
            await client.query("DELETE FROM weeds WHERE record_id = $1", [finalRecordId]);
            await client.query("DELETE FROM herbicides WHERE record_id = $1", [finalRecordId]);
            await client.query("DELETE FROM adjacent_plants WHERE record_id = $1", [finalRecordId]);
        } else {
            // โหมดสร้างใหม่: (Insert Record ใหม่ของแปลงเดิม หรือแปลงใหม่)
            const recordRes = await client.query(
                `INSERT INTO survey_records (plot_id, plant_species, plant_age) 
                 VALUES ($1, $2, $3) RETURNING record_id`,
                [finalPlotId, plant_species, plant_date]
            );
            finalRecordId = recordRes.rows[0].record_id;
        }

        // --- 3. บันทึกข้อมูลตารางลูก (ทุกอย่างเชื่อมกับ finalRecordId) ---

        // 3.1 รูปภาพ (พร้อม UUID และ AI Predicted)
        if (images && images.length > 0) {
            for (const img of images) {
                const image_id = `IMG-${uuidv4().substring(0, 8).toUpperCase()}`;
                await client.query(
                    `INSERT INTO survey_images (image_id, record_id, image_path, disease_name, ai_predicted_disease, severity, plant_count, confidence)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        image_id, finalRecordId, img.image_path,
                        img.disease_name || "Unchecked",
                        img.ai_predicted_disease || "Didn't predict",
                        img.severity || 0, img.plant_count || 1, img.confidence || 0
                    ]
                );
            }
        }

        // 3.2 วัชพืช (UUID + Unique)
        if (weed_names) {
            const uniqueWeeds = [...new Set(weed_names.map(n => n.trim()))].filter(n => n !== "");
            for (const name of uniqueWeeds) {
                const id = `WD-${uuidv4().substring(0, 8).toUpperCase()}`;
                await client.query(`INSERT INTO weeds (weed_record_id, record_id, weed_name) VALUES ($1, $2, $3)`, [id, finalRecordId, name]);
            }
        }

        // 3.3 สารเคมี (UUID + Unique)
        if (herbicide_names) {
            const uniqueHerbs = [...new Set(herbicide_names.map(n => n.trim()))].filter(n => n !== "");
            for (const name of uniqueHerbs) {
                const id = `HB-${uuidv4().substring(0, 8).toUpperCase()}`;
                await client.query(`INSERT INTO herbicides (herb_record_id, record_id, herbicide_name) VALUES ($1, $2, $3)`, [id, finalRecordId, name]);
            }
        }

        // 3.4 พืชข้างเคียง (UUID + Unique)
        if (adjacent_plants_name) {
            const uniqueAdjacents = [...new Set(adjacent_plants_name.map(n => n.trim()))].filter(n => n !== "");
            for (const name of uniqueAdjacents) {
                const id = `ADJ-${uuidv4().substring(0, 8).toUpperCase()}`;
                await client.query(`INSERT INTO adjacent_plants (adj_id, record_id, adjacent_plants_name) VALUES ($1, $2, $3)`, [id, finalRecordId, name]);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true, plot_id: finalPlotId, record_id: finalRecordId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Save Error:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// ดึงข้อมูลสรุปและรายการแปลงของผู้ใช้
export const getUserDashboard = async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. ดึงสรุปภาพรวม (เหมือนเดิม)
        const statsRes = await pool.query(`
            SELECT 
                COUNT(p.plot_id) FILTER (WHERE p.is_hidden = FALSE) as active_plots,
                COUNT(p.plot_id) FILTER (WHERE p.is_hidden = TRUE) as hidden_plots,
                (SELECT COUNT(*) FROM survey_records r 
                 JOIN plots p2 ON r.plot_id = p2.plot_id 
                 WHERE p2.user_id = $1) as total_surveys
            FROM plots p
            WHERE p.user_id = $1
        `, [userId]);

        const stats = statsRes.rows[0];

        // 2. ดึงรายการแปลง พร้อม Subquery นับจำนวน Record ให้แม่นยำ
        const plotsRes = await pool.query(`
            SELECT 
                p.plot_id,
                p.plot_name,
                p.province,
                p.district,
                p.created_at as plot_created_at,
                -- ✨ ใช้ Subquery นับจำนวน Record จริงๆ ของแปลงนี้
                (SELECT COUNT(*) FROM survey_records r WHERE r.plot_id = p.plot_id) as survey_count,
                -- ✨ ดึงวันที่ล่าสุด
                (SELECT MAX(survey_date) FROM survey_records r WHERE r.plot_id = p.plot_id) as last_survey_date,
                -- ✨ ดึงพันธุ์พืชล่าสุด
                (SELECT plant_species FROM survey_records r 
                 WHERE r.plot_id = p.plot_id 
                 ORDER BY r.survey_date DESC LIMIT 1) as plant_species
            FROM plots p
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC
        `, [userId]);

        // จัดการเรื่อง parseInt ให้กับ survey_count ของทุก plot ก่อนส่งออกไป
        const plots = plotsRes.rows.map(plot => ({
            ...plot,
            survey_count: parseInt(plot.survey_count || 0)
        }));

        res.json({
            success: true,
            totalPlots: parseInt(stats.active_plots || 0),
            hiddenPlots: parseInt(stats.hidden_plots || 0),
            allRecords: parseInt(stats.total_surveys || 0),
            plots: plots // ส่งตัวแปรที่ map แล้วไปแทน
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPlotHistory = async (req, res) => {
    try {
        const { plotId } = req.params;
        const query = `
            SELECT 
                r.record_id,
                r.plant_species,
                r.plant_age as plant_date,
                r.survey_date,
                img.image_path,
                img.disease_name,
                img.severity,
                img.plant_count
            FROM survey_records r
            LEFT JOIN survey_images img ON r.record_id = img.record_id
            WHERE r.plot_id = $1
            ORDER BY r.survey_date DESC
        `;
        const result = await pool.query(query, [plotId]);

        // จัดกลุ่มข้อมูล: 1 Record อาจมีหลายรูป
        const history = result.rows.reduce((acc, row) => {
            const { record_id, ...data } = row;
            if (!acc[record_id]) {
                acc[record_id] = {
                    record_id,
                    survey_date: data.survey_date,
                    plant_species: data.plant_species,
                    plant_date: data.plant_date,
                    images: []
                };
            }
            if (data.image_path) {
                acc[record_id].images.push({
                    path: data.image_path,
                    disease: data.disease_name,
                    severity: data.severity,
                    count: data.plant_count
                });
            }
            return acc;
        }, {});

        res.json({ success: true, history: Object.values(history) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePlotStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        const { plotId } = req.params;
        const { action } = req.body; // 'delete' หรือ 'hide'

        await client.query('BEGIN');

        if (action === 'delete') {
            // 1. ดึงรายการ image_path ทั้งหมดที่เกี่ยวข้องกับทุก Record ของ Plot นี้
            // ต้อง JOIN จาก plots -> survey_records -> survey_images
            const imageQuery = `
                SELECT img.image_path 
                FROM survey_images img
                JOIN survey_records rec ON img.record_id = rec.record_id
                WHERE rec.plot_id = $1
            `;
            const imagesRes = await client.query(imageQuery, [plotId]);

            // 2. ลบไฟล์ภาพออกจาก Physical Disk
            const uploadsDir = path.resolve(process.cwd(), 'uploads');
            imagesRes.rows.forEach(img => {
                const filePath = path.resolve(uploadsDir, path.basename(img.image_path));
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Deleted file: ${img.image_path}`);
                    } catch (err) {
                        console.error(`❌ Failed to delete file: ${img.image_path}`, err);
                    }
                }
            });

            // 3. ลบข้อมูลในฐานข้อมูล
            // เนื่องจากมี ON DELETE CASCADE ในทุกลูกของ survey_records และ plots
            // การลบจากตารางแม่ (plots) จะทำให้ข้อมูลใน survey_records, survey_images, 
            // weeds, herbicides, และ adjacent_plants ถูกลบหายไปทั้งหมดทันที
            await client.query("DELETE FROM plots WHERE plot_id = $1", [plotId]);

            console.log(`✅ Plot ${plotId} and all associated records deleted successfully.`);

        } else if (action === 'hide') {
            // กรณีซ่อนแปลง (Soft Delete)
            await client.query("UPDATE plots SET is_hidden = TRUE WHERE plot_id = $1", [plotId]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `ดำเนินการ ${action} ข้อมูลเรียบร้อยแล้ว` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Update Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// ดึงข้อมูลรายละเอียดทั้งหมดของ 1 แปลง (ดึง Record ล่าสุดมาตั้งต้น)
export const getPlotDetails = async (req, res) => {
    try {
        const { plotId } = req.params;

        // 1. ดึงข้อมูลหลักจากตาราง plots
        const plotRes = await pool.query("SELECT * FROM plots WHERE plot_id = $1", [plotId]);

        if (plotRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "ไม่พบข้อมูลแปลงนี้" });
        }

        const plotData = plotRes.rows[0];

        // 2. ดึงข้อมูล Survey Record ล่าสุดของแปลงนี้
        const lastRecordRes = await pool.query(
            "SELECT * FROM survey_records WHERE plot_id = $1 ORDER BY survey_date DESC LIMIT 1",
            [plotId]
        );

        let recordData = {};
        let images = [];
        let weeds = [];
        let herbicides = [];
        let adjacent_plants = [];

        if (lastRecordRes.rows.length > 0) {
            recordData = lastRecordRes.rows[0];
            const recordId = recordData.record_id;

            // 3. ดึงข้อมูลลูกที่เชื่อมกับ record_id ล่าสุด
            const imagesRes = await pool.query("SELECT * FROM survey_images WHERE record_id = $1", [recordId]);
            const weedsRes = await pool.query("SELECT weed_name FROM weeds WHERE record_id = $1", [recordId]);
            const herbsRes = await pool.query("SELECT herbicide_name FROM herbicides WHERE record_id = $1", [recordId]);
            const adjRes = await pool.query("SELECT adjacent_plants_name FROM adjacent_plants WHERE record_id = $1", [recordId]);

            images = imagesRes.rows;
            weeds = weedsRes.rows.map(r => r.weed_name);
            herbicides = herbsRes.rows.map(r => r.herbicide_name);
            adjacent_plants = adjRes.rows.map(r => r.adjacent_plants_name);
        }

        res.json({
            success: true,
            data: {
                // ข้อมูลจากตาราง plots
                ...plotData,
                // ข้อมูลจากตาราง survey_records (ล่าสุด)
                record_id: recordData.record_id,
                plant_species: recordData.plant_species,
                plant_date: recordData.plant_age, // แมพเป็นชื่อที่ Frontend ใช้

                // ข้อมูลตารางลูก
                images: images,
                weeds: weeds,
                herbicides: herbicides,
                adjacent_plants: adjacent_plants
            }
        });
    } catch (error) {
        console.error("❌ Get Details Error:", error.message);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล", error: error.message });
    }
};

export const getMapData = async (req, res) => {
    try {
        const { start, end, province, district, subdistrict, disease } = req.query;
        const params = [];
        let counter = 1;

        // 1. กรองพื้นที่
        let filterSql = "";
        if (province) { filterSql += ` AND p.province = $${counter++}`; params.push(province); }
        if (district) { filterSql += ` AND p.district = $${counter++}`; params.push(district); }
        if (subdistrict) { filterSql += ` AND p.locality = $${counter++}`; params.push(subdistrict); }

        // 2. กรองชนิดโรค (แก้ไขตรงนี้)
        let diseaseFilterSql = ""; // ✨ ประกาศตัวแปรให้ถูกต้อง
        if (disease) {
            diseaseFilterSql = ` AND si.disease_name = $${counter++}`;
            params.push(disease);
        }

        // 3. กรองวันที่
        let dateFilterSql = "";
        if (start && end) {
            dateFilterSql = ` AND sr.survey_date::date BETWEEN $${counter} AND $${counter + 1}`;
            params.push(start, end);
            counter += 2;
        }

        const finalQuery = `
            SELECT 
                p.plot_id, p.plot_name, p.latitude, p.longitude, p.province, p.district, p.locality,
                sr.survey_date, sr.record_id,
                si.image_id, si.disease_name, si.severity, si.image_path, si.plant_count
            FROM public.plots p
            JOIN public.survey_records sr ON p.plot_id = sr.plot_id
            INNER JOIN public.survey_images si ON sr.record_id = si.record_id 
            WHERE 1=1 ${filterSql} ${dateFilterSql} ${diseaseFilterSql} -- ✨ เพิ่ม dateFilterSql เข้าไปด้วย
            ORDER BY sr.survey_date DESC;
        `;

        const statsQuery = `
            SELECT 
                si.disease_name, 
                si.severity, 
                SUM(si.plant_count)::int as total_plants
            FROM public.survey_images si
            JOIN public.survey_records sr ON si.record_id = sr.record_id
            JOIN public.plots p ON sr.plot_id = p.plot_id
            WHERE 1=1 ${filterSql} ${dateFilterSql} ${diseaseFilterSql} -- ✨ เพิ่ม diseaseFilterSql เพื่อให้สถิติตรงกับแผนที่
            GROUP BY si.disease_name, si.severity;
        `;

        const [mapResult, statsResult] = await Promise.all([
            pool.query(finalQuery, params),
            pool.query(statsQuery, params)
        ]);

        res.json({
            success: true,
            count: mapResult.rowCount,
            data: mapResult.rows,
            stats: statsResult.rows
        });

        console.log(`📊 ดึงข้อมูลสำเร็จ: ${mapResult.rowCount} รายการภาพ`);

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- เพิ่มฟังก์ชันดึงรายชื่อพื้นที่ที่มีข้อมูลอยู่ในระบบ ---
export const getAreaOptions = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT province, district, locality as subdistrict 
            FROM plots 
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const autoHideOldPlots = async (req, res) => {
    try {
        const { userId } = req.params;

        // คำสั่ง SQL: อัปเดตแปลงที่อายุเกิน 1 เดือนให้เป็น is_hidden = true
        // เฉพาะแปลงที่ยังไม่ได้ถูกซ่อน (is_hidden = false)
        const result = await pool.query(`
            UPDATE plots 
            SET is_hidden = true 
            WHERE user_id = $1 
              AND is_hidden = false 
              AND created_at < NOW() - INTERVAL '1 month'
            RETURNING plot_id;
        `, [userId]);

        res.json({
            success: true,
            count: result.rowCount,
            message: "ตรวจสอบและซ่อนแปลงเก่าเรียบร้อยแล้ว"
        });
    } catch (error) {
        console.error("❌ Auto-hide Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteUploadedFile = async (req, res) => {
    try {
        const { fileName } = req.params;
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        const filePath = path.resolve(uploadsDir, path.basename(fileName));

        if (!filePath.startsWith(uploadsDir + path.sep)) {
            return res.status(400).json({ success: false, message: "ชื่อไฟล์ไม่ถูกต้อง" });
        }

        // ตรวจสอบว่ามีไฟล์จริงไหมก่อนลบ
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // ลบไฟล์ออกจากโฟลเดอร์ uploads
            console.log(`🗑️ Deleted file from disk: ${fileName}`);
            return res.json({ success: true, message: "ลบไฟล์สำเร็จ" });
        } else {
            return res.status(404).json({ success: false, message: "ไม่พบไฟล์บนเซิร์ฟเวอร์" });
        }
    } catch (error) {
        console.error("Delete File Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const testMapData = async (req, res) => {
    try {
        const { start, end, province, district, subdistrict } = req.query;
        const params = [];
        let counter = 1;

        // แยกส่วน Filter
        let filterSql = "";
        if (province) { filterSql += ` AND p.province = $${counter++}`; params.push(province); }
        if (district) { filterSql += ` AND p.district = $${counter++}`; params.push(district); }
        if (subdistrict) { filterSql += ` AND p.locality = $${counter++}`; params.push(subdistrict); }

        let dateFilterSql = "";
        if (start && end) {
            dateFilterSql = ` AND sr.survey_date::date BETWEEN $${counter} AND $${counter + 1}`;
            params.push(start, end);
            counter += 2;
        }

        // --- QUERY 1: รายการรูปภาพทั้งหมดของรอบล่าสุด (ใช้ปักหมุด) ---
        const finalQuery = `
            WITH FilteredPlots AS (
                SELECT p.plot_id, p.plot_name, p.latitude, p.longitude, p.province, p.district, p.locality
                FROM public.plots p
                WHERE 1=1 ${filterSql}
            ),
            LatestRecords AS (
                SELECT DISTINCT ON (sr.plot_id) sr.record_id, sr.plot_id, sr.survey_date
                FROM public.survey_records sr
                WHERE sr.plot_id IN (SELECT plot_id FROM FilteredPlots)
                ${dateFilterSql}
                ORDER BY sr.plot_id, sr.survey_date DESC
            )
            SELECT 
                fp.plot_id, fp.plot_name, fp.latitude, fp.longitude,
                lr.survey_date, lr.record_id,
                si.image_id, si.disease_name, si.severity, si.image_path, si.plant_count
            FROM LatestRecords lr
            JOIN FilteredPlots fp ON lr.plot_id = fp.plot_id
            INNER JOIN public.survey_images si ON lr.record_id = si.record_id 
            ORDER BY lr.survey_date DESC;
        `;

        // --- QUERY 2: สถิติสรุป (ใช้ทำตาราง) ---
        const statsQuery = `
            WITH TargetRecords AS (
                SELECT DISTINCT ON (sr.plot_id) sr.record_id
                FROM public.survey_records sr
                JOIN public.plots p ON sr.plot_id = p.plot_id
                WHERE 1=1 ${filterSql} ${dateFilterSql}
                ORDER BY sr.plot_id, sr.survey_date DESC
            )
            SELECT 
                si.disease_name, 
                si.severity, 
                SUM(si.plant_count)::int as total_plants
            FROM public.survey_images si
            WHERE si.record_id IN (SELECT record_id FROM TargetRecords)
            GROUP BY si.disease_name, si.severity;
        `;

        const [mapResult, statsResult] = await Promise.all([
            pool.query(finalQuery, params),
            pool.query(statsQuery, params)
        ]);

        // ส่ง Response กลับไปดูใน Postman
        res.status(200).json({
            success: true,
            count: mapResult.rowCount, // ดูว่ามา 3 แถวไหม
            data: mapResult.rows,
            stats: statsResult.rows
        });

    } catch (error) {
        console.error("DEBUG ERROR:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};