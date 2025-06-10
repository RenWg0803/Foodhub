'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Table = {
  id: string;
  table_number: number;
  capacity: number;
};

export default function TableManagement({ params }: { params: { slug: string } }) {
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurantId = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', params.slug)
        .single();

      if (error || !data) {
        console.error('Gagal mengambil ID restoran:', error);
        return;
      }
      setRestaurantId(data.id);
    };

    if (params.slug) fetchRestaurantId();
  }, [params.slug]);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      setIsLoading(true);
      const { data: tableData } = await supabase
        .from('tables')
        .select('id, table_number, capacity')
        .eq('restaurant_id', restaurantId)
        .order('table_number', { ascending: true });

      setTables(tableData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [restaurantId]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !tableNumber || !capacity) return;

    setIsSubmitting(true);

    const { data, error } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        table_number: parseInt(tableNumber),
        capacity: parseInt(capacity),
      })
      .select();

    if (error) {
      console.error('Gagal menambahkan meja:', error.message);
      setIsSubmitting(false);
      return;
    }

    if (data) {
      setTables((prev) => [...prev, ...data].sort((a, b) => a.table_number - b.table_number));
      setTableNumber('');
      setCapacity('');
    }
    setIsSubmitting(false);
  };

  const handleDeleteTable = async (id: string) => {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) {
      console.error('Gagal menghapus meja:', error.message);
      return;
    }

    setTables((prev) => prev.filter((table) => table.id !== id));
  };

  const navigationButtons = [
    { name: 'Dashboard', path: `/FoodHub.com/${params.slug}/owner`, icon: '🏠' },
    { name: 'Menu Management', path: `/FoodHub.com/${params.slug}/owner/menu`, icon: '🍽️' },
    { name: 'Table Management', path: `/FoodHub.com/${params.slug}/owner/table`, icon: '🪑' },
    { name: 'Employee Management', path: `/FoodHub.com/${params.slug}/owner/employee`, icon: '👥' },
    { name: 'Stock Management', path: `/FoodHub.com/${params.slug}/owner/stock`, icon: '📦' },
  ];

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
                🪑
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Table Management</h1>
                <p className="text-sm text-gray-600 capitalize">{params.slug}</p>
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
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md hover:scale-105 animate-slide-in-left ${
                btn.name === 'Table Management'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-500'
                  : 'bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 border-gray-200'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span>{btn.icon}</span>
              <span className="font-medium">{btn.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Add Table Form */}
          <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                ➕
              </div>
              <h2 className="text-xl font-bold text-gray-800">Add New Table</h2>
            </div>
            
            <form onSubmit={handleAddTable} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Table Number
                  </label>
                  <input
                    type="number"
                    placeholder="Enter table number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="Enter seating capacity"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    required
                    min="1"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <span>➕</span>
                    <span>Add Table</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Tables List */}
          <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                  📋
                </div>
                <h2 className="text-xl font-bold text-gray-800">Current Tables</h2>
              </div>
              <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                {tables.length} tables
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Loading tables...</span>
              </div>
            ) : tables.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table, index) => (
                  <div
                    key={table.id}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${300 + index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {table.table_number}
                        </div>
                        <span className="font-bold text-gray-800">Table #{table.table_number}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTable(table.id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors duration-200 hover:shadow-md"
                        title="Delete table"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <span className="text-sm">👥</span>
                      <span className="text-sm">Capacity: {table.capacity} people</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🪑</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No tables found</h3>
                <p className="text-gray-500">Add your first table to get started</p>
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          {tables.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white">
                  📊
                </div>
                <h2 className="text-xl font-bold text-gray-800">Summary Statistics</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{tables.length}</div>
                  <div className="text-sm text-gray-600">Total Tables</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {tables.reduce((sum, table) => sum + table.capacity, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Capacity</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(tables.reduce((sum, table) => sum + table.capacity, 0) / tables.length)}
                  </div>
                  <div className="text-sm text-gray-600">Average Capacity</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}