import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  // Helper function to format dates for email templates
  private formatDate(date: Date | string | null): string {
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
  }

  async sendPrivateRequestConfirmation(to: string, requestData: { title: string; deadline: Date; username : string }) {
    await this.mailerService.sendMail({
      to,
      subject: 'Private Request Confirmation',
      template: './private-request-confirmation',
      context: {
        title: requestData.title,
        deadline: requestData.deadline.toDateString(),
        username: requestData.username,
      },
    });
  }

  async notifyRequesterOfRegistration(to: string, username : string){
    await this.mailerService.sendMail({
      to,
      subject: 'Registration',
      template: './register-request',
      context: {
        username,
      }
    })
  }

  async notifyAllOthersRequestTaken(requestId: number, userIds: number[]) {
    // TODO: Implement actual mail notification logic for all other registrants
    return;
  }

  async sendProjectInvitation(
    to: string,
    invitationData: {
      projectName: string;
      invitedByUsername: string;
      message?: string;
      projectId: string;
      expiresIn?: number;
    }
  ) {
    console.log('📧 MailService.sendProjectInvitation called with:', {
      to,
      invitationData
    });

    try {
      await this.mailerService.sendMail({
        to,
        subject: `You're invited to join project: ${invitationData.projectName}`,
        template: './project-invitation',
        context: {
          projectName: invitationData.projectName,
          invitedByUsername: invitationData.invitedByUsername,
          message: invitationData.message || `You're invited to join the project ${invitationData.projectName}.`,
          projectId: invitationData.projectId,
          expiresIn: invitationData.expiresIn,
        },
      });
      console.log('📧 MailService.sendProjectInvitation completed successfully');
    } catch (error) {
      console.error('📧 MailService.sendProjectInvitation error:', error);
      throw error;
    }
  }

  async sendTaskAssignmentNotification(
    to: string,
    assignmentData: {
      taskTitle: string;
      role: string;
      reason: string;
      notes?: string;
      projectName: string;
    }
  ) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `Task Assignment: ${assignmentData.taskTitle}`,
        template: './task-assignment',
        context: {
          taskTitle: assignmentData.taskTitle,
          role: assignmentData.role,
          reason: assignmentData.reason,
          notes: assignmentData.notes || '',
          projectName: assignmentData.projectName,
        },
      });
      console.log('📧 Task assignment email sent successfully to:', to);
    } catch (error) {
      console.error('📧 Failed to send task assignment email:', error);
      throw error;
    }
  }

  async sendExtensionRequestNotification(
    requesterEmail: string,
    data: {
      requesterName: string;
      translatorName: string;
      translatorEmail: string;
      requestTitle: string;
      currentDeadline: Date | string;
      newDeadline: Date | string;
      reason: string;
      requestId: bigint;
    }
  ) {
    const subject = `Deadline Extension Request - ${data.requestTitle}`;

    // Ensure dates are Date objects
    const currentDeadline = new Date(data.currentDeadline);
    const newDeadline = new Date(data.newDeadline);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Deadline Extension Request
        </h2>

        <p>Hello <strong>${data.requesterName}</strong>,</p>

        <p>The translator assigned to your request has requested a deadline extension.</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">Request Details</h3>
          <p><strong>Request Title:</strong> ${data.requestTitle}</p>
          <p><strong>Translator:</strong> ${data.translatorName} (${data.translatorEmail})</p>
          <p><strong>Current Deadline:</strong> ${currentDeadline.toLocaleDateString()}</p>
          <p><strong>Requested New Deadline:</strong> ${newDeadline.toLocaleDateString()}</p>
          <p><strong>Reason:</strong> ${data.reason}</p>
        </div>

        <p>Please log in to your account to review and respond to this extension request.</p>

        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, please contact our support team.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated notification from HereToTranslate.
        </p>
      </div>
    `;

    try {
      await this.mailerService.sendMail({
        to: requesterEmail,
        subject: subject,
        html: htmlContent,
      });
      console.log(`Extension request notification sent to ${requesterEmail}`);
    } catch (error) {
      console.error(`Failed to send extension request notification to ${requesterEmail}:`, error);
    }
  }

  async sendExtensionApprovalNotification(
    translatorEmail: string,
    data: {
      translatorName: string;
      requestTitle: string;
      currentDeadline: Date;
      newDeadline: Date;
    }
  ) {
    const subject = `Extension Request Approved - ${data.requestTitle}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Extension Request Approved ✅
        </h2>

        <p>Hello <strong>${data.translatorName}</strong>,</p>

        <p>Great news! Your deadline extension request has been approved by the requester.</p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #166534;">Request Details</h3>
          <p><strong>Request Title:</strong> ${data.requestTitle}</p>
          <p><strong>Previous Deadline:</strong> ${data.currentDeadline.toLocaleDateString()}</p>
          <p><strong>New Approved Deadline:</strong> ${data.newDeadline.toLocaleDateString()}</p>
        </div>

        <p>Your request deadline has been updated. Please make sure to complete the translation by the new deadline.</p>

        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, please contact our support team.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated notification from HereToTranslate.
        </p>
      </div>
    `;

    try {
      await this.mailerService.sendMail({
        to: translatorEmail,
        subject: subject,
        html: htmlContent,
      });
      console.log(`Extension approval notification sent to ${translatorEmail}`);
    } catch (error) {
      console.error(`Failed to send extension approval notification to ${translatorEmail}:`, error);
    }
  }

  async sendExtensionRejectionNotification(
    translatorEmail: string,
    data: {
      translatorName: string;
      requestTitle: string;
      currentDeadline: Date;
      reason: string;
    }
  ) {
    const subject = `Extension Request Rejected - ${data.requestTitle}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Extension Request Rejected ❌
        </h2>

        <p>Hello <strong>${data.translatorName}</strong>,</p>

        <p>Unfortunately, your deadline extension request has been rejected by the requester.</p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #991b1b;">Request Details</h3>
          <p><strong>Request Title:</strong> ${data.requestTitle}</p>
          <p><strong>Current Deadline:</strong> ${data.currentDeadline.toLocaleDateString()}</p>
          <p><strong>Extension Reason:</strong> ${data.reason}</p>
        </div>

        <p>The original deadline remains unchanged. Please ensure you complete the translation by the current deadline.</p>

        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions or concerns, please contact our support team.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated notification from HereToTranslate.
        </p>
      </div>
    `;

    try {
      await this.mailerService.sendMail({
        to: translatorEmail,
        subject: subject,
        html: htmlContent,
      });
      console.log(`Extension rejection notification sent to ${translatorEmail}`);
    } catch (error) {
      console.error(`Failed to send extension rejection notification to ${translatorEmail}:`, error);
    }
  }

  async sendReviewNotification(
    translatorEmail: string,
    data: {
      translatorName: string;
      requesterName: string;
      requestTitle: string;
      decision: 'APPROVED' | 'REJECTED';
      rating: number;
      comment?: string;
      requestId: string;
    }
  ) {
    const subject = `Translation Review - ${data.requestTitle}`;

    // Calculate fields needed for template
    const isApproved = data.decision === 'APPROVED';
    const ratingStars = Array(data.rating).fill('⭐');
    const emptyStars = Array(5 - data.rating).fill('☆');

    try {
      await this.mailerService.sendMail({
        to: translatorEmail,
        subject: subject,
        template: './review-notification',
        context: {
          translatorName: data.translatorName,
          requesterName: data.requesterName,
          requestTitle: data.requestTitle,
          decision: data.decision,
          rating: data.rating,
          comment: data.comment,
          requestId: data.requestId,
          baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
          // Add calculated fields for template
          isApproved: isApproved,
          ratingStars: ratingStars,
          emptyStars: emptyStars
        },
      });
      console.log(`Review notification sent to ${translatorEmail}`);
    } catch (error) {
      console.error(`Failed to send review notification to ${translatorEmail}:`, error);
    }
  }

  async sendAdminReviewNotification(
    to: string,
    data: {
      translatorName?: string;
      requesterName?: string;
      requestTitle: string;
      decision: string;
      amount: number;
      reason: string;
      adminNotes?: string;
    }
  ) {
    const subject = `Admin Review Decision - ${data.requestTitle}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Admin Review Decision 📋
        </h2>

        <p>Hello <strong>${data.translatorName || data.requesterName}</strong>,</p>

        <p>An admin has reviewed your translation request and made a decision.</p>

        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0369a1;">Request Details</h3>
          <p><strong>Request Title:</strong> ${data.requestTitle}</p>
          <p><strong>Admin Decision:</strong> ${data.decision}</p>
          <p><strong>Amount:</strong> $${data.amount}</p>
          <p><strong>Reason:</strong> ${data.reason}</p>
          ${data.adminNotes ? `<p><strong>Admin Notes:</strong> ${data.adminNotes}</p>` : ''}
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions about this decision, please contact our support team.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated notification from HereToTranslate.
        </p>
      </div>
    `;

    try {
      await this.mailerService.sendMail({
        to: to,
        subject: subject,
        html: htmlContent,
      });
      console.log(`Admin review notification sent to ${to}`);
    } catch (error) {
      console.error(`Failed to send admin review notification to ${to}:`, error);
    }
  }
}
