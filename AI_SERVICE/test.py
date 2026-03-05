import torch
state_dict = torch.load('best_model_ViT16.pth', map_location='cpu')

# ถ้าเก็บใน dict ให้แกะออกมาก่อน
if 'model' in state_dict: state_dict = state_dict['model']
elif 'state_dict' in state_dict: state_dict = state_dict['state_dict']

# พิมพ์ชื่อเลเยอร์ 5 ตัวสุดท้ายออกมาดู
print("--- Last 5 layers in your .pth file ---")
for key in list(state_dict.keys())[-5:]:
    print(f"{key}: {state_dict[key].shape}")