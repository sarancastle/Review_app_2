const prisma = require("../../prisma")
const Redis = require('ioredis')
//const client = new Redis("rediss://default:AeANAAIjcDEwYmY4YTRhZGQyMTg0YjVlOTgxYmI0MDNiMjdjNDliY3AxMA@desired-toad-57357.upstash.io:6379");





// Enable this for reverse proxy support



// const rateLimiter = (maxReq, windowInSec) => {
//     return async (req, res, next) => {
//         try {
//             const clientIp = getClientIp(req);
//             console.log("Client IP:", clientIp);

//             const key = `rate-limit:${clientIp}`;
//             const reqCount = await client.incr(key);
//             console.log(key)
//             console.log(reqCount)
//             if (reqCount === 1) {
//                 await client.expire(key, windowInSec);
//             }

//             if (reqCount > maxReq) {
//                 const timeToExp = await client.ttl(key);
//                 return res.status(429).json({
//                     status: false,
//                     message: `Rate limit exceeded. Try again in ${timeToExp} seconds.`,
//                 });
//             }
//             next();
//             console.log("Request allowed, moving to next middleware...");
//             // Ensure this is being called
//         } catch (error) {
//             console.error("Rate limiter error:", error);
//             res.status(500).json({ status: false, message: "Internal Server Error" });
//         }
//     };
// }

// get all the admin details
// const getAllAdmin = async (req, res) => {
//     try {

//         const getCatchRedise = await client.get("ADMIN")
//         if (getCatchRedise) {
//             return res.status(200).json({ success: true, data: JSON.parse(getCatchRedise) });
//         } else {
//             const allAdmins = await prisma.employees.findMany({
//                 where: {
//                     role: 'ADMIN',
//                 },
//                 select: {
//                     employee_id: true,
//                     employeeName: true,
//                     employeeEmail: true,
//                     employeePhoneNumber: true,
//                     role: true,
//                     referralCode: true,
//                     responsibleEmployeeId: true
//                 },
//             });
//             await client.set("ADMIN", JSON.stringify(allAdmins), "EX", 3600)

//             if (allAdmins.length === 0) {
//                 return res.status(404).json({ success: false, message: 'No admins found.' });
//             }

//             res.status(200).json({ success: true, data: allAdmins });
//         }
//     } catch (error) {
//         res.status(500).json({ error: "Internal server error" });
//     }
// }

const userCount = async (req, res) => {
    try {
        // Count all users
        const totalUsers = await prisma.user.count();

        // Count active users (isActive = true)
        const activeUsers = await prisma.user.count({
            where: { isActive: true },
        });
        console.log(activeUsers)
        console.log(totalUsers)
        // Respond with the counts
        res.status(200).json({
            totalUsers,
            activeUsers,
        });
    } catch (error) {
        console.error("Error fetching user counts:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const statement = async (req, res) => {
    try {
        // Get total and active users from the database
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({ where: { isActive: true } });

        

        // Base cost per user
        const baseCostPerUser = 749;

        // Expected Settlement Amount
        const expectedSettlementAmount = {
            perUser: {
                perUserRevenue: `Rs: ${540}`,
                referralBonusPerUser: `Rs: ${209}`,
                additionalChargesPerUser: `Rs: ${19}`,
            },
            revenue: {
                totalRevenue: `Rs: ${activeUsers * 540}`,
                totalReferralBonus: `Rs: ${activeUsers * 209}`,
                totalAdditionalCharges: `Rs: ${activeUsers * 19}`,
            },
        };

        // Settlement Amount (Expected)
        const actualSettlementAmount = {
            perUser: {
                perUserRevenue: `Rs: ${521}`,
                referralBonusPerUser: `Rs: ${209}`,
                additionalChargesPerUser: `Rs: ${19}`,
            },
            revenue: {
                totalRevenue: `Rs: ${activeUsers * 521}`,
                totalReferralBonus: `Rs: ${activeUsers * 209}`,
                totalAdditionalCharges: `Rs: ${activeUsers * 19}`,
            },
        };


        // Calculate values
        const totalRevenue = activeUsers * 521; // Total revenue calculation
        const appExpenditure = 6000; // Fixed app expenditure
        const totalRevenueAfterExpense = totalRevenue - appExpenditure; // Revenue after expenses
        const sharePerOwner = Math.round(totalRevenueAfterExpense / 3); // Equal share per owner (rounded)

        // Share Calculation
        const Share = {
            totalRevenue: {
                totalRevenue: `Rs: ${totalRevenue}`,
                appExpenditure: `Rs: ${appExpenditure}`,
                totalRevenueAfterExpenditure: `Rs: ${totalRevenueAfterExpense}`,
            },
            Antony:`Rs: ${sharePerOwner}`,
            Jarom: `Rs: ${sharePerOwner}`,
            Josen: `Rs: ${sharePerOwner}`
            // Displaying app expenditure separately
        };

        // Generate Summary Statement
        //   const settlementStatement = `
        // **Actual Settlement (Final Calculation)**
        // Each active user was expected to generate ₹${settlementAmount.perUser.perUserRevenue} in revenue.
        // The total expected revenue for ${activeUsers} active users was ₹${settlementAmount.revenue.totalRevenue}.
        // A referral bonus of ₹${settlementAmount.perUser.referralBonusPerUser} per user was planned, totaling ₹${settlementAmount.revenue.totalReferralBonus}.
        // Additional charges were expected at ₹${settlementAmount.perUser.additionalChargesPerUser} per user, adding up to ₹${settlementAmount.revenue.totalAdditionalCharges}.

        // **Expected Settlement (Planned)**
        // The actual per-user revenue turned out to be ₹${actualSettlement.perUser.perUserRevenue}, resulting in a total revenue of ₹${actualSettlement.revenue.totalRevenue}.
        // The final referral bonus paid was ₹${actualSettlement.perUser.referralBonusPerUser} per user, totaling ₹${actualSettlement.revenue.totalReferralBonus}.
        // Additional charges collected were ₹${actualSettlement.perUser.additionalChargesPerUser} per user, bringing in ₹${actualSettlement.revenue.totalAdditionalCharges}.
        //   `;

        // Sending the response
        res.status(200).json({
            totalUsers,
            activeUsers,
            baseCostPerUser,
            expectedSettlementAmount,
            actualSettlementAmount,
            Share

            // settlementStatement, // Added human-readable report
        });
    } catch (error) {
        console.error("Error fetching user settlement data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getAllAdmin = async (req, res) => {
    try {
        const allAdmins = await prisma.employees.findMany({
            where: {
                role: 'ADMIN',
            },
            select: {
                employee_id: true,
                employeeName: true,
                employeeEmail: true,
                employeePhoneNumber: true,
                role: true,
                referralCode: true,
                responsibleEmployeeId: true
            },
        });

        if (allAdmins.length === 0) {
            return res.status(404).json({ success: false, message: 'No admins found.' });
        }

        res.status(200).json({ success: true, data: allAdmins });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};


// get the particular admin details 
const getParticularAdminById = async (req, res) => {
    try {
        const { id } = req.params; // Get admin ID from URL parameters

        // Fetch staff added by this admin
        const adminJoinedStaff = await prisma.employees.findMany({
            where: {
                responsibleEmployeeId: id, // Fetch employees added by this admin
            },
            select: {
                employee_id: true,
                employeeName: true,
                role: true,
                employeeEmail: true,
                employeePhoneNumber: true,
                referralCode: true, // Include referral code for fetching users
            },
        });

        // Fetch the admin's referral code
        const admin = await prisma.employees.findUnique({
            where: { employee_id: id },
            select: { referralCode: true },
        });

        let users = [];
        if (admin?.referralCode) {
            // Fetch users referred by the admin
            users = await prisma.user.findMany({
                where: { referralCode: admin.referralCode },
                select: {
                    user_id: true,
                    name: true,
                    email: true,
                    phoneNumber: true,
                    businessName: true,
                    businessType: true,
                    isActive: true,
                    createdAt: true,
                },
            });
        }

        res.status(200).json({
            success: true,
            employees: adminJoinedStaff,
            users: users, // Include users referred by the admin
        });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

// get all the staff details
// const getAllStaff =  async (req, res) => {
//     try {
//         const getCatchRedise = await client.get("STAFF")
//         if (getCatchRedise) {
//             res.status(200).json({ success: true, data: JSON.parse(getCatchRedise) });
//         } else {
//             const allStaff = await prisma.employees.findMany({
//                 where: {
//                     role: 'STAFF',
//                 },
//                 select: {
//                     employee_id: true,
//                     employeeName: true,
//                     employeeEmail: true,
//                     employeePhoneNumber: true,
//                     referralCode: true,
//                     role: true,
//                 },
//             });
//             // console.log(allStaff)

//             await client.set("STAFF", JSON.stringify(allStaff), "EX", 3600)

//             if (allStaff.length === 0) {
//                 return res.status(404).json({ success: false, message: 'No staff found.' });
//             }

//             res.status(200).json({ success: true, data: allStaff });
//         }
//     } catch (error) {
//         res.status(500).json({ error: "Internal server error" });
//     }
// }
const getAllStaff = async (req, res) => {
    try {
        const allStaff = await prisma.employees.findMany({
            where: {
                role: 'STAFF',
            },
            select: {
                employee_id: true,
                employeeName: true,
                employeeEmail: true,
                employeePhoneNumber: true,
                referralCode: true,
                role: true,
            },
        });

        if (allStaff.length === 0) {
            return res.status(404).json({ success: false, message: 'No staff found.' });
        }

        res.status(200).json({ success: true, data: allStaff });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};


// this is used to get all the ticket from the users
const getAllTickets = async (req, res) => {
    try {
        const allTickets = await prisma.helpdesk.findMany();
        res.status(200).json({ allTickets });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

// this api is use to get the particular ticket details
const getParticularTickets = async (req, res) => {
    const { id } = req.params
    try {
        const particularTicket = await prisma.helpdesk.findUnique({
            where: {
                helpdesk_id: id
            }
        });
        res.status(200).json({ particularTicket });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching helpdesk requests', error: error.message });
    }
}

// this api is use to get the particular ticket details and update the status
const updateParticularTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Log incoming request data
    // console.log(`Received request to update status for helpdesk ID: ${id}`);
    // console.log(`Requested status: ${status}`);

    // Validate the status field
    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED"];
    if (!validStatuses.includes(status)) {
        console.log(`Invalid status received: ${status}. Valid statuses are: ${validStatuses.join(", ")}`);
        return res.status(400).json({ message: `Invalid status. Choose from: ${validStatuses.join(", ")}` });
    }
    // console.log(`Status is valid: ${status}`);

    try {
        // Prepare the update data
        const updateData = { status };
        // console.log(`Update data prepared: ${JSON.stringify(updateData)}`);

        // If the status is "RESOLVED", include the resolvedAt timestamp
        if (status === "RESOLVED") {
            updateData.resolvedAt = new Date(); // Set the resolution timestamp
            // console.log(`ResolvedAt timestamp set to: ${updateData.resolvedAt}`);
        }

        // Perform the update in the database
        // console.log(`Performing database update for helpdesk ID: ${id}`);
        const updatedHelpDesk = await prisma.helpdesk.update({
            where: { helpdesk_id: id },
            data: updateData, // Ensure resolvedAt is included in the data if RESOLVED
        });

        // Log the updated helpdesk object
        // console.log("Updated helpdesk ticket:", updatedHelpDesk);

        // Send email
        let mailOptions = {
            from: 'your-email@gmail.com',
            to: updatedHelpDesk.email,
            subject: `ikeyQR Helpdesk Ticket Update`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #333;">Hello ${updatedHelpDesk.name},</h2>
                    <p>We wanted to inform you that your helpdesk ticket regarding:</p>
                    <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #ccc;">
                        "${updatedHelpDesk.comment}"
                    </blockquote>
                    <p>has been updated to: <strong style="color: green;">${status}</strong>.</p>
                    <p>If you need further assistance, please feel free to reach out.</p>
                    <hr>
                    <p style="font-size: 12px; color: #777;">Best regards,<br>ikeyQR Helpdesk Support Team</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        // Return the updated helpdesk ticket
        // console.log("Sending updated helpdesk ticket in response.");
        res.status(200).json({ updatedHelpDesk });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}



module.exports = { statement, userCount, getAllAdmin, getParticularAdminById, getAllStaff, getAllTickets, getParticularTickets, updateParticularTicketStatus }