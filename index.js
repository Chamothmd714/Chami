const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require("@whiskeysockets/baileys")
const P = require("pino")

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ["CHAMI-BOT", "Chrome", "1.0"]
    })

    // 1. PAIRING CODE - Phone Number එකෙන් Pair වෙන්න
    if (!sock.authState.creds.registered) {
        const phoneNumber = "947XXXXXXXX" // මෙතන ඔයාගේ Number එක දාන්න 94xxxxxxxxx විදියට
        console.log("Pairing code ඉල්ලනවා...")
        await delay(2000)
        const code = await sock.requestPairingCode(phoneNumber)
        console.log(`\nඔයාගේ Pairing Code එක: ${code}\nWhatsApp > Linked Devices > Link with Phone Number > Code එක දාන්න\n`)
    }

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection } = update
        if (connection === 'open') console.log("✅ CHAMI BOT Connected! 24x7 Online")
        if (connection === 'close') startBot() // Reconnect
    })

    // 2. AUTO STATUS SEEN + AUTO REACT + DOWNLOAD
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0]
            if (!msg) return
            
            // Status එකක් නම්
            if (msg.key.remoteJid === 'status@broadcast') {
                // Auto Seen
                await sock.readMessages([msg.key])
                console.log(`✅ Status Seen: ${msg.pushName}`)

                // Auto React - Random Emoji
                const emojis = ['❤️', '🔥', '😍', '👏', '🥰', '💯']
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
                await sock.sendMessage('status@broadcast', { react: { text: randomEmoji, key: msg.key } })
                
                // Auto Download - ඔයාටම Forward වෙනවා
                // Status Download ඕන නම් මේක Un-comment කරන්න
                // if(msg.message?.imageMessage || msg.message?.videoMessage){
                //    await sock.sendMessage(sock.user.id, { forward: msg, caption: `Downloaded Status from ${msg.pushName}` })
                // }
            }
        } catch (e) { console.log(e) }
    })

    // 3. COMMAND - .download - Reply කරලා Status එක Download කරගන්න
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message) return
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        if(text === '.download' && msg.message.extendedTextMessage?.contextInfo?.quotedMessage){
            const quoted = msg.message.extendedTextMessage.contextInfo
            await sock.sendMessage(msg.key.remoteJid, { forward: { key: quoted.stanzaId, ...quoted }, caption: "CHAMI BOT - Downloaded ✅" })
        }
    })
}

startBot()
