import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Activity, Users, MapPin, Heart } from 'lucide-react'

const Home = () => {
  const [stats, setStats] = useState({
    total_donors: 0,
    active_donors_count: 0,
    fulfilled_requests: 0,
  })
  const [shortages, setShortages] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, shortageRes] = await Promise.all([
          axios.get('http://localhost:5000/api/stats'),
          axios.get('http://localhost:5000/api/shortage')
        ])
        setStats(statsRes.data)
        setShortages(shortageRes.data)
      } catch (err) {
        console.error("Error fetching data:", err)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary-800 to-primary-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl drop-shadow-md">
              <span className="block">Give the Gift of Life</span>
              <span className="block text-primary-200 mt-2">Donate Blood Today</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-primary-100 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Connecting blood donors with those in critical need. Join our community and become a hero in someone's life.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link to="/register" className="px-8 py-3 border border-transparent text-base font-medium rounded-xl text-primary-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                Register as Donor
              </Link>
              <Link to="/request" className="px-8 py-3 border border-white text-base font-medium rounded-xl text-white hover:bg-primary-700 md:py-4 md:text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 bg-white/10 backdrop-blur-sm">
                Request Blood
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {shortages.length > 0 && (
        <div className="bg-red-600 text-white py-2 overflow-hidden whitespace-nowrap shadow-inner">
          <div className="animate-[marquee_20s_linear_infinite] inline-block font-semibold">
            <span className="mx-4">⚠ URGENT: Low stock for [{shortages.map(s => s.blood_group).join(', ')}] — donors needed immediately</span>
            <span className="mx-4">⚠ URGENT: Low stock for [{shortages.map(s => s.blood_group).join(', ')}] — donors needed immediately</span>
          </div>
        </div>
      )}

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 bg-blue-50 rounded-full mb-4">
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">{stats.total_donors}</p>
            <p className="text-gray-500 font-medium">Registered Donors</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 bg-green-50 rounded-full mb-4">
              <Heart className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">{stats.fulfilled_requests}</p>
            <p className="text-gray-500 font-medium">Lives Saved (Fulfilled)</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 bg-purple-50 rounded-full mb-4">
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">{stats.active_donors_count}</p>
            <p className="text-gray-500 font-medium">Active Donors Ready</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
