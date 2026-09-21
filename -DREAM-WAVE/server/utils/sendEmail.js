const nodemailer = require('nodemailer');

async function createTransport() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SMTP is not configured');
  }
  return {
    sendMail: async (opts) => {
      // Dev/test only — never log token URLs in production (blocked above).
      console.log('\n📧 [Email fallback — SMTP not configured]');
      console.log('To:', opts.to);
      console.log('Subject:', opts.subject);
      console.log('Body:', opts.text || opts.html);
      console.log('');
      return { messageId: 'console-fallback' };
    },
  };
}

exports.sendEmail = async ({ to, subject, text, html }) => {
  const transporter = await createTransport();
  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'Dream Wave AI <noreply@dreamwave.ai>',
    to,
    subject,
    text,
    html,
  });
};
