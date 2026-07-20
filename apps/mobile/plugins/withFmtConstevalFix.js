const { withPodfile } = require('@expo/config-plugins');

// Newer Xcode/Clang enforces C++20 `consteval` strictly, which breaks the
// `fmt` pod (a transitive React Native/Folly dependency): several internal
// fmt::format_to(..., FMT_STRING("literal"), ...) calls in format-inl.h fail
// with "call to consteval function ... is not a constant expression".
// FMT_STRING(s) is just a macro that wraps a string literal to force
// compile-time format-string validation; dropping the macro around these
// literals falls back to fmt's normal runtime parsing and compiles cleanly.
// This has to be a source patch (not a build setting) because the failure
// is at the AST/consteval level, not something a preprocessor define
// controls. It runs from the Podfile's post_install hook, which CocoaPods
// executes after the pod source is checked out into ios/Pods/ but before
// Xcode builds it — so it re-applies on every `pod install`, including
// every `expo prebuild --clean`, rather than needing a manual patch step.
const MARKER = '# withFmtConstevalFix';

function withFmtConstevalFix(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes(MARKER)) return config;

    const anchor = 'post_install do |installer|';
    const anchorIndex = contents.indexOf(anchor);
    if (anchorIndex === -1) {
      console.warn('[withFmtConstevalFix] Could not find `post_install do |installer|` in Podfile; skipping fmt consteval patch.');
      return config;
    }

    const insertion = `${anchor}
    ${MARKER}
    fmt_format_inl = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'format-inl.h')
    if File.exist?(fmt_format_inl)
      fmt_source = File.read(fmt_format_inl)
      fmt_patched = fmt_source.gsub(/FMT_STRING\\((".*?")\\)/, '\\\\1')
      File.write(fmt_format_inl, fmt_patched) if fmt_patched != fmt_source
    end
`;

    config.modResults.contents = contents.replace(anchor, insertion);
    return config;
  });
}

module.exports = withFmtConstevalFix;
