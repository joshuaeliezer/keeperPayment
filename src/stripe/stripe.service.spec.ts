describe('StripeService', () => {
  describe('class definition', () => {
    it('should be a class', () => {
      // Test simple que la classe existe sans l'instancier
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      expect(typeof require('./stripe.service').StripeService).toBe('function');
    });

    it('should have expected method names', () => {
      // Test que les méthodes sont définies dans la classe
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const StripeService = require('./stripe.service').StripeService;
      const methodNames = [
        'createPaymentIntent',
        'createKeeperAccount',
        'createAccountLink',
        'constructEvent',
        'findAccountByEmail',
        'retrieveAccount',
        'setStripeInstance',
      ];

      // Vérifier que les méthodes sont définies dans le prototype
      methodNames.forEach((methodName) => {
        expect(typeof StripeService.prototype[methodName]).toBe('function');
      });
    });
  });
});
