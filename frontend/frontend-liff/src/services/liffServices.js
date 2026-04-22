import liff from '@line/liff';
import axios from 'axios';

const apiPath = import.meta.env.VITE_API_URL;

export const initLiff = async (liffId) => {
  try {

    await liff.init({ liffId });

    // 2. เช็คการ Login
    if (!liff.isLoggedIn()) {
      console.log('--- [!] Debug: User not logged in, calling liff.login() ---');
      liff.login();
      return null;
    }

    // 3. ดึง Profile จาก LINE
    const profile = await liff.getProfile();
    const idToken = liff.getDecodedIDToken(); 
    // 4. ส่งข้อมูลไปที่ Backend
    const targetUrl = `${apiPath}/users/register`;
    console.log('---Payload to Send:', {
        user_id: profile.userId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl,
        email: idToken?.email || ''
    });

    try {
      const response = await axios.post(targetUrl, {
        user_id: profile.userId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl,
        email: idToken?.email || ''
      });

      return response.data.data; 

    } catch (apiError) {
      console.error('Status:', apiError.response?.status);
      console.error('Data from Server:', apiError.response?.data);
      console.error('Message:', apiError.message);
      throw new Error('Backend Connection Failed');
    }

  } catch (error) {
    // ตรงนี้จะบอกชัดว่าพังที่ขั้นตอนไหนของ LINE
    console.error('❌ [Critical Error] LIFF Init Error Name:', error.name);
    console.error('❌ [Critical Error] LIFF Init Error Message:', error.message);
    return null;
  }
};