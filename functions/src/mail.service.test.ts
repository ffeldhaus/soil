import { expect } from 'chai';
import * as nodemailer from 'nodemailer';
import * as sinon from 'sinon';
import { MailService } from './mail.service';

describe('MailService', () => {
  let mailService: MailService;
  let sandbox: sinon.SinonSandbox;
  let transporterMock: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mailService = new MailService();

    transporterMock = {
      sendMail: sandbox.stub().resolves({}),
    };
    sandbox.stub(nodemailer, 'createTransport').returns(transporterMock);
  });

  afterEach(() => {
    sandbox.restore();
    process.env.GMAIL_SERVICE_ACCOUNT_EMAIL = undefined;
    process.env.GMAIL_IMPERSONATED_USER = undefined;
  });

  it('should not send email if not configured', async () => {
    const warnStub = sandbox.stub(console, 'warn');
    await mailService.sendEmail({ to: 'test@example.com', subject: 'Test', text: 'Test' });
    expect(warnStub.calledOnce).to.be.true;
    expect(transporterMock.sendMail.called).to.be.false;
  });

  it('should attempt to get access token if configured', async () => {
    process.env.GMAIL_SERVICE_ACCOUNT_EMAIL = 'service@example.com';
    process.env.GMAIL_IMPERSONATED_USER = 'user@example.com';

    // We mock getAccessToken as it involves complex Google Auth
    const getAccessTokenStub = sandbox.stub(mailService as any, 'getAccessToken').resolves('fake-token');

    await mailService.sendEmail({ to: 'test@example.com', subject: 'Test', text: 'Test' });

    expect(getAccessTokenStub.calledOnce).to.be.true;
    expect(transporterMock.sendMail.calledOnce).to.be.true;
  });

  describe('Template Methods', () => {
    let sendEmailStub: sinon.SinonStub;

    beforeEach(() => {
      sendEmailStub = sandbox.stub(mailService, 'sendEmail').resolves();
    });

    it('sendPlayerLoginInfo should use correct language (en)', async () => {
      await mailService.sendPlayerLoginInfo('test@example.com', 'http://link', 'en');
      const args = sendEmailStub.firstCall.args[0];
      expect(args.subject).to.equal('Your Login Link to Soil');
      expect(args.text).to.contain('Welcome to Soil!');
    });

    it('sendPlayerLoginInfo should use correct language (de)', async () => {
      await mailService.sendPlayerLoginInfo('test@example.com', 'http://link', 'de');
      const args = sendEmailStub.firstCall.args[0];
      expect(args.subject).to.equal('Dein Login-Link für Soil');
      expect(args.text).to.contain('Willkommen bei Soil!');
    });

    it('sendAdminRegistrationApproved should use correct language (de)', async () => {
      await mailService.sendAdminRegistrationApproved('test@example.com', 'http://link', 'de');
      const args = sendEmailStub.firstCall.args[0];
      expect(args.subject).to.equal('Soil-Registrierung bestätigt');
      expect(args.text).to.contain('Glückwunsch!');
    });

    it('sendAdminRegistrationRejected should include reasons (en)', async () => {
      await mailService.sendAdminRegistrationRejected(
        'test@example.com',
        ['institution_not_verified'],
        'Custom Msg',
        'en',
      );
      const args = sendEmailStub.firstCall.args[0];
      expect(args.text).to.contain('The educational institution could not be verified.');
      expect(args.text).to.contain('Additional information: Custom Msg');
    });

    it('sendGameInvite should include game info', async () => {
      await mailService.sendGameInvite('test@example.com', 'My Game', 'ID123', 'en');
      const args = sendEmailStub.firstCall.args[0];
      expect(args.subject).to.contain('My Game');
      expect(args.text).to.contain('Game: My Game');
      expect(args.text).to.contain('Game ID: ID123');
    });
  });
});
