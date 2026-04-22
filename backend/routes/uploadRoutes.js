import express from 'express';
import multer from 'multer';
import path from 'path';
import { createTaskImage, getTaskHistory } from '../controllers/uploadController.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `img_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.post('/upload', upload.array('image', 100), createTaskImage);
router.get('/tasks/:userId', getTaskHistory);


export default router;
