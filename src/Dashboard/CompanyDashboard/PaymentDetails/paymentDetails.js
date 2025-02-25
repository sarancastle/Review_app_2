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
const paymentVerify = async (req, res) => {
    try {
        const webhookBody = JSON.stringify(req.body); // Ensure correct raw body handling
        const webhookSignature = req.headers["x-razorpay-signature"];
        const webhookSecret = "J3JKqWCm0aGWbMoktLkyUEts";

        if (!webhookBody || !webhookSignature) {
            return res.status(400).json({ message: "Invalid webhook request" });
        }

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(webhookBody)
            .digest("hex");

        if (expectedSignature !== webhookSignature) {
            return res.status(400).json({ message: "Invalid webhook signature" });
        }

        const event = req.body; // Use parsed body directly
        console.log("Received Webhook Event:", event);

        switch (event.event) {
            case "payment.captured": {
                const paymentDetails = event.payload.payment.entity;
                const orderId = paymentDetails.order_id;
                const paymentId = paymentDetails.id;
                const amount = paymentDetails.amount / 100; // Convert from paise to INR

                // Fetch temp order using order ID
                const temporder = await prisma.temporder.findUnique({ where: { orderId } });

                if (!temporder) {
                    return res.status(404).json({ message: "Temp order not found" });
                }

                let referralCode = temporder.referralCode;
                const defaultReferralCode = "WZ25FEB17-5531";
                const referralSources = ["Google", "Facebook", "Instagram"];

                if (referralSources.includes(referralCode)) {
                    referralCode = defaultReferralCode;
                }

                console.log("Final Referral Code:", referralCode);

                // Fetch employee based on referral code
                const Staff = await prisma.employees.findUnique({ where: { referralCode } });

                if (!Staff) {
                    return res.status(400).json({ message: "Invalid Referral Code" });
                }

                // Set subscription end date (24 hours from now)
                const subscriptionEndDate = new Date();
                subscriptionEndDate.setMinutes(subscriptionEndDate.getMinutes() + 1440);

                // Create new user
                const newUser = await prisma.user.create({
                    data: {
                        name: temporder.fullName,
                        email: temporder.email,
                        phoneNumber: temporder.phone,
                        password: temporder.password,
                        placeId: temporder.placeId,
                        businessName: temporder.businessName,
                        businessType: temporder.businessType,
                        employee_id: Staff.employee_id,
                        referralCode: temporder.referralCode,
                        isActive: true,
                        subscriptionStartDate: new Date(),
                        subscriptionEndDate,
                    },
                });

                // Create dashboard entry
                await prisma.dashboard.create({ data: { user_id: newUser.user_id } });

                // Delete temporary order
                await prisma.temporder.delete({ where: { id: temporder.id } });

                // Record the transaction
                await prisma.transaction.create({
                    data: {
                        user_id: newUser.user_id,
                        orderId,
                        paymentId,
                        amount,
                        status: "paid",
                    },
                });

                return res.status(200).json({ message: `${newUser.name} has been Registered Successfully` });
            }

            default:
                return res.status(400).json({ message: "Unhandled event type" });
        }
    } catch (error) {
        console.error("Payment verification error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { paymentVerify };

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
}

// const razorpayWebhook = async (req, res) => {
//     const webhookBody = req.rawBody; // Ensure rawBody middleware is in use
//     const webhookSignature = req.headers['x-razorpay-signature'];
//     const webhookSecret = config.RAZORPAY_KEY_SECRET;

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
//             case 'payment.captured': {
//                 const paymentDetails = event.payload.payment.entity;
//                 const orderId = paymentDetails.order_id;
//                 const paymentId = paymentDetails.id;

//                 const orderDetails = await prisma.temporaryOrder.findUnique({
//                     where: { order_id: orderId },
//                 });

//                 if (!orderDetails && !sessionDetails) {
//                     // console.error(`No order or session found for order_id: ${orderId}`);
//                     return res.status(404).json({ error: "Order or session not found" });
//                 }

//                 // Create permanent order
//                 if (orderDetails) {
//                     await prisma.permanentOrder.create({
//                         data: {
//                             order_id: orderId,
//                             payment_id: paymentId,
//                             name: orderDetails.name,
//                             phoneNumber: orderDetails.phoneNumber,
//                             amount: orderDetails.amount,
//                             subcategoryName: orderDetails.subcategoryName,
//                             productName: orderDetails.productName,
//                             size: orderDetails.size,
//                             price: orderDetails.price,
//                             shipping_charges: orderDetails.shipping_charges,
//                             totalPrice: orderDetails.totalPrice,
//                             name: orderDetails.name,
//                             email: orderDetails.email,
//                             phoneNumber: orderDetails.phoneNumber,
//                             address1: orderDetails.address1,
//                             address2: orderDetails.address2,
//                             landmark: orderDetails.landmark,
//                             status: "Order Placed",
//                             city: orderDetails.city,
//                             state: orderDetails.state,
//                             pincode: orderDetails.pincode,
//                             photo: orderDetails.photo
//                         },
//                     });
//                     await prisma.temporaryOrder.delete({
//                         where: { order_id: orderId },
//                     });

//                 }


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
