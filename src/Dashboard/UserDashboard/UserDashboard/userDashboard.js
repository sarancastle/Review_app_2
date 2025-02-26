const prisma = require("../../prisma")

// All the details of the particular user
const getUserDashboardById = async (req, res) => {
    // Extracting `id` from request parameters
    const { id } = req.params;
    console.log(id)
    // console.log("Received request for dashboard. User ID:", id); // Debug log

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

         // Check if user details exist
         if (!userDetails) {
            return res.status(404).json({ error: "User not found" });
        }
       
        // Check if the subscription is inactive
        if (userDetails && !userDetails.user.isActive) {
            // console.log("User subscription is inactive. Redirecting to renew."); // Debug log
            return res.status(403).json({
                message: "Subscription inactive. Please renew.",
                userName: userDetails.user.name,
                businessName: userDetails.user.businessName
            });
        }


        // Calculate average negative review percentage
        const negativeReviews = userDetails.review.filter((review) => review.rating <= 3);
        // console.log(negativeReviews)
        let negativePercentage = 0;

        if (negativeReviews.length > 0) {
            // Calculate average rating for negative reviews
            const avgNegativeRating = negativeReviews.reduce((acc, review) => acc + review.rating, 0) / negativeReviews.length;
            negativePercentage = (avgNegativeRating / 5); // Convert to percentage
        }
        // console.log(negativePercentage)
        const positivePercentage = 5 - negativePercentage;


        res.status(200).json({
            userDetails,
            positiveReviewPercentage: positivePercentage.toFixed(2),
            reviewForm_url: `review/${userDetails.user_id}`,
            negativePercentage: negativePercentage


        });

     } catch (error) {
        // console.error("Error fetching dashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// it will  delete the users review in the dashboard by the reviewId
const deleteReview = async (req, res) => {
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
        // console.error("Error fetching dashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// help center for the users
const postUsersHelpCenter=  async (req, res) => {
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
        res.status(500).json({ error: "Internal server error" });
    }
}

// get all the helpdesk by the particular userid (ALL,OPEN,IN_PROGRESS,RESOLVE)
const getUserHelpdeskByUserId = async (req, res) => {
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

        res.status(200).json({ tickets });
    } catch (error) {
        // console.error("Error fetching dashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// it will check the subcription active(or)in-active
const  subscriptionCheckById = async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch user by ID
        const user = await prisma.user.findUnique({
            where: { user_id: id },
            select: { isActive: true,businessName:true},
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return user status
        return res.status(200).json({ 
            isActive: user.isActive, 
            message: user.isActive ? "User is active" : "Subscription inactive. Please renew to access services.",
            
            businessName:user.businessName,
            
        });

    } catch (error) {
        // console.error("Error fetching dashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

//Qr api review/:id (post review)
const qrReviewById = async (req, res) => {
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
        // console.log(user)
        if (!user.isActive) {
            //   return res.status(403).json({
            //     error: "Subscription inactive. Please renew to access the review form.",
            return res.status(404).json({ message: "Subscription inactive. Please renew to access the review form.", userName: user.name })

        }

        if (rating >= 4) {
            const redirectUrl = `https://search.google.com/local/writereview?placeid=${user.placeId}`;
            return res.status(200).json({ redirectUrl });
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

        res.status(200).json({ message: "Review saved successfully" });
    } catch (error) {
      
        res.status(500).json({ error: "Internal server error" });
    }
} 

module.exports = {getUserDashboardById,deleteReview,postUsersHelpCenter,getUserHelpdeskByUserId,subscriptionCheckById,qrReviewById}