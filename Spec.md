
# Training Management & Placement Portal
## Complete Product Specification for Google Antigravity

> Build a production-ready **MERN Stack** web application with a clean, human-designed interface. Prioritize usability, accessibility, and maintainability over flashy animations.

---

# Project Goal

Develop a Training Management & Placement Portal for colleges to manage students, training sessions, attendance, assessments, workshops, reports, and placement eligibility.

This application should replace spreadsheets and manual record keeping with a centralized system.

---

# UI / UX Vision

## Design Philosophy

The interface should **NOT** look AI-generated.

It should resemble software designed by an experienced product designer.

Design principles:

- Minimal
- Professional
- Spacious
- Clean typography
- Consistent spacing
- Large click targets
- Very easy navigation
- Few colors
- No unnecessary gradients
- No glassmorphism
- No excessive shadows
- Smooth but subtle animations

The application should be understandable even by a non-technical user within minutes.

---

# Theme

Light Theme Only

### Color Palette

Primary
- #2563EB (Professional Blue)

Secondary
- #14B8A6 (Teal)

Accent
- #F59E0B (Amber)

Background
- #F8FAFC

Cards
- #FFFFFF

Text
- #1E293B

Borders
- #E2E8F0

Success
- #22C55E

Danger
- #EF4444

Warning
- #F59E0B

---

# Typography

Font:
- Inter

Icons:
- Lucide Icons

Rounded corners:
- 10–12px

Buttons:
- Medium size
- Filled primary
- Clear hover state

---

# Navigation

Desktop:
- Left sidebar
- Top navbar

Mobile:
- Drawer navigation

Always display:
- Search
- Notifications
- User Profile

---

# Users

1. Admin (Placement Coordinator)
2. Faculty
3. Student

Role-based access is mandatory.

---

# Core Modules

- Dashboard
- Student Management
- Faculty Management
- Training Sessions
- Attendance
- Assessments
- Resume Review
- Activities & Workshops
- Student Profile
- Reports
- Placement Eligibility
- Notifications
- Calendar
- Analytics
- Settings
- Global Search

---

# Dashboard

Show KPI cards:
- Total Students
- Attendance %
- Placement Eligible
- Upcoming Sessions
- Average Scores

Charts:
- Attendance Trend
- Assessment Trend
- Category Performance

Recent Activity section.

---

# Student Module

Personal details

Academic details

Placement profiles

Excel Import

CRUD operations

Archive alumni

---

# Attendance

Faculty marks attendance.

Statuses:
- Present
- Absent
- Late
- Excused

Automatically calculate:
- Overall attendance
- Category-wise attendance
- Attendance percentage

---

# Assessments

Support:
- Aptitude
- Technical
- Coding
- Resume
- Mock Interview

Store:
- Marks
- Percentage
- Remarks

---

# Placement Eligibility

Automatic rules:
- Attendance >= 75%
- Aptitude >= 60
- Technical >= 60
- Soft Skills >= 60
- Resume uploaded
- No active backlogs

---

# Reports

Generate:
- Student-wise
- Batch-wise
- Semester-wise
- Attendance
- Assessments
- Workshops
- Placement Eligibility

Export:
- Excel
- PDF

---

# Recommended Tech Stack

## Frontend
- React 19
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Axios
- React Hook Form
- Zod
- TanStack Query
- Recharts
- Lucide React
- Framer Motion (subtle transitions only)

## Backend
- Node.js
- Express.js
- JWT Authentication
- bcrypt
- Multer
- Express Validator
- Helmet
- CORS
- Morgan

## Database
- MongoDB Atlas
- Mongoose

## Storage
- Cloudinary (resume uploads)

## Export
- ExcelJS
- PDFKit

## Email
- Nodemailer

## Development
- ESLint
- Prettier
- Husky
- dotenv

---

# Database Collections

users
students
faculties
trainingSessions
attendance
assessments
activities
notifications
resumes

---

# Folder Structure

frontend/
backend/
shared/

Keep frontend and backend completely separated.

---

# Performance Goals

- Responsive
- Fast loading
- Accessible
- Keyboard friendly
- Pagination
- Server-side filtering
- Optimized MongoDB queries

---

# What NOT to use

- Firebase
- Firestore
- MCP Server
- Heavy animations
- Dark theme
- Glassmorphism
- Auto-generated looking dashboards

---

# Final Objective

Create a polished, production-quality college management application that feels like a real SaaS product built by humans. Focus on clarity, consistency, and ease of use. Every page should be intuitive enough that a first-time user can complete common tasks without guidance.
