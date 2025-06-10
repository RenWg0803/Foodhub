'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useParams } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type EmployeeRequest = {
  id: string;
  user_id: string;
  role: string;
};

type Employee = {
  id: string;
  user_id: string;
  role: string;
  salary: number;
  joined_at: string;
  status: string;
};

export default function EmployeeManagement() {
  const { slug } = useParams();
  const slugStr = Array.isArray(slug) ? slug[0] : slug || '';

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequest[]>([]);
  const [approvedEmployees, setApprovedEmployees] = useState<Employee[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newRole, setNewRole] = useState('');
  const [newSalary, setNewSalary] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const fetchRestaurantId = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slugStr)
        .single();

      if (error || !data) {
        console.error('Failed to fetch restaurant ID:', error);
        return;
      }

      setRestaurantId(data.id);
    };

    if (slugStr) {
      fetchRestaurantId();
    }
  }, [slugStr]);

  // Fetch employee requests and approved employees
  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch pending requests
      const { data: requests, error: requestsError } = await supabase
        .from('employees')
        .select('id, user_id, role')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending');

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
      } else {
        setEmployeeRequests(requests || []);
      }

      // Fetch approved employees
      const { data: approved, error: approvedError } = await supabase
        .from('employees')
        .select('id, user_id, role, salary, joined_at, status')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'approved');

      if (approvedError) {
        console.error('Error fetching approved employees:', approvedError);
      } else {
        setApprovedEmployees(approved || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [restaurantId]);

  const approveEmployee = async (id: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ status: 'approved' })
      .eq('id', id);

    if (!error) {
      setEmployeeRequests((prev) => prev.filter((e) => e.id !== id));
      // Refresh approved employees list
      const { data: approved } = await supabase
        .from('employees')
        .select('id, user_id, role, salary, joined_at, status')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'approved');
      setApprovedEmployees(approved || []);
    }
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete employee:', error.message);
      return;
    }
    setApprovedEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const editEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setNewRole(employee.role);
    setNewSalary(employee.salary);
  };

  const saveEmployeeChanges = async () => {
    if (!editingEmployee) return;

    const { error } = await supabase
      .from('employees')
      .update({ role: newRole, salary: newSalary })
      .eq('id', editingEmployee.id);

    if (error) {
      console.error('Failed to update employee data:', error);
    } else {
      setApprovedEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingEmployee.id
            ? { ...emp, role: newRole, salary: newSalary }
            : emp
        )
      );
      setEditingEmployee(null);
    }
  };

  const navigationButtons = [
    { name: 'Dashboard', path: `/FoodHub.com/${slugStr}/owner`, icon: '🏠' },
    { name: 'Menu Management', path: `/FoodHub.com/${slugStr}/owner/menu`, icon: '🍽️' },
    { name: 'Table Management', path: `/FoodHub.com/${slugStr}/owner/table`, icon: '🪑' },
    { name: 'Employee Management', path: `/FoodHub.com/${slugStr}/owner/employee`, icon: '👥' },
    { name: 'Stock Management', path: `/FoodHub.com/${slugStr}/owner/stock`, icon: '📦' },
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
                👥
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Employee Management</h1>
                <p className="text-sm text-gray-600 capitalize">{slugStr}</p>
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
                btn.name === 'Employee Management'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-600'
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

      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading employee data...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Employee Requests Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-white">
                  📋
                </div>
                <h2 className="text-xl font-bold text-gray-800">Employee Requests</h2>
                {employeeRequests.length > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {employeeRequests.length} pending
                  </span>
                )}
              </div>
              
              {employeeRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p>No pending employee requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employeeRequests.map((request, index) => (
                    <div
                      key={request.id}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${200 + index * 100}ms` }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          👤
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">User ID: {request.user_id}</p>
                          <p className="text-sm text-gray-600">Role: {request.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => approveEmployee(request.id)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:shadow-lg transform hover:scale-105"
                      >
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Employees Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                  👨‍💼
                </div>
                <h2 className="text-xl font-bold text-gray-800">Active Employees</h2>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {approvedEmployees.length} active
                </span>
              </div>

              {approvedEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">👥</div>
                  <p>No approved employees yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Employee</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Role</th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-700">Salary</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Join Date</th>
                        <th className="text-center py-4 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedEmployees.map((employee, index) => (
                        <tr 
                          key={employee.id} 
                          className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200 animate-fade-in-up"
                          style={{ animationDelay: `${600 + index * 100}ms` }}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                                {employee.user_id.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-800">{employee.user_id}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                              {employee.role}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-green-600">
                            Rp {typeof employee.salary === 'number' ? employee.salary.toLocaleString('id-ID') : '0'}
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {new Date(employee.joined_at).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => editEmployee(employee)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteEmployee(employee.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Edit Employee Modal */}
            {editingEmployee && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-up">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white">
                      ✏️
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Edit Employee</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter role"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Salary (Rp)
                      </label>
                      <input
                        type="number"
                        value={newSalary}
                        onChange={(e) => setNewSalary(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter salary"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setEditingEmployee(null)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEmployeeChanges}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:shadow-lg transform hover:scale-105"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}