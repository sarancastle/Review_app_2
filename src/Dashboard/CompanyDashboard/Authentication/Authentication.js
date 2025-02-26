const prisma = require("../../prisma")
const nodemailer = require('nodemailer');
var jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const moment = require('moment'); // Install moment.js for date formatting
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: 'ikeyqr@gmail.com',
        pass: 'jhmszkilzaiyhmyd',
    }
});


const refresh= async (req, res) => {
        const data = req.body;
        const tokenValid = await prisma.token.findFirst({
            where: {
                refreshToken: data.refreshToken
            }
        })
        if (tokenValid) {
            jwt.verify(tokenValid.refreshToken, 'ikeyqr', function (err) {
                if (!err) {
                    var accessToken = jwt.sign({ user_id: tokenValid.user_id }, 'ikeyqr', {
                        expiresIn: "30s"
                    });
                    res.json({
                        accessToken: accessToken
                    })
                } else {
                    res.json({
                        message: "User Not Authenticated"
                    })
                }
            });
        } else {
            res.json({
                message: "No Token Found"
            })
        }
    }


// employees forgot password
const employeesForgotPassword = async (req, res) => {
    try {
        const data = req.body;

        // Check if user exists
        const employee = await prisma.employees.findUnique({
            where: {
                employeeEmail: data.email
            }
        });
        if (!employee) return res.status(404).json({ message: " User not found" });

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // OTP expiry time (e.g., 5 minutes)
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now


        // Save OTP and expiry time in the database
        await prisma.employees.update({
            where: {
                employeeEmail: data.email
            },
            data: {
                otp: otp,  // store generated OTP
                otpExpiry: otpExpiry // store OTP expiry time
            }
        });

        // Send OTP via email
        const mailOptions = {
            from: "ikeyqr@gmail.com",
            to: data.email,
            subject: "Password Reset OTP",
            html: `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; max-width: 500px; margin: 20px auto;">
    <h2 style="color:rgb(117, 105, 245); text-align: center; margin-bottom: 20px;">Password Reset OTP</h2>
    <p style="font-size: 16px; margin-bottom: 20px; text-align: center;">
        We received a request to reset your password. To proceed, please use the following One-Time Password (OTP):
    </p>
    <p style="font-size: 28px; font-weight: bold; color:rgb(117, 105, 245); text-align: center; margin: 10px 0;">
        ${otp}
    </p>
    <p style="font-size: 14px; text-align: center; color: #777; margin-top: 20px;">
        This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone, and if you didn't request this, please ignore this message.
    </p>
    <div style="margin-top: 30px; font-size: 12px; color: #555; border-top: 1px solid #ddd; padding-top: 10px; text-align: center;">
        <p>This email was sent to you by <strong>ikeyqr Team</strong>. Please do not reply directly to this email. For assistance, contact us at <a href="mailto:ikeyqr@gmail.com" style="color: #007BFF;">ikeyqr@gmail.com</a>.</p>
        <p>Visit our website at <a href="https://www.ikeyqr.com" style="color: #007BFF;">www.ikeyqr.com</a>.</p>
    </div>
</div>
`
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                return res.status(500).json({ message: "Error sending email" })
            }
            res.status(200).json({ message: `A verification code has been sent to ${data.email} Please check your inbox and spam folder.` });
        });
    } catch (error) {
        console.error("Error in forgot password function:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// checking the otp 
const employeesCheckOtp = async (req, res) => {
    try {
        const data = req.body;

        // Find user by email
        const employee = await prisma.employees.findUnique({
            where: {
                employeeEmail: data.email
            },
        });

        if (!employee) return res.status(404).json({ message: "Employee not found" });

        // Check if OTP matches
        if (String(employee.otp).trim() !== String(data.otp).trim()) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Check if OTP has expired
        if (employee.otpExpiry < Date.now()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        // OTP is valid
        res.status(200).json({ message: "OTP is valid" });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// verifying the otp
const employeesOtpVerify = async (req, res) => {
    try {
        const data = req.body;

        // Find user by email
        const employee = await prisma.employees.findUnique({
            where: {
                employeeEmail: data.email
            },
        });

        if (!employee) return res.status(404).json({ message: "Employee not found" });
        // console.log("Stored OTP:", user.otp);
        // console.log("Provided OTP:", data.otp);
        // Check if OTP is valid and hasn't expired
        if (String(employee.otp).trim() !== String(data.otp).trim()) {
            return res.status(400).json({ message: "Invalid code. Please try again." });
        }

        if (employee.otpExpiry < Date.now()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        // OTP is valid and not expired, now reset the password


        // Update the password in the database
        await prisma.employees.update({
            where: { employeeEmail: data.email },
            data: {
                employeePassword: data.newPassword,
                otp: null, // Clear OTP after use
                otpExpiry: null // Clear OTP expiry after use
            }
        });

        res.status(200).json({ message: "Password successfully reset" });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// registering the new employees ADMIN/STAFF
const employeesRegister = async (req, res) => {
    try {
        const data = req.body;

        // Check if the user already exists
        const isExistingUser = await prisma.employees.findUnique({
            where: { employeeEmail: data.employeeEmail }
        });

        if (isExistingUser) {
            return res.status(400).json({ message: "User Already Exists" });
        }

        let responsibleAdmin = null;

        // Check if referral code exists
        if (data.referralCode) {
            const responsibleEmployee = await prisma.employees.findUnique({
                where: { referralCode: data.referralCode }
            });

            if (responsibleEmployee) {
                responsibleAdmin = responsibleEmployee.employee_id;
            }
        }

        // Generate referral code if not provided
        const yearPart = moment().format('YY'); // Last two digits of the year
        const monthPart = moment().format('MMM').toUpperCase(); // Abbreviated month
        const datePart = moment().format('DD'); // Day of the month
        const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
        const referralCode = `WZ${yearPart}${monthPart}${datePart}-${randomPart}`;

        // Create the employee entry in the database
        const createEmployee = await prisma.employees.create({
            data: {
                employeeName: data.employeeName,
                employeeEmail: data.employeeEmail,
                employeePhoneNumber: data.employeePhoneNumber,
                employeePassword: data.employeePassword,
                referralCode: referralCode,
                responsibleEmployeeId: responsibleAdmin,
                role: data.role
            }


        });
        const { employeePassword, otp, otpExpiry, ...employeeDetails } = createEmployee;

        return res.status(200).json({
            message: "New Employee Created",
            data: employeeDetails
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error creating employee",
            error: error.message
        });
    }
}

// login for employees ADMIN/STAFF
const employeesLogin = async (req, res) => {
    try {
        const data= req.body;
        console.log(data)

        // Check if user exists
        const isExistingUser = await prisma.employees.findUnique({
            where: { employeeEmail:data.email }
        });

        if (!isExistingUser) {
            return res.status(404).json({ message: "User not found. Contact support for assistance." });
        }

        // Compare hashed password
        if (data.password !== isExistingUser.employeePassword) {
            return res.status(400).json({ message: "Invalid username or password" });
        }
        // Generate access and refresh tokens
        const accessToken = jwt.sign(
            { employee_id: isExistingUser.employee_id, role: isExistingUser.role },
            'ikeyqr',
            { expiresIn: "30m" } // Increased token expiry for better usability
        );

        const refreshToken = jwt.sign(
            { employee_id: isExistingUser.employee_id, role: isExistingUser.role },
            'ikeyqr',
            { expiresIn: "7d" } // Refresh token valid for 7 days
        );

        // Store refresh token in the database
        await prisma.token.create({
            data: {
                refreshToken
            }
        });

        return res.status(200).json({
            employee_id: isExistingUser.employee_id,
            role: isExistingUser.role,
            token: {
                accessToken,
                refreshToken
            },
            message: "Successfully logged in",
        });

    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// change the password in the staff/admin account setting
const changePassword = async (req, res) => {
    try {
        const { employeeEmail, oldPassword, newPassword } = req.body;

        // Find employee by email
        const employee = await prisma.employees.findUnique({
            where: { employeeEmail }
        });

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Compare old password with stored hashed password
        const isPasswordValid = await bcrypt.compare(oldPassword, employee.employeePassword);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Incorrect old password" });
        }

        // Hash the new password before updating
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password in the database
        await prisma.employees.update({
            where: { employeeEmail },
            data: { employeePassword: hashedNewPassword }
        });

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


module.exports = {refresh, employeesForgotPassword, employeesCheckOtp, employeesOtpVerify, employeesRegister, employeesLogin, changePassword }