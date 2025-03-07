const prisma = require("../../prisma")




const getAllTempOrder = async (req, res) => {
    try {
        const tempOrders = await prisma.temporder.findMany();
        res.json(tempOrders);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching temp orders' });
    }
}

// ✅ Get a single temp order by ID
const getParticularTempOrder =  async (req, res) => {
    try {
        const { id } = req.params;
        const tempOrder = await prisma.temporder.findUnique({
            where: { id: Number(id) }
        });

        if (!tempOrder) {
            return res.status(404).json({ error: 'Temp order not found' });
        }

        res.json(tempOrder);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching temp order' });
    }
}

// ✅ Delete a temp order by ID
const deleteTempOrder =  async (req, res) => {
    try {
        const { id } = req.params;
        const tempOrder = await prisma.temporder.findUnique({
            where: { id: Number(id) }
        });

        if (!tempOrder) {
            return res.status(404).json({ error: 'Temp order not found' });
        }

        await prisma.temporder.delete({
            where: { id: Number(id) }
        });

        res.json({ message: 'Temp order deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting temp order' });
    }
}

module.exports = {deleteTempOrder,getParticularTempOrder,getAllTempOrder}