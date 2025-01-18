const express = require("express")
const app = express()
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const cors = require("cors")
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
const moment = require('moment'); // Install moment.js for date formatting
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: 'ikeyqr@gmail.com',
        pass: 'jhmszkilzaiyhmyd',
    }
});
app.use(express.json())
app.use(cors())

const productRoute = require("./protectedRoute")

app.post('/register', async (req, res) => {
    try {
        const data = req.body;
        const isExistingUser = await prisma.user.findUnique({
            where: {
                email: data.email
            }
        });

        if (isExistingUser) {
            return res.json({ message: "User Existed" });
        } else {
            const Staff = await prisma.staff.findUnique({
                where:{
                  referralCode:data.referralCode
            }})
            if(!Staff){
                res.json({
                    message:"Invaild ReferralCode"
                })
            }
            // console.log(Staff.staff_id)
            const hashedPassword = await bcrypt.hash(data.password, 10);
            const createNewUser = await prisma.user.create({
                data: {
                    name: data.fullName,
                    email: data.email,
                    phoneNumber: data.phone,
                    password: hashedPassword,
                    placeId: data.placeId,
                    businessName: data.businessName,
                    businessType: data.businessType,
                    staff_id:Staff.staff_id,
                    referralCode:data.referralCode,
                    isActive: false,
                    subscriptionStartDate: new Date(),
                }
            });
            const dashboard = await prisma.dashboard.create({
                data: { user_id: createNewUser.user_id },
            });
            res.json({
                message: `${createNewUser.name} has been Registered Successfully`,
                dashboard_url: `/dashboard/${createNewUser.user_id}`,
                reviewForm_url: `/review/${createNewUser.user_id}`,
                user_id: createNewUser.user_id
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const data = req.body;

        // Validate the required fields
        if (!data.email || !data.password) {
            return res.status(400).json({ message: "Email and Password are required" });
        }

        const isExistingUser = await prisma.user.findUnique({
            where: {
                email: data.email
            },
        });

        if (!isExistingUser) {
            return res.status(404).json({ message: "User not found, please register and try again" });
        }

        const isPasswordValid = await bcrypt.compare(data.password, isExistingUser.password);

        if (isPasswordValid) {

            var accessToken = jwt.sign({ user_id: isExistingUser.user_id }, 'ikeyqr', {
                expiresIn: "60s"
            });
            var refreshToken = jwt.sign({ user_id: isExistingUser.user_id }, 'ikeyqr', {
                expiresIn: "60s"
            });

            await prisma.token.create({
                data: {
                    refreshToken: refreshToken
                }
            })

            res.json({
                user_id: isExistingUser.user_id,
                token: {
                    accessToken,
                    refreshToken
                },
                message: "Successfully logged in",
            });
        } else {
            res.status(401).json({ message: "Invalid username or password" });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
});

app.post('/refresh', async (req, res) => {
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
                    expiresIn: "60s"
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

})

app.post('/checking', productRoute, async (req, res) => {
    console.log("Projected Started && Checking")
    res.json({
        message: "Projected Started && Checking"
    })
})

app.post('/forgot-password', async (req, res) => {
    const data = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: {
            email: data.email
        }
    });
    if (!user) return res.json({ message: "User not found" });

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
        from: "ikeyqr@gmail.com",
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
        <p>This email was sent to you by <strong>ikeyqr Team</strong>. Please do not reply directly to this email. For assistance, contact us at <a href="mailto:ikeyqr@gmail.com" style="color: #007BFF;">ikeyqr@gmail.com</a>.</p>
        <p>Visit our website at <a href="https://www.ikeyqr.com" style="color: #007BFF;">www.ikeyqr.com</a>.</p>
    </div>
</div>
`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.json({ message: "Error sending email" });
        res.json({ message: "OTP sent to your email" });
    });
})

app.post('/verify-otp', async (req, res) => {
    const data = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
        where: {
            email: data.email
        },
    });

    if (!user) return res.json({ message: "User not found" });
    // console.log("Stored OTP:", user.otp);
    // console.log("Provided OTP:", data.otp);
    // Check if OTP is valid and hasn't expired
    if (String(user.otp).trim() !== String(data.otp).trim()) {
        return res.json({ message: "Invalid OTP" });
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

    res.json({ message: "Password successfully reset" });
})

app.get("/dashboard/:id", productRoute, async (req, res) => {
    // Extracting `id` from request parameters
    const { id } = req.params;
    console.log("Received request for dashboard. User ID:", id); // Debug log

    try {
        // Fetch user details from the `dashboard` table
        const userDetails = await prisma.dashboard.findUnique({
            where: { user_id: id }, // Find by user ID
            include: {
                review: true, // Include associated reviews
                user: {
                    select: {
                        name: true,
                        businessName: true,
                        businessType: true,
                        phoneNumber: true,
                        isActive: true, // Include subscription status
                    },
                },
            },
        });

        console.log("Fetched userDetails:", userDetails); // Debug log

        // Check if the subscription is inactive
        if (userDetails && !userDetails.user.isActive) {
            console.log("User subscription is inactive. Redirecting to renew."); // Debug log
            return res.json({
                message: "Subscription inactive. Please renew.",
            });
        }

        // Check if user details exist
        if (!userDetails) {
            console.log("User not found in the database."); // Debug log
            return res.status(404).json({ error: "User not found" });
        }

        // Return user details in the response
        res.json({
            userDetails,
            reviewForm_url: `review/${userDetails.user_id}`,
        });
        console.log("Successfully returned user details."); // Debug log
    } catch (error) {
        // Log any errors encountered
        console.error("Error fetching dashboard:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
})

// app.post('/user-help/:id',async (req,res)=>{
//     const data = req.body;
//     const {id} = req.params;
//     const userHelpDesk = await prisma.helpdesk.create({
//         data:{
//             user_id:id,
//             phoneNumber:data.phoneNumber,
//             comment:data.comment
//         }
//     }) 
//     res.json({
//         userHelpDesk
//     })
// })

// model Helpdesk {
//     helpdesk_id            String @id @default(cuid())
//     phoneNumber            String
//     comment                String
//     user_id                String
//     user                   User @relation(fields:[user_id],references:[user_id])
//   }

app.post('/review/:id', async (req, res) => {
    const { rating, comment } = req.body;
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { user_id: id },
            select: { isActive: true, placeId: true },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.isActive) {
            //   return res.status(403).json({
            //     error: "Subscription inactive. Please renew to access the review form.",
            return res.json({ message: "Subscription inactive. Please renew to access the review form." })

        }

        if (rating >= 3) {
            const redirectUrl = `https://search.google.com/local/writereview?placeid=${user.placeId}`;
            return res.json({ redirectUrl });
        }

        const dashboard = await prisma.dashboard.findUnique({
            where: { user_id: id },
        });

        await prisma.review.create({
            data: {
                rating,
                comment,
                dashboard_id: dashboard.dashboard_id,
            },
        });

        res.json({ message: "Review saved successfully" });
    } catch (error) {
        console.error("Error in review endpoint:", error);
        res.status(500).json({ error: "Failed to process review" });
    }
});

app.post('/register-admin', async (req, res) => {
    const data = req.body;
    const createAdmin = await prisma.admin.create({
        data: {
            adminName: data.adminName,
            adminEmail: data.adminEmail,
            adminPhoneNumber: data.adminPhoneNumber,
            adminPassword: data.adminPassword
        }
    })
    res.json({
        message: "New Admin Created",
        data: {
            createAdmin
        }
    })
})

app.get('/register-admin',async(req,res)=>{
    const getRegisterAdmin = await prisma.admin.findMany()
    res.json({
        data:{
            getRegisterAdmin
        }
    })
})

app.get('/register-staff',async(req,res)=>{
    const getRegisterStaff = await prisma.staff.findMany()
    res.json({
        data:{
            getRegisterStaff
        }
    })
})



app.post('/register-staff', async (req, res) => {
    try {
        const data = req.body;

        // Extract the first 3 letters from the staff name
        const namePart = data.staffName.substring(0, 3).toUpperCase();

        // Get the current date in the desired format (DDMMMYY)
        const datePart = moment().format('DDMMMYY').toUpperCase();

        // Generate the referral code in the desired format
        const referralCode = `WZT-${namePart}${datePart}`;

        // Create the staff entry in the database
        const createStaff = await prisma.staff.create({
            data: {
                staffName: data.staffName,
                staffEmail: data.staffEmail,
                staffPhoneNumber: data.staffPhoneNumber,
                staffPassword: data.staffPassword,
                referralCode: referralCode, // Assign the generated referral code
                admin_id: data.admin_id
            }
        });

        res.json({
            message: "New Staff Created",
            data: {
                createStaff
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error creating staff",
            error: error.message
        });
    }
});


app.listen(9004, () => {
    console.log("Server Started 9004")
})