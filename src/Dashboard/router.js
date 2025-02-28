const express = require("express")
const router = express.Router()
const { userCheck, userLogin, userForgotPassword, userOtpVerify } = require("./UserDashboard/UserAuthentication/usersAuthentication")
const { employeesForgotPassword, employeesCheckOtp, employeesOtpVerify, employeesRegister, employeesLogin, changePassword ,refresh} = require("./CompanyDashboard/Authentication/Authentication")
const { getUserDashboardById, deleteReview, postUsersHelpCenter, subscriptionCheckById, qrReviewById, getUserHelpdeskByUserId } = require("./UserDashboard/UserDashboard/userDashboard")
const { getAllAdmin, getParticularAdminById, getAllStaff, getAllTickets, getParticularTickets, updateParticularTicketStatus, userCount, statement } = require("./CompanyDashboard/AdminDashboard/adminDashboard")
const { staffDetailsById, getParticularStaffReferrals } = require("./CompanyDashboard/StaffDashboard/staffDashboard")
const { createOrder, paymentVerify, renewSubscription, verifyRenewalPayment, getAllTransactions, getTransactionsByEmployee, getTransactionsByUser } = require("./CompanyDashboard/PaymentDetails/paymentDetails")
const protectedtRoute = require('../../protectedRoute')
const roleBasedAccess = require("../../roleBasedAccess")

// users Authentication api
router.post("/usercheck", userCheck)
// router.post("/auth/register", userRegister)
router.post("/auth/login", userLogin)
router.post("/auth/forgot-password", userForgotPassword)
router.post("/auth/verify-otp", userOtpVerify)
router.post("/auth/refresh",refresh)

// employees Authentication api
router.post("/employees/forgot-password", employeesForgotPassword)
router.post("/employees/check-otp", employeesCheckOtp)
router.post("/employees/verify-otp",protectedtRoute, employeesOtpVerify)
router.post("/employees/register", employeesRegister)
router.post("/employees/login", employeesLogin)
router.post("/change-password",protectedtRoute, changePassword)
// staff account setting
router.get("/employees/:id",protectedtRoute,staffDetailsById)

//users dashboard api
router.get("/users/:id/dashboard",protectedtRoute,getUserDashboardById )
router.delete("/review/:reviewId",protectedtRoute,deleteReview)
router.post("/users-help-center",protectedtRoute,postUsersHelpCenter)
router.get("/users/:user_id/helpdesk",protectedtRoute,getUserDashboardById)
router.get("/subscription/check/:id",protectedtRoute,subscriptionCheckById)
router.get("/users/:user_id/helpdesk",protectedtRoute,getUserHelpdeskByUserId)

//adminDashboard api
router.get("/admin",protectedtRoute,roleBasedAccess(['ADMIN', 'STAFF']),getAllAdmin)
router.get("/admin/:id",
    // protectedtRoute,roleBasedAccess(['admin', 'staff']),
    getParticularAdminById)
router.get("/staff",protectedtRoute,roleBasedAccess(['ADMIN', 'STAFF']),getAllStaff)
router.get("/users-help-center",protectedtRoute,roleBasedAccess(['ADMIN', 'STAFF']),getAllTickets)
router.get("/users-help-center/:id",protectedtRoute,roleBasedAccess(['ADMIN', 'STAFF']),getParticularTickets)
router.put("/users-help-center/:id/status",protectedtRoute,roleBasedAccess(['ADMIN', 'STAFF']),updateParticularTicketStatus)
router.get("/user-counts",userCount)
router.get("/user-settlement",statement)

//paymentDetails
router.post("/create-order",createOrder)
router.post("/razorpay-webhook",paymentVerify)//WEBHOOK
router.post("/renew-subscription", renewSubscription); 
router.post("/verify-renewal-payment", verifyRenewalPayment)//WEBHOOK
router.get("/transactions",getAllTransactions)
router.get("/transactions/:employeeId",getTransactionsByEmployee)
router.get("/user-transactions/:userId",getTransactionsByUser)



//staffDashboard api
router.get("/staff/:id/referrals",protectedtRoute,getParticularStaffReferrals)

//Qr api review/:id
router.post("/review/:id",qrReviewById)


module.exports = router