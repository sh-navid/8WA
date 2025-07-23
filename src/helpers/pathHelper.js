'use strict';

function commentPath(pathStr, data) {
  const extension = pathStr.split('.').pop();
  const commentStyles = {
    js: `/* {path} */`,
    jsx: `/* {path} */`,
    ts: `/* {path} */`,
    py: `# {path}`,
    java: `// {path}`,
    c: `// {path}`,
    cpp: `// {path}`,
    css: `/* {path} */`,
    html: `<!-- {path} -->`,
    php: `// {path}`,
    rb: `# {path}`,
    go: `// {path}`,
    kt: `// {path}`,
    sql: `-- {path}`,
    sh: `# {path}`,
    r: `# {path}`,
    vb: `' {path}`,
    cs: `// {path}`,
    ml: `(* {path} *)`,
    yaml: `# {path}`,
    json: `/* {path} */`
  };

  const commentStyle = commentStyles[extension] || `/* {path} */`;
  return commentStyle.replace(/{path}/g, data);
}

module.exports = { commentPath };