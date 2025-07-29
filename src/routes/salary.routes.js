import { Router } from "express";
import {
  createSalaryRecord,
  updateSalaryRecord,
  getSalaryRecordById,
  listSalaryRecords,
  markSalaryAsPaid,
  deleteSalaryRecord,
  generatePayslipUrl,
  salarySummaryByLabourer,
  salarySummaryByPeriod,
  generateSalaryForPeriod,
  viewSalaryPayslipDetailsForLabourer,
  downloadPayslip,
} from "../controllers/salary.controller.js";

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js"; // Adjust path as needed

const router = Router();

// Create a new salary record
router.post("/", isAuthenticated, isAuthorized("admin", "manager"), createSalaryRecord);

// Update existing salary record by ID (full/partial update)
router.put("/:id", isAuthenticated, isAuthorized("admin", "manager"), updateSalaryRecord);


// Get salary record by ID
router.get("/:id", isAuthenticated, getSalaryRecordById);

// List salary records with filters and pagination
router.get("/", isAuthenticated, listSalaryRecords);

// Mark salary as paid by ID (with optional paymentDate)
router.patch("/:id/mark-paid", isAuthenticated, isAuthorized("admin", "manager"), markSalaryAsPaid);

// Delete salary record by ID
router.delete("/:id", isAuthenticated, isAuthorized("admin"), deleteSalaryRecord);

// Generate or update payslip URL for salary record
router.put("/:id/payslip-url", isAuthenticated, isAuthorized("admin", "manager"), generatePayslipUrl);

// Salary summary for a specific labourer (with optional period filter)
router.get("/summary/labourer/:labourerId", isAuthenticated, salarySummaryByLabourer);

// Aggregate salary summary for a period (admin view)
router.get("/summary/period", isAuthenticated, isAuthorized("admin", "manager"), salarySummaryByPeriod);

// Generate salary records for a period (auto or manual)
router.post("/generate", isAuthenticated, isAuthorized("admin", "manager"), generateSalaryForPeriod);

// View salary and payslip details for a labourer with pagination & filters
router.get("/labourer/:labourerId/payslips", isAuthenticated, viewSalaryPayslipDetailsForLabourer);

// Download payslip PDF/file using salary record ID
router.get("/:id/download-payslip", isAuthenticated, downloadPayslip);

export default router;
