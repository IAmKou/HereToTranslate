import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer';
import { BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BranchEntity } from '#LocalProject/Entities';
import { Repository } from 'typeorm';
import * as console from 'node:console';

interface CommitChangeOptions {
  repo: string;
  branch?: string;
  path: string;
  content: string | Buffer;
  message: string;
  isBase64?: boolean; // true if content is already base64 encoded
}

@Injectable()
export class GitHubService {
  @InjectRepository(BranchEntity)
  private readonly branchRepository: Repository<BranchEntity>;
  private octokit: Octokit;
  private username: string;

  constructor(private configService: ConfigService) {
    const githubToken = this.configService.get<string>('GITHUB_PAT');
    this.username = this.configService.get<string>('GITHUB_USERNAME')!;
    this.octokit = new Octokit({ auth: githubToken });
  }

  async repoExists(repoName: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner: this.username,
        repo: repoName,
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) return false;
      throw error;
    }
  }

  async createRepository(repoName: string, isPrivate = true) {
    const exists = await this.repoExists(repoName);
    if (exists) {
      throw new BadRequestException('Project name already existed on Github.');
    }
    const res = await this.octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      private: isPrivate,
      auto_init: false,
    });
    return res.data;
  }

  async pushInitialFile({
                          repo,
                          path,
                          content,
                          message,
                          branch = 'main',
                        }: {
    repo: string;
    path: string;
    content: string | Buffer;
    message: string;
    branch?: string;
  }) {
    const base64Content = Buffer.isBuffer(content)
      ? content.toString('base64')
      : Buffer.from(content, 'utf8').toString('base64');

    let sha: string | undefined;
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.username,
        repo,
        path,
        ref: branch,
      });

      if (!Array.isArray(data) && 'sha' in data) {
        sha = data.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) {
        // Nếu lỗi không phải là 404 (not found), thì throw lỗi
        throw error;
      }
      // Nếu lỗi là 404, file chưa tồn tại, không cần làm gì, sha sẽ là undefined
    }

    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.username,
      repo,
      path,
      message,
      content: base64Content,
      branch,
      sha, // sha sẽ là undefined nếu file chưa tồn tại (tạo mới), hoặc là sha của file cũ (cập nhật)
    });
  }

  async deleteRepository(repoName: string) {
    try {
      const user = await this.octokit.rest.users.getAuthenticated();
      await this.octokit.rest.repos.delete({
        owner: user.data.login,
        repo: repoName,
      });
    } catch (err: any) {
      if (err.status === 404) {
        throw new Error(`Repository ${repoName} not found on GitHub`);
      } else {
        throw new Error(`GitHub deletion failed: ${err.message}`);
      }
    }
  }

  async commitChange(options: CommitChangeOptions): Promise<void> {
    const {
      repo,
      branch = 'main',
      path,
      content,
      message,
      isBase64 = false,
    } = options;

    const encodedContent =
      isBase64
        ? (typeof content === 'string' ? content : content.toString())
        : Buffer.isBuffer(content)
          ? content.toString('base64')
          : Buffer.from(content).toString('base64');

    let sha: string | undefined;

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.username,
        repo,
        path,
        ref: branch,
      });

      if (!Array.isArray(data)) {
        sha = data.sha;
      }
    } catch (err: any) {
      if (err.status !== 404) {
        throw err;
      }
    }

    await this.octokit.repos.createOrUpdateFileContents({
      owner: this.username,
      repo,
      path,
      message,
      content: encodedContent,
      branch,
      sha,
    });
  }

  /**
   * Get file content from GitHub if it exists. Returns Buffer and sha or null if not found.
   */
  async getFileContentOrNull({
    repo,
    path,
    branch = 'main',
  }: { repo: string; path: string; branch?: string; }): Promise<{ content: Buffer; sha: string } | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.username,
        repo,
        path,
        ref: branch,
      });

      if (Array.isArray(data)) return null;
      const file = data as unknown as { content?: string; sha: string };
      if (!file || !file.content) return null;
      const buf = Buffer.from(file.content, 'base64');
      return { content: buf, sha: file.sha };
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  async createBranch(repo: string, branchName: string, fromBranch = 'main') {
    const baseBranch = await this.octokit.rest.repos.getBranch({
      owner: this.username,
      repo,
      branch: fromBranch,
    });

    await this.octokit.rest.git.createRef({
      owner: this.username,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseBranch.data.commit.sha,
    });
  }

  async mergeBranch({
                      repo,
                      base,
                      head,
                      commitMessage,
                    }: {
    repo: string;
    base: string;
    head: string;
    commitMessage: string;
  }) {
    const { data } = await this.octokit.rest.repos.merge({
      owner: this.username,
      repo,
      base,
      head,
      commit_message: commitMessage,
    });

    return data;
  }

  async listCommits(projectId: bigint, branchId: bigint) {
    // Lấy tất cả local commits (không filter status)
    const localCommits = (await (this as any).commitRepository?.find)
      ? await (this as any).commitRepository.find({
        where: { project: { id: projectId }, branch: { id: branchId } },
        relations: ['author'],
        order: { createdAt: 'DESC' },
      })
      : [];
    // Định dạng lại cho giống FE mong muốn
    return localCommits.map((c: any) => ({
      id: c.id,
      message: c.message,
      filePath: c.filePath,
      status: c.status,
      author: {
        id: c.author?.id,
        username: c.author?.username,
        fullName: c.author?.fullName,
      },
      createdAt: c.createdAt,
      reviewMessage: c.reviewMessage,
      contentSnapshot: c.contentSnapshot,
    }));
  }

  async fetchAllBranch(projectId: bigint) {
    const branch = await this.branchRepository.find({
      where: { project: { id: projectId } },
    });
    if (!branch) {
      console.log('no branch found');
    }
    return branch;
  }
}
