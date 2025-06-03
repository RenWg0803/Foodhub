"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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

export default function MenuPage({ params }: { params: { slug: string } }) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", params.slug)
        .single();

      if (!error && data) {
        setRestaurantId(data.id);
      }
    };

    fetchRestaurant();
  }, [params.slug]);

  useEffect(() => {
    const fetchMenus = async () => {
      if (!restaurantId) return;

      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true);

      if (!error && data) {
        setMenus(data);
      }
    };

    fetchMenus();
  }, [restaurantId]);

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-6">Daftar Menu</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {menus.map((menu) => {
          const discountedPrice = menu.is_discount_active
            ? Math.round(menu.price * (1 - menu.discount / 100))
            : menu.price;

          return (
            <div key={menu.id} className="border rounded-lg p-4 shadow hover:shadow-lg">
              {menu.image_url && (
                <img
                  src={menu.image_url}
                  alt={menu.name}
                  className="w-full h-40 object-cover rounded mb-4"
                />
              )}
              <h2 className="text-xl font-semibold mb-1">{menu.name}</h2>
              <p className="text-sm text-gray-600 mb-2">{menu.description}</p>
              <p className="text-lg font-bold">
                {menu.is_discount_active ? (
                  <>
                    <span className="text-gray-400 line-through mr-2">
                      Rp {menu.price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-red-500">
                      Rp {discountedPrice.toLocaleString("id-ID")} -{menu.discount}%
                    </span>
                  </>
                ) : (
                  <>Rp {menu.price.toLocaleString("id-ID")}</>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
