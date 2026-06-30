# VozArt Phase 4 Implementation - Sprint 1: Context and Streaming

## Overview
This document outlines the sprint 1 implementation plan for VozArt Phase 4, focusing on Context Management and Real-Time AI Streaming. This sprint will establish the foundation for real-time art creation with context awareness.

## Sprint Overview

### Sprint Duration: Week 1
### Goal: Implement Context Management and Streaming System

## Implementation Details

### 1. Context Management System

#### Context Types
We need to support different types of context for AI understanding:

```typescript
interface AIContext {
  // User interaction history
  recentCommands: AppCommand[]
  // Current art state
  currentElements: FabricObject[]
  // User patterns and preferences
  userPatterns: UserPattern[]
  // Session information
  sessionId: string
  // Workspace/room information for collaborative projects
  workspaceId?: string
  // Time-based context for art evolution
  sessionStartTime: number
  lastUserInteraction: number
}
```

#### Context Storage

```typescript
interface ContextStorage {
  // Current active context
  current: AIContext | null
  // Historical contexts for reference
  history: AIContext[]
  // Maximum contexts to keep
  maxContexts: number
  // Context cleanup threshold
  maxCommandsPerContext: number
}
```

#### Context Manager Class

```typescript
class AIContextManager {
  private storage: ContextStorage
  private contextChangeCallbacks: ((context: AIContext) => void)[]
  
  constructor() {
    this.storage = {
      current: null,
      history: [],
      maxContexts: 10,
      maxCommandsPerContext: 100
    }
    this.contextChangeCallbacks = []
  }
  
  // Initialize new context for a session
  public startContext(): void {
    const newContext: AIContext = {
      recentCommands: [],
      currentElements: [],
      userPatterns: [],
      sessionId: this.generateSessionId(),
      sessionStartTime: Date.now(),
      lastUserInteraction: Date.now()
    }
    
    // Save previous context to history
    if (this.storage.current) {
      this.storage.history.unshift(this.storage.current)
      if (this.storage.history.length > this.storage.maxContexts) {
        this.storage.history.pop()
      }
    }
    
    this.storage.current = newContext
    this.notifyContextChange()
  }
  
  // Add a command to current context
  public addCommand(command: AppCommand): void {
    if (!this.storage.current) {
      this.startContext()
    }
    
    this.storage.current.recentCommands.push(command)
    this.storage.current.lastUserInteraction = Date.now()
    
    // Clean old commands if exceeding limit
    if (this.storage.current.recentCommands.length > this.storage.maxCommandsPerContext) {
      this.storage.current.recentCommands.shift()
    }
    
    // Analyze and update patterns
    this.updateUserPatterns(command)
    
    this.notifyContextChange()
  }
  
  // Update user patterns based on commands
  private updateUserPatterns(command: AppCommand): void {
    if (!this.storage.current) return
    
    const patterns: UserPattern[] = []
    
    // Analyze color preferences
    if (command.type === 'AI_ACTION' && command.data) {
      const data = command.data
      if (data.color) {
        patterns.push({ type: 'colorPreference', value: data.color, frequency: 1 })
      }
      if (data.shape) {
        patterns.push({ type: 'shapePreference', value: data.shape, frequency: 1 })
      }
    }
    
    // Analyze style patterns
    this.storage.current.userPatterns.push(...patterns)
  }
  
  // Get current context
  public getCurrentContext(): AIContext | null {
    return this.storage.current
  }
  
  // Clear current context
  public clearContext(): void {
    if (this.storage.current) {
      this.storage.history.unshift(this.storage.current)
      this.storage.current = null
      this.notifyContextChange()
    }
  }
  
  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  // Subscribe to context changes
  public subscribe(callback: (context: AIContext) => void): () => void {
    this.contextChangeCallbacks.push(callback)
    return () => {
      const index = this.contextChangeCallbacks.indexOf(callback)
      if (index > -期) {
        this.contextChangeCallbacks.splice(index, 1)
      }
    }
  }
  
  // Notify all subscribers of context change
  private notifyContextChange(): void {
    const current = this.storage.current
    if (current) {
      this.contextChangeCallbacks.forEach(callback => callback(current))
    }
  }
}
```

### 2. Streaming System

#### Action Types

```typescript
interface AIAction {
  id: string
  type: 'CREATE' | 'EDIT' | 'REFINE' | 'EXPLAIN' | 'ERROR'
  payload: any
  timestamp: number
  completed: boolean
  context?: {
    sessionId?: string
    sequence?: number
    relatedTo?: string[]
  }
}
```

#### Stream Manager Class

```typescript
class AIStreamManager {
  private actions: AIAction[]
  private streamingInterval: number | null
  private subscribers: ((action: AIAction) => void)[]
  private actionSequence: number
  
  constructor() {
    this.actions = []
    this.streamingInterval = null
    this.subscribers = []
    this.actionSequence = 0
  }
  
  // Stream an action to subscribers
  public streamAction(action: AIAction): void {
    this.actions.push(action)
    this.notifySubscribers(action)
  }
  
  // Start streaming interval
  public startStreaming(interval: number = 1000): void {
    this.streamingInterval = setInterval(() => {
      this.processStreamedActions()
    }, interval)
  }
  
  // Stop streaming
  public stopStreaming(): void {
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval)
      this.streamingInterval = null
    }
  }
  
  // Process queued actions
  private processStreamedActions(): void {
    if (this.actions.length === 0) return
    
    const action = this.actions.shift()
    if (action) {
      this.notifySubscribers(action)
      action.completed = true
    }
  }
  
  // Subscribe to stream events
  public subscribe(callback: (action: AIAction) => void): () => void {
    this.subscribers.push(callback)
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }
  
  // Notify all subscribers of new action
  private notifySubscribers(action: AIAction): void {
    this.subscribers.forEach(callback => callback(action))
  }
  
  // Get streaming status
  public getStreamingStatus(): {
    pendingActions: number
    streaming: boolean
  } {
    return {
      pendingActions: this.actions.length,
      streaming: this.streamingInterval !== null
    }
  }
}
```

### 3. Real-Time AI Integration

#### Service Class

```typescript
class RealTimeAIService {
  private contextManager: AIContextManager
  private streamManager: AIStreamManager
  private apiKey: string
  private model: string
  
  constructor(apiKey: string, model: string) {
    this.contextManager = new AIContextManager()
    this.streamManager = new AIStreamManager()
    this.apiKey = apiKey
    this.model = model
  }
  
  // Process user input with context
  public async processWithContext(input: string, context?: any): Promise<AIAction[]> {
    // Get current context
    const currentContext = this.contextManager.getCurrentContext()
    
    // If no context, start new one
    if (!currentContext) {
      this.contextManager.startContext()
    }
    
    // Create system prompt with context
    const systemPrompt = this.buildSystemPrompt(currentContext)
    
    // Call AI API with context
    const response = await this.callAIAPI(input, systemPrompt)
    
    // Parse and stream actions
    const actions = this.parseActions(response)
    
    // Add commands to context
    if (currentContext) {
      actions.forEach(action => {
        this.contextManager.addCommand({
          type: 'AI_ACTION',
          data: action,
          timestamp: Date.now()
        })
      })
    }
    
    // Stream actions
    this.streamManager.startStreaming(1000)
    actions.forEach(action => {
      this.streamManager.streamAction(action)
    })
    
    return actions
  }
  
  // Build system prompt with context
  private buildSystemPrompt(context: AIContext | null): string {
    let prompt = `You are a creative AI assistant for VozArt. `
    
    if (context) {
      prompt += `\nRecent user commands: ${context.recentCommands.map(c => 
        c.type === 'AI_ACTION' ? c.data.action || 'unknown' : 
        c.type === 'ERROR' ? 'ERROR' : 'COMMAND'
      ).join(', ')}\n\n`
      
      if (context.userPatterns.length > 0) {
        prompt += 'User patterns: ' + context.userPatterns.map(p => 
          `${p.type}(${p.value}): ${p.frequency}`
        ).join(', ') + '\n\n'
      }
    }
    
    prompt += `Please respond with a JSON array of actions. Each action should be an object with 'action' field.
    \nAvailable actions:
    - {"action": "CREATE", ...shape, color, size settings}
    - {"action": "EDIT", ...target, properties}
    - {"action": "REFINE", ...target, adjustments}
    - {"action": "EXPLAIN", ...explanation}
    - {"action": "ERROR", ...message}
    \nIf user requests multiple actions, return an array of actions.
    \nRespond ONLY with valid JSON array.`
    
    return prompt
  }
  
  // Call AI API
  private async callAIAPI(input: string, systemPrompt: string): Promise<string> {
    // Implement actual API call here
    // This is a placeholder for the actual implementation
    return JSON.stringify([
      {
        action: 'CREATE',
        shape: 'rect',
        color: '#FF5733',
        size: 120
      },
      {
        action: 'REFINE',
        target: 'selected',
        color: '#C70039'
      }
    ])
  }
  
  // Parse and validate actions
  private parseActions(response: string): AIAction[] {
    try {
      const parsed = JSON.parse(response)
      if (Array.isArray(parsed)) {
        return parsed
      }
      return [parsed]
    } catch (error) {
      return [{
        id: Date.now().toString(),
        type: 'ERROR',
        payload: { message: 'Failed to parse AI response' },
        timestamp: Date.now(),
        completed: true
      }]
    }
  }
  
  // Get current context
  public getCurrentContext(): AIContext | null {
    return this.contextManager.getCurrentContext()
  }
  
  // Update context based on user interaction
  public recordUserInteraction(command: AppCommand): void {
    this.contextManager.addCommand(command)
  }
  
  // Clear context
  public clearContext(): void {
    this.contextManager.clearContext()
  }
}
```

### 4. Integration with App Components

#### App.tsx Integration

```typescript
import { useState, useEffect, useCallback } from 'react'
import { RealTimeAIService } from './services/RealTimeAIService'

export default function App() {
  const [aiService, setAIService] = useState<RealTimeAIService | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamStatus, setStreamStatus] = useState({ pendingActions: 0, streaming: false })
  
  useEffect(() => {
    // Initialize AI service with API key and model
    const service = new RealTimeAIService(
      process.env.GEMINI_API_KEY || '',
      'gemini-2.0-flash'
    )
    setAIService(service)
  }, [])
  
  useEffect(() => {
    if (!aiService) return
    
    // Subscribe to stream changes
    const unsubscribe = aiService.streamManager.subscribe((action) => {
      setStreamStatus(aiService.streamManager.getStreamingStatus())
      
      // Add action to commands
      addCommand({
        type: 'AI_ACTION',
        data: action,
        timestamp: Date.now()
      })
    })
    
    return unsubscribe
  }, [aiService])
  
  const handleSendCommand = useCallback(async (text: string) => {
    if (!aiService) return
    
    setIsProcessing(true)
    
    try {
      const actions = await aiService.processWithContext(text)
      setStreamStatus(aiService.streamManager.getStreamingStatus())
    } catch (error) {
      addCommand({
        type: 'ERROR',
        data: {
          action: 'ERROR',
          message: 'Failed to process command'
        },
        timestamp: Date.now()
      })
    } finally {
      setIsProcessing(false)
    }
  }, [aiService, addCommand])
  
  return (
    <div>
      {/* Voice Control with processing indicator */}
      <VoiceControl 
        onSendCommand={handleSendCommand}
        isProcessing={isProcessing}
      />
      
      {/* Canvas component */}
      <CanvasInclusivo commands={commands} />
      
      {/* Stream status display */}
      {streamStatus.pendingActions > 0 && (
        <div className="stream-status">
          Pending AI actions: {streamStatus.pendingActions}
        {streamStatus.streaming && <span> (streaming...)</span>}
        </div>
      )}
    </div>
  )
}
```

### 5. CSS for Streaming Animation

```css
.stream-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 1000;
  transition: all 0.3s ease;
}

.stream-status.streaming {
  background: rgba(59, 130, 246, 0.9);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}
```

## Testing Strategy

### Unit Tests

#### ContextManager Tests
```typescript
describe('AIContextManager', () => {
  let contextManager: AIContextManager
  
  beforeEach(() => {
    contextManager = new AIContextManager()
  })
  
  it('should start with no context', () => {
    expect(contextManager.getCurrentContext()).toBeNull()
  })
  
  it('should start new context when adding command', () => {
    expect(contextManager.getCurrentContext()).toBeNull()
    
    contextManager.addCommand({ type: 'AI_ACTION', data: { action: 'ADD_SHAPE' } })
    
    expect(contextManager.getCurrentContext()).not.toBeNull()
    expect(contextManager.getCurrentContext()?.recentCommands.length).toBe(1)
  })
  
  it('should track user patterns', () => {
    contextManager.addCommand({
      type: 'AI_ACTION',
      data: { action: 'ADD_SHOf color: '#FF0000' }
    })
    
    const context = contextManager.getCurrentContext()
    expect(context?.userPatterns.length).toBeGreaterThan(0)
  })
})
```

#### StreamManager Tests

```typescript
describe('AIStreamManager', () => {
  let streamManager: AIStreamManager
  
  beforeEach(() => {
    streamManager = new AIStreamManager()
  })
  
  it('should start with no actions', () => {
    expect(streamManager.getStreamingStatus().pendingActions).toBe(0)
  })
  
  it('should stream actions', (done) => {
    const action: AIAction = {
      id: 'test-action',
      type: 'CREATE',
      payload: { shape: 'rect' },
      timestamp: Date.now(),
      completed: false
    }
    
    streamManager.streamAction(action)
    
    expect(streamManager.getStreamingStatus().pendingActions).toBe(1)
    
    done()
  })
})
```

### Integration Tests

#### Real-Time AI Service Integration

```typescript
describe('RealTimeAIService', () => {
  let aiService: RealTimeAIService
  
  beforeEach(() => {
    aiService = new RealTimeAIService('test-api-key', 'gemini-2.0-flash')
  })
  
  it('should process user input with context', async () => {
    const result = await aiService.processWithContext('Create a red square')
    
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].type).toBeDefined()
  })
  
  it('should track user interactions', async () => {
    await aiService.processWithContext('Create something')
    
    const context = aiService.getCurrentContext()
    expect(context?.recentCommands.length).toBeGreaterThan(0)
  })
})
```

## Deployment Considerations

### Production Environment

#### Environment Variables

```bash
# AI API Configuration
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.0-flash

# Application Configuration
VITE_SERVER_URL=http://localhost:3000
VITE_APP_ACCESS_TOKEN=your-access-token

# Streaming Configuration
STREAM_INTERVAL=1000
MAX_CONTEXT_COMMANDS=100
MAX_CONTEXT_HISTORY=10
```

#### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Configuration Management

#### Configuration Schema

```typescript
interface AppConfig {
  ai: {
    apiKey: string
    model: string
    streamingInterval: number
  }
  server: {
    port: number
    host: string
    corsOrigins: string[]
  }
  streaming: {
    maxPendingActions: number
    enableStreaming: boolean
  }
  accessibility: AccessibilitySettings
}
```

## Performance Considerations

### Memory Management

#### Context Cleanup
```typescript
// Limit context size to prevent memory leaks
if (context.recentCommands.length > MAX_CONTEXT_COMMANDS) {
  // Remove oldest commands
  context.recentCommands.shift(MAX_CONTEXT_COMMANDS / 2)
}
if (context.userPatterns.length > 100) {
  // Keep most frequent patterns only
  context.userPatterns.sort((a, b) => b.frequency - a.frequency)
  context.userPatterns = context.userPatterns.slice(0, 50)
}
```

### Network Optimization

#### Request Batching
```typescript
// Batch multiple user commands into single API request
private batchRequests(commands: AppCommand[]): Promise<AIResponse> {
  if (commands.length === 1) {
    return this.callAIAPI(commands[0].data)
  }
  
  // Combine into single instruction
  const combinedInstruction = commands.map(c => 
    c.type === 'AI_ACTION' ? c.data : c
  ).join('; ')
  
  return this.callAIAPI(combinedInstruction)
}
```

## Error Handling

### Context Errors

```typescript
class ContextError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'ContextError'
  }
}
```

### Streaming Errors

```typescript
class StreamingError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'StreamingError'
  }
}
```

## Testing Requirements Summary

| Test Type | Coverage | Frequency |
|-----------|----------|-----------|
| Unit Tests | Context, Streaming, Service | Every commit |
| Integration Tests | Component interactions | Daily |
| E2E Tests | User workflows | Weekly |
| Performance Tests | Response times, memory | Post-release |
| Security Tests | API endpoints, data | Monthly |

## Future Enhancements

### Upcoming Features

1. **Advanced Context Types**
   - Emotional state tracking
   - Time-based interaction patterns
   - Device and environment context

2. **Streaming Optimizations**
   - Differential updates
   - Conflict resolution
   - Offline capability

3. **Advanced AI Features**
   - Multi-turn conversation memory
   - Style learning and adaptation
   - Creative guidance suggestions

This sprint 1 implementation provides the foundation for real-time, context-aware AI in VozArt, setting the stage for more advanced features and improvements in future sprints.

---

*This implementation plan follows Agile principles and can be implemented incrementally, with each sprint building on the previous work.*