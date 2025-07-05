import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class GitHubService {
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
      throw new BadRequestException(
        'Tên project đã tồn tại trên GitHub. Vui lòng chọn tên khác.'
      );
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
    content: string;
    message: string;
    branch?: string;
  }) {
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.username,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
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
        // Repo not found, không cần log
      } else {
        throw new Error(`GitHub deletion failed: ${err.message}`);
      }
    }
  }
}
