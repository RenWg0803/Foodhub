'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Restaurant details
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const handleSignup = async () => {
    // 1. Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      alert(authError?.message || 'Sign up failed');
      return;
    }

    const userId = authData.user.id;

    // 2. Insert into users table
    const { error: userError } = await supabase.from('users').insert([
      {
        id: userId,
        full_name: fullName,
        email: email,
      },
    ]);

    if (userError) {
      alert('Error inserting user: ' + userError.message);
      return;
    }

    // 3. Insert into restaurants table
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .insert([
        {
          name: restaurantName,
          slug: restaurantSlug,
          address: address,
          phone_number: phone,
        },
      ])
      .select()
      .single();

    if (restaurantError || !restaurantData) {
      alert('Error creating restaurant: ' + restaurantError?.message);
      return;
    }

    // 4. Insert into owners table
    const { error: ownerError } = await supabase.from('owners').insert([
      {
        user_id: userId,
        restaurant_id: restaurantData.id,
      },
    ]);

    if (ownerError) {
      alert('Error creating owner link: ' + ownerError.message);
      return;
    }

    alert('Signup complete! Check your email to confirm.');
    router.push('/auth/login');
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Owner Signup</h1>

      <h2 className="text-lg font-semibold mb-2">Account Info</h2>
      <input
        className="border p-2 w-full mb-2"
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-4"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <h2 className="text-lg font-semibold mb-2">Restaurant Info</h2>
      <input
        className="border p-2 w-full mb-2"
        placeholder="Restaurant Name"
        value={restaurantName}
        onChange={(e) => setRestaurantName(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-2"
        placeholder="Slug (unique URL ID)"
        value={restaurantSlug}
        onChange={(e) => setRestaurantSlug(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-2"
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-4"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <button
        onClick={handleSignup}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
      >
        Sign Up
      </button>
    </div>
  );
}
