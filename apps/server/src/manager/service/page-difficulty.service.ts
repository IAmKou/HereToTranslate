import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PageDifficultyEntity,
  DifficultyLevel,
  DifficultyConfigEntity,UserEntity
} from '#LocalProject/Entities';
import { TranslationService } from './translation-manager.service';
import {
  PageDifficultyDto,
  UpdatePageDifficultyDto,
  DifficultyConfigDto,
  PagePreviewDto,
} from '#LocalProject/Dtos';

@Injectable()
export class PageDifficultyService {
  constructor(
    @InjectRepository(PageDifficultyEntity)
    private readonly pageDifficultyRepository: Repository<PageDifficultyEntity>,
    @InjectRepository(DifficultyConfigEntity)
    private readonly difficultyConfigRepository: Repository<DifficultyConfigEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly translationService: TranslationService
  ) {}

  async createDefaultDifficultyConfigs(projectId: string, userId: string) {
    const user = await this.userRepository.findOneOrFail({
      where: { id: BigInt(userId) },
    });

    const defaultConfigs = [
      {
        difficultyLevel: DifficultyLevel.SIMPLE,
        multiplier: 1.0,
        basePrice: 10.0,
        description: 'Simple text with basic vocabulary',
        criteria: {
          textDensity: 'Low',
          technicalTerms: false,
          formatting: 'Basic',
          specialCharacters: false,
          estimatedTimeRange: '1-2 hours per page',
        },
      },
      {
        difficultyLevel: DifficultyLevel.MEDIUM,
        multiplier: 1.5,
        basePrice: 15.0,
        description: 'Moderate complexity with some technical terms',
        criteria: {
          textDensity: 'Medium',
          technicalTerms: true,
          formatting: 'Standard',
          specialCharacters: false,
          estimatedTimeRange: '2-3 hours per page',
        },
      },
      {
        difficultyLevel: DifficultyLevel.COMPLEX,
        multiplier: 2.0,
        basePrice: 20.0,
        description: 'Complex text with technical terminology',
        criteria: {
          textDensity: 'High',
          technicalTerms: true,
          formatting: 'Complex',
          specialCharacters: true,
          estimatedTimeRange: '3-4 hours per page',
        },
      },
      {
        difficultyLevel: DifficultyLevel.VERY_COMPLEX,
        multiplier: 3.0,
        basePrice: 30.0,
        description: 'Very complex specialized content',
        criteria: {
          textDensity: 'Very High',
          technicalTerms: true,
          formatting: 'Very Complex',
          specialCharacters: true,
          estimatedTimeRange: '4+ hours per page',
        },
      },
    ];

    const configs = [];
    for (const config of defaultConfigs) {
      const existing = await this.difficultyConfigRepository.findOne({
        where: {
          project: { id: BigInt(projectId) },
          difficultyLevel: config.difficultyLevel,
        },
      });

      if (!existing) {
        const newConfig = this.difficultyConfigRepository.create({
          ...config,
          project: { id: BigInt(projectId) },
          createdBy: user,
        });
        configs.push(await this.difficultyConfigRepository.save(newConfig));
      }
    }

    return configs;
  }

  async getPagePreview(dto: PagePreviewDto) {
    const { fileId, pageNumber, language } = dto;

    // Get translation strings for the specific page
    const translations = await this.translationService.getTranslationPreview(
      '', // projectId - will be derived from fileId
      '', // branchId - will be derived from fileId
      fileId,
      language,
      [pageNumber - 1] // Convert to 0-based filePart
    );

    if (translations.length === 0) {
      throw new NotFoundException(`No content found for page ${pageNumber}`);
    }

    // Analyze page complexity
    const analysis = this.analyzePageComplexity(translations);

    return {
      pageNumber,
      filePart: pageNumber - 1,
      translations,
      analysis,
      suggestedDifficulty: this.suggestDifficultyLevel(analysis),
    };
  }

  private analyzePageComplexity(translations: any[]) {
    const totalText = translations.map(t => t.originalText).join(' ');
    const textLength = totalText.length;
    const wordCount = totalText.split(/\s+/).length;
    const avgWordLength = textLength / wordCount;

    // Simple heuristics for complexity analysis
    const hasSpecialChars = /[^\w\s.,!?;:()[\]{}'"'-]/.test(totalText);
    const hasTechnicalTerms = /\b[A-Z]{2,}\b|\b\w+\.\w+\b|\b\d+[a-zA-Z]+\b/.test(totalText);
    const hasComplexFormatting = translations.some(t => 
      t.style && (t.style.bold || t.style.italic || t.style.color)
    );

    let complexityScore = 0;
    if (textLength > 500) complexityScore += 1;
    if (avgWordLength > 6) complexityScore += 1;
    if (hasSpecialChars) complexityScore += 1;
    if (hasTechnicalTerms) complexityScore += 1;
    if (hasComplexFormatting) complexityScore += 1;

    return {
      textCount: translations.length,
      wordCount,
      textLength,
      avgWordLength: Math.round(avgWordLength * 100) / 100,
      hasSpecialChars,
      hasTechnicalTerms,
      hasComplexFormatting,
      complexityScore,
      estimatedTime: this.estimateTranslationTime(complexityScore, wordCount),
    };
  }

  private suggestDifficultyLevel(analysis: any): DifficultyLevel {
    const { complexityScore } = analysis;
    
    if (complexityScore <= 1) return DifficultyLevel.SIMPLE;
    if (complexityScore <= 2) return DifficultyLevel.MEDIUM;
    if (complexityScore <= 3) return DifficultyLevel.COMPLEX;
    return DifficultyLevel.VERY_COMPLEX;
  }

  private estimateTranslationTime(complexityScore: number, wordCount: number): number {
    // Base rate: 250 words per hour for simple text
    let baseRate = 250;
    
    switch (complexityScore) {
      case 0:
      case 1:
        baseRate = 300; // Simple
        break;
      case 2:
        baseRate = 200; // Medium
        break;
      case 3:
        baseRate = 150; // Complex
        break;
      default:
        baseRate = 100; // Very Complex
        break;
    }

    return Math.ceil(wordCount / baseRate * 100) / 100; // Round to 2 decimal places
  }

  async assignPageDifficulty(
    projectId: string,
    branchId: string,
    fileId: string,
    dto: PageDifficultyDto,
    userId: string
  ) {
    const user = await this.userRepository.findOneOrFail({
      where: { id: BigInt(userId) },
    });

    // Check for duplicate page assignment
    const existing = await this.pageDifficultyRepository.findOne({
      where: {
        fileId,
        pageNumber: dto.pageNumber,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Page ${dto.pageNumber} has already been assigned a difficulty level`
      );
    }

    // Get difficulty config for scoring calculation
    const config = await this.difficultyConfigRepository.findOne({
      where: {
        project: { id: BigInt(projectId) },
        difficultyLevel: dto.difficultyLevel,
        isActive: true,
      },
    });

    if (!config) {
      throw new NotFoundException(
        `Difficulty configuration not found for level: ${dto.difficultyLevel}`
      );
    }

    const baseScore = dto.baseScore || config.basePrice;
    const calculatedScore = baseScore * config.multiplier;

    const pageDifficulty = this.pageDifficultyRepository.create({
      projectId,
      branchId,
      fileId,
      pageNumber: dto.pageNumber,
      filePart: dto.filePart,
      difficultyLevel: dto.difficultyLevel,
      baseScore,
      calculatedScore,
      notes: dto.notes,
      previewData: dto.previewData,
      assignedBy: user,
    });

    return await this.pageDifficultyRepository.save(pageDifficulty);
  }

  async updatePageDifficulty(dto: UpdatePageDifficultyDto, userId: string) {
    const pageDifficulty = await this.pageDifficultyRepository.findOneOrFail({
      where: { id: BigInt(dto.pageId) },
      relations: ['assignedBy'],
    });

    const user = await this.userRepository.findOneOrFail({
      where: { id: BigInt(userId) },
    });

    // Get updated difficulty config
    const config = await this.difficultyConfigRepository.findOne({
      where: {
        project: { id: BigInt(pageDifficulty.projectId) },
        difficultyLevel: dto.difficultyLevel,
        isActive: true,
      },
    });

    if (!config) {
      throw new NotFoundException(
        `Difficulty configuration not found for level: ${dto.difficultyLevel}`
      );
    }

    // Recalculate score
    const calculatedScore = pageDifficulty.baseScore * config.multiplier;

    pageDifficulty.difficultyLevel = dto.difficultyLevel;
    pageDifficulty.calculatedScore = calculatedScore;
    pageDifficulty.notes = dto.notes || pageDifficulty.notes;
    pageDifficulty.reviewedBy = user;
    pageDifficulty.reviewedAt = new Date();

    return await this.pageDifficultyRepository.save(pageDifficulty);
  }

  async getPageDifficulties(fileId: string) {
    return await this.pageDifficultyRepository.find({
      where: { fileId },
      relations: ['assignedBy', 'reviewedBy'],
      order: { pageNumber: 'ASC' },
    });
  }

  async calculateTaskScore(fileId: string, selectedPages?: number[]) {
    let query = this.pageDifficultyRepository
      .createQueryBuilder('pd')
      .where('pd.fileId = :fileId', { fileId });

    if (selectedPages && selectedPages.length > 0) {
      query = query.andWhere('pd.pageNumber IN (:...pages)', { pages: selectedPages });
    }

    const difficulties = await query.getMany();

    const totalScore = difficulties.reduce((sum, pd) => sum + Number(pd.calculatedScore), 0);
    const totalPages = difficulties.length;

    return {
      totalScore,
      totalPages,
      difficulties,
      breakdown: this.getScoreBreakdown(difficulties),
    };
  }

  private getScoreBreakdown(difficulties: PageDifficultyEntity[]) {
    const breakdown = {
      [DifficultyLevel.SIMPLE]: { count: 0, score: 0 },
      [DifficultyLevel.MEDIUM]: { count: 0, score: 0 },
      [DifficultyLevel.COMPLEX]: { count: 0, score: 0 },
      [DifficultyLevel.VERY_COMPLEX]: { count: 0, score: 0 },
    };

    difficulties.forEach(pd => {
      breakdown[pd.difficultyLevel].count++;
      breakdown[pd.difficultyLevel].score += Number(pd.calculatedScore);
    });

    return breakdown;
  }

  async validateNoDuplicatePages(fileId: string, pageNumbers: number[]) {
    const existing = await this.pageDifficultyRepository.find({
      where: { fileId },
      select: ['pageNumber'],
    });

    const existingPages = existing.map(pd => pd.pageNumber);
    const duplicates = pageNumbers.filter(page => existingPages.includes(page));

    if (duplicates.length > 0) {
      throw new ConflictException(
        `The following pages are already assigned: ${duplicates.join(', ')}`
      );
    }

    return true;
  }

  async getDifficultyConfigs(projectId: string) {
    return await this.difficultyConfigRepository.find({
      where: {
        project: { id: BigInt(projectId) },
        isActive: true,
      },
      relations: ['createdBy', 'updatedBy'],
      order: { difficultyLevel: 'ASC' },
    });
  }

  async updateDifficultyConfig(
    configId: string,
    dto: Partial<DifficultyConfigDto>,
    userId: string
  ) {
    const config = await this.difficultyConfigRepository.findOneOrFail({
      where: { id: BigInt(configId) },
    });

    const user = await this.userRepository.findOneOrFail({
      where: { id: BigInt(userId) },
    });

    Object.assign(config, dto);
    config.updatedBy = user;

    return await this.difficultyConfigRepository.save(config);
  }
}
