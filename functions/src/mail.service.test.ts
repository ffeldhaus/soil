import { expect } from 'chai';
import * as nodemailer from 'nodemailer';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { MailService } from './mail.service';

vi.mock('nodemailer');

describe('MailService', () => {
  let mailService: MailService;
  let transporterMock: any;

  beforeEach(() => {
    mailService = new MailService();

    transporterMock = {
      sendMail: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(nodemailer.createTransport).mockReturnValue(transporterMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.GMAIL_SERVICE_ACCOUNT_EMAIL = undefined;
    process.env.GMAIL_IMPERSONATED_USER = undefined;
  });

  it('should not send email if not configured', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mailService.sendEmail({ to: 'test@example.com', subject: 'Test', text: 'Test' });
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(transporterMock.sendMail).not.toHaveBeenCalled();
  });

  it('should attempt to get access token if configured', async () => {
    process.env.GMAIL_SERVICE_ACCOUNT_EMAIL = 'service@example.com';
    process.env.GMAIL_IMPERSONATED_USER = 'user@example.com';

    // We mock getAccessToken as it involves complex Google Auth
    const getAccessTokenSpy = vi.spyOn(mailService as any, 'getAccessToken').mockResolvedValue('fake-token');

    await mailService.sendEmail({ to: 'test@example.com', subject: 'Test', text: 'Test' });

    expect(getAccessTokenSpy).toHaveBeenCalledOnce();
    expect(transporterMock.sendMail).toHaveBeenCalledOnce();
  });

  describe('Template Methods', () => {
    let sendEmailSpy: any;

    beforeEach(() => {
      sendEmailSpy = vi.spyOn(mailService, 'sendEmail').mockResolvedValue(undefined as any);
    });

    it('sendPlayerLoginInfo should use German template', async () => {
      await mailService.sendPlayerLoginInfo('test@example.com', 'http://link');
      const args = sendEmailSpy.mock.calls[0][0];
      expect(args.subject).to.equal('Dein Login-Link für SOIL');
      expect(args.text).to.contain('Willkommen bei SOIL!');
    });

    it('sendGameInvite should include game info in German', async () => {
      await mailService.sendGameInvite('test@example.com', 'My Game', 'ID123');
      const args = sendEmailSpy.mock.calls[0][0];
      expect(args.subject).to.contain('My Game');
      expect(args.text).to.contain('Spiel: My Game');
      expect(args.text).to.contain('Spiel-ID: ID123');
    });
  });
});
