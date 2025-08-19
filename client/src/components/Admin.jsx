"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import axios from "axios"
import { 
  Users, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit,
  Loader2,
  UserPlus,
  FileText
} from "lucide-react"
import MonthlyReport from "./MonthlyReport"

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL

export default function Admin() {
  const [activeTab, setActiveTab] = useState("employees")
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      employeeId: "",
      employeeName: "",
    },
  })

  // Toast function
  const showToast = (title, description, variant = "default") => {
    setToast({ title, description, variant })
    setTimeout(() => setToast(null), 5000)
  }

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/employees`)
      if (response.data.success) {
        setEmployees(response.data.employees)
      }
    } catch (error) {
      showToast("Error", "Failed to fetch employees", "destructive")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Add employee
  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/api/employees`, data)
      if (response.data.success) {
        showToast("Success", "Employee added successfully")
        reset()
        fetchEmployees()
      }
    } catch (error) {
      showToast("Error", error.response?.data?.error || "Failed to add employee", "destructive")
    } finally {
      setLoading(false)
    }
  }

  // Delete employee
  const deleteEmployee = async (employeeId) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return

    setLoading(true)
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/employees/${employeeId}`)
      if (response.data.success) {
        showToast("Success", "Employee deleted successfully")
        fetchEmployees()
      }
    } catch (error) {
      showToast("Error", error.response?.data?.error || "Failed to delete employee", "destructive")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
            toast.variant === "destructive" ? "bg-red-500 text-white" : "bg-white border"
          }`}
        >
          <div className="font-semibold">{toast.title}</div>
          <div className="text-sm mt-1">{toast.description}</div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-gray-600">Manage employees and view reports</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("employees")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "employees"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manage Employees
                </div>
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "reports"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Monthly Reports
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "employees" && (
              <div className="space-y-6">
                {/* Add Employee Form */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Add New Employee
                  </h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Employee ID *
                      </label>
                      <input
                        type="text"
                        {...register("employeeId", { required: "Employee ID is required" })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.employeeId ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="e.g., SPPL0042"
                      />
                      {errors.employeeId && <p className="text-sm text-red-500">{errors.employeeId.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Employee Name *
                      </label>
                      <input
                        type="text"
                        {...register("employeeName", { required: "Employee name is required" })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.employeeName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="e.g., John Doe"
                      />
                      {errors.employeeName && <p className="text-sm text-red-500">{errors.employeeName.message}</p>}
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {loading ? "Adding..." : "Add Employee"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Employees List */}
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Current Employees ({employees.length})
                  </h2>
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {employees.map((employee) => (
                          <tr key={employee.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{employee.employee_id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{employee.employee_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => deleteEmployee(employee.employee_id)}
                                className="text-red-600 hover:text-red-900 flex items-center gap-1"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {employees.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No employees found. Add your first employee above.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reports" && (
              <div>
                <MonthlyReport />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 