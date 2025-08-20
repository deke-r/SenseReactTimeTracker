"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import axios from "axios"
import { Clock, Plus, Trash2, BarChart3, Calendar, Send, FileText, Loader2, Mail, Users, UserPlus } from "lucide-react"

const userOptions = [
  { value: "SPPL0042-BHAVISHYA CHAUHAN", label: "BHAVISHYA CHAUHAN" },
  { value: "SPPL0044-HIMANSHI BANSAL", label: "HIMANSHI BANSAL" },
  { value: "SPPL0031-OM PRAKASH", label: "OM PRAKASH" },
  { value: "SPPL0041-OM SHARMA", label: "OM SHARMA" },
  { value: "SPPL0039-RATAN RAJ", label: "RATAN RAJ" },
  { value: "SPPL0040-SURBHI KASHYAP", label: "SURBHI KASHYAP" },
  { value: "SPPL0046-SUSHANT PANDEY", label: "SUSHANT PANDEY" },
  { value: "SPPL0037-TAUKEER", label: "TAUKEER" },
  { value: "SPPL0043-VINAY SHARMA", label: "VINAY SHARMA" },
]

export default function ProjectTimeTracker() {
  const [projects, setProjects] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [toast, setToast] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      userName: "",
      userEmail: "",
      selectedDate: new Date().toISOString().split("T")[0],
      projectForm: { name: "", startTime: "", endTime: "", description: "" },
    },
  })

  // Watch form values for real-time validation
  const watchedValues = watch()

  // Toast function
  const showToast = (title, description, variant = "default") => {
    setToast({ title, description, variant })
    setTimeout(() => setToast(null), 5000)
  }

  // Generate time options from 9:00 AM to 9:00 PM with 15-minute intervals
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 9; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 21 && minute > 0) continue

        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        times.push({ value: timeString, label: displayTime })
      }
    }
    return times
  }

  const timeOptions = generateTimeOptions()

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    return (end.getTime() - start.getTime()) / (1000 * 60) // Duration in minutes
  }

  const addProject = () => {
    const form = watchedValues.projectForm
    if (!form.name || !form.startTime || !form.endTime || !form.description) return

    const duration = calculateDuration(form.startTime, form.endTime)
    if (duration <= 0) {
      showToast("Invalid Time", "End time must be after start time", "destructive")
      return
    }

    const newProject = {
      id: Date.now().toString(),
      name: form.name,
      description: form.description,
      startTime: form.startTime,
      endTime: form.endTime,
      date: watchedValues.selectedDate,
      duration,
    }

    setProjects([...projects, newProject])

    // Reset the form for next entry
    setValue("projectForm.name", "")
    setValue("projectForm.startTime", "")
    setValue("projectForm.endTime", "")
    setValue("projectForm.description", "")
  }

  const removeProject = (projectId) => {
    setProjects(projects.filter((p) => p.id !== projectId))
  }

  // Analytics calculations
  const totalProjects = projects.length
  const totalTimeMinutes = projects.reduce((sum, project) => sum + project.duration, 0)
  const averageTimeMinutes = totalProjects > 0 ? totalTimeMinutes / totalProjects : 0

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const generateAndSendReport = async () => {
    if (!watchedValues.userName.trim()) {
      showToast("Missing Information", "Please enter your name before sending the report", "destructive")
      return
    }

    if (projects.length === 0) {
      showToast("No Projects", "Please add at least one project before sending the report", "destructive")
      return
    }

    setIsGenerating(true)
    showToast("Sending Report...", "Please wait while we send your daily report")

    try {
      const reportData = {
        userName: watchedValues.userName,
        date: formatDate(watchedValues.selectedDate),
        projects: projects.sort((a, b) => a.startTime.localeCompare(b.startTime)),
        stats: {
          totalProjects,
          totalTime: formatDuration(totalTimeMinutes),
          averageTime: formatDuration(Math.round(averageTimeMinutes)),
          totalTimeMinutes,
        },
        additionalEmail: watchedValues.userEmail.trim() || undefined,
      }

      const response = await axios.post(`${API_BASE_URL}/api/generate-report`, reportData)

      if (response.data.success) {
        const successMessage = watchedValues.userEmail.trim()
          ? `Daily report has been sent to HR manager and your email (${watchedValues.userEmail}). You will receive a confirmation email shortly.`
          : `Daily report has been sent to HR manager. You will receive a confirmation email shortly.`

        showToast("✅ Report Sent Successfully!", successMessage)

        // Clear the form after successful generation
        setProjects([])
        setValue("projectForm.name", "")
        setValue("projectForm.startTime", "")
        setValue("projectForm.endTime", "")
        setValue("projectForm.description", "")
      }
    } catch (error) {
      showToast("❌ Error", error.response?.data?.error || "Failed to send report", "destructive")
    } finally {
      setIsGenerating(false)
    }
  }

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
      // Fallback to hardcoded options if API fails
      setEmployees([
        { value: "SPPL0042-BHAVISHYA CHAUHAN", label: "BHAVISHYA CHAUHAN" },
        { value: "SPPL0044-HIMANSHI BANSAL", label: "HIMANSHI BANSAL" },
        { value: "SPPL0031-OM PRAKASH", label: "OM PRAKASH" },
        { value: "SPPL0041-OM SHARMA", label: "OM SHARMA" },
        { value: "SPPL0039-RATAN RAJ", label: "RATAN RAJ" },
        { value: "SPPL0040-SURBHI KASHYAP", label: "SURBHI KASHYAP" },
        { value: "SPPL0046-SUSHANT PANDEY", label: "SUSHANT PANDEY" },
        { value: "SPPL0037-TAUKEER", label: "TAUKEER" },
        { value: "SPPL0043-VINAY SHARMA", label: "VINAY SHARMA" },
      ])
    } finally {
      setLoadingEmployees(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

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

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Sense Time Tracker</h1>
            </div>
            <p className="text-gray-600">Track your daily projects and analyze your work patterns</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Your Name *</label>
                <select
                  value={watchedValues.userName || ""}
                  onChange={(e) => setValue("userName", e.target.value, { shouldValidate: true })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.userName ? "border-red-500" : "border-gray-300"
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
                {errors.userName && <p className="text-sm text-red-500">{errors.userName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Your Email (Optional)
                  </div>
                </label>
                <input
                  type="email"
                  placeholder="your.email@company.com"
                  {...register("userEmail", {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Please enter a valid email address",
                    },
                  })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.userEmail ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.userEmail && <p className="text-sm text-red-500">{errors.userEmail.message}</p>}
                <p className="text-xs text-gray-500">If provided, you'll receive a copy of the report</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  {...register("selectedDate", { required: "Date is required" })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.selectedDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.selectedDate && <p className="text-sm text-red-500">{errors.selectedDate.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Project Entry Forms */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Add Projects</h2>
            <p className="text-gray-600">
              Office hours: 9:00 AM - 9:00 PM • Date: {formatDate(watchedValues.selectedDate)}
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                  <input
                    type="text"
                    placeholder="Enter project name"
                    {...register("projectForm.name", {
                      required: "Project name is required",
                      minLength: { value: 2, message: "Project name must be at least 2 characters" },
                    })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.projectForm?.name ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.projectForm?.name && (
                    <p className="text-sm text-red-500">{errors.projectForm.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Time *</label>
                  <select
                    value={watchedValues.projectForm?.startTime || ""}
                    onChange={(e) => setValue("projectForm.startTime", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.projectForm?.startTime ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select start time</option>
                    {timeOptions.map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                  {errors.projectForm?.startTime && (
                    <p className="text-sm text-red-500">{errors.projectForm.startTime.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">End Time *</label>
                  <select
                    value={watchedValues.projectForm?.endTime || ""}
                    onChange={(e) => setValue("projectForm.endTime", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.projectForm?.endTime ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select end time</option>
                    {timeOptions.map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                  {errors.projectForm?.endTime && (
                    <p className="text-sm text-red-500">{errors.projectForm.endTime.message}</p>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={addProject}
                    disabled={
                      !watchedValues.projectForm?.name ||
                      !watchedValues.projectForm?.startTime ||
                      !watchedValues.projectForm?.endTime ||
                      !watchedValues.projectForm?.description
                    }
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Description *</label>
                <textarea
                  placeholder="Enter project description"
                  {...register("projectForm.description", {
                    required: "Description is required",
                    minLength: { value: 10, message: "Description must be at least 10 characters" },
                  })}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.projectForm?.description ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.projectForm?.description && (
                  <p className="text-sm text-red-500">{errors.projectForm.description.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Report Section */}
        {projects.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5" />
                <h2 className="text-xl font-bold">Send Report</h2>
              </div>
              <p className="text-gray-600">Send your daily report to HR manager via email</p>
            </div>
            <div className="p-6">
              <button
                onClick={generateAndSendReport}
                disabled={isGenerating}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isGenerating ? "Sending Report..." : "Send Daily Report"}
              </button>
            </div>
          </div>
        )}

        {/* Analytics Dashboard */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <h3 className="text-sm font-medium text-gray-600">Average Time</h3>
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">{formatDuration(Math.round(averageTimeMinutes))}</div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {projects.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Project Timeline</h2>
              <p className="text-gray-600">
                {watchedValues.userName && `${watchedValues.userName}'s `}Daily project timeline for{" "}
                {formatDate(watchedValues.selectedDate)}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {projects
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((project, index) => (
                    <div key={project.id} className="relative">
                      {index > 0 && <hr className="mb-4 border-gray-200" />}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border">
                              {formatTime(project.startTime)} - {formatTime(project.endTime)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {formatDuration(project.duration)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          <p className="text-gray-600 mt-1">{project.description}</p>
                        </div>
                        <button
                          onClick={() => removeProject(project.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {projects.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="text-center py-12 px-6">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects added yet</h3>
              <p className="text-gray-600">
                Start by adding your first project above to see your timeline and analytics.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
