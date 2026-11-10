// Bundled editorial content for local mode and initial CMS drafts.

export const navLinks = [
  { label: 'Research', path: '/research' },
  { label: 'Publications', path: '/publications' },
  { label: 'Typefaces', path: '/typefaces' },
  { label: 'About', path: '/about' },
]

export const heroText =
  'A research project and typeface exploring Cyrillic ÉMIGRÉ periodicals of the first half of the twentieth century, examining how emigrant communities preserved cultural identity abroad through print and reinterpreting these historical models in a contemporary typeface.'

export const researchItems = [
  {
    id: 'typography-in-emigrant-publications',
    title: 'Typography in Emigrant publications',
    font: 'source-serif-4',
    summary:
      'Explore how typography shaped the visual identity of Russian, Ukrainian, and Belarusian émigré publications across Europe in the first half of the twentieth century.',
  },
  {
    id: 'publications-in-prague-archive',
    title: 'Publications published in an emigrant environment in Prague archive',
    font: 'unbounded',
    summary:
      'Discover émigré publications preserved in Prague\u2019s archives and explore their typographic and cultural significance.',
  },
]

export const researchPageItems = [
  ...researchItems.map((item, index) => ({ ...item, style: index === 0 ? 'serif' : 'sans' })),
  { id: 'typography-shifts', title: 'Typography Shifts: Late 19th Century to Soviet Era', summary: 'Discover émigré publications preserved in Prague’s archives and explore their typographic and cultural significance.', style: 'sans' },
  { id: 'white-emigration', title: 'A Brief Sketch of the History of White Emigration', summary: 'Discover émigré publications preserved in Prague’s archives and explore their typographic and cultural significance.', style: 'sans' },
  { id: 'ukrainska-typografie', title: 'UKRAJINSKÁ TYPOGRAFIE A EMIGRACE V PRVNÍ POLOVINĚ 20. STOLETÍ', summary: 'Discover émigré publications preserved in Prague’s archives and explore their typographic and cultural significance.', style: 'serif' },
]

// Single source of truth for Research cards. Both the home preview and the
// Research catalogue render these records, so their copy and destinations stay in sync.
export const researchArticles = [
  {
    id: 'typography-in-emigrant-publications',
    title: 'Typography in Emigrant publications',
    font: 'source-serif-4',
    summary: 'Explore how typography shaped the visual identity of Russian, Ukrainian, and Belarusian émigré publications across Europe in the first half of the twentieth century.',
    style: 'serif',
  },
  {
    id: 'publications-in-prague-archive',
    title: 'Publications published in an emigrant environment in Prague archive',
    font: 'unbounded',
    summary: 'Discover émigré publications preserved in Prague’s archives and explore their typographic and cultural significance.',
    style: 'sans',
  },
  {
    id: 'typography-shifts',
    title: 'Typography Shifts: Late 19th Century to Soviet Era',
    font: 'russo-one',
    summary: 'Discover émigré publications preserved in Prague’s archives and explore their typographic and cultural significance.',
    style: 'sans',
  },
  {
    id: 'white-emigration',
    title: 'A Brief Sketch of the History of White Emigration',
    font: 'inter',
    summary: 'Discover émigré publications preserved in Prague’s archives and explore their typographic and cultural significance.',
    style: 'sans',
  },
  {
    id: 'ukrainska-typografie',
    font: 'ruslan-display',
    title: 'UKRAJINSKÁ TYPOGRAFIE A EMIGRACE V PRVNÍ POLOVINĚ 20. STOLETÍ',
    summary: 'Discover émigré publications preserved in Prague’s archives and explore their typographic and cultural significance.',
    style: 'serif',
  },
]

export const publications = [
  { id: 'satirakon', title: 'Сатириконъ' },
  { id: 'ukrainske-slovo', title: 'Українське слово' },
  { id: 'morskoy-zhurnal', title: 'Морской журналъ' },
  { id: 'zhittya', title: 'Життя' },
  { id: 'russkiy-magazin', title: 'Русский магазинъ' },
  { id: 'podderzhka', title: 'Подсказка' },
  { id: 'kadora', title: 'Кадора' },
  { id: 'rul', title: 'Руль' },
  { id: 'ukrainskiy-skitalets', title: 'Український скиталецъ' },
  { id: 'belaruski-student', title: 'Беларускi студэнт' },
  { id: 'ogni', title: 'Огни' },
  { id: 'yunost', title: 'Юностъ' },
]

// Edit this collection to change both the Publications catalogue and detail pages.
export const publicationEntries = [
  { id: 'satirikon', title: 'Satirikon', imageId: 1, place: 'Paris', year: '1931', language: 'Russian', description: 'Satirikon was a satirical magazine published in Paris in 1931, emerging from the broader cultural landscape of the Russian émigré community that had settled in France after the Russian Revolution. The title referenced the earlier pre-revolutionary journal Satirikon, known in the Russian Empire for its sharp wit, caricature, and literary satire. In interwar Paris, Satirikon addressed displaced intellectuals, writers, and artists negotiating identity between nostalgia for a lost homeland and adaptation to a new European environment.' },
  { id: 'ukrainske-slovo', title: 'Ukrainske Slovo', imageId: 2, place: 'Prague', year: '1932', language: 'Ukrainian', description: 'Ukrainske Slovo brought together news, literature, and public debate for Ukrainian readers in Prague. Its pages reflect the networks of education, publishing, and cultural exchange that shaped émigré life in the interwar period.' },
  { id: 'morskoy-zhurnal', title: 'Morskoy Zhurnal', imageId: 3, place: 'Paris', year: '1930', language: 'Russian', description: 'Morskoy Zhurnal recorded the concerns and memories of naval communities abroad. The publication connected professional knowledge, historical reflection, and the social life of Russian émigrés in France.' },
  { id: 'zhittya', title: 'Molode Zhyttya', imageId: 4, place: 'Warsaw', year: '1929', language: 'Ukrainian', description: 'Molode Zhyttya was aimed at younger readers and presented culture, education, and communal initiatives through a distinctly Ukrainian perspective.' },
  { id: 'russkiy-magazin', title: 'Russkiy Magazin', imageId: 5, place: 'Tallinn', year: '1930', language: 'Russian', description: 'Russkiy Magazin combined visual culture, literature, and commentary for Russian-speaking readers in Tallinn, documenting an active Baltic émigré milieu.' },
  { id: 'podderzhka', title: 'Podderzhka', imageId: 6, place: 'Berlin', year: '1928', language: 'Russian', description: 'Podderzhka used humour and illustration to engage its readers. Its design demonstrates the lively graphic language developed by Russian publishers outside their homeland.' },
  { id: 'kadora', title: 'Kadora', imageId: 7, place: 'Prague', year: '1927', language: 'Russian', description: 'Kadora circulated among Prague’s Russian-speaking communities, preserving social ties through announcements, drawings, and reports from daily cultural life.' },
  { id: 'rul', title: 'Rul', imageId: 8, place: 'Berlin', year: '1925', language: 'Russian', description: 'Rul was a newspaper of political and civic discussion. Its densely composed pages show how information was organised for a dispersed readership.' },
  { id: 'ukrainskiy-skitalets', title: 'Ukrainskiy Skitalets', imageId: 9, place: 'Prague', year: '1921', language: 'Ukrainian', description: 'Ukrainskiy Skitalets paired literary ambitions with the experience of displacement, giving Ukrainian writers and readers a shared printed platform.' },
  { id: 'belaruski-student', title: 'Belaruski Student', imageId: 10, place: 'Vilnius', year: '1925', language: 'Belarusian', description: 'Belaruski Student reflects the intellectual life of Belarusian students and the role of print in sustaining a national community across borders.' },
  { id: 'ogni', title: 'Ogni', imageId: 11, place: 'Paris', year: '1926', language: 'Russian', description: 'Ogni assembled cultural news and commentary for readers in Paris. It offers a compact record of artistic and literary ambitions in the diaspora.' },
  { id: 'yunost', title: 'Yunost', imageId: 12, place: 'Prague', year: '1924', language: 'Russian', description: 'Yunost addressed a younger generation with illustrated stories, educational material, and a sense of connection to a wider community abroad.' },
  { id: 'ocherki', title: 'Ocherki Teorii', imageId: 13, place: 'Prague', year: '1928', language: 'Russian', description: 'Ocherki Teorii gathered essays on historical knowledge and scholarly practice, showing the continuing work of Russian academic circles in Prague.' },
  { id: 'volya-rossii-vi-vii', title: 'Volya Rossii VI–VII', imageId: 14, place: 'Prague', year: '1924', language: 'Russian', description: 'Volya Rossii was an influential journal of politics and culture, with a clear typographic identity that evolved across its Prague issues.' },
  { id: 'volya-rossii-i-iii', title: 'Volya Rossii I–III', imageId: 15, place: 'Prague', year: '1932', language: 'Russian', description: 'This later issue of Volya Rossii documents the continued dialogue between political thought, literature, and visual communication in exile.' },
  { id: 'belarusian-tribune', title: 'Belaruskaya Trybuna', imageId: 16, place: 'Vilnius', year: '1929', language: 'Belarusian', description: 'Belaruskaya Trybuna reported on public life and cultural affairs, using the newspaper format to reinforce Belarusian voices abroad.' },
  { id: 'kiev', title: 'Kiev', imageId: 17, place: 'New York', year: '1924', language: 'Russian', description: 'Kiev connected émigré readers in North America with memories of the city and currents of European cultural life.' },
  { id: 'novoe-slovo', title: 'Novoe Slovo', imageId: 18, place: 'Paris', year: '1933', language: 'Russian', description: 'Novoe Slovo presented a broad newspaper view of Russian émigré life, mixing reporting, opinion, and community notices.' },
]

export const typefaces = [
  {
    id: 'unbounded',
    name: 'Unbounded',
    weights: ['Light', 'Regular', 'Bold'],
  },
  {
    id: 'source-serif-4',
    name: 'Source Serif 4',
    weights: ['Black', 'Bold', 'Medium', 'Regular'],
  },
]

export const typefaceItalicWeights = {
  'source-serif-4': ['Black', 'Bold', 'Medium', 'Regular'],
  inter: ['Bold', 'Regular'],
}

export const typefaceEntries = [
  { id: 'unbounded', name: 'Unbounded', weights: ['Light', 'Regular', 'Bold'], family: 'sans', description: 'Unbounded is a contemporary sans serif family with a broad range of expression, from a refined light cut to a confident, high-impact bold.', designer: "NaN", formats: 'WOFF2', variableFile: "Included locally", supportedLanguages: 'Latin, Russian, Ukrainian, Belarusian and Czech', trialInfo: 'Free to use and redistribute under SIL Open Font License 1.1.', licenseUrl: 'https://github.com/google/fonts/blob/main/ofl/unbounded/OFL.txt' },
  { id: 'roboto-condensed-russo-one', name: 'Roboto Condensed', weights: ['SemiBold', 'Russo One Regular'], family: 'sans', description: 'Roboto Condensed and Russo One explore sharp, compact forms and a strong editorial rhythm, designed for display typography and vivid headlines.', designer: "Christian Robertson; Jovanny Lemonad", formats: 'WOFF2', variableFile: "Roboto Condensed variable; Russo One static", supportedLanguages: 'Latin, Russian, Ukrainian, Belarusian and Czech', trialInfo: 'Free to use and redistribute under SIL Open Font License 1.1.', licenseUrl: 'https://github.com/google/fonts/blob/main/ofl/robotocondensed/OFL.txt' },
  { id: 'source-serif-4', name: 'Source Serif 4', weights: ['Black', 'Bold', 'Medium', 'Regular'], family: 'serif', description: 'Source Serif 4 is an open-source reading and display serif by Frank Grießhammer, distributed under the SIL Open Font License 1.1.', designer: "Frank Grießhammer", formats: 'WOFF2', variableFile: "Included locally", supportedLanguages: 'Latin, Russian, Ukrainian, Belarusian and Czech', trialInfo: 'Free to use and redistribute under SIL Open Font License 1.1.', licenseUrl: 'https://github.com/google/fonts/blob/main/ofl/sourceserif4/OFL.txt' },
  { id: 'ruslan-display', name: 'Ruslan Display', weights: ['Regular'], family: 'display', description: 'Ruslan Display is an open-source angular display face by Oleg Snarsky, Denis Masharov and Vladimir Rabdu, distributed under the SIL Open Font License 1.1.', designer: "Oleg Snarsky; Denis Masharov; Vladimir Rabdu", formats: 'WOFF2', variableFile: "Single static style", supportedLanguages: 'Latin, Russian, Ukrainian, Belarusian and Czech', trialInfo: 'Free to use and redistribute under SIL Open Font License 1.1.', licenseUrl: 'https://github.com/google/fonts/blob/main/ofl/ruslandisplay/OFL.txt' },
  { id: 'inter', name: 'Inter', weights: ['Bold', 'Regular'], family: 'sans', description: 'Inter is a sturdy editorial sans serif made for clear headlines, navigation, and compact text with a distinct voice.', designer: "Rasmus Andersson", formats: 'WOFF2', variableFile: "Included locally", supportedLanguages: 'Latin, Russian, Ukrainian, Belarusian and Czech', trialInfo: 'Free to use and redistribute under SIL Open Font License 1.1.', licenseUrl: 'https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt' },
]

export const footerLinks = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'Privacy policy', href: '#/privacy' },
  { label: 'mail(at)outlandtype.com', href: 'mailto:mail@outlandtype.com' },
]
