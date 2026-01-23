import Anthropic from '@anthropic-ai/sdk';
import { createInterface } from 'readline';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

interface MCPTool {
  name: string;
  description: string;
  input_schema: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | Array<any>;
}

class CronosAgent {
  private anthropic: Anthropic;
  private mcpProcess: any;
  private tools: MCPTool[] = [];
  private conversationHistory: Message[] = [];
  private rl: any;
  private pendingResponses: Map<number, any> = new Map();

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not found in .env');
    }

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async startMCPServer() {
    console.log('\n🚀 Starting MCP Server...\n');
    
    this.mcpProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    this.mcpProcess.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          
          if (response.id && this.pendingResponses.has(response.id)) {
            const resolver = this.pendingResponses.get(response.id);
            resolver(response);
            this.pendingResponses.delete(response.id);
          }
        } catch (e) {
          // Ignore non-JSON lines
        }
      }
    });

    // Get tools list
    await this.loadTools();
  }

  private async loadTools() {
    const response = await this.sendMCPRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });

    if (response.result?.tools) {
      this.tools = response.result.tools.map((t: any) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      }));
      
      console.log(`✅ Loaded ${this.tools.length} tools from MCP server\n`);
      this.displayAvailableTools();
    }
  }

  private displayAvailableTools() {
    console.log('📋 Available Tools:\n');
    
    const free = this.tools.filter(t => t.description.includes('FREE'));
    const premium = this.tools.filter(t => t.description.includes('💳'));
    const ultra = this.tools.filter(t => t.description.includes('💎'));

    if (free.length > 0) {
      console.log('🆓 FREE TIER:');
      free.forEach(t => console.log(`   - ${t.name}`));
      console.log();
    }

    if (premium.length > 0) {
      console.log('💳 PREMIUM TIER (requires payment):');
      premium.forEach(t => console.log(`   - ${t.name}`));
      console.log();
    }

    if (ultra.length > 0) {
      console.log('💎 ULTRA TIER (requires payment):');
      ultra.forEach(t => console.log(`   - ${t.name}`));
      console.log();
    }
  }

  private async sendMCPRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = request.id || Date.now();
      request.id = requestId;
      
      this.pendingResponses.set(requestId, resolve);
      
      const requestStr = JSON.stringify(request) + '\n';
      this.mcpProcess.stdin.write(requestStr);

      setTimeout(() => {
        if (this.pendingResponses.has(requestId)) {
          this.pendingResponses.delete(requestId);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    });
  }

  private async callMCPTool(toolName: string, args: any): Promise<any> {
    console.log(`\n🔧 Calling MCP tool: ${toolName}`);

    const response = await this.sendMCPRequest({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const result = response.result?.content?.[0]?.text;
    return result ? JSON.parse(result) : null;
  }

  private getSystemPrompt(): string {
    return `You are a helpful Cronos blockchain assistant with access to DeFi tools via the x402 micropayment system.

You can help users with:
- Checking balances and gas prices (FREE)
- Getting token prices (FREE)
- Analyzing portfolios (PREMIUM - costs USDCe)
- Finding arbitrage opportunities (PREMIUM)
- Executing swaps on VVS Finance (ULTRA)
- Auto-compounding rewards (ULTRA)

When users ask about swaps or trades, use the appropriate tools. Premium and Ultra tools require x402 payments in USDCe, which are handled automatically.

Always explain what you're doing and inform users about costs before executing paid tools.

For swaps, always:
1. Get a quote first
2. Explain the trade details
3. Ask for confirmation before executing (if it's a paid tool)

Be concise but helpful. Use emojis to make responses friendly.`;
  }

  private async chat(userMessage: string): Promise<string> {
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    let continueLoop = true;
    let finalResponse = '';

    while (continueLoop) {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: this.getSystemPrompt(),
        messages: this.conversationHistory as any,
        tools: this.tools as any,
      });

      const assistantContent: any[] = [];
      
      for (const block of response.content) {
        if (block.type === 'text') {
          finalResponse += block.text;
          assistantContent.push(block);
        } else if (block.type === 'tool_use') {
          assistantContent.push(block);
          
          try {
            const toolResult = await this.callMCPTool(block.name, block.input);
            
            // Add tool result to history
            this.conversationHistory.push({
              role: 'assistant',
              content: assistantContent,
            });

            this.conversationHistory.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(toolResult, null, 2),
              }],
            });

            // Continue loop to get Claude's response to the tool result
            continueLoop = true;
            break;
          } catch (error: any) {
            this.conversationHistory.push({
              role: 'assistant',
              content: assistantContent,
            });

            this.conversationHistory.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify({ error: error.message }),
                is_error: true,
              }],
            });

            continueLoop = true;
            break;
          }
        }
      }

      if (response.stop_reason === 'end_turn') {
        if (assistantContent.length > 0) {
          this.conversationHistory.push({
            role: 'assistant',
            content: assistantContent,
          });
        }
        continueLoop = false;
      }
    }

    return finalResponse;
  }

  async run() {
    await this.startMCPServer();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🤖 Cronos AI Agent with x402 Payments');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nType your questions or commands. Type "exit" to quit.\n');
    console.log('Examples:');
    console.log('  - "What\'s the current CRO price?"');
    console.log('  - "Check my balance at 0x..."');
    console.log('  - "Swap 10 CRO for USDC"');
    console.log('  - "Analyze my portfolio at 0x..."');
    console.log('═══════════════════════════════════════════════════════════\n');

    this.prompt();
  }

  private prompt() {
    this.rl.question('You: ', async (input: string) => {
      const trimmed = input.trim();

      if (trimmed.toLowerCase() === 'exit') {
        console.log('\n👋 Goodbye!\n');
        this.mcpProcess.kill();
        process.exit(0);
      }

      if (!trimmed) {
        this.prompt();
        return;
      }

      try {
        const response = await this.chat(trimmed);
        console.log(`\n🤖 Assistant: ${response}\n`);
      } catch (error: any) {
        console.log(`\n❌ Error: ${error.message}\n`);
      }

      this.prompt();
    });
  }
}

// Start the agent
const agent = new CronosAgent();
agent.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});