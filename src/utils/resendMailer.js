// utils/resendMailer.js fix
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendResendEmail({ to, subject, html, text }) {
  try {
    await resend.emails.send({
      from: 'Smart Streetlight <KLTN@resend.dev>',
      to: [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // fallback text
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Resend email error:', error);
    throw error;
  }
}

module.exports = { sendResendEmail };
