import database from '../config/database.js';
import jwt from 'jsonwebtoken';

export const registerUser = async (req, res) => {
  const { user_id, display_name, picture_url, email, phone_number } = req.body;
  if (!user_id || !display_name) {
    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ครบถ้วน',
      debug: { user_id, display_name }
    });
  }
  // ป้องกัน Error จากค่า Null
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'Missing user_id' });
  }

  try {
    const query = `
      INSERT INTO users (user_id, display_name, picture_url, email, phone_number, role)
      VALUES ($1, $2, $3, $4, $5, 'user') 
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        display_name = EXCLUDED.display_name, 
        picture_url = EXCLUDED.picture_url, 
        email = EXCLUDED.email,
        -- ปรับตรงนี้: ถ้า phone_number ที่ส่งมาไม่ใช่ค่าว่าง ให้ Update ทับตัวเดิมไปเลย
        phone_number = CASE 
          WHEN EXCLUDED.phone_number IS NOT NULL AND EXCLUDED.phone_number != '' 
          THEN EXCLUDED.phone_number 
          ELSE users.phone_number 
        END
      RETURNING *;
    `;

    const result = await database.query(query, [
      user_id,
      display_name,
      picture_url,
      email,
      phone_number || null 
    ]);

    const userData = result.rows[0];
    const isExpert = userData.role !== 'user';

    const token = jwt.sign(
      { id: userData.user_id, name: userData.display_name, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      data: userData,
      token,
      isExpert: isExpert,
      message: isExpert ? 'เข้าสู่ระบบสำเร็จ' : 'รอการอนุมัติสิทธิ์จากผู้ดูแลระบบ'
    });
  } catch (err) {
    // เช็ค Error ใน Console ของ Terminal หลังบ้าน จะเห็นสาเหตุที่แท้จริง
    console.error('❌ Database Error Details:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
};
