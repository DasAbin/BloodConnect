import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { LogOut, Users, Activity, CheckCircle, XCircle } from 'lucide-react'

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

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [inventory, setInventory] = useState([])
  const [donors, setDonors] = useState([])
  const [requests, setRequests] = useState([])
  const [reports, setReports] = useState([])
  const [shortages, setShortages] = useState([])
  const [activeTab, setActiveTab] = useState('inventory')
  const [modalData, setModalData] = useState({ isOpen: false, reqId: null, donorId: '', units: '' })

  axios.defaults.withCredentials = true

  const checkAuth = async () => {
    try {
      await axios.get('http://localhost:5000/api/admin/check')
    } catch (err) {
      navigate('/admin/login')
    }
  }

  const fetchData = async () => {
    try {
      const [statsRes, invRes, donRes, reqRes, repRes, shortRes] = await Promise.all([
        axios.get('http://localhost:5000/api/stats'),
        axios.get('http://localhost:5000/api/inventory'),
        axios.get('http://localhost:5000/api/donors'),
        axios.get('http://localhost:5000/api/requests'),
        axios.get('http://localhost:5000/api/reports'),
        axios.get('http://localhost:5000/api/shortage')
      ])
      setStats(statsRes.data)
      setInventory(invRes.data)
      setDonors(donRes.data)
      setRequests(reqRes.data)
      setReports(repRes.data)
      setShortages(shortRes.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    checkAuth().then(fetchData)
  }, [])

  const handleLogout = async () => {
    await axios.post('http://localhost:5000/api/admin/logout')
    navigate('/admin/login')
  }

  const toggleDonorAvailability = async (id, currentStatus) => {
    await axios.patch(`http://localhost:5000/api/donors/${id}`, { is_available: !currentStatus })
    fetchData()
  }

  const deleteDonor = async (id) => {
    if(window.confirm('Are you sure you want to delete this donor?')) {
      await axios.delete(`http://localhost:5000/api/donors/${id}`)
      fetchData()
    }
  }

  const updateRequestStatus = async (id, newStatus) => {
    if (newStatus === 'fulfilled') {
      setModalData({ isOpen: true, reqId: id, donorId: '', units: '' })
    } else {
      await axios.patch(`http://localhost:5000/api/requests/${id}`, { status: newStatus })
      fetchData()
    }
  }

  const submitDonation = async () => {
    try {
      await axios.patch(`http://localhost:5000/api/requests/${modalData.reqId}`, { status: 'fulfilled' })
      await axios.post('http://localhost:5000/api/donations', {
        donor_id: parseInt(modalData.donorId),
        request_id: modalData.reqId,
        units_donated: parseInt(modalData.units)
      })
      alert('Donation logged successfully!')
      setModalData({ isOpen: false, reqId: null, donorId: '', units: '' })
      fetchData()
    } catch(err) {
      alert('Failed to log donation.')
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-primary-800 to-primary-900 text-white shadow-xl flex flex-col">
        <div className="p-6">
          <h2 className="text-2xl font-bold">Admin Panel</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab('inventory')} className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === 'inventory' ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}>Dashboard & Inventory</button>
          <button onClick={() => setActiveTab('donors')} className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === 'donors' ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}>Manage Donors</button>
          <button onClick={() => setActiveTab('requests')} className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === 'requests' ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}>Manage Requests</button>
          <button onClick={() => setActiveTab('reports')} className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === 'reports' ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}>Reports</button>
        </nav>
        <div className="p-4">
          <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8 relative">
        
        {shortages.length > 0 && activeTab === 'reports' && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex items-center">
            <span className="font-bold mr-2">⚠ Low Stock Alert:</span>
            <span>{shortages.map(s => s.blood_group).join(', ')}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Total Donors</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_donors}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Active Donors</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.active_donors_count}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Pending Requests</p>
            <p className="text-3xl font-bold text-orange-500 mt-2">{stats.pending_requests}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Fulfilled</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.fulfilled_requests}</p>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Blood Inventory</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map((inv, idx) => (
                  <tr key={inv.inventory_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${bloodGroupColors[inv.blood_group]}`}>{inv.blood_group}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{inv.units_available}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(inv.last_updated).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'donors' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Donor Management</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blood Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {donors.map((donor, idx) => (
                  <tr key={donor.donor_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donor.donor_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{donor.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-bold ${bloodGroupColors[donor.blood_group]}`}>{donor.blood_group}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donor.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {donor.is_available ? 
                        <span className="text-green-600 flex items-center text-sm"><CheckCircle className="w-4 h-4 mr-1"/> Available</span> : 
                        <span className="text-gray-400 flex items-center text-sm"><XCircle className="w-4 h-4 mr-1"/> Unavailable</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button onClick={() => toggleDonorAvailability(donor.donor_id, donor.is_available)} className="text-blue-600 hover:text-blue-900">Toggle Status</button>
                      <button onClick={() => deleteDonor(donor.donor_id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Request Management</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Need</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Update Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req, idx) => (
                  <tr key={req.request_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.request_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{req.requester_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold mr-2 ${bloodGroupColors[req.blood_group]}`}>{req.blood_group}</span>
                      {req.units_needed} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${req.urgency === 'Critical' ? 'bg-red-100 text-red-800' : 
                          req.urgency === 'High' ? 'bg-orange-100 text-orange-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {req.urgency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                       <span className={`font-medium ${req.status === 'pending' ? 'text-yellow-600' : req.status === 'fulfilled' ? 'text-green-600' : 'text-gray-500'}`}>
                         {req.status.toUpperCase()}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <select 
                        value={req.status} 
                        onChange={(e) => updateRequestStatus(req.request_id, e.target.value)}
                        className="rounded border-gray-300 text-sm p-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Inventory Reports</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blood Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Donors</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Donated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((rep, idx) => (
                  <tr key={rep.blood_group} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-bold ${bloodGroupColors[rep.blood_group]}`}>{rep.blood_group}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rep.total_donors}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rep.available_donors}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rep.total_donated}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rep.current_stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {rep.stock_status === 'LOW' ? (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full font-bold text-xs">LOW</span>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold text-xs">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {modalData.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center text-red-600">Fulfill Request</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Donor ID</label>
                <input 
                  type="number" 
                  value={modalData.donorId} 
                  onChange={e => setModalData({...modalData, donorId: e.target.value})}
                  className="w-full rounded-lg border-gray-300 border p-2 focus:ring-red-500 focus:border-red-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Units Donated</label>
                <input 
                  type="number" 
                  value={modalData.units} 
                  onChange={e => setModalData({...modalData, units: e.target.value})}
                  className="w-full rounded-lg border-gray-300 border p-2 focus:ring-red-500 focus:border-red-500" 
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button 
                onClick={() => setModalData({ isOpen: false, reqId: null, donorId: '', units: '' })}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitDonation}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-colors"
              >
                Confirm Donation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
