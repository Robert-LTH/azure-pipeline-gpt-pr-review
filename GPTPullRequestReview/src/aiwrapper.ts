import { AzureKeyCredential, ChatCompletions, ChatRequestMessage, OpenAIClient } from "@azure/openai";
import OpenAI from "openai";
import { ChatCompletion, ChatCompletionMessageParam } from "openai/resources";

interface ChatMessage {
    role: string
    content: string
}

export class AiWrapper {
    private _openAiClient: OpenAI | undefined;
    private _azureOpenAiClient: OpenAIClient | undefined;
    private _deploymentId: string | undefined;
    private _model: string = 'gpt-3.5-turbo';
    private _maxTokens: number = 500;

    constructor(openAIEndpoint: string | undefined, deploymentId: string | undefined, apiKey: string, model: string | undefined, maxTokens: number | undefined){
        if (!!openAIEndpoint) {
            console.log(`Using Azure OpenAI with deployment id: '${deploymentId}'`);
            this._azureOpenAiClient = new OpenAIClient(openAIEndpoint, new AzureKeyCredential(apiKey));
            if (deploymentId) {
                this._deploymentId = deploymentId;
            }
        }
        else {
            console.log(`Using OpenAI with model '${model}'`);
            this._openAiClient = new OpenAI({apiKey: apiKey});
            this._model = model ?? this._model;
        }
        
        console.log(`Max tokens used '${maxTokens}'`)
        this._maxTokens = maxTokens ?? this._maxTokens;
    }

    public async getChatCompletions(messages: ChatMessage[]) {
        let choices;
        let response: ChatCompletion | ChatCompletions | undefined = undefined;
        let ret: string = "";
        
        if (this._deploymentId && !!this._azureOpenAiClient) {
            response = await this._azureOpenAiClient.getChatCompletions(this._deploymentId, messages as ChatRequestMessage[], {
                maxTokens: this._maxTokens
            });
        }
        else {
            if (!!this._openAiClient) {
                response = await this._openAiClient.chat.completions.create({
                    model: this._model,
                    messages: messages as ChatCompletionMessageParam[], 
                    max_tokens: this._maxTokens
                });
            }
        }
        
        if (!!response) {
            choices = response?.choices;

            if (choices && choices.length > 0) {
                ret = choices[0].message?.content as string;
                console.log("Got chat completions");
            }
            else {
                console.log("No completions received.");
            }
            
        }

        return ret;
    }
}