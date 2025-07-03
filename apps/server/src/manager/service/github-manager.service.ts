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

  async deleteRepository(repoName: string) {
    try {
      const user = await this.octokit.rest.users.getAuthenticated();
      await this.octokit.rest.repos.delete({
        owner: user.data.login,
        repo: repoName,
      });
      this.logger.debug(`GitHub repo '${repoName}' deleted`);
    } catch (err) {
      if (err.status === 404) {
        this.logger.warn(`GitHub repo '${repoName}' not found`);
      } else {
        throw new Error(`GitHub deletion failed: ${err.message}`);
      }
    }
  }

}
