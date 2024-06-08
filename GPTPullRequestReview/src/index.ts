import * as tl from "azure-pipelines-task-lib/task";
import { deleteExistingComments } from './pr';
import { reviewFile } from './review';
import { getTargetBranchName } from './utils';
import { getChangedFiles } from './git';
import https from 'https';
import { AiWrapper } from "./aiwrapper";

async function run() {
  try {
    if (tl.getVariable('Build.Reason') !== 'PullRequest') {
      tl.setResult(tl.TaskResult.Skipped, "This task should be run only when the build is triggered from a Pull Request.");
      return;
    }

    const defaultOpenAIModel = 'gpt-3.5-turbo';
    const defaultMaxTokens: number = 500;

    const supportSelfSignedCertificate = tl.getBoolInput('support_self_signed_certificate');
    const apiKey = tl.getInput('api_key', true);
    const maxTokens = parseInt(tl.getInput('max_tokens') ?? "") || defaultMaxTokens;
    const promptInstructions = tl.getInput('prompt_instructions') || `Act as a code reviewer of a Pull Request, providing feedback on possible bugs and clean code issues.
    You are provided with the Pull Request changes in a patch format.
    Each patch entry has the commit message in the Subject line followed by the code changes (diffs) in a unidiff format.

    As a code reviewer, your task is:
            - Review only added, edited or deleted lines.
            - If there's no bugs and the changes are correct, write only 'No feedback.'
            - If there's bug or uncorrect code changes, don't write 'No feedback.'`;

    if (apiKey == undefined) {
      tl.setResult(tl.TaskResult.Failed, 'No Api Key provided!');
      return;
    }

    const aoiEndpoint = tl.getInput('aoi_endpoint');
    let deploymentId: string | undefined;
    if (!!aoiEndpoint) {
      deploymentId = tl.getInput('deployment_id', true);
    }
    
    let openAiModel: string | undefined;
    if (!aoiEndpoint) {
      openAiModel = tl.getInput('model', true) || defaultOpenAIModel;
    }

    const aiAccessor = new AiWrapper(aoiEndpoint, deploymentId, apiKey, openAiModel, maxTokens);

    const httpsAgent = new https.Agent({
      rejectUnauthorized: !supportSelfSignedCertificate
    });

    let targetBranch = getTargetBranchName();

    if (!targetBranch) {
      tl.setResult(tl.TaskResult.Failed, 'No target branch found!');
      return;
    }

    console.log(`targetBranch: ${targetBranch}`);

    const filesNames = await getChangedFiles(targetBranch);

    await deleteExistingComments(httpsAgent);

    for (const fileName of filesNames) {
      await reviewFile(targetBranch, fileName, httpsAgent, aiAccessor, promptInstructions);
    }

    tl.setResult(tl.TaskResult.Succeeded, "Pull Request reviewed.");
  }
  catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();