import database from '../config/database.js';


// ฟังก์ชันดึงประวัติงานตาม userId
export const getTaskHistory = async (req, res) => {
  try {
    const { userId } = req.params; // รับค่า userId จาก URL

    if (!userId) {
      return res.status(400).json({ success: false, message: 'ไม่พบ User ID' });
    }

    console.log(`🔍 Fetching history for user: ${userId}`);

    // ดึงข้อมูลจากตาราง tasks เรียงตามวันที่ล่าสุดขึ้นก่อน
    const query = `
      SELECT image_id, user_id, image_path, is_success, created_at 
      FROM tasks 
      WHERE user_id = $1 
      ORDER BY created_at DESC;
    `;
    
    const result = await database.query(query, [userId]);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });

  } catch (error) {
    console.error('❌ Get History Error:', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// controllers/uploadController.js
export const createTaskImage = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ที่อัปโหลด' });
        }

        // คืนค่ารายการชื่อไฟล์ที่ถูกบันทึกลงในโฟลเดอร์ uploads/
        const fileData = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname
        }));

        res.status(200).json({
            success: true,
            data: fileData,
            count: fileData.length
        });
    } catch (error) {
        console.error("❌ Upload Error:", error);
        res.status(500).json({ success: false, message: 'การอัปโหลดล้มเหลว' });
    }
};