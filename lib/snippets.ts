// Copy-paste request snippet generators for a given endpoint.

export function curlSnippet(endpoint: string): string {
  return `curl -s "${endpoint}"`;
}

export function fetchSnippet(endpoint: string): string {
  return `const res = await fetch("${endpoint}");
const data = await res.json();
console.log(data);`;
}
