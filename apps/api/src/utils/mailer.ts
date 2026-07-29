import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'arhamsaifofficial@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'rqki yjfw gqno vkpa';
const SMTP_FROM = process.env.SMTP_FROM || 'Restaurant SaaS Platform <arhamsaifofficial@gmail.com>';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // true for 465, false for 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f6f7f8; padding: 30px; color: #1b1d1f;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e7e9ec; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; border-b: 1px solid #e7e9ec; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #1f5c5b; margin: 0; font-size: 20px;">Restaurant SaaS — Super Admin Security</h2>
        </div>
        <p style="font-size: 14px; color: #6b7178;">Hello Super Admin,</p>
        <p style="font-size: 14px; color: #1b1d1f;">Your 6-digit Security Verification Code (OTP) for Super Admin panel authentication is:</p>
        
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1f5c5b; background: #f6f7f8; padding: 12px 24px; border-radius: 8px; border: 1px inline-block;">
            ${otpCode}
          </span>
        </div>

        <p style="font-size: 12px; color: #6b7178; text-align: center;">This verification code is valid for <strong>5 minutes</strong>. If you did not request this login, please change your credentials immediately.</p>
        <div style="border-t: 1px solid #e7e9ec; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #6b7178;">
          &copy; 2026 Restaurant SaaS Platform · Multi-Tenant Isolation
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: toEmail,
      subject: `[OTP ${otpCode}] Super Admin Access Security Code`,
      html: htmlContent
    });
    console.log(`[Mailer] Verification OTP sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[Mailer] Error sending OTP email to ${toEmail}:`, err);
    return false;
  }
}

export async function sendOwnerOnboardingEmail(
  toEmail: string,
  ownerName: string,
  restaurantName: string,
  loginUrl: string,
  initialPassword: string
): Promise<boolean> {
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f6f7f8; padding: 30px; color: #1b1d1f;">
      <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e7e9ec; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; border-bottom: 2px solid #1f5c5b; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #1f5c5b; margin: 0; font-size: 22px; tracking-tight: -0.5px;">Welcome to Restaurant SaaS</h2>
          <p style="color: #6b7178; font-size: 13px; margin-top: 4px;">Your Restaurant Operations Portal is Ready</p>
        </div>
        
        <p style="font-size: 15px; color: #1b1d1f;">Hello <strong>${ownerName}</strong>,</p>
        <p style="font-size: 14px; color: #6b7178; line-height: 1.5;">
          Congratulations! Your restaurant <strong>${restaurantName}</strong> has been provisioned on our multi-tenant SaaS platform. Your dedicated operations portal, POS terminal, Kitchen Display System (KDS), and inventory controls are active.
        </p>
        
        <div style="background: #f6f7f8; border: 1px solid #e7e9ec; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
          <p style="margin: 0 0 8px 0; color: #6b7178; font-family: monospace; font-size: 11px; text-transform: uppercase;">Your Owner Login Credentials</p>
          <p style="margin: 4px 0; color: #1b1d1f;"><strong>Portal URL:</strong> <a href="${loginUrl}" style="color: #1f5c5b; font-weight: bold;">${loginUrl}</a></p>
          <p style="margin: 4px 0; color: #1b1d1f;"><strong>Login Email:</strong> <span style="font-family: monospace; font-weight: bold;">${toEmail}</span></p>
          <p style="margin: 4px 0; color: #1b1d1f;"><strong>Initial Password:</strong> <span style="font-family: monospace; font-weight: bold; background: #e7e9ec; padding: 2px 6px; border-radius: 4px;">${initialPassword}</span></p>
        </div>

        <div style="text-align: center; margin: 28px 0 16px 0;">
          <a href="${loginUrl}" style="background-color: #1f5c5b; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
            Access ${restaurantName} Operations &rarr;
          </a>
        </div>

        <p style="font-size: 12px; color: #6b7178; line-height: 1.4;">
          Once logged in, you can add your staff members (cashiers, chefs, drivers), customize your menu catalog, configure recipes, and start taking orders.
        </p>

        <div style="border-top: 1px solid #e7e9ec; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #6b7178;">
          &copy; 2026 Restaurant SaaS Platform · Multi-Tenant Isolation
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: toEmail,
      subject: `Welcome to Restaurant SaaS — Access Link for ${restaurantName}`,
      html: htmlContent
    });
    console.log(`[Mailer] Owner onboarding email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[Mailer] Error sending onboarding email to ${toEmail}:`, err);
    return false;
  }
}
