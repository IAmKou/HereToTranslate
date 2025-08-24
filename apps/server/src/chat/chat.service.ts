import {
  ChatMessage,
  ChatMessageDocument,
} from '../db/mongo/schema/chat-message.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateMessageDto } from '#LocalProject/Dtos';
import { ChatRoom } from '../db/mongo/schema/chat-room.schema';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { UserManagerService } from '#LocalProject/Managers/service/user-manager.service';

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessage>,

    @InjectModel(ChatRoom.name)
    private chatRoomModel: Model<ChatRoom>,

    private readonly userService: UserManagerService
  ) {}

  async onModuleInit() {
    // Clean up duplicate rooms when service starts
    await this.cleanupDuplicateRooms();
  }

  async createMessage(data: CreateMessageDto & { fileUrl?: string; fileName?: string }): Promise<ChatMessageDocument> {
    const msg = new this.chatMessageModel({
      roomId: new Types.ObjectId(data.roomId),
      senderId: data.senderId,
      message: data.message,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      replyTo: data.replyToId ? new Types.ObjectId(data.replyToId) : null,
    });

    const savedMessage = await msg.save();

    // Update unread count for all participants except sender
    await this.updateUnreadCount(data.roomId, data.senderId);

    return savedMessage;
  }

  // Update unread message count for a chat room
  private async updateUnreadCount(roomId: string, senderId: number) {
    try {
      const room = await this.chatRoomModel.findById(roomId).lean();
      if (!room) return;

      // Increment unread count for all participants except sender
      const participantsToUpdate = room.participants.filter(id => id !== senderId);

      await this.chatRoomModel.updateMany(
        { _id: roomId },
        {
          $inc: {
            [`unreadCount.${senderId}`]: 0, // Reset sender's unread count
            ...Object.fromEntries(participantsToUpdate.map(id => [`unreadCount.${id}`, 1]))
          }
        }
      );
    } catch (error) {
      console.error('[chat] Failed to update unread count:', error);
    }
  }

  // Mark messages as read for a user in a specific room
  async markRoomAsRead(roomId: string, userId: number): Promise<void> {
    try {
      await this.chatRoomModel.updateOne(
        { _id: roomId },
        { $set: { [`unreadCount.${userId}`]: 0 } }
      );
    } catch (error) {
      console.error('[chat] Failed to mark room as read:', error);
    }
  }

  // Get unread message count for a specific user in a room
  async getUnreadCount(roomId: string, userId: number): Promise<number> {
    try {
      const room = await this.chatRoomModel.findById(roomId).lean();
      if (!room || !room.unreadCount) return 0;

      return room.unreadCount[userId] || 0;
    } catch (error) {
      console.error('[chat] Failed to get unread count:', error);
      return 0;
    }
  }

  // Get total unread count across all rooms for a user
  async getTotalUnreadCount(userId: number): Promise<number> {
    try {
      const rooms = await this.chatRoomModel.find({
        participants: userId,
        [`unreadCount.${userId}`]: { $gt: 0 }
      }).lean();

      return rooms.reduce((total, room) => {
        return total + (room.unreadCount?.[userId] || 0);
      }, 0);
    } catch (error) {
      console.error('[chat] Failed to get total unread count:', error);
      return 0;
    }
  }

  // Get unread counts for all chat rooms of a user
  async getUnreadCountsForUser(userId: number): Promise<Array<{ roomId: string; count: number; roomName: string }>> {
    try {
      const rooms = await this.chatRoomModel.find({
        participants: userId,
        [`unreadCount.${userId}`]: { $gt: 0 }
      }).lean();

      return rooms.map(room => ({
        roomId: room._id.toString(),
        count: room.unreadCount?.[userId] || 0,
        roomName: room.name || 'Chat'
      }));
    } catch (error) {
      console.error('[chat] Failed to get unread counts for user:', error);
      return [];
    }
  }
  async getMessages(roomId: Types.ObjectId): Promise<any[]> {
    const messages = await this.chatMessageModel
      .find({ roomId })
      .sort({ createdAt: 1 })
      .populate('replyTo', 'message senderId')
      .lean();

    const senderIds = [...new Set(messages.map((msg) => msg.senderId))];

    const users = await this.userService.findUsersByIds(senderIds);

    const userMap = new Map<number, string>();
    for (const user of users) {
      userMap.set(Number(user.id), user.username);
    }

    return messages.map((msg: any) => ({
      _id: msg._id.toString(),
      roomId: msg.roomId.toString(),
      senderId: msg.senderId,
      senderUsername: userMap.get(msg.senderId) || 'Unknown',
      message: msg.message,
      isEdited: msg.isEdited ?? false,
      fileUrl: msg.fileUrl || null,
      fileName: msg.fileName || null,
      createdAt: msg.createdAt
        ? new Date(msg.createdAt).toISOString()
        : null,
      replyTo: msg.replyTo ? {
        _id: msg.replyTo._id.toString(),
        message: msg.replyTo.message,
        senderId: msg.replyTo.senderId,
        senderUsername: userMap.get(msg.replyTo.senderId) || 'Unknown',
      } : null,
    }));
  }
  async renameRoom(id: string, name: string) {
    return this.chatRoomModel.findByIdAndUpdate(id, { name }, { new: true });
  }

  async createGroupRoom(name: string, creatorId: number, participants: number[]) {
    if (!participants.includes(creatorId)) participants.push(creatorId);

    const createdRoom = await this.chatRoomModel.create({
      name,
      participants,
      isGroupChat: true,
      createdBy: creatorId,
    });

    const room = await this.chatRoomModel.findById(createdRoom._id).lean();
    return room;
  }


  async deleteRoom(id: string) {
    return this.chatRoomModel.findByIdAndDelete(id);
  }

  async getChatRoomsForUser(userId: number) {
    const rooms = await this.chatRoomModel
      .find({ participants: userId })
      .lean()
      .exec();

    return await Promise.all(
      rooms.map(async (room) => {
        let oppositeUser = null;
        if (!room.isGroupChat) {
          const otherId = room.participants.find((id: number) => id !== userId);
          if (otherId != null) {
            oppositeUser = await this.userService.findUserById(otherId);
          }
        }

        return {
          _id: room._id.toString(),
          name: room.name,
          isGroupChat: room.isGroupChat,
          participants: room.participants,
          createdBy: room.createdBy,
          oppositeUser,
          unreadCount: room.unreadCount?.[userId] || 0,
        };
      }),
    );
  }

  async openChatBetween(
    userA: { id: number; username: string },
    userB: { id: number; username: string }
  ) {
    const [a, b] = [userA.id, userB.id].map(Number).sort((x, y) => x - y);
    const participantsKey = `${a}:${b}`;

    try {
      // Atomic upsert: find existing or create if missing
      const updated = await this.chatRoomModel.findOneAndUpdate(
        { participantsKey, isGroupChat: false },
        {
          $setOnInsert: {
            participants: [a, b],
            participantsKey,
            name: `${userB.username}`,
            isGroupChat: false,
            createdBy: userA.id,
          },
        },
        { new: true, upsert: true, lean: true }
      ).exec();

      if (!updated) {
        throw new BadRequestException('Chat room could not be created or fetched');
      }

      return {
        ...updated,
        _id: (updated as any)?._id?.toString?.() || (updated as any)?._id,
      };
    } catch (error: any) {
      // If duplicate key error, try to find existing room
      if (error.code === 11000 && error.message.includes('duplicate key')) {
        console.log('[chat] Duplicate key detected, trying to find existing room');
        const existing = await this.chatRoomModel.findOne({ participantsKey, isGroupChat: false }).lean().exec();
        if (existing) {
          return {
            ...existing,
            _id: (existing as any)?._id?.toString?.() || (existing as any)?._id,
          };
        }
      }
      throw error;
    }
  }

  // Clean up duplicate rooms and ensure participantsKey is set
  async cleanupDuplicateRooms() {
    try {
      // First, drop the old problematic index if it exists
      try {
        await this.chatRoomModel.collection.dropIndex('participants_1_isGroupChat_1');
        console.log('[chat] Dropped old participants index');
      } catch (e: any) {
        if (e.code !== 27) { // 27 = IndexNotFound
          console.log('[chat] Old index not found or already dropped');
        }
      }

      // Ensure the new participantsKey index exists
      try {
        await this.chatRoomModel.collection.createIndex(
          { participantsKey: 1 },
          {
            unique: true,
            partialFilterExpression: { isGroupChat: false },
            name: 'participantsKey_unique_dm'
          }
        );
        console.log('[chat] Created new participantsKey index');
      } catch (e: any) {
        if (e.code !== 85) { // 85 = IndexOptionsConflict
          console.log('[chat] New index already exists or failed to create');
        }
      }

      // Find rooms without participantsKey (old format)
      const roomsToFix = await this.chatRoomModel.find({
        participantsKey: { $exists: false },
        isGroupChat: false,
        participants: { $size: 2 }
      }).exec();

      for (const room of roomsToFix) {
        const [a, b] = room.participants.map(Number).sort((x, y) => x - y);
        const participantsKey = `${a}:${b}`;

        await this.chatRoomModel.updateOne(
          { _id: room._id },
          { $set: { participantsKey } }
        );
      }

      // Remove duplicate rooms (keep only one per participantsKey)
      const duplicates = await this.chatRoomModel.aggregate([
        { $match: { isGroupChat: false, participantsKey: { $exists: true } } },
        { $group: { _id: '$participantsKey', count: { $sum: 1 }, rooms: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
      ]);

      for (const dup of duplicates) {
        const [keep, ...remove] = dup.rooms;
        await this.chatRoomModel.deleteMany({ _id: { $in: remove } });
      }

      console.log(`[chat] Cleanup completed: fixed ${roomsToFix.length} rooms, removed ${duplicates.reduce((sum, d) => sum + d.count - 1, 0)} duplicates`);
    } catch (error) {
      console.error('[chat] Cleanup failed:', error);
    }
  }

  async editMessage(id: string, newContent: string) {
    const message = await this.chatMessageModel.findById(id);
    if (!message) throw new NotFoundException('Message not found');

    message.message = newContent;
    message.isEdited = true;
    await message.save();

    return {
      _id: message._id.toString(),
      roomId: message.roomId.toString(),
      senderId: message.senderId,
      message: message.message,
      isEdited: message.isEdited,
      createdAt: message.createdAt?.toISOString?.(),
    };
  }

  async deleteMessage(id: string) {
    const result = await this.chatMessageModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Message not found');
    }
    return { deleted: true, _id: id };
  }
  async findMessageById(messageId: string) {
    const doc = await this.chatMessageModel.findById(messageId).lean();
    if (!doc) return null;
    let senderUsername = 'Unknown';
    try {
      const users = await this.userService.findUsersByIds([doc.senderId]);
      if (users && users.length > 0) {
        senderUsername = users[0].username;
      }
    } catch (err) {
      console.error('⚠️ Failed to fetch username for replyTo:', err);
    }

    return {
      _id: doc._id,
      message: doc.message,
      senderId: doc.senderId,
      senderUsername,
    };
  }

  async addMemberToRoom(roomId: string, userId: number) {
    const room = await this.chatRoomModel.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');

    if (room.participants.includes(userId)) {
      throw new BadRequestException('Cannot invite invited user');
    }
    room.participants.push(userId);
    if (!room.isGroupChat && room.participants.length > 2) {
      room.isGroupChat = true;
    }

    await room.save();
    return room.toObject();
  }

  async removeMemberFromRoom(roomId: string, creatorId: number, userId: number) {
    const room = await this.chatRoomModel.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');

    if (room.createdBy !== creatorId) {
      throw new BadRequestException('Only the room creator can remove members.');
    }

    if (userId === creatorId) {
      throw new BadRequestException('Creator cannot be removed.');
    }

    room.participants = room.participants.filter((id: number) => id !== userId);
    await room.save();
    return { success: true, removedUserId: userId };
  }


  async getParticipants(roomId: string) {
    const room = await this.chatRoomModel.findById(roomId).lean();
    if (!room) throw new NotFoundException('Room not found');

    const users = await this.userService.findUsersByIds(room.participants);

    return {
      createdBy: room.createdBy,
      participants: users.map(u => ({
        id: Number(u.id),
        username: u.username,
        email: u.email,
        phone: u.phone,
      })),
    };
  }
}
