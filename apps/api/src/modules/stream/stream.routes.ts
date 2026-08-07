import { Router } from 'express';
import { StreamController } from './stream.controller';

const router = Router({ mergeParams: true });

router.get('/', StreamController.streamUpdates);

export default router;
