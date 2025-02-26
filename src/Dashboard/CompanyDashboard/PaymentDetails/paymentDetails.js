// Prisma Schema

const bcrypt = require("bcryptjs");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const prisma = require('../..//prisma')
const razorpay = new Razorpay({
    key_id: "rzp_test_wCUQcBRBFudBQm",
    key_secret: "J3JKqWCm0aGWbMoktLkyUEts"
});

// 1. Create Temporary Order
const createOrder = async (req, res) => {
    try {
        const data = req.body;
        const amount = 19
      
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

// 2. Razorpay Webhook for Payment Confirmation
// const paymentVerify = async (req, res) => {
//     try {
        
        
//         const webhookBody = req.body;
//         const webhookSignature = req.headers["x-razorpay-signature"];
//         const webhookSecret = "J3JKqWCm0aGWbMoktLkyUEts";

//         console.log(webhookBody)
//         console.log(webhookSignature)
//         console.log(webhookSecret)

//         if (!webhookBody || !webhookSignature || !webhookSecret) {
//             return res.status(400).json({ message: "Invalid webhook request" });
//         }

//         // Verify webhook signature
//         const expectedSignature = crypto
//             .createHmac("sha256", webhookSecret)
//             .update(webhookBody)
//             .digest("hex");
//              console.log(expectedSignature)
//         if (expectedSignature !== webhookSignature) {
//             return res.status(400).json({ message: "Invalid webhook signature" });
//         }

//         const event = JSON.parse(webhookBody);
//         console.log("Received Webhook Event:", event);

//         if (event.event === "payment.captured") {
//             console.log(paymentDetails)
//             console.log(paymentId)
//             console.log(orderId)
//             const paymentDetails = event.payload.payment.entity;
//             const orderId = paymentDetails.order_id;
//             const paymentId = paymentDetails.id;
//             const amount = paymentDetails.amount / 100; // Convert paise to INR

//             // Find temporary order by orderId
//             const tempOrder = await prisma.temporder.findUnique({ where: { orderId } });

//             if (!tempOrder) {
//                 return res.status(404).json({ message: "Temporary order not found" });
//             }

//             let referralCode = tempOrder.referralCode || "WZ25FEB17-5531"; // Default referral

//             // Create new user from Temporder details
//             const newUser = await prisma.user.create({
//                 data: {
//                     name: tempOrder.fullName,
//                     email: tempOrder.email,
//                     phoneNumber: tempOrder.phone,
//                     password: tempOrder.password,
//                     placeId: tempOrder.placeId,
//                     businessName: tempOrder.businessName,
//                     businessType: tempOrder.businessType,
//                     referralCode,
//                     isActive: true,
//                     subscriptionStartDate: new Date(),
//                     subscriptionEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiry
//                 },
//             });

//             // Create transaction entry
//             await prisma.transaction.create({
//                 data: {
//                     user_id: newUser.user_id,
//                     orderId,
//                     paymentId,
//                     amount,
//                     status: "paid",
//                 },
//             });

//             // Delete temporary order
//             await prisma.temporder.delete({ where: { orderId } });

//             return res.status(200).json({ message: `${newUser.name} has been registered successfully` });
//         }

//         if (event.event === "payment.failed") {
//             console.log("Payment failed:", event.payload.payment.entity);
//             return res.status(200).json({ message: "Payment failed event logged" });
//         }

//         console.log("Unhandled event:", event.event);
//         return res.status(200).json({ message: "Unhandled event" });

//     } catch (error) {
//         console.error("Webhook processing error:", error);
//         return res.status(500).json({ message: "Internal server error" });
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
            case 'payment.captured': {
                const paymentDetails = event.payload.payment.entity;
                const orderId = paymentDetails.order_id;
                const paymentId = paymentDetails.id;
                const amount = paymentDetails.amount / 100;

                console.log('🔹 Payment ID:', paymentId);
                console.log('🔹 Order ID:', orderId);
                console.log('🔹 Amount:', amount);



                // Fetch Temp Order
                const tempOrder = await prisma.temporder.findUnique({ where: { orderId } });
                console.log('🔹 Fetched Temp Order:', tempOrder);

                // Extract Referral Code from Temp Order
         let referralCode = tempOrder.referralCode;
         const defaultReferralCode = "WZ25FEB25-3184";
         const referralSources = ["Google", "Facebook", "Instagram"];
 
         if (referralSources.includes(referralCode)) {
             referralCode = defaultReferralCode;
         }
 
         console.log('🔹 Referral Code:', referralCode);
 
         // Find Staff using Referral Code
         const Staff = await prisma.employees.findUnique({
             where: { referralCode },
         });
 
         if (!Staff) {
             console.log('❌ Invalid Referral Code!');
             return res.status(404).json({ message: "Invalid Referral Code" });
         }
 
         console.log('🔹 Found Staff:', Staff);
         console.log("employeed_id",Staff.employee_id)

                if (!tempOrder) {
                    console.log('❌ Temp Order Not Found!');
                    return res.status(404).json({ message: 'Temporary order not found' });
                }

                // Register New User
                const newUser = await prisma.user.create({
                    data: {
                        name: tempOrder.fullName,
                        email: tempOrder.email,
                        phoneNumber: tempOrder.phone,
                        password: tempOrder.password,
                        placeId: tempOrder.placeId,
                        businessName: tempOrder.businessName,
                        businessType: tempOrder.businessType,
                        referralCode: tempOrder.referralCode,
                        employee_id: Staff.employee_id,
                        isActive: true,
                        subscriptionStartDate: new Date(),
                        subscriptionEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    },
                });

                console.log('✅ New User Created:', newUser);

                const dashboard = await prisma.dashboard.create({
                    data: { user_id: newUser.user_id },
                });
                // Create Transaction Record
                await prisma.transaction.create({
                    data: {
                        user_id: newUser.user_id,
                        orderId,
                        paymentId,
                        amount,
                        status: 'paid',
                    },
                });

                console.log('✅ Transaction Recorded');

                // Delete Temp Order
                await prisma.temporder.delete({ where: { orderId } });

                console.log('✅ Temp Order Deleted');

                return res.status(200).json({ message: `${newUser.name} has been registered successfully` });
            }

            case 'payment.failed': {
                console.log('❌ Payment Failed:', event.payload.payment.entity);
                return res.status(200).json({ message: 'Payment failed event logged' });
            }

            default:
                console.log('⚠️ Unhandled Event Type:', event.event);
                return res.status(200).json({ message: 'Unhandled event' });
        }
    } catch (error) {
        console.error('🔥 Webhook Processing Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};




// const paymentVerify = async (req,res)=>{
//     const webhookBody = req.rawBody; // Ensure rawBody middleware is in use
//     const webhookSignature = req.headers['x-razorpay-signature'];
//     const webhookSecret = "J3JKqWCm0aGWbMoktLkyUEts";

//     if (!webhookBody) {
//         // console.error('Webhook body is empty or undefined');
//         return res.status(400).send('Invalid request body');
//     }

//     try {
//         const expectedSignature = crypto
//             .createHmac('sha256', webhookSecret)
//             .update(webhookBody)
//             .digest('hex');

//         if (expectedSignature !== webhookSignature) {
//             // console.error('Invalid webhook signature');
//             return res.status(400).send('Invalid webhook signature');
//         }

//         const event = JSON.parse(webhookBody);

//         switch (event.event) {
// }



// 3. Renew Subscription
const renewSubscription = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await prisma.user.findUnique({ where: { user_id: userId } });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isActive) return res.json({ message: "Subscription is still active" });
        const order = await razorpay.orders.create({
            amount: 99900,
            currency: "INR",
            receipt: crypto.randomUUID(),
            payment_capture: 1
        });
        await prisma.revenue.create({
            data: {
                user_id: user.user_id,
                amount: 99900,
                orderId: order.id,
                status: "pending"
            }
        });
        res.status(200).json({ success: true, order, message: "Please complete the payment to renew subscription" });
    } catch (error) {
        
            res.status(500).json({ error: "Internal server error" });

    }
};

// 4. Verify Renewal Payment
const verifyRenewalPayment = async (req, res) => {
    try {
        const signature = req.headers["x-razorpay-signature"];
        const expectedSignature = crypto.createHmac("sha256", "YOUR_RAZORPAY_SECRET")
            .update(JSON.stringify(req.body))
            .digest("hex");
        if (signature !== expectedSignature) {
            return res.status(400).json({ message: "Invalid Signature" });
        }
        const payment = req.body.payload.payment.entity;
        if (payment.status === "captured") {
            const revenueRecord = await prisma.revenue.findUnique({ where: { orderId: payment.order_id } });
            if (!revenueRecord) return res.status(404).json({ message: "Revenue record not found" });
            const user = await prisma.user.update({
                where: { user_id: revenueRecord.user_id },
                data: {
                    isActive: true,
                    subscriptionStartDate: new Date(),
                    subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
                }
            });
            await prisma.revenue.update({ where: { id: revenueRecord.id }, data: { status: "paid" } });
            await prisma.transaction.create({
                data: {
                    user_id: user.user_id,
                    orderId: payment.order_id,
                    paymentId: payment.id,
                    amount: payment.amount,
                    status: "paid"
                }
            });
            res.status(200).json({ message: `Subscription renewed successfully for ${user.name}` });
        } else {
            res.status(400).json({ message: "Payment not captured" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { createOrder, paymentVerify, renewSubscription, verifyRenewalPayment };
