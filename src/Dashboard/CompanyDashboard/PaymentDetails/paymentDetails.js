// Prisma Schema

const bcrypt = require("bcryptjs");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const prisma = require('../..//prisma')
const razorpay = new Razorpay({
    key_id: "rzp_test_wCUQcBRBFudBQm",
    key_secret: "J3JKqWCm0aGWbMoktLkyUEts"
});

const getAllTransactions = async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany();

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'No transactions found' });
        }

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 🔹 Get transactions by employee ID
const getTransactionsByEmployee = async (req, res) => {
    const { employeeId } = req.params;

    try {
        const transactions = await prisma.transaction.findMany({
            where: { employee_id: employeeId }
        });

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'No transactions found for this employee' });
        }

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 🔹 Get transactions by user ID
const getTransactionsByUser = async (req, res) => {
    const data= req.params; // Extract userId from request parameters
    console.log(data)
    try {
        const transactions = await prisma.transaction.findMany({
            where: { user_id: data.userId } // Assuming the column name is user_id
        });
        console.log(transactions)

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'No transactions found for this user' });
        }

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};



// 1. Create Temporary Order
const createOrder = async (req, res) => {
    try {
        const data = req.body;
        const amount =749
      
        const order = await razorpay.orders.create({
            amount: amount *100,
            currency: "INR",
           
        });
        console.log(order)
        console.log(data)
        const temporder = await prisma.temporder.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                placeId: data.placeId,
                businessName: data.businessName,
                businessType: data.businessType,
                referralCode: data.referralCode,
                password: await bcrypt.hash(data.password, 10),
                orderId: order.id
            }
        });
        console.log(temporder)
        res.status(200).json({ success: true, order, });
    } catch (error) {
            res.status(500).json({ error: "Internal server error" });
     
    }
};

// const paymentVerify = async (req, res) => {
//     try {
//         console.log('🔹 Webhook Received!');

//         const webhookBody = req.rawBody;
//         if (!webhookBody) {
//             console.log('❌ Missing Raw Body!');
//             return res.status(400).json({ message: 'Invalid webhook request' });
//         }

//         const webhookSecret = "J3JKqWCm0aGWbMoktLkyUEts";
//         const webhookSignature = req.headers['x-razorpay-signature'];

//         console.log('🔹 Received Signature:', webhookSignature);
//         console.log('🔹 Expected Secret:', webhookSecret);

//         if (!webhookSecret || !webhookSignature) {
//             console.log('❌ Missing Secret or Signature');
//             return res.status(400).json({ message: 'Invalid webhook request' });
//         }

//         // Verify Signature
//         const expectedSignature = crypto
//             .createHmac('sha256', webhookSecret)
//             .update(webhookBody) // Ensure raw body is used
//             .digest('hex');

//         console.log('🔹 Computed Signature:', expectedSignature);

//         if (expectedSignature !== webhookSignature) {
//             console.log('❌ Invalid Signature!');
//             return res.status(400).json({ message: 'Invalid webhook signature' });
//         }

//         // Parse Webhook Event
//         const event = JSON.parse(webhookBody);

         

//         switch (event.event) {
//             case 'payment.captured': {
//                 const paymentDetails = event.payload.payment.entity;
//                 const orderId = paymentDetails.order_id;
//                 const paymentId = paymentDetails.id;
//                 const amount = paymentDetails.amount / 100;

//                 console.log('🔹 Payment ID:', paymentId);
//                 console.log('🔹 Order ID:', orderId);
//                 console.log('🔹 Amount:', amount);



//                 // Fetch Temp Order
//                 const tempOrder = await prisma.temporder.findUnique({ where: { orderId } });
//                 console.log('🔹 Fetched Temp Order:', tempOrder);

//                 // Extract Referral Code from Temp Order
//          let referralCode = tempOrder.referralCode;
//          const defaultReferralCode = "WZ25FEB27-1054";
//          const referralSources = ["Google", "Facebook", "Instagram"];
 
//          if (referralSources.includes(referralCode)) {
//              referralCode = defaultReferralCode;
//          }
 
//          console.log('🔹 Referral Code:', referralCode);
 
//          // Find Staff using Referral Code
//          const Staff = await prisma.employees.findUnique({
//              where: { referralCode },
//          });
 
//          if (!Staff) {
//              console.log('❌ Invalid Referral Code!');
//              return res.status(404).json({ message: "Invalid Referral Code" });
//          }
 
//          console.log('🔹 Found Staff:', Staff);
//          console.log("employeed_id",Staff.employee_id)

//                 if (!tempOrder) {
//                     console.log('❌ Temp Order Not Found!');
//                     return res.status(404).json({ message: 'Temporary order not found' });
//                 }

//                 // Register New User
//                 const newUser = await prisma.user.create({
//                     data: {
//                         name: tempOrder.fullName,
//                         email: tempOrder.email,
//                         phoneNumber: tempOrder.phone,
//                         password: tempOrder.password,
//                         placeId: tempOrder.placeId,
//                         businessName: tempOrder.businessName,
//                         businessType: tempOrder.businessType,
//                         referralCode: tempOrder.referralCode,
//                         employee_id: Staff.employee_id,
//                         isActive: true,
//                         subscriptionStartDate: new Date(),
//                         subscriptionEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
//                     },
//                 });

//                 console.log('✅ New User Created:', newUser);

//                 const dashboard = await prisma.dashboard.create({
//                     data: { user_id: newUser.user_id },
//                 });

//                 console.log('✅ New User Created:', dashboard);

//                 // Create Transaction Record
//                 const jarom =await prisma.transaction.create({
//                     data: {
//                         user_id: newUser.user_id,
//                         userName:newUser.name,
//                         employee_id:newUser.employee_id,
//                         orderId,
//                         paymentId,
//                         amount,
//                         status: 'paid',
//                     },
//                 });

//                 console.log('✅ Transaction-Recorded',jarom);

//                 // Delete Temp Order
//                 await prisma.temporder.delete({ where: { orderId } });

//                 console.log('✅ Temp Order Deleted');

//                 return res.status(200).json({ message: `${newUser.name} has been registered successfully` });
//             }

//             case 'payment.failed': {
//                 console.log('❌ Payment Failed:', event.payload.payment.entity);
//                 return res.status(200).json({ message: 'Payment failed event logged' });
//             }

//             default:
//                 console.log('⚠️ Unhandled Event Type:', event.event);
//                 return res.status(200).json({ message: 'Unhandled event' });
//         }
//     } catch (error) {
//         console.error('🔥 Webhook Processing Error:', error);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// };





const paymentVerify = async (req, res) => {
    try {
        console.log('🔹 Webhook Received!');

        const webhookBody = req.rawBody;
        if (!webhookBody) {
            console.log('❌ Missing Raw Body!');
            return res.status(400).json({ message: 'Invalid webhook request' });
        }

        const webhookSecret = "J3JKqWCm0aGWbMoktLkyUEts";
        const webhookSignature = req.headers['x-razorpay-signature'];

        console.log('🔹 Received Signature:', webhookSignature);
        console.log('🔹 Expected Secret:', webhookSecret);

        if (!webhookSecret || !webhookSignature) {
            console.log('❌ Missing Secret or Signature');
            return res.status(400).json({ message: 'Invalid webhook request' });
        }

        // Verify Signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(webhookBody) // Ensure raw body is used
            .digest('hex');

        console.log('🔹 Computed Signature:', expectedSignature);

        if (expectedSignature !== webhookSignature) {
            console.log('❌ Invalid Signature!');
            return res.status(400).json({ message: 'Invalid webhook signature' });
        }

        // Parse Webhook Event
        const event = JSON.parse(webhookBody);

     
        switch (event.event) {
            case "payment.captured": {
                const paymentDetails = event.payload.payment.entity;
                const orderId = paymentDetails.order_id;
                const paymentId = paymentDetails.id;
                const amount = paymentDetails.amount / 100;

                console.log("✅ Payment Captured:", { orderId, paymentId, amount });

                // Check if it's a Subscription Renewal
                const renewal = await prisma.revenue.findUnique({ where: { orderId } });

                if (renewal) {
                    const updatedUser = await prisma.user.update({
                        where: { user_id: renewal.user_id },
                        data: {
                            // subscriptionEndDate: new Date(
                            //     new Date().setMonth(new Date().getMonth() + 1)
                            // ), // Extend by 1 month
                            subscriptionEndDate: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
                        },
                    });

                    console.log("✅ Subscription Renewed:", updatedUser);

                    await prisma.$transaction([
                        prisma.transaction.create({
                            data: {
                                user_id: updatedUser.user_id,
                                userName: updatedUser.name,
                                orderId,
                                paymentId,
                                amount,
                                status: "paid",
                                type: "Subscription Repaid",
                            },
                        }),
                        prisma.revenue.update({
                            where: { orderId },
                            data: { status: "paid" },
                        }),
                    ]);

                    console.log("✅ Revenue Recorded for Renewal");
                    return res.status(200).json({ message: "Subscription renewed successfully" });
                }

                const tempOrder = await prisma.temporder.findUnique({ where: { orderId } });
                
                if (!tempOrder) {
                    console.log("❌ Temp Order Not Found!");
                    return res.status(404).json({ message: "Temporary order not found" });
                }
                
                // Extract Referral Code
                let referralCode = tempOrder.referralCode;
                const defaultReferralCode = "WZ25MAR04-8605";
                const referralSources = ["Google", "Facebook", "Instagram"];
                
                if (referralSources.includes(referralCode)) {
                    referralCode = defaultReferralCode;
                }
                
                console.log('🔹 Referral Code:', referralCode);
                
                // Find Staff using Referral Code
                const staff = await prisma.staffUsers.findUnique({ where: { referralCode } });
                console.log("emp",staff.employee_id)
                
                if (!staff) {
                    console.log('❌ Invalid Referral Code!');
                    return res.status(404).json({ message: "Invalid Referral Code" });
                }
                
                console.log('🔹 Found Staff:', staff);
                console.log("employee_id", staff.employee_id);
                
                // Hash Password (Ensure you installed bcrypt: npm install bcrypt)
                const bcrypt = require('bcrypt');
                const hashedPassword = await bcrypt.hash(tempOrder.password, 10);
                
                // Create New User
                const newUser = await prisma.user.create({
                    data: {
                        name: tempOrder.fullName,
                        email: tempOrder.email,
                        phoneNumber: tempOrder.phone,
                        password: hashedPassword,  // Secure password storage
                        placeId: tempOrder.placeId,
                        businessName: tempOrder.businessName,
                        businessType: tempOrder.businessType,
                        referralCode: tempOrder.referralCode,
                        employee_id: staff.employee_id,
                        isActive: true,
                        subscriptionStartDate: new Date(),
                        subscriptionEndDate: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
                    }
                });
                
                console.log("✅ New User Created:", newUser);
                
                // Transaction Handling
                await prisma.$transaction([
                    prisma.dashboard.create({ data: { user_id: newUser.user_id } }),
                    prisma.transaction.create({
                        data: {
                            user_id: newUser.user_id,
                            userName: newUser.name,
                            orderId,
                            paymentId,
                            amount,
                            status: "paid",
                            type: "Signup",
                        },
                    }),
                    prisma.temporder.delete({ where: { orderId } }),
                ]);
                
                console.log("✅ Transaction Recorded & Temp Order Deleted");
                return res.status(200).json({ message: `${newUser.name} has been registered successfully` });}

            case "payment.failed": {
                console.log("❌ Payment Failed:", event.payload.payment.entity);
                return res.status(200).json({ message: "Payment failed event logged" });
            }

            default:
                console.log("⚠️ Unhandled Event Type:", event.event);
                return res.status(200).json({ message: "Unhandled event" });
        }
    } catch (error) {
        console.error("🔥 Webhook Processing Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const renewSubscription = async (req, res) => {
    try {
        const { user_id } = req.body;
        const amount = 749; // Subscription renewal amount

        const user = await prisma.user.findUnique({
            where: { user_id },
            select: { name: true },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Create a new Razorpay order
        const order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: "INR",
            receipt: `sub_renew_${user_id}_${Date.now()}`,
        });

        console.log("🔹 Subscription Renewal Order Created:", order);

        // Store renewal request in `revenue` model
        await prisma.revenue.create({
            data: {
                user_id,
                userName: user.name,
                orderId: order.id,
                amount,
                status: "pending",
            },
        });

        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error("🔥 Error Renewing Subscription:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// const paymentVerify = async (req, res) => {
//     try {
//         console.log("🔹 Webhook Received!");

//         const webhookBody = req.rawBody;
//         if (!webhookBody) {
//             console.log("❌ Missing Raw Body!");
//             return res.status(400).json({ message: "Invalid webhook request" });
//         }

//         const webhookSecret = "YOUR_WEBHOOK_SECRET";
//         const webhookSignature = req.headers["x-razorpay-signature"];

//         // Verify Signature
//         const expectedSignature = crypto
//             .createHmac("sha256", webhookSecret)
//             .update(webhookBody)
//             .digest("hex");

//         if (expectedSignature !== webhookSignature) {
//             console.log("❌ Invalid Signature!");
//             return res.status(400).json({ message: "Invalid webhook signature" });
//         }

//         // Parse Webhook Event
//         const event = JSON.parse(webhookBody);

//         switch (event.event) {
//             case "payment.captured": {
//                 const paymentDetails = event.payload.payment.entity;
//                 const orderId = paymentDetails.order_id;
//                 const paymentId = paymentDetails.id;
//                 const amount = paymentDetails.amount / 100;

//                 console.log("✅ Payment Captured:", { orderId, paymentId, amount });

//                 // Check if it's a Subscription Renewal
//                 const renewal = await prisma.revenue.findUnique({ where: { orderId } });

//                 if (renewal) {
//                     // Extend Subscription
//                     const updatedUser = await prisma.user.update({
//                         where: { user_id: renewal.user_id },
//                         data: {
//                             subscriptionEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
//                         },
//                     });

//                     console.log("✅ Subscription Renewed:", updatedUser);

//                     await prisma.transaction.create({
//                         data: {
//                             user_id: updatedUser.user_id,
//                             userName: updatedUser.name,
//                             orderId,
//                             paymentId,
//                             amount,
//                             status: "paid",
//                             type: "Subscription Repaid",  // More specific type
//                         },
//                     });

//                     // Log Revenue
//                     await prisma.revenue.create({
//                         data: {
//                             user_id: updatedUser.user_id,
//                             orderId,
//                             amount,
//                             status: "paid",
//                         },
//                     });

//                     console.log("✅ Revenue Recorded for Renewal");
//                     return res.status(200).json({ message: "Subscription renewed successfully" });
//                 }

//                 // Handle New User Registration
//                 const tempOrder = await prisma.temporder.findUnique({ where: { orderId } });

//                 if (!tempOrder) {
//                     console.log("❌ Temp Order Not Found!");
//                     return res.status(404).json({ message: "Temporary order not found" });
//                 }

//                 // Register New User
//                 const newUser = await prisma.user.create({
//                     data: {
//                         name: tempOrder.fullName,
//                         email: tempOrder.email,
//                         phoneNumber: tempOrder.phone,
//                         password: tempOrder.password,
//                         placeId: tempOrder.placeId,
//                         businessName: tempOrder.businessName,
//                         businessType: tempOrder.businessType,
//                         referralCode: tempOrder.referralCode,
//                         isActive: true,
//                         subscriptionStartDate: new Date(),
//                         subscriptionEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
//                     },
//                 });

//                 console.log("✅ New User Created:", newUser);

//                 await prisma.dashboard.create({ data: { user_id: newUser.user_id } });

//                 // Create Transaction Record
//                 await prisma.transaction.create({
//                     data: {
//                         user_id: newUser.user_id,
//                         userName: newUser.name,
//                         orderId,
//                         paymentId,
//                         amount,
//                         status: "paid",
//                         type: "Signup", 
//                     },
//                 });

//                 console.log("✅ Transaction Recorded");

//                 // Delete Temp Order
//                 await prisma.temporder.delete({ where: { orderId } });

//                 return res.status(200).json({ message: `${newUser.name} has been registered successfully` });
//             }

//             case "payment.failed": {
//                 console.log("❌ Payment Failed:", event.payload.payment.entity);
//                 return res.status(200).json({ message: "Payment failed event logged" });
//             }

//             default:
//                 console.log("⚠️ Unhandled Event Type:", event.event);
//                 return res.status(200).json({ message: "Unhandled event" });
//         }
//     } catch (error) {
//         console.error("🔥 Webhook Processing Error:", error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };



// const renewSubscription = async (req, res) => {
//     try {
//         const { user_id } = req.body;
//         const amount = 749; // Subscription renewal amount

//         // Fetch user details
//         const user = await prisma.user.findUnique({
//             where: { user_id },
//             select: { name: true }, // Assuming the name field exists in the User model
//         });

//         if (!user) {
//             return res.status(404).json({ error: "User not found" });
//         }

//         // Create a new Razorpay order
//         const order = await razorpay.orders.create({
//             amount: amount * 100, // Convert to paise
//             currency: "INR",
//         });

//         console.log("🔹 Subscription Renewal Order Created:", order);

//         // Store renewal request in `revenue` model
//         await prisma.revenue.create({
//             data: {
//                 user_id,
//                 userName: user.name, // Store the user's name
//                 orderId: order.id,
//                 amount,
//                 status: "pending",
//             },
//         });

//         res.status(200).json({ success: true, order });
//     } catch (error) {
//         console.error("🔥 Error Renewing Subscription:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// };

// const renewSubscription = async (req, res) => {
//     try {
//         const { user_id } = req.body;
//         const amount = 749; // Subscription renewal amount

//         // Create a new Razorpay order
//         const order = await razorpay.orders.create({
//             amount: amount * 100,
//             currency: "INR",
//         });

//         console.log("🔹 Subscription Renewal Order Created:", order);

//         // Store renewal request
//         await prisma.renewal.create({
//             data: {
//                 userId: user_id,
//                 orderId: order.id,
//                 amount,
//                 status: "pending",
//             },
//         });

//         res.status(200).json({ success: true, order });
//     } catch (error) {
//         console.error("🔥 Error Renewing Subscription:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// };




module.exports = {getTransactionsByUser ,getAllTransactions ,getTransactionsByEmployee, createOrder, paymentVerify, renewSubscription};
