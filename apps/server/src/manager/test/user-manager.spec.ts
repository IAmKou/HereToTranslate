import { UserManagerService } from '../service/user-manager.service';
import { Repository } from 'typeorm';
import { UserEntity, UserRole, UserTypeEntity } from '#LocalProject/Entities';
import { RegisterDto, UpdateUserPasswordDto, UpdateUserProfileDto } from '#LocalProject/Dtos';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { validateEmail } from '#LocalProject/Utils/validation';
import { In } from 'typeorm';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock validateEmail utility
jest.mock('#LocalProject/Utils/validation');
const mockedValidateEmail = validateEmail as jest.MockedFunction<typeof validateEmail>;

describe('UserManagerService', () => {
  let service: UserManagerService;
  let mockUserRepository: jest.Mocked<Repository<UserEntity>>;
  let mockRoleRepository: jest.Mocked<Repository<UserTypeEntity>>;

  const mockUser: any = {
    id: 1n,
    username: 'testuser',
    email: 'test@example.com',
    phone: '+1234567890',
    fullName: 'Test User',
    passwordHash: 'hashed-password',
    isActive: true,
    avatarUrl: 'https://example.com/avatar.jpg',
    role: { id: '3', name: 'Member' }, // Member role
    createdAt: new Date(),
  };

  const mockRole: any = {
    id: '3', // Member role
    name: 'Member',
  };

  const mockAdminRole: any = {
    id: '2', // Admin role
    name: 'Admin',
  };

  beforeEach(() => {
    // Create mocks for repositories
    mockUserRepository = {
      exists: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockRoleRepository = {
      findOneBy: jest.fn(),
    } as any;

    // Create service instance
    service = new UserManagerService(
      mockUserRepository,
      mockRoleRepository
    );

    // Reset mocks
    jest.clearAllMocks();

    // Default bcrypt mock
    mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
    mockedBcrypt.compare.mockResolvedValue(true as never);

    // Default validateEmail mock
    mockedValidateEmail.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      phone: '+1234567890',
      fullName: 'New User',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      // Mock repository responses
      mockUserRepository.exists.mockResolvedValue(false);
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({ message: 'Registration successful' });
      expect(mockUserRepository.exists).toHaveBeenCalledWith({
        where: { username: 'newuser' },
      });
      expect(mockUserRepository.exists).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '+1234567890' },
      });
      expect(mockedValidateEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...registerDto,
        passwordHash: 'hashed-password',
        role: { id: BigInt(UserRole.Member) }, // UserRole.Member = 3
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ConflictException if username already exists', async () => {
      mockUserRepository.exists.mockResolvedValue(true);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Username already exists')
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.exists
        .mockResolvedValueOnce(false) // username check
        .mockResolvedValueOnce(true); // email check

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Email already exists')
      );
    });

    it('should throw ConflictException if phone already exists', async () => {
      mockUserRepository.exists.mockResolvedValue(false);
      mockUserRepository.findOne.mockResolvedValue(mockUser); // existing phone

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Phone number already exists')
      );
    });

    it('should throw BadRequestException if email domain is invalid', async () => {
      mockUserRepository.exists.mockResolvedValue(false);
      mockUserRepository.findOne.mockResolvedValue(null);
      mockedValidateEmail.mockResolvedValue(false);

      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException('Invalid email domain')
      );
    });
  });

  describe('updateProfile', () => {
    const updateData: UpdateUserProfileDto = {
      fullName: 'Updated Name',
      phone: '+0987654321',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // first call for user lookup
        .mockResolvedValueOnce(null); // second call for phone uniqueness check
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1n, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '+0987654321' },
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile(1n, updateData)).rejects.toThrow(
        new NotFoundException('Unknown user')
      );
    });

    it('should throw BadRequestException if phone number already in use', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      try {
        await service.updateProfile(1n, updateData);
        throw new Error('Expected BadRequestException to be thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Phone number already in use');
      }
    });

    it('should not check phone uniqueness if phone is not being updated', async () => {
      const updateDataWithoutPhone = { fullName: 'Updated Name' };
      const updatedUser = { ...mockUser, fullName: 'Updated Name' };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      await service.updateProfile(1n, updateDataWithoutPhone);

      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
      });
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile with relations', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserProfile(1n);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['role'],
        select: [
          'id',
          'username',
          'email',
          'phone',
          'fullName',
          'role',
          'createdProjects',
          'avatarUrl',
        ],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserProfile(1n)).rejects.toThrow(
        new NotFoundException('Unknown user')
      );
    });
  });

  describe('findUsersByIds', () => {
    it('should return users by IDs', async () => {
      const users = [mockUser];
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.findUsersByIds([1, 2, 3]);

      expect(result).toEqual(users);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { id: In([1, 2, 3]) },
        select: ['id', 'username', 'email', 'phone'],
      });
    });

    it('should return empty array if no users found', async () => {
      mockUserRepository.find.mockResolvedValue([]);

      const result = await service.findUsersByIds([1, 2, 3]);

      expect(result).toEqual([]);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.remove.mockResolvedValue(mockUser);

      const result = await service.deleteUser(1n);

      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
      });
      expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteUser(1n)).rejects.toThrow(
        new BadRequestException('Unknown user')
      );
    });
  });

  describe('changePassword', () => {
    const passwordData: UpdateUserPasswordDto = {
      currentPassword: 'oldpassword',
      newPassword: 'newpassword',
    };

    it('should change password successfully', async () => {
      const updatedUser = { ...mockUser, passwordHash: 'new-hashed-password' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('new-hashed-password' as never);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.changePassword(1n, passwordData);

      expect(result).toEqual(updatedUser);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('oldpassword', 'hashed-password');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.changePassword(1n, passwordData)).rejects.toThrow(
        new NotFoundException('Unknown user')
      );
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.changePassword(1n, passwordData)).rejects.toThrow(
        new BadRequestException('Current password is incorrect')
      );
    });
  });

  describe('getAllUsers', () => {
    it('should return all users with role relations', async () => {
      const users = [mockUser];
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.getAllUsers();

      expect(result).toEqual(users);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        relations: ['role'],
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          avatarUrl: true,
          role: {
            id: true,
            name: true,
          },
        },
      });
    });
  });

  describe('updateUserRole', () => {
    const currentUser = {
      user: { id: 2n, role: UserRole.Admin },
    } as any;

    const superAdminUser = {
      user: { id: 3n, role: UserRole.SuperAdmin },
    } as any;

    it('should update user role successfully when assigning member role', async () => {
      const userWithRole = { ...mockUser, role: mockRole };
      const updatedUser = { ...mockUser, role: mockRole };

      mockUserRepository.findOne.mockResolvedValue(userWithRole);
      mockRoleRepository.findOneBy.mockResolvedValue(mockRole);
      mockUserRepository.save.mockResolvedValue(updatedUser);
      mockUserRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole(1n, 3, currentUser);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.save).toHaveBeenCalledWith(updatedUser);
    });

    it('should update user role to admin when current user is super admin', async () => {
      const userWithRole = { ...mockUser, role: mockRole };
      const updatedUser = { ...mockUser, role: mockAdminRole };

      mockUserRepository.findOne.mockResolvedValue(userWithRole);
      mockRoleRepository.findOneBy.mockResolvedValue(mockAdminRole);
      mockUserRepository.save.mockResolvedValue(updatedUser);
      mockUserRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole(1n, 2, superAdminUser); // Super admin assigning admin role

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.save).toHaveBeenCalledWith(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUserRole(1n, 2, currentUser)).rejects.toThrow(
        new NotFoundException('Unknown user')
      );
    });

    it('should throw BadRequestException if trying to change own role', async () => {
      const currentUserOwnRole = {
        user: { id: 1n, role: UserRole.Admin },
      } as any;

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.updateUserRole(1n, 2, currentUserOwnRole)).rejects.toThrow(
        new BadRequestException('You cannot change your own role')
      );
    });

    it('should throw BadRequestException if non-super-admin tries to assign admin role', async () => {
      const nonSuperAdmin = {
        user: { id: 2n, role: UserRole.Member }, // Member role (3), not SuperAdmin (1)
      } as any;

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.updateUserRole(1n, UserRole.Admin, nonSuperAdmin)).rejects.toThrow(
        new BadRequestException('Only super admins can assign admin roles')
      );
    });

    it('should throw BadRequestException if non-super-admin tries to modify admin role', async () => {
      const adminUser = { ...mockUser, role: mockAdminRole }; // This user has Admin role (2)
      const nonSuperAdmin = {
        user: { id: 2n, role: UserRole.Member }, // Member role (3), not SuperAdmin (1)
      } as any;

      mockUserRepository.findOne.mockResolvedValue(adminUser);

      await expect(service.updateUserRole(1n, 1, nonSuperAdmin)).rejects.toThrow(
        new BadRequestException('Only super admins can modify admin roles')
      );
    });

    it('should throw BadRequestException if trying to assign super admin role', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.updateUserRole(1n, UserRole.SuperAdmin, currentUser)).rejects.toThrow(
        new BadRequestException('Super admin role cannot be assigned')
      );
    });

    it('should throw NotFoundException if role not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRoleRepository.findOneBy.mockResolvedValue(null);

      await expect(service.updateUserRole(1n, 999, currentUser)).rejects.toThrow(
        new NotFoundException('Role not found')
      );
    });
  });

  describe('searchByEmailOrUsername', () => {
    it('should find user by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.searchByEmailOrUsername('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: [{ email: 'test@example.com' }, { username: 'test@example.com' }],
        select: ['id', 'username', 'email'],
      });
    });

    it('should find user by username', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.searchByEmailOrUsername('testuser');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.searchByEmailOrUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status from active to inactive', async () => {
      const activeUser = { ...mockUser, isActive: true };
      const inactiveUser = { ...mockUser, isActive: false };

      mockUserRepository.findOne.mockResolvedValue(activeUser);
      mockUserRepository.save.mockResolvedValue(inactiveUser);

      const result = await service.toggleUserStatus(1n);

      expect(result.isActive).toBe(false);
      expect(mockUserRepository.save).toHaveBeenCalledWith(inactiveUser);
    });

    it('should toggle user status from inactive to active', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const activeUser = { ...mockUser, isActive: true };

      mockUserRepository.findOne.mockResolvedValue(inactiveUser);
      mockUserRepository.save.mockResolvedValue(activeUser);

      const result = await service.toggleUserStatus(1n);

      expect(result.isActive).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalledWith(activeUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleUserStatus(1n)).rejects.toThrow(
        new NotFoundException('Unknown user')
      );
    });
  });

  describe('findUserById', () => {
    it('should return user with id and username', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserById(1);

      expect(result).toEqual({
        id: 1,
        username: 'testuser',
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        select: ['id', 'username'],
      });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('searchUsers', () => {
    it('should return users with search filter', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.searchUsers('test');

      expect(result).toEqual([mockUser]);
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('user.role', 'role');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('role.id != :superAdminRoleId', {
        superAdminRoleId: UserRole.SuperAdmin, // UserRole.SuperAdmin = 1
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', { isActive: true });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(user.fullName) LIKE :search OR LOWER(user.username) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: '%test%' }
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'user.id',
        'user.username',
        'user.fullName',
        'user.email',
        'role.id',
        'role.name',
      ]);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.fullName', 'ASC');
    });

    it('should return users without search filter', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.searchUsers();

      expect(result).toEqual([mockUser]);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.any(Object)
      );
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar successfully', async () => {
      const avatarUrl = 'https://example.com/new-avatar.jpg';
      mockUserRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateAvatar(1, avatarUrl);

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, { avatarUrl });
    });
  });
});
