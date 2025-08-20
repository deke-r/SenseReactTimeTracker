"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import axios from "axios"
import { 
  Calendar, 
  Users, 
  Search, 
  FileText, 
  Clock, 
  Eye, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp
} from "lucide-react"



const API_BASE_URL = process.env.REACT_APP_API_BASE_URL


export default function MonthlyReport() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)  // Add this line
  const [expandedProjects, setExpandedProjects] = useState({})
  const [toast, setToast] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      employeeId: "",
      fromDate: "",
      toDate: "",
    },
  })

  const watchedValues = watch()

  // Toast function
  const showToast = (title, description, variant = "default") => {
    setToast({ title, description, variant })
    setTimeout(() => setToast(null), 5000)
  }

  // Date validation
  const validateDates = () => {
    if (watchedValues.fromDate && watchedValues.toDate) {
      const fromDate = new Date(watchedValues.fromDate)
      const toDate = new Date(watchedValues.toDate)
      return toDate >= fromDate
    }
    return true
  }

  const fetchMonthlyReport = async () => {
    if (!watchedValues.employeeId) {
      showToast("Missing Information", "Please select an employee", "destructive")
      return
    }

    if (!validateDates()) {
      showToast("Invalid Dates", "To date cannot be before from date", "destructive")
      return
    }

    setLoading(true)
    try {
      const params = {
        employeeId: watchedValues.employeeId,
        fromDate: watchedValues.fromDate || null,
        toDate: watchedValues.toDate || null,
      }

      const response = await axios.get(`${API_BASE_URL}/api/monthly-report`, { params })
      
      if (response.data.success) {
        setReports(response.data.reports)
        showToast("Success", `Found ${response.data.reports.length} reports`)
      } else {
        showToast("No Data", "No reports found for the selected criteria")
      }
    } catch (error) {
      showToast("Error", error.response?.data?.error || "Failed to fetch reports", "destructive")
    } finally {
      setLoading(false)
    }
  }

  const toggleProjectExpansion = (reportId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }))
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    return (end.getTime() - start.getTime()) / (1000 * 60)
  }

  // Calculate total statistics
  const totalReports = reports.length
  const totalProjects = reports.reduce((sum, report) => sum + (report.projects?.length || 0), 0)
  const totalTimeMinutes = reports.reduce((sum, report) => {
    return sum + (report.projects?.reduce((projectSum, project) => {
      const duration = calculateDuration(project.start_time, project.end_time)
      return projectSum + duration
    }, 0) || 0)
  }, 0)

  // Fetch employees from database
  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/employees`)
      if (response.data.success) {
        const employeeOptions = response.data.employees.map(emp => ({
          value: `${emp.employee_id}-${emp.employee_name}`,
          label: emp.employee_name
        }))
        setEmployees(employeeOptions)
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
 
    } finally {
      setLoadingEmployees(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Add this function after fetchMonthlyReport function
  const sendMonthlyReportEmail = async () => {
    if (!watchedValues.employeeId) {
      showToast("Missing Information", "Please select an employee", "destructive")
      return
    }

    if (reports.length === 0) {
      showToast("No Data", "Please generate a report first before sending email", "destructive")
      return
    }

    setSendingEmail(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/api/send-monthly-report`, {
        employeeId: watchedValues.employeeId,
        fromDate: watchedValues.fromDate || null,
        toDate: watchedValues.toDate || null,
        reports: reports
      })
      
      if (response.data.success) {
        showToast("Success", response.data.message)
      } else {
        showToast("Error", response.data.error || "Failed to send report", "destructive")
      }
    } catch (error) {
      showToast("Error", error.response?.data?.error || "Failed to send report", "destructive")
    } finally {
      setSendingEmail(false)
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
              <BarChart3 className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Monthly Report Dashboard</h1>
            </div>
            <p className="text-gray-600">Generate and view comprehensive monthly reports for employees</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold mb-4">Report Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Employee *
                  </div>
                </label>
                <select
                  value={watchedValues.employeeId || ""}
                  onChange={(e) => setValue("employeeId", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.employeeId ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={loadingEmployees}
                >
                  <option value="">
                    {loadingEmployees ? "Loading employees..." : "Select employee"}
                  </option>
                  {employees.map((user) => (
                    <option key={user.value} value={user.value}>
                      {user.label}
                    </option>
                  ))}
                </select>
                {errors.employeeId && <p className="text-sm text-red-500">{errors.employeeId.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    From Date
                  </div>
                </label>
                <input
                  type="date"
                  {...register("fromDate")}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fromDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.fromDate && <p className="text-sm text-red-500">{errors.fromDate.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    To Date
                  </div>
                </label>
                <input
                  type="date"
                  min={watchedValues.fromDate || undefined}
                  {...register("toDate", {
                    validate: (value) => {
                      if (watchedValues.fromDate && value) {
                        return new Date(value) >= new Date(watchedValues.fromDate) || "To date cannot be before from date"
                      }
                      return true
                    }
                  })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.toDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.toDate && <p className="text-sm text-red-500">{errors.toDate.message}</p>}
              </div>
            </div>
            
            {/* Button Section - Separate from the grid */}
            <div className="flex gap-2">
              <button
                onClick={fetchMonthlyReport}
                disabled={loading || !watchedValues.employeeId}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "Loading..." : "Generate Report"}
              </button>
              
              {reports.length > 0 && (
                <button
                  onClick={sendMonthlyReportEmail}
                  disabled={sendingEmail || !watchedValues.employeeId}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  title="Send Report"
                >
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {sendingEmail ? "Sending..." : "Send Report"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        {reports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Reports</h3>
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">{totalReports}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Projects</h3>
                <BarChart3 className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">{totalProjects}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Time</h3>
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">{formatDuration(totalTimeMinutes)}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Avg. Time/Project</h3>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">
                {totalProjects > 0 ? formatDuration(Math.round(totalTimeMinutes / totalProjects)) : "0h 0m"}
              </div>
            </div>
          </div>
        )}

        {/* Reports Table */}
        {reports.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Daily Reports</h2>
              <p className="text-gray-600">
                Showing reports for {watchedValues.employeeId.split('-')[1]} 
                {watchedValues.fromDate && watchedValues.toDate && 
                  ` from ${formatDate(watchedValues.fromDate)} to ${formatDate(watchedValues.toDate)}`
                }
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projects Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => {
                    const reportProjects = report.projects || []
                    const reportTotalTime = reportProjects.reduce((sum, project) => {
                      return sum + calculateDuration(project.start_time, project.end_time)
                    }, 0)

                    return (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(report.report_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{reportProjects.length}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDuration(reportTotalTime)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleProjectExpansion(report.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            {expandedProjects[report.id] ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Hide Projects
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4" />
                                View Projects
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Expanded Projects Section */}
            {reports.map((report) => {
              if (!expandedProjects[report.id]) return null
              
              const reportProjects = report.projects || []
              
              return (
                <div key={`projects-${report.id}`} className="border-t bg-gray-50">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Projects for {formatDate(report.report_date)}
                    </h3>
                    <div className="space-y-4">
                      {reportProjects.length > 0 ? (
                        reportProjects.map((project, index) => {
                          const duration = calculateDuration(project.start_time, project.end_time)
                          
                          return (
                            <div key={project.id} className="bg-white rounded-lg border p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border">
                                      {formatTime(project.start_time)} - {formatTime(project.end_time)}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {formatDuration(duration)}
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-lg">{project.project_name}</h4>
                                  {project.task_description && (
                                    <p className="text-gray-600 mt-1">{project.task_description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No projects found for this date
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && reports.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="text-center py-12 px-6">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reports generated yet</h3>
              <p className="text-gray-600">
                Select an employee and optionally set date range to generate a monthly report.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 