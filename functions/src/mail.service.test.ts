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

    it('sendPlayerLoginInfo should use German template', async () => {
      await mailService.sendPlayerLoginInfo('test@example.com', 'http://link');
      const args = sendEmailStub.firstCall.args[0];
      expect(args.subject).to.equal('Dein Login-Link für Soil');
      expect(args.text).to.contain('Willkommen bei Soil!');
    });

    it('sendGameInvite should include game info in German', async () => {
      await mailService.sendGameInvite('test@example.com', 'My Game', 'ID123');
      const args = sendEmailStub.firstCall.args[0];
      expect(args.subject).to.contain('My Game');
      expect(args.text).to.contain('Spiel: My Game');
      expect(args.text).to.contain('Spiel-ID: ID123');
    });
  });
});
