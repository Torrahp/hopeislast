// BACKEND/controllers/predictionController.js
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export const predictDisease = async (req, res) => {
    try {
        const { imagePath } = req.body;
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        const fullPath = path.resolve(uploadsDir, path.basename(imagePath));

        if (!fullPath.startsWith(uploadsDir + path.sep)) {
            return res.status(400).json({ success: false, message: "ชื่อไฟล์ไม่ถูกต้อง" });
        }

        console.log("🔍 กำลังตรวจสอบไฟล์ที่:", fullPath);

        if (!fs.existsSync(fullPath)) {
            console.error("❌ หาไฟล์ไม่พบใน Server");
            return res.status(404).json({ success: false, message: "ไม่พบไฟล์รูปภาพในโฟลเดอร์ uploads" });
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(fullPath));

        const aiResponse = await axios.post('http://127.0.0.1:8000/predict', form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 30000 // เพิ่มเวลาให้ AI ทำงานได้ถึง 30 วินาที
        });

        console.log("✅ AI ตอบกลับมาสำเร็จ:", aiResponse.data);
        res.json({ success: true, prediction: aiResponse.data });

    } catch (error) {
        // ดักจับ Error เฉพาะเจาะจง
        if (error.code === 'ECONNREFUSED') {
            console.error("🔥 Error: ติดต่อ AI Service ไม่ได้! (ลืมรัน Python หรือเปล่า?)");
            return res.status(503).json({ success: false, message: "AI Service ยังไม่เปิดใช้งาน" });
        }

        if (error.response) {
            // กรณี Python ตอบกลับมาแต่เป็น Error (เช่น 4xx, 5xx)
            console.error("⚠️ AI ตอบกลับด้วย Error:", error.response.data);
            return res.status(error.response.status).json({ success: false, message: "AI ประมวลผลผิดพลาด", details: error.response.data });
        }

        console.error("❌ General Error:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};