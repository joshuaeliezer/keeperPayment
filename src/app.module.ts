import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentsModule } from './payments/payments.module';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV');

        if (databaseUrl) {
          // Configuration pour Render avec DATABASE_URL
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: nodeEnv !== 'production',
            ssl: {
              rejectUnauthorized: false,
            },
            retryAttempts: 10,
            retryDelay: 3000,
            keepConnectionAlive: true,
          } as any;
        }

        // Configuration de fallback pour le développement local
        return {
          type: 'postgres',
          host: configService.get('DB_HOST') || 'localhost',
          port: parseInt(configService.get('DB_PORT') || '5432', 10),
          username: configService.get('DB_USERNAME') || 'postgres',
          password: configService.get('DB_PASSWORD') || 'postgres',
          database: configService.get('DB_DATABASE') || 'postgres',
          autoLoadEntities: true,
          synchronize: nodeEnv !== 'production',
          retryAttempts: 10,
          retryDelay: 3000,
          keepConnectionAlive: true,
        } as any;
      },
      inject: [ConfigService],
    }),
    PaymentsModule,
    StripeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
