function removeCommentStructure(code) {
    const regex = /(\s*(?:\/\*[\s\S]*?\*\/|\/\/.*|#.*|--.*|'''(.*?)'''|"(.*?)"|'(.*?)')*)?\s*\[\[(.*?)\]\]/;
    return code.replace(regex, '').trim();
}

module.exports = { removeCommentStructure };