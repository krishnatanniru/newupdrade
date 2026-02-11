
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { InventoryItem, UserRole } from '../types';

const Inventory: React.FC = () => {
  const { inventory, branches, addInventory, updateInventory, sellInventoryItem, users, currentUser } = useAppContext();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSellModalOpen, setSellModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'SUPPLEMENT' as const,
    price: 0,
    stock: 0,
    branchId: currentUser?.branchId || branches[0].id
  });

  const [sellData, setSellData] = useState({
    memberId: '',
    quantity: 1
  });

  const filteredInventory = currentUser?.role === UserRole.SUPER_ADMIN 
    ? inventory 
    : inventory.filter(i => i.branchId === currentUser?.branchId);

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setFormData({ name: '', category: 'SUPPLEMENT', price: 0, stock: 0, branchId: currentUser?.branchId || branches[0].id });
    setModalOpen(true);
  };

  const handleOpenSell = (item: InventoryItem) => {
    setSelectedItem(item);
    setSellData({ memberId: '', quantity: 1 });
    setSellModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateInventory(selectedItem.id, formData);
    } else {
      addInventory({ id: `inv-${Date.now()}`, ...formData });
    }
    setModalOpen(false);
  };

  const handleSell = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      sellInventoryItem(selectedItem.id, sellData.memberId, sellData.quantity);
      setSellModalOpen(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Inventory & POS</h2>
          <p className="text-gray-500">Retail management and stock replenishment</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <i className="fas fa-plus"></i> ADD ITEM
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredInventory.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group">
             <div className={`absolute top-0 right-0 w-2 h-full ${item.stock < 5 ? 'bg-red-500' : 'bg-green-500'}`}></div>
             <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">{item.category}</p>
             <h3 className="text-lg font-black text-slate-900 mb-1 truncate">{item.name}</h3>
             <p className="text-2xl font-black text-slate-900 mb-4">{formatCurrency(item.price)}</p>
             
             <div className="flex justify-between items-center border-t pt-4">
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">In Stock</p>
                   <p className={`font-black ${item.stock < 5 ? 'text-red-600' : 'text-slate-900'}`}>{item.stock} Units</p>
                </div>
                <button 
                  onClick={() => handleOpenSell(item)}
                  className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                >
                   <i className="fas fa-shopping-basket"></i>
                </button>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <h3 className="text-2xl font-bold mb-6">Inventory Entry</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Item Name" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <select className="w-full p-3 bg-gray-50 border rounded-xl outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                <option value="SUPPLEMENT">Supplement</option>
                <option value="GEAR">Gear</option>
                <option value="BEVERAGE">Beverage</option>
                <option value="OTHER">Other</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                 <input type="number" placeholder="Price" className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                 <input type="number" placeholder="Stock" className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
              </div>
              <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">SAVE ITEM</button>
              <button type="button" onClick={() => setModalOpen(false)} className="w-full py-2 text-gray-400">CANCEL</button>
            </form>
          </div>
        </div>
      )}

      {isSellModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight">Point of Sale</h3>
            <p className="text-slate-400 text-sm mb-6">Selling: {selectedItem.name}</p>
            <form onSubmit={handleSell} className="space-y-4">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Member (Bill To)</label>
                  <select required className="w-full p-3 bg-gray-50 border rounded-xl" value={sellData.memberId} onChange={e => setSellData({...sellData, memberId: e.target.value})}>
                     <option value="">Select Member...</option>
                     {users.filter(u => u.role === 'MEMBER').map(m => <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input type="number" min="1" max={selectedItem.stock} className="w-full p-3 bg-gray-50 border rounded-xl" value={sellData.quantity} onChange={e => setSellData({...sellData, quantity: Number(e.target.value)})} />
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center font-black">
                  <span className="text-slate-500 text-xs">TOTAL</span>
                  <span className="text-xl">{formatCurrency(selectedItem.price * sellData.quantity)}</span>
               </div>
               <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200">CONFIRM SALE</button>
               <button type="button" onClick={() => setSellModalOpen(false)} className="w-full py-2 text-gray-400">CANCEL</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
