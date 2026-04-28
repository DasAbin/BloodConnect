import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

const UserRegister = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://localhost:5000/api/user/register', formData)
      alert('Registration successful! Please login.')
      navigate('/user/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Error registering user')
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">User Registration</h2>
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input 
              type="text" 
              required 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500" 
            />
          </div>
          <button type="submit" className="w-full bg-primary-600 text-white rounded-xl py-3 font-medium hover:bg-primary-700 transition-colors shadow-sm">
            Register
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account? <Link to="/user/login" className="text-primary-600 font-medium hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default UserRegister
