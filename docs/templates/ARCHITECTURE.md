# Architecture Overview

## System Diagram

```
┌─────────────┐     ┌─────────────┐
│   Module A  │────▶│   Module B  │
└─────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────┐
│          Shared Core            │
└─────────────────────────────────┘
```

## Core Modules

### [Module Name]

- **Location**: `src/core/ModuleName.js`
- **Purpose**: [What this module does]
- **Dependencies**: [What it depends on]
- **Dependents**: [What depends on it]

#### Key Methods

| Method      | Purpose   | Parameters     | Returns |
| ----------- | --------- | -------------- | ------- |
| `methodA()` | [Purpose] | `param1: Type` | `Type`  |

#### Usage Example

```javascript
// Brief usage example
```

## Data Flow

1. [Step 1]: [Description]
2. [Step 2]: [Description]
3. [Step 3]: [Description]

## State Management

### State Structure

```javascript
{
  // State shape with comments
}
```

### State Transitions

- `STATE_A` → `STATE_B`: [Trigger condition]
- `STATE_B` → `STATE_C`: [Trigger condition]

## Extension Points

### Adding New [Feature Type]

1. Create new file at `src/[location]/`
2. Extend `BaseClass`
3. Implement required methods: `methodA()`, `methodB()`
4. Register in `[registration location]`

## Performance Considerations

- [Consideration 1]: [Approach taken]
- [Consideration 2]: [Approach taken]
