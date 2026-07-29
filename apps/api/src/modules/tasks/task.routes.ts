import { Router } from 'express';
import { TaskController } from './task.service';

const router = Router({ mergeParams: true });

router.get('/', TaskController.getTasks);
router.post('/', TaskController.createTask);
router.put('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);
router.patch('/:id/status', TaskController.updateStatus);

export default router;
