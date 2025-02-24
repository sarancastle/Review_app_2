// Prisma Schema
const { PrismaClient } = require('@prisma/client');
const bcrypt = require("bcryptjs");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const prisma = new PrismaClient();
const razorpay = new Razorpay({
    key_id: "rzp_test_wCUQcBRBFudBQm",
    key_secret: "J3JKqWCm0aGWbMoktLkyUEts"
});

// 1. Create Temporary Order
const createOrder = async (req, res) => {
    try {
        const data = req.body;
        console.log(data.amount)
      
        const order = await razorpay.orders.create({
            amount: data.amount *100,
            currency: "INR",
           
        });
        const tempOrder = await prisma.temporder.create({
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
        res.status(200).json({ success: true, order, tempOrderId: tempOrder.id });
    } catch (error) {
            res.status(500).json({ error: "Internal server error" });
     
    }
};

// 2. Razorpay Webhook for Payment Confirmation
const paymentVerify = async (req, res) => {
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
            const tempOrder = await prisma.temporder.findUnique({ where: { orderId: payment.order_id } });
            if (!tempOrder) return res.status(404).json({ message: "Temp order not found" });

            let referralCode = tempOrder.referralCode;
            const defaultReferralCode = "WZ25FEB17-5531";
            const referralSources = ["Google", "Facebook", "Instagram"];

            if (referralSources.includes(referralCode)) {
                referralCode = defaultReferralCode;
            }

            console.log("Final Referral Code:", referralCode);

            const Staff = await prisma.employees.findUnique({ where: { referralCode } });
            if (!Staff) {
                return res.status(400).json({ message: "Invalid Referral Code" });
            }
            const subscriptionEndDate = new Date();
            subscriptionEndDate.setMinutes(subscriptionEndDate.getMinutes() + 1440);
            const newUser = await prisma.user.create({
                data: {
                    name: tempOrder.fullName,
                    email: tempOrder.email,
                    phoneNumber: tempOrder.phone,
                    password: tempOrder.password,
                    placeId: tempOrder.placeId,
                    businessName: tempOrder.businessName,
                    businessType: tempOrder.businessType,
                    employee_id: Staff.employee_id,
                    referralCode: tempOrder.referralCode,
                    isActive: true,
                    subscriptionStartDate: new Date(),
                    subscriptionEndDate
                }
            });
            await prisma.dashboard.create({ data: { user_id: newUser.user_id } });
            await prisma.temporder.delete({ where: { id: tempOrder.id } });
            await prisma.transaction.create({
                data: {
                    user_id: newUser.user_id,
                    orderId: payment.order_id,
                    paymentId: payment.id,
                    amount: payment.amount,
                    status: "paid"
                }
            });
            res.status(200).json({ message: `${newUser.name} has been Registered Successfully` });
        } else {
            res.status(400).json({ message: "Payment not captured" });
        }
    } catch (error) {
        res.status(500).json({ message: "Webhook processing error", error: error.message });
    }
};

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
