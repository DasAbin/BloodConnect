import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, MapPin, Phone } from 'lucide-react'

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

const SearchDonors = () => {
  const [donors, setDonors] = useState([])
  const [bloodGroup, setBloodGroup] = useState('')
  const [city, setCity] = useState('')

  const fetchDonors = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/donors/search?blood_group=${encodeURIComponent(bloodGroup)}&city=${encodeURIComponent(city)}`)
      setDonors(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchDonors()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchDonors()
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Find a Blood Donor</h2>
        <p className="mt-4 text-lg text-gray-500">Search our database of willing donors by blood group and city.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="w-full rounded-lg border-gray-300 border p-3 focus:ring-primary-500 focus:border-primary-500">
              <option value="">Any Blood Group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border-gray-300 border p-3 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 flex items-center justify-center font-medium transition-colors">
            <Search className="w-5 h-5 mr-2" />
            Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {donors.map(donor => (
          <div key={donor.donor_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{donor.name}</h3>
                <div className="flex items-center text-gray-500 mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{donor.city}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${bloodGroupColors[donor.blood_group] || 'bg-gray-100'}`}>
                {donor.blood_group}
              </span>
            </div>
            
            <div className="flex items-center mb-4">
              <span className="relative flex h-3 w-3 mr-2">
                {donor.is_available ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                )}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {donor.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            {donor.is_available && donor.phone && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-primary-600">
                <Phone className="w-4 h-4 mr-2" />
                <span className="font-medium">{donor.phone}</span>
                {donor.phone.includes('*') && (
                  <span className="ml-2 text-xs text-gray-500 italic cursor-help" title="Registration/Login required to view contact info">
                    (Login to see)
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {donors.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
            No donors found matching your criteria.
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchDonors
