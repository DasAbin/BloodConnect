import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { User, Activity, MapPin, Phone, Droplet, Clock, CheckCircle, Clock3 } from 'lucide-react'

const bloodGroupColors = {
  'A+': 'bg-red-100 text-red-800',
  'A-': 'bg-pink-100 text-pink-800',
  'B+': 'bg-blue-100 text-blue-800',
  'B-': 'bg-indigo-100 text-indigo-800',
  'AB+': 'bg-purple-100 text-purple-800',
  'AB-': 'bg-fuchsia-100 text-fuchsia-800',
  'O+': 'bg-green-100 text-green-800',
  'O-': 'bg-emerald-100 text-emerald-800',
}

const UserProfile = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  axios.defaults.withCredentials = true

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/user/profile')
        setProfile(res.data)
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/user/login')
        } else {
          setError('Failed to load profile')
        }
      }
    }
    fetchProfile()
  }, [navigate])

  if (error) return <div className="text-center py-12 text-red-500">{error}</div>
  if (!profile) return <div className="text-center py-12 text-gray-500">Loading profile...</div>

  const { user, requests } = profile

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-8">My Profile</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Details Card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-primary-100 p-4 rounded-full">
                <User className="w-12 h-12 text-primary-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-6">{user.name}</h3>
            
            <div className="space-y-4">
              <div className="flex items-center text-gray-700">
                <Droplet className="w-5 h-5 mr-3 text-red-500" />
                <span className="font-medium mr-2">Blood Group:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${bloodGroupColors[user.blood_group] || 'bg-gray-100'}`}>
                  {user.blood_group}
                </span>
              </div>
              <div className="flex items-center text-gray-700">
                <Activity className="w-5 h-5 mr-3 text-blue-500" />
                <span className="font-medium mr-2">Age:</span> {user.age} yrs
              </div>
              <div className="flex items-center text-gray-700">
                <Phone className="w-5 h-5 mr-3 text-green-500" />
                <span className="font-medium mr-2">Contact:</span> {user.contact}
              </div>
              <div className="flex items-center text-gray-700">
                <MapPin className="w-5 h-5 mr-3 text-orange-500" />
                <span className="font-medium mr-2">City:</span> {user.city}
              </div>
              <div className="flex items-center text-gray-700">
                <Clock className="w-5 h-5 mr-3 text-gray-500" />
                <span className="font-medium mr-2">Joined:</span> {new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Donor Status</h4>
              {!user.donor_id ? (
                <div className="bg-primary-50 rounded-xl p-4">
                  <p className="text-xs text-primary-700 mb-3">You aren't registered as a donor yet. Join us to save lives!</p>
                  <button 
                    onClick={() => navigate('/register')}
                    className="w-full bg-primary-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Register as Donor
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4">
                  {(() => {
                    if (!user.last_donation_date) return <p className="text-sm font-bold text-green-600">You are eligible to donate now ✓</p>
                    const nextDate = new Date(user.last_donation_date)
                    nextDate.setDate(nextDate.getDate() + 90)
                    const today = new Date()
                    if (today >= nextDate) return <p className="text-sm font-bold text-green-600">You are eligible to donate now ✓</p>
                    return (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Next eligible donation date:</p>
                        <p className="text-sm font-bold text-primary-600">{nextDate.toLocaleDateString()}</p>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
            <h3 className="text-xl font-bold text-gray-900 mb-6">My Blood Requests</h3>
            
            {requests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                You haven't made any blood requests yet.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req.request_id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold mr-3 ${bloodGroupColors[req.blood_group]}`}>
                          {req.blood_group}
                        </span>
                        <h4 className="font-bold text-gray-900">{req.units_needed} units needed</h4>
                      </div>
                      <span className={`flex items-center text-sm font-medium ${req.status === 'fulfilled' ? 'text-green-600' : 'text-orange-500'}`}>
                        {req.status === 'fulfilled' ? <CheckCircle className="w-4 h-4 mr-1" /> : <Clock3 className="w-4 h-4 mr-1" />}
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-3">
                      <div><span className="font-medium">Patient:</span> {req.requester_name}</div>
                      <div><span className="font-medium">City:</span> {req.city}</div>
                      <div><span className="font-medium">Urgency:</span> <span className="font-bold">{req.urgency}</span></div>
                      <div><span className="font-medium">Requested On:</span> {new Date(req.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}

export default UserProfile
