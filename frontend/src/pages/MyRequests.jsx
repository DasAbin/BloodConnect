import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Clock3, CheckCircle, XCircle, Calendar, MapPin, Droplet } from 'lucide-react'

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

const MyRequests = () => {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  axios.defaults.withCredentials = true

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/user/profile')
        setRequests(res.data.requests)
        setLoading(false)
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/user/login')
        }
        setLoading(false)
      }
    }
    fetchRequests()
  }, [navigate])

  if (loading) return <div className="text-center py-20 text-gray-500">Loading your requests...</div>

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">My Blood Requests</h2>
        <button 
          onClick={() => navigate('/request')}
          className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
        >
          New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-500 text-lg">You haven't made any requests yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requests.map(req => (
            <div key={req.request_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center">
                    <span className={`w-12 h-12 flex items-center justify-center rounded-xl text-lg font-black mr-4 ${bloodGroupColors[req.blood_group]}`}>
                      {req.blood_group}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{req.units_needed} Units Needed</h3>
                      <p className="text-sm text-gray-500 flex items-center mt-0.5">
                        <MapPin className="w-3.5 h-3.5 mr-1" /> {req.city}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center
                      ${req.urgency === 'Critical' ? 'bg-red-100 text-red-700' : 
                        req.urgency === 'High' ? 'bg-orange-100 text-orange-700' : 
                        'bg-blue-100 text-blue-700'}`}>
                      {req.urgency.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center
                      ${req.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-600'}`}>
                      {req.status === 'fulfilled' ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : 
                       req.status === 'pending' ? <Clock3 className="w-3.5 h-3.5 mr-1" /> : 
                       <XCircle className="w-3.5 h-3.5 mr-1" />}
                      {req.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Request ID</p>
                    <p className="font-bold">#REQ-{req.request_id}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Patient Name</p>
                    <p className="font-bold">{req.requester_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Contact No.</p>
                    <p className="font-bold">{req.contact}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Submitted On</p>
                    <p className="font-bold flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyRequests
