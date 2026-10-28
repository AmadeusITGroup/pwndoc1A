const html2ooxml = require('../src/lib/html2ooxml');

describe('report code blocks', () => {
  test('keeps a multiline code block in one paragraph with soft line breaks', () => {
    const xml = html2ooxml('<pre><code class="language-plaintext">first\n  second\nthird</code></pre>');
    expect(xml.match(/<w:pStyle w:val="Code"\/>/g)).toHaveLength(1);
    expect(xml.match(/<w:br\/>/g)).toHaveLength(2);
    expect(xml).toContain('  second');
  });

  test('does not merge adjacent code blocks separated by prose', () => {
    const xml = html2ooxml('<pre><code>a\nb</code></pre><p>Between</p><pre><code>c\nd</code></pre>');
    expect(xml.match(/<w:pStyle w:val="Code"\/>/g)).toHaveLength(2);
    expect(xml.match(/<w:br\/>/g)).toHaveLength(2);
    expect(xml).toContain('Between');
  });

  test('preserves a normal paragraph line break', () => {
    const xml = html2ooxml('<p>Before<br>After</p>');
    expect(xml.match(/<w:p>/g)).toHaveLength(1);
    expect(xml.match(/<w:br\/>/g)).toHaveLength(1);
  });
});
