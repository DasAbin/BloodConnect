import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

const UserLogin = () => {
  const navigate = useNavigate()
  const [role, setRole] = useState('patient')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      if (role === 'admin') {
        await axios.post('http://localhost:5000/api/admin/login', { username: identifier, password })
        localStorage.setItem('isAdmin', 'true')
        window.dispatchEvent(new Event('authChange'))
        navigate('/admin')
      } else {
        const res = await axios.post('http://localhost:5000/api/user/login', { email: identifier, password })
        localStorage.setItem('userName', res.data.name)
        localStorage.setItem('userLoggedIn', 'true')
        window.dispatchEvent(new Event('authChange'))
        navigate('/')
      }
    } catch (err) {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Login to BloodConnect</h2>
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm">{error}</div>}
        
        <div className="flex justify-center space-x-6 mb-8 border-b border-gray-100 pb-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" checked={role === 'patient'} onChange={() => {setRole('patient'); setIdentifier('');}} className="text-primary-600 focus:ring-primary-500 h-4 w-4" />
            <span className="text-gray-900 font-medium">Patient / User</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" checked={role === 'admin'} onChange={() => {setRole('admin'); setIdentifier('');}} className="text-primary-600 focus:ring-primary-500 h-4 w-4" />
            <span className="text-gray-900 font-medium">Admin</span>
          </label>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{role === 'admin' ? 'Username' : 'Email'}</label>
            <input 
              type={role === 'admin' ? 'text' : 'email'} 
              required 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500" 
            />
          </div>
          <button type="submit" className="w-full bg-primary-600 text-white rounded-xl py-3 font-medium hover:bg-primary-700 transition-colors shadow-sm">
            Login
          </button>
        </form>
        {role === 'patient' && (
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account? <Link to="/user/register" className="text-primary-600 font-medium hover:underline">Register here</Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default UserLogin
