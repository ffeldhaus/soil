import * as functions from 'firebase-functions';
import { GoogleAuth } from 'google-auth-library';
import * as nodemailer from 'nodemailer';
import { APP_DOMAIN } from './constants';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class MailService {
  private _isConfigured = false;
  private _serviceAccountEmail = '';
  private _impersonatedUser = '';
  private _auth?: GoogleAuth;

  private ensureConfigured(): boolean {
    if (this._isConfigured) return true;

    this._serviceAccountEmail = (process.env.GMAIL_SERVICE_ACCOUNT_EMAIL || '').trim();
    this._impersonatedUser = (process.env.GMAIL_IMPERSONATED_USER || '').trim();

    if (this._serviceAccountEmail && this._impersonatedUser) {
      this._isConfigured = true;
      this._auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      return true;
    }

    return false;
  }

  /**
   * Generates an OAuth2 Access Token for the impersonated user using
   * Keyless Domain-Wide Delegation via the IAM Credentials API.
   */
  private async getAccessToken(): Promise<string> {
    if (!this.ensureConfigured() || !this._auth) {
      throw new Error('MailService not configured');
    }

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const jwtPayload = {
      iss: this._serviceAccountEmail,
      sub: this._impersonatedUser,
      scope: 'https://mail.google.com/',
      aud: 'https://www.googleapis.com/oauth2/v4/token',
      iat,
      exp,
    };

    // 1. Get a client authenticated as the Service Account (using ADC)
    const client = await this._auth.getClient();

    // 2. Sign the JWT using the IAM Credentials API
    const url = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${this._serviceAccountEmail}:signJwt`;

    const res = await client.request({
      url,
      method: 'POST',
      data: {
        payload: JSON.stringify(jwtPayload),
      },
    });

    const signedJwt = (res.data as any).signedJwt;

    // 3. Exchange the signed JWT for an Access Token
    const tokenRes = await fetch('https://www.googleapis.com/oauth2/v4/token', {
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
    if (!this.ensureConfigured()) {
      console.warn(
        'MailService: Configuration missing (GMAIL_SERVICE_ACCOUNT_EMAIL or GMAIL_IMPERSONATED_USER). Emails will be logged but not sent.',
      );
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
          user: this._impersonatedUser,
          accessToken: accessToken,
        },
      });

      await transporter.sendMail({
        from: `"SOIL" <${this._impersonatedUser}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send email');
    }
  }

  async sendPlayerLoginInfo(email: string, loginLink: string): Promise<void> {
    const subject = 'Dein Login-Link für Soil';
    const text = `Willkommen bei Soil!\n\nBitte nutze den folgenden Link, um dich einzuloggen:\n${loginLink}\n\nWenn du dies nicht angefordert hast, ignoriere diese E-Mail bitte.`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Willkommen bei Soil!</h2>
        <p>Bitte nutze den folgenden Button, um dich einzuloggen:</p>
        <p>
          <a href="${loginLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Bei Soil einloggen</a>
        </p>
        <p style="font-size: 12px; color: #777;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>${loginLink}</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendVerificationEmail(email: string, link: string): Promise<void> {
    const subject = 'Bestätige deine E-Mail für Soil';
    const text = `Hallo,\n\nbitte bestätige deine E-Mail-Adresse, indem du auf den folgenden Link klickst:\n${link}\n\nWenn du dies nicht angefordert hast, ignoriere diese E-Mail bitte.`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>E-Mail bestätigen</h2>
        <p>Bitte klicke auf den folgenden Button, um deine E-Mail-Adresse zu bestätigen:</p>
        <p>
          <a href="${link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">E-Mail bestätigen</a>
        </p>
        <p style="font-size: 12px; color: #777;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>${link}</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendPasswordResetEmail(email: string, link: string): Promise<void> {
    const subject = 'Passwort zurücksetzen für Soil';
    const text = `Hallo,\n\ndu kannst dein Passwort zurücksetzen, indem du auf den folgenden Link klickst:\n${link}\n\nWenn du dies nicht angefordert hast, ignoriere diese E-Mail bitte.`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Passwort zurücksetzen</h2>
        <p>Bitte klicke auf den folgenden Button, um dein Passwort zurückzusetzen:</p>
        <p>
          <a href="${link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Passwort zurücksetzen</a>
        </p>
        <p style="font-size: 12px; color: #777;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>${link}</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendGameInvite(email: string, gameName: string, gameId: string): Promise<void> {
    const subject = `Einladung zum Soil-Spiel: ${gameName}`;
    const text = `Du wurdest eingeladen, Soil zu spielen!\n\nSpiel: ${gameName}\nSpiel-ID: ${gameId}\n\nBitte frage deine Lehrkraft nach deinem persönlichen PIN.\n\nGehe auf ${APP_DOMAIN} um beizutreten.`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Einladung zu Soil!</h2>
        <p>Du wurdest eingeladen, dem Spiel <strong>${gameName}</strong> beizutreten.</p>
        <p><strong>Spiel-ID:</strong> ${gameId}</p>
        <p>Bitte frage deine Lehrkraft nach deinem persönlichen PIN.</p>
        <p>
          <a href="${APP_DOMAIN}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Zu Soil gehen</a>
        </p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendAdminNewRegistrationNotification(adminEmail: string, userData: any): Promise<void> {
    const subject = 'New Admin Registration for Soil';
    const institution = userData.onboarding?.institution || userData.institution || 'N/A';
    const explanation = userData.onboarding?.explanation || userData.explanation || 'N/A';

    const text = `A new user has requested admin access for Soil.\n\nName: ${userData.firstName} ${userData.lastName}\nEmail: ${userData.email}\nInstitution: ${institution}\nExplanation: ${explanation}\n\nPlease review the request in the system dashboard.`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>New Admin Registration</h2>
        <p>A new user has requested admin access for Soil:</p>
        <ul>
          <li><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Institution:</strong> ${institution}</li>
          <li><strong>Explanation:</strong> ${explanation}</li>
        </ul>
        <p>Please review the request in the system dashboard.</p>
      </div>
    `;
    return this.sendEmail({ to: adminEmail, subject, text, html });
  }
}

export const mailService = new MailService();
