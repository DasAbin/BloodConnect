import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const RequestBlood = () => {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [formData, setFormData] = useState({
    requester_name: '',
    blood_group: 'A+',
    units_needed: 1,
    city: '',
    contact: '',
    urgency: 'Normal'
  })

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/user/check')
        if (res.data.logged_in) {
          setIsLoggedIn(true)
          const profileRes = await axios.get('http://localhost:5000/api/user/profile')
          const u = profileRes.data.user
          setFormData(prev => ({
            ...prev,
            requester_name: u.name,
            blood_group: u.blood_group,
            city: u.city,
            contact: u.contact
          }))
        }
      } catch (err) {
        // Not logged in or error, just continue with empty form
      }
    }
    checkUser()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://localhost:5000/api/requests', formData)
      alert('Request submitted successfully!')
      setFormData({ ...formData, requester_name: '', units_needed: 1, city: '', contact: '' })
    } catch (err) {
      console.error(err)
      alert('Error submitting request')
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">Request Blood</h2>
        <p className="text-center text-gray-500 mb-8">
          {isLoggedIn ? (
            <span className="text-green-600 font-medium">✓ Details pre-filled from your profile</span>
          ) : (
            <span className="text-primary-600">Login to auto-fill your details</span>
          )}
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient / Requester Name</label>
              <input type="text" name="requester_name" value={formData.requester_name} required disabled={isLoggedIn} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group Needed</label>
              <select name="blood_group" value={formData.blood_group} disabled={isLoggedIn} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500">
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Units Needed</label>
              <input type="number" name="units_needed" value={formData.units_needed} required min="1" onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" name="city" value={formData.city} required disabled={isLoggedIn} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input type="tel" name="contact" value={formData.contact} required disabled={isLoggedIn} onChange={handleChange} className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgency Level</label>
              <div className="flex space-x-4">
                {['Normal', 'High', 'Critical'].map(level => (
                  <label key={level} className="flex items-center space-x-2">
                    <input type="radio" name="urgency" value={level} checked={formData.urgency === level} onChange={handleChange} className="text-primary-600 focus:ring-primary-500 h-4 w-4" />
                    <span className="text-gray-900">{level}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-primary-600 text-white rounded-xl py-3 font-medium hover:bg-primary-700 transition-colors shadow-sm mt-8">
            Submit Request
          </button>
        </form>
      </div>
    </div>
  )
}

export default RequestBlood
