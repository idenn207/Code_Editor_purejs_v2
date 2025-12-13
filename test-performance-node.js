/**
 * Node.js Performance Test for Tokenizer
 * Tests tokenization performance without browser DOM overhead
 *
 * Run: node test-performance-node.js
 */

// Mock minimal DOM APIs for Node.js
global.document = {
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    getBoundingClientRect: () => ({ width: 8, height: 20 }),
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

// Dynamic import for ES modules
async function runTests() {
  const { Tokenizer, TokenizerState } = await import('./src/tokenizer/Tokenizer.js');

  console.log('='.repeat(60));
  console.log('TOKENIZER PERFORMANCE TEST');
  console.log('='.repeat(60));

  // Generate test code
  function generateLines(count) {
    const lines = [];
    for (let i = 0; i < count; i++) {
      const indent = '  '.repeat(i % 4);
      const templates = [
        `${indent}const variable${i} = ${i * 2};`,
        `${indent}function func${i}(a, b) { return a + b + ${i}; }`,
        `${indent}// Comment line ${i}`,
        `${indent}if (condition${i}) { console.log("line ${i}"); }`,
        `${indent}const obj${i} = { key: "value", num: ${i} };`,
        `${indent}for (let j = 0; j < ${i}; j++) { sum += j; }`,
        `${indent}class MyClass${i} extends BaseClass { }`,
        `${indent}const arr${i} = [1, 2, 3, ${i}];`,
        `${indent}async function async${i}() { await fetch(url); }`,
        `${indent}export const exported${i} = "${i}";`
      ];
      lines.push(templates[i % templates.length]);
    }
    return lines;
  }

  const lines1000 = generateLines(1000);
  const lines5000 = generateLines(5000);

  // Test 1: Full tokenization of 1000 lines
  console.log('\n📊 Test 1: Full tokenization of 1000 lines');
  console.log('-'.repeat(40));

  const tokenizer = new Tokenizer('javascript');
  let state = TokenizerState.initial();

  const fullStart = performance.now();
  for (let i = 0; i < lines1000.length; i++) {
    const result = tokenizer.getLineTokens(i, lines1000[i], state);
    state = result.endState;
  }
  const fullEnd = performance.now();

  console.log(`Total time: ${(fullEnd - fullStart).toFixed(2)}ms`);
  console.log(`Per line: ${((fullEnd - fullStart) / 1000).toFixed(4)}ms`);

  // Test 2: Tokenization with cache (simulating re-render)
  console.log('\n📊 Test 2: Re-tokenization with cache (1000 lines)');
  console.log('-'.repeat(40));

  // First pass to populate cache
  tokenizer.invalidateFrom(0);
  state = TokenizerState.initial();
  for (let i = 0; i < lines1000.length; i++) {
    const result = tokenizer.getLineTokens(i, lines1000[i], state);
    state = result.endState;
  }

  // Second pass (should use cache)
  const cacheStart = performance.now();
  state = TokenizerState.initial();
  for (let i = 0; i < lines1000.length; i++) {
    const result = tokenizer.getLineTokens(i, lines1000[i], state);
    state = result.endState;
  }
  const cacheEnd = performance.now();

  console.log(`Cached time: ${(cacheEnd - cacheStart).toFixed(2)}ms`);
  console.log(`Speedup: ${((fullEnd - fullStart) / (cacheEnd - cacheStart)).toFixed(2)}x`);

  // Test 3: Single line edit simulation
  console.log('\n📊 Test 3: Single line edit at line 500 (invalidate + retokenize)');
  console.log('-'.repeat(40));

  const editTimes = [];

  for (let iteration = 0; iteration < 100; iteration++) {
    // Simulate editing line 500
    const editStart = performance.now();

    // Invalidate from line 500
    tokenizer.invalidateFrom(500);

    // Re-tokenize from line 500 to end (simulating what _renderLines does)
    // But in hybrid mode, we only tokenize visible lines (let's say 30 lines visible)
    const visibleEnd = Math.min(530, lines1000.length - 1);

    // Get state for line 500 (need to build up state from cached lines)
    state = TokenizerState.initial();
    for (let i = 0; i < 500; i++) {
      const result = tokenizer.getLineTokens(i, lines1000[i], state);
      state = result.endState;
    }

    // Tokenize visible range
    for (let i = 500; i <= visibleEnd; i++) {
      const result = tokenizer.getLineTokens(i, lines1000[i], state);
      state = result.endState;
    }

    const editEnd = performance.now();
    editTimes.push(editEnd - editStart);
  }

  const avgEdit = editTimes.reduce((a, b) => a + b, 0) / editTimes.length;
  const minEdit = Math.min(...editTimes);
  const maxEdit = Math.max(...editTimes);

  console.log(`Average edit + retokenize: ${avgEdit.toFixed(2)}ms`);
  console.log(`Min: ${minEdit.toFixed(2)}ms | Max: ${maxEdit.toFixed(2)}ms`);

  // Test 4: State lookup performance
  console.log('\n📊 Test 4: State lookup for line 500 (no cache vs cached)');
  console.log('-'.repeat(40));

  // Without cache - need to tokenize from beginning
  tokenizer.invalidateFrom(0);
  const noCacheStart = performance.now();
  state = TokenizerState.initial();
  for (let i = 0; i < 500; i++) {
    const result = tokenizer.getLineTokens(i, lines1000[i], state);
    state = result.endState;
  }
  const noCacheEnd = performance.now();
  console.log(`State lookup (no cache): ${(noCacheEnd - noCacheStart).toFixed(2)}ms`);

  // With cache - should be instant
  const withCacheStart = performance.now();
  // Simulate having cached states - just look up
  state = TokenizerState.initial();
  for (let i = 0; i < 500; i++) {
    const result = tokenizer.getLineTokens(i, lines1000[i], state);
    state = result.endState;
  }
  const withCacheEnd = performance.now();
  console.log(`State lookup (with cache): ${(withCacheEnd - withCacheStart).toFixed(2)}ms`);

  // Test 5: Large file test (5000 lines)
  console.log('\n📊 Test 5: Large file tokenization (5000 lines)');
  console.log('-'.repeat(40));

  const largeTokenizer = new Tokenizer('javascript');
  state = TokenizerState.initial();

  const largeStart = performance.now();
  for (let i = 0; i < lines5000.length; i++) {
    const result = largeTokenizer.getLineTokens(i, lines5000[i], state);
    state = result.endState;
  }
  const largeEnd = performance.now();

  console.log(`Total time: ${(largeEnd - largeStart).toFixed(2)}ms`);
  console.log(`Per line: ${((largeEnd - largeStart) / 5000).toFixed(4)}ms`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY & ANALYSIS');
  console.log('='.repeat(60));

  console.log(`
Key Findings:
1. Full tokenization of 1000 lines: ${(fullEnd - fullStart).toFixed(2)}ms
2. Cached tokenization: ${(cacheEnd - cacheStart).toFixed(2)}ms
3. Single edit retokenization: ${avgEdit.toFixed(2)}ms avg

If you're seeing 300ms per input, the bottleneck is likely:
- DOM operations (createElement, innerHTML, appendChild) for 1000 elements
- NOT tokenization itself (${avgEdit.toFixed(2)}ms is fast)

Recommendations:
1. Don't recreate all DOM elements on each edit
2. Use incremental DOM updates (only update changed lines)
3. Reuse existing DOM elements instead of innerHTML = ''
`);
}

runTests().catch(console.error);
