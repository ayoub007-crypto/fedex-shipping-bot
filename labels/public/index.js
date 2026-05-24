const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot('8892467602:AAEx3FoRPwOWy7S_NuUWRbCy8X_A9zJlVjk', {polling: true});
bot.on('message', (msg) => {
  bot.sendMessage(msg.chat.id, ':1555129968 ' + msg.text);
});
console.log('Bot is runningا');

// Add this function to test Telegram connection
async function testTelegramConnection(chatId) {
    try {
        await bot.sendChatAction(chatId, 'typing');
        return true;
    } catch (error) {
        console.error('Telegram connection failed:', error.message);
        return false;
    }
}

// Add this function to send label with retry logic
async function sendLabelToTelegram(chatId, filepath, trackingNumber, service) {
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
        try {
            // First, test connection
            await bot.sendChatAction(chatId, 'upload_document');
            
            // Send the document
            const result = await bot.sendDocument(chatId, filepath, {
                caption: `🎫 *FedEx Shipping Label*\n\n` +
                        `📦 Tracking: \`${trackingNumber}\`\n` +
                        `🚚 Service: ${service}\n` +
                        `📅 Date: ${new Date().toLocaleDateString()}\n\n` +
                        `You can track your package using: /track ${trackingNumber}`,
                parse_mode: 'Markdown'
            });
            
            console.log(`✅ Label sent to Telegram chat ${chatId}`);
            return { success: true, messageId: result.message_id };
            
        } catch (error) {
            lastError = error;
            retries--;
            console.log(`Telegram send failed (${retries} retries left): ${error.message}`);
            
            if (retries > 0) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 2000 * (4 - retries)));
            }
        }
    }
    
    console.error(`Failed to send to Telegram after 3 attempts: ${lastError?.message}`);
    return { success: false, error: lastError?.message };
}

// Update your /api/create-shipment endpoint
app.post('/api/create-shipment', async (req, res) => {
    try {
        const { sender, receiver, package: packageInfo, service, sendToTelegram, telegramChatId } = req.body;
        
        console.log('📦 New shipment request received');
        console.log('Send to Telegram:', sendToTelegram);
        console.log('Chat ID:', telegramChatId);
        
        // Generate tracking number
        const trackingNumber = `FDX${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Prepare shipment data
        const shipmentData = { 
            sender, 
            receiver, 
            package: packageInfo, 
            service,
            trackingNumber,
            date: new Date().toISOString()
        };
        
        // Generate PDF label
        console.log('📄 Generating PDF label...');
        const { filepath, filename } = await generateShippingLabel(shipmentData, trackingNumber);
        
        // Generate HTML label
        console.log('🌐 Generating HTML label...');
        const htmlLabel = generateHTMLLabel(shipmentData, trackingNumber);
        const htmlPath = path.join(labelsDir, `label_${trackingNumber}.html`);
        fs.writeFileSync(htmlPath, htmlLabel);
        
        let telegramResult = { success: false };
        
        // Send to Telegram if requested
        if (sendToTelegram && telegramChatId) {
            console.log(`📨 Sending label to Telegram (Chat ID: ${1555129968})...`);
            
            // First, verify the chat ID is valid
            const isValid = await testTelegramConnection(telegramChatId);
            
            if (isValid) {
                // Send PDF to Telegram
                telegramResult = await sendLabelToTelegram(telegramChatId, filepath, trackingNumber, service);
                
                if (telegramResult.success) {
                    console.log('✅ Label sent to Telegram successfully!');
                    
                    // Also send the HTML version as a fallback
                    try {
                        await bot.sendDocument(telegramChatId, htmlPath, {
                            caption: '📱 Web-friendly HTML label (opens in any browser)'
                        });
                    } catch (err) {
                        console.log('Could not send HTML version:', err.message);
                    }
                } else {
                    console.log('❌ Failed to send to Telegram:', telegramResult.error);
                }
            } else {
                console.log('❌ Invalid Telegram Chat ID or bot not started');
                telegramResult = { success: false, error: 'Invalid Chat ID' };
            }
        }
        
        // Prepare response
        const response = {
            success: true,
            trackingNumber: trackingNumber,
            labelUrl: `http://localhost:3000/labels/${filename}`,
            htmlLabelUrl: `http://localhost:3000/labels/label_${trackingNumber}.html`,
            telegramSent: telegramResult.success,
            telegramError: telegramResult.error || null
        };
        
        // Clean up files after 5 minutes
        setTimeout(() => {
            try {
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
                if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
                console.log(`🧹 Cleaned up files for ${trackingNumber}`);
            } catch (err) {
                console.error('Cleanup error:', err);
            }
        }, 300000); // 5 minutes
        
        console.log(`✅ Shipment ${trackingNumber} completed. Telegram sent: ${telegramResult.success}`);
        res.json(response);
        
    } catch (error) {
        console.error('Error creating shipment:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.stack 
        });
    }
});

// Add a test endpoint to verify Telegram bot is working
app.get('/api/test-telegram', async (req, res) => {
    const { chatId } = req.query;
    
    if (!chatId) {
        return res.json({ success: false, error: 'No chatId provided' });
    }
    
    try {
        await bot.sendMessage(chatId, '🔔 Test message from FedEx Label Bot! Your bot is working correctly.');
        res.json({ success: true, message: 'Test message sent!' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Log all updates from Telegram
bot.on('message', (msg) => {
    console.log('Received message:', {
        chatId: msg.chat.id,
        text: msg.text,
        username: msg.from?.username
    });
});

// Log any errors
bot.on('error', (error) => {
    console.error('Telegram bot error:', error);
});

console.log('Bot token starts with:', TELEGRAM_TOKEN.substring(0, 10) + '8892467602:AAEx3FoRPwOWy7S_NuUWRbCy8X_A9zJlVjk');
