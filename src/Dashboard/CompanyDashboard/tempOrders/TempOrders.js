const prisma = require("../../prisma");





const getAllTempOrder = async (req, res) => {
    try {
        const tempOrders = await prisma.temporder.findMany({
            select: {
                temporder_id: true,
                fullName: true,
                email: true,
                phone: true,
                placeId: true,
                businessName: true,
                businessType:true,
                referralCode: true,
                orderId: true,
                createdAt: true
            }
        });

        if (!tempOrders.length) {
            return res.status(404).json({ message: 'No temp orders found' });
        }

        res.json(tempOrders);
    } catch (error) {
        console.error("Error fetching temp orders:", error);
        res.status(500).json({ error: 'Error fetching temp orders', details: error.message });
    }
};


// // ✅ Get a single temp order by ID
// const getParticularTempOrder =  async (req, res) => {
//     try {
//         const { id } = req.params;
//         const tempOrder = await prisma.temporder.findUnique({
//             where: { temporder_id: id }
//         });

//         if (!tempOrder) {
//             return res.status(404).json({ error: 'Temp order not found' });
//         }

//         const { password, ...order } = tempOrder;

//         res.json(order);
//     } catch (error) {
//         res.status(500).json({ error: 'Error fetching temp order' });
//     }
// }

// ✅ Delete a temp order by ID
const deleteTempOrder =  async (req, res) => {
    try {
        const { id } = req.params;
        const tempOrder = await prisma.temporder.findUnique({
            where: { temporder_id:id }
        });


        if (!tempOrder) {
            return res.status(404).json({ error: 'Temp order not found' });
        }

        await prisma.temporder.delete({
            where: { temporder_id:tempOrder.temporder_id}
        });

        res.json({ message: 'Temp order deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting temp order' });
    }
}

module.exports = {deleteTempOrder,getAllTempOrder}