import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Buffer } from 'buffer';
import { BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BranchEntity } from '#LocalProject/Entities';
import { Repository } from 'typeorm';

interface CommitChangeOptions {
  repo: string;
  branch?: string;
  path: string;
  content: string | Buffer;
  message: string;
  isBase64?: boolean;
}

@Injectable()
export class GitHubService {
  @InjectRepository(BranchEntity)
  private readonly branchRepository: Repository<BranchEntity>;

  private octokit: any;
  private username: string;

  constructor(private configService: ConfigService) {}

  private async initOctokit() {
    if (!this.octokit) {
      const { Octokit } = await import('@octokit/rest');
      const githubToken = this.configService.get<string>('GITHUB_PAT');
      this.username = this.configService.get<string>('GITHUB_USERNAME')!;
      this.octokit = new Octokit({ auth: githubToken });
    }
  }

  async repoExists(repoName: string): Promise<boolean> {
    await this.initOctokit();
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
    await this.initOctokit();
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
    await this.initOctokit();
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
      if (error.status !== 404) throw error;
    }

    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.username,
      repo,
      path,
      message,
      content: base64Content,
      branch,
      sha,
    });
  }

  async deleteRepository(repoName: string) {
    await this.initOctokit();
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
    await this.initOctokit();
    const {
      repo,
      branch = 'main',
      path,
      content,
      message,
      isBase64 = false,
    } = options;

    const encodedContent = isBase64
      ? typeof content === 'string'
        ? content
        : content.toString()
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

  async createBranch(repo: string, branchName: string, fromBranch = 'main') {
    await this.initOctokit();
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
    await this.initOctokit();
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
    const localCommits = (await (this as any).commitRepository?.find)
      ? await (this as any).commitRepository.find({
        where: { project: { id: projectId }, branch: { id: branchId } },
        relations: ['author'],
        order: { createdAt: 'DESC' },
      })
      : [];

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
