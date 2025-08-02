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

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";
const router = Router();

router.post(
  "/",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  createSalaryRecord
);

router.put(
  "/:id",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  updateSalaryRecord
);

router.get("/:id", isAuthenticated, getSalaryRecordById);

router.get("/", isAuthenticated, listSalaryRecords);

router.patch(
  "/:id/mark-paid",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  markSalaryAsPaid
);

router.delete(
  "/:id",
  isAuthenticated,
  isAuthorized("admin"),
  deleteSalaryRecord
);

// Under Development
router.put(
  "/:id/payslip-url",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  generatePayslipUrl
);

router.get(
  "/summary/labourer/:labourerId",
  isAuthenticated,
  salarySummaryByLabourer
);

router.get(
  "/summary/period",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  salarySummaryByPeriod
);

router.post(
  "/generate",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  generateSalaryForPeriod
);

// Under Development
router.get(
  "/labourer/:labourerId/payslips",
  isAuthenticated,
  viewSalaryPayslipDetailsForLabourer
);
router.get("/:id/download-payslip", isAuthenticated, downloadPayslip);

export default router;
