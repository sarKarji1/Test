import express from 'express';
import { writeFileSync, readFileSync } from 'fs';
import QRCode from 'qrcode';
import { Client } from '@whiskeysockets/baileys';
import Pastebin from 'pastebin-js';

const app = express();

// Pastebin setup - Replace with your API key
const pastebin = new Pastebin('your_pastebin_api_key');

// File to store session locally
const sessionFile = './session.json';

// WhatsApp client setup
const client = new Client();

// Generate QR code when pairing is needed
client.on('qr', (qr) => {
    QRCode.toDataURL(qr, (err, url) => {
        if (err) throw err;
        console.log(`Scan the QR code below: \n${url}`);
    });
});

// Handle successful authentication and save session
client.on('authenticated', (session) => {
    // Save session locally
    writeFileSync(sessionFile, JSON.stringify(session));

    // Upload session to Pastebin
    pastebin.createPaste(sessionFile, {
        name: 'WhatsApp Session',
        format: 'json',
        privacy: '1', // Public paste
    }).then((pasteUrl) => {
        console.log(`Session saved. Access it later here: ${pasteUrl}`);
    }).catch((err) => {
        console.error('Error saving session to Pastebin:', err);
    });
});

// Handle authentication failure
client.on('auth_failure', (err) => {
    console.error('Authentication failed:', err);
});

// Handle received messages
client.on('message', (message) => {
    console.log('Received message:', message);
});

// Check if we have a saved session, else prompt QR pairing
const loadSession = () => {
    try {
        if (fs.existsSync(sessionFile)) {
            const session = JSON.parse(readFileSync(sessionFile));
            client.loadAuthInfo(session);
        } else {
            console.log('No saved session, generating new QR code...');
            client.connect();
        }
    } catch (err) {
        console.error('Error loading session:', err);
    }
};

// Start client connection and load session if available
loadSession();

// Express route to generate QR code for pairing
app.get('/generate-qr', (req, res) => {
    client.on('qr', (qr) => {
        QRCode.toDataURL(qr, (err, url) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to generate QR code.' });
            }
            res.json({ qrCodeUrl: url });
        });
    });
});

// Express route to check session
app.get('/check-session', (req, res) => {
    if (fs.existsSync(sessionFile)) {
        res.json({ message: 'Session loaded, no need to pair QR again.' });
    } else {
        res.json({ message: 'No session found, please scan QR code.' });
    }
});

// Start the Express server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
