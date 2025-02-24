const prisma = require('./src/Dashboard/prisma')

// Function to check expired subscriptions
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

        // console.log(result);
        if (result.count > 0) {
            console.log(`Updated ${result.count} users to inactive.`);
        } else {
            console.log("No users with expired subscriptions.");
        }

    } catch (error) {
        console.error("Error updating subscriptions:", error);
    }
};

// Function to delete expired resolved tickets
const deleteExpiredTickets = async () => {
    console.log("Checking expired RESOLVED tickets...");

    try {
        const twoMinutesAgo = new Date();
        twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

        const result = await prisma.helpdesk.deleteMany({
            where: {
                status: "RESOLVED",
                resolvedAt: { lte: twoMinutesAgo },
            },
        });

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

// Export functions
module.exports = {
    checkSubscription,
    deleteExpiredTickets
};
