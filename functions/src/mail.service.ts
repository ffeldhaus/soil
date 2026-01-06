import * as functions from 'firebase-functions';
import { GoogleAuth } from 'google-auth-library';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class MailService {
  private isConfigured = false;
  private serviceAccountEmail: string;
  private impersonatedUser: string;
  private auth!: GoogleAuth;

  constructor() {
    this.serviceAccountEmail = process.env.GMAIL_SERVICE_ACCOUNT_EMAIL || '';
    this.impersonatedUser = process.env.GMAIL_IMPERSONATED_USER || '';

    // We strictly need the Service Account Email and the User to impersonate
    if (this.serviceAccountEmail && this.impersonatedUser) {
      this.isConfigured = true;
      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    } else {
      console.warn(
        'MailService: Configuration missing (GMAIL_SERVICE_ACCOUNT_EMAIL or GMAIL_IMPERSONATED_USER). Emails will be logged but not sent.',
      );
    }
  }

  /**
   * Generates an OAuth2 Access Token for the impersonated user using
   * Keyless Domain-Wide Delegation via the IAM Credentials API.
   */
  private async getAccessToken(): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const jwtPayload = {
      iss: this.serviceAccountEmail,
      sub: this.impersonatedUser,
      scope: 'https://www.googleapis.com/auth/gmail.send',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp,
    };

    // 1. Get a client authenticated as the Service Account (using ADC)
    const client = await this.auth.getClient();

    // 2. Sign the JWT using the IAM Credentials API
    // We assume the environment has access to the IAM API
    const url = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${this.serviceAccountEmail}:signJwt`;

    const res = await client.request({
      url,
      method: 'POST',
      data: {
        payload: JSON.stringify(jwtPayload),
      },
    });

    const signedJwt = (res.data as any).signedJwt;

    // 3. Exchange the signed JWT for an Access Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJwt,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Failed to exchange JWT for Access Token: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    return tokenData.access_token;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.isConfigured) {
      console.log('MailService (Mock):', JSON.stringify(options, null, 2));
      return;
    }

    try {
      // Fetch a fresh access token for each send (or you could cache it)
      const accessToken = await this.getAccessToken();

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          type: 'OAuth2',
          user: this.impersonatedUser,
          accessToken: accessToken,
        },
      });

      await transporter.sendMail({
        from: this.impersonatedUser,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(`Email sent to ${options.to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send email');
    }
  }

  async sendPlayerLoginInfo(email: string, loginLink: string): Promise<void> {
    const subject = 'Your Login Link to Soil';
    const text = `Welcome to Soil!\n\nPlease use the following link to log in:\n${loginLink}\n\nIf you did not request this, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome to Soil!</h2>
        <p>Please use the button below to log in:</p>
        <p>
          <a href="${loginLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Soil</a>
        </p>
        <p style="font-size: 12px; color: #777;">If the button doesn't work, copy and paste this link into your browser:<br>${loginLink}</p>
      </div>
    `;
    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendAdminRegistrationApproved(email: string): Promise<void> {
    const subject = 'Soil Admin Registration Approved';
    const text = `Congratulations!\n\nYour admin registration for Soil has been approved. You can now log in to the admin dashboard.`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Registration Approved</h2>
        <p>Your admin registration for Soil has been approved.</p>
        <p>You can now log in to the admin dashboard.</p>
      </div>
    `;
    return this.sendEmail({ to: email, subject, text, html });
  }
}

export const mailService = new MailService();
