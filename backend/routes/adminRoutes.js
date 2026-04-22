import express from 'express';
const router = express.Router();
import { adminLogin, updateMemberRole, getAllMembers, getAllPlots, getPlotSurveys, getPredictionLogs, getPlotRecordDetails, getSurveyImagesByRecord, exportDataset, exportDatasetStats, getLegacyPredictionLogs, getLegacyLogImage } from '../controllers/adminController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';
import { listModels, uploadModel, activateModel, deleteModel, uploadModelMiddleware } from '../controllers/modelController.js';

router.post('/login', adminLogin);

// All routes below require a valid JWT with role = 'admin'
router.use(verifyToken, requireAdmin);

router.put('/change-role', updateMemberRole);
router.get('/members', getAllMembers);
router.get('/all', getAllPlots);
router.get('/plot-surveys/:plot_id', getPlotSurveys);
router.get('/prediction-logs', getPredictionLogs);
router.get('/plot-records/:plotId', getPlotRecordDetails);
router.get('/survey-images/:recordId', getSurveyImagesByRecord);

// Legacy prediction_logs table
router.get('/legacy-logs', getLegacyPredictionLogs);
router.get('/legacy-logs/:id/image', getLegacyLogImage);

// Dataset export
router.get('/export-dataset/stats', exportDatasetStats);
router.get('/export-dataset', exportDataset);

// Model management
router.get('/models', listModels);
router.post('/upload-model', uploadModelMiddleware, uploadModel);
router.put('/models/:id/activate', activateModel);
router.delete('/models/:id', deleteModel);

export default router;
