const express = require("express")
const router = express.Router()
const { userCheck, userLogin, userForgotPassword, userOtpVerify } = require("./UserDashboard/UserAuthentication/usersAuthentication")
const { employeesForgotPassword, employeesCheckOtp, employeesOtpVerify, employeesRegister, employeesLogin, changePassword ,refresh} = require("./CompanyDashboard/Authentication/Authentication")
const { getUserDashboardById, deleteReview, postUsersHelpCenter, subscriptionCheckById, qrReviewById, getUserHelpdeskByUserId } = require("./UserDashboard/UserDashboard/userDashboard")
const { getAllAdmin, getParticularAdminById, getAllStaff, getAllTickets, getParticularTickets, updateParticularTicketStatus, userCount, statement } = require("./CompanyDashboard/AdminDashboard/adminDashboard")
const { staffDetailsById, getParticularStaffReferrals } = require("./CompanyDashboard/StaffDashboard/staffDashboard")
const { createOrder, paymentVerify, renewSubscription, getAllTransactions, getTransactionsByEmployee, getTransactionsByUser } = require("./CompanyDashboard/PaymentDetails/paymentDetails")
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
router.post("/employees/verify-otp", employeesOtpVerify)
router.post("/employees/register", employeesRegister)
router.post("/employees/login", employeesLogin)
router.post("/change-password",protectedtRoute, changePassword)
// staff account setting
router.get("/employees/:id",protectedtRoute,staffDetailsById)

//users dashboard api
router.get("/users/:id/dashboard",protectedtRoute,getUserDashboardById )
router.delete("/review/:reviewId",protectedtRoute,deleteReview)
router.post("/users-help-center",protectedtRoute,postUsersHelpCenter)

router.get("/subscription/check/:id",subscriptionCheckById)
router.get("/users/:user_id/helpdesk",protectedtRoute,getUserHelpdeskByUserId)

//adminDashboard api
router.get("/admin",protectedtRoute,roleBasedAccess(['ADMIN']),getAllAdmin)
router.get("/admin/:id",
 protectedtRoute,roleBasedAccess(['ADMIN']),
    getParticularAdminById)
router.get("/staff",protectedtRoute,roleBasedAccess(['ADMIN']),getAllStaff)
router.get("/users-help-center",protectedtRoute,roleBasedAccess(['ADMIN']),getAllTickets)
router.get("/users-help-center/:id",protectedtRoute,roleBasedAccess(['ADMIN']),getParticularTickets)
router.put("/users-help-center/:id/status",protectedtRoute,roleBasedAccess(['ADMIN']),updateParticularTicketStatus)
router.get("/user-counts",userCount)
router.get("/user-settlement",statement)

//paymentDetails
router.post("/create-order",createOrder)
router.post("/razorpay-webhook",paymentVerify)//WEBHOOK
router.post("/renew-subscription", renewSubscription); 
router.get("/transactions",getAllTransactions)
router.get("/transactions/:employeeId",getTransactionsByEmployee)
router.get("/user-transactions/:userId",getTransactionsByUser)



//staffDashboard api
router.get("/staff/:id/referrals",protectedtRoute,getParticularStaffReferrals)

//Qr api review/:id
router.post("/review/:id",qrReviewById)


module.exports = router