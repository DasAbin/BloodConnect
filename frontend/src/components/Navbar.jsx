import { Link, useNavigate } from 'react-router-dom'
import { Droplet, User, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import axios from 'axios'

const Navbar = () => {
  const navigate = useNavigate()
  const [userName, setUserName] = useState(localStorage.getItem('userName'))
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true')

  useEffect(() => {
    const handleAuthChange = () => {
      setUserName(localStorage.getItem('userName'))
      setIsAdmin(localStorage.getItem('isAdmin') === 'true')
    }
    window.addEventListener('authChange', handleAuthChange)
    return () => window.removeEventListener('authChange', handleAuthChange)
  }, [])

  const handleLogout = async () => {
    try {
      if (isAdmin) {
        await axios.post('http://localhost:5000/api/admin/logout')
        localStorage.removeItem('isAdmin')
      } else {
        await axios.post('http://localhost:5000/api/user/logout')
        localStorage.removeItem('userName')
        localStorage.removeItem('userLoggedIn')
      }
      window.dispatchEvent(new Event('authChange'))
      navigate('/')
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Droplet className="h-8 w-8 text-primary-600" />
              <span className="font-bold text-xl text-gray-900 tracking-tight">BloodConnect</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/search" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md font-medium transition-colors">
              Find Donors
            </Link>
            <Link to="/request" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md font-medium transition-colors">
              Request Blood
            </Link>
            
            {userName || isAdmin ? (
              <div className="flex items-center space-x-4 ml-2 border-l pl-4">
                <Link to={isAdmin ? "/admin" : "/profile"} className="text-sm font-medium text-gray-700 flex items-center hover:text-primary-600 transition-colors">
                  <User className="h-4 w-4 mr-1" />
                  {isAdmin ? 'Admin' : userName}
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link to="/user/login" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md font-medium transition-colors">
                Login
              </Link>
            )}

            <Link to="/register" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
              Register as Donor
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
