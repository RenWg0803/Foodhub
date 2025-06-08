"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

interface Payment {
  id: string;
  total_amount: number;
  created_at: string;
}

interface MonthlyRevenue {
  month: string;
  total: number;
}

export default function OwnerDashboard({ params }: { params: { slug: string } }) {
  const [activeTab, setActiveTab] = useState('home');
  const [favoriteMenus, setFavoriteMenus] = useState<FavoriteMenu[]>([]);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [stockOrders, setStockOrders] = useState<number>(0);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequest[]>([]);
  const [menuForm, setMenuForm] = useState({ name: '', description: '', price: '', image_url: '' });
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editMenu, setEditMenu] = useState<MenuItem | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const fetchRestaurant = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', params.slug)
        .single();
      if (error) return console.error('Error fetching restaurant:', error);
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
        .select('id, total_amount, created_at')
        .eq('restaurant_id', restaurantId);

      const profit = paymentsData?.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
      setTotalProfit(profit || 0);
      setPayments(paymentsData || []);

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

      // Generate monthly revenue data
      if (paymentsData) {
        const monthlyMap: { [key: string]: number } = {};
        paymentsData.forEach((payment) => {
          const date = new Date(payment.created_at);
          const month = date.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
          monthlyMap[month] = (monthlyMap[month] || 0) + payment.total_amount;
        });

        const monthly = Object.entries(monthlyMap)
          .map(([month, total]) => ({ month, total }))
          .sort((a, b) => new Date('1 ' + a.month).getTime() - new Date('1 ' + b.month).getTime());

        setMonthlyRevenue(monthly);
      }
    };

    fetchData();
  }, [restaurantId]);

  const approveEmployee = async (id: string) => {
    const { error } = await supabase.from('employees').update({ status: 'approved' }).eq('id', id);
    if (!error) setEmployeeRequests((prev) => prev.filter((e) => e.id !== id));
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
    }
  };

  const handleMenuUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMenu) return;
    const { error } = await supabase.from('menus').update(editMenu).eq('id', editMenu.id);
    if (!error) {
      setMenus(menus.map((m) => (m.id === editMenu.id ? editMenu : m)));
      setEditMenu(null);
    }
  };

  const handleMenuDelete = async (id: string) => {
    const { error } = await supabase.from('menus').delete().eq('id', id);
    if (!error) setMenus(menus.filter((m) => m.id !== id));
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

        <main className="flex-1 p-6 space-y-8">
          {activeTab === 'sales' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Laporan Keuangan</h2>
              <div className="bg-gray-800 p-4 rounded mb-6">
                <h3 className="font-semibold mb-2">Pendapatan per Bulan</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#FFA500" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-semibold mb-2">Detail Pembayaran</h3>
                <table className="w-full text-left table-auto">
                  <thead>
                    <tr>
                      <th className="p-2">Tanggal</th>
                      <th className="p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-gray-700">
                        <td className="p-2">{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="p-2">Rp {p.total_amount.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Tab lainnya masih tersedia: menu, employees, dll */}
        </main>
      </div>
    </div>
  );
}
