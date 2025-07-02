import { Injectable } from '@nestjs/common';

@Injectable()
export class GitHubService {
  private octokit: any;

  constructor() {
    (async () => {
      const { Octokit } = await import('@octokit/rest');
      this.octokit = new Octokit({
        auth: process.env.GITHUB_PAT,
      });
    })();
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
    const username = process.env.GITHUB_USERNAME;

    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: username,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
    });
  }
}
