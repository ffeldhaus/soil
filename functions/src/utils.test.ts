import { expect } from 'chai';
import { escapeHtml, generateRandomPassword } from './utils';

describe('Utils', () => {
  describe('generateRandomPassword', () => {
    it('should generate a password of the default length (6)', () => {
      const password = generateRandomPassword();
      expect(password).to.have.lengthOf(6);
    });

    it('should generate a password of the specified length', () => {
      const password = generateRandomPassword(10);
      expect(password).to.have.lengthOf(10);
    });

    it('should only contain characters from the defined charset', () => {
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const password = generateRandomPassword(100);
      for (const char of password) {
        expect(charset).to.contain(char);
      }
    });

    it('should not contain ambiguous characters (I, 1, O, 0)', () => {
      const ambiguous = ['I', '1', 'O', '0'];
      const password = generateRandomPassword(1000);
      for (const char of password) {
        expect(ambiguous).to.not.contain(char);
      }
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss" & \'test\')</script>')).to.equal(
        '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;',
      );
    });
  });
});
