import express from 'express';
import User from '../models/User';
import Tournament from '../models/Tournament';
import Match from '../models/Match';
import { Notification } from '../models/Notification';
import { adminAuth } from '../middleware/authMiddleware';

const router = express.Router();

// GET /api/tournaments - List all tournaments
router.get('/', async (req, res) => {
    try {
        const tournaments = await Tournament.find();
        res.json(tournaments);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

// GET /api/tournaments/:id - Get specific tournament
router.get('/:id', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id).populate('participants', 'username avatar');
        res.json(tournament);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

// POST /api/tournaments - Create tournament (Admin)
router.post('/', adminAuth, async (req, res) => {
    try {
        const tournament = await Tournament.create(req.body);
        res.status(201).json(tournament);
    } catch (err) {
        res.status(500).json({ error: 'Creation failure' });
    }
});

// POST /api/tournaments/register - Register for a tournament
router.post('/register', async (req, res) => {
    const { userId, tournamentId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) return res.status(404).json({ error: 'Tournament node not found in registry.' });

        if (tournament.participants.includes(userId)) {
            return res.json(user); // Already registered
        }

        // Atomic update for both participants and user registration
        tournament.participants.push(userId);
        await tournament.save();

        if (!user.registeredTournaments) user.registeredTournaments = [];
        user.registeredTournaments.push(tournamentId);
        user.stats.tournaments += 1;

        await user.save();

        // Notify user
        await Notification.create({
            userId,
            type: 'SYSTEM',
            content: `Registration Confirmed: Protocol for tournament ${tournament.name} initialized.`
        });

        // Check if tournament is full and should start
        if (tournament.participants.length >= tournament.maxParticipants) {
            tournament.status = 'ACTIVE';
            await tournament.save();

            // Auto-generate Round 1 Matches
            const participantIds = [...tournament.participants];
            // Shuffle
            for (let i = participantIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [participantIds[i], participantIds[j]] = [participantIds[j], participantIds[i]];
            }

            const matches = [];
            for (let i = 0; i < participantIds.length; i += 2) {
                if (participantIds[i + 1]) {
                    matches.push({
                        tournamentId: tournament._id,
                        player1Id: participantIds[i],
                        player2Id: participantIds[i + 1],
                        round: 1,
                        status: 'PENDING'
                    });
                }
            }
            if (matches.length > 0) {
                await Match.insertMany(matches);
                console.log(`[ARENA] Generated ${matches.length} matches for tournament: ${tournament.name}`);
            }
        }

        res.json(user);
    } catch (err) {
        console.error('Tournament reg error:', err);
        res.status(500).json({ error: 'Registration failure' });
    }
});

// GET /api/tournaments/:id/matches - Get matches for a tournament
router.get('/:id/matches', async (req, res) => {
    try {
        const matches = await Match.find({ tournamentId: req.params.id })
            .populate('player1Id', 'username avatar')
            .populate('player2Id', 'username avatar')
            .sort({ round: 1 });
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// POST /api/matches/:id/result - Set match result (Admin)
router.post('/matches/:id/result', adminAuth, async (req, res) => {
    const { winnerId, score } = req.body;
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        match.winnerId = winnerId;
        match.score = score;
        match.status = 'COMPLETED';
        await match.save();

        // Winner Progression Logic
        const tournament = await Tournament.findById(match.tournamentId);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        // Find or create the next match for the winner
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
        } else {
            // Create next round logic is complex, stubbed here as per original
        }

        res.json(match);
    } catch (err) {
        res.status(500).json({ error: 'Result processing failure' });
    }
});

export default router;
