export default function TypefaceFacts({ typeface, styleCount }) {
  const metadata = [
    ['Release date', typeface.releaseDate], ['Current version', typeface.version],
    ['Available formats', typeface.formats], ['Variable file', typeface.variableFile],
    ['Design', typeface.designer],
  ].filter(([, value]) => value)
  return <section className="typeface-detail__facts">
    <div>
      <p>Number of fonts in a family: {styleCount}</p>
      {metadata.length > 0 && <p>{metadata.map(([label, value]) => <span className="typeface-detail__fact-row" key={label}>{label}: {value}</span>)}</p>}
    </div>
    <div>{typeface.openTypeFeatures && <><strong>OpenType Features:</strong><p>{typeface.openTypeFeatures}</p></>}</div>
    <div>{typeface.supportedLanguages && <><strong>Supported Languages:</strong><p>{typeface.supportedLanguages}</p></>}{typeface.trialInfo && <p>{typeface.trialInfo}</p>}</div>
  </section>
}
