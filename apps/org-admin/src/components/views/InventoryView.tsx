import React, { useState } from 'react';
import { InventoryItem, InventoryMovement, Product } from '@restaurant-saas/shared-schemas';
import { formatCurrency, getInventoryStatusMeta } from '@restaurant-saas/ui';
import { Boxes, Plus, ArrowDownRight, ArrowUpRight, AlertTriangle, ShieldCheck, RefreshCw, X, PackagePlus, Edit2, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { FormErrorAlert } from '../common/FormErrorAlert';
import { InventoryViewProps } from './InventoryView.types';

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  movements,
  products,
  onLogMovement,
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem
}) => {
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Deletion Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Movement Form State
  const [selectedItemId, setSelectedItemId] = useState(inventory[0]?.id || '');
  const [movementType, setMovementType] = useState<'purchase' | 'wastage' | 'adjustment'>('purchase');
  const [movementQty, setMovementQty] = useState<number>(5);

  // New/Edit Ingredient Item Form State
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState<'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'box' | 'portion'>('kg');
  const [currentQty, setCurrentQty] = useState<number>(20);
  const [reorderLevel, setReorderLevel] = useState<number>(5);
  const [unitCost, setUnitCost] = useState<number>(5.50);
  const [formError, setFormError] = useState<string | null>(null);

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || movementQty <= 0) return;
    const finalQty = movementType === 'wastage' ? -movementQty : movementQty;
    onLogMovement(selectedItemId, movementType, finalQty);
    setIsMovementModalOpen(false);
  };

  const handleNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!itemName || itemName.trim().length < 2) {
      setFormError("Ingredient name must be at least 2 characters.");
      return;
    }

    const payload = {
      name: itemName.trim(),
      unit,
      current_qty: Number(currentQty),
      reorder_level: Number(reorderLevel),
      unit_cost: Number(unitCost)
    };

    if (editingItem) {
      onUpdateInventoryItem(editingItem.id, payload);
      setEditingItem(null);
    } else {
      onAddInventoryItem(payload);
    }

    setItemName('');
    setIsNewItemModalOpen(false);
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setUnit(item.unit);
    setCurrentQty(Number(item.current_qty));
    setReorderLevel(Number(item.reorder_level));
    setUnitCost(Number(item.unit_cost));
    setFormError(null);
    setIsNewItemModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDeleteInventoryItem(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Raw Stock Inventory & Recipe Deductions</h2>
          <p className="text-xs text-graphite font-mono">Full CRUD management of raw ingredients, restocks, recipe links, and spoilage logs</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setEditingItem(null); setItemName(''); setFormError(null); setIsNewItemModalOpen(true); }}
            className="px-3.5 py-2 rounded-md bg-steel border border-mist text-ink text-xs font-bold hover:bg-mist/60 transition-all font-mono flex items-center gap-1.5"
          >
            <PackagePlus className="w-4 h-4 text-graphite" />
            <span>Add Raw Ingredient</span>
          </button>
          <button
            onClick={() => setIsMovementModalOpen(true)}
            className="px-4 py-2 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-2 shadow-sm font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>Log Stock Movement</span>
          </button>
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="border border-mist rounded-md bg-surface shadow-sm overflow-x-auto">
        <div className="p-4 border-b border-mist bg-steel/50 flex items-center justify-between">
          <h3 className="font-bold text-xs font-mono uppercase text-ink flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            <span>Raw Ingredient Stock Table</span>
          </h3>
          <span className="text-xs font-mono text-graphite">{inventory.length} items registered</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
            <tr>
              <th className="p-3">Ingredient Name</th>
              <th className="p-3">Unit</th>
              <th className="p-3">Current Stock</th>
              <th className="p-3">Reorder Threshold</th>
              <th className="p-3">Unit Cost</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {inventory.map(item => {
              const meta = getInventoryStatusMeta(item.status);
              return (
                <tr key={item.id} className="hover:bg-steel/40 transition-colors">
                  <td className="p-3 font-semibold text-ink">{item.name}</td>
                  <td className="p-3 font-mono text-graphite uppercase text-[11px]">{item.unit}</td>
                  <td className="p-3 font-mono font-bold text-ink tabular-nums text-sm">
                    {item.current_qty} {item.unit}
                  </td>
                  <td className="p-3 font-mono text-graphite tabular-nums">
                    {item.reorder_level} {item.unit}
                  </td>
                  <td className="p-3 font-mono text-ink tabular-nums">{formatCurrency(item.unit_cost)}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 ${meta.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColorClass}`} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEditItem(item)} className="p-1 text-graphite hover:text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm({ id: item.id, name: item.name })} className="p-1 text-graphite hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Create / Edit Raw Ingredient */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleNewItemSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-bold text-sm text-ink font-mono flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-primary" />
                <span>{editingItem ? 'Edit Raw Ingredient Stock' : 'Register New Raw Ingredient Stock'}</span>
              </h3>
              <button type="button" onClick={() => setIsNewItemModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <FormErrorAlert message={formError} onDismiss={() => setFormError(null)} className="mb-2" />
            )}

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-graphite block mb-1">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extra Virgin Olive Oil"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface text-ink font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-graphite block mb-1">Measurement Unit</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as any)}
                    className="w-full p-2 rounded border border-mist bg-surface"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="l">Liters (l)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="box">Boxes (box)</option>
                    <option value="portion">Portions</option>
                  </select>
                </div>

                <div>
                  <label className="text-graphite block mb-1">Unit Purchase Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitCost}
                    onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded border border-mist bg-surface font-bold text-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-graphite block mb-1">Stock Qty</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={currentQty}
                    onChange={e => setCurrentQty(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded border border-mist bg-surface font-bold text-primary"
                  />
                </div>

                <div>
                  <label className="text-graphite block mb-1">Reorder Level Alert Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={reorderLevel}
                    onChange={e => setReorderLevel(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded border border-mist bg-surface font-bold text-warning"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-mist">
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover font-mono shadow-sm"
              >
                {editingItem ? 'Save Changes' : 'Create Stock Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Stock Movement */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleMovementSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-sm text-ink border-b border-mist pb-3 font-mono">Log Ingredient Stock Movement</h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-graphite block mb-1">Select Ingredient</label>
                <select
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                  className="w-full p-2 rounded border border-mist text-xs bg-surface"
                >
                  {inventory.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (Current: {i.current_qty} {i.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-graphite block mb-1">Movement Type</label>
                <select
                  value={movementType}
                  onChange={e => setMovementType(e.target.value as any)}
                  className="w-full p-2 rounded border border-mist text-xs bg-surface"
                >
                  <option value="purchase">Stock Purchase / Restock (+)</option>
                  <option value="wastage">Wastage / Spoilage (-)</option>
                  <option value="adjustment">Manual Adjustment (+)</option>
                </select>
              </div>

              <div>
                <label className="text-graphite block mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.1"
                  value={movementQty}
                  onChange={e => setMovementQty(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded border border-mist text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMovementModalOpen(false)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover font-mono"
              >
                Record Movement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Standard Shadcn Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title="Delete Raw Ingredient Stock"
        message={`Are you sure you want to permanently delete '${deleteConfirm?.name}' from raw inventory?`}
        confirmText="Delete Stock Item"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
