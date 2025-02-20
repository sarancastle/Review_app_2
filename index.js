const express = require("express")
const Razorpay = require("razorpay")
const app = express()
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const cors = require("cors")
const bcrypt = require("bcryptjs");
const Redis = require('ioredis')
var jwt = require('jsonwebtoken');
const moment = require('moment'); // Install moment.js for date formatting
const nodemailer = require('nodemailer');
var razorpay = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: 'ikeyqr@gmail.com',
        pass: 'jhmszkilzaiyhmyd',
    }
});
app.use(express.json())
app.use(cors())


// const client = new Redis("rediss://default:AeANAAIjcDEwYmY4YTRhZGQyMTg0YjVlOTgxYmI0MDNiMjdjNDliY3AxMA@desired-toad-57357.upstash.io:6379");

const client = new Redis("rediss://default:AeANAAIjcDEwYmY4YTRhZGQyMTg0YjVlOTgxYmI0MDNiMjdjNDliY3AxMA@desired-toad-57357.upstash.io:6379", {

    // connectTimeout: 10000, // 10 seconds timeout
    // keepAlive: 30000, // Send keep-alive packets every 30 seconds
    retryStrategy(times) {
        // Exponential backoff for reconnecting
        const delay = Math.min(times * 50, 2000);
        console.log(`Reconnecting to Redis in ${delay}ms...`);
        return delay;
    },
    reconnectOnError(err) {
        console.error('Redis error:', err);
        return err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT');
    }
});

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('reconnecting', () => {
    console.log('Reconnecting to Redis...');
});
const productRoute = require("./protectedRoute")
const roleBasedAccess = require("./roleBasedAccess")



app.set('trust proxy', true); // Enable this for reverse proxy support

const getClientIp = (req) => {
    let ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    return ip === '::1' ? '127.0.0.1' : ip; // Convert IPv6 loopback to IPv4
};

const rateLimiter = (maxReq, windowInSec) => {
    return async (req, res, next) => {
        try {
            const clientIp = getClientIp(req);
            console.log("Client IP:", clientIp);

            const key = `rate-limit:${clientIp}`;
            const reqCount = await client.incr(key);
            console.log(key)
            console.log(reqCount)
            if (reqCount === 1) {
                await client.expire(key, windowInSec);
            }

            if (reqCount > maxReq) {
                const timeToExp = await client.ttl(key);
                return res.status(429).json({
                    status: false,
                    message: `Rate limit exceeded. Try again in ${timeToExp} seconds.`,
                });
            }
            next();
            console.log("Request allowed, moving to next middleware...");
            // Ensure this is being called
        } catch (error) {
            console.error("Rate limiter error:", error);
            res.status(500).json({ status: false, message: "Internal Server Error" });
        }
    };
};

// Use middleware (example: allow 5 requests per 10 seconds)
// app.use(rateLimiter(1, 10));


app.post('/order', async (req, res) => {
    const data = req.body;
    const amount = 199
    const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",

    })
})


app.post('/usercheck', async (req, res) => {
    const data = req.body;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            return res.json({ message: "Already a User" });
        } else {
            res.json({
                message: `You can register`,
            });
        }


    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
})


app.post('/auth/register', async (req, res) => {
    try {
        const data = req.body;
        console.log(data)
        const isExistingUser = await prisma.user.findUnique({
            where: {
                email: data.email
            }
        });

        if (isExistingUser) {
            return res.json({ message: "User Already Existed" });
        } else {

            // Assign default referral code if the given referral code is "Google", "Facebook", or "Instagram"
            const defaultReferralCode = "WZ25FEB17-5531";
            const referralSources = ["Google", "Facebook", "Instagram"];
            if (referralSources.includes(data.referralCode)) {
                data.referralCode = defaultReferralCode;
            }

            console.log("Final Referral Code:", data.referralCode);

            const Staff = await prisma.employees.findUnique({
                where: { referralCode: data.referralCode }
            });

            if (!Staff) {
                return res.json({ message: "Invalid Referral Code" });
            }

            const hashedPassword = await bcrypt.hash(data.password, 10);

            // Set subscription expiration to 2 minutes from now
            const subscriptionEndDate = new Date();
            subscriptionEndDate.setMinutes(subscriptionEndDate.getMinutes() + 1440);
            const createNewUser = await prisma.user.create({
                data: {
                    name: data.fullName,
                    email: data.email,
                    phoneNumber: data.phone,
                    password: hashedPassword,
                    placeId: data.placeId,
                    businessName: data.businessName,
                    businessType: data.businessType,
                    employee_id: Staff.employee_id,
                    referralCode: data.referralCode,
                    isActive: true,
                    subscriptionStartDate: new Date(),
                    subscriptionEndDate: subscriptionEndDate
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

app.post('/auth/login', async (req, res) => {
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

app.post('/auth/refresh', async (req, res) => {
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
app.post('/employees/refresh', async (req, res) => {
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

app.get('/checking', rateLimiter(1, 10), async (req, res) => {
    console.log("Projected Started && Checking")
    res.json({
        message: "Projected Started && Checking"
    })
})

app.post('/auth/forgot-password', async (req, res) => {
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
        res.json({ message: `A verification code has been sent to ${data.email} Please check your inbox and spam folder.` });
    });
})

app.post('/auth/verify-otp', async (req, res) => {
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

    res.json({ message: "Password successfully reset" });
})

app.post('/employees/forgot-password', async (req, res) => {
    const data = req.body;

    // Check if user exists
    const employee = await prisma.employees.findUnique({
        where: {
            employeeEmail: data.email
        }
    });
    if (!employee) return res.json({ message: " User not found" });

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
        if (err) return res.json({ message: "Error sending email" });
        res.json({ message: `A verification code has been sent to ${data.email} Please check your inbox and spam folder.` });
    });
})

app.post('/employees/check-otp', async (req, res) => {
    const data = req.body;

    // Find user by email
    const employee = await prisma.employees.findUnique({
        where: {
            employeeEmail: data.email
        },
    });

    if (!employee) return res.json({ message: "Employee not found" });

    // Check if OTP matches
    if (String(employee.otp).trim() !== String(data.otp).trim()) {
        return res.json({ message: "Invalid OTP" });
    }

    // Check if OTP has expired
    if (employee.otpExpiry < Date.now()) {
        return res.json({ message: "OTP has expired" });
    }

    // OTP is valid
    res.json({ message: "OTP is valid" });
});


app.post('/employees/verify-otp', async (req, res) => {
    const data = req.body;

    // Find user by email
    const employee = await prisma.employees.findUnique({
        where: {
            employeeEmail: data.email
        },
    });

    if (!employee) return res.json({ message: "Employee not found" });
    // console.log("Stored OTP:", user.otp);
    // console.log("Provided OTP:", data.otp);
    // Check if OTP is valid and hasn't expired
    if (String(employee.otp).trim() !== String(data.otp).trim()) {
        return res.json({ message: "Invalid code. Please try again." });
    }

    if (employee.otpExpiry < Date.now()) {
        return res.json({ message: "OTP has expired" });
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

    res.json({ message: "Password successfully reset" });
})

app.get("/users/:id/dashboard", async (req, res) => {
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
                        email: true,
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
                userName: userDetails.user.name,
                businessName: userDetails.user.businessName
            });
        }

        // Check if user details exist
        if (!userDetails) {
            console.log("User not found in the database."); // Debug log
            return res.json({ error: "User not found" });
        }


        // Calculate average negative review percentage
        const negativeReviews = userDetails.review.filter((review) => review.rating <= 3);
        console.log(negativeReviews)
        let negativePercentage = 0;

        if (negativeReviews.length > 0) {
            // Calculate average rating for negative reviews
            const avgNegativeRating = negativeReviews.reduce((acc, review) => acc + review.rating, 0) / negativeReviews.length;
            negativePercentage = (avgNegativeRating / 5); // Convert to percentage
        }
        console.log(negativePercentage)
        const positivePercentage = 5 - negativePercentage;


        res.json({
            userDetails,
            positiveReviewPercentage: positivePercentage.toFixed(2),
            reviewForm_url: `review/${userDetails.user_id}`,
            negativePercentage: negativePercentage


        });

    } catch (error) {
        // Log any errors encountered
        console.error("Error fetching dashboard:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
})

app.post('/users-help-center', async (req, res) => {
    const { phoneNumber, name, email, comment, user_id, status = 'OPEN' } = req.body;

    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const userExists = await prisma.user.findUnique({ where: { user_id } });
        if (!userExists) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userHelpDesk = await prisma.helpdesk.create({
            data: {
                phoneNumber,
                name,
                email,
                comment,
                status,
                user_id
            }
        });

        res.status(200).json({ userHelpDesk });
    } catch (error) {
        res.status(500).json({ message: 'Error creating helpdesk ticket', error: error.message });
    }
});

app.get('/users-help-center',productRoute, async (req, res) => {
    try {
        const allTickets = await prisma.helpdesk.findMany();
        res.json({ allTickets });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching helpdesk requests', error: error.message });
    }
});
app.get('/users-help-center/:id',productRoute, async (req, res) => {
    const { id } = req.params
    try {
        const particularTicket = await prisma.helpdesk.findUnique({
            where: {
                helpdesk_id: id
            }
        });
        res.json({ particularTicket });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching helpdesk requests', error: error.message });
    }
});

// app.get('/users/:user_id/helpdesk/all', async (req, res) => {
//     const { user_id } = req.params;

//     try {
//         const userTickets = await prisma.helpdesk.findMany({
//             where: { user_id }
//         });

//         res.json({ userTickets });
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching tickets', error: error.message });
//     }
// });

app.get('/users/:user_id/helpdesk', async (req, res) => {
    const { user_id } = req.params;
    const { status } = req.query;

    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED"];

    try {
        const tickets = await prisma.helpdesk.findMany({
            where: {
                user_id,
                ...(status && status !== "all" ? { status } : {}) // If status is provided & not "all", filter by status
            }
        });

        res.json({ tickets });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tickets', error: error.message });
    }
});


app.put('/users-help-center/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Log incoming request data
    console.log(`Received request to update status for helpdesk ID: ${id}`);
    console.log(`Requested status: ${status}`);

    // Validate the status field
    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED"];
    if (!validStatuses.includes(status)) {
        console.log(`Invalid status received: ${status}. Valid statuses are: ${validStatuses.join(", ")}`);
        return res.status(400).json({ message: `Invalid status. Choose from: ${validStatuses.join(", ")}` });
    }
    console.log(`Status is valid: ${status}`);

    try {
        // Prepare the update data
        const updateData = { status };
        console.log(`Update data prepared: ${JSON.stringify(updateData)}`);

        // If the status is "RESOLVED", include the resolvedAt timestamp
        if (status === "RESOLVED") {
            updateData.resolvedAt = new Date(); // Set the resolution timestamp
            console.log(`ResolvedAt timestamp set to: ${updateData.resolvedAt}`);
        }

        // Perform the update in the database
        console.log(`Performing database update for helpdesk ID: ${id}`);
        const updatedHelpDesk = await prisma.helpdesk.update({
            where: { helpdesk_id: id },
            data: updateData, // Ensure resolvedAt is included in the data if RESOLVED
        });

        // Log the updated helpdesk object
        console.log("Updated helpdesk ticket:", updatedHelpDesk);

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
        console.log("Sending updated helpdesk ticket in response.");
        res.json({ updatedHelpDesk });
    } catch (error) {
        console.error("Error updating ticket status:", error);
        res.status(500).json({ message: 'Error updating ticket status', error: error.message });
    }
});


// app.get('/users-help-center', async (req, res) => {
//     const userHelpDesk = await prisma.helpdesk.findMany()
//     res.json({ userHelpDesk })
// })


app.post('/review/:id', async (req, res) => {
    const { name, rating, comment } = req.body;
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { user_id: id },
            select: { isActive: true, placeId: true, name: true },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        console.log(user)
        if (!user.isActive) {
            //   return res.status(403).json({
            //     error: "Subscription inactive. Please renew to access the review form.",
            return res.json({ message: "Subscription inactive. Please renew to access the review form.", userName: user.name })

        }

        if (rating >= 4) {
            const redirectUrl = `https://search.google.com/local/writereview?placeid=${user.placeId}`;
            return res.json({ redirectUrl });
        }

        const dashboard = await prisma.dashboard.findUnique({
            where: { user_id: id },
        });

        await prisma.review.create({
            data: {
                name,
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
app.get('/subscription/check/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch user by ID
        const user = await prisma.user.findUnique({
            where: { user_id: id },
            select: { isActive: true, name: true },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return user status
        return res.json({ 
            isActive: user.isActive, 
            message: user.isActive ? "User is active" : "Subscription inactive. Please renew to access services.",
            userName: user.name
        });

    } catch (error) {
        console.error("Error checking user status:", error);
        res.status(500).json({ error: "Failed to check user status" });
    }
});



app.get('/admin',productRoute, async (req, res) => {
    try {

        const getCatchRedise = await client.get("ADMIN")
        if (getCatchRedise) {
            return res.status(200).json({ success: true, data: JSON.parse(getCatchRedise) });
        } else {
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
            await client.set("ADMIN", JSON.stringify(allAdmins), "EX", 3600)

            if (allAdmins.length === 0) {
                return res.status(404).json({ success: false, message: 'No admins found.' });
            }

            res.status(200).json({ success: true, data: allAdmins });
        }
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ success: false, message: 'An error occurred while fetching admins.' });
    }
});



// app.get('/staff/123', async (req, res) => {
//     try {
//         const { search } = req.query;

//         // Build the search filter dynamically
//         const searchFilter = search
//             ? {
//                   OR: [
//                       { adminName: { contains: search, mode: 'insensitive' } },
//                       { adminEmail: { contains: search, mode: 'insensitive' } },
//                       { adminPhoneNumber: { contains: search, mode: 'insensitive' } },
//                   ],
//               }
//             : {};

//         // Fetch staff based on the search filter
//         const allStaff = await prisma.admin.findMany({
//             where: {
//                 role: 'STAFF',
//                 ...searchFilter,
//             },
//             select: {
//                 admin_id: true,
//                 adminName: true,
//                 adminEmail: true,
//                 adminPhoneNumber: true,
//                 role: true,
//             },
//         });

//         if (allStaff.length === 0) {
//             return res.status(404).json({ success: false, message: 'No staff found.' });
//         }

//         res.status(200).json({ success: true, data: allStaff });
//     } catch (error) {
//         console.error('Error fetching staff:', error);
//         res.status(500).json({ success: false, message: 'An error occurred while fetching staff.' });
//     }
// });


// Route 3: Get a specific admin by ID


// app.get('/admin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;

//         const admin = await prisma.admin.findUnique({
//             where: {
//                 admin_id: id,
//             },
//         });

//         if (!admin || admin.role !== 'ADMIN') {
//             return res.status(404).json({ success: false, message: 'Admin not found.' });
//         }

//         res.status(200).json({ success: true, data: admin });
//     } catch (error) {
//         console.error('Error fetching admin:', error);
//         res.status(500).json({ success: false, message: 'An error occurred while fetching the admin.' });
//     }
// });



app.delete('/review/:reviewId', async (req, res) => {
    const { reviewId } = req.params;

    try {
        // Check if review exists
        const existingReview = await prisma.review.findUnique({
            where: { review_id: reviewId },
        });

        if (!existingReview) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        // Delete the review
        await prisma.review.delete({
            where: { review_id: reviewId },
        });

        res.status(200).json({ success: true, message: 'Review deleted successfully.' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the review.' });
    }
});


app.get("/admin/:id",productRoute, async (req, res) => {
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

        res.json({
            success: true,
            employees: adminJoinedStaff,
            users: users, // Include users referred by the admin
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
});

// Route 4: Get a specific staff by ID

app.post('/employees/register',productRoute, async (req, res) => {
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
        console.error(error);
        return res.status(500).json({
            message: "Error creating employee",
            error: error.message
        });
    }
});


app.post('/change-password', async (req, res) => {
    const { employeeEmail, oldPassword, newPassword } = req.body;

    try {
        // Find employee by email
        const employee = await prisma.employees.findUnique({
            where: { employeeEmail }
        });
        console.log(employee)
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Compare old password with stored password (plain text comparison)
        if (employee.employeePassword !== oldPassword) {
            return res.status(400).json({ message: "Incorrect old password" });
        }

        // Update password in the database
        await prisma.employees.update({
            where: { employeeEmail },
            data: { employeePassword: newPassword }
        });

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// Route 2: Get all staff
app.get('/staff',productRoute, async (req, res) => {
    try {
        const getCatchRedise = await client.get("STAFF")
        if (getCatchRedise) {
            res.status(200).json({ success: true, data: JSON.parse(getCatchRedise) });
        } else {
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
            console.log(allStaff)

            await client.set("STAFF", JSON.stringify(allStaff), "EX", 3600)

            if (allStaff.length === 0) {
                return res.status(404).json({ success: false, message: 'No staff found.' });
            }

            res.status(200).json({ success: true, data: allStaff });
        }
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ success: false, message: 'An error occurred while fetching staff.' });
    }
});

app.get('/employees/:id',productRoute, async (req, res) => {
    const { id } = req.params;

    try {
        const staffDetails = await prisma.employees.findUnique({
            where: { employee_id: id }
        });
        console.log(staffDetails)

        if (!staffDetails) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Destructure and exclude the password
        const { employeePassword, ...rest } = staffDetails;

        res.json({ data: rest });
    } catch (error) {
        console.error("Error fetching employee:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.post('/employees/login', async (req, res) => {
    const data = req.body;
    console.log(data)
    const isExistingUser = await prisma.employees.findUnique({
        where: {
            employeeEmail: data.email
        }
    })
    console.log(isExistingUser)
    if (!isExistingUser) {

        return res.status(400).json({ message: "User not found. Contact support for assistance." });

    } else {
        //         console.log(data)
        // console.log(isExistingUser)
        if (data.password === isExistingUser.employeePassword) {

            var accessToken = jwt.sign({ employee_id: isExistingUser.employee_id, role: isExistingUser.role }, 'ikeyqr', {
                expiresIn: "60s"
            });
            var refreshToken = jwt.sign({ employee_id: isExistingUser.employee_id, role: isExistingUser.role }, 'ikeyqr', {
                expiresIn: "60s"
            });

            await prisma.token.create({
                data: {
                    refreshToken: refreshToken
                }
            })

            res.json({
                employee_id: isExistingUser.employee_id,
                role: isExistingUser.role,
                token: {
                    accessToken,
                    refreshToken
                },
                message: "Successfully logged in",
            });
        } else {
            return res.status(400).json({ message: "Invalid username or password" });
        }

    }
})

app.get('/staff/:id/referrals', async (req, res) => {
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
            },
        });

        // If no users found for the referralCode
        if (users.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: 'No users found for this referral code.' });
        }
        console.log(users)
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching referrals:', error);
        res.status(500).json({ success: false, message: 'An error occurred while fetching referrals.' });
    }
});


// Staff dashboard routes



const checkSubscription = async () => {
    console.log("Checking expired subscriptions...");

    try {
        const result = await prisma.user.updateMany({
            where: {
                subscriptionEndDate: { lte: new Date() }, // Expired users
                isActive: true, // Only update active users
            },
            data: { isActive: false }, // Set them to inactive
        });
        console.log(result)

        if (result.count > 0) {
            console.log(`Updated ${result.count} users to inactive.`);
        } else {
            console.log("No users with expired subscriptions.");
        }

    } catch (error) {
        console.error("Error updating subscriptions:", error);
    }
};

app.get('/user-counts',productRoute, async (req, res) => {
    try {
        // Count all users
        const totalUsers = await prisma.user.count();

        // Count active users (isActive = true)
        const activeUsers = await prisma.user.count({
            where: { isActive: true },
        });
        //   console.log(activeUsers)
        //   console.log(totalUsers)
        // Respond with the counts
        res.status(200).json({
            totalUsers,
            activeUsers,
        });
    } catch (error) {
        console.error("Error fetching user counts:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const deleteExpiredTickets = async () => {
    console.log("Checking expired RESOLVED tickets...");

    try {
        // Calculate the date 30 days ago from now
        // const thirtyDaysAgo = new Date();
        // thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // 30 days ago

        const twoMinutesAgo = new Date();
        twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

        // Delete RESOLVED tickets older than 30 days
        const result = await prisma.helpdesk.deleteMany({
            where: {
                status: "RESOLVED", // Only RESOLVED tickets
                resolvedAt: { lte: twoMinutesAgo }, // Older than 30 days
            },
        });

        // Log the result
        console.log(result);

        if (result.count > 0) {
            console.log(`Deleted ${result.count} expired RESOLVED tickets.`);
        } else {
            console.log("No expired RESOLVED tickets found.");
        }

    } catch (error) {
        console.error("Error deleting expired tickets:", error);
    }
};

// Run this function daily at 12 AM
// setInterval(checkSubscription, 24 * 60 * 60 * 1000); // Runs every 24 hours

// For testing, uncomment to run every minute
setInterval(checkSubscription, 60 * 1000);

// Call the function periodically (every 24 hours)
setInterval(deleteExpiredTickets, 60000)
//86400000); // 86400000ms = 24 hours


app.listen(9004, () => {
    console.log("Server Started 9004")
})