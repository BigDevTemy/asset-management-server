var express = require("express");
var router = express.Router();

// Import route modules
const authRoutes = require("./auth");
const usersRoutes = require("./users");
const departmentsRoutes = require("./departments");
const assetCategoriesRoutes = require("./assetCategories");
const assetsRoutes = require("./assets");
const assetTransactionsRoutes = require("./assetTransactions");
const organizationSettingsRoutes = require("./organizationSettings");
const uploadsRoutes = require("./uploads");
const permissionsRoutes = require("./permissions");
const dashboardRoutes = require("./dashboard");
const maintenanceRoutes = require("./maintenance");
const documentsRoutes = require("./documents");
const notificationsRoutes = require("./notifications");
const formBuilderRoutes = require("./formBuilder");
const { apiLimiter } = require("../middleware/securityMiddleware");

// Mount route modules
router.use("/api/auth", authRoutes);
router.use("/api/users", apiLimiter, usersRoutes);
router.use("/api/departments", apiLimiter, departmentsRoutes);
router.use("/api/asset-categories", apiLimiter, assetCategoriesRoutes);
router.use("/api/assets", apiLimiter, assetsRoutes);
router.use("/api/asset-transactions", apiLimiter, assetTransactionsRoutes);
router.use(
  "/api/organization-settings",
  apiLimiter,
  organizationSettingsRoutes
);
router.use("/api/uploads", apiLimiter, uploadsRoutes);
router.use("/api/permissions", apiLimiter, permissionsRoutes);
router.use("/api/dashboard", apiLimiter, dashboardRoutes);
router.use("/api/maintenance", apiLimiter, maintenanceRoutes);
router.use("/api/documents", apiLimiter, documentsRoutes);
router.use("/api/notifications", apiLimiter, notificationsRoutes);
router.use("/api/forms", apiLimiter, formBuilderRoutes);

module.exports = router;
