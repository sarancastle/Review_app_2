
const prisma = require('../../prisma')
const config = require("../../../../dbConfig")
const nodemailer = require('nodemailer');
const bcrypt = require("bcryptjs");
var jwt = require('jsonwebtoken');
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: config.EMAIL_ID,
        pass: config.EMAIL_PASSWORD,
    }
});



// checking the user before register
const userCheck =  async (req, res) => {
    const data = req.body;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            return res.json({ message: "Already a User" });
        } else {
            res.status(200).json({
                message: `You can register`,
            });
        }

    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

// new user register
//  const userRegister = async (req, res) => {
//     try {
//         const data = req.body;
//         // console.log(data)
//         const isExistingUser = await prisma.user.findUnique({
//             where: {
//                 email: data.email
//             }
//         });

//         if (isExistingUser) {
//             return res.status(404).json({ message: "User Already Existed" });
//         } else {

//             // Assign default referral code if the given referral code is "Google", "Facebook", or "Instagram"
//             const defaultReferralCode = "WZ25FEB25-3184";
//             const referralSources = ["Google", "Facebook", "Instagram"];
//             if (referralSources.includes(data.referralCode)) {
//                 data.referralCode = defaultReferralCode;
//             }

//             // console.log("Final Referral Code:", data.referralCode);

//             const Staff = await prisma.employees.findUnique({
//                 where: { referralCode: data.referralCode }
//             });

//             if (!Staff) {
//                 return res.status(404).json({ message: "Invalid Referral Code" });
//             }

//             const hashedPassword = await bcrypt.hash(data.password, 10);

//             // Set subscription expiration to 2 minutes from now
//             const subscriptionEndDate = new Date();
//             subscriptionEndDate.setMinutes(subscriptionEndDate.getMinutes() + 1440);
//             const createNewUser = await prisma.user.create({
//                 data: {
//                     name: data.fullName,
//                     email: data.email,
//                     phoneNumber: data.phone,
//                     password: hashedPassword,
//                     placeId: data.placeId,
//                     businessName: data.businessName,
//                     businessType: data.businessType,
//                     employee_id: Staff.employee_id,
//                     referralCode: data.referralCode,
//                     isActive: true,
//                     subscriptionStartDate: new Date(),
//                     subscriptionEndDate: subscriptionEndDate
//                 }
//             });
//             const dashboard = await prisma.dashboard.create({
//                 data: { user_id: createNewUser.user_id },
//             });
//             res.status(200).json({
//                 message: `${createNewUser.name} has been Registered Successfully`,
//                 dashboard_url: `/dashboard/${createNewUser.user_id}`,
//                 reviewForm_url: `/review/${createNewUser.user_id}`,
//                 user_id: createNewUser.user_id
//             });
//         }
//     } catch (error) {
//         res.status(500).json({ error: "Internal server error" });
//     }
// }

// user login
const userLogin =  async (req, res) => {
    try {
        const data = req.body;
       console.log(data)

        // Validate the required fields
        if (!data.email || !data.password) {
            return res.status(400).json({ message: "Email and Password are required" });
        }
        console.log(data.email)

        const isExistingUser = await prisma.user.findUnique({
            where: {
                email: data.email
            },
        });
        console.log(isExistingUser)

        if (!isExistingUser) {
            return res.status(404).json({ message: "User not found, please register and try again" });
        }

        const isPasswordValid = await bcrypt.compare(data.password, isExistingUser.password);
        console.log(isPasswordValid)

        if (isPasswordValid) {

            var accessToken = jwt.sign({ user_id: isExistingUser.user_id }, 'ikeyqr', {
                expiresIn: "30m"
            });
            var refreshToken = jwt.sign({ user_id: isExistingUser.user_id }, 'ikeyqr', {
                expiresIn: "7d"
            });

            await prisma.token.create({
                data: {
                    refreshToken: refreshToken
                }
            })

            res.status(200).json({
                user_id: isExistingUser.user_id,
                token: {
                    accessToken,
                    refreshToken
                },
                message: "Successfully logged in",
            });
        } else {
            res.status(400).json({ message: "Invalid username or password" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

//user forgot the password 
const userForgotPassword = async (req, res) => {
    try{
    const data = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: {
            email: data.email
        }
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expiry time (e.g., 5 minutes)
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now


    // Save OTP and expiry time in the database
    await prisma.user.update({
        where: {
            email: data.email
        },
        data: {
            otp: otp,  // store generated OTP
            otpExpiry: otpExpiry // store OTP expiry time
        }
    });

    // Send OTP via email
    const mailOptions = {
        from: config.EMAIL_ID,
        to: data.email,
        subject: "Password Reset OTP",
        html: `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; max-width: 500px; margin: 20px auto;">
    <h2 style="color: #5e9ca0; text-align: center; margin-bottom: 20px;">Password Reset OTP</h2>
    <p style="font-size: 16px; margin-bottom: 20px; text-align: center;">
        We received a request to reset your password. To proceed, please use the following One-Time Password (OTP):
    </p>
    <p style="font-size: 28px; font-weight: bold; color: #5e9ca0; text-align: center; margin: 10px 0;">
        ${otp}
    </p>
    <p style="font-size: 14px; text-align: center; color: #777; margin-top: 20px;">
        This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone, and if you didn't request this, please ignore this message.
    </p>
    <div style="margin-top: 30px; font-size: 12px; color: #555; border-top: 1px solid #ddd; padding-top: 10px; text-align: center;">
        <p>This email was sent to you by <strong>logicQr Team</strong>. Please do not reply directly to this email. For assistance, contact us at <a href="mailto:thelogicqr@gmail.com" style="color: #007BFF;">thelogicqr@gmail.com</a>.</p>
        <p>Visit our website at <a href="https://www.logicqr.com" style="color: #007BFF;">www.logicqr.com</a>.</p>
    </div>
</div>
`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.status(400).json({ message: "Error sending email" });
        res.status(200).json({ message: `A verification code has been sent to ${data.email} Please check your inbox and spam folder.` });
    });

} catch (error) {
    res.status(500).json({ error: "Internal server error" });
}
}

// user verifyOtp 
 const userOtpVerify = async (req, res) => {
    try{
     const data = req.body;
     console.log(data)
 
     // Find user by email
     const user = await prisma.user.findUnique({
         where: {
             email: data.email
         },
     });
     console.log(user)
 
     if (!user) return res.json({ message: "User not found" });
     // console.log("Stored OTP:", user.otp);
     // console.log("Provided OTP:", data.otp);
     // Check if OTP is valid and hasn't expired
     console.log(data.otp)
     console.log(user.otp)
     if (String(user.otp).trim() !== String(data.otp).trim()) {
         return res.json({ message: "Invalid code. Please try again." });
     }
 
     if (user.otpExpiry < Date.now()) {
        return res.json({ message: "OTP has expired" });
     }
 
     // OTP is valid and not expired, now reset the password
     const hashedPassword = await bcrypt.hash(data.newPassword, 10);
 
     // Update the password in the database
     await prisma.user.update({
         where: { email: data.email },
         data: {
             password: hashedPassword,
             otp: null, // Clear OTP after use
             otpExpiry: null // Clear OTP expiry after use
         }
     });
 
     res.status(200).json({ message: "Password successfully reset" });
 
} catch (error) {
    res.status(500).json({ error: "Internal server error" });
}
 }


module.exports = {userCheck,userLogin,userForgotPassword,userOtpVerify}