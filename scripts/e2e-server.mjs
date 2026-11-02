// Test-only fault injection: no fault switches or fixture endpoints in production.
import { resolve } from 'node:path';
import { AISettings } from '../server/ai-settings.mjs';
import { Store } from '../server/store.mjs';
import { ResearchService } from '../server/service.mjs';
import { createApp } from '../server/app.mjs';
import { DemoResearcher } from '../server/providers/demo.mjs';
import { DemoPublisher } from '../server/providers/publisher.mjs';
import { LocalPublisher } from '../server/providers/publisher.mjs';
import { AgentPublisher } from '../server/agent-delivery.mjs';
import { CodexResearcher } from '../server/providers/codex.mjs';
import { TerminalManager, attachTerminalWebSocket } from '../server/terminal.mjs';
import { CodexTerminalResearcher } from '../server/providers/codex-terminal.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
const dir=mkdtempSync(resolve(tmpdir(),'research-e2e-')); const store=new Store(resolve(dir,'test.sqlite')); const failures=new Set();
const aiSettings = new AISettings(dir, { dshAvailable: () => true });
const terminals = new TerminalManager(store, { aiSettings, dshCommand: process.execPath, dshPrefixArgs: [resolve('tests/fixtures/fake-dsh.mjs')], command: process.execPath, prefixArgs: [resolve('tests/fixtures/fake-terminal.mjs')], workRoot: resolve(dir, 'pty'), settleMs: 200, pollMs: 20 });
const researcher={ async run(task, hooks) { if (task.ai?.agent === 'dsh') { task.mode = 'codex'; return new CodexTerminalResearcher(terminals).run(task, hooks); } if (/CLI 页面验收|PTY 页面验收/.test(task.direction)) task.mode = 'codex'; if (task.direction.includes('PTY 页面验收')) return new CodexTerminalResearcher(terminals).run(task, hooks); if (task.direction.includes('CLI 页面验收')) return new CodexResearcher({ aiSettings, dshCommand: process.execPath, dshPrefixArgs: [resolve('tests/fixtures/fake-dsh.mjs')], command: process.execPath, prefixArgs: [resolve('tests/fixtures/fake-codex.mjs')], workRoot: resolve(dir, 'cli') }).run(task, hooks); const fault=task.direction.includes('调研故障验收')&&!failures.has(task.id); failures.add(task.id); return new DemoResearcher({delayMs:250,failResearch:fault}).run(task,hooks); } };
const publisher={ async publish(task,persist,signal) { if (task.ai?.agent === 'dsh' || task.direction.includes('PTY 页面验收')) return new AgentPublisher(store, terminals).publish(task,persist,signal); if (task.direction.includes('CLI 页面验收')) return new LocalPublisher(store).publish(task,persist,signal); const key=`pub-${task.id}`; const fault=task.direction.includes('发布故障验收')&&!failures.has(key); failures.add(key); return new DemoPublisher(store,{failPublish:fault}).publish(task,persist,signal); } };
const service=new ResearchService(store,researcher,publisher); const server=createApp(service).listen(3099,'127.0.0.1');
terminals.onDelivery = (id, terminalId, receipt) => service.recordAgentDelivery(id, terminalId, receipt);
terminals.onSessionExit = (id, terminalId) => service.agentTerminalExited(id, terminalId);
service.terminals = terminals; service.aiSettings = aiSettings; const sockets = attachTerminalWebSocket(server, terminals);
async function stop(){sockets.close();server.closeAllConnections();server.close();await service.close();await terminals.close();store.close();rmSync(dir,{recursive:true,force:true});}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
