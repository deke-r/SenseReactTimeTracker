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
  TrendingUp,
  Download
} from "lucide-react"
import styles from "./pdf.module.css"


const API_BASE_URL = process.env.REACT_APP_API_BASE_URL


export default function MonthlyReport() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)  // Add this line
  const [expandedProjects, setExpandedProjects] = useState({})
  const [toast, setToast] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  // New state for projects metadata and aggregates
  const [projectsMeta, setProjectsMeta] = useState([])
  const [projectAggregates, setProjectAggregates] = useState([])

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
        // fetch projects meta using numeric id part
        const empIdOnly = watchedValues.employeeId.split('-')[0]
        fetchProjectsMeta(empIdOnly)
        showToast("Success", `Found ${response.data.reports.length} reports`)
      } else {
        setReports([])
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

  // Fetch projects meta (start_date, end_date, status) by employee
  const fetchProjectsMeta = async (empIdOnly) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/projects`, {
        params: { employeeId: empIdOnly }
      })
      if (res.data?.success) {
        setProjectsMeta(res.data.projects || [])
      } else {
        setProjectsMeta([])
      }
    } catch (e) {
      setProjectsMeta([])
      console.error("Error fetching projects meta:", e)
    }
  }

  // Recompute per-project totals for selected time window
  const recomputeAggregates = () => {
    if (!reports || reports.length === 0) {
      setProjectAggregates([])
      return
    }

    const map = new Map()
    reports.forEach((r) => {
      const reportDate = r.report_date
      ;(r.projects || []).forEach((p) => {
        const key = p.project_name || "Unnamed"
        const start = new Date(`2000-01-01T${p.start_time}`)
        const end = new Date(`2000-01-01T${p.end_time}`)
        const minutes = (end.getTime() - start.getTime()) / (1000 * 60)

        if (!map.has(key)) {
          map.set(key, {
            project_name: key,
            totalMinutes: 0,
            firstWorkedDate: reportDate,
            lastWorkedDate: reportDate
          })
        }
        const entry = map.get(key)
        entry.totalMinutes += minutes
        if (new Date(reportDate) < new Date(entry.firstWorkedDate)) {
          entry.firstWorkedDate = reportDate
        }
        if (new Date(reportDate) > new Date(entry.lastWorkedDate)) {
          entry.lastWorkedDate = reportDate
        }
      })
    })

    const joined = Array.from(map.values()).map((agg) => {
      const meta = projectsMeta.find(m => (m.project_name || "").trim() === agg.project_name.trim())
      return {
        project_name: agg.project_name,
        totalMinutes: Math.round(agg.totalMinutes),
        totalHoursText: formatDuration(Math.round(agg.totalMinutes)),
        start_date: meta?.start_date || agg.firstWorkedDate || "",
        end_date: meta?.end_date || agg.lastWorkedDate || "",
        status: meta?.status || "active"
      }
    })

    setProjectAggregates(joined.sort((a, b) => b.totalMinutes - a.totalMinutes))
  }

  // Recompute aggregates whenever reports or meta change
  useEffect(() => {
    recomputeAggregates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, projectsMeta])

  // Preload meta when employee changes
  useEffect(() => {
    if (watchedValues.employeeId) {
      const empIdOnly = watchedValues.employeeId.split('-')[0]
      fetchProjectsMeta(empIdOnly)
    } else {
      setProjectsMeta([])
      setProjectAggregates([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues.employeeId])

  // Simple inline SVG Pie Chart
  const PieChart = ({ data, size = 220, strokeWidth = 32 }) => {
    const total = data.reduce((s, d) => s + d.value, 0)
    if (total <= 0) return <div className="text-sm text-gray-500">No data</div>

    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius

    let cumulative = 0
    const segments = data.map((d, idx) => {
      const fraction = d.value / total
      const dash = fraction * circumference
      const gap = circumference - dash
      const offset = (circumference * 0.25) - cumulative
      cumulative += dash
      return (
        <circle
          key={idx}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          stroke={d.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={offset}
        />
      )
    })

    return (
      <div className="flex items-center gap-6">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments}
        </svg>
        <div className="space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
              <span className="font-medium">{d.label}</span>
              <span className="text-gray-500">— {formatDuration(Math.round(d.value))}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Build pie data/colors from aggregates
  const pieData = projectAggregates.slice(0, 12).map((p, i) => {
    const colors = [
      "#6366F1","#22C55E","#F59E0B","#EF4444","#06B6D4","#A855F7",
      "#84CC16","#E879F9","#14B8A6","#F97316","#3B82F6","#10B981"
    ]
    return {
      label: p.project_name,
      value: p.totalMinutes,
      color: colors[i % colors.length]
    }
  })

  const projectsTotalMinutes = projectAggregates.reduce((s, p) => s + p.totalMinutes, 0)
  const projectsCountWithTime = projectAggregates.length
  const avgPerProjectMinutes = projectsCountWithTime > 0 ? Math.round(projectsTotalMinutes / projectsCountWithTime) : 0

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

  // Add PDF generation function
   // Add PDF generation function
   const generatePDF = () => {
    if (reports.length === 0) {
      showToast("No Data", "Please generate a report first before creating PDF", "destructive")
      return
    }

    // Create PDF content
    const pdfContent = document.createElement('div')
    pdfContent.className = styles['pdf-content']
    
    // Get employee details
    const employeeId = watchedValues.employeeId.split('-')[0]
    const employeeName = watchedValues.employeeId.split('-')[1]
    
    // Format report period
    let reportPeriod = "All Time"
    if (watchedValues.fromDate && watchedValues.toDate) {
      reportPeriod = `${new Date(watchedValues.fromDate).toLocaleDateString()} to ${new Date(watchedValues.toDate).toLocaleDateString()}`
    } else if (watchedValues.fromDate) {
      reportPeriod = `${new Date(watchedValues.fromDate).toLocaleDateString()} to Today`
    } else if (watchedValues.toDate) {
      reportPeriod = `From Beginning to ${new Date(watchedValues.toDate).toLocaleDateString()}`
    }

    // Build pie chart SVG from aggregates (same math as PieChart component)
    const buildPieChartSvg = () => {
      if (!projectAggregates || projectAggregates.length === 0) return ""
      const data = pieData
      const size = 220
      const strokeWidth = 32
      const total = data.reduce((s, d) => s + d.value, 0)
      if (total <= 0) return ""
      const radius = (size - strokeWidth) / 2
      const circumference = 2 * Math.PI * radius
      let cumulative = 0
      const segments = data.map((d) => {
        const fraction = d.value / total
        const dash = fraction * circumference
        const gap = circumference - dash
        const offset = (circumference * 0.25) - cumulative
        cumulative += dash
        return `<circle r="${radius}" cx="${size/2}" cy="${size/2}" fill="transparent" stroke="${d.color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${offset}" />`
      }).join('')

      const legend = data.map((d) => `
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${d.color};"></span>
          <span style="font-weight:600;">${d.label}</span>
          <span style="color:#555;">— ${formatDuration(Math.round(d.value))}</span>
        </div>
      `).join('')

      return `
        <div class="${styles['pdf-no-break']}" style="display:flex;gap:16px;align-items:center;margin:10px 0 0;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${segments}</svg>
          <div style="display:flex;flex-direction:column;gap:6px;">${legend}</div>
        </div>
      `
    }

    // Build monthly per-project summary table
    const buildProjectsTable = () => {
      if (!projectAggregates || projectAggregates.length === 0) return ""
      const header = `
        <tr>
          <th>Project</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Status</th>
          <th>Total Time</th>
        </tr>
      `
      const rows = projectAggregates.map((p) => `
        <tr class="${styles['pdf-no-break']}">
          <td>${p.project_name}</td>
          <td>${p.start_date ? new Date(p.start_date).toLocaleDateString() : "-"}</td>
          <td>${p.end_date ? new Date(p.end_date).toLocaleDateString() : "-"}</td>
          <td>${p.status}</td>
          <td>${p.totalHoursText}</td>
        </tr>
      `).join('')

      const quickStats = `
        <div style="font-size:11px;color:#444;margin:6px 0 12px;">
          <span style="margin-right:16px;"><span style="font-weight:600;">Total Projects:</span> ${projectAggregates.length}</span>
          <span style="margin-right:16px;"><span style="font-weight:600;">Total Hours:</span> ${formatDuration(projectsTotalMinutes)}</span>
          <span style="margin-right:16px;"><span style="font-weight:600;">Avg per Project:</span> ${formatDuration(avgPerProjectMinutes)}</span>
        </div>
      `

      return `
        <tr>
          <td colspan="4" style="padding:0;border:none;">
            <div class="${styles['pdf-no-break']}" style="margin-top:16px;">
              <div style="font-size:16px;font-weight:700;margin:4px 0 6px;">Projects (Selected Period)</div>
              ${quickStats}
              <table class="${styles['pdf-table']}" style="margin-top:6px;">
                ${header}
                ${rows}
              </table>
            </div>
          </td>
        </tr>
      `
    }
    
    // Create PDF HTML structure
    pdfContent.innerHTML = `
      <table class="${styles['pdf-table']}">
        <tr>
          <td colspan="4" class="${styles['pdf-header']}">
            <div class="${styles['pdf-title']}">Sense Tracker</div>
          </td>
        </tr>
        <tr>
          <td colspan="4" class="${styles['pdf-employee-info']}">
            <div class="${styles['pdf-employee-row']}">
              <span class="${styles['pdf-employee-label']}">Employee ID:</span>
              <span class="${styles['pdf-employee-value']}">${employeeId}</span>
            </div>
            <div class="${styles['pdf-employee-row']}">
              <span class="${styles['pdf-employee-label']}">Employee Name:</span>
              <span class="${styles['pdf-employee-value']}">${employeeName}</span>
            </div>
            <div class="${styles['pdf-employee-row']}">
              <span class="${styles['pdf-employee-label']}">Report Period:</span>
              <span class="${styles['pdf-employee-value']}">${reportPeriod}</span>
            </div>
            <div class="${styles['pdf-employee-row']}">
              <span class="${styles['pdf-employee-label']}">Generated On:</span>
              <span class="${styles['pdf-employee-value']}">${new Date().toLocaleDateString()}</span>
            </div>
          </td>
        </tr>

        <tr class="${styles['pdf-date-header']}">
          <th>Date</th>
          <th>Day</th>
          <th>Projects</th>
          <th>Total Time</th>
        </tr>
        ${reports.map(report => {
          const reportProjects = report.projects || []
          const reportTotalTime = reportProjects.reduce((sum, project) => {
            return sum + calculateDuration(project.start_time, project.end_time)
          }, 0)
          const reportDate = new Date(report.report_date)
          const dayName = reportDate.toLocaleDateString('en-US', { weekday: 'long' })
          
          return `
            <tr class="${styles['pdf-no-break']}">
              <td class="${styles['pdf-time-cell']}">${reportDate.toLocaleDateString()}</td>
              <td class="${styles['pdf-time-cell']}">${dayName}</td>
              <td>
                ${reportProjects.length > 0 ? reportProjects.map(project => {
                  const duration = calculateDuration(project.start_time, project.end_time)
                  return `
                    <div class="${styles['pdf-project-row']}">
                      <div class="${styles['pdf-project-name']}">${project.project_name}</div>
                      <div class="${styles['pdf-time-cell']}">
                        ${formatTime(project.start_time)} - ${formatTime(project.end_time)}
                        <span class="${styles['pdf-duration-cell']}"> (${formatDuration(duration)})</span>
                      </div>
                      ${project.task_description ? `<div class="${styles['pdf-task-description']}">${project.task_description}</div>` : ''}
                    </div>
                  `
                }).join('') : '<div class="pdf-task-description">No projects</div>'}
              </td>
              <td class="${styles['pdf-time-cell']}">${formatDuration(reportTotalTime)}</td>
            </tr>
          `
        }).join('')}

        <tr class="${styles['pdf-summary']}">
          <td colspan="4">
            <div class="${styles['pdf-summary-row']}">
              <span class="${styles['pdf-summary-label']}">Total Reports:</span>
              <span class="${styles['pdf-summary-value']}">${totalReports}</span>
            </div>
            <div class="${styles['pdf-summary-row']}">
              <span class="${styles['pdf-summary-label']}">Total Projects:</span>
              <span class="${styles['pdf-summary-value']}">${projectAggregates.length}</span>
            </div>
            <div class="${styles['pdf-summary-row']}">
              <span class="${styles['pdf-summary-label']}">Total Time:</span>
              <span class="${styles['pdf-summary-value']}">${formatDuration(totalTimeMinutes)}</span>
            </div>
            <div class="${styles['pdf-summary-row']}">
              <span class="${styles['pdf-summary-label']}">Average Time/Project:</span>
              <span class="${styles['pdf-summary-value']}">
              ${formatDuration(avgPerProjectMinutes)}
              </span>
            </div>

            <div class="${styles['pdf-no-break']}" style="margin-top:12px;">
              <div style="font-size:16px;font-weight:700;margin-bottom:6px;">Project Hours Distribution</div>
              ${buildPieChartSvg()}
            </div>
          </td>
        </tr>

        ${buildProjectsTable()}
      </table>
    `
    
    // Append PDF content to body temporarily
    document.body.appendChild(pdfContent)
    
    // Print the PDF
    window.print()
    
    // Remove PDF content after printing
    setTimeout(() => {
      document.body.removeChild(pdfContent)
    }, 1000)
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
                <>
                  <button
                    onClick={generatePDF}
                    className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 flex items-center justify-center gap-2"
                    title="Generate PDF"
                  >
                    <Download className="h-4 w-4" />
                    Generate PDF
                  </button>
                  
                  <button
                    onClick={sendMonthlyReportEmail}
                    disabled={sendingEmail || !watchedValues.employeeId}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    title="Send Report"
                  >
                    {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {sendingEmail ? "Sending..." : "Send Report"}
                  </button>
                </>
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
              <div className="text-2xl font-bold">{projectAggregates.length}</div>
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
              {formatDuration(avgPerProjectMinutes)}
              </div>
            </div>
          </div>
        )}

        {/* Pie Chart + Projects Summary */}
        {reports.length > 0 && projectAggregates.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Project Hours Distribution</h3>
              </div>
              <PieChart data={pieData} />
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Projects (Selected Period)</h3>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                <span className="mr-4"><span className="font-medium">Total Projects:</span> {projectAggregates.length}</span>
                <span className="mr-4"><span className="font-medium">Total Hours:</span> {formatDuration(projectsTotalMinutes)}</span>
                <span className="mr-4"><span className="font-medium">Avg per Project:</span> {formatDuration(avgPerProjectMinutes)}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projectAggregates.map((p) => (
                      <tr key={p.project_name} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{p.project_name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {p.start_date ? new Date(p.start_date).toLocaleDateString() : "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {p.end_date ? new Date(p.end_date).toLocaleDateString() : "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                            ${p.status === "completed" ? "bg-green-50 text-green-700 border-green-200" : 
                               p.status === "paused" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                               "bg-blue-50 text-blue-700 border-blue-200"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{p.totalHoursText}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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