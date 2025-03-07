const prisma = require("../../prisma")

// const client = require("../../../../redis")

// staff account setting
const staffDetailsById = async (req, res) => {
    try {
        const { id } = req.params;

        // const cacheKey = `staff:${id}`;

        // // Check if data exists in Redis
        // const cachedData = await client.get(cacheKey);
        // if (cachedData) {
        //     return res.status(200).json({ data: JSON.parse(cachedData) });
        // }
        const staffDetails = await prisma.employees.findUnique({
            where: { employee_id: id }
        });
        // console.log(staffDetails)

        if (!staffDetails) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Destructure and exclude the password
        const { employeePassword, ...rest } = staffDetails;
        // await client.set(cacheKey, JSON.stringify(rest), "EX", 86400);

        res.status(200).json({ data: rest });
    } catch (error) {
        console.error("Error fetching employee:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// it will get the user referred by the staff
const getParticularStaffReferrals = async (req, res) => {
    try {
        const data = req.params;
        // console.log(data)
        // console.log(data)
        // Find the staff by their admin_id
        const staff = await prisma.employees.findUnique({
            where: { employee_id: data.id },
            select: { referralCode: true },
        });
        // console.log(staff)
        // If no staff found
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff not found.' });
        }

        // Fetch all users associated with the staff's referralCode
        const users = await prisma.user.findMany({
            where: { referralCode: staff.referralCode },
            select: {
                user_id: true,
                name: true,
                email: true,
                phoneNumber: true,
                businessName: true,
                businessType: true,
                isActive: true,
                createdAt: true, // Optional: Include timestamp
                subscriptionEndDate: true
            },
        });

        // If no users found for the referralCode
        if (users.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: 'No users found for this referral code.' });
        }
        // console.log(users)
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error("Error fetching referrals:", error);
        res.status(500).json({ success: false, message: "An error occurred while fetching referrals." });
    }
}

module.exports = { staffDetailsById, getParticularStaffReferrals }
