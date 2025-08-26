import {
  RequestEntity,
  RequestStatus,
  TransactionEntity,
  TransactionStatus,
  TransactionType,
  UserEntity,
  WalletEntity
} from '#LocalProject/Entities';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from '../../mailer/mailer.service';
import { NotificationManagerService } from './notification-manager.service';
import { WalletManagerService } from './wallet-manager.service';

@Injectable()
export class AdminReviewService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationManagerService,
    private readonly walletService: WalletManagerService,
  ) {}

  async getPendingReviews() {
    const pendingReviews = await this.requestRepository.find({
      where: { status: 'DISPUTE' },
      relations: ['requester', 'assignee', 'files'],
      order: { reviewedAt: 'ASC' }
    });

    return pendingReviews.map(review => ({
      id: review.id.toString(),
      title: review.title,
      requesterName: review.requester.fullName || review.requester.username,
      translatorName: review.assignee?.fullName || review.assignee?.username,
      dealAmount: review.dealAmount,
      reviewedAt: review.reviewedAt,
      reviewRating: review.reviewRating,
      reviewComment: review.reviewComment,
      evidenceFilesCount: review.files?.length || 0
    }));
  }

  async getReviewDetails(requestId: bigint) {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'assignee', 'files', 'project']
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'DISPUTE') {
      throw new BadRequestException('Request is not pending admin review');
    }

    return {
      id: request.id.toString(),
      title: request.title,
      description: request.description,
      dealAmount: request.dealAmount,
      requester: {
        id: request.requester.id.toString(),
        name: request.requester.fullName || request.requester.username,
        email: request.requester.email
      },
      translator: request.assignee ? {
        id: request.assignee.id.toString(),
        name: request.assignee.fullName || request.assignee.username,
        email: request.assignee.email,
        rating: request.assignee.rating,
        reviewCount: request.assignee.reviewCount
      } : null,
      reviewData: {
        decision: request.reviewDecision,
        rating: request.reviewRating,
        comment: request.reviewComment,
        rejectionReason: request.rejectionReason, // Add rejection reason
        reviewedAt: request.reviewedAt
      },
      evidenceFiles: request.files?.map(file => ({
        id: file.id.toString(),
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        uploadDate: file.uploadDate
      })) || [],
      project: request.project ? {
        id: request.project.id.toString(),
        name: request.project.name,
        completionRate: request.project.completionRate
      } : null
    };
  }

  async submitAdminDecision(
    requestId: bigint,
    adminId: bigint,
    decision: 'APPROVE_TRANSLATOR' | 'APPROVE_REQUESTER',
    reason: string,
    adminNotes?: string
  ) {
    console.log('🔍 [ADMIN_REVIEW] submitAdminDecision called:', {
      requestId: requestId.toString(),
      adminId: adminId.toString(),
      decision,
      reason
    });

    try {
      console.log('🔍 [DEBUG] Fetching request details...');
      // 1. Get request with all relations
      const request = await this.requestRepository.findOne({
        where: { id: requestId },
        relations: ['requester', 'assignee', 'project']
      });

      if (!request) {
        console.error('❌ [DEBUG] Request not found for ID:', requestId.toString());
        throw new NotFoundException('Request not found');
      }

      console.log('✅ [DEBUG] Request found:', {
        requestId: request.id.toString(),
        title: request.title,
        status: request.status,
        dealAmount: request.dealAmount,
        requesterId: request.requester.id.toString(),
        translatorId: request.assignee?.id.toString() || 'N/A'
      });

      if (request.status !== 'DISPUTE') {
        console.error('❌ [DEBUG] Request status is not DISPUTE:', request.status);
        throw new BadRequestException('Request is not pending admin review');
      }

      // 2. Process admin decision
      console.log('🔄 [DEBUG] Processing admin decision:', decision);
      if (decision === 'APPROVE_TRANSLATOR') {
        console.log('✅ [DEBUG] Processing translator approval...');
        await this.processTranslatorApproval(request, adminId, reason, adminNotes);
      } else if (decision === 'APPROVE_REQUESTER') {
        console.log('✅ [DEBUG] Processing requester approval...');
        await this.processRequesterApproval(request, adminId, reason, adminNotes);
      } else {
        console.error('❌ [DEBUG] Invalid decision:', decision);
        throw new BadRequestException('Invalid decision');
      }

      // 3. Update request status based on decision
      console.log('📝 [DEBUG] Updating request status...');
      const oldStatus = request.status;
      if (decision === 'APPROVE_REQUESTER') {
        request.status = 'INCOMPLETED';
      } else {
        request.status = 'COMPLETED'; // Changed from ADMIN_REVIEWED to COMPLETED
      }
      request.adminReviewDecision = decision;
      request.adminReviewReason = reason;
      request.adminReviewNotes = adminNotes;
      request.adminReviewedAt = new Date();
      request.adminReviewedBy = adminId;

      console.log('🔄 [DEBUG] Status change:', {
        oldStatus,
        newStatus: request.status,
        decision
      });

      try {
        await this.requestRepository.save(request);
        console.log('✅ [DEBUG] Request status updated successfully');
      } catch (error) {
        console.error('❌ [DEBUG] Failed to update request status:', error);
        throw error;
      }

      console.log('✅ [ADMIN_REVIEW] Admin decision processed successfully:', {
        requestId: requestId.toString(),
        decision,
        status: request.status
      });

      return {
        success: true,
        message: `Admin decision: ${decision === 'APPROVE_TRANSLATOR' ? 'Translator approved - Request completed' : 'Requester approved - Request marked as incomplete'}`,
        requestId: requestId.toString(),
        decision,
        newStatus: request.status
      };

    } catch (error) {
      console.error('💥 [ADMIN_REVIEW] submitAdminDecision error:', error);
      throw error;
    }
  }

  private async processTranslatorApproval(
    request: RequestEntity,
    adminId: bigint,
    reason: string,
    adminNotes?: string
  ) {
    console.log('💰 [ADMIN_REVIEW] Processing translator approval - transferring 50% deposit');
    console.log('📊 [DEBUG] Request details:', {
      requestId: request.id.toString(),
      title: request.title,
      dealAmount: request.dealAmount,
      requesterId: request.requester.id.toString(),
      translatorId: request.assignee.id.toString()
    });

    // 1. Get requester's wallet
    console.log('🔍 [DEBUG] Looking for requester wallet...');
    const requesterWallet = await this.walletRepository.findOne({
      where: { user: { id: request.requester.id } }
    });

    if (!requesterWallet) {
      console.error('❌ [DEBUG] Requester wallet not found for user ID:', request.requester.id.toString());
      throw new BadRequestException('Requester wallet not found');
    }
    console.log('✅ [DEBUG] Requester wallet found:', {
      walletId: requesterWallet.id,
      balance: requesterWallet.balance
    });

    // 2. Get translator's wallet
    console.log('🔍 [DEBUG] Looking for translator wallet...');
    const translatorWallet = await this.walletRepository.findOne({
      where: { user: { id: request.assignee.id } }
    });

    if (!translatorWallet) {
      console.error('❌ [DEBUG] Translator wallet not found for user ID:', request.assignee.id.toString());
      throw new BadRequestException('Translator wallet not found');
    }
    console.log('✅ [DEBUG] Translator wallet found:', {
      walletId: translatorWallet.id,
      balance: translatorWallet.balance
    });

    // 3. Calculate 50% deposit amount
    const depositAmount = request.dealAmount * 0.5;
    console.log('💰 [DEBUG] Deposit calculation:', {
      dealAmount: request.dealAmount,
      depositAmount: depositAmount,
      percentage: '50%'
    });

    // 4. Transfer from requester to translator
    console.log('💸 [DEBUG] Starting fund transfer...');
    try {
      // Deduct from requester's wallet
      console.log('💰 [DEBUG] Deducting from requester wallet...');
      requesterWallet.balance = Number(requesterWallet.balance) - depositAmount;
      await this.walletRepository.save(requesterWallet);
      console.log('✅ [DEBUG] Requester wallet updated:', { newBalance: requesterWallet.balance });

      // Add to translator's wallet
      console.log('💰 [DEBUG] Adding to translator wallet...');
      translatorWallet.balance = Number(translatorWallet.balance) + depositAmount;
      await this.walletRepository.save(translatorWallet);
      console.log('✅ [DEBUG] Translator wallet updated:', { newBalance: translatorWallet.balance });

      console.log('✅ [DEBUG] Fund transfer completed successfully');
    } catch (error) {
      console.error('❌ [DEBUG] Fund transfer failed:', error);
      throw error;
    }

    // 5. Find and update ON_HOLD transaction for this request (requester's deposit)
    console.log('🔍 [DEBUG] Looking for ON_HOLD deposit transaction for requester...');
    const requesterDepositTransaction = await this.transactionRepository.findOne({
      where: {
        request: { id: request.id },
        user: { id: request.requester.id },
        status: TransactionStatus.ON_HOLD,
        type: TransactionType.PAYMENT
      }
    });

    if (requesterDepositTransaction) {
      console.log('✅ [DEBUG] Found ON_HOLD deposit transaction:', {
        transactionId: requesterDepositTransaction.id,
        amount: requesterDepositTransaction.amount,
        status: requesterDepositTransaction.status
      });

      // Update deposit transaction status to COMPLETED
      console.log('🔄 [DEBUG] Updating requester deposit transaction status to COMPLETED...');
      try {
        requesterDepositTransaction.status = TransactionStatus.COMPLETED;
        await this.transactionRepository.save(requesterDepositTransaction);
        console.log('✅ [DEBUG] Requester deposit transaction status updated to COMPLETED');
      } catch (error) {
        console.error('❌ [DEBUG] Failed to update requester deposit transaction status:', error);
        throw error;
      }
    } else {
      console.warn('⚠️ [DEBUG] No ON_HOLD deposit transaction found for requester in request ID:', request.id.toString());
    }

    // 6. Create transaction record with type PAYMENT (for translator)
    console.log('📝 [DEBUG] Creating PAYMENT transaction record for translator...');
    const transaction = this.transactionRepository.create({
      user: request.assignee, // Translator receives the payment
      request: request,
      amount: depositAmount,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED
    });

    try {
      await this.transactionRepository.save(transaction);
      console.log('✅ [DEBUG] PAYMENT transaction saved:', {
        transactionId: transaction.id,
        type: transaction.type,
        status: transaction.status,
        amount: transaction.amount
      });
    } catch (error) {
      console.error('❌ [DEBUG] Failed to save PAYMENT transaction:', error);
      throw error;
    }

    // 7. Send notifications
    await this.notificationService.createNotification({
      userId: request.assignee.id.toString(),
      type: 'ADMIN_REVIEW_APPROVED_TRANSLATOR',
      message: `Admin approved your translation for "${request.title}". You received ${depositAmount} USD.`,
      createdBy: adminId.toString(),
    });

    await this.notificationService.createNotification({
      userId: request.requester.id.toString(),
      type: 'ADMIN_REVIEW_APPROVED_TRANSLATOR',
      message: `Admin approved translator for "${request.title}". ${depositAmount} USD transferred to translator.`,
      createdBy: adminId.toString(),
    });

    // 8. Send emails
    console.log('📧 [DEBUG] Sending admin review notification emails...');
    if (request.assignee?.email) {
      try {
        await this.mailService.sendAdminReviewNotification(
          request.assignee.email,
          {
            translatorName: request.assignee.fullName || request.assignee.username,
            requestTitle: request.title,
            decision: 'APPROVED',
            amount: depositAmount,
            reason: reason,
            adminNotes: adminNotes
          }
        );
        console.log('✅ [DEBUG] Email sent to translator:', request.assignee.email);
      } catch (error) {
        console.error('❌ [DEBUG] Failed to send email to translator:', error);
      }
    }

    if (request.requester?.email) {
      try {
        await this.mailService.sendAdminReviewNotification(
          request.requester.email,
          {
            requesterName: request.requester.fullName || request.requester.username,
            requestTitle: request.title,
            decision: 'TRANSLATOR_APPROVED',
            amount: depositAmount,
            reason: reason,
            adminNotes: adminNotes
          }
        );
        console.log('✅ [DEBUG] Email sent to requester:', request.requester.email);
      } catch (error) {
        console.error('❌ [DEBUG] Failed to send email to requester:', error);
      }
    }

    console.log('✅ [ADMIN_REVIEW] Translator approval processed successfully');
  }

  private async processRequesterApproval(
    request: RequestEntity,
    adminId: bigint,
    reason: string,
    adminNotes?: string
  ) {
    console.log('💰 [ADMIN_REVIEW] Processing requester approval - refunding 50% deposit');
    console.log('📊 [DEBUG] Request details:', {
      requestId: request.id.toString(),
      title: request.title,
      dealAmount: request.dealAmount,
      requesterId: request.requester.id.toString()
    });

    // 1. Get requester's wallet
    console.log('🔍 [DEBUG] Looking for requester wallet...');
    const requesterWallet = await this.walletRepository.findOne({
      where: { user: { id: request.requester.id } }
    });

    if (!requesterWallet) {
      console.error('❌ [DEBUG] Requester wallet not found for user ID:', request.requester.id.toString());
      throw new BadRequestException('Requester wallet not found');
    }
    console.log('✅ [DEBUG] Requester wallet found:', {
      walletId: requesterWallet.id,
      balance: requesterWallet.balance
    });

    // 2. Calculate 50% deposit amount
    const depositAmount = request.dealAmount * 0.5;
    console.log('💰 [DEBUG] Deposit calculation:', {
      dealAmount: request.dealAmount,
      depositAmount: depositAmount,
      percentage: '50%'
    });

    // 3. Find the ON_HOLD deposit transaction for this request
    console.log('🔍 [DEBUG] Looking for ON_HOLD deposit transaction...');
    console.log('🔍 [DEBUG] Search criteria:', {
      requestId: request.id.toString(),
      status: 'ON_HOLD',
      type: 'DEPOSIT'
    });

    const depositTransaction = await this.transactionRepository.findOne({
      where: {
        request: { id: request.id },
        status: 'ON_HOLD',
        type: 'DEPOSIT'
      }
    });

    if (depositTransaction) {
      console.log('✅ [DEBUG] Found ON_HOLD deposit transaction:', {
        transactionId: depositTransaction.id,
        amount: depositTransaction.amount,
        status: depositTransaction.status
      });

      // 4. Update deposit transaction status to FAILED
      console.log('🔄 [DEBUG] Updating deposit transaction status to FAILED...');
      try {
        depositTransaction.status = 'FAILED';
        await this.transactionRepository.save(depositTransaction);
        console.log('✅ [DEBUG] Deposit transaction status updated to FAILED');
      } catch (error) {
        console.error('❌ [DEBUG] Failed to update deposit transaction status:', error);
        throw error;
      }
    } else {
      console.warn('⚠️ [DEBUG] No ON_HOLD deposit transaction found for request ID:', request.id.toString());

      // Debug: Check all transactions for this request
      console.log('🔍 [DEBUG] Checking all transactions for this request...');
      const allTransactions = await this.transactionRepository.find({
        where: { request: { id: request.id } },
        relations: ['user']
      });

      console.log('📊 [DEBUG] All transactions found:', allTransactions.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: t.amount,
        userId: t.user?.id
      })));
    }

    // 5. Add money back to requester's wallet balance
    console.log('💳 [DEBUG] Adding money back to requester wallet...');
    console.log('💰 [DEBUG] Wallet balance before:', requesterWallet.balance);
    const currentBalance = Number(requesterWallet.balance) || 0;
    const newBalance = currentBalance + depositAmount;
    requesterWallet.balance = newBalance;
    console.log('💰 [DEBUG] Wallet balance calculation:', {
      currentBalance,
      depositAmount,
      newBalance
    });

    try {
      await this.walletRepository.save(requesterWallet);
      console.log('✅ [DEBUG] Requester wallet balance updated successfully');
    } catch (error) {
      console.error('❌ [DEBUG] Failed to update requester wallet balance:', error);
      throw error;
    }

    // 6. Create new REFUND transaction record
    console.log('📝 [DEBUG] Creating REFUND transaction record...');
    const refundTransaction = this.transactionRepository.create({
      user: request.requester, // Requester receives the refund
      request: request,
      amount: depositAmount,
      type: 'REFUND',
      status: 'COMPLETED'
    });

    try {
      await this.transactionRepository.save(refundTransaction);
      console.log('✅ [DEBUG] REFUND transaction saved:', {
        transactionId: refundTransaction.id,
        type: refundTransaction.type,
        status: refundTransaction.status,
        amount: refundTransaction.amount
      });
    } catch (error) {
      console.error('❌ [DEBUG] Failed to save REFUND transaction:', error);
      throw error;
    }

    // 4. Send notifications
    await this.notificationService.createNotification({
      userId: request.requester.id.toString(),
      type: 'ADMIN_REVIEW_APPROVED_REQUESTER',
      message: `Admin approved your rejection for "${request.title}". You will receive a refund of ${depositAmount} USD.`,
      createdBy: adminId.toString(),
    });

    if (request.assignee) {
      await this.notificationService.createNotification({
        userId: request.assignee.id.toString(),
        type: 'ADMIN_REVIEW_APPROVED_REQUESTER',
        message: `Admin approved requester's rejection for "${request.title}". No payment will be made.`,
        createdBy: adminId.toString(),
      });
    }

    // 5. Send emails
    console.log('📧 [DEBUG] Sending admin review notification emails...');
    if (request.requester?.email) {
      try {
        await this.mailService.sendAdminReviewNotification(
          request.requester.email,
          {
            requesterName: request.requester.fullName || request.requester.username,
            requestTitle: request.title,
            decision: 'APPROVED',
            amount: depositAmount,
            reason: reason,
            adminNotes: adminNotes
          }
        );
        console.log('✅ [DEBUG] Email sent to requester:', request.requester.email);
      } catch (error) {
        console.error('❌ [DEBUG] Failed to send email to requester:', error);
      }
    }

    if (request.assignee?.email) {
      try {
        await this.mailService.sendAdminReviewNotification(
          request.assignee.email,
          {
            translatorName: request.assignee.fullName || request.assignee.username,
            requestTitle: request.title,
            decision: 'REQUESTER_APPROVED',
            amount: 0,
            reason: reason,
            adminNotes: adminNotes
          }
        );
        console.log('✅ [DEBUG] Email sent to translator:', request.assignee.email);
      } catch (error) {
        console.error('❌ [DEBUG] Failed to send email to translator:', error);
      }
    }

    console.log('✅ [ADMIN_REVIEW] Requester approval processed successfully');
  }
}
