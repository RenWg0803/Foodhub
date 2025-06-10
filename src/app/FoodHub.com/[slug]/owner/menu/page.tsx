'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { useRouter, useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  is_discount_active: boolean;
  discount: number;
  discount_expiry: string | null;
  image_url?: string;
  description?: string;
}

export default function MenuManagement() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    image_url: ''
  });
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editMenu, setEditMenu] = useState<MenuItem | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Ambil restaurantId dari slug
  useEffect(() => {
    const fetchRestaurantId = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        console.error('Gagal mengambil ID restoran:', error);
        return;
      }
      setRestaurantId(data.id);
    };

    if (slug) fetchRestaurantId();
  }, [slug]);

  // Ambil menu berdasarkan restaurantId
  useEffect(() => {
    if (!restaurantId) return;

    const fetchMenus = async () => {
      setIsLoading(true);
      const { data: menuData, error } = await supabase
        .from('menus')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (error) {
        console.error('Gagal mengambil data menu:', error);
      } else {
        setMenus(menuData || []);
      }
      setIsLoading(false);
    };

    fetchMenus();
  }, [restaurantId]);

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    const newMenu: MenuItem = {
      id: uuidv4(),
      restaurant_id: restaurantId,
      name: menuForm.name,
      description: menuForm.description,
      price: parseFloat(menuForm.price),
      image_url: menuForm.image_url || '',
      is_discount_active: false,
      discount: 0,
      discount_expiry: null,
    };

    const { error } = await supabase.from('menus').insert(newMenu);
    if (!error) {
      setMenuForm({ name: '', description: '', price: '', image_url: '' });
      setShowAddMenu(false);
      setMenus([...menus, newMenu]);
      // Success notification could be added here
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
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    const { error } = await supabase.from('menus').delete().eq('id', id);
    if (!error) {
      setMenus(menus.filter((m) => m.id !== id));
    }
  };

  const filteredMenus = menus.filter(menu =>
    menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    menu.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const MenuCard = ({ menu, index }: { menu: MenuItem; index: number }) => (
    <div 
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden animate-fade-in-up border border-gray-100 hover:border-blue-200"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="md:w-48 h-48 md:h-auto bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center relative overflow-hidden">
          {menu.image_url ? (
            <img 
              src={menu.image_url} 
              alt={menu.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`${menu.image_url ? 'hidden' : ''} text-6xl text-blue-300`}>
            🍽️
          </div>
          {menu.is_discount_active && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              -{menu.discount}%
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{menu.name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                {menu.description || 'No description available'}
              </p>
              <div className="flex items-center space-x-3">
                {menu.is_discount_active ? (
                  <>
                    <span className="text-2xl font-bold text-green-600">
                      Rp {(menu.price * (1 - menu.discount / 100)).toLocaleString('id-ID')}
                    </span>
                    <span className="text-lg text-gray-400 line-through">
                      Rp {menu.price.toLocaleString('id-ID')}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-blue-600">
                    Rp {menu.price.toLocaleString('id-ID')}
                  </span>
                )}
              </div>
              {menu.is_discount_active && menu.discount_expiry && (
                <p className="text-sm text-orange-500 mt-2">
                  Discount expires: {new Date(menu.discount_expiry).toLocaleDateString('id-ID')}
                </p>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col space-y-2 ml-4">
              <button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                onClick={() => setEditMenu(menu)}
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
              <button 
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                onClick={() => handleMenuDelete(menu.id)}
              >
                <span>🗑️</span>
                <span>Delete</span>
              </button>
            </div>
          </div>
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
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-slide-in-down {
          animation: slideInDown 0.5s ease-out forwards;
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
              <button
                onClick={() => router.push(`/FoodHub.com/${slug}/owner`)}
                className="flex items-center space-x-2 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md"
              >
                <span>⬅️</span>
                <span>Back to Dashboard</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                  🍽️
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Menu Management</h1>
                  <p className="text-sm text-gray-600 capitalize">{slug}</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {menus.length} menu items
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* Controls Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>
          
          <button
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center space-x-2"
            onClick={() => setShowAddMenu(true)}
          >
            <span>➕</span>
            <span>Add New Menu</span>
          </button>
        </div>

        {/* Add Menu Form */}
        {showAddMenu && (
          <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-in-down border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                <span>➕</span>
                <span>Add New Menu Item</span>
              </h2>
              <button
                onClick={() => setShowAddMenu(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleMenuSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Menu Name *</label>
                  <input
                    type="text"
                    placeholder="Enter menu name"
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (Rp) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter price"
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={menuForm.image_url}
                    onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  placeholder="Enter menu description"
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                />
              </div>
              
              <div className="md:col-span-2 flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setShowAddMenu(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                >
                  Save Menu
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Menu Form */}
        {editMenu && (
          <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-in-down border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                <span>✏️</span>
                <span>Edit Menu Item</span>
              </h2>
              <button
                onClick={() => setEditMenu(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleMenuUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Menu Name</label>
                  <input
                    type="text"
                    value={editMenu.name}
                    onChange={(e) => setEditMenu({ ...editMenu, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (Rp)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMenu.price}
                    onChange={(e) => setEditMenu({ ...editMenu, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                  <input
                    type="url"
                    value={editMenu.image_url || ''}
                    onChange={(e) => setEditMenu({ ...editMenu, image_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800">Discount Settings</h3>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editMenu.is_discount_active}
                      onChange={(e) => setEditMenu({ ...editMenu, is_discount_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable Discount</span>
                  </label>
                  
                  {editMenu.is_discount_active && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editMenu.discount}
                          onChange={(e) => setEditMenu({ ...editMenu, discount: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                        <input
                          type="datetime-local"
                          value={editMenu.discount_expiry ? new Date(editMenu.discount_expiry).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setEditMenu({ ...editMenu, discount_expiry: new Date(e.target.value).toISOString() })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editMenu.description || ''}
                  onChange={(e) => setEditMenu({ ...editMenu, description: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                />
              </div>
              
              <div className="md:col-span-2 flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setEditMenu(null)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                >
                  Update Menu
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Menu List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading menu items...</span>
            </div>
          ) : filteredMenus.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  Menu Items ({filteredMenus.length})
                </h2>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear search
                  </button>
                )}
              </div>
              <div className="space-y-6">
                {filteredMenus.map((menu, index) => (
                  <MenuCard key={menu.id} menu={menu} index={index} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl shadow-lg">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {searchQuery ? 'No menu items found' : 'No menu items yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? `No items match "${searchQuery}". Try a different search term.`
                  : 'Start building your menu by adding your first item.'
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddMenu(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Add Your First Menu Item
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}