import 'reflect-metadata';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Express } from 'express';

// Mock all dependencies
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => {},
}));

// Mock mongoose schema and decorators
jest.mock('mongoose', () => ({
  Schema: jest.fn(),
  Prop: jest.fn(),
  model: jest.fn(),
}));

jest.mock('#LocalProject/Managers/service/github-manager.service', () => ({
  GitHubService: class MockGitHubService {},
}));
jest.mock('#LocalProject/Managers/service/manifest.service', () => ({
  ManifestService: class MockManifestService {},
}));
jest.mock('#LocalProject/Managers/service/page-difficulty.service', () => ({
  PageDifficultyService: class MockPageDifficultyService {},
}));

// Mock entities to avoid circular dependency issues
jest.mock('#LocalProject/Entities', () => ({
  FileEntity: class MockFileEntity {},
  RequestEntity: class MockRequestEntity {},
  CommitEntity: class MockCommitEntity {},
  UserEntity: class MockUserEntity {},
  ProjectEntity: class MockProjectEntity {},
  BranchEntity: class MockBranchEntity {},
}));

// Mock direct CommitEntity import to avoid evaluating real entity module
jest.mock('../../db/mysql/entity/commit.entity', () => ({
  CommitEntity: class MockCommitEntity {},
}));

// Mock translation schema to avoid mongoose decorator issues
jest.mock('../../db/mongo/schema/translation.schema', () => ({
  TranslationString: class MockTranslationString {},
}));

// Mock Octokit ESM dependency to avoid ESM parsing issues in Jest
jest.mock('@octokit/rest', () => {
  const repos = {
    get: jest.fn(),
    createForAuthenticatedUser: jest.fn(),
    createOrUpdateFileContents: jest.fn(),
    getContent: jest.fn(),
    getBranch: jest.fn(),
    merge: jest.fn(),
  };
  const users = { getAuthenticated: jest.fn() };
  const git = { createRef: jest.fn() };
  return {
    Octokit: class MockOctokit {
      rest = { repos, users, git };
      repos = repos; // compatibility for older access pattern
    },
  };
});

// Import after mocks so transitive ESM deps (e.g. @octokit) are not executed
import { FileService } from '../service/file-manager.service';

describe('FileService', () => {
  let service: FileService;
  let mockFileRepository: any;
  let mockTranslationModel: any;
  let mockRequestRepository: any;
  let mockGitHubService: any;
  let mockManifestService: any;
  let mockCommitRepository: any;
  let mockPageDifficultyService: any;

  const mockFile = {
    id: 1n,
    fileName: 'test.txt',
    fileType: 'text/plain',
    fileContent: Buffer.from('test content'),
    uploader: { id: 1n, username: 'testuser', fullName: 'Test User' },
    project: { id: 1n, name: 'Test Project' },
    branch: { id: 1n, name: 'main' },
    request: { id: 1n },
    status: 'ready',
    extractLog: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExpressFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    size: 1024,
    destination: '/tmp',
    filename: 'test.txt',
    path: '/tmp/test.txt',
    buffer: Buffer.from('test content'),
  };

  beforeEach(() => {
    // Create mock repositories and services
    mockFileRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getCount: jest.fn(),
      })),
    };

    mockTranslationModel = {
      countDocuments: jest.fn(),
      updateMany: jest.fn(),
      find: jest.fn(),
    };

    mockRequestRepository = {
      findOne: jest.fn(),
    };

    mockGitHubService = {
      pushInitialFile: jest.fn(),
    };

    mockManifestService = {
      generateManifest: jest.fn(),
    };

    mockCommitRepository = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getCount: jest.fn(),
      })),
    };

    mockPageDifficultyService = {
      autoAssignPageDifficulties: jest.fn(),
    };

    // Create service instance with mocked dependencies
    service = new FileService(
      mockFileRepository as any,
      mockTranslationModel as any,
      mockRequestRepository as any,
      mockGitHubService as any,
      mockManifestService as any,
      mockCommitRepository as any,
      mockPageDifficultyService as any,
    );

    // Mock setTimeout to execute immediately
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('saveFile', () => {
    const saveFileParams = {
      uid: 1n,
      fileName: 'test.txt',
      fileType: 'text/plain',
      fileContent: Buffer.from('test content'),
      projectId: 1n,
      branchId: 1n,
      requestId: 1n,
    };

    it('should save file successfully', async () => {
      const createdFile = { ...mockFile };
      const savedFile = { ...mockFile, id: 1n };

      mockFileRepository.create.mockReturnValue(createdFile);
      mockFileRepository.save.mockResolvedValue(savedFile);
      mockGitHubService.pushInitialFile.mockResolvedValue(undefined);

      const result = await service.saveFile(saveFileParams);

      expect(mockFileRepository.create).toHaveBeenCalledWith({
        fileName: saveFileParams.fileName,
        fileType: saveFileParams.fileType,
        fileContent: saveFileParams.fileContent,
        uploader: { id: saveFileParams.uid },
        project: { id: saveFileParams.projectId },
        branch: { id: saveFileParams.branchId },
        request: { id: saveFileParams.requestId },
      });

      expect(mockFileRepository.save).toHaveBeenCalledWith(createdFile);
      expect(mockGitHubService.pushInitialFile).toHaveBeenCalledWith({
        repo: 'project-1',
        path: 'test.txt',
        content: saveFileParams.fileContent,
        message: 'Uploaded test.txt',
      });

      expect(result).toEqual({
        fileId: '1',
        fileName: savedFile.fileName,
        fileType: savedFile.fileType,
        createdAt: savedFile.createdAt,
        updatedAt: savedFile.updatedAt,
        uploaderId: '1',
        projectId: '1',
        branchId: '1',
        requestId: '1',
      });
    });

    it('should handle GitHub push errors gracefully', async () => {
      const createdFile = { ...mockFile };
      const savedFile = { ...mockFile, id: 1n };

      mockFileRepository.create.mockReturnValue(createdFile);
      mockFileRepository.save.mockResolvedValue(savedFile);
      mockGitHubService.pushInitialFile.mockRejectedValue(new Error('GitHub error'));

      const result = await service.saveFile(saveFileParams);

      expect(result).toBeDefined();
      expect(mockGitHubService.pushInitialFile).toHaveBeenCalled();
    });

    it('should handle optional parameters correctly', async () => {
      const paramsWithoutOptionals = {
        uid: 1n,
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('test content'),
      };

      const createdFile = { ...mockFile, project: undefined, branch: undefined, request: undefined };
      const savedFile = { ...mockFile, id: 1n, project: undefined, branch: undefined, request: undefined };

      mockFileRepository.create.mockReturnValue(createdFile);
      mockFileRepository.save.mockResolvedValue(savedFile);

      const result = await service.saveFile(paramsWithoutOptionals);

      expect(mockFileRepository.create).toHaveBeenCalledWith({
        fileName: paramsWithoutOptionals.fileName,
        fileType: paramsWithoutOptionals.fileType,
        fileContent: paramsWithoutOptionals.fileContent,
        uploader: { id: paramsWithoutOptionals.uid },
        project: undefined,
        branch: undefined,
        request: undefined,
      });

      expect(result.projectId).toBeUndefined();
      expect(result.branchId).toBeUndefined();
      expect(result.requestId).toBeUndefined();
    });
  });

  describe('handleUpload', () => {
    const uid = 1n;
    const projectId = 1n;
    const branchId = 1n;

    it('should update existing file when file with same name exists', async () => {
      const existingFile = { ...mockFile, status: 'ready' };
      const updatedFile = { ...existingFile, status: 'processing' };

      mockFileRepository.findOne.mockResolvedValue(existingFile);
      mockFileRepository.save.mockResolvedValue(updatedFile);

      const result = await service.handleUpload(mockExpressFile, uid, projectId, branchId);

      expect(mockFileRepository.findOne).toHaveBeenCalledWith({
        where: {
          fileName: 'test.txt',
          project: { id: projectId },
          branch: { id: branchId },
        },
        relations: ['project', 'branch'],
      });

      expect(mockFileRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: 'processing',
      }));

      expect(result.updated).toBe(true);
      expect(result.status).toBe('processing');
    });

    it('should create new file when no existing file found', async () => {
      const createdFile = { ...mockFile, status: 'processing' };
      const savedFile = { ...createdFile, id: 1n };

      mockFileRepository.findOne.mockResolvedValue(null);
      mockFileRepository.create.mockReturnValue(createdFile);
      mockFileRepository.save.mockResolvedValue(savedFile);

      const result = await service.handleUpload(mockExpressFile, uid, projectId, branchId);

      expect(mockFileRepository.create).toHaveBeenCalledWith({
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('test content'),
        uploader: { id: uid },
        project: { id: projectId },
        branch: { id: branchId },
        request: undefined,
        status: 'processing',
      });

      expect(result.updated).toBe(false);
      expect(result.status).toBe('processing');
    });

    it('should handle filename encoding correctly', async () => {
      const fileWithSpecialChars = {
        ...mockExpressFile,
        originalname: Buffer.from('test-émojî.txt', 'utf8').toString('latin1'),
      };

      mockFileRepository.findOne.mockResolvedValue(null);
      mockFileRepository.create.mockReturnValue(mockFile);
      mockFileRepository.save.mockResolvedValue(mockFile);

      await service.handleUpload(fileWithSpecialChars, uid, projectId, branchId);

      expect(mockFileRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'test-émojî.txt',
        })
      );
    });

    it('should initiate background extraction', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);
      mockFileRepository.create.mockReturnValue(mockFile);
      mockFileRepository.save.mockResolvedValue(mockFile);

      const result = await service.handleUpload(mockExpressFile, uid, projectId, branchId);

      expect(result.status).toBe('processing');

      // Fast-forward timers to execute setTimeout
      jest.runAllTimers();

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
    });
  });

  describe('saveTempFile', () => {
    it('should save temporary file successfully', async () => {
      const createdFile = { ...mockFile, project: null, branch: null };
      const savedFile = { ...createdFile, id: 1n };

      mockFileRepository.create.mockReturnValue(createdFile);
      mockFileRepository.save.mockResolvedValue(savedFile);

      const result = await service.saveTempFile(mockExpressFile, 1n);

      expect(mockFileRepository.create).toHaveBeenCalledWith({
        fileName: mockExpressFile.originalname,
        fileType: mockExpressFile.mimetype,
        fileContent: mockExpressFile.buffer,
        uploader: { id: 1n },
        project: null,
        branch: null,
      });

      expect(result).toEqual({
        fileId: '1',
        fileName: savedFile.fileName,
      });
    });
  });

  describe('getProjectFiles', () => {
    it('should return project files with uploader information', async () => {
      const projectFiles = [
        {
          id: 1n,
          fileName: 'file1.txt',
          fileType: 'text/plain',
          createdAt: new Date(),
          status: 'ready',
          uploader: { id: 1n, username: 'user1', fullName: 'User One' },
        },
        {
          id: 2n,
          fileName: 'file2.txt',
          fileType: 'text/plain',
          createdAt: new Date(),
          status: 'processing',
          uploader: { id: 2n, username: 'user2', fullName: 'User Two' },
        },
      ];

      mockFileRepository.find.mockResolvedValue(projectFiles);

      const result = await service.getProjectFiles(1n, 1n);

      expect(mockFileRepository.find).toHaveBeenCalledWith({
        where: { project: { id: 1n } },
        relations: ['uploader'],
        select: ['id', 'fileName', 'fileType', 'createdAt', 'uploader', 'status'],
        order: { createdAt: 'DESC' },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        fileId: '1',
        fileName: 'file1.txt',
        fileType: 'text/plain',
        createdAt: projectFiles[0].createdAt,
        status: 'ready',
        uploader: {
          uploaderId: '1',
          username: 'user1',
          fullName: 'User One',
        },
      });
    });

    it('should return empty array when no files found', async () => {
      mockFileRepository.find.mockResolvedValue([]);

      const result = await service.getProjectFiles(1n, 1n);

      expect(result).toEqual([]);
    });
  });

  describe('getFileById', () => {
    it('should return file by ID', async () => {
      const file = { ...mockFile, extractLog: 'extraction log' };

      mockFileRepository.findOne.mockResolvedValue(file);

      const result = await service.getFileById('1');

      expect(mockFileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        select: ['id', 'fileName', 'fileType', 'fileContent', 'status', 'extractLog'],
      });

      expect(result).toEqual({
        fileId: '1',
        fileName: file.fileName,
        fileType: file.fileType,
        fileContent: file.fileContent,
        status: 'ready',
        extractLog: 'extraction log',
      });
    });

    it('should return null when file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      const result = await service.getFileById('999');

      expect(result).toBeNull();
    });
  });

  describe('getFileDetails', () => {
    it('should return detailed file information', async () => {
      const file = { ...mockFile, extractLog: 'extraction log' };

      mockFileRepository.findOne.mockResolvedValue(file);
      mockTranslationModel.countDocuments.mockResolvedValue(5);

      const result = await service.getFileDetails('1');

      expect(mockFileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['uploader', 'project', 'branch'],
        select: ['id', 'fileName', 'fileType', 'status', 'extractLog', 'createdAt', 'updatedAt', 'uploader', 'project', 'branch'],
      });

      expect(result).toEqual({
        fileId: '1',
        fileName: file.fileName,
        fileType: file.fileType,
        status: 'ready',
        extractLog: 'extraction log',
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        translationCount: 5,
        uploader: {
          id: '1',
          username: 'testuser',
          fullName: 'Test User',
        },
        project: {
          id: '1',
          name: 'Test Project',
        },
        branch: {
          id: '1',
          name: 'main',
        },
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(service.getFileDetails('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadFileForRequest', () => {
    it('should upload file for request successfully', async () => {
      const request = { id: 1n };
      const savedFile = { fileId: '1' };
      const fullFile = { ...mockFile, project: { id: 1n }, branch: { id: 1n } };

      mockRequestRepository.findOne.mockResolvedValue(request);
      mockFileRepository.findOneOrFail.mockResolvedValue(fullFile);
      mockManifestService.generateManifest.mockResolvedValue(undefined);
      mockTranslationModel.find.mockReturnValue({ lean: () => [] });
      mockGitHubService.pushInitialFile.mockResolvedValue(undefined);

      // Mock saveFile method
      jest.spyOn(service, 'saveFile').mockResolvedValue(savedFile as any);

      const result = await service.uploadFileForRequest(mockExpressFile, 1n, 1n);

      expect(result).toEqual({
        message: 'File uploaded and linked to request',
        fileId: '1',
      });

      expect(mockManifestService.generateManifest).toHaveBeenCalledWith(fullFile);
      expect(mockGitHubService.pushInitialFile).toHaveBeenCalled();
    });

    it('should throw NotFoundException when request not found', async () => {
      mockRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.uploadFileForRequest(mockExpressFile, 1n, 1n))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const file = { ...mockFile, project: { id: 1n } };

      mockFileRepository.findOne.mockResolvedValue(file);
      mockCommitRepository.createQueryBuilder().getMany.mockResolvedValue([]);
      mockFileRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteFile(1n, '1');

      expect(result).toEqual({
        success: true,
        message: 'File deleted',
      });

      expect(mockFileRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteFile(1n, '1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      const file = { ...mockFile, project: { id: 1n } };

      mockFileRepository.findOne.mockResolvedValue(file);

      // Mock checkUserAttachFilesPermission to return false
      jest.spyOn(service, 'checkUserAttachFilesPermission').mockResolvedValue(false);

      await expect(service.deleteFile(1n, '1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkUserAttachFilesPermission', () => {
    it('should return true (currently hardcoded)', async () => {
      const result = await service.checkUserAttachFilesPermission('1', '1');
      expect(result).toBe(true);
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const file = { ...mockFile };

      mockFileRepository.findOne.mockResolvedValue(file);

      const result = await service.getFileMetadata('1');

      expect(mockFileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['project', 'branch', 'uploader'],
        select: ['id', 'fileName', 'fileType', 'createdAt', 'updatedAt', 'status', 'project', 'branch', 'uploader'],
      });

      expect(result).toEqual({
        fileId: '1',
        fileName: file.fileName,
        fileType: file.fileType,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        status: 'ready',
        project: {
          id: '1',
          name: 'Test Project',
        },
        branch: {
          id: '1',
          name: 'main',
        },
        uploader: {
          id: '1',
          username: 'testuser',
          fullName: 'Test User',
        },
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(service.getFileMetadata('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateFileForPageDifficulty', () => {
    it('should validate file for page difficulty successfully', async () => {
      const file = { ...mockFile };

      mockFileRepository.findOne.mockResolvedValue(file);

      const result = await service.validateFileForPageDifficulty('1');

      expect(result).toEqual({
        projectId: '1',
        branchId: '1',
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(service.validateFileForPageDifficulty('999')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when file has no project', async () => {
      const file = { ...mockFile, project: null };

      mockFileRepository.findOne.mockResolvedValue(file);

      await expect(service.validateFileForPageDifficulty('1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file has no branch', async () => {
      const file = { ...mockFile, branch: null };

      mockFileRepository.findOne.mockResolvedValue(file);

      await expect(service.validateFileForPageDifficulty('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('extractStringsFromFile', () => {
    it('should extract strings successfully', async () => {
      const file = { ...mockFile };
      const userId = '1';

      mockFileRepository.findOne.mockResolvedValue(file);
      mockTranslationModel.updateMany.mockResolvedValue({ modifiedCount: 5 });
      mockManifestService.generateManifest.mockResolvedValue(undefined);
      mockPageDifficultyService.autoAssignPageDifficulties.mockResolvedValue({
        assignedPages: 3,
        skippedPages: 2,
      });
      mockTranslationModel.find.mockReturnValue({ lean: () => [] });
      mockGitHubService.pushInitialFile.mockResolvedValue(undefined);
      mockFileRepository.save.mockResolvedValue(file);

      const result = await service.extractStringsFromFile('1', userId);

      expect(mockTranslationModel.updateMany).toHaveBeenCalledWith(
        { fileId: '1', obsolete: { $ne: true } },
        { $set: { obsolete: true } }
      );

      expect(mockManifestService.generateManifest).toHaveBeenCalledWith(file);
      expect(mockPageDifficultyService.autoAssignPageDifficulties).toHaveBeenCalledWith('1', userId);
      expect(mockGitHubService.pushInitialFile).toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        message: 'Manifest generated successfully',
        fileId: '1',
        fileName: 'test.txt',
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(service.extractStringsFromFile('999', '1')).rejects.toThrow(NotFoundException);
    });

    it('should throw error when user lacks permission', async () => {
      const file = { ...mockFile, uploader: { id: 2n } };

      mockFileRepository.findOne.mockResolvedValue(file);

      await expect(service.extractStringsFromFile('1', '1')).rejects.toThrow(
        'You do not have permission to extract strings from this file'
      );
    });

    it('should throw error when file has no content', async () => {
      const file = { ...mockFile, fileContent: Buffer.alloc(0) };

      mockFileRepository.findOne.mockResolvedValue(file);

      await expect(service.extractStringsFromFile('1', '1')).rejects.toThrow(
        'File has no content to extract'
      );
    });

    it('should throw error when file has no project or branch', async () => {
      const file = { ...mockFile, project: null, branch: null };

      mockFileRepository.findOne.mockResolvedValue(file);

      await expect(service.extractStringsFromFile('1', '1')).rejects.toThrow(
        'File must be associated with a project and branch for string extraction'
      );
    });

    it('should handle auto-assignment failures gracefully', async () => {
      const file = { ...mockFile };

      mockFileRepository.findOne.mockResolvedValue(file);
      mockTranslationModel.updateMany.mockResolvedValue({ modifiedCount: 5 });
      mockManifestService.generateManifest.mockResolvedValue(undefined);
      mockPageDifficultyService.autoAssignPageDifficulties.mockRejectedValue(new Error('Auto-assignment failed'));
      mockTranslationModel.find.mockReturnValue({ lean: () => [] });
      mockGitHubService.pushInitialFile.mockResolvedValue(undefined);
      mockFileRepository.save.mockResolvedValue(file);

      const result = await service.extractStringsFromFile('1', '1');

      expect(result.success).toBe(true);
      expect(mockPageDifficultyService.autoAssignPageDifficulties).toHaveBeenCalled();
    });
  });

  describe('saveFileToDB', () => {
    it('should save file to database successfully', async () => {
      const params = {
        uid: 1n,
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('test content'),
        projectId: 1n,
        branchId: 1n,
        requestId: 1n,
      };

      const createdFile = { ...mockFile };
      const savedFile = { ...mockFile, id: 1n };

      mockFileRepository.create.mockReturnValue(createdFile);
      mockFileRepository.save.mockResolvedValue(savedFile);

      const result = await service.saveFileToDB(params);

      expect(mockFileRepository.create).toHaveBeenCalledWith({
        fileName: params.fileName,
        fileType: params.fileType,
        fileContent: params.fileContent,
        uploader: { id: params.uid },
        project: { id: params.projectId },
        branch: { id: params.branchId },
        request: { id: params.requestId },
      });

      expect(result).toEqual({
        fileId: '1',
        fileName: savedFile.fileName,
        fileType: savedFile.fileType,
        createdAt: savedFile.createdAt,
        updatedAt: savedFile.updatedAt,
        uploaderId: '1',
        projectId: '1',
        branchId: '1',
        requestId: '1',
      });
    });
  });

  describe('handleLocalUpload', () => {
    it('should handle local upload successfully', async () => {
      const uid = 1n;
      const projectId = 1n;
      const branchId = 1n;

      const savedFile = { fileId: '1' };
      const fileEntity = { ...mockFile, project: { id: 1n }, branch: { id: 1n } };

      // Mock saveFileToDB method
      jest.spyOn(service, 'saveFileToDB').mockResolvedValue(savedFile as any);

      mockFileRepository.findOne.mockResolvedValue(fileEntity);
      mockManifestService.generateManifest.mockResolvedValue(undefined);
      mockTranslationModel.find.mockReturnValue({ lean: () => [] });
      mockGitHubService.pushInitialFile.mockResolvedValue(undefined);

      const result = await service.handleLocalUpload(mockExpressFile, uid, projectId, branchId);

      expect(result).toEqual({
        message: 'File uploaded successfully',
        fileId: '1',
      });

      expect(mockManifestService.generateManifest).toHaveBeenCalledWith(fileEntity);
      expect(mockGitHubService.pushInitialFile).toHaveBeenCalled();
    });

    it('should handle manifest generation failures gracefully', async () => {
      const uid = 1n;
      const projectId = 1n;
      const branchId = 1n;

      const savedFile = { fileId: '1' };
      const fileEntity = { ...mockFile, project: { id: 1n }, branch: { id: 1n } };

      jest.spyOn(service, 'saveFileToDB').mockResolvedValue(savedFile as any);

      mockFileRepository.findOne.mockResolvedValue(fileEntity);
      mockManifestService.generateManifest.mockRejectedValue(new Error('Manifest generation failed'));

      const result = await service.handleLocalUpload(mockExpressFile, uid, projectId, branchId);

      expect(result).toEqual({
        message: 'File uploaded successfully',
        fileId: '1',
      });

      expect(mockManifestService.generateManifest).toHaveBeenCalled();
    });
  });

  describe('retryExtraction', () => {
    it('should retry extraction successfully', async () => {
      const fileId = '1';
      const userId = '1';
      const file = { ...mockFile, status: 'error' };

      mockFileRepository.findOne.mockResolvedValue(file);
      mockFileRepository.save.mockResolvedValue(file);

      const result = await service.retryExtraction(fileId, userId);

      expect(result).toEqual({
        success: true,
        message: 'Extraction retry initiated',
        fileId: '1',
        status: 'processing',
      });

      expect(mockFileRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: 'processing',
        extractLog: expect.stringContaining('Retrying extraction...'),
      }));

      // Fast-forward timers to execute setTimeout
      jest.runAllTimers();

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
    });

    it('should throw NotFoundException when file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(service.retryExtraction('999', '1')).rejects.toThrow(NotFoundException);
    });

    it('should throw error when user lacks permission', async () => {
      const file = { ...mockFile, uploader: { id: 2n } };

      mockFileRepository.findOne.mockResolvedValue(file);

      await expect(service.retryExtraction('1', '1')).rejects.toThrow(
        'You do not have permission to retry extraction for this file'
      );
    });
  });
});
