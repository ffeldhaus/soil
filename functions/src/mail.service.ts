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

  async sendPlayerLoginInfo(email: string, loginLink: string, lang = 'en'): Promise<void> {
    const subjects: Record<string, string> = {
      en: 'Your Login Link to Soil',
      de: 'Dein Login-Link für Soil',
    };
    const subject = subjects[lang] || subjects['en'];

    const textEN = `Welcome to Soil!\n\nPlease use the following link to log in:\n${loginLink}\n\nIf you did not request this, please ignore this email.`;
    const textDE = `Willkommen bei Soil!\n\nBitte nutze den folgenden Link, um dich einzuloggen:\n${loginLink}\n\nWenn du dies nicht angefordert hast, ignoriere diese E-Mail bitte.`;
    const text = lang === 'de' ? textDE : textEN;

    const htmlEN = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome to Soil!</h2>
        <p>Please use the button below to log in:</p>
        <p>
          <a href="${loginLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Soil</a>
        </p>
        <p style="font-size: 12px; color: #777;">If the button doesn't work, copy and paste this link into your browser:<br>${loginLink}</p>
      </div>
    `;
    const htmlDE = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Willkommen bei Soil!</h2>
        <p>Bitte nutze den folgenden Button, um dich einzuloggen:</p>
        <p>
          <a href="${loginLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Bei Soil einloggen</a>
        </p>
        <p style="font-size: 12px; color: #777;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>${loginLink}</p>
      </div>
    `;
    const html = lang === 'de' ? htmlDE : htmlEN;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendAdminRegistrationApproved(email: string, lang = 'en'): Promise<void> {
    const subjects: Record<string, string> = {
      en: 'Soil Admin Registration Approved',
      de: 'Soil Admin-Registrierung bestätigt',
    };
    const subject = subjects[lang] || subjects['en'];

    const textEN = `Congratulations!\n\nYour admin registration for Soil has been approved. You can now log in to the admin dashboard.`;
    const textDE = `Glückwunsch!\n\nDeine Registrierung als Admin für Soil wurde bestätigt. Du kannst dich jetzt im Admin-Dashboard einloggen.`;
    const text = lang === 'de' ? textDE : textEN;

    const htmlEN = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Registration Approved</h2>
        <p>Your admin registration for Soil has been approved.</p>
        <p>You can now log in to the admin dashboard.</p>
      </div>
    `;
    const htmlDE = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Registrierung bestätigt</h2>
        <p>Deine Registrierung als Admin für Soil wurde bestätigt.</p>
        <p>Du kannst dich jetzt im Admin-Dashboard einloggen.</p>
      </div>
    `;
    const html = lang === 'de' ? htmlDE : htmlEN;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendVerificationEmail(email: string, link: string, lang = 'en'): Promise<void> {
    const subjects: Record<string, string> = {
      en: 'Verify your email for Soil',
      de: 'Bestätige deine E-Mail für Soil',
    };
    const subject = subjects[lang] || subjects['en'];

    const textEN = `Hello,\n\nPlease verify your email address by clicking the link below:\n${link}\n\nIf you did not request this, please ignore this email.`;
    const textDE = `Hallo,\n\nbitte bestätige deine E-Mail-Adresse, indem du auf den folgenden Link klickst:\n${link}\n\nWenn du dies nicht angefordert hast, ignoriere diese E-Mail bitte.`;
    const text = lang === 'de' ? textDE : textEN;

    const htmlEN = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Verify your email</h2>
        <p>Please click the button below to verify your email address:</p>
        <p>
          <a href="${link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        </p>
        <p style="font-size: 12px; color: #777;">If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
      </div>
    `;
    const htmlDE = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>E-Mail bestätigen</h2>
        <p>Bitte klicke auf den folgenden Button, um deine E-Mail-Adresse zu bestätigen:</p>
        <p>
          <a href="${link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">E-Mail bestätigen</a>
        </p>
        <p style="font-size: 12px; color: #777;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>${link}</p>
      </div>
    `;
    const html = lang === 'de' ? htmlDE : htmlEN;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendPasswordResetEmail(email: string, link: string, lang = 'en'): Promise<void> {
    const subjects: Record<string, string> = {
      en: 'Reset your password for Soil',
      de: 'Passwort zurücksetzen für Soil',
    };
    const subject = subjects[lang] || subjects['en'];

    const textEN = `Hello,\n\nYou can reset your password by clicking the link below:\n${link}\n\nIf you did not request this, please ignore this email.`;
    const textDE = `Hallo,\n\ndu kannst dein Passwort zurücksetzen, indem du auf den folgenden Link klickst:\n${link}\n\nWenn du dies nicht angefordert hast, ignoriere diese E-Mail bitte.`;
    const text = lang === 'de' ? textDE : textEN;

    const htmlEN = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Reset your password</h2>
        <p>Please click the button below to reset your password:</p>
        <p>
          <a href="${link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </p>
        <p style="font-size: 12px; color: #777;">If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
      </div>
    `;
    const htmlDE = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Passwort zurücksetzen</h2>
        <p>Bitte klicke auf den folgenden Button, um dein Passwort zurückzusetzen:</p>
        <p>
          <a href="${link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Passwort zurücksetzen</a>
        </p>
        <p style="font-size: 12px; color: #777;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>${link}</p>
      </div>
    `;
    const html = lang === 'de' ? htmlDE : htmlEN;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendGameInvite(email: string, gameName: string, gameId: string, lang = 'en'): Promise<void> {
    const subjects: Record<string, string> = {
      en: `Invitation to Soil Game: ${gameName}`,
      de: `Einladung zum Soil-Spiel: ${gameName}`,
    };
    const subject = subjects[lang] || subjects['en'];

    const textEN = `You have been invited to play Soil!\n\nGame: ${gameName}\nGame ID: ${gameId}\n\nPlease ask your host for your unique Player PIN.\n\nGo to https://soil-602ea.web.app to join.`;
    const textDE = `Du wurdest eingeladen, Soil zu spielen!\n\nSpiel: ${gameName}\nSpiel-ID: ${gameId}\n\nBitte frage deine Lehrkraft nach deinem persönlichen PIN.\n\nGehe auf https://soil-602ea.web.app um beizutreten.`;
    const text = lang === 'de' ? textDE : textEN;

    const htmlEN = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>You're invited to Soil!</h2>
        <p>You have been invited to join the game <strong>${gameName}</strong>.</p>
        <p><strong>Game ID:</strong> ${gameId}</p>
        <p>Please ask your host for your unique Player PIN.</p>
        <p>
          <a href="https://soil-602ea.web.app" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Soil</a>
        </p>
      </div>
    `;
    const htmlDE = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Einladung zu Soil!</h2>
        <p>Du wurdest eingeladen, dem Spiel <strong>${gameName}</strong> beizutreten.</p>
        <p><strong>Spiel-ID:</strong> ${gameId}</p>
        <p>Bitte frage deine Lehrkraft nach deinem persönlichen PIN.</p>
        <p>
          <a href="https://soil-602ea.web.app" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Zu Soil gehen</a>
        </p>
      </div>
    `;
    const html = lang === 'de' ? htmlDE : htmlEN;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendAdminNewRegistrationNotification(adminEmail: string, userData: any): Promise<void> {
    const subject = 'New Admin Registration for Soil';
    const text = `A new user has requested admin access for Soil.\n\nName: ${userData.firstName} ${userData.lastName}\nEmail: ${userData.email}\nInstitution: ${userData.institution}\nExplanation: ${userData.explanation}\n\nPlease review the request in the super admin dashboard.`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>New Admin Registration</h2>
        <p>A new user has requested admin access for Soil:</p>
        <ul>
          <li><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Institution:</strong> ${userData.institution}</li>
          <li><strong>Explanation:</strong> ${userData.explanation}</li>
        </ul>
        <p>Please review the request in the super admin dashboard.</p>
      </div>
    `;
    return this.sendEmail({ to: adminEmail, subject, text, html });
  }
}

export const mailService = new MailService();
