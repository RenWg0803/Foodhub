'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Order {
  id: string;
  table_id: string;
  customer_name: string;
  guest_count?: number;
  created_at: string;
  created_by?: string;
  status: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  menu_id: string;
  quantity: number;
  menu: {
    name: string;
    price: number;
  };
}

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [order, setOrder] = useState<Order | null>(null)
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [amount, setAmount] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [method, setMethod] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return

      setIsLoadingData(true);

      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('Failed to fetch order data:', error.message)
        return
      }

      setOrder(orderData)

      if (orderData?.table_id) {
        const { data: tableData } = await supabase
          .from('tables')
          .select('table_number')
          .eq('id', orderData.table_id)
          .single()
        if (tableData) setTableNumber(tableData.table_number)
      }

      // Fetch order items
      const { data: items } = await supabase
        .from('order_items')
        .select('*, menu:menu_id(name, price)')
        .eq('order_id', orderId)

      setOrderItems(items || [])

      // Calculate total amount
      const total = (items || []).reduce(
        (sum, item) => sum + item.quantity * item.menu.price,
        0
      )
      setAmount(total)
      setIsLoadingData(false);
    }

    fetchOrder()
  }, [orderId])

  const handlePayment = async () => {
    if (!order || !orderId) return

    setLoading(true)

    const totalAmount = amount - discount + tax

    const {
      data: session,
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError || !session?.session) {
      alert('User not logged in.')
      setLoading(false)
      return
    }

    const userId = session.session.user.id

    const { error: paymentError } = await supabase.from('payments').insert([
      {
        order_id: orderId,
        amount,
        discount,
        tax,
        total_amount: totalAmount,
        method,
        paid_by: userId
      }
    ])

    if (paymentError) {
      alert('Failed to save payment: ' + paymentError.message)
      setLoading(false)
      return
    }

    // Update order status to paid
    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId)

    alert('Payment successful!')
    router.push(`/FoodHub.com/${slug}/employee`)
  }

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'ewallet', label: 'E-Wallet', icon: '📱' },
    { value: 'QR', label: 'QRIS', icon: '📱' },
  ];

  const finalTotal = amount - discount + tax;

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
              <button
                onClick={() => router.push(`/FoodHub.com/${slug}/employee`)}
                className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center text-white hover:from-gray-600 hover:to-gray-700 transition-all duration-300"
              >
                ←
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold animate-pulse-gentle">
                💳
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Payment Processing</h1>
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

      {/* Main Content */}
      <div className="p-6 space-y-8">
        {isLoadingData ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading order details...</span>
          </div>
        ) : !order ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Not Found</h2>
            <p className="text-gray-600">The requested order could not be found.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Order Details */}
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                  📋
                </div>
                <h2 className="text-xl font-bold text-gray-800">Order Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Order ID:</span>
                    <span className="font-semibold text-gray-800">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Table:</span>
                    <span className="font-semibold text-gray-800">
                      {tableNumber ? `Table ${tableNumber}` : order.table_id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Customer:</span>
                    <span className="font-semibold text-gray-800">
                      {order.customer_name || 'Anonymous'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Guests:</span>
                    <span className="font-semibold text-gray-800">
                      {order.guest_count ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Order Time:</span>
                    <span className="font-semibold text-gray-800">
                      {new Date(order.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Status:</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                  🍽️
                </div>
                <h2 className="text-xl font-bold text-gray-800">Order Items</h2>
              </div>
              
              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg animate-slide-in-left"
                    style={{ animationDelay: `${400 + index * 100}ms` }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {item.quantity}
                      </div>
                      <span className="font-medium text-gray-800">{item.menu.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">
                        Rp {(item.quantity * item.menu.price).toLocaleString('id-ID')}
                      </div>
                      <div className="text-sm text-gray-500">
                        @ Rp {item.menu.price.toLocaleString('id-ID')} each
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800">Subtotal:</span>
                    <span className="text-xl font-bold text-blue-600">
                      Rp {amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white">
                  💰
                </div>
                <h2 className="text-xl font-bold text-gray-800">Payment Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount (Rp)
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      value={discount}
                      onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="Enter discount amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax (Rp)
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      value={tax}
                      onChange={(e) => setTax(parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="Enter tax amount"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="space-y-2">
                      {paymentMethods.map((paymentMethod) => (
                        <label 
                          key={paymentMethod.value}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-300 ${
                            method === paymentMethod.value 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            value={paymentMethod.value}
                            checked={method === paymentMethod.value}
                            onChange={(e) => setMethod(e.target.value)}
                            className="mr-3 text-blue-600"
                          />
                          <span className="text-xl mr-2">{paymentMethod.icon}</span>
                          <span className="font-medium text-gray-800">{paymentMethod.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>Rp {amount.toLocaleString('id-ID')}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>- Rp {discount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax:</span>
                      <span>+ Rp {tax.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2">
                    <div className="flex justify-between text-lg font-bold text-gray-800">
                      <span>Total Amount:</span>
                      <span className="text-blue-600">Rp {finalTotal.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Payment Button */}
              <div className="mt-6">
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-300 ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Processing Payment...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="text-xl mr-2">💳</span>
                      Process Payment - Rp {finalTotal.toLocaleString('id-ID')}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}