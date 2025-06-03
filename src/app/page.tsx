'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Eye, EyeOff, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

// Supabase client setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Types
type ModalType = 'login' | 'register' | 'forgot'
type MessageType = 'success' | 'error' | ''
type UserRole = 'owner' | 'employee'
type EmployeeRole = 'kasir' | 'pelayan' | 'admin'

interface Message {
  type: MessageType
  text: string
}

export default function HomePage() {
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<ModalType>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<Message>({ type: '', text: '' })
  
  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('owner')
  const [restaurantId, setRestaurantId] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [employeeRole, setEmployeeRole] = useState<EmployeeRole>('kasir')
  
  // Restaurant data for owner registration
  const [restaurantSlug, setRestaurantSlug] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [restaurantPhone, setRestaurantPhone] = useState('')
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)

  // Reset form when modal type changes
  useEffect(() => {
    setEmail('')
    setPassword('')
    setFullName('')
    setRestaurantId('')
    setRestaurantName('')
    setRestaurantSlug('')
    setRestaurantAddress('')
    setRestaurantPhone('')
    setSlugAvailable(null)
    setMessage({ type: '', text: '' })
  }, [modalType])

  // Fetch restaurant name when restaurant ID changes
  useEffect(() => {
    if (restaurantId && userRole === 'employee') {
      fetchRestaurantName(restaurantId)
    }
  }, [restaurantId, userRole])

  // Check slug availability when slug changes
  useEffect(() => {
    if (restaurantSlug && userRole === 'owner') {
      checkSlugAvailability(restaurantSlug)
    } else {
      setSlugAvailable(null)
    }
  }, [restaurantSlug, userRole])

  const fetchRestaurantName = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', id)
        .single()
      
      if (error) {
        setRestaurantName('')
        return
      }
      
      setRestaurantName(data?.name || '')
    } catch (error) {
      setRestaurantName('')
    }
  }

  const checkSlugAvailability = async (slug: string) => {
    if (slug.length < 3) {
      setSlugAvailable(null)
      return
    }

    setSlugChecking(true)
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slug.toLowerCase())
        .single()
      
      setSlugAvailable(!data)
    } catch (error) {
      setSlugAvailable(true)
    } finally {
      setSlugChecking(false)
    }
  }

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim()
  }

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (!data.user) {
        throw new Error('User data not found')
      }

      // Check user role and redirect
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (userData) {
        // Check if owner
        const { data: ownerData } = await supabase
          .from('owners')
          .select('restaurant_id, restaurants(slug)')
          .eq('user_id', data.user.id)
          .single()

        if (ownerData && ownerData.restaurants) {
          const restaurant = Array.isArray(ownerData.restaurants) 
            ? ownerData.restaurants[0] 
            : ownerData.restaurants
          window.location.href = `/FoodHub.com/${restaurant.slug}/owner`
          return
        }

        // Check if employee
        const { data: employeeData } = await supabase
          .from('employees')
          .select('restaurant_id, restaurants(slug)')
          .eq('user_id', data.user.id)
          .eq('status', 'approved')
          .single()

        if (employeeData && employeeData.restaurants) {
          const restaurant = Array.isArray(employeeData.restaurants) 
            ? employeeData.restaurants[0] 
            : employeeData.restaurants
          window.location.href = `/FoodHub.com/${restaurant.slug}/employee`
          return
        }
      }

      setMessage({ type: 'error', text: 'Akun tidak ditemukan atau belum disetujui' })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Basic validation
      if (!fullName.trim()) {
        throw new Error('Nama lengkap harus diisi')
      }
      if (!email.trim()) {
        throw new Error('Email harus diisi')
      }
      if (!password || password.length < 6) {
        throw new Error('Password minimal 6 karakter')
      }

      // Validation for owner
      if (userRole === 'owner') {
        if (!restaurantName.trim()) {
          throw new Error('Nama restoran harus diisi')
        }
        if (!restaurantSlug.trim()) {
          throw new Error('Username/slug restoran harus diisi')
        }
        if (restaurantSlug.trim().length < 3) {
          throw new Error('Username/slug minimal 3 karakter')
        }
        if (slugAvailable === false) {
          throw new Error('Username/slug sudah digunakan')
        }
        // Wait for slug check to complete if still checking
        if (slugChecking) {
          throw new Error('Masih memeriksa ketersediaan username, mohon tunggu')
        }
      }

      // Validation for employee
      if (userRole === 'employee') {
        if (!restaurantId.trim()) {
          throw new Error('ID Restoran harus diisi')
        }
      }

      console.log('Starting registration process...')

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: undefined // Remove email confirmation for testing
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        throw new Error(`Gagal membuat akun: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('Gagal membuat user account')
      }

      const userId = authData.user.id
      console.log('Auth user created with ID:', userId)

      // Step 2: Insert user data (ALWAYS FIRST)
      console.log('Inserting user data...')
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          full_name: fullName.trim(),
          email: email.trim()
        })

      if (userError) {
        console.error('User insert error:', userError)
        // If user already exists (duplicate), that's fine - continue
        if (userError.code !== '23505') {
          throw new Error(`Gagal menyimpan data user: ${userError.message}`)
        }
        console.log('User already exists in database, continuing...')
      } else {
        console.log('User data inserted successfully')
      }

      if (userRole === 'owner') {
        // Step 3: Create restaurant (SECOND)
        console.log('Creating restaurant...')
        
        const restaurantInsertData = {
          name: restaurantName.trim(),
          slug: restaurantSlug.toLowerCase().trim(),
          address: restaurantAddress.trim() || null,
          phone_number: restaurantPhone.trim() || null
        }

        console.log('Restaurant data to insert:', restaurantInsertData)

        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .insert(restaurantInsertData)
          .select('id')
          .single()

        if (restaurantError) {
          console.error('Restaurant insert error:', restaurantError)
          throw new Error(`Gagal membuat restoran: ${restaurantError.message}`)
        }

        if (!restaurantData || !restaurantData.id) {
          throw new Error('Gagal mendapatkan ID restoran yang baru dibuat')
        }

        const restaurantIdCreated = restaurantData.id
        console.log('Restaurant created with ID:', restaurantIdCreated)

        // Step 4: Create owner record (LAST)
        console.log('Creating owner record...')
        
        const ownerInsertData = {
          user_id: userId,
          restaurant_id: restaurantIdCreated
        }

        console.log('Owner data to insert:', ownerInsertData)

        const { error: ownerError } = await supabase
          .from('owners')
          .insert(ownerInsertData)

        if (ownerError) {
          console.error('Owner insert error:', ownerError)
          
          // Clean up restaurant if owner creation fails
          try {
            await supabase.from('restaurants').delete().eq('id', restaurantIdCreated)
            console.log('Cleaned up restaurant due to owner creation failure')
          } catch (cleanupError) {
            console.error('Failed to cleanup restaurant:', cleanupError)
          }
          
          throw new Error(`Gagal membuat record owner: ${ownerError.message}`)
        }

        console.log('Owner record created successfully')

        setMessage({ 
          type: 'success', 
          text: 'Akun owner dan restoran berhasil dibuat! Anda dapat langsung login.' 
        })

      } else {
        // Employee registration
        console.log('Creating employee record...')

        const employeeInsertData = {
          user_id: userId,
          restaurant_id: restaurantId.trim(),
          role: employeeRole,
          status: 'pending'
        }

        console.log('Employee data to insert:', employeeInsertData)

        const { error: employeeError } = await supabase
          .from('employees')
          .insert(employeeInsertData)

        if (employeeError) {
          console.error('Employee insert error:', employeeError)
          throw new Error(`Gagal membuat record employee: ${employeeError.message}`)
        }

        console.log('Employee record created successfully')

        setMessage({ 
          type: 'success', 
          text: 'Pendaftaran employee berhasil! Menunggu persetujuan owner. Anda dapat langsung login setelah disetujui.' 
        })
      }

      // Auto close modal after 3 seconds on success
      setTimeout(() => {
        setModalType('login')
        setMessage({ type: '', text: '' })
      }, 3000)

    } catch (error) {
      console.error('Registration error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: 'Link reset password telah dikirim ke email Anda' 
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const openModal = (type: ModalType) => {
    setModalType(type)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setMessage({ type: '', text: '' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-xl font-bold text-slate-800">RestaurantPOS</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => openModal('login')}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Masuk
              </button>
              <button
                onClick={() => openModal('register')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Daftar
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-800 mb-6">
            Sistem Pembukuan
            <span className="text-blue-600 block">Restoran Modern</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Kelola kasir, laporan penjualan, dan pengeluaran restoran Anda dengan mudah dan efisien
          </p>
          <button
            onClick={() => openModal('register')}
            className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105"
          >
            Mulai Sekarang
          </button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Sistem Kasir</h3>
            <p className="text-slate-600">
              Proses transaksi dengan cepat dan akurat. Kelola pembayaran dan struk digital dengan mudah.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Laporan Penjualan</h3>
            <p className="text-slate-600">
              Analisis penjualan harian, mingguan, dan bulanan dengan grafik yang mudah dipahami.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Kelola Pengeluaran</h3>
            <p className="text-slate-600">
              Catat dan monitor semua pengeluaran operasional untuk kontrol keuangan yang lebih baik.
            </p>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">
                {modalType === 'login' && 'Masuk'}
                {modalType === 'register' && 'Daftar Akun'}
                {modalType === 'forgot' && 'Lupa Password'}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {message.text && (
                <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}

              {modalType === 'login' && (
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Masuk'}
                  </button>
                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={() => setModalType('forgot')}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Lupa Password?
                    </button>
                    <div className="text-sm text-slate-600">
                      Belum punya akun?{' '}
                      <button
                        type="button"
                        onClick={() => setModalType('register')}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Daftar
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {modalType === 'register' && (
                <form className="space-y-4" onSubmit={handleRegister}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Daftar Sebagai</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="owner">Owner Restoran</option>
                      <option value="employee">Karyawan</option>
                    </select>
                  </div>
                  
                  {userRole === 'owner' && (
                    <>
                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-medium text-slate-700 mb-3">Data Restoran</h3>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Restoran *</label>
                        <input
                          type="text"
                          value={restaurantName}
                          onChange={(e) => {
                            setRestaurantName(e.target.value)
                            if (!restaurantSlug) {
                              setRestaurantSlug(generateSlugFromName(e.target.value))
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Contoh: Warung Makan Sederhana"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username/Slug Restoran *</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 text-sm text-slate-500 bg-slate-50 border border-r-0 border-slate-300 rounded-l-lg">
                            FoodHub.com/
                          </span>
                          <input
                            type="text"
                            value={restaurantSlug}
                            onChange={(e) => setRestaurantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="nama-restoran"
                            required
                            minLength={3}
                          />
                        </div>
                        {slugChecking && (
                          <p className="text-sm text-blue-600 mt-1 flex items-center">
                            <Loader2 size={12} className="animate-spin mr-1" />
                            Memeriksa ketersediaan...
                          </p>
                        )}
                        {slugAvailable === true && restaurantSlug.length >= 3 && (
                          <p className="text-sm text-green-600 mt-1 flex items-center">
                            <CheckCircle size={12} className="mr-1" />
                            Username tersedia
                          </p>
                        )}
                        {slugAvailable === false && (
                          <p className="text-sm text-red-600 mt-1 flex items-center">
                            <AlertCircle size={12} className="mr-1" />
                            Username sudah digunakan
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Restoran</label>
                        <textarea
                          value={restaurantAddress}
                          onChange={(e) => setRestaurantAddress(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Alamat lengkap restoran"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Telepon</label>
                        <input
                          type="tel"
                          value={restaurantPhone}
                          onChange={(e) => setRestaurantPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="08xxxxxxxxxx"
                        />
                      </div>
                    </>
                  )}
                  
                  {userRole === 'employee' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ID Restoran</label>
                        <input
                          type="text"
                          value={restaurantId}
                          onChange={(e) => setRestaurantId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Masukkan ID restoran"
                          required
                        />
                        {restaurantName && (
                          <p className="text-sm text-green-600 mt-1">Restoran: {restaurantName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Posisi</label>
                        <select
                          value={employeeRole}
                          onChange={(e) => setEmployeeRole(e.target.value as EmployeeRole)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="kasir">Kasir</option>
                          <option value="pelayan">Pelayan</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  <button
                    type="submit"
                    disabled={loading || (userRole === 'owner' && slugAvailable === false)}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Daftar'}
                  </button>
                  <div className="text-center text-sm text-slate-600">
                    Sudah punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => setModalType('login')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Masuk
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'forgot' && (
                <form className="space-y-4" onSubmit={handleForgotPassword}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Masukkan email Anda"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Kirim Link Reset'}
                  </button>
                  <div className="text-center text-sm text-slate-600">
                    Ingat password?{' '}
                    <button
                      type="button"
                      onClick={() => setModalType('login')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Masuk
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}