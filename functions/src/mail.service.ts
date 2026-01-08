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
    console.log(`MailService: Token Data received: ${JSON.stringify(tokenData)}`);
    return tokenData.access_token;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.ensureConfigured()) {
      console.warn(
        'MailService: Configuration missing (GMAIL_SERVICE_ACCOUNT_EMAIL or GMAIL_IMPERSONATED_USER). Emails will be logged but not sent.',
      );
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
      console.log(`Email sent to ${options.to}`);
    } catch (error: any) {
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

  async sendAdminRegistrationApproved(email: string, loginLink: string, lang = 'en'): Promise<void> {
    const subjects: Record<string, string> = {
      en: 'Soil Admin Registration Approved',
      de: 'Soil Admin-Registrierung bestätigt',
    };
    const subject = subjects[lang] || subjects['en'];

    const textEN = `Congratulations!\n\nYour admin registration for Soil has been approved. You can now log in to the admin dashboard using the following link:\n${loginLink}\n\nYour email address is already prefilled.`;
    const textDE = `Glückwunsch!\n\nDeine Registrierung als Admin für Soil wurde bestätigt. Du kannst dich jetzt im Admin-Dashboard über den folgenden Link einloggen:\n${loginLink}\n\nDeine E-Mail-Adresse ist bereits vorausgefüllt.`;
    const text = lang === 'de' ? textDE : textEN;

    const htmlEN = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Registration Approved</h2>
        <p>Congratulations! Your admin registration for Soil has been approved.</p>
        <p>You can now log in to the admin dashboard to start creating games:</p>
        <p style="margin: 30px 0;">
          <a href="${loginLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Admin Dashboard</a>
        </p>
        <p style="font-size: 14px; color: #666;">Your email address <strong>${email}</strong> will be prefilled on the login page.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">If the button doesn't work, copy and paste this link into your browser:<br>${loginLink}</p>
      </div>
    `;
    const htmlDE = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Registrierung bestätigt</h2>
        <p>Glückwunsch! Deine Registrierung als Admin für Soil wurde bestätigt.</p>
        <p>Du kannst dich jetzt im Admin-Dashboard einloggen und direkt loslegen:</p>
        <p style="margin: 30px 0;">
          <a href="${loginLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Zum Admin-Dashboard</a>
        </p>
        <p style="font-size: 14px; color: #666;">Deine E-Mail-Adresse <strong>${email}</strong> ist auf der Login-Seite bereits vorausgefüllt.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>${loginLink}</p>
      </div>
    `;
    const html = lang === 'de' ? htmlDE : htmlEN;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendAdminRegistrationRejected(
    email: string,
    reasons: string[],
    customMessage?: string,
    lang = 'en',
  ): Promise<void> {
    const subjects: Record<string, string> = {
      en: 'Update on your Soil Admin Registration',
      de: 'Update zu deiner Soil Admin-Registrierung',
    };
    const subject = subjects[lang] || subjects['en'];

    const reasonsTextEN: Record<string, string> = {
      institution_not_verified: 'The educational institution could not be verified.',
      insufficient_reason: 'The reason provided for joining was not sufficient.',
      other: 'Other reasons.',
    };

    const reasonsTextDE: Record<string, string> = {
      institution_not_verified: 'Die Bildungseinrichtung konnte nicht verifiziert werden.',
      insufficient_reason: 'Der angegebene Grund für die Nutzung war nicht ausreichend.',
      other: 'Andere Gründe.',
    };

    const selectedReasons = reasons.map((r) => (lang === 'de' ? reasonsTextDE[r] || r : reasonsTextEN[r] || r));

    const textEN = `Hello,\n\nThank you for your interest in Soil. Unfortunately, we cannot approve your admin registration at this time for the following reasons:\n\n${selectedReasons.map((r) => `- ${r}`).join('\n')}${customMessage ? `\n\nAdditional information: ${customMessage}` : ''}\n\nBest regards,\nThe Soil Team`;
    const textDE = `Hallo,\n\nvielen Dank für dein Interesse an Soil. Leider können wir deine Registrierung als Admin zum aktuellen Zeitpunkt aus den folgenden Gründen nicht bestätigen:\n\n${selectedReasons.map((r) => `- ${r}`).join('\n')}${customMessage ? `\n\nZusätzliche Informationen: ${customMessage}` : ''}\n\nBeste Grüße,\nDas Soil Team`;
    const text = lang === 'de' ? textDE : textEN;

    const htmlEN = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2>Update on your Registration</h2>
        <p>Thank you for your interest in Soil.</p>
        <p>Unfortunately, we cannot approve your admin registration at this time for the following reasons:</p>
        <ul>
          ${selectedReasons.map((r) => `<li>${r}</li>`).join('')}
        </ul>
        ${customMessage ? `<p><strong>Additional information:</strong><br>${customMessage}</p>` : ''}
        <p>Best regards,<br>The Soil Team</p>
      </div>
    `;
    const htmlDE = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2>Update zu deiner Registrierung</h2>
        <p>vielen Dank für dein Interesse an Soil.</p>
        <p>Leider können wir deine Registrierung als Admin zum aktuellen Zeitpunkt aus den folgenden Gründen nicht bestätigen:</p>
        <ul>
          ${selectedReasons.map((r) => `<li>${r}</li>`).join('')}
        </ul>
        ${customMessage ? `<p><strong>Zusätzliche Informationen:</strong><br>${customMessage}</p>` : ''}
        <p>Beste Grüße,<br>Das Soil Team</p>
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
    const institution = userData.onboarding?.institution || userData.institution || 'N/A';
    const explanation = userData.onboarding?.explanation || userData.explanation || 'N/A';

    const text = `A new user has requested admin access for Soil.\n\nName: ${userData.firstName} ${userData.lastName}\nEmail: ${userData.email}\nInstitution: ${institution}\nExplanation: ${explanation}\n\nPlease review the request in the super admin dashboard.`;
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
        <p>Please review the request in the super admin dashboard.</p>
      </div>
    `;
    return this.sendEmail({ to: adminEmail, subject, text, html });
  }
}

export const mailService = new MailService();
