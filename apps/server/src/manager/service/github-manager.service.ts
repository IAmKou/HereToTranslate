import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';

@Injectable()
export class GitHubService {
  private octokit: Octokit;
  private username: string;

  constructor(private configService: ConfigService) {
    const githubToken = this.configService.get<string>('GITHUB_PAT');
    this.username = this.configService.get<string>('GITHUB_USERNAME')!;
    this.octokit = new Octokit({ auth: githubToken });
  }

  async createRepository(repoName: string, isPrivate = true) {
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
}
