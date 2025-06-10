'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Menu {
  id: string;
  name: string;
  price: number;
  description?: string;
  is_discount_active?: boolean;
  discount?: number;
}

interface Table {
  id: string;
  table_number: number;
  restaurant_id: string;
  capacity: number;
  status?: string;
}

interface Order {
  id: string;
  table_id: string;
  restaurant_id: string;
  customer_name: string;
  status: string;
  created_at: string;
}

export default function EmployeePage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTable, setSelectedTable] = useState('')
  const [selectedMenu, setSelectedMenu] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([])
  const [customerName, setCustomerName] = useState('');
  const [guestCount, setGuestCount] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')
  
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      const { data: menuData } = await supabase.from('menus').select('*');
      const { data: tableData } = await supabase.from('tables').select('*');

      // Get restaurant_id from any table
      const restaurantId = tableData?.[0]?.restaurant_id;

      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'unpaid')
        .eq('restaurant_id', restaurantId);

      setMenus(menuData || []);
      setTables(tableData || []);
      setUnpaidOrders(orderData || []);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Submit order
  const handleAddOrderItem = async () => {
    if (!selectedMenu || !selectedTable || quantity < 1) {
      alert('Please fill in all required fields');
      return;
    }

    // Get table data to obtain restaurant_id
    const selectedTableData = tables.find((table) => table.id === selectedTable);

    if (!selectedTableData || !selectedTableData.restaurant_id) {
      alert('Invalid table data or missing restaurant_id.');
      return;
    }

    const restaurantId = selectedTableData.restaurant_id;

    // Check if there's already an UNPAID order for this table
    let { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', selectedTable)
      .eq('status', 'unpaid')
      .single();

    // If none exists, create a new order (with restaurant_id)
    if (!existingOrder) {
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([
          {
            table_id: selectedTable,
            restaurant_id: restaurantId,
            customer_name: customerName,
            status: 'unpaid',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Failed to create order:', error.message);
        return;
      }

      existingOrder = newOrder;
    }

    // Add item to order_items
    const { error: orderItemError } = await supabase.from('order_items').insert([
      {
        order_id: existingOrder.id,
        menu_id: selectedMenu,
        quantity: quantity,
      },
    ]);

    if (orderItemError) {
      console.error('Failed to add order item:', orderItemError.message);
      return;
    }

    alert('Order added successfully!');
    
    // Reset form
    setSelectedMenu('');
    setQuantity(1);
    
    // Refresh unpaid orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'unpaid')
      .eq('restaurant_id', restaurantId);
    setUnpaidOrders(orderData || []);
  };

  const tabs = [
    { name: 'Order Management', key: 'orders', icon: '📝' },
    { name: 'Payment Processing', key: 'payments', icon: '💳' },
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
                👨‍💼
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Employee Dashboard</h1>
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
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Available Tables" 
                  value={tables.length} 
                  icon="🪑" 
                  color="green"
                  delay={0}
                />
                <StatCard 
                  title="Menu Items" 
                  value={menus.length} 
                  icon="🍽️" 
                  color="blue"
                  delay={200}
                />
                <StatCard 
                  title="Pending Orders" 
                  value={unpaidOrders.length} 
                  icon="📋" 
                  color="orange"
                  delay={400}
                />
              </div>

              {activeTab === 'orders' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-gray-800">Order Management</h2>
                    <div className="text-sm text-gray-500">Manage customer orders</div>
                  </div>

                  {/* Order Input Form */}
                  <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                        📝
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">New Order</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                            placeholder="Enter customer name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Table
                          </label>
                          <select
                            value={selectedTable}
                            onChange={(e) => setSelectedTable(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="">-- Select Table --</option>
                            {tables.map((table) => (
                              <option key={table.id} value={table.id}>
                                Table {table.table_number} (Capacity: {table.capacity})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Menu Item
                          </label>
                          <select
                            value={selectedMenu}
                            onChange={(e) => setSelectedMenu(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="">-- Select Menu Item --</option>
                            {menus.map((menu) => (
                              <option key={menu.id} value={menu.id}>
                                {menu.name} - Rp {menu.price.toLocaleString('id-ID')}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                            min={1}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={handleAddOrderItem}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        Add to Order
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-gray-800">Payment Processing</h2>
                    <div className="text-sm text-gray-500">Process customer payments</div>
                  </div>

                  {/* Unpaid Orders */}
                  <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white">
                        💳
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Pending Payments</h3>
                    </div>

                    {unpaidOrders.length > 0 ? (
                      <div className="space-y-4">
                        {unpaidOrders.map((order, index) => {
                          const table = tables.find((t) => t.id === order.table_id);
                          return (
                            <div 
                              key={order.id} 
                              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-blue-50 transition-all duration-300 animate-fade-in-up"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-600">Table:</span>
                                      <span className="font-semibold text-gray-800">
                                        {table?.table_number || order.table_id}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-600">Customer:</span>
                                      <span className="font-semibold text-gray-800">
                                        {order.customer_name || 'Anonymous'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Order created: {new Date(order.created_at).toLocaleString('id-ID')}
                                  </div>
                                </div>
                                <button
                                  onClick={() => router.push(`/FoodHub.com/${slug}/employee/payments?order_id=${order.id}`)}
                                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                                >
                                  Process Payment
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-6xl mb-4">💳</div>
                        <h4 className="text-xl font-semibold mb-2">No Pending Payments</h4>
                        <p>All orders have been processed</p>
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