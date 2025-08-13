import { Injectable } from '@nestjs/common';

@Injectable()
export class PaypalConfigChecker {
  checkConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    config: {
      api: string | undefined;
      clientId: string | undefined;
      clientSecret: string | undefined;
      clientUrl: string | undefined;
    };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const paypalApi = process.env.PAYPAL_API;
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const clientUrl = process.env.CLIENT_URL;

    if (!paypalApi) {
      errors.push('PAYPAL_API environment variable is not set');
    } else {
      try {
        const url = new URL(paypalApi);
        if (!url.protocol.startsWith('https')) {
          warnings.push('PAYPAL_API should use HTTPS protocol for security');
        }
        
        if (!url.hostname.includes('paypal.com')) {
          warnings.push('PAYPAL_API hostname does not appear to be a valid PayPal domain');
        }
      } catch (e) {
        errors.push(`PAYPAL_API is not a valid URL: ${paypalApi}`);
      }
    }

    if (!paypalClientId) {
      errors.push('PAYPAL_CLIENT_ID environment variable is not set');
    } else if (paypalClientId.length < 10) {
      warnings.push('PAYPAL_CLIENT_ID appears to be too short for a valid PayPal client ID');
    }

    if (!paypalClientSecret) {
      errors.push('PAYPAL_CLIENT_SECRET environment variable is not set');
    } else if (paypalClientSecret.length < 20) {
      warnings.push('PAYPAL_CLIENT_SECRET appears to be too short for a valid PayPal client secret');
    }

    if (!clientUrl) {
      warnings.push('CLIENT_URL environment variable is not set, will use default localhost:4200');
    }

    if (paypalApi?.includes('sandbox')) {
      console.log('🔧 PayPal Sandbox environment detected');
    } else if (paypalApi?.includes('live')) {
      console.log('🔧 PayPal Live environment detected');
      warnings.push('Using PayPal Live environment - ensure this is intentional for production');
    } else {
      warnings.push('PayPal environment type unclear - check if using sandbox or live');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config: {
        api: paypalApi,
        clientId: paypalClientId ? `${paypalClientId.substring(0, 8)}...` : undefined,
        clientSecret: paypalClientSecret ? `${paypalClientSecret.substring(0, 8)}...` : undefined,
        clientUrl,
      },
    };
  }

  logConfiguration(): void {
    const config = this.checkConfiguration();
    
    console.log('\n🔧 PayPal Configuration Check:');
    console.log('================================');
    
    if (config.isValid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration has errors:');
      config.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (config.warnings.length > 0) {
      console.log('⚠️  Configuration warnings:');
      config.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    console.log('\n📋 Current Configuration:');
    console.log(`   API: ${config.config.api || 'NOT SET'}`);
    console.log(`   Client ID: ${config.config.clientId || 'NOT SET'}`);
    console.log(`   Client Secret: ${config.config.clientSecret || 'NOT SET'}`);
    console.log(`   Client URL: ${config.config.clientUrl || 'NOT SET (will use default)'}`);
    console.log('================================\n');
  }
}
