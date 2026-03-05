import torch
import torchvision.models as models
from fastapi import FastAPI, UploadFile, File
from PIL import Image
import torchvision.transforms as transforms
import io

app = FastAPI()

def load_my_model():
    # 1. แก้เป็น 4 คลาสตามขนาดในไฟล์ .pth ของคุณ
    num_classes = 4 
    try:
        # สร้างโครงสร้าง ViT-B/16
        model = models.vit_b_16(weights=None)
        model.heads.head = torch.nn.Linear(model.heads.head.in_features, num_classes)

        # 2. โหลด Weights
        state_dict = torch.load('best_model_ViT16.pth', map_location='cpu')
        
        # แกะข้อมูลกรณีอยู่ใน Dict
        if isinstance(state_dict, dict):
            state_dict = state_dict.get('model', state_dict.get('state_dict', state_dict))

        # 3. โหลดเข้าโมเดล (ตอนนี้ขนาดจะตรงกันเป๊ะแล้ว)
        model.load_state_dict(state_dict)
        model.eval()
        
        print("✅ AI Model Loaded: 4 Classes detected and matched!")
        return model
    except Exception as e:
        print(f"❌ Error during loading: {e}")
        return None

model = load_my_model()

# --- ส่วนทำนาย (Predict) ---
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None: 
        return {"success": False, "error": "Model not initialized"}
        
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert('RGB')
        
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        img_tensor = transform(img).unsqueeze(0)
        
        with torch.no_grad():
            output = model(img_tensor)
            prob = torch.nn.functional.softmax(output[0], dim=0)
            conf, pred = torch.max(prob, 0)
            
        # --- เพิ่ม Logic ตรวจสอบความมั่นใจ ---
        confidence_score = float(conf.item())
        
        # รายชื่อโรค 4 ตัวหลักที่โมเดลรู้จัก (ตาม Index 0-3)
        labels = ["Healthy", "Cassava Mosaic Disease", "Cassava Bacterial Blight", "Cassava Brown Streak Disease"]
        
        if confidence_score < 0.80:
            # หากความมั่นใจต่ำกว่า 80% ให้ระบุว่าเป็น "another"
            result_disease = "another"
        else:
            # หากมั่นใจเกิน 80% ให้ใช้ชื่อโรคตามที่โมเดลทำนายมา
            result_disease = labels[pred.item()]
            
        return {
            "success": True,
            "disease": result_disease,
            "confidence": round(confidence_score * 100, 2),
            "is_uncertain": confidence_score < 0.80 # แถม Flag บอกหน้าบ้านว่า AI ไม่ค่อยชัวร์
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
#uvicorn main:app --host 127.0.0.1 --port 8000 --reload