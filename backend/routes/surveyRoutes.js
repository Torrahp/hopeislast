import express from 'express';
const router = express.Router();
import { createFullSurvey, getUserDashboard, autoHideOldPlots, updatePlotStatus, getPlotDetails, getMapData, getAreaOptions, deleteUploadedFile, getPlotHistory, testMapData } from '../controllers/plotController.js';
import { predictDisease } from '../controllers/predictionController.js';

router.get('/details/:plotId', getPlotDetails);
router.get('/map-data', getMapData);
router.get('/test-map', testMapData);
router.get('/area-options', getAreaOptions);
router.get('/dashboard/:userId', getUserDashboard);
router.get('/history/:plotId', getPlotHistory);

router.put('/auto-hide/:userId', autoHideOldPlots);
router.put('/status/:plotId', updatePlotStatus);
router.post('/save-full-survey', createFullSurvey);
router.post('/predict', predictDisease);
router.delete('/:fileName', deleteUploadedFile);

export default router; // <-- ต้องมีบรรทัดนี้