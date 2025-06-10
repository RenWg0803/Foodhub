"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface Menu {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  discount: number;
  is_discount_active: boolean;
  discount_expiry: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function Page({ params }: PageProps) {
  const [slug, setSlug] = useState<string>("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'discount'>('all');
  const router = useRouter();

  // Resolve params promise
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!slug) return;
      
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();

      if (!error && data) {
        setRestaurant(data);
      }
    };

    fetchRestaurant();
  }, [slug]);

  useEffect(() => {
    const fetchMenus = async () => {
      if (!restaurant?.id) return;

      setIsLoading(true);
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_available", true)
        .order('name');

      if (!error && data) {
        setMenus(data);
      }
      setIsLoading(false);
    };

    fetchMenus();
  }, [restaurant?.id]);

  const filteredMenus = filter === 'discount' 
    ? menus.filter(menu => menu.is_discount_active)
    : menus;

  const discountMenusCount = menus.filter(menu => menu.is_discount_active).length;

  // Don't render anything until slug is resolved
  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
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
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
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
        
        .animate-scale-in {
          animation: scaleIn 0.4s ease-out forwards;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .menu-card {
          transition: all 0.3s ease;
        }
        
        .menu-card:hover {
          transform: translateY(-8px);
        }
      `}</style>

      {/* Header */}
      <header className="glass-effect shadow-lg sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 animate-pulse-gentle"
              >
                ←
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Restaurant Menu</h1>
                <p className="text-sm text-gray-600 capitalize">
                  {restaurant?.name || slug}
                </p>
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

      <div className="px-6 py-6">
        {/* Stats and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                  🍽️
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Menu Items</p>
                  <p className="text-2xl font-bold text-blue-600">{menus.length}</p>
                </div>
              </div>
              
              {discountMenusCount > 0 && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center text-white">
                    🏷️
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Special Offers</p>
                    <p className="text-2xl font-bold text-red-600">{discountMenusCount}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  filter === 'all'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                All Items ({menus.length})
              </button>
              {discountMenusCount > 0 && (
                <button
                  onClick={() => setFilter('discount')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    filter === 'discount'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-gray-600 hover:text-red-600'
                  }`}
                >
                  Special Offers ({discountMenusCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading menu items...</span>
          </div>
        ) : (
          <>
            {/* Menu Grid */}
            {filteredMenus.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMenus.map((menu, index) => {
                  const discountedPrice = menu.is_discount_active
                    ? Math.round(menu.price * (1 - menu.discount / 100))
                    : menu.price;

                  return (
                    <div 
                      key={menu.id} 
                      className="menu-card bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl animate-scale-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Image Container */}
                      <div className="relative">
                        {menu.image_url ? (
                          <img
                            src={menu.image_url}
                            alt={menu.name}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                            <div className="text-6xl text-blue-300">🍽️</div>
                          </div>
                        )}
                        
                        {/* Discount Badge */}
                        {menu.is_discount_active && (
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse-gentle">
                            -{menu.discount}%
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-1">
                          {menu.name}
                        </h2>
                        
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
                          {menu.description || "Delicious menu item from our kitchen"}
                        </p>
                        
                        {/* Price Section */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {menu.is_discount_active ? (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg font-bold text-red-600">
                                    Rp {discountedPrice.toLocaleString("id-ID")}
                                  </span>
                                </div>
                                <span className="text-sm text-gray-400 line-through">
                                  Rp {menu.price.toLocaleString("id-ID")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-blue-600">
                                Rp {menu.price.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>
                          
                          {/* Action Button */}
                          <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                            Order
                          </button>
                        </div>

                        {/* Discount Expiry */}
                        {menu.is_discount_active && menu.discount_expiry && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 flex items-center space-x-1">
                              <span>⏰</span>
                              <span>
                                Offer expires: {new Date(menu.discount_expiry).toLocaleDateString('id-ID')}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto animate-fade-in-up">
                  <div className="text-6xl mb-4">
                    {filter === 'discount' ? '🏷️' : '🍽️'}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {filter === 'discount' ? 'No Special Offers' : 'No Menu Items'}
                  </h3>
                  <p className="text-gray-600">
                    {filter === 'discount' 
                      ? 'There are no special offers available at the moment.'
                      : 'This restaurant hasn\'t added any menu items yet.'
                    }
                  </p>
                  {filter === 'discount' && (
                    <button
                      onClick={() => setFilter('all')}
                      className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300"
                    >
                      View All Menu
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}