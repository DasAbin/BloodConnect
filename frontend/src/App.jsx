import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import axios from 'axios'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import DonorRegistration from './pages/DonorRegistration'
import SearchDonors from './pages/SearchDonors'
import RequestBlood from './pages/RequestBlood'
import UserLogin from './pages/UserLogin'
import UserRegister from './pages/UserRegister'
import UserProfile from './pages/UserProfile'
import AdminDashboard from './pages/AdminDashboard'

axios.defaults.withCredentials = true

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<DonorRegistration />} />
            <Route path="/search" element={<SearchDonors />} />
            <Route path="/request" element={<RequestBlood />} />
            <Route path="/login" element={<UserLogin />} />
            <Route path="/user/login" element={<UserLogin />} />
            <Route path="/user/register" element={<UserRegister />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
