'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid';
import { useRouter, useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function StockManagement() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [inventory, setInventory] = useState<any[]>([])
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState<number>(0)
  const [unit, setUnit] = useState('pcs')
  const [reason, setReason] = useState('Pengadaan Stok Baru')
  const [cost, setCost] = useState<number>(0)
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('inventory')

  // Fetch restaurant_id once
  const fetchRestaurantId = async () => {
    console.log('Slug yang diterima:', slug)

    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      console.error('Gagal mengambil ID restoran:', error)
      return
    }

    console.log('Data restoran ditemukan:', data)
    setRestaurantId(data.id)
  }

  // Fetch inventory berdasarkan restaurantId
  const fetchInventory = async (id: string) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('restaurant_id', id)
      .order('last_updated', { ascending: false })

    if (!error) setInventory(data || [])
    else console.error('Fetch inventory error:', error)
  }

  const fetchInventoryLogs = async (id: string) => {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false })

    if (!error) setInventoryLogs(data || [])
    else console.error('Fetch inventory log error:', error)
  }

  useEffect(() => {
    fetchRestaurantId()
  }, [slug])

  useEffect(() => {
    if (restaurantId) {
      const fetchData = async () => {
        setIsLoading(true)
        await Promise.all([
          fetchInventory(restaurantId),
          fetchInventoryLogs(restaurantId)
        ])
        setIsLoading(false)
      }
      fetchData()
    }
  }, [restaurantId])

  const handleAddStock = async () => {
    if (!name || quantity <= 0 || cost < 0) {
      alert('Nama, jumlah, dan biaya harus valid.')
      return
    }

    if (!restaurantId) {
      alert('Restoran tidak valid.')
      return
    }

    setLoading(true)

    const session = await supabase.auth.getSession()
    const userId = session.data.session?.user.id

    if (!userId) {
      alert('User belum login.')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('inventory')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('name', name)
      .single()

    let inventoryId

    if (existing) {
      const newQuantity = Number(existing.quantity) + quantity

      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity, last_updated: new Date().toISOString() })
        .eq('id', existing.id)

      if (error) {
        alert('Gagal update inventory')
        setLoading(false)
        return
      }

      inventoryId = existing.id
    } else {
      const { data: inserted, error } = await supabase
        .from('inventory')
        .insert([
          {
            restaurant_id: restaurantId,
            name,
            quantity,
            unit,
            last_updated: new Date().toISOString(),
          }
        ])
        .select()
        .single()

      if (error || !inserted) {
        alert('Gagal menambah inventory.')
        setLoading(false)
        return
      }

      inventoryId = inserted.id
    }

    // Log perubahan
    await supabase.from('inventory_logs').insert([
      {
        inventory_id: inventoryId,
        change: quantity,
        reason,
        cost,
        created_by: userId,
      }
    ])

    // Reset form
    setName('')
    setQuantity(0)
    setCost(0)
    setReason('Pengadaan Stok Baru')
    setUnit('pcs')
    setLoading(false)
    fetchInventory(restaurantId)
    fetchInventoryLogs(restaurantId)
  }

  const navigationButtons = [
    { name: 'Dashboard', path: `/FoodHub.com/${slug}/owner`, icon: '🏠' },
    { name: 'Menu Management', path: `/FoodHub.com/${slug}/owner/menu`, icon: '🍽️' },
    { name: 'Table Management', path: `/FoodHub.com/${slug}/owner/table`, icon: '🪑' },
    { name: 'Employee Management', path: `/FoodHub.com/${slug}/owner/employee`, icon: '👥' },
    { name: 'Stock Management', path: `/FoodHub.com/${slug}/owner/stock`, icon: '📦' },
  ];

  const tabs = [
    { name: 'Current Inventory', key: 'inventory', icon: '📦' },
    { name: 'Add/Update Stock', key: 'add', icon: '➕' },
    { name: 'Stock History', key: 'logs', icon: '📋' },
  ];

  const getTotalValue = () => {
    return inventory.reduce((total, item) => {
      const itemCost = inventoryLogs
        .filter(log => log.inventory_id === item.id)
        .reduce((sum, log) => sum + (log.cost || 0), 0)
      return total + itemCost
    }, 0)
  }

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'red' }
    if (quantity < 10) return { status: 'Low Stock', color: 'yellow' }
    return { status: 'In Stock', color: 'green' }
  }

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
                📦
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Stock Management</h1>
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
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md hover:scale-105 animate-slide-in-left ${
                btn.name === 'Stock Management'
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

          {/* Quick Stats */}
          <div className="mt-8 space-y-4">
            <h4 className="text-md font-semibold text-gray-700">Quick Stats</h4>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{inventory.length}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  Rp {getTotalValue().toLocaleString('id-ID')}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading stock data...</span>
            </div>
          ) : (
            <>
              {activeTab === 'inventory' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-gray-800">Current Inventory</h2>
                    <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString('id-ID')}</div>
                  </div>

                  {inventory.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                            <tr>
                              <th className="text-left py-4 px-6 font-semibold">Item Name</th>
                              <th className="text-center py-4 px-6 font-semibold">Quantity</th>
                              <th className="text-center py-4 px-6 font-semibold">Unit</th>
                              <th className="text-center py-4 px-6 font-semibold">Status</th>
                              <th className="text-center py-4 px-6 font-semibold">Last Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventory.map((item, index) => {
                              const status = getStockStatus(item.quantity)
                              return (
                                <tr 
                                  key={item.id} 
                                  className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200"
                                  style={{ animationDelay: `${200 + index * 50}ms` }}
                                >
                                  <td className="py-4 px-6">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        📦
                                      </div>
                                      <span className="font-medium text-gray-800">{item.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6 text-center">
                                    <span className="text-lg font-semibold text-gray-700">{item.quantity}</span>
                                  </td>
                                  <td className="py-4 px-6 text-center">
                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">{item.unit}</span>
                                  </td>
                                  <td className="py-4 px-6 text-center">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      status.color === 'green' ? 'bg-green-100 text-green-700' :
                                      status.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {status.status}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-center text-gray-600 text-sm">
                                    {new Date(item.last_updated).toLocaleDateString('id-ID')}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center animate-fade-in-up">
                      <div className="text-6xl mb-4">📦</div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No inventory items</h3>
                      <p className="text-gray-500">Add your first stock item to get started</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'add' && (
                <div className="space-y-8">
                  <h2 className="text-3xl font-bold text-gray-800">Add/Update Stock</h2>

                  <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                        ➕
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Stock Information</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Item Name
                          </label>
                          <input
                            type="text"
                            placeholder="Enter item name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity
                          </label>
                          <input
                            type="number"
                            placeholder="Enter quantity"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            value={quantity}
                            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unit
                          </label>
                          <select
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                          >
                            <option value="pcs">Pieces (pcs)</option>
                            <option value="kg">Kilogram (kg)</option>
                            <option value="liter">Liter</option>
                            <option value="box">Box</option>
                            <option value="pack">Pack</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cost (Rp)
                          </label>
                          <input
                            type="number"
                            placeholder="Enter cost"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            value={cost}
                            onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason
                        </label>
                        <input
                          type="text"
                          placeholder="Enter reason for stock change"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </div>

                      <button
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        onClick={handleAddStock}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <span>💾</span>
                            <span>Save Stock</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-8">
                  <h2 className="text-3xl font-bold text-gray-800">Stock History</h2>

                  {inventoryLogs.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                            <tr>
                              <th className="text-left py-4 px-6 font-semibold">Date</th>
                              <th className="text-left py-4 px-6 font-semibold">Change</th>
                              <th className="text-left py-4 px-6 font-semibold">Reason</th>
                              <th className="text-right py-4 px-6 font-semibold">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventoryLogs.map((log, index) => (
                              <tr 
                                key={log.id} 
                                className="border-b border-gray-100 hover:bg-purple-50 transition-colors duration-200"
                                style={{ animationDelay: `${200 + index * 50}ms` }}
                              >
                                <td className="py-4 px-6 text-gray-600">
                                  {new Date(log.created_at).toLocaleDateString('id-ID', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`font-semibold ${
                                    log.change > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {log.change > 0 ? '+' : ''}{log.change}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-gray-700">{log.reason}</td>
                                <td className="py-4 px-6 text-right font-semibold text-gray-700">
                                  Rp {log.cost?.toLocaleString('id-ID') || '0'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center animate-fade-in-up">
                      <div className="text-6xl mb-4">📋</div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No stock history</h3>
                      <p className="text-gray-500">Stock changes will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}