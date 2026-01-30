import express from 'express';
import Match from '../models/Match';
import Tournament from '../models/Tournament';
import { adminAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/:id/result', adminAuth, async (req, res) => {
    const { winnerId, score } = req.body;

    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        match.winnerId = winnerId;
        match.score = score;
        match.status = 'COMPLETED';
        await match.save();

        const tournament = await Tournament.findById(match.tournamentId);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        const nextRound = match.round + 1;
        const nextMatch = await Match.findOne({
            tournamentId: tournament._id,
            round: nextRound,
            $or: [{ player1Id: { $exists: false } }, { player2Id: { $exists: false } }]
        });

        if (nextMatch) {
            if (!nextMatch.player1Id) nextMatch.player1Id = winnerId;
            else if (!nextMatch.player2Id) nextMatch.player2Id = winnerId;
            await nextMatch.save();
        }

        res.json(match);
    } catch (err) {
        res.status(500).json({ error: 'Result processing failure' });
    }
});

export default router;
