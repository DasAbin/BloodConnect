import { Link } from 'react-router-dom'
import { Droplet } from 'lucide-react'

const Navbar = () => {
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
