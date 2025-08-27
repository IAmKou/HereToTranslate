import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as Handlebars from 'handlebars';

export class CustomHandlebarsAdapter extends HandlebarsAdapter {
  constructor() {
    super(undefined, {
      inlineCssEnabled: true,
      precompile: (template: string, options: any) => {
        return Handlebars.precompile(template, options);
      },
    });

    // Register custom helpers
    Handlebars.registerHelper('formatDate', function(date: Date | string | null) {
      if (!date) return 'Not set';

      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid date';

        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        return 'Invalid date';
      }
    });

    Handlebars.registerHelper('formatDateTime', function(date: Date | string | null) {
      if (!date) return 'Not set';

      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid date';

        return dateObj.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return 'Invalid date';
      }
    });

    Handlebars.registerHelper('formatCurrency', function(amount: number) {
      if (typeof amount !== 'number') return '$0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    });

    Handlebars.registerHelper('formatPercentage', function(value: number) {
      if (typeof value !== 'number') return '0%';
      return `${Math.round(value)}%`;
    });

    Handlebars.registerHelper('addDays', function(date: Date | string, days: number) {
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid date';

        const newDate = new Date(dateObj);
        newDate.setDate(newDate.getDate() + days);
        
        return newDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        return 'Invalid date';
      }
    });

    Handlebars.registerHelper('eq', function(a: any, b: any) {
      return a === b;
    });

    Handlebars.registerHelper('gt', function(a: number, b: number) {
      return a > b;
    });

    Handlebars.registerHelper('lt', function(a: number, b: number) {
      return a < b;
    });

    Handlebars.registerHelper('gte', function(a: number, b: number) {
      return a >= b;
    });

    Handlebars.registerHelper('lte', function(a: number, b: number) {
      return a <= b;
    });
  }
}
