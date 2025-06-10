"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter, useParams } from 'next/navigation'

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

export default function OwnerDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const [activeTab, setActiveTab] = useState('home');
  const [favoriteMenus, setFavoriteMenus] = useState<FavoriteMenu[]>([]);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [stockOrders, setStockOrders] = useState<number>(0);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequest[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [slug, setSlug] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter()

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    
    const fetchRestaurant = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error fetching restaurant:', error);
        return;
      }

      setRestaurantId(data.id);
    };

    fetchRestaurant();
  }, [slug]);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      setIsLoading(true);
      
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
      
      setIsLoading(false);
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

  const navigationButtons = [
    { name: 'Dashboard', path: `/FoodHub.com/${slug}/owner`, icon: '🏠' },
    { name: 'Menu Management', path: `/FoodHub.com/${slug}/owner/menu`, icon: '🍽️' },
    { name: 'Table Management', path: `/FoodHub.com/${slug}/owner/table`, icon: '🪑' },
    { name: 'Employee Management', path: `/FoodHub.com/${slug}/owner/employee`, icon: '👥' },
    { name: 'Stock Management', path: `/FoodHub.com/${slug}/owner/stock`, icon: '📦' },
  ];

  const tabs = [
    { name: 'Dashboard Overview', key: 'home', icon: '📊' },
    { name: 'Sales Report', key: 'sales', icon: '💰' },
  ];

  const StatCard = ({ title, value, icon, color = "blue", delay = 0 }: { 
    title: string; 
    value: string | number; 
    icon: string; 
    color?: string;
    delay?: number;
  }) => (
    <div 
      className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-${color}-500 transform transition-all duration-500 hover:scale-105 hover:shadow-xl animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600 mt-2`}>{value}</p>
        </div>
        <div className={`text-4xl bg-${color}-100 p-3 rounded-full`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-slide-in-left {
          animation: slideInLeft 0.5s ease-out forwards;
        }
        
        .animate-pulse-gentle {
          animation: pulse 2s infinite;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Header */}
      <header className="glass-effect shadow-lg sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold animate-pulse-gentle">
                🏪
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Restaurant Dashboard</h1>
                <p className="text-sm text-gray-600 capitalize">{slug}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Buttons */}
      <div className="px-6 py-4">
        <div className="flex flex-wrap gap-3">
          {navigationButtons.map((btn, index) => (
            <button
              key={btn.name}
              onClick={() => router.push(btn.path)}
              className="flex items-center space-x-2 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md hover:scale-105 animate-slide-in-left"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span>{btn.icon}</span>
              <span className="font-medium">{btn.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Sidebar */}
        <aside className="bg-white shadow-lg lg:w-80 p-6 border-r border-gray-200">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Navigation</h3>
            {tabs.map((tab, index) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 flex items-center space-x-3 animate-slide-in-left ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading dashboard data...</span>
            </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-gray-800">Dashboard Overview</h2>
                    <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString('id-ID')}</div>
                  </div>
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard 
                      title="Total Revenue" 
                      value={`Rp ${totalProfit.toLocaleString('id-ID')}`} 
                      icon="💰" 
                      color="green"
                      delay={0}
                    />
                    <StatCard 
                      title="Total Menu Items" 
                      value={menus.length} 
                      icon="🍽️" 
                      color="blue"
                      delay={200}
                    />
                    <StatCard 
                      title="Stock Orders" 
                      value={stockOrders} 
                      icon="📦" 
                      color="purple"
                      delay={400}
                    />
                  </div>

                  {/* Favorite Menus */}
                  <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-white">
                        ⭐
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Popular Menu Items</h3>
                    </div>
                    
                    {favoriteMenus.length > 0 ? (
                      <div className="space-y-3">
                        {favoriteMenus.map((menu, index) => (
                          <div 
                            key={menu.menu_id} 
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors duration-300"
                            style={{ animationDelay: `${800 + index * 100}ms` }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                                {index + 1}
                              </div>
                              <span className="font-medium text-gray-800">{menu.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">{menu.total_reviews}</span>
                              <span className="text-sm text-gray-500">reviews</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">🍽️</div>
                        <p>No popular menu items yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'sales' && (
                <div className="space-y-8">
                  <h2 className="text-3xl font-bold text-gray-800">Financial Reports</h2>
                  
                  {/* Monthly Revenue Chart */}
                  <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                        📈
                      </div>
                      <span>Monthly Revenue</span>
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={monthlyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fill: '#6b7280' }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280' }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="total" 
                          fill="url(#blueGradient)"
                          radius={[4, 4, 0, 0]}
                        />
                        <defs>
                          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                        💳
                      </div>
                      <span>Payment Details</span>
                    </h3>
                    
                    {payments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((payment, index) => (
                              <tr 
                                key={payment.id} 
                                className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200"
                                style={{ animationDelay: `${400 + index * 50}ms` }}
                              >
                                <td className="py-3 px-4 text-gray-600">
                                  {new Date(payment.created_at).toLocaleDateString('id-ID', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-green-600">
                                  Rp {payment.total_amount.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">💳</div>
                        <p>No payment records found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}