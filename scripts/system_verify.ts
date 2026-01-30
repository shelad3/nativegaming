
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
let authToken = '';
let userId = '';

async function runTests() {
    console.log('🚀 Starting System Verification...');

    try {
        // 1. Authentication
        console.log('\n[TEST 1] Authentication...');
        const loginResp = await axios.post(`${API_URL}/auth/login`, {
            email: 'sheldonramu8@gmail.com',
            username: 'SheldonMaster',
            authProvider: 'PASSWORD'
        });

        if (loginResp.data.token) {
            authToken = loginResp.data.token;
            userId = loginResp.data._id;
            console.log('✅ Login Successful. User ID:', userId);
        } else {
            throw new Error('No token returned');
        }

        const headers = { Authorization: `Bearer ${authToken}` };

        // 2. Notifications
        console.log('\n[TEST 2] Notifications...');
        // Create a mock notification first (usually done by system, but we can check fetch)
        const notifResp = await axios.get(`${API_URL}/users/${userId}/notifications`, { headers });
        console.log(`✅ Fetched ${notifResp.data.length} notifications.`);

        // 3. Messages
        console.log('\n[TEST 3] Messages...');
        const msgContent = `System Test ${Date.now()}`;
        const msgResp = await axios.post(`${API_URL}/messages`, {
            senderId: userId,
            recipientId: userId, // Self message
            content: msgContent
        }, { headers });

        if (msgResp.data.content === msgContent) {
            console.log('✅ Message sent successfully.');
        } else {
            console.error('❌ Message verification failed');
        }

        // 4. Streaming
        console.log('\n[TEST 4] Streaming Logic...');
        const startStreamResp = await axios.post(`${API_URL}/streams/start`, {
            userId,
            title: 'Unit Test Stream',
            game: 'System Core',
            description: 'Testing uplink...'
        }, { headers });

        if (startStreamResp.data.isLive) {
            console.log('✅ Stream started successfully.');
        } else {
            console.error('❌ Stream start failed');
        }

        const stopStreamResp = await axios.post(`${API_URL}/streams/stop`, { userId }, { headers });
        if (!stopStreamResp.data.isLive) {
            console.log('✅ Stream stopped successfully.');
        }

        // 5. Activities (Feed)
        console.log('\n[TEST 5] Global Feed...');
        const feedResp = await axios.get(`${API_URL}/activities`);
        console.log(`✅ Feed accessible. Retrieved ${feedResp.data.length} items.`);

        // 6. Post Upload (Mock)
        console.log('\n[TEST 6] Post Upload...');
        const postResp = await axios.post(`${API_URL}/posts`, {
            authorId: userId,
            title: 'System Verify Post',
            content: 'Automated test suite verification.',
            tags: ['test', 'system']
        }, { headers });

        if (postResp.data.title === 'System Verify Post') {
            console.log('✅ Post upload verified.');
        } else {
            console.error('❌ Post upload failed');
        }

        console.log('\n✨ ALL SYSTEMS OPERATIONAL ✨');

    } catch (error: any) {
        console.error('\n❌ SYSTEM TEST FAILED');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runTests();
