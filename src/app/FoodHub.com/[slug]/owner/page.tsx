"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface FavoriteMenu {
  menu_id: string;
  name: string;
  total_reviews: number;
}

interface EmployeeRequest {
  id: string;
  user_id: string;
  role: string;
  status: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_discount_active: boolean;
  discount: number;
  discount_expiry: string | null;
  image_url?: string;
  description?: string;
}

export default function OwnerDashboard({ params }: { params: { slug: string } }) {
  const [activeTab, setActiveTab] = useState('home');
  const [favoriteMenus, setFavoriteMenus] = useState<FavoriteMenu[]>([]);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [stockOrders, setStockOrders] = useState<number>(0);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequest[]>([]);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    image_url: ''
  });
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editMenu, setEditMenu] = useState<MenuItem | null>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', params.slug)
        .single();

      if (error) {
        console.error('Error fetching restaurant:', error);
        return;
      }

      setRestaurantId(data.id);
    };

    fetchRestaurant();
  }, [params.slug]);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      const { data: topMenus } = await supabase.rpc('get_top_menus', { restaurant_id: restaurantId });
      setFavoriteMenus(topMenus ?? []);

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('total_amount')
        .eq('restaurant_id', restaurantId);

      const profit = paymentsData?.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
      setTotalProfit(profit || 0);

      const { count } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('category', 'bahan');

      setStockOrders(count || 0);

      const { data: pendingEmployees } = await supabase
        .from('employees')
        .select('id, user_id, role, status')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending');

      setEmployeeRequests(pendingEmployees || []);

      const { data: menuData } = await supabase
        .from('menus')
        .select('*')
        .eq('restaurant_id', restaurantId);

      setMenus(menuData || []);
    };

    fetchData();
  }, [restaurantId]);

  const approveEmployee = async (id: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ status: 'approved' })
      .eq('id', id);

    if (!error) {
      setEmployeeRequests((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    const newMenu = {
      id: uuidv4(),
      restaurant_id: restaurantId,
      name: menuForm.name,
      description: menuForm.description,
      price: parseFloat(menuForm.price),
      image_url: menuForm.image_url,
      is_discount_active: false,
      discount: 0,
      discount_expiry: null,
    };

    const { error } = await supabase.from('menus').insert(newMenu);

    if (!error) {
      alert('Menu berhasil ditambahkan!');
      setMenuForm({ name: '', description: '', price: '', image_url: '' });
      setShowAddMenu(false);
      setMenus([...menus, newMenu]);
    } else {
      console.error(error);
    }
  };

  const handleMenuUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMenu) return;

    const { error } = await supabase
      .from('menus')
      .update(editMenu)
      .eq('id', editMenu.id);

    if (!error) {
      setMenus(menus.map((m) => (m.id === editMenu.id ? editMenu : m)));
      setEditMenu(null);
    } else {
      console.error('Gagal mengedit menu:', error);
    }
  };

  const handleMenuDelete = async (id: string) => {
    const { error } = await supabase.from('menus').delete().eq('id', id);
    if (!error) {
      setMenus(menus.filter((m) => m.id !== id));
    }
  };

  const updateDiscount = async (id: string, discount: number, expiry: string, active: boolean) => {
    const { error } = await supabase
      .from('menus')
      .update({ discount, discount_expiry: expiry, is_discount_active: active })
      .eq('id', id);

    if (!error) {
      setMenus((prev) =>
        prev.map((m) => (m.id === id ? { ...m, discount, discount_expiry: expiry, is_discount_active: active } : m))
      );
    } else {
      console.error('Failed to update discount', error);
    }
  };

  const tabs = [
    { name: 'Home', key: 'home' },
    { name: 'Menu', key: 'menu' },
    { name: 'Sales Report', key: 'sales' },
    { name: 'Stock Purchase', key: 'stock' },
    { name: 'Employee Request', key: 'employees' }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="bg-[#FFA500] px-6 py-4 shadow-md">
        <h1 className="text-2xl font-bold">Dashboard Owner - {params.slug}</h1>
      </header>

      <div className="flex flex-col lg:flex-row">
        <aside className="bg-gray-900 w-full lg:w-64 p-4 border-r border-gray-800">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-all
                  ${
                    activeTab === tab.key
                      ? 'bg-[#FFA500] text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {activeTab === 'menu' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Daftar Menu</h2>
                <button
                  className="bg-[#FFA500] text-white px-4 py-2 rounded"
                  onClick={() => setShowAddMenu(true)}
                >
                  Tambah Menu
                </button>
              </div>
              {showAddMenu && (
                <form onSubmit={handleMenuSubmit} className="space-y-4 bg-gray-800 p-4 rounded">
                  <input
                    type="text"
                    placeholder="Nama menu"
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                    required
                  />
                  <textarea
                    placeholder="Deskripsi"
                    value={menuForm.description}
                    onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Harga"
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="URL Gambar"
                    value={menuForm.image_url}
                    onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                  />
                  <div className="flex justify-between">
                    <button type="submit" className="bg-[#FFA500] px-4 py-2 rounded text-white">Simpan</button>
                    <button type="button" onClick={() => setShowAddMenu(false)} className="text-red-400">Batal</button>
                  </div>
                </form>
              )}
              <ul className="space-y-4">
                {menus.map((menu) => (
                  <li key={menu.id} className="bg-gray-800 p-4 rounded">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">{menu.name}</h3>
                        <p className="text-sm text-gray-400">{menu.description}</p>
                        <p>Rp {menu.price.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="space-x-2">
                        <button className="bg-blue-500 px-2 py-1 rounded" onClick={() => setEditMenu(menu)}>Edit</button>
                        <button className="bg-red-500 px-2 py-1 rounded" onClick={() => handleMenuDelete(menu.id)}>Hapus</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {editMenu && (
                <form onSubmit={handleMenuUpdate} className="space-y-4 bg-gray-800 p-4 rounded">
                  <h2 className="text-lg font-bold">Edit Menu</h2>
                  <input
                    type="text"
                    placeholder="Nama menu"
                    value={editMenu.name}
                    onChange={(e) => setEditMenu({ ...editMenu, name: e.target.value })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                  />
                  <textarea
                    placeholder="Deskripsi"
                    value={editMenu.description || ''}
                    onChange={(e) => setEditMenu({ ...editMenu, description: e.target.value })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editMenu.price}
                    onChange={(e) => setEditMenu({ ...editMenu, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                  />
                  <input
                    type="text"
                    placeholder="URL Gambar"
                    value={editMenu.image_url || ''}
                    onChange={(e) => setEditMenu({ ...editMenu, image_url: e.target.value })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                  />
                  <label className="block text-sm">Diskon Aktif:</label>
                  <input
                    type="checkbox"
                    checked={editMenu.is_discount_active}
                    onChange={(e) => setEditMenu({ ...editMenu, is_discount_active: e.target.checked })}
                  />
                  <input
                    type="number"
                    placeholder="Persentase Diskon"
                    value={editMenu.discount}
                    onChange={(e) => setEditMenu({ ...editMenu, discount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                  />
                  <input
                    type="datetime-local"
                    value={editMenu.discount_expiry || ''}
                    onChange={(e) => setEditMenu({ ...editMenu, discount_expiry: e.target.value })}
                    className="w-full px-4 py-2 rounded bg-gray-900 text-white"
                  />
                  <div className="flex justify-between">
                    <button type="submit" className="bg-green-600 px-4 py-2 rounded">Update</button>
                    <button type="button" onClick={() => setEditMenu(null)} className="text-red-400">Batal</button>
                  </div>
                </form>
              )}
            </div>
          )}
          {activeTab === 'employees' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Permintaan Karyawan</h2>
              {employeeRequests.length === 0 ? (
                <p>Tidak ada permintaan baru.</p>
              ) : (
                <ul className="space-y-4">
                  {employeeRequests.map((e) => (
                    <li key={e.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
                      <span>User ID: {e.user_id} | Role: {e.role}</span>
                      <button
                        onClick={() => approveEmployee(e.id)}
                        className="bg-[#FFA500] text-white px-4 py-2 rounded"
                      >
                        Setujui
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
