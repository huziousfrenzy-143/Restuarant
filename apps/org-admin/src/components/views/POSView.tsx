import React from 'react';
import { formatCurrency } from '@restaurant-saas/ui';
import { Search, Plus, Minus, Trash2, CreditCard, CheckCircle2, User, Sparkles, Printer, X, Wallet, BookOpen, AlertCircle, Banknote, Zap, Info, ShoppingCart } from 'lucide-react';
import { usePOSController } from '../../features/pos/usePOSController';

export const POSView: React.FC = () => {

  const {
    products,
    categories,
    clients,
    paymentMethods,
    isLineMode,
    activeTaxRate,
    selectedCategory, setSelectedCategory,
    cart, setCart,
    searchQuery, setSearchQuery,
    clientSearchQuery, setClientSearchQuery,
    orderType, setOrderType,
    tableNo, setTableNo,
    selectedClientId, setSelectedClientId,
    discountPercent, setDiscountPercent,
    isChargeModalOpen, setIsChargeModalOpen,
    paymentMethod, setPaymentMethod,
    lastReceipt, setLastReceipt,
    isMobileCartOpen, setIsMobileCartOpen,
    customTaxPercent, setCustomTaxPercent,
    variantSelectionProduct, setVariantSelectionProduct,
    filteredProducts,
    filteredClients,
    selectedClient,
    addToCart,
    updateQty,
    removeFromCart,
    getCategoryName,
    subtotal,
    discountAmount,
    taxableTotal,
    tax,
    totalPayable,
    handleChargeSubmit
  } = usePOSController();

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] overflow-hidden font-sans relative">
      {/* Left Column: Category Tabs + Product Grid */}
      <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-y-auto space-y-4 pb-28 md:pb-4">
        {/* Category Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${selectedCategory === 'all'
                ? 'bg-primary text-white shadow-sm font-bold'
                : 'bg-surface border border-mist text-ink hover:bg-steel'
                }`}
            >
              <span>All Menu Items</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-steel text-graphite'}`}>
                {products.length}
              </span>
            </button>
            {categories.map(cat => {
              const count = products.filter(p => p.category_id === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${isSelected
                    ? 'bg-primary text-white shadow-sm font-bold'
                    : 'bg-surface border border-mist text-ink hover:bg-steel'
                    }`}
                >
                  <span>{cat.name}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-steel text-graphite'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Product Search Bar */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-graphite" />
            <input
              type="text"
              placeholder="Search dish or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-mist bg-surface text-xs text-ink placeholder-graphite font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {filteredProducts.map(product => {
            const inCart = cart.find(i => i.product_id === product.id);
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className={`rounded-xl border overflow-hidden text-left flex flex-col transition-all group h-full relative ${inCart
                  ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                  : 'border-mist bg-surface hover:border-graphite/40 hover:shadow-md'
                  }`}
              >
                {/* Quantity Badge overlay */}
                {inCart && (
                  <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary text-white font-mono font-bold text-[11px] flex items-center justify-center shadow-md">
                    {inCart.qty}
                  </div>
                )}

                {product.image_url ? (
                  <div className="h-32 w-full bg-steel border-b border-mist/30 overflow-hidden shrink-0 relative">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </div>
                ) : (
                  <div className="h-1 w-full bg-gradient-to-r from-steel to-mist shrink-0"></div>
                )}

                <div className="p-3.5 flex flex-col justify-between flex-1 w-full">
                  <div>
                    <p className="text-[10px] text-graphite font-mono mb-1 uppercase tracking-wide">{product.sku}</p>
                    <p className="font-bold text-[13px] text-ink leading-snug line-clamp-2 group-hover:text-primary transition-colors">{product.name}</p>
                    <span className="text-[10px] text-graphite font-medium  py-0.5  rounded-sm line-clamp-1 ">{getCategoryName(product.category_id)}</span>
                  </div>

                  <div className="pt-3 border-t border-mist/40 flex items-end justify-between w-full">
                    <span className="font-mono font-extrabold text-ink text-[13px] tabular-nums">{formatCurrency(product.price)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Mobile Cart Banner (Visible on mobile when cart has items) */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="md:hidden fixed bottom-16 inset-x-3 z-30 bg-primary text-white p-3 rounded-xl shadow-2xl flex items-center justify-between font-mono border border-white/20 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <div>
              <p className="font-bold text-xs">{cart.reduce((s, i) => s + i.qty, 0)} Items Selected</p>
              <p className="text-[10px] text-white/80 tabular-nums">Total: {formatCurrency(totalPayable)}</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="px-3.5 py-1.5 bg-white text-primary rounded-lg font-bold text-xs shadow-sm hover:bg-steel transition-all"
          >
            View Cart
          </button>
        </div>
      )}

      {/* Right Column: POS Cart Drawer (Responsive Modal on Mobile, Sidebar on Desktop) */}
      <div className={`w-full md:w-80  border-t md:border-t-0 md:border-l border-mist bg-surface flex flex-col justify-between shrink-0 shadow-lg z-20 ${isMobileCartOpen ? 'fixed inset-0 z-50 overflow-y-auto pt-safe pb-safe p-4' : 'hidden md:flex'
        }`}>
        {/* Cart Header */}
        <div className="p-4 border-b border-mist space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-ink flex items-center gap-2">
              <span>Order Cart</span>
              <span className="text-xs font-mono bg-steel px-2 py-0.5 rounded text-graphite">
                {cart.reduce((s, i) => s + i.qty, 0)} items
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="text-xs text-graphite hover:text-danger disabled:opacity-30 transition-colors"
              >
                Clear Cart
              </button>
              {isMobileCartOpen && (
                <button
                  onClick={() => setIsMobileCartOpen(false)}
                  className="md:hidden p-1.5 rounded-md border border-mist text-graphite hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Order Type Selector */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-steel rounded-md text-xs font-medium font-mono">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`py-1.5 rounded transition-all ${orderType === 'dine_in' ? 'bg-surface text-ink font-bold shadow-sm' : 'text-graphite hover:text-ink'
                }`}
            >
              Dine-In
            </button>
            <button
              onClick={() => setOrderType('takeaway')}
              className={`py-1.5 rounded transition-all ${orderType === 'takeaway' ? 'bg-surface text-ink font-bold shadow-sm' : 'text-graphite hover:text-ink'
                }`}
            >
              Takeaway
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`py-1.5 rounded transition-all ${orderType === 'delivery' ? 'bg-surface text-ink font-bold shadow-sm' : 'text-graphite hover:text-ink'
                }`}
            >
              Delivery
            </button>
          </div>

          {orderType === 'dine_in' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-graphite">Table #:</span>
              <input
                type="text"
                value={tableNo}
                onChange={e => setTableNo(e.target.value)}
                className="w-20 p-1 px-2 rounded border border-mist bg-surface text-xs font-mono font-bold text-ink"
              />
            </div>
          )}

          {/* Customer CRM Search & Selection */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-graphite uppercase font-semibold block">Select Customer / Account Search</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-graphite" />
              <input
                type="text"
                placeholder="Search client name or phone..."
                value={clientSearchQuery}
                onChange={e => setClientSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded border border-mist bg-surface text-xs font-mono text-ink placeholder-graphite"
              />
            </div>

            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full p-1.5 rounded border border-mist bg-surface text-xs font-mono text-ink font-semibold"
            >
              {
                !clientSearchQuery.length && <option value="">Walk-in Customer</option>
              }
              {
                filteredClients.length === 0 && <option value="">No customer found</option>
              }
              {filteredClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone.slice(0, 7) + "..."}) {c.credit_balance > 0 ? `Due: ${formatCurrency(c.credit_balance)}` : ''}
                </option>
              ))
              }
            </select>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-4 overflow-y-auto divide-y divide-mist space-y-3 font-sans">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-graphite space-y-2 font-mono text-xs py-12">
              <ShoppingCart className="w-8 h-8 text-mist" />
              <p>Cart is empty</p>
              <p className="text-[10px] text-graphite/70">Click dishes on the left to add to order ticket</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-xs text-ink leading-tight">{item.product_name}</h4>
                  <p className="text-[11px] font-mono text-graphite tabular-nums">
                    {formatCurrency(item.unit_price)} × {item.qty} = <span className="font-bold text-ink">{formatCurrency(item.unit_price * item.qty)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.id!, -1)}
                    className="p-1 rounded bg-steel border border-mist hover:bg-mist text-ink"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-xs">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id!, 1)}
                    className="p-1 rounded bg-steel border border-mist hover:bg-mist text-ink"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id!)}
                    className="p-1 text-graphite hover:text-danger ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Checkout Trigger */}
        <div className="p-4 border-t border-mist bg-steel/30 space-y-3 font-mono">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-graphite">
              <span>Subtotal</span>
              <span className="tabular-nums font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount selector */}
            <div className="flex items-center justify-between text-graphite">
              <span className="flex items-center gap-1">
                <span>Discount</span>
                <select
                  value={discountPercent}
                  onChange={e => setDiscountPercent(Number(e.target.value))}
                  className="p-0.5 text-[10px] rounded border border-mist bg-surface"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={20}>20%</option>
                </select>
              </span>
              <span className="tabular-nums font-semibold text-danger">-{formatCurrency(discountAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-graphite">
              <span className="flex items-center gap-1.5 text-xs">
                <span>Tax Rate</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={activeTaxRate}
                  onChange={(e) => setCustomTaxPercent(Math.max(0, Number(e.target.value)))}
                  className="w-14 px-1.5 py-0.5 rounded border border-mist text-xs font-mono font-semibold bg-white text-ink text-center focus:outline-none focus:border-primary shadow-inner"
                />
                <span>%</span>
              </span>
              <span className="tabular-nums font-semibold text-xs">{formatCurrency(tax)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-ink pt-1 border-t border-mist">
              <span>Total Payable</span>
              <span className="tabular-nums text-base text-primary">{formatCurrency(totalPayable)}</span>
            </div>
          </div>

          <button
            onClick={() => setIsChargeModalOpen(true)}
            disabled={cart.length === 0}
            className="w-full py-3 rounded-md bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-all shadow-md disabled:opacity-40 disabled:hover:bg-primary flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Charge {formatCurrency(totalPayable)}</span>
          </button>
        </div>
      </div>

      {/* Charge & Payment Modal */}
      {isChargeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-bold text-sm text-ink font-mono flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Select Payment Register</span>
              </h3>
              <button onClick={() => setIsChargeModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded bg-steel border border-mist text-center space-y-1">
                <span className="text-[10px] text-graphite uppercase font-semibold">Total Order Amount</span>
                <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(totalPayable)}</p>
                {selectedClient && (
                  <p className="text-[11px] text-graphite">Customer: <strong>{selectedClient.name}</strong></p>
                )}
              </div>

              <div>
                <label className="text-graphite block mb-1">Choose Payment Method / Register</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded border text-left flex items-center gap-2 font-bold transition-all ${paymentMethod === 'cash' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-mist text-ink hover:bg-steel'
                      }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash Register</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded border text-left flex items-center gap-2 font-bold transition-all ${paymentMethod === 'card' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-mist text-ink hover:bg-steel'
                      }`}
                  >
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    <span>Credit / Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('borrow_credit')}
                    className={`p-3 rounded border text-left flex items-center gap-2 font-bold transition-all col-span-2 ${paymentMethod === 'borrow_credit' ? 'bg-amber-500/10 border-amber-500 text-amber-700' : 'bg-surface border-mist text-ink hover:bg-steel'
                      }`}
                  >
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="font-bold">Borrow / Add to Customer Credit</p>
                      <p className="text-[10px] font-normal text-graphite">Appends balance to client ledger</p>
                    </div>
                  </button>

                  {paymentMethods.map(pm => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.code)}
                      className={`p-3 rounded border text-left flex items-center gap-2 font-bold transition-all ${paymentMethod === pm.code ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-mist text-ink hover:bg-steel'
                        }`}
                    >
                      <Wallet className="w-4 h-4 text-primary" />
                      <span>{pm.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2 border-t border-mist">
                <button
                  type="button"
                  onClick={() => setIsChargeModalOpen(false)}
                  className="flex-1 py-2.5 rounded border border-mist font-semibold text-graphite hover:bg-steel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleChargeSubmit}
                  className="flex-1 py-2.5 rounded bg-primary text-white font-bold hover:bg-primary-hover shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Modal */}
      {lastReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-mist rounded-lg shadow-2xl w-full max-w-xs p-6 space-y-4 font-mono">
            <div className="text-center border-b border-mist pb-3 space-y-1">
              <h3 className="font-bold text-base text-ink">SAFFRON GRILL</h3>
              <p className="text-[10px] text-graphite">Receipt #{lastReceipt.order_number}</p>
              <p className="text-[10px] text-graphite">{new Date(lastReceipt.created_at).toLocaleString()}</p>
            </div>

            <div className="space-y-2 text-xs divide-y divide-mist/60">
              {lastReceipt.items.map((item: any) => (
                <div key={item.product_id} className="pt-2 first:pt-0 flex justify-between">
                  <div>
                    <p className="font-semibold text-ink">{item.product_name}</p>
                    <p className="text-[10px] text-graphite">{item.qty} × {formatCurrency(item.unit_price)}</p>
                  </div>
                  <span className="font-bold text-ink tabular-nums">{formatCurrency(item.qty * item.unit_price)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-mist space-y-1 text-xs">
              <div className="flex justify-between text-graphite">
                <span>Subtotal</span>
                <span>{formatCurrency(lastReceipt.subtotal)}</span>
              </div>
              <div className="flex justify-between text-graphite">
                <span>Tax ({activeTaxRate}%)</span>
                <span>{formatCurrency(lastReceipt.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-ink text-sm pt-1 border-t border-mist">
                <span>Total Paid</span>
                <span className="text-primary">{formatCurrency(lastReceipt.total)}</span>
              </div>
              <p className="text-[10px] text-graphite uppercase text-center pt-1 font-bold">Method: {lastReceipt.paymentMethod}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setLastReceipt(null)}
                className="flex-1 py-2 rounded bg-steel border border-mist text-xs font-bold text-ink hover:bg-mist"
              >
                Close
              </button>
              <button
                onClick={() => { window.print(); setLastReceipt(null); }}
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {variantSelectionProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-mist rounded-lg shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-bold text-base text-ink flex items-center gap-2">
                <span>Select Size: {variantSelectionProduct.name}</span>
              </h3>
              <button onClick={() => setVariantSelectionProduct(null)} className="text-graphite hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-none">
              {variantSelectionProduct.variants?.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => addToCart(variantSelectionProduct, variant)}
                  className="w-full p-4 rounded-lg border border-mist bg-surface hover:border-primary hover:bg-steel transition-all flex items-center justify-between group"
                >
                  <span className="font-bold text-sm text-ink group-hover:text-primary transition-colors">{variant.name}</span>
                  <span className="font-mono font-bold text-sm text-primary">{formatCurrency(variant.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
