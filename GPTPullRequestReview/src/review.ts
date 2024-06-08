import { git } from './git';
import { addCommentToPR } from './pr';
import { Agent } from 'https';
import { AiWrapper } from './aiwrapper';

export async function reviewFile(targetBranch: string, fileName: string, httpsAgent: Agent, aiAccessor: AiWrapper, prompt_instructions: string) {
  console.log(`Start reviewing ${fileName} ...`);
  
  const patch = await git.diff([targetBranch, '--', fileName]);

  try {
    const messages = [
      {
        role: 'system',
        content: prompt_instructions
      },
      {
        role: 'user',
        content: patch
      }
    ];
    
    let review = await aiAccessor.getChatCompletions(messages);

    if (review.trim() !== "No feedback.") {
      await addCommentToPR(fileName, review, httpsAgent);
    }

    console.log(`Review of ${fileName} completed.`);
  }
  catch (error: any) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
}