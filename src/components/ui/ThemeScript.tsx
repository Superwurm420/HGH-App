export function ThemeScript() {
  const code = `(() => {
    const mode = localStorage.getItem('hgh:theme') || 'system';
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('light', !isDark);
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
