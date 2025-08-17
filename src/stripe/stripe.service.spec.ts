import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';

describe('StripeService', () => {
  describe('class definition', () => {
    it('should be a class', () => {
      // Test simple que la classe existe sans l'instancier
      expect(typeof require('./stripe.service').StripeService).toBe('function');
    });

    it('should have expected method names', () => {
      // Test que les méthodes sont définies dans la classe
      const StripeService = require('./stripe.service').StripeService;
      const methodNames = [
        'createPaymentIntent',
        'createKeeperAccount', 
        'createAccountLink',
        'constructEvent',
        'findAccountByEmail',
        'retrieveAccount',
        'setStripeInstance'
      ];
      
      // Vérifier que les méthodes sont définies dans le prototype
      methodNames.forEach(methodName => {
        expect(typeof StripeService.prototype[methodName]).toBe('function');
      });
    });
  });
});
