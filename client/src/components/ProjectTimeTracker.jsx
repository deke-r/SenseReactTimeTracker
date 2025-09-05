"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import axios from "axios"
import { Clock, Plus, Trash2, BarChart3, Calendar, Pencil, Send, FileText, Loader2, Mail, Edit } from "lucide-react"

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL

export default function ProjectTimeTracker() {
  const [projects, setProjects] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [toast, setToast] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [editProject, setEditProject] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", startTime: "", endTime: "", description: "" })
  const [employeeProjects, setEmployeeProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [newProjectForm, setNewProjectForm] = useState({ name: "", startDate: "", endDate: "" })
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false)
  const [editProjectForm, setEditProjectForm] = useState({ name: "", startDate: "", endDate: "" })
  const [deletingProjectId, setDeletingProjectId] = useState(null)

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
      projectForm: { selectedProjectId: "", startTime: "", endTime: "", description: "" },
    },
  })

  const watchedValues = watch()

  const showToast = (title, description, variant = "default") => {
    setToast({ title, description, variant })
    setTimeout(() => setToast(null), 5000)
  }

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
    return (end.getTime() - start.getTime()) / (1000 * 60)
  }

  const parseEmpId = (userName) => (userName ? userName.split("-")[0].trim() : "")

  const addProject = () => {
    const form = watchedValues.projectForm
    if (!form.selectedProjectId || !form.startTime || !form.endTime || !form.description) return

    const duration = calculateDuration(form.startTime, form.endTime)
    if (duration <= 0) {
      showToast("Invalid Time", "End time must be after start time", "destructive")
      return
    }

    const selectedProject = employeeProjects.find(p => String(p.id) === String(form.selectedProjectId))
    if (!selectedProject) {
      showToast("Project missing", "Please select a project", "destructive")
      return
    }

    const newProject = {
      id: Date.now().toString(),
      projectId: selectedProject.id,
      name: selectedProject.project_name,
      description: form.description,
      startTime: form.startTime,
      endTime: form.endTime,
      date: watchedValues.selectedDate,
      duration,
    }

    setProjects([...projects, newProject])

    setValue("projectForm.selectedProjectId", "")
    setValue("projectForm.startTime", "")
    setValue("projectForm.endTime", "")
    setValue("projectForm.description", "")
  }

  const removeProject = (projectId) => {
    setProjects(projects.filter((p) => p.id !== projectId))
  }

  const openEditModal = (project) => {
    setEditProject(project)
    setEditForm({
      name: project.name,
      startTime: project.startTime,
      endTime: project.endTime,
      description: project.description,
    })
  }

  const closeEditModal = () => {
    setEditProject(null)
    setEditForm({ name: "", startTime: "", endTime: "", description: "" })
  }

  const saveEdit = () => {
    const { name, startTime, endTime, description } = editForm
    if (!name.trim() || !startTime || !endTime || !description.trim()) {
      showToast("Missing Information", "All fields are required", "destructive")
      return
    }
    const duration = calculateDuration(startTime, endTime)
    if (duration <= 0) {
      showToast("Invalid Time", "End time must be after start time", "destructive")
      return
    }

    setProjects((prev) =>
      prev.map((p) =>
        p.id === editProject.id
          ? { ...p, name: name.trim(), startTime, endTime, description: description.trim(), duration }
          : p
      )
    )
    showToast("Updated", "Project updated successfully")
    closeEditModal()
  }

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

  const fetchProjectsForEmployee = async (empId) => {
    if (!empId) {
      setEmployeeProjects([])
      return
    }
    try {
      setLoadingProjects(true)
      const res = await axios.get(`${API_BASE_URL}/api/projects`, { params: { employeeId: empId } })
      setEmployeeProjects(res.data.projects || [])
    } catch (e) {
      console.error(e)
      showToast("Error", "Failed to fetch projects", "destructive")
    } finally {
      setLoadingProjects(false)
    }
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
        projects: projects.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(p => ({
          projectId: p.projectId || null,
          name: p.name,
          startTime: p.startTime,
          endTime: p.endTime,
          description: p.description,
          duration: p.duration,
        })),
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

        setProjects([])
        setValue("projectForm.selectedProjectId", "")
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

  const openEditProjectModal = (project) => {
    setEditProject(project)
    setEditProjectForm({
      name: project.project_name,
      startDate: project.start_date,
      endDate: project.end_date,
    })
    setEditProjectModalOpen(true)
  }

  const closeEditProjectModal = () => {
    setEditProjectModalOpen(false)
    setEditProject(null)
    setEditProjectForm({ name: "", startDate: "", endDate: "" })
  }

  const saveProjectEdit = async () => {
    const { name, startDate, endDate } = editProjectForm
    if (!name.trim() || !startDate || !endDate) {
      showToast("Missing Information", "All fields are required", "destructive")
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      showToast("Invalid Date", "End date must be after start date", "destructive")
      return
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/api/projects/${editProject.id}`, {
        project_name: name.trim(),
        start_date: startDate,
        end_date: endDate,
      })

      if (response.data.success) {
        showToast("✅ Project Updated", response.data.message)
        
        // Update the local state
        setEmployeeProjects(prev => 
          prev.map(p => 
            p.id === editProject.id 
              ? { ...p, project_name: name.trim(), start_date: startDate, end_date: endDate }
              : p
          )
        )
        
        closeEditProjectModal()
      }
    } catch (error) {
      showToast("❌ Error", error.response?.data?.error || "Failed to update project", "destructive")
    }
  }

  const deleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete the project "${projectName}"? This will also delete all related time reports for this project.`)) {
      return
    }

    setDeletingProjectId(projectId)
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/projects/${projectId}`)
      
      if (response.data.success) {
        showToast("✅ Project Deleted", `${response.data.message} (${response.data.deletedReports} reports deleted)`)
        
        // Update the local state
        setEmployeeProjects(prev => prev.filter(p => p.id !== projectId))
        
        // Also remove from current day's projects if it exists
        setProjects(prev => prev.filter(p => p.projectId !== projectId))
      }
    } catch (error) {
      showToast("❌ Error", error.response?.data?.error || "Failed to delete project", "destructive")
    } finally {
      setDeletingProjectId(null)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    const empId = parseEmpId(watchedValues.userName)
    fetchProjectsForEmployee(empId)
  }, [watchedValues.userName])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
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

        {/* Projects Section - UPDATED WITH EDIT/DELETE BUTTONS */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Projects</h2>
            <p className="text-gray-600">Manage projects for the selected employee</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setProjectModalOpen(true)}
                disabled={!watchedValues.userName}
                className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Add Project
              </button>
            </div>

            {employeeProjects.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2">Name</th>
                      <th className="py-2">Start</th>
                      <th className="py-2">End</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeProjects.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="py-2">{p.project_name}</td>
                        <td className="py-2">{p.start_date ? new Date(p.start_date).toLocaleDateString() : "-"}</td>
                        <td className="py-2">{p.end_date ? new Date(p.end_date).toLocaleDateString() : "-"}</td>
                        <td className="py-2">
                          <select
                            value={p.status || "active"}
                            onChange={async (e) => {
                              const newStatus = e.target.value
                              const prevStatus = p.status || "active"
                              // optimistic update
                              setEmployeeProjects(prev => prev.map(ep => ep.id === p.id ? { ...ep, status: newStatus } : ep))
                              setUpdatingStatusId(p.id)
                              try {
                                await axios.patch(`${API_BASE_URL}/api/projects/${p.id}/status`, { status: newStatus })
                                showToast("Updated", "Status updated")
                              } catch (err) {
                                // revert on failure
                                setEmployeeProjects(prev => prev.map(ep => ep.id === p.id ? { ...ep, status: prevStatus } : ep))
                                showToast("Error", err.response?.data?.error || "Failed to update status", "destructive")
                              } finally {
                                setUpdatingStatusId(null)
                              }
                            }}
                            disabled={updatingStatusId === p.id}
                            className="px-2 py-1 border rounded-md"
                          >
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditProjectModal(p)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit Project"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteProject(p.id, p.project_name)}
                              disabled={deletingProjectId === p.id}
                              className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                              title="Delete Project"
                            >
                              {deletingProjectId === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add Projects (daily entries) */}
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
                  <label className="block text-sm font-medium text-gray-700">Project *</label>
                  <select
                    value={watchedValues.projectForm?.selectedProjectId || ""}
                    onChange={(e) => setValue("projectForm.selectedProjectId", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.projectForm?.selectedProjectId ? "border-red-500" : "border-gray-300"
                    }`}
                    disabled={!watchedValues.userName || loadingProjects || employeeProjects.length === 0}
                  >
                    <option value="">{loadingProjects ? "Loading..." : "Select project"}</option>
                    {employeeProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name}
                      </option>
                    ))}
                  </select>
                  {errors.projectForm?.selectedProjectId && (
                    <p className="text-sm text-red-500">{errors.projectForm.selectedProjectId.message}</p>
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
                      !watchedValues.projectForm?.selectedProjectId ||
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
                          onClick={() => openEditModal(project)}
                          className="text-blue-600 hover:text-blue-800 p-2"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
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

      {editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeEditModal} />
          <div className="relative bg-white w-full max-w-lg mx-4 rounded-lg shadow-lg border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Edit Project</h3>
              <p className="text-sm text-gray-600 mt-1">
                {formatTime(editForm.startTime || editProject.startTime)} - {formatTime(editForm.endTime || editProject.endTime)}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Time *</label>
                  <select
                    value={editForm.startTime}
                    onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                  >
                    <option value="">Select start time</option>
                    {timeOptions.map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">End Time *</label>
                  <select
                    value={editForm.endTime}
                    onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                  >
                    <option value="">Select end time</option>
                    {timeOptions.map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Description *</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-md border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setProjectModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg mx-4 rounded-lg shadow-lg border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Add Project</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                <input
                  type="text"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                  <input
                    type="date"
                    value={newProjectForm.startDate}
                    onChange={(e) => setNewProjectForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">End Date *</label>
                  <input
                    type="date"
                    value={newProjectForm.endDate}
                    onChange={(e) => setNewProjectForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="px-4 py-2 rounded-md border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const empId = parseEmpId(watchedValues.userName)
                    const { name, startDate, endDate } = newProjectForm
                    if (!empId || !name.trim() || !startDate || !endDate) {
                      showToast("Missing fields", "Fill all project fields", "destructive")
                      return
                    }
                    try {
                      await axios.post(`${API_BASE_URL}/api/projects`, {
                        employee_id: empId,
                        project_name: name.trim(),
                        start_date: startDate,
                        end_date: endDate,
                      })
                      showToast("Added", "Project added")
                      setProjectModalOpen(false)
                      setNewProjectForm({ name: "", startDate: "", endDate: "" })
                      fetchProjectsForEmployee(empId)
                    } catch (e) {
                      showToast("Error", e.response?.data?.error || "Failed to add project", "destructive")
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeEditProjectModal} />
          <div className="relative bg-white w-full max-w-lg mx-4 rounded-lg shadow-lg border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Edit Project</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                <input
                  type="text"
                  value={editProjectForm.name}
                  onChange={(e) => setEditProjectForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                  <input
                    type="date"
                    value={editProjectForm.startDate}
                    onChange={(e) => setEditProjectForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">End Date *</label>
                  <input
                    type="date"
                    value={editProjectForm.endDate}
                    onChange={(e) => setEditProjectForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditProjectModal}
                  className="px-4 py-2 rounded-md border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveProjectEdit}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}