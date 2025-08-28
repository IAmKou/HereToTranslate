import 'reflect-metadata';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { FileService } from '../service/file-manager.service';

// Mock TypeORM decorator to avoid DI issues in direct instantiation
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

// Mock Mongoose decorator
jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
}));

// Mock the translation schema to avoid Mongoose decorator issues
jest.mock('../../db/mongo/schema/translation.schema', () => ({
  TranslationString: class MockTranslationString {},
  TranslationStringDocument: class MockTranslationStringDocument {},
}));

// Mock external services
jest.mock('../service/github-manager.service');
jest.mock('../service/manifest.service');
jest.mock('../service/activity-manager.service');

// Mock Aspose bridges
jest.mock('../../util/extensions/aspose-pdf-bridge');

// Mock mammoth
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
}));

// Mock docx-preview
jest.mock('docx-preview', () => ({
  renderAsync: jest.fn(),
}));

describe('FileService', () => {
  let service: FileService;
  let fileRepository: jest.Mocked<Repository<any>>;
  let translationModel: jest.Mocked<Model<any>>;
  let requestRepository: jest.Mocked<Repository<any>>;
  let commitRepository: jest.Mocked<Repository<any>>;
  let githubService: any;
  let manifestService: any;
  let activityManagerService: any;
  let asposePDFBridge: any;

  const mockUser = { id: 1n, username: 'testuser', fullName: 'Test User', email: 'test@example.com' };
  const mockProject = { id: 1n, name: 'Test Project', members: [mockUser], createdBy: mockUser };
  const mockBranch = { id: 1n, name: 'main' };
  const mockRequest = { id: 1n, title: 'Test Request' };

  beforeEach(() => {
    fileRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    } as any;

    translationModel = {
      find: jest.fn(),
      updateMany: jest.fn(),
      findOne: jest.fn(),
    } as any;

    // Mock the find().lean() chain for uploadFileForRequest
    (translationModel.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    requestRepository = {
      findOne: jest.fn(),
    } as any;

    commitRepository = {
      createQueryBuilder: jest.fn(),
    } as any;

    githubService = {
      pushInitialFile: jest.fn(),
    };

    manifestService = {
      generateManifest: jest.fn(),
    };

    activityManagerService = {
      logFileUpload: jest.fn(),
      logFileDelete: jest.fn(),
    };

    asposePDFBridge = {
      isAvailable: jest.fn().mockReturnValue(true),
      uploadFileToStorage: jest.fn().mockResolvedValue(undefined),
      getServiceInfo: jest.fn().mockReturnValue({ available: true, initialized: true }),
    };

    service = new FileService(
      fileRepository as any,
      translationModel as any,
      requestRepository as any,
      githubService,
      manifestService,
      commitRepository as any,
      activityManagerService,
      asposePDFBridge,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('saveFile', () => {
    it('should save file and push to GitHub', async () => {
      const fileParams = {
        uid: 1n,
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('test content'),
        projectId: 1n,
        branchId: 1n,
      };

      const mockFile = { id: 1n, fileName: 'test.txt', fileType: 'text/plain' };
      (fileRepository.create as jest.Mock).mockReturnValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(mockFile);

      (activityManagerService.logFileUpload as jest.Mock).mockResolvedValue(undefined);
      (githubService.pushInitialFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.saveFile(fileParams);

      expect(fileRepository.create).toHaveBeenCalledWith({
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('test content'),
        uploader: { id: 1n },
        project: { id: 1n },
        branch: { id: 1n },
        request: undefined,
      });
      expect(fileRepository.save).toHaveBeenCalledWith(mockFile);
      expect(activityManagerService.logFileUpload).toHaveBeenCalledWith(1, 1, 'test.txt', 0, 1);
      expect(githubService.pushInitialFile).toHaveBeenCalledWith({
        repo: 'project-1',
        path: 'test.txt',
        content: Buffer.from('test content'),
        message: 'Uploaded test.txt',
      });
      expect(result.fileId).toBe('1');
    });

    it('should handle file without project/branch', async () => {
      const fileParams = {
        uid: 1n,
        fileName: 'temp.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('temp content'),
      };

      const mockFile = { id: 2n, fileName: 'temp.txt', fileType: 'text/plain' };
      (fileRepository.create as jest.Mock).mockReturnValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(mockFile);

      // Mock GitHub service to handle the case where it tries to push even without project
      (githubService.pushInitialFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.saveFile(fileParams);

      expect(activityManagerService.logFileUpload).not.toHaveBeenCalled();
      // The service still tries to push to GitHub even without project/branch
      expect(githubService.pushInitialFile).toHaveBeenCalledWith({
        repo: 'project-undefined',
        path: 'temp.txt',
        content: Buffer.from('temp content'),
        message: 'Uploaded temp.txt',
      });
      expect(result.projectId).toBeUndefined();
      expect(result.branchId).toBeUndefined();
    });
  });

  describe('handleUpload', () => {
    it('should create new file when no existing file found', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 12,
        destination: '/tmp',
        filename: 'test.txt',
        path: '/tmp/test.txt',
        buffer: Buffer.from('test content'),
        stream: {} as any,
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(null);
      (fileRepository.create as jest.Mock).mockReturnValue({ fileName: 'test.txt' });
      (fileRepository.save as jest.Mock).mockResolvedValue({ id: 1n, fileName: 'test.txt' });

      (activityManagerService.logFileUpload as jest.Mock).mockResolvedValue(undefined);

      const result = await service.handleUpload(mockFile, 1n, 1n, 1n);

      expect(fileRepository.findOne).toHaveBeenCalledWith({
        where: {
          fileName: 'test.txt',
          project: { id: 1n },
          branch: { id: 1n },
        },
        relations: ['project', 'branch'],
      });
      expect(result.updated).toBe(false);
      expect(result.status).toBe('processing');
    });

    it('should update existing file when found', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'existing.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 15,
        destination: '/tmp',
        filename: 'existing.txt',
        path: '/tmp/existing.txt',
        buffer: Buffer.from('updated content'),
        stream: {} as any,
      };

      const existingFile = {
        id: 1n,
        fileName: 'existing.txt',
        fileContent: Buffer.from('old content'),
        fileType: 'text/plain',
        uploader: { id: 2n },
        updatedAt: new Date('2023-01-01'),
        status: 'ready',
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(existingFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(existingFile);

      const result = await service.handleUpload(mockFile, 1n, 1n, 1n);

      expect(fileRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        fileContent: Buffer.from('updated content'),
        status: 'processing',
      }));
      expect(result.updated).toBe(true);
    });
  });

  describe('saveTempFile', () => {
    it('should save temporary file without project/branch', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'temp.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 12,
        destination: '/tmp',
        filename: 'temp.txt',
        path: '/tmp/temp.txt',
        buffer: Buffer.from('temp content'),
        stream: {} as any,
      };

      const mockFileEntity = { id: 1n, fileName: 'temp.txt' };
      (fileRepository.create as jest.Mock).mockReturnValue(mockFileEntity);
      (fileRepository.save as jest.Mock).mockResolvedValue(mockFileEntity);

      const result = await service.saveTempFile(mockFile, 1n);

      expect(fileRepository.create).toHaveBeenCalledWith({
        fileName: 'temp.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('temp content'),
        uploader: { id: 1n },
        project: null,
        branch: null,
      });
      expect(result.fileId).toBe('1');
      expect(result.fileName).toBe('temp.txt');
    });
  });

  describe('getProjectFiles', () => {
    it('should return project files with uploader information', async () => {
      const mockFiles = [
        {
          id: 1n,
          fileName: 'file1.txt',
          fileType: 'text/plain',
          createdAt: new Date(),
          status: 'ready',
          title: 'File 1',
          uploader: { id: 1n, username: 'user1', fullName: 'User One' },
        },
        {
          id: 2n,
          fileName: 'file2.txt',
          fileType: 'text/plain',
          createdAt: new Date(),
          status: 'processing',
          title: null,
          uploader: { id: 2n, username: 'user2', fullName: 'User Two' },
        },
      ];

      (fileRepository.find as jest.Mock).mockResolvedValue(mockFiles);

      const result = await service.getProjectFiles(1n, 1n);

      expect(fileRepository.find).toHaveBeenCalledWith({
        where: { project: { id: 1n } },
        relations: ['uploader'],
        select: ['id', 'fileName', 'fileType', 'createdAt', 'uploader', 'status', 'title'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        fileId: '1',
        fileName: 'file1.txt',
        fileType: 'text/plain',
        title: 'File 1',
        createdAt: mockFiles[0].createdAt,
        status: 'ready',
        uploader: {
          uploaderId: '1',
          username: 'user1',
          fullName: 'User One',
        },
      });
    });
  });

  describe('getFileById', () => {
    it('should return file by ID', async () => {
      const mockFile = {
        id: 1n,
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('test content'),
        status: 'ready',
        extractLog: 'Extraction completed',
        title: 'Test File',
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(mockFile);

      const result = await service.getFileById('1');

      expect(fileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        select: ['id', 'fileName', 'fileType', 'fileContent', 'status', 'extractLog', 'title'],
      });
      expect(result).toEqual({
        fileId: '1',
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('test content'),
        title: 'Test File',
        status: 'ready',
        extractLog: 'Extraction completed',
      });
    });

    it('should return null when file not found', async () => {
      (fileRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getFileById('999');

      expect(result).toBeNull();
    });
  });

  describe('uploadFileForRequest', () => {
    it('should upload file for request and generate manifest', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'request.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 15,
        destination: '/tmp',
        filename: 'request.txt',
        path: '/tmp/request.txt',
        buffer: Buffer.from('request content'),
        stream: {} as any,
      };

      (requestRepository.findOne as jest.Mock).mockResolvedValue(mockRequest);
      (fileRepository.create as jest.Mock).mockReturnValue({ fileName: 'request.txt' });
      (fileRepository.save as jest.Mock).mockResolvedValue({ id: 1n, fileName: 'request.txt' });
      (fileRepository.findOneOrFail as jest.Mock).mockResolvedValue({
        id: 1n,
        fileName: 'request.txt',
        project: mockProject,
        branch: mockBranch,
      });

      (manifestService.generateManifest as jest.Mock).mockResolvedValue(undefined);
      (translationModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (githubService.pushInitialFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.uploadFileForRequest(mockFile, 1n, 1n);

      expect(requestRepository.findOne).toHaveBeenCalledWith({ where: { id: 1n } });
      expect(manifestService.generateManifest).toHaveBeenCalled();
      expect(githubService.pushInitialFile).toHaveBeenCalledWith({
        repo: 'project-1',
        path: '1_manifest.json',
        content: '[]',
        message: 'Add manifest for request.txt',
        branch: 'main',
      });
      expect(result.message).toBe('File uploaded and linked to request');
    });

    it('should throw NotFoundException when request not found', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 12,
        destination: '/tmp',
        filename: 'test.txt',
        path: '/tmp/test.txt',
        buffer: Buffer.from('test content'),
        stream: {} as any,
      };

      (requestRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.uploadFileForRequest(mockFile, 1n, 999n))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFile', () => {
    it('should delete file when user has permission and no commits', async () => {
      const mockFile = {
        id: 1n,
        fileName: 'test.txt',
        project: mockProject,
        branch: mockBranch,
        uploader: mockUser,
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(mockFile);

      const qb = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any;
      (commitRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      (fileRepository.delete as jest.Mock).mockResolvedValue(undefined);
      (activityManagerService.logFileDelete as jest.Mock).mockResolvedValue(undefined);

      const result = await service.deleteFile(1n, '1');

      expect(fileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['uploader', 'project'],
      });
      expect(fileRepository.delete).toHaveBeenCalledWith('1');
      expect(activityManagerService.logFileDelete).toHaveBeenCalledWith(1, 1, 'test.txt', 1);
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when file not found', async () => {
      (fileRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteFile(999n, '1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      const mockFile = {
        id: 1n,
        fileName: 'test.txt',
        project: mockProject,
        branch: mockBranch,
        uploader: mockUser,
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(mockFile);

      // Mock permission check to return false
      jest.spyOn(service as any, 'checkUserAttachFilesPermission').mockResolvedValue(false);

      await expect(service.deleteFile(1n, '1'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('extractStringsFromFile', () => {
    it('should extract strings and generate manifest', async () => {
      const mockFile = {
        id: 1n,
        fileName: 'test.txt',
        uploader: { id: 1n },
        project: mockProject,
        branch: mockBranch,
        extractLog: '',
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(mockFile);
      (translationModel.updateMany as jest.Mock).mockResolvedValue(undefined);
      (manifestService.generateManifest as jest.Mock).mockResolvedValue(undefined);
      (translationModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (githubService.pushInitialFile as jest.Mock).mockResolvedValue(undefined);
      (fileRepository.save as jest.Mock).mockResolvedValue(mockFile);

      const result = await service.extractStringsFromFile('1', '1');

      expect(translationModel.updateMany).toHaveBeenCalledWith(
        { fileId: '1', obsolete: { $ne: true } },
        { $set: { obsolete: true } }
      );
      expect(manifestService.generateManifest).toHaveBeenCalledWith(mockFile);
      expect(githubService.pushInitialFile).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw error when user lacks permission', async () => {
      const mockFile = {
        id: 1n,
        fileName: 'test.txt',
        uploader: { id: 1n },
        project: mockProject,
        branch: mockBranch,
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(mockFile);

      await expect(service.extractStringsFromFile('1', '2'))
        .rejects.toThrow('You do not have permission to extract strings from this file');
    });
  });

  describe('renameFile', () => {
    it('should rename file when user has permission', async () => {
      const mockFile = {
        id: 1n,
        fileName: 'old.txt',
        fileType: 'text/plain',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploader: mockUser,
        project: mockProject,
        branch: mockBranch,
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue({
        ...mockFile,
        fileName: 'new.txt',
        updatedAt: new Date(),
      });

      // Mock permission check to return true
      jest.spyOn(service as any, 'checkUserAttachFilesPermission').mockResolvedValue(true);

      const result = await service.renameFile(1n, 'new.txt', 1n);

      expect(fileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['project', 'branch'],
      });
      expect(fileRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        fileName: 'new.txt',
      }));
      expect(result.fileName).toBe('new.txt');
    });

    it('should throw error when file not found', async () => {
      (fileRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.renameFile(999n, 'new.txt', 1n))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getFilePreview', () => {
    it('should return text preview for text files', async () => {
      const mockFile = {
        id: 1n,
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('Hello World'),
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(mockFile);

      const result = await service.getFilePreview('1');

      expect(result.fileType).toBe('text/plain');
      expect(result.content).toBe('Hello World');
      expect(result.previewType).toBe('text');
    });

    it('should return base64 content for image files', async () => {
      const mockFile = {
        id: 1n,
        fileName: 'image.jpg',
        fileType: 'image/jpeg',
        fileContent: Buffer.from('fake image data'),
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(mockFile);

      const result = await service.getFilePreview('1');

      expect(result.fileType).toBe('image/jpeg');
      expect(result.content).toBe('ZmFrZSBpbWFnZSBkYXRh'); // base64 of 'fake image data'
      expect(result.previewType).toBe('image');
    });

    it('should throw NotFoundException when file not found', async () => {
      (fileRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getFilePreview('999'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const mockFile = {
        id: 1n,
        fileName: 'test.txt',
        fileType: 'text/plain',
        project: { id: 1n },
        branch: { id: 1n },
      };

      (fileRepository.findOne as jest.Mock).mockResolvedValue(mockFile);

      const result = await service.getFileMetadata('1');

      expect(result.fileName).toBe('test.txt');
      expect(result.fileType).toBe('text/plain');
      expect(result.projectId).toBe('1');
      expect(result.branchId).toBe('1');
    });

    it('should throw NotFoundException when file not found', async () => {
      (fileRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getFileMetadata('999'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Aspose Storage', () => {
    it('should check if Aspose storage is available', () => {
      const status = service.isAsposeStorageAvailable();
      expect(status).toBe(true);
    });

    it('should get Aspose storage status', () => {
      const status = service.getAsposeStorageStatus();
      
      expect(status.overallAvailable).toBe(true);
      expect(status.pdfBridge.available).toBe(true);
      expect(status.pdfBridge.info.available).toBe(true);
    });

    it('should upload PDF files to Aspose storage', async () => {
      const fileParams = {
        uid: 1n,
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileContent: Buffer.from('fake pdf content'),
        projectId: 1n,
      };

      const mockFile = { id: 1n, fileName: 'test.pdf', fileType: 'application/pdf' };
      (fileRepository.create as jest.Mock).mockReturnValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(mockFile);
      (activityManagerService.logFileUpload as jest.Mock).mockResolvedValue(undefined);
      (asposePDFBridge.uploadFileToStorage as jest.Mock).mockResolvedValue(undefined);

      const result = await service.saveFile(fileParams);

      expect(asposePDFBridge.uploadFileToStorage).toHaveBeenCalledWith(
        expect.stringContaining('test.pdf'),
        Buffer.from('fake pdf content'),
        'application/pdf'
      );
      expect(result.fileId).toBe('1');
    });

    it('should fallback to GitHub when Aspose storage fails', async () => {
      const fileParams = {
        uid: 1n,
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('test content'),
        projectId: 1n,
      };

      const mockFile = { id: 1n, fileName: 'test.txt', fileType: 'text/plain' };
      (fileRepository.create as jest.Mock).mockReturnValue(mockFile);
      (fileRepository.save as jest.Mock).mockResolvedValue(mockFile);
      (activityManagerService.logFileUpload as jest.Mock).mockResolvedValue(undefined);
      
      // Mock Aspose storage to fail
      (asposePDFBridge.uploadFileToStorage as jest.Mock).mockRejectedValue(new Error('Aspose storage unavailable'));
      (githubService.pushInitialFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.saveFile(fileParams);

      expect(asposePDFBridge.uploadFileToStorage).toHaveBeenCalled();
      expect(githubService.pushInitialFile).toHaveBeenCalled();
      expect(result.fileId).toBe('1');
    });
  });
});
