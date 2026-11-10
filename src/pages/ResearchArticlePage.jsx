import { useState } from 'react'
import ImageLightbox from '../components/ImageLightbox'
import ResearchBody from '../components/ResearchBody'
import FontReady from '../components/FontReady'
import libraryImage from '../assets/99f67873ca8ae801763203e2ce91d459134f0778.png'
import residentsImage from '../assets/a24fe08a748229d6c5de2718ff1858629ee7f1dd.png'
import './ResearchArticlePage.css'

function Paragraph({ children }) { return <p className="research-article__paragraph">{children}</p> }

function Figure({ src, caption, onOpen }) {
  return (
    <figure className="research-article__figure">
      <button type="button" className="research-article__image-button" onClick={() => onOpen(src, caption)} aria-label={`Open ${caption} full screen`}>
        <img src={src} alt="Historical photograph from the research archive" />
      </button>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

function ResearchArticlePage({ article, fromCms = false }) {
  const [image, setImage] = useState(null)

  return (
    <main className={`research-article research-article--${article.font || article.style}`}>
      <span className="eyebrow research-article__label">Title</span>
      <hr className="research-article__rule" />
      <FontReady><h1 className="research-article__title">{article.title}</h1></FontReady>

      <FontReady><article className="research-article__body">
        {fromCms ? <ResearchBody article={article} onOpen={(src, alt) => setImage({ src, alt })} /> : <>
        <Paragraph>While the diaspora in the Balkans was predominantly monarchist-military, Prague was destined to become a center for “progressive Russians”. The Czechoslovak Republic was one of the few countries that provided refugee assistance organized at the state level and financed from the state budget. By decision, the Ministry of Foreign Affairs of Czechoslovakia was entrusted with the organization and implementation of the so-called “Ruská pomocná akce” (Russian Aid Action).</Paragraph>
        <Paragraph>Wartime was difficult for all the inhabitants of Europe. It was difficult for Russian emigrants to take an unequivocal stance on the events that were taking place. In March 1939, they had to come to terms with the liquidation of the ČSR; in September of that year, they were shocked by the conclusion of the Soviet-German treaty. Critical was also the moment when Germany broke the treaty and its troops crossed the Soviet borders.</Paragraph>
        <Paragraph>One can name a whole spectrum of contradictory feelings experienced by Russian emigrants: a natural love for everything Russian mixed with hatred for the Bolshevik USSR, hope for the defeat of Germany, towards the end of the war, joy over Soviet successes combined with fear of German or Soviet reprisals. The views of many emigrants changed over the course of the war. There was a difference between the older and the younger generation, between those who had received Czechoslovak citizenship and those who had not, between purely Russian and Russian-Czech families, between the successful and the unsuccessful.</Paragraph>
        <Paragraph>After the abolition of most of the emigrant organizations, two last areas remained in which ideological differences did not penetrate and where it was possible to do without sharp exchange of opinions. First of all, it was the life of the Orthodox Church and the observance of traditions during the church year. Attendance at Orthodox liturgy, prayerful unity, church hymns, and sermons by priests soothed anxious feelings and gave hope.</Paragraph>
        <Paragraph>The second unifying area was the care of children and young people. Throughout the war there was a Russian kindergarten in Prague. Although the English and French gymnasiums were closed, the Russian and Ukrainian gymnasiums survived the war. A wide circle of parents, relatives, and volunteers formed around the kindergarten and gymnasium, who met, attended school events, and provided financial assistance. Thanks to them, excursions and summer camps were held, to which children from poor families went for free, and at Christmas and Easter meetings no one left without a present.</Paragraph>

        <Figure src={residentsImage} caption="Russian residents. Prague, 1923, Archive of Russian Tradition." onOpen={(src, alt) => setImage({ src, alt })} />

        <Paragraph>It was not only the Soviet army who came to Prague in 1945, but also the Soviet state security services. Those Russian emigrants involved in the civil war for the Whites were threatened. In Carpathian Ruthenia and Slovakia the arrests were massive, in Moravia and Bohemia they were individual, but prepared and targeted in advance. The arrest of part of the Russian emigrants was the beginning of the end of the Russian emigration as a community. The Russian kindergarten and Ukrainian gymnasium were closed, the Russian gymnasium was turned into a Soviet secondary school. Most of the books from the school libraries were destroyed due to their “ideological harmfulness”.</Paragraph>
        <Paragraph>The Orthodox clergy before the war were under the authority of Metropolitan Evlogy (Russian Orthodox Church Abroad), whose residence was in Paris. After the war, the Soviet Union sent new priests to the ČSR from the Soviet Union, who were not as trusted as their predecessors. Religious people feared that they might have other tasks incompatible with the faith besides a spiritual mission. Confession without trust was meaningless, and the church ceased to be the center of spiritual life. In addition to the school and church, the centers of Russian life in Prague were four cooperative houses built in the 1920s and 1930s by Russian emigrants.</Paragraph>
        <Paragraph>In the early 50s, all the independent housing cooperatives in the Czech Republic were merged, and most Russians were evicted from their apartments. They were given new, in many cases much smaller apartments according to the number of working family members. Particularly affected were people of retirement age, who were sometimes pressured to leave not only the cooperative houses, but also Prague. Russian intellectuals, often widowers or old bachelors, lived out their lives in nursing homes or semi-basements, in a foreign and unfriendly communist environment.</Paragraph>
        <Paragraph>After 1945, not only Russian but also traditional Czechoslovak unions and associations (Sokol, Junák, sports clubs, some political parties, religious and charitable organizations, etc.) disappeared. The official view of the Czechoslovak Legion, the First Republic and its leading representatives also changed. “Ruská pomocná akce” and Russian emigration as such became one of the tabooed topics.</Paragraph>

        <Figure src={libraryImage} caption="Prague, 1930, Russian Eye Library. (Russian Home), Křemencova 8." onOpen={(src, alt) => setImage({ src, alt })} />

        <section className="research-article__sources">
          <div className="research-article__credit">
            <p>Text, Translation: Ilya Bazhanov</p>
            <p>(C) Ilya Bazhanov. All Rights Reserved. No part of this article may be reproduced or utilized in any form or by any means without the prior written permission of Ilya Bazhanov.</p>
          </div>
          <ol className="research-article__references">
            <li>Anon.: “Die kaiserliche Reichshauptstadt”. In: BerlinOnline Stadtportal GmbH &amp; Co. KG (ed.): Berlin im Überblick. Website. Berlin. &lt;https://www.berlin.de/geschichte/8479394-3689745-die-kaiserliche-reichshauptstadt.html&gt;, last accessed on 23 June 2021</li>
            <li>Cf. Bauer, Friedrich: Chronik der Schriftgießereien in Deutschland und den deutschsprachigen Nachbarländern. Bearbeitet von Friedrich Bauer, Offenbach am Main 1928. Mit Ergänzungen und Nachträgen von Hans Reichardt. PDF file. Hans Reichardt, Frankfurt am Main 2011. &lt;https://www.klingspor-museum.de/KlingsporKuenstler/ChronikSchriftgiessereien/ChronikderSchriftgiesserei.pdf&gt;</li>
            <li>ChronikSchriftgiessereien/ ChronikderSchriftgiesserei.pdf&gt;, last accessed on 23 June 2021 Anon.: “Aus der Schriftgießerei”. In: Deutscher Buch- und Steindrucker. Monatlicher Bericht über die Graphischen Künste. Vol. 10 (January 1904). Morgenstern, Berlin 1904 Wetzig, Emil (ed.): Handbuch der Schriftarten. Albrecht Seemann Verlag, Leipzig 1926 Deutscher Buch- und Steindrucker. Monatlicher Bericht über die Graphischen Künste. Vol. 9 (September 1903). Morgenstern, Berlin 1903</li>
            <li>“Ein weiteres Erzeugnis dünnen Charakters, aber meiner Ansicht nach zutreffender Bildstärke ist die neue Consul-Grotesk.” Chronos: “Schriftgießerei”. In: Deutscher Buchgewerbeverein (ed.): Archiv für Buchgewerbe. Vol. 40, no. 10 (Oct. 1903). Verlag des Deutschen Buchgewerbevereins, Leipzig 1903</li>
            <li>Wilhelm Woellmer’s Schriftgießerei: “Consul” ad. In: Deutscher Buchgewerbeverein (ed.): Archiv für Buchgewerbe. Vol. 40, no. 11/12 (Nov./Dec. 1903). Verlag des Deutschen Buchgewerbevereins, Leipzig 1903</li>
            <li>“Neben den feststehenden traditionellen Grotesk-Charakteren enthält dieselbe Freie Typenformen, durch deren beliebige Verwendung aus der klassischen Grotesk eine flotte Circular- und Formularschrift entsteht, die mit gleichem Vorteil sowohl für kaufmännische, als auch für private Drucksachen verwendet werden kann.” Wilhelm Woellmer’s Schriftgießerei: “Consul ... Eine moderne Groteskschrift!” ad. In: Deutscher Buch- und Steindrucker. Monatlicher Bericht über die Graphischen Künste. Vol. 9 (September 1903). Morgenstern, Berlin 19031</li>
          </ol>
        </section>
        </>}
      </article></FontReady>
      {image && <ImageLightbox src={image.src} alt={image.alt} onClose={() => setImage(null)} />}
    </main>
  )
}

export default ResearchArticlePage
