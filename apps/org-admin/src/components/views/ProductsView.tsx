import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductCategory, InventoryItem } from '@restaurant-saas/shared-schemas';
import { formatCurrency } from '@restaurant-saas/ui';
import { UtensilsCrossed, Plus, FolderPlus, Edit2, Trash2, Search, Tag, X, Image as ImageIcon, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { Pagination } from '../common/Pagination';
import { FormErrorAlert } from '../common/FormErrorAlert';
import { API_BASE_URL } from '../../config/api';

interface ProductsViewProps {
  products: Product[];
  categories: ProductCategory[];
  inventory: InventoryItem[];
  onAddProduct: (newProd: any) => void;
  onUpdateProduct: (id: string, updates: any) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory: (newCat: any) => void;
  onUpdateCategory: (id: string, updates: any) => void;
  onDeleteCategory: (id: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  inventory,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Category selection filter & search query
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(9);

  // Deletion Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'product' | 'category'; id: string; name: string } | null>(null);

  // Product Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [price, setPrice] = useState<number>(15.00);
  const [costPrice, setCostPrice] = useState<number>(4.50);
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [recipeItems, setRecipeItems] = useState<{ id: string; qty: number }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-calculate cost price when recipe items change
  useEffect(() => {
    if (recipeItems.length > 0) {
      const calculatedCost = recipeItems.reduce((acc, ri) => {
        const invItem = inventory.find(i => i.id === ri.id);
        if (invItem) {
          return acc + (Number(invItem.unit_cost) * ri.qty);
        }
        return acc;
      }, 0);
      setCostPrice(Number(calculatedCost.toFixed(2)));
    }
  }, [recipeItems, inventory]);

  // Category Form State
  const [categoryName, setCategoryName] = useState('');

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Paginated Products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Str = reader.result as string;
        const token = localStorage.getItem('org_admin_token');

        const res = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ image: base64Str, folder: 'restaurant_saas_products' })
        });

        const json = await res.json();
        if (res.ok && json.data?.url) {
          setImageUrl(json.data.url);
          setFormError(null);
        } else {
          setFormError(json.error?.message || 'Failed to upload image to Cloudinary');
        }
      } catch (err: any) {
        setFormError('Cloudinary Upload Error: ' + err.message);
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !categoryId) return;

    const selectedCategoryObj = categories.find(c => c.id === categoryId);

    const recipe = recipeItems.map(ri => {
      const inv = inventory.find(i => i.id === ri.id);
      if (!inv) return null;
      return { inventory_item_id: inv.id, inventory_item_name: inv.name, qty_required: ri.qty, unit: inv.unit };
    }).filter(Boolean);

    const payload = {
      category_id: categoryId,
      category_name: selectedCategoryObj ? selectedCategoryObj.name : 'General',
      name,
      price: Number(price),
      cost_price: Number(costPrice),
      sku,
      is_available: true,
      image_url: imageUrl,
      recipe
    };

    if (editingProduct) {
      onUpdateProduct(editingProduct.id, payload);
      setEditingProduct(null);
    } else {
      onAddProduct(payload);
    }

    setName('');
    setSku('');
    setImageUrl('');
    setRecipeItems([]);
    setFormError(null);
    setIsProductModalOpen(false);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategoryId(prod.category_id);
    setPrice(Number(prod.price));
    setCostPrice(Number(prod.cost_price));
    setSku(prod.sku);
    setImageUrl(prod.image_url || '');
    if (prod.recipe && prod.recipe.length > 0) {
      setRecipeItems(prod.recipe.map(r => ({ id: r.inventory_item_id, qty: Number(r.qty_required) })));
    } else {
      setRecipeItems([]);
    }
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;

    if (editingCategory) {
      onUpdateCategory(editingCategory.id, { name: categoryName });
      setEditingCategory(null);
    } else {
      onAddCategory({ name: categoryName, sort_order: categories.length + 1 });
    }

    setCategoryName('');
    setIsCategoryModalOpen(false);
  };

  const openEditCategory = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setIsCategoryModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'product') {
      onDeleteProduct(deleteConfirm.id);
    } else {
      onDeleteCategory(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Menu Catalog & Product Recipes</h2>
          <p className="text-xs text-graphite font-mono">Full CRUD control over menu categories, prices, costs, SKUs, Cloudinary dish images, and stock recipes</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingCategory(null); setCategoryName(''); setIsCategoryModalOpen(true); }}
            className="px-3.5 py-2 rounded-md bg-steel border border-mist text-ink text-xs font-bold hover:bg-mist/60 transition-all font-mono flex items-center gap-1.5 shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-graphite" />
            <span>Add Category</span>
          </button>
          <button
            onClick={() => { setEditingProduct(null); setName(''); setSku(''); setImageUrl(''); setRecipeItems([]); setFormError(null); setIsProductModalOpen(true); }}
            className="px-4 py-2 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-2 shadow-sm font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Dish</span>
          </button>
        </div>
      </div>

      {/* Category Pills Header & Search Bar */}
      <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sleek Pill Tabs Container */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
            <button
              onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-primary text-white shadow-sm font-bold'
                  : 'bg-steel border border-mist text-graphite hover:text-ink hover:bg-mist/50'
              }`}
            >
              <span>All Dishes</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-mist text-graphite'}`}>
                {products.length}
              </span>
            </button>

            {categories.map(cat => {
              const catProdCount = products.filter(p => p.category_id === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`group relative flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm font-bold'
                      : 'bg-surface border border-mist text-ink hover:border-primary/50 hover:bg-steel'
                  }`}
                  onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                >
                  <span>{cat.name}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-steel text-graphite'}`}>
                    {catProdCount}
                  </span>

                  <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }}
                      title="Edit Category"
                      className={`p-0.5 rounded hover:bg-black/10 ${isSelected ? 'text-white' : 'text-graphite hover:text-primary'}`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'category', id: cat.id, name: cat.name }); }}
                      title="Delete Category"
                      className={`p-0.5 rounded hover:bg-black/10 ${isSelected ? 'text-white' : 'text-graphite hover:text-red-600'}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Product Search Input */}
          <div className="relative w-full sm:w-64 flex-shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-graphite" />
            <input
              type="text"
              placeholder="Search dish name, SKU..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 rounded-md border border-mist text-xs font-mono text-ink placeholder-graphite bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        {paginatedProducts.length === 0 ? (
          <div className="p-12 text-center border border-mist rounded-md bg-surface font-mono text-xs text-graphite">
            No menu items found matching the current search or category filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProducts.map(prod => (
              <div key={prod.id} className="p-4 rounded-md border border-mist bg-surface shadow-sm hover:shadow transition-all space-y-3 relative group overflow-hidden">
                {/* Cloudinary Dish Image Thumbnail */}
                {prod.image_url ? (
                  <div className="h-40 w-full rounded-md overflow-hidden bg-steel border border-mist relative group-hover:scale-[1.01] transition-transform">
                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-28 w-full rounded-md bg-steel/60 border border-mist flex items-center justify-center text-graphite font-mono text-xs">
                    <ImageIcon className="w-6 h-6 text-graphite/40 mr-1.5" />
                    <span>No Dish Image</span>
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <span className="font-mono text-[11px] text-graphite uppercase font-bold">{prod.sku}</span>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      prod.is_available ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {prod.is_available ? 'Available' : 'Unavailable'}
                    </span>
                    <button onClick={() => openEditProduct(prod)} className="p-1 text-graphite hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteConfirm({ type: 'product', id: prod.id, name: prod.name })} className="p-1 text-graphite hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-ink">{prod.name}</h3>
                  <p className="text-xs text-graphite font-medium">{prod.category_name}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-mist font-mono text-xs">
                  <div>
                    <span className="text-graphite block text-[10px]">RETAIL PRICE</span>
                    <span className="font-bold text-ink text-sm tabular-nums">{formatCurrency(prod.price)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-graphite block text-[10px]">INGREDIENT COST</span>
                    <span className="font-bold text-graphite tabular-nums">{formatCurrency(prod.cost_price)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredProducts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Create / Edit Product Modal with Cloudinary Upload */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleProductSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-mist pb-3 font-mono">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
                <span>{editingProduct ? 'Edit Menu Item' : 'Create New Menu Item'}</span>
              </h3>
              <button type="button" onClick={() => setIsProductModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && <FormErrorAlert message={formError} onDismiss={() => setFormError(null)} className="mb-2" />}

            <div className="space-y-3 text-xs font-mono">
              {/* Cloudinary Dish Image Upload Input */}
              <div className="p-3 bg-steel/50 border border-mist rounded space-y-2">
                <label className="text-graphite block font-semibold flex items-center justify-between">
                  <span>Cloudinary Dish Image</span>
                  {imageUrl && <span className="text-emerald-700 text-[10px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Uploaded</span>}
                </label>

                {imageUrl && (
                  <div className="h-28 w-full rounded border border-mist overflow-hidden relative">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded hover:bg-black"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer py-2 px-3 rounded border border-dashed border-mist hover:border-primary bg-surface text-ink text-center flex items-center justify-center gap-2 transition-all">
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <span>Uploading to Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-primary" />
                        <span>{imageUrl ? 'Change Image' : 'Upload Image to Cloudinary'}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-graphite block mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Truffle Mushroom Pasta"
                  value={name}
                  onChange={e => {
                    const nameVal = e.target.value;
                    setName(nameVal);
                    if (!sku && !editingProduct) setSku(`DISH-${nameVal.substring(0, 3).toUpperCase()}-01`);
                  }}
                  className="w-full p-2 rounded border border-mist bg-surface text-ink font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-graphite block mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full p-2 rounded border border-mist bg-surface font-semibold"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-graphite block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full p-2 rounded border border-mist bg-surface font-bold text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-graphite block mb-1">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded border border-mist bg-surface font-bold text-ink"
                  />
                </div>
                <div>
                  <label className="text-graphite block mb-1">Ingredient Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={e => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded border border-mist bg-surface font-bold text-graphite"
                  />
                </div>
              </div>

              {/* Recipe Stock Link */}
              <div className="p-3 bg-steel/50 border border-mist rounded space-y-2">
                <label className="text-graphite block font-semibold flex justify-between items-center">
                  <span>Link Raw Stock for Auto-Deduction</span>
                  <button type="button" onClick={() => setRecipeItems([...recipeItems, { id: inventory[0]?.id || '', qty: 0 }])} className="text-primary hover:text-primary-hover text-[10px] flex items-center gap-1 font-bold"><Plus className="w-3 h-3"/> Add Ingredient</button>
                </label>
                {recipeItems.map((ri, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={ri.id}
                      onChange={e => {
                        const newItems = [...recipeItems];
                        newItems[index].id = e.target.value;
                        setRecipeItems(newItems);
                      }}
                      className="flex-1 p-1.5 rounded border border-mist bg-surface text-xs"
                    >
                      {inventory.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.05"
                      value={ri.qty}
                      onChange={e => {
                        const newItems = [...recipeItems];
                        newItems[index].qty = parseFloat(e.target.value) || 0;
                        setRecipeItems(newItems);
                      }}
                      className="w-24 p-1.5 rounded border border-mist bg-surface text-xs font-bold"
                      placeholder="Qty"
                    />
                    <button type="button" onClick={() => {
                        const newItems = recipeItems.filter((_, i) => i !== index);
                        setRecipeItems(newItems);
                    }} className="text-graphite hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
                {recipeItems.length === 0 && <p className="text-[10px] text-graphite">No raw stock linked yet.</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-mist font-mono">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingImage}
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm disabled:opacity-50"
              >
                {editingProduct ? 'Save Changes' : 'Create Menu Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCategorySubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-bold text-sm text-ink font-mono">{editingCategory ? 'Edit Category' : 'Create Category'}</h3>
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-mono text-graphite block mb-1">Category Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Seafood Specialties"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                className="w-full p-2 rounded border border-mist bg-surface text-xs font-mono font-bold"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-mist font-mono">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm"
              >
                {editingCategory ? 'Save Category' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Standard Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title={deleteConfirm?.type === 'product' ? 'Delete Menu Dish' : 'Delete Menu Category'}
        message={`Are you sure you want to permanently delete '${deleteConfirm?.name}'? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
