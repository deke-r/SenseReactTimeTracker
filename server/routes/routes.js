const express = require("express");
const router = express.Router();
const con = require("../db/config"); 
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const HR_EMAIL = process.env.HR_EMAIL || "hr@company.com";

router.get("/", (req, res) => {
    res.json({ message: "Server is running!" })
  })

router.post("/api/generate-report", (req, res) => {
  try {
    const { userName, date, projects, stats, additionalEmail } = req.body;

    const empName = userName.split("-")[1].trim();
    const empId = userName.split("-")[0].trim();

    const mysqlDate = new Date(date).toLocaleDateString("en-CA"); // yyyy-mm-dd (local time)
 

    // 1️⃣ Insert into daily_reports
    const reportQuery = `INSERT INTO daily_reports (employee_id, employee_name, report_date) VALUES (?, ?, ?)`;

    con.query(reportQuery, [empId, empName, mysqlDate], (err, reportResult) => {
      if (err) {
        console.error("Error inserting into daily_reports:", err);
        return res.status(500).json({ error: "Failed to insert daily report" });
      }

      const reportId = reportResult.insertId;

      // 2️⃣ Insert into daily_report_projects
      if (projects && projects.length > 0) {
        const projectValues = projects.map((p) => [
          reportId,
          p.name,
          p.startTime,
          p.endTime,
          p.description || "",
        ]);

        const projectQuery = `INSERT INTO daily_report_projects (report_id, project_name, start_time, end_time, task_description) VALUES ?`;

        con.query(projectQuery, [projectValues], async (err2) => {
          if (err2) {
            console.error("Error inserting into daily_report_projects:", err2);
            return res
              .status(500)
              .json({ error: "Failed to insert project details" });
          }

          console.log(`✅ Report inserted with ID ${reportId}`);

          // ✅ Build email
          const emailSubject = `Daily Time Report - ${empName} (${date})`;
          const emailText = `
Dear HR Manager,

Please find below the daily time report for ${empName} dated ${date}.

Summary:
- Total Tasks: ${stats.totalProjects}
- Total Time Worked: ${stats.totalTime}
- Average Time per Task: ${stats.averageTime}

Tasks completed:
${projects
  .map((project, index) => {
    const startTime = new Date(`2000-01-01T${project.startTime}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endTime = new Date(`2000-01-01T${project.endTime}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const duration = `${Math.floor(project.duration / 60)}h ${project.duration % 60}m`;

    return `${index + 1}. ${project.name} (${startTime} - ${endTime}, Duration: ${duration})`;
  })
  .join("\n")}

Best regards,
${userName}

---
This report was generated automatically by the Sense Time Tracker system.
          `;

          // Recipients
          const recipients = ["bhavishya.sense@gmail.com"];
          if (additionalEmail && additionalEmail.trim()) {
            recipients.push(additionalEmail.trim());
          }

          // Mail options
          const mailOptions = {
            from: `"Sense Time Tracker" <${process.env.MAIL_USER}>`,
            to: recipients.join(", "),
            subject: emailSubject,
            text: emailText,
            html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Daily Time Report</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #2c3e50;
                        background-color: #f8f9fa;
                    }
                    
                    .email-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                        border-radius: 12px;
                        overflow: hidden;
                    }
                    
                    .header {
                        background-color: #ffffff;
                        border-bottom: 1px solid #e9ecef;
                        padding: 30px;
                        text-align: center;
                    }
                    
                    .header h1 {
                        font-size: 24px;
                        font-weight: 600;
                        color: #2c3e50;
                        margin-bottom: 8px;
                    }
                    
                    .header .subtitle {
                        font-size: 14px;
                        color: #6c757d;
                        margin-bottom: 15px;
                    }
                    
                    .header .date {
                        background: #f8f9fa;
                        color: #495057;
                        padding: 8px 16px;
                        border-radius: 20px;
                        display: inline-block;
                        font-size: 13px;
                        border: 1px solid #dee2e6;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    }
                    
                    .content {
                        padding: 30px;
                    }
                    
                    .employee-info {
                        background: #f8f9fa;
                        border: 1px solid #e9ecef;
                        padding: 20px;
                        margin-bottom: 25px;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                    }
                    
                    .employee-info h3 {
                        color: #495057;
                        margin-bottom: 12px;
                        font-size: 16px;
                        font-weight: 600;
                    }
                    
                    .employee-info p {
                        margin-bottom: 5px;
                        font-size: 14px;
                    }
                    
                    .stats-grid {
                        display: flex;
                        justify-content: space-between;
                        gap: 15px;
                        margin-bottom: 30px;
                    }
                    
                    .stat-card {
                        background: #ffffff;
                        border: 1px solid #e9ecef;
                        padding: 20px 12px;
                        border-radius: 12px;
                        text-align: center;
                        flex: 1;
                        min-width: 0;
                        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06);
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                    }
                    
                    .stat-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                    }
                    
                    .stat-number {
                        font-size: 20px;
                        font-weight: 700;
                        color: #2c3e50;
                        margin-bottom: 6px;
                        display: block;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    
                    .stat-label {
                        font-size: 11px;
                        color: #6c757d;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    
                    .section-title {
                        font-size: 18px;
                        color: #2c3e50;
                        margin-bottom: 20px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid #e9ecef;
                        font-weight: 600;
                    }
                    
                    .project-list {
                        margin-bottom: 25px;
                    }
                    
                    .project-item {
                        background: #ffffff;
                        border: 1px solid #e9ecef;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 15px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                    }
                    
                    .project-item:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                    }
                    
                    .project-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                        flex-wrap: wrap;
                        gap: 10px;
                    }
                    
                    .project-name {
                        font-size: 16px;
                        font-weight: 600;
                        color: #2c3e50;
                        flex: 1;
                    }
                    
                    .project-meta {
                        display: flex;
                        gap: 8px;
                        flex-wrap: wrap;
                    }
                    
                    .time-badge {
                        background: #f8f9fa;
                        color: #495057;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 11px;
                        font-weight: 500;
                        border: 1px solid #dee2e6;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    }
                    
                    .duration-badge {
                        background: #e9ecef;
                        color: #495057;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 11px;
                        font-weight: 500;
                        border: 1px solid #dee2e6;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    }
                    
                    .project-description {
                        color: #6c757d;
                        font-size: 13px;
                        margin-top: 8px;
                        padding-left: 12px;
                        border-left: 2px solid #e9ecef;
                    }
                    
                    .footer {
                        background: #f8f9fa;
                        padding: 25px;
                        text-align: center;
                        border-top: 1px solid #e9ecef;
                    }
                    
                    .footer p {
                        color: #6c757d;
                        font-size: 13px;
                        margin-bottom: 4px;
                    }
                    
                    .company-logo {
                        margin-bottom: 12px;
                    }
                    
                    .company-logo div {
                        font-size: 18px;
                        color: #495057;
                        font-weight: 600;
                    }
                    
                    @media (max-width: 600px) {
                        .header {
                            padding: 25px 20px;
                        }
                        
                        .content {
                            padding: 25px 20px;
                        }
                        
                        .stats-grid {
                            flex-direction: column;
                            gap: 10px;
                        }
                        
                        .stat-card {
                            padding: 20px 15px;
                        }
                        
                        .stat-number {
                            font-size: 24px;
                        }
                        
                        .stat-label {
                            font-size: 12px;
                        }
                        
                        .project-header {
                            flex-direction: column;
                            align-items: flex-start;
                        }
                        
                        .project-meta {
                            width: 100%;
                            justify-content: flex-start;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1>Daily Time Report</h1>
                        <div class="subtitle">Time Tracking Summary</div>
                        <div class="date">${date}</div>
                    </div>
                    
                    <div class="content">
                        <div class="employee-info">
                            <h3>Employee Information</h3>
                            <p><strong>Name:</strong> ${empName}</p>
                            <p><strong>Report Date:</strong> ${date}</p>
                        </div>
                        
                        <div class="stats-grid">
                            <div class="stat-card">
                                <span class="stat-number">${stats.totalProjects}</span>
                                <div class="stat-label">Total Tasks</div>
                            </div>
                            <div class="stat-card">
                                <span class="stat-number">${stats.totalTime}</span>
                                <div class="stat-label">Total Hours</div>
                            </div>
                            <div class="stat-card">
                                <span class="stat-number">${stats.averageTime}</span>
                                <div class="stat-label">Avg. Time</div>
                            </div>
                        </div>
                        
                        <h2 class="section-title">Tasks Completed</h2>
                        <h2 class="section-title">Projects Completed</h2>
                        <div class="project-list">
                            ${projects
                        .map((project, index) => {
                            const startTime = new Date(`2000-01-01T${project.startTime}`).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                            })
                            const endTime = new Date(`2000-01-01T${project.endTime}`).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                            })
                            const duration = `${Math.floor(project.duration / 60)}h ${project.duration % 60}m`
    
                            return `
                                <div class="project-item">
                                    <div class="project-header">
                                        <div class="project-name">${index + 1}. ${project.name}</div>
                                        <div class="project-meta">
                                            <span class="time-badge">${startTime} - ${endTime}</span>
                                            <span class="duration-badge">${duration}</span>
                                        </div>
                                    </div>
                                    ${project.description ? `<div class="project-description">${project.description}</div>` : ""}
                                </div>
                                `
                        })
                        .join("")}
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div class="company-logo">
                            <div>Sense Projects Pvt Ltd</div>
                        </div>
                        <p><strong>Generated by:</strong> Sense Time Tracker System</p>
                        <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
                        <p style="margin-top: 12px; font-size: 11px; color: #adb5bd;">
                            This is an automated report. Please contact the system administrator for any questions.
                        </p>
                    </div>
                </div>
            </body>
            </html>`
                    }

          // Send email
          transporter.sendMail(mailOptions, (mailErr) => {
            if (mailErr) {
              console.error("❌ Email send error:", mailErr);
              return res.status(500).json({ error: "Failed to send report email" });
            }

            // ✅ Response
            let successMessage = "Daily report sent successfully to HR manager";
            if (additionalEmail && additionalEmail.trim()) {
              successMessage = `Daily report sent successfully to HR manager and ${additionalEmail.trim()}`;
            }

            return res.json({
              success: true,
              message: successMessage,
              reportId,
            });
          });
        });
      } else {
        res.json({
          success: true,
          message: "Report saved (no projects provided)",
          reportId,
        });
      }
    });
  } catch (error) {
    console.error("Error in generate-report route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/monthly-report", (req, res) => {
  try {
    const { employeeId, fromDate, toDate } = req.query;

    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const empName = employeeId.split("-")[1]?.trim();
    const empId = employeeId.split("-")[0]?.trim();

    let query = `
      SELECT 
        dr.id,
        dr.employee_id,
        dr.employee_name,
        dr.report_date
      FROM daily_reports dr
      WHERE dr.employee_id = ?
    `;

    let params = [empId];

    // Add date filters if provided
    if (fromDate && toDate) {
      query += " AND dr.report_date BETWEEN ? AND ?";
      params.push(fromDate, toDate);
    } else if (fromDate) {
      query += " AND dr.report_date >= ?";
      params.push(fromDate);
    } else if (toDate) {
      query += " AND dr.report_date <= ?";
      params.push(toDate);
    }

    query += " ORDER BY dr.report_date DESC";

    con.query(query, params, (err, reports) => {
      if (err) {
        console.error("Error fetching monthly reports:", err);
        return res.status(500).json({ error: "Failed to fetch reports" });
      }

      if (reports.length === 0) {
        return res.json({
          success: true,
          reports: [],
          message: "No reports found for the selected criteria"
        });
      }

      // Fetch projects for each report
      const reportIds = reports.map(r => r.id);
      const projectQuery = `
        SELECT 
          drp.id,
          drp.report_id,
          drp.project_name,
          drp.start_time,
          drp.end_time,
          drp.task_description
        FROM daily_report_projects drp
        WHERE drp.report_id IN (${reportIds.map(() => '?').join(',')})
        ORDER BY drp.start_time ASC
      `;

      con.query(projectQuery, reportIds, (projectErr, projects) => {
        if (projectErr) {
          console.error("Error fetching projects:", projectErr);
          return res.status(500).json({ error: "Failed to fetch project details" });
        }

        // Group projects by report_id
        const projectsByReport = projects.reduce((acc, project) => {
          if (!acc[project.report_id]) {
            acc[project.report_id] = [];
          }
          acc[project.report_id].push(project);
          return acc;
        }, {});

        // Attach projects to reports
        const reportsWithProjects = reports.map(report => ({
          ...report,
          projects: projectsByReport[report.id] || []
        }));

        res.json({
          success: true,
          reports: reportsWithProjects,
          totalReports: reportsWithProjects.length,
          totalProjects: projects.length
        });
      });
    });

  } catch (error) {
    console.error("Error in monthly-report route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all employees
router.get("/api/employees", (req, res) => {
  try {
    const query = "SELECT * FROM employees ORDER BY employee_name ASC";
    
    con.query(query, (err, employees) => {
      if (err) {
        console.error("Error fetching employees:", err);
        return res.status(500).json({ error: "Failed to fetch employees" });
      }

      res.json({
        success: true,
        employees: employees
      });
    });
  } catch (error) {
    console.error("Error in employees route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add new employee
router.post("/api/employees", (req, res) => {
  try {
    const { employeeId, employeeName } = req.body;

    if (!employeeId || !employeeName) {
      return res.status(400).json({ error: "Employee ID and name are required" });
    }

    const query = "INSERT INTO employees (employee_id, employee_name) VALUES (?, ?)";
    
    con.query(query, [employeeId, employeeName], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: "Employee ID already exists" });
        }
        console.error("Error adding employee:", err);
        return res.status(500).json({ error: "Failed to add employee" });
      }

      res.json({
        success: true,
        message: "Employee added successfully",
        employeeId: result.insertId
      });
    });
  } catch (error) {
    console.error("Error in add employee route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete employee
router.delete("/api/employees/:employeeId", (req, res) => {
  try {
    const { employeeId } = req.params;

    const query = "DELETE FROM employees WHERE employee_id = ?";
    
    con.query(query, [employeeId], (err, result) => {
      if (err) {
        console.error("Error deleting employee:", err);
        return res.status(500).json({ error: "Failed to delete employee" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      res.json({
        success: true,
        message: "Employee deleted successfully"
      });
    });
  } catch (error) {
    console.error("Error in delete employee route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
