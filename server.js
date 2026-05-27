const express = require('express');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ============ TELEGRAM BOT SETUP ============
// REPLACE with YOUR actual bot token from @BotFather
const TELEGRAM_TOKEN = '8892467602:AAEFkMbMPvyhK0he1hNxPSLDIiiP24UlIi4';  // <-- CHANGE THIS!

// REPLACE with YOUR Chat ID (get from @userinfobot)
const YOUR_CHAT_ID = '1555129968';  // <-- CHANGE THIS!

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Telegram bot starting...');
console.log(`📨 Notifications will be sent to Chat ID: ${1555129968}`);

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'User';
    
    bot.sendMessage(chatId, 
        `✅ *Hello ${userName}!* \n\n` +
        `I am your FedEx Shipping Notification Bot. 📦\n\n` +
        `When someone submits the shipping form, you will automatically receive the details here.\n\n` +
        `Your bot is ready! 🚀`,
        { parse_mode: 'Markdown' }
    );
    
    console.log(`📨 /start command from Chat ID: ${1555129968}`);
});

bot.on('error', (error) => {
    console.error('Telegram bot error:', error);
});

// ============ API ENDPOINT ============
app.post('/api/create-shipment', async (req, res) => {
    console.log('\n📦 ===== NEW SHIPMENT REQUEST =====');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { 
            sender, 
            receiver, 
            package: packageInfo, 
            service, 
            specialNotes,
            signatureRequired,
            insurance
        } = req.body;
        
        if (!sender || !receiver) {
            throw new Error('Missing sender or receiver information');
        }
        
        // Generate tracking number
        const trackingNumber = `FDX${Date.now()}${Math.floor(Math.random() * 10000)}`;
        console.log(`📋 Generated tracking number: ${trackingNumber}`);
        
        // Create the message text for Telegram
        const messageText = `
🎫 *NEW SHIPMENT CREATED*

━━━━━━━━━━━━━━━━━━━━━━━━
📋 *TRACKING INFORMATION*
━━━━━━━━━━━━━━━━━━━━━━━━
🔢 *Tracking Number:* \`${trackingNumber}\`
🚚 *Service:* ${service || 'Standard Ground'}
📅 *Date:* ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━
👤 *SHIPPER (FROM)*
━━━━━━━━━━━━━━━━━━━━━━━━
📛 *Name:* ${sender.name || 'N/A'}
📍 *Address:* ${sender.address || 'N/A'}
🏙️ *City:* ${sender.city || 'N/A'}
📮 *ZIP:* ${sender.zip || 'N/A'}
📞 *Phone:* ${sender.phone || 'N/A'}
📧 *Email:* ${sender.email || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━
🎁 *RECIPIENT (TO)*
━━━━━━━━━━━━━━━━━━━━━━━━
📛 *Name:* ${receiver.name || 'N/A'}
📍 *Address:* ${receiver.address || 'N/A'}
🏙️ *City:* ${receiver.city || 'N/A'}
📮 *ZIP:* ${receiver.zip || 'N/A'}
📞 *Phone:* ${receiver.phone || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━
📦 *PACKAGE DETAILS*
━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ *Weight:* ${packageInfo?.weight || 'N/A'} lbs
📦 *Type:* ${packageInfo?.type || 'Parcel'}

━━━━━━━━━━━━━━━━━━━━━━━━
✅ *ADDITIONAL SERVICES*
━━━━━━━━━━━━━━━━━━━━━━━━
✍️ *Signature Required:* ${signatureRequired ? '✓ Yes' : '✗ No'}
🛡️ *Insurance:* ${insurance ? '✓ Yes' : '✗ No'}
📝 *Special Notes:* ${specialNotes || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━
🔔 *STATUS*
━━━━━━━━━━━━━━━━━━━━━━━━
✅ Shipment created successfully
⏳ Awaiting pickup

━━━━━━━━━━━━━━━━━━━━━━━━
*Thank you for shipping with FedEx!*

🔗 *Track your package:* https://track.fedex.com/${trackingNumber}
        `;
        
        // Send notification to Telegram AUTOMATICALLY
        let telegramSent = false;
        let telegramError = null;
        
        try {
            await bot.sendMessage(YOUR_CHAT_ID, messageText, {
                parse_mode: 'Markdown',
                disable_web_page_preview: false
            });
            telegramSent = true;
            console.log('✅ Notification sent to Telegram automatically!');
        } catch (error) {
            telegramError = error.message;
            console.error('❌ Telegram error:', error.message);
        }
        
        // Send response back to web page
        const response = {
            success: true,
            trackingNumber: trackingNumber,
            telegramSent: telegramSent,
            telegramError: telegramError,
            timestamp: new Date().toISOString()
        };
        
        console.log('📤 Response sent:', response);
        console.log('===== SHIPMENT COMPLETE =====\n');
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error creating shipment:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ===== SERVER STARTED =====`);
    console.log(`🌐 Web server: http://localhost:${PORT}`);
    console.log(`🤖 Telegram bot: ACTIVE`);
    console.log(`📨 Auto-sending notifications to Chat ID: ${1555129968}`);
    console.log(`===========================\n`);
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit();
});
