import { Router } from 'express';
import { ProductController } from './product.controller';

const router = Router({ mergeParams: true });

router.get('/products', ProductController.getProducts);
router.post('/products', ProductController.createProduct);
router.put('/products/:id', ProductController.updateProduct);
router.delete('/products/:id', ProductController.deleteProduct);

router.get('/categories', ProductController.getCategories);
router.post('/categories', ProductController.createCategory);
router.put('/categories/:id', ProductController.updateCategory);
router.delete('/categories/:id', ProductController.deleteCategory);

export default router;
