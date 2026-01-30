import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525'),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendOTP = async (email: string, code: string, username: string) => {
    const mailOptions = {
        from: '"PlayNative Security Hub" <security@playnative.io>',
        to: email,
        subject: `[ACTION REQUIRED] Your ${code} Verification Code for PlayNative`,
        headers: {
            'X-Priority': '1 (Highest)',
            'X-MSMail-Priority': 'High',
            'Importance': 'High',
        },
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #10b981; }
                    .brand { font-size: 24px; font-weight: 800; color: #10b981; margin-bottom: 20px; letter-spacing: -1px; }
                    .code-box { background-color: #0f172a; border: 1px dashed #10b981; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; }
                    .code { font-size: 42px; letter-spacing: 12px; color: #10b981; font-weight: 900; font-family: monospace; }
                    .footer { font-size: 11px; color: #64748b; margin-top: 40px; line-height: 1.6; border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; }
                    .highlight { color: #10b981; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="brand">PLAYNATIVE</div>
                    <h2 style="color: #f8fafc; font-size: 20px; margin-bottom: 15px;">Uplink Verification Requested</h2>
                    <p style="color: #94a3b8; line-height: 1.5;">Operator <span class="highlight">${username}</span>, your node has requested a secure uplink connection to the PlayNative Nexus.</p>
                    <p style="color: #94a3b8; font-size: 14px;">Please use the following single-use authorization code to complete the handshake:</p>
                    
                    <div class="code-box">
                        <div class="code">${code}</div>
                    </div>
                    
                    <p style="color: #94a3b8; font-size: 13px;">This code is valid for <span class="highlight">10 minutes</span>. If this was not initiated by you, please ignore this transmission or contact system security.</p>
                    
                    <div class="footer">
                        SYSTEM_ID: PN-AUTH-SECURE-NODE<br>
                        © 2026 PLAYNATIVE CO-OPERATIVE. ALL RIGHTS RESERVED.<br>
                        "Decentralized Gaming Excellence"
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Verification code sent to ${email}`);
        return true;
    } catch (error) {
        console.error('[MAIL] Error sending email:', error);
        // Fallback log for development if mail fails
        console.log(`[AUTH-FALLBACK] Verification Code for ${username}: ${code}`);
        return false;
    }
};
