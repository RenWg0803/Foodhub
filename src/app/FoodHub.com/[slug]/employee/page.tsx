'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EmployeePage() {
  const [menus, setMenus] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [selectedTable, setSelectedTable] = useState('')
  const [selectedMenu, setSelectedMenu] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unpaidOrders, setUnpaidOrders] = useState<any[]>([])
  const [customerName, setCustomerName] = useState('');

  // Fetch data
  useEffect(() => {
  const fetchData = async () => {
    const { data: menuData } = await supabase.from('menus').select('*');
    const { data: tableData } = await supabase.from('tables').select('*');

    // Ambil restaurant_id dari satu meja apa pun
    const restaurantId = tableData?.[0]?.restaurant_id;

    const { data: orderData } = await supabase
      .from('orders')
      .select('id, table_id, customer_name, status')
      .eq('status', 'unpaid')
      .eq('restaurant_id', restaurantId); // ✅ filter berdasarkan restoran

    setMenus(menuData || []);
    setTables(tableData || []);
    setUnpaidOrders(orderData || []);
  };

  fetchData();
}, []);


  // Submit order
  const handleAddOrderItem = async () => {
  if (!selectedMenu || !selectedTable || quantity < 1) return;

  // Ambil data meja untuk mendapatkan restaurant_id
  const selectedTableData = tables.find((table) => table.id === selectedTable);

  if (!selectedTableData || !selectedTableData.restaurant_id) {
    alert('Data meja tidak valid atau tidak memiliki restaurant_id.');
    return;
  }

  const restaurantId = selectedTableData.restaurant_id;

  // Cek apakah sudah ada order UNPAID untuk meja tersebut
  let { data: existingOrder } = await supabase
    .from('orders')
    .select('*')
    .eq('table_id', selectedTable)
    .eq('status', 'unpaid')
    .single();

  // Jika belum ada, buat order baru (dengan restaurant_id)
  if (!existingOrder) {
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert([
        {
          table_id: selectedTable,
          restaurant_id: restaurantId, // ✅ tambahkan ini
          customer_name: customerName,
          status: 'unpaid',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Gagal membuat order:', error.message);
      return;
    }

    existingOrder = newOrder;
  }

  // Tambahkan item ke order_items
  const { error: orderItemError } = await supabase.from('order_items').insert([
    {
      order_id: existingOrder.id,
      menu_id: selectedMenu,
      quantity: quantity,
    },
  ]);

  if (orderItemError) {
    console.error('Gagal menambahkan item pesanan:', orderItemError.message);
    return;
  }

  alert('Pesanan ditambahkan!');
};


  // Arahkan ke halaman pembayaran (misal /employee/payment?order_id=...)
  const handleGoToPayment = (orderId: string) => {
    window.location.href = `/employee/payment?order_id=${orderId}`
  }

  return (
    <div className="p-6 space-y-10 text-white">
      <h1 className="text-2xl font-bold">Halaman Kasir</h1>

      {/* Input Pesanan */}
      <div className="bg-gray-800 p-4 rounded space-y-4">
        <h2 className="text-xl font-semibold">Input Pesanan</h2>

        <div className="flex flex-col gap-2">
            <label>
            Nama Customer:
            <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-2 py-1 rounded text-black"
                required
            />
            </label>

          <label>
            Pilih Meja:
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-2 py-1 rounded text-black"
            >
              <option value="">-- Pilih Meja --</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  Meja {table.table_number}
                </option>
              ))}
            </select>
          </label>

          <label>
            Pilih Menu:
            <select
              value={selectedMenu}
              onChange={(e) => setSelectedMenu(e.target.value)}
              className="w-full px-2 py-1 rounded text-black"
            >
              <option value="">-- Pilih Makanan --</option>
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name} - Rp {menu.price}
                </option>
              ))}
            </select>
          </label>

          <label>
            Jumlah:
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full px-2 py-1 rounded text-black"
              min={1}
            />
          </label>

          <button
            onClick={handleAddOrderItem}
            className="bg-green-600 px-4 py-2 rounded text-white"
          >
            Tambah Pesanan
          </button>
        </div>
      </div>

      {/* Input Kasir */}
      <div className="bg-gray-800 p-4 rounded space-y-4">
        <h2 className="text-xl font-semibold">Input Kasir (Pembayaran)</h2>

        <ul className="space-y-2">
        {unpaidOrders.map((order) => {
            const table = tables.find((t) => t.id === order.table_id);
            return (
                <li key={order.id} className="bg-gray-700 p-3 rounded flex justify-between">
                <div>
                    <div><strong>Meja:</strong> {table?.table_number || order.table_id}</div>
                    <div><strong>Customer:</strong> {order.customer_name || 'Tanpa Nama'}</div>
                </div>
                <button
                    className="bg-orange-500 px-3 py-1 rounded text-white"
                    onClick={() => handleGoToPayment(order.id)}
                >
                Bayar
                </button>
                </li>
            );
        })}
    </ul>

      </div>
    </div>
  )
}
