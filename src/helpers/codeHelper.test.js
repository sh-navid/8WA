const { removeCommentStructure } = require('./codeHelper');
const assert = require('assert');

describe('codeHelper Tests', function () {
  test('removeCommentStructure should handle different types of comments', function () {
    const code1 = '// [[src/index.js]]';
    const code2 = '# [[src/index.py]]';
    const code3 = '-- [[src/index.sql]]';
    const code4 = '"""[[src/index.py]]"""';
    const code5 = "'''[[index.py]]'''";
    const code6 = '/* [[src/utils/myUtil.js]] */';
    const code7 = '<!-- [[src/index.html]] -->';
    const code8 = 'const x = 1; // [[src/index.js]]';
    const code9 = 'const x = 1;/* [[src/utils/myUtil.js]] */';
    const code10 = 'const x = 1;/** [[src/utils/myUtil.js]] **/';
    const code11 = '<!--[[src/index.html]]-->';

    assert.strictEqual(removeCommentStructure(code1), '');
    assert.strictEqual(removeCommentStructure(code2), '');
    assert.strictEqual(removeCommentStructure(code3), '');
    assert.strictEqual(removeCommentStructure(code4), '');
    assert.strictEqual(removeCommentStructure(code5), '');
    assert.strictEqual(removeCommentStructure(code6), '');
    assert.strictEqual(removeCommentStructure(code7), '');
    assert.strictEqual(removeCommentStructure(code8), 'const x = 1;');
    assert.strictEqual(removeCommentStructure(code9), 'const x = 1;');
    assert.strictEqual(removeCommentStructure(code10), 'const x = 1;');
    assert.strictEqual(removeCommentStructure(code11), '');
  });
});