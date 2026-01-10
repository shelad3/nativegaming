import express from 'express';
import User from '../models/User';
import MarketItem from '../models/MarketItem';
import { Notification } from '../models/Notification';

const router = express.Router();

// GET /api/marketplace/items - List all available items
router.get('/items', async (req, res) => {
    const { category, type } = req.query;
    try {
        const query: any = {};
        if (category) query.category = category;
        if (type) query.type = type;

        const items = await MarketItem.find(query).sort({ price: 1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch market items' });
    }
});

// GET /api/marketplace/items/:id - Get specific item
router.get('/items/:id', async (req, res) => {
    try {
        const item = await MarketItem.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

// POST /api/marketplace/purchase - Secure purchase endpoint
router.post('/purchase', async (req, res) => {
    const { userId, itemId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const item = await MarketItem.findById(itemId);
        // Fallback for simulation compatibility if item not in DB yet (during transition)
        // But strictly, we should enforce DB presence.
        // For now, if item is not found, we check if logic allows "mock" items or fail?
        // Let's enforce DB for security, but maybe allow a "legacy" mode if needed?
        // NO, we want REAL security.
        if (!item) {
            // Check if it's a legacy ID? 
            // Ideally we should have migrated all items to DB.
            // If not found, return error.
            return res.status(404).json({ error: 'Item not found in catalog' });
        }

        // Server-side price check
        if (user.codeBits < item.price) {
            return res.status(400).json({ error: 'Insufficient CodeBits' });
        }

        // Check verification (if unique/one-time item?) - Optional
        // Check if already owns if non-consumable?
        // Assuming inventory allows duplicates or we check type.
        if (item.category === 'Functional' || item.type === 'Skin') {
            // Logic to check duplicates if needed
        }

        // ATOMIC TRANSACTION LOGIC (Simulated with simple awaits for now)
        user.codeBits -= item.price;
        user.inventory.push(item._id.toString()); // Store ref

        // Audit Log
        user.audit_logs.unshift({
            action: 'PURCHASE',
            itemId: item._id.toString(),
            itemName: item.name,
            price: item.price,
            timestamp: new Date()
        });

        await user.save();

        await Notification.create({
            userId,
            type: 'GIFT',
            content: `Acquisition successful: ${item.name} added to inventory. Price: ${item.price} Ȼ`
        });

        res.json(user);
    } catch (err) {
        console.error('Purchase error:', err);
        res.status(500).json({ error: 'Purchase failure' });
    }
});

export default router;
