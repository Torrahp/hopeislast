import torch
import timm
import torchvision.models as tv_models
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from PIL import Image
import torchvision.transforms as transforms
import io

app = FastAPI()

NUM_CLASSES = 4
LABELS = ["Healthy", "Mosaic Disease", "Bacterial Blight", "Brown Streak Disease"]
DEFAULT_MODEL_PATH = "best_vit.pth"

# Global state — mutable so /reload-model can swap without restart
_model = None
_active_model_path = DEFAULT_MODEL_PATH


def _is_torchvision_vit(keys):
    # torchvision ViT uses 'class_token' and 'conv_proj'; timm uses 'cls_token' and 'patch_embed'
    return any('class_token' in k or 'conv_proj' in k for k in keys)


def _load_model_from_path(path: str):
    state_dict = torch.load(path, map_location='cpu')
    if isinstance(state_dict, dict):
        state_dict = state_dict.get('model', state_dict.get('state_dict', state_dict))

    if _is_torchvision_vit(state_dict.keys()):
        # torchvision vit_b_16 — replace classification head to match NUM_CLASSES
        model = tv_models.vit_b_16(weights=None)
        model.heads.head = torch.nn.Linear(model.heads.head.in_features, NUM_CLASSES)
        print("🔍 Detected architecture: torchvision ViT-B/16")
    else:
        # timm vit_base_patch16_224
        model = timm.create_model('vit_base_patch16_224', num_classes=NUM_CLASSES, pretrained=False)
        print("🔍 Detected architecture: timm ViT-B/16")

    model.load_state_dict(state_dict)
    model.eval()
    return model


@app.on_event("startup")
def startup_load():
    global _model, _active_model_path
    try:
        _model = _load_model_from_path(DEFAULT_MODEL_PATH)
        print(f"✅ AI Model Loaded: {DEFAULT_MODEL_PATH}")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        _model = None


# --- Predict ---
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if _model is None:
        return {"success": False, "error": "Model not initialized"}

    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert('RGB')

        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
        ])
        img_tensor = transform(img).unsqueeze(0)

        with torch.no_grad():
            output = _model(img_tensor)
            prob = torch.nn.functional.softmax(output[0], dim=0)
            conf, pred = torch.max(prob, 0)

        confidence_score = float(conf.item())

        if confidence_score < 0.80:
            result_disease = "another"
        else:
            result_disease = LABELS[pred.item()]

        return {
            "success": True,
            "disease": result_disease,
            "confidence": round(confidence_score * 100, 2),
            "is_uncertain": confidence_score < 0.80
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


# --- Reload model (called by backend after admin activates a new model) ---
class ReloadRequest(BaseModel):
    model_path: str  # relative path from AI_SERVICE dir, e.g. "models/new_model.pth"


@app.post("/reload-model")
async def reload_model(body: ReloadRequest):
    global _model, _active_model_path
    try:
        new_model = _load_model_from_path(body.model_path)
        _model = new_model
        _active_model_path = body.model_path
        print(f"✅ Model reloaded: {body.model_path}")
        return {"success": True, "active_model": body.model_path}
    except Exception as e:
        print(f"❌ Reload failed: {e}")
        return {"success": False, "error": str(e)}


# --- Model info ---
@app.get("/model-info")
async def model_info():
    return {
        "active_model": _active_model_path,
        "loaded": _model is not None
    }

# uvicorn main:app --host 127.0.0.1 --port 8000 --reload
