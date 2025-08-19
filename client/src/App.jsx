import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import ProjectTimeTracker from "./components/ProjectTimeTracker"
import Admin from "./components/Admin"
import { Clock, Users } from "lucide-react"

function App() {
  return (
    <Router>
      <div className="App">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Sense Time Tracker</h1>
              </div>
              <div className="flex space-x-4">
                <Link
                  to="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Clock className="h-4 w-4" />
                  Time Tracker
                </Link>
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Users className="h-4 w-4" />
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<ProjectTimeTracker />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
