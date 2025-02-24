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
// const deleteExpiredTickets = async () => {
//     console.log("Checking expired RESOLVED tickets...");

//     try {
//         const twoMinutesAgo = new Date();
//         twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

//         // Ensure resolvedAt exists in the schema before running delete
//         const result = await prisma.helpdesk.deleteMany({
//             where: {
//                 status: "RESOLVED",
//                 resolvedAt: { not: null, lte: twoMinutesAgo }, // Ensure resolvedAt is not null
//             },
//         });

//         console.log(`Deleted ${result.count} expired RESOLVED tickets.`);
//     } catch (error) {
//         console.error("Error deleting expired tickets:", error.message || error);
//     }
// };

// Export functions
module.exports = {
    checkSubscription,
    
};
