const assert = require('assert');
const { commentPath } = require('../src/extension'); // Adjust the path as necessary

suite('commentPath Suite', function () {
  test('should return JS comment format for .js files', function () {
    const result = commentPath('file.js', 'Test comment');
    assert.strictEqual(result, '/* Test comment */');
  });

  test('should return Python comment format for .py files', function () {
    const result = commentPath('file.py', 'Test comment');
    assert.strictEqual(result, '# Test comment');
  });

  test('should return SQL comment format for .sql files', function () {
    const result = commentPath('file.sql', 'Test comment');
    assert.strictEqual(result, '-- Test comment');
  });

  test('should return default comment format for unknown extensions', function () {
    const result = commentPath('file.txt', 'Test comment');
    assert.strictEqual(result, '/* Test comment */');
  });

  test('should return C# comment format for .cs files', function () {
    const result = commentPath('file.cs', 'Test comment');
    assert.strictEqual(result, '// Test comment');
  });

  // Add more tests for other file extensions as needed
});
