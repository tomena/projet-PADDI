import React, { useState, useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  TileLayer,
  useMap,
  GeoJSON,
  Marker,
  Popup,
  Tooltip,
} from 'react-leaflet';

/* ================= ICON FIX ================= */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ================= MAP FIX ================= */
function FixMap() {
  const map = useMap();

  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 300);
    const t2 = setTimeout(() => map.invalidateSize(), 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  return null;
}

/* ================= REGION ================= */
function RegionLayer({ geoData, region, setRegion }) {
  const map = useMap();

  useEffect(() => {
    if (!region || !geoData) return;

    const feature = geoData.features.find(
      (f) => f.properties?.NAME_2 === region
    );

    if (!feature) return;

    const layer = L.geoJSON(feature);

    map.flyToBounds(layer.getBounds(), {
      padding: [30, 30],
      duration: 1.2,
      maxZoom: 8,
    });
  }, [region, geoData, map]);

  return (
    <GeoJSON
      data={geoData}
      style={(f) => {
        const selected = f.properties?.NAME_2 === region;

        return {
          color: selected ? '#1d4ed8' : '#94a3b8',
          weight: selected ? 3 : 1,
          fillColor: selected ? '#3b82f6' : '#cbd5e1',
          fillOpacity: selected ? 0.35 : 0.08,
        };
      }}
      onEachFeature={(feature, layer) => {
        const name = feature.properties?.NAME_2;

        layer.on('click', () => {
          setRegion(name);
        });

        if (name === region) {
          layer.bindTooltip(name, {
            permanent: true,
            direction: 'top',
            offset: [0, -10],
            className: 'region-label',
          });
        }
      }}
    />
  );
}

/* ================= DISTRICT ================= */
function DistrictLayer({ districtData, district, setDistrict, region }) {
  const map = useMap();

  useEffect(() => {
    if (!district || !districtData) return;

    const feature = districtData.features.find(
      (f) => f.properties?.NAME_3 === district
    );

    if (!feature) return;

    const layer = L.geoJSON(feature);

    map.flyToBounds(layer.getBounds(), {
      padding: [40, 40],
      duration: 1.3,
      maxZoom: 11,
    });
  }, [district, districtData, map]);

  return (
    <GeoJSON
      data={{
        ...districtData,
        features: districtData.features.filter((f) =>
          region ? f.properties?.NAME_2 === region : true
        ),
      }}
      style={(f) => {
        const selected = f.properties?.NAME_3 === district;

        return {
          color: selected ? '#dc2626' : '#475569',
          weight: selected ? 2.5 : 0.8,
          fillColor: selected ? '#ef4444' : 'transparent',
          fillOpacity: selected ? 0.25 : 0,
        };
      }}
      onEachFeature={(feature, layer) => {
        const name = feature.properties?.NAME_3;

        layer.on('click', () => {
          setDistrict(name);
        });

        if (name === district) {
          layer.bindTooltip(name, {
            permanent: true,
            direction: 'top',
            offset: [0, -8],
            className: 'district-label',
          });
        }
      }}
    />
  );
}

function CommuneLayer({ communeData, commune, district }) {
  const map = useMap();

  useEffect(() => {
    if (!commune || !communeData) return;

    const feature = communeData.features.find(
      (f) => f.properties?.NAME_4 === commune
    );

    if (!feature) return;

    const layer = L.geoJSON(feature);

    map.flyToBounds(layer.getBounds(), {
      padding: [25, 25],
      duration: 1.2,
      maxZoom: 14,
    });
  }, [commune, communeData, map]);

  return (
    <GeoJSON
      key={district + commune}
      data={{
        ...communeData,
        features: commune
          ? communeData.features.filter((f) => f.properties?.NAME_4 === commune)
          : district
          ? communeData.features.filter(
              (f) => f.properties?.NAME_3 === district
            )
          : communeData.features,
      }}
      style={(f) => {
        const selected = f.properties?.NAME_4 === commune;

        return {
          color: selected ? '#16a34a' : '#14532d',
          weight: selected ? 2.5 : 1.5,
          fillColor: selected ? '#22c55e' : '#86efac',
          fillOpacity: selected ? 0.35 : 0.12,
          opacity: 1,
        };
      }}
      onEachFeature={(feature, layer) => {
        const name = feature.properties?.NAME_4;

        if (district && name) {
          layer.bindTooltip(name, {
            permanent: true,
            direction: 'center',
            className: 'commune-label',
          });
        }
      }}
    />
  );
}

/* ================= LABEL DISTRICT ================= */
function DistrictLabel({ district, districtData }) {
  if (!district || !districtData) return null;

  const feature = districtData.features.find(
    (f) => f.properties?.NAME_3 === district
  );

  if (!feature) return null;

  const center = L.geoJSON(feature).getBounds().getCenter();

  return (
    <Marker position={center}>
      <Popup>
        🏘️ District : <b>{district}</b>
      </Popup>
    </Marker>
  );
}

/* ================= MAIN ================= */
export default function AnalyseEnvironnement() {
  const [geoData, setGeoData] = useState(null);
  const [districtData, setDistrictData] = useState(null);

  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [commune, setCommune] = useState('');
  const [communeData, setCommuneData] = useState(null);
  const [baseMap, setBaseMap] = useState('topo');

  /* ================= DATA ================= */

  const [occupation, setOccupation] = useState([
    { type: 'Forêt naturelle', value: 5.5 },
    { type: 'Savane herbeuse', value: 0.9 },
    { type: 'Culture pluviale', value: 17.7 },
    { type: 'Rizière', value: 52.3 },
    { type: 'Zone inondable / marais', value: 0.52 },
    { type: "Plan d'eau", value: 0.5 },
    { type: 'Agglomération / bâti', value: 0.49 },
    { type: 'Sols nus / dénudés', value: 9 },
    { type: 'Forêt dégradée / clairsemée', value: 3.09 },
    { type: 'Autre / non défini', value: 10 },
  ]);

  const [inputs, setInputs] = useState<any>({
    biodiv: 'Très faible',
    defor: '>30%',
    feux: '>30%',
    erosion: 'Très forte',
    pente: '> 15%',
    qualite: 'Mauvaise',
    eau: 'Très faible',
    distance: '<500m',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const regionRes = await fetch('/data/madagascar_regions_23.json');

        const districtRes = await fetch('/data/madagascar_district.json');

        const communeRes = await fetch('/data/madagascar_communes.json');

        const regionJson = await regionRes.json();
        const districtJson = await districtRes.json();
        const communeJson = await communeRes.json();

        console.log(regionJson);
        console.log(districtJson);
        console.log(communeJson);

        setGeoData(regionJson);
        setDistrictData(districtJson);
        setCommuneData(communeJson);

        setLoading(false);
      } catch (err) {
        console.error('ERREUR JSON : ', err);
      }
    }

    loadData();
  }, []);

  const regions = useMemo(() => {
    if (!geoData) return [];

    return [...new Set(geoData.features.map((f) => f.properties?.NAME_2))];
  }, [geoData]);

  const districts = useMemo(() => {
    if (!districtData) return [];

    return [
      ...new Set(
        districtData.features
          .filter((f) => (region ? f.properties?.NAME_2 === region : true))
          .map((f) => f.properties?.NAME_3)
      ),
    ];
  }, [districtData, region]);

  const communes = useMemo(() => {
    if (!communeData) return [];

    return [
      ...new Set(
        communeData.features
          .filter((f) => (region ? f.properties?.NAME_2 === region : true))
          .filter((f) => (district ? f.properties?.NAME_3 === district : true))
          .map((f) => f.properties?.NAME_4)
      ),
    ];
  }, [communeData, region, district]);

  const updateValue = (i, val) => {
    const copy = [...occupation];
    copy[i].value = val;
    setOccupation(copy);
  };

  const scoreOcc = (val) => Math.min(5, Math.ceil(val / 10));

  const poids = (score) =>
    score <= 2 ? 1 : score === 3 ? 1.2 : score === 4 ? 1.3 : 1.5;

  const sorted = [...occupation].sort((a, b) => b.value - a.value);

  const occDominante = sorted[0];
  const occMoyenne = sorted[1];
  const occFaible = sorted[sorted.length - 1];

  const map = (val, list) => (list.indexOf(val) === -1 ? 0 : list.indexOf(val));

  /* ================= Moteur d'analyse ================= */

  const erosion = inputs.erosion;
  const pente = inputs.pente;
  const defor = inputs.defor;
  const eau = inputs.eau;
  const biodiv = inputs.biodiv;
  const qualite = inputs.qualite;
  const feux = inputs.feux;
  const distance = inputs.distance;
  const dominante = occDominante.type;
  const moyenne = occMoyenne.type;
  const faible = occFaible.type;
  const norm = (v) => (v || '').toString().trim().toLowerCase();
  const scoreMap = {
    eau: {
      'très faible': 100,
      faible: 80,
      modérée: 50,
      élevée: 20,
      'très élevée': 10,
    },

    erosion: {
      'très forte': 100,
      forte: 80,
      modérée: 50,
      faible: 20,
      'très faible': 10,
    },

    biodiversite: {
      'très faible': 100,
      faible: 80,
      modérée: 50,
      élevée: 20,
      'très élevée': 10,
    },
  };
  const scoreEau = scoreMap.eau[norm(eau)] || 0;
  const penteFactor = pente === '> 15%' ? 1.5 : 1;

  const occRisk =
    dominante === 'Sols nus / dénudés'
      ? 1.3
      : dominante === 'Agglomération / bâti'
      ? 1.2
      : dominante === 'Forêt naturelle'
      ? 0.9
      : 1;

  const baseErosion = scoreMap.erosion[norm(erosion)] || 0;

  const scoreErosion = Math.min(100, baseErosion * penteFactor);
  const scoreBiodiv = scoreMap.biodiversite[norm(biodiv)] || 0;

  const scoreEauAdjusted = Math.min(
    100,
    scoreEau * (pente === '> 15%' ? 1.2 : 1)
  );

  const scoreDefor =
    norm(defor) === '>30%'
      ? 90
      : norm(defor) === '20-30%'
      ? 70
      : norm(defor) === '10-20%'
      ? 50
      : norm(defor) === '5-10%'
      ? 30
      : 10;

  const scoreFeux =
    norm(feux) === '>30%'
      ? 90
      : norm(feux) === '20-30%'
      ? 70
      : norm(feux) === '10-20%'
      ? 50
      : norm(feux) === '5-10%'
      ? 30
      : 10;

  const scoreGlobal = Math.round(
    (scoreEauAdjusted + scoreErosion + scoreBiodiv + scoreDefor + scoreFeux) / 5
  );

  const niveau =
    scoreGlobal >= 80
      ? '🔴 Très critique'
      : scoreGlobal >= 60
      ? '🟠 Critique'
      : scoreGlobal >= 30
      ? '🟡 Modéré'
      : '🟢 Stable';

  /* =========================================================
   🌿 BLOC 1 — RESSOURCES NATURELLES
   ========================================================= */

  const bloc1 = (() => {
    if (defor === '>30%' && feux === '>30%') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'Le territoire subit une dégradation écologique critique caractérisée par une déforestation intensive et une forte pression des feux. Les capacités de régénération naturelle sont fortement compromises.',
      };
    }

    if (defor === '>30%') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'La couverture naturelle connaît une régression rapide liée à une dynamique importante de déforestation. Les fonctions écologiques du paysage sont fortement fragilisées.',
      };
    }

    if (defor === '20-30%' && feux === '20-30%') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'Les ressources naturelles présentent une forte vulnérabilité environnementale avec une accélération des pressions anthropiques et des risques de fragmentation des habitats.',
      };
    }

    if (defor === '10-20%' && biodiv === 'Faible') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'Le territoire montre des signes de dégradation progressive des écosystèmes avec une réduction observable de la biodiversité locale.',
      };
    }

    if (feux === '>30%') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'Les incendies récurrents perturbent fortement les équilibres écologiques et accélèrent la dégradation des formations végétales.',
      };
    }

    if (biodiv === 'Très faible') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'Le niveau de biodiversité observé indique une vulnérabilité écologique élevée nécessitant des mesures urgentes de conservation.',
      };
    }

    if (defor === '5-10%' && feux === '5-10%') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'Les pressions environnementales restent modérées mais pourraient évoluer défavorablement sans gestion durable des ressources naturelles.',
      };
    }

    if (biodiv === 'Modérée') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'Les fonctions écologiques du territoire demeurent relativement fonctionnelles malgré des perturbations localisées.',
      };
    }

    if (defor === '<5%' && feux === '<5%') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'Les ressources naturelles présentent un bon niveau de stabilité avec une pression anthropique relativement faible.',
      };
    }

    if (dominante === 'Forêt naturelle' && defor === '>30%') {
      return {
        title: '🌿 Ressources naturelles',
        d: 'Déforestation critique affectant directement les noyaux forestiers naturels.',
      };
    }

    return {
      title: '🌿 Ressources naturelles',
      d: 'Le territoire conserve globalement une bonne intégrité écologique avec des dynamiques environnementales encore maîtrisées.',
    };
  })();

  /* =========================================================
   ⛰️ BLOC 2 — LUTTE ANTI-ÉROSIVE
   ========================================================= */

  const bloc2 = (() => {
    if (erosion === 'Très forte' && pente === '> 15%') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'Le territoire présente un niveau critique de vulnérabilité érosive avec risques élevés de ravinement et de perte irréversible des sols.',
      };
    }

    if (erosion === 'Forte' && pente === '> 15%') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'Les fortes pentes associées à une érosion active accélèrent la dégradation des terres agricoles et des bassins versants.',
      };
    }

    if (erosion === 'Très forte') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'La dynamique érosive actuelle menace fortement la fertilité des sols et la stabilité des paysages.',
      };
    }

    if (erosion === 'Forte') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'Le niveau d’érosion observé nécessite des interventions prioritaires de conservation des eaux et des sols.',
      };
    }

    if (erosion === 'Modérée' && pente === '> 15%') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'La topographie du territoire augmente progressivement les risques de dégradation des sols.',
      };
    }

    if (erosion === 'Modérée') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'Le territoire présente une sensibilité modérée à l’érosion avec des impacts encore localisés.',
      };
    }

    if (erosion === 'Faible' && pente === '> 15%') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'Les risques érosifs restent limités mais les fortes pentes nécessitent une surveillance continue.',
      };
    }

    if (erosion === 'Faible') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'La stabilité des sols demeure relativement satisfaisante avec peu de signes de dégradation.',
      };
    }

    if (erosion === 'Très faible' && pente === '≤ 15%') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'Le territoire présente des conditions favorables à la conservation naturelle des sols.',
      };
    }

    if (dominante === 'Sols nus / dénudés') {
      return {
        title: '⛰️ Lutte anti-érosive',
        d: 'Le territoire présente une forte exposition à l’érosion hydrique en raison de la faible protection végétale des sols.',
      };
    }

    return {
      title: '⛰️ Lutte anti-érosive',
      d: 'Les processus érosifs restent actuellement sous contrôle avec une vulnérabilité limitée.',
    };
  })();

  /* =========================================================
   🌾 BLOC 3 — AGRICULTURE DURABLE
   ========================================================= */

  const bloc3 = (() => {
    if (eau === 'Très faible' && erosion === 'Très forte') {
      return {
        title: '🌾 Agriculture durable',
        d: 'Le système agricole fait face à une combinaison critique de stress hydrique et de dégradation des sols limitant fortement la productivité.',
      };
    }

    if (defor === '>30%' && eau === 'Très faible') {
      return {
        title: '🌾 Agriculture durable',
        d: 'Les pressions environnementales réduisent fortement la résilience des systèmes de production agricole.',
      };
    }

    if (erosion === 'Forte' && eau === 'Faible') {
      return {
        title: '🌾 Agriculture durable',
        d: 'Les terres agricoles deviennent progressivement vulnérables à la baisse de fertilité et au déficit hydrique.',
      };
    }

    if (defor === '20-30%') {
      return {
        title: '🌾 Agriculture durable',
        d: 'L’extension des pressions agricoles contribue à la dégradation progressive des ressources naturelles.',
      };
    }

    if (feux === '>30%') {
      return {
        title: '🌾 Agriculture durable',
        d: 'Les incendies répétés perturbent les cycles agricoles et fragilisent les capacités de production.',
      };
    }

    if (eau === 'Modérée') {
      return {
        title: '🌾 Agriculture durable',
        d: 'Le système agricole reste fonctionnel mais demeure sensible aux variations climatiques saisonnières.',
      };
    }

    if (erosion === 'Modérée') {
      return {
        title: '🌾 Agriculture durable',
        d: 'Les capacités productives restent relativement stables malgré quelques contraintes environnementales.',
      };
    }

    if (eau === 'Élevée') {
      return {
        title: '🌾 Agriculture durable',
        d: 'Les ressources hydriques disponibles soutiennent relativement bien les activités agricoles.',
      };
    }

    if (biodiv === 'Élevée') {
      return {
        title: '🌾 Agriculture durable',
        d: 'Le territoire bénéficie encore d’un environnement favorable au maintien de systèmes agroécologiques résilients.',
      };
    }

    if (dominante === 'Culture pluviale' && eau === 'Très faible') {
      return {
        title: '🌾 Agriculture durable',
        d: 'Les systèmes agricoles pluviaux deviennent hautement vulnérables aux déficits hydriques..',
      };
    }

    return {
      title: '🌾 Agriculture durable',
      d: 'Les systèmes agricoles présentent actuellement des conditions globalement favorables à une production durable.',
    };
  })();

  /* =========================================================
   💧 BLOC 4 — RESSOURCES HYDRIQUES
   ========================================================= */

  const bloc4 = (() => {
    if (eau === 'Très faible' && qualite === 'Mauvaise') {
      return {
        title: '💧 Ressources hydriques',
        d: 'Le territoire présente une situation critique de stress hydrique associée à une forte dégradation qualitative des ressources en eau. Cette dynamique menace directement les usages domestiques, agricoles et écologiques.',
      };
    }

    if (eau === 'Très faible') {
      return {
        title: '💧 Ressources hydriques',
        d: 'La disponibilité en eau est extrêmement limitée avec un risque élevé d’insécurité hydrique pour les populations et les systèmes de production.',
      };
    }

    if (eau === 'Faible' && qualite === 'Mauvaise') {
      return {
        title: '💧 Ressources hydriques',
        d: 'Les ressources hydriques subissent une double pression quantitative et qualitative pouvant compromettre durablement la sécurité hydrique territoriale.',
      };
    }

    if (qualite === 'Mauvaise') {
      return {
        title: '💧 Ressources hydriques',
        d: 'La qualité des ressources en eau apparaît fortement dégradée avec des risques potentiels pour la santé humaine et les écosystèmes aquatiques.',
      };
    }

    if (eau === 'Faible') {
      return {
        title: '💧 Ressources hydriques',
        d: 'Le niveau de disponibilité hydrique reste insuffisant pour répondre durablement aux besoins croissants du territoire.',
      };
    }

    if (eau === 'Modérée' && qualite === 'Moyenne') {
      return {
        title: '💧 Ressources hydriques',
        d: 'Les ressources hydriques demeurent relativement fonctionnelles mais présentent des signes de vulnérabilité face aux pressions climatiques et anthropiques.',
      };
    }

    if (qualite === 'Bonne') {
      return {
        title: '💧 Ressources hydriques',
        d: 'La qualité actuelle des ressources en eau reste globalement satisfaisante avec des niveaux de contamination limités.',
      };
    }

    if (eau === 'Élevée') {
      return {
        title: '💧 Ressources hydriques',
        d: 'Le territoire bénéficie encore d’une disponibilité hydrique relativement favorable pour les usages domestiques et agricoles.',
      };
    }

    if (eau === 'Très élevée' && qualite === 'Excellente') {
      return {
        title: '💧 Ressources hydriques',
        d: 'Les ressources hydriques présentent un excellent niveau de disponibilité et de qualité favorisant une forte résilience environnementale.',
      };
    }

    if (dominante === 'Rizière' && eau === 'Faible') {
      return {
        title: '💧 Ressources hydriques',
        d: 'Le déficit hydrique menace directement les systèmes rizicoles et la sécurité alimentaire.',
      };
    }

    return {
      title: '💧 Ressources hydriques',
      d: 'Les ressources en eau demeurent globalement stables avec des conditions encore favorables à une gestion durable.',
    };
  })();

  /* =========================================================
   🛡️ BLOC 5 — BIODIVERSITÉ ET CONSERVATION
   ========================================================= */

  const bloc5 = (() => {
    if (biodiv === 'Très faible' && distance === '<500m') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'Le territoire présente une situation critique de vulnérabilité écologique avec une forte pression sur les habitats naturels situés à proximité des zones sensibles ou protégées.',
      };
    }

    if (biodiv === 'Très faible') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'Le niveau de biodiversité observé indique une dégradation avancée des habitats naturels et une perte importante de services écosystémiques.',
      };
    }

    if (biodiv === 'Faible' && feux === '>30%') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'Les incendies récurrents accélèrent la fragmentation écologique et la disparition progressive des espèces sensibles.',
      };
    }

    if (biodiv === 'Faible') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'Les indicateurs écologiques révèlent une réduction significative des capacités de résilience des écosystèmes.',
      };
    }

    if (distance === '<500m') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'La proximité immédiate des zones écologiquement sensibles nécessite une gestion rigoureuse des pressions anthropiques.',
      };
    }

    if (biodiv === 'Modérée') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'Les fonctions écologiques demeurent relativement actives malgré certaines perturbations environnementales localisées.',
      };
    }

    if (biodiv === 'Élevée') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'Le territoire conserve encore une diversité biologique relativement importante contribuant au maintien des équilibres écologiques.',
      };
    }

    if (biodiv === 'Très élevée') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'Les écosystèmes présentent une forte valeur écologique avec une biodiversité remarquable et des habitats relativement préservés.',
      };
    }

    if (distance === '>5km') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'Les pressions directes sur les zones sensibles demeurent relativement limitées à l’échelle territoriale.',
      };
    }

    if (dominante === 'Forêt dégradée / clairsemée') {
      return {
        title: '🛡️ Biodiversité et conservation',
        d: 'Les habitats naturels présentent une forte fragmentation écologique.',
      };
    }

    return {
      title: '🛡️ Biodiversité et conservation',
      d: 'Les dynamiques écologiques restent globalement stables avec des risques environnementaux encore modérés.',
    };
  })();

  /* =========================================================
   📌 BLOC 6 — SYNTHÈSE STRATÉGIQUE
   ========================================================= */

  const bloc6 = (() => {
    const scoreCritique =
      (erosion === 'Très forte' ? 2 : 0) +
      (defor === '>30%' ? 2 : 0) +
      (eau === 'Très faible' ? 2 : 0) +
      (biodiv === 'Très faible' ? 2 : 0) +
      (feux === '>30%' ? 2 : 0);

    const scoreEleve =
      (erosion === 'Forte' ? 1 : 0) +
      (defor === '20-30%' ? 1 : 0) +
      (eau === 'Faible' ? 1 : 0) +
      (biodiv === 'Faible' ? 1 : 0);

    /* ===== NIVEAU 1 ===== */
    if (scoreCritique >= 8) {
      return {
        title: '📌 Synthèse stratégique',
        d: 'Le territoire présente un niveau critique de vulnérabilité environnementale nécessitant des interventions immédiates de restauration écologique, de sécurisation hydrique et de gestion durable des ressources naturelles.',
      };
    }

    /* ===== NIVEAU 2 ===== */
    if (scoreCritique >= 6) {
      return {
        title: '📌 Synthèse stratégique',
        d: 'Les indicateurs révèlent une dégradation environnementale avancée susceptible d’affecter durablement les équilibres socio-écologiques et les capacités productives territoriales.',
      };
    }

    /* ===== NIVEAU 3 ===== */
    if (scoreCritique >= 4) {
      return {
        title: '📌 Synthèse stratégique',
        d: 'Le territoire fait face à plusieurs pressions environnementales majeures nécessitant une approche intégrée de gestion et de résilience territoriale.',
      };
    }

    /* ===== NIVEAU 4 ===== */
    if (scoreEleve >= 4) {
      return {
        title: '📌 Synthèse stratégique',
        d: 'Les risques environnementaux deviennent significatifs et pourraient évoluer défavorablement sans mesures préventives adaptées.',
      };
    }

    /* ===== NIVEAU 5 ===== */
    if (erosion === 'Modérée' && eau === 'Modérée') {
      return {
        title: '📌 Synthèse stratégique',
        d: 'Le territoire présente une vulnérabilité environnementale modérée avec des risques encore partiellement maîtrisables.',
      };
    }

    /* ===== NIVEAU 6 ===== */
    if (biodiv === 'Modérée') {
      return {
        title: '📌 Synthèse stratégique',
        d: 'Les équilibres écologiques demeurent relativement fonctionnels malgré certaines pressions environnementales émergentes.',
      };
    }

    /* ===== NIVEAU 7 ===== */
    if (eau === 'Élevée' && biodiv === 'Élevée') {
      return {
        title: '📌 Synthèse stratégique',
        d: 'Le territoire conserve actuellement des capacités de résilience environnementale relativement favorables.',
      };
    }

    /* ===== NIVEAU 8 ===== */
    if (defor === '<5%' && feux === '<5%') {
      return {
        title: '📌 Synthèse stratégique',
        d: 'Les pressions anthropiques restent faibles avec une dynamique environnementale encore globalement stable.',
      };
    }

    /* ===== NIVEAU 9 ===== */
    if (biodiv === 'Très élevée' && eau === 'Très élevée') {
      return {
        title: '📌 Synthèse stratégique',
        d: 'Le territoire présente un excellent niveau d’intégrité écologique et de résilience environnementale.',
      };
    }

    if (dominante === 'Agglomération / bâti') {
      return {
        title: '📌 Synthèse stratégique',
        d: 'La pression d’artificialisation des sols modifie progressivement les équilibres écologiques.',
      };
    }

    /* ===== NIVEAU 10 ===== */
    return {
      title: '📌 Synthèse stratégique',
      d: 'Les indicateurs environnementaux révèlent une situation globalement stable nécessitant le maintien des dispositifs de gestion durable et de suivi écologique.',
    };
  })();

  /* =========================================================
   🛠️ BLOC 7 — MESURES PRIORITAIRES
   ========================================================= */

  const bloc7 = (() => {
    const mesures = [];

    const scoreEau =
      eau === 'Très faible'
        ? 100
        : eau === 'Faible'
        ? 80
        : eau === 'Modérée'
        ? 50
        : eau === 'Élevée'
        ? 30
        : 10;

    const scoreErosion =
      erosion === 'Très forte'
        ? 100
        : erosion === 'Forte'
        ? 80
        : erosion === 'Modérée'
        ? 50
        : erosion === 'Faible'
        ? 30
        : 10;

    const scoreDefor =
      defor === '>30%'
        ? 100
        : defor === '20-30%'
        ? 80
        : defor === '10-20%'
        ? 60
        : defor === '5-10%'
        ? 40
        : 10;

    const scoreBiodiv =
      biodiv === 'Très faible'
        ? 100
        : biodiv === 'Faible'
        ? 80
        : biodiv === 'Modérée'
        ? 50
        : biodiv === 'Élevée'
        ? 30
        : 10;

    const normalize = (v) => (v || '').toLowerCase().trim();

    /* 🔴 URGENCE HYDRIQUE */
    if (scoreEau >= 80) {
      mesures.push({
        prio: '🔴 URGENT',
        theme: 'Eau & sécurité hydrique',
        text: 'Le territoire présente un stress hydrique critique. Il est recommandé de lancer immédiatement un programme structurant de sécurisation de l’accès à l’eau : forages stratégiques, réhabilitation des réseaux d’adduction, création de bassins de rétention et protection des zones de captage. Sans intervention rapide, les activités agricoles et domestiques seront fortement compromises.',
      });
    }

    /* 🔴 URGENCE ÉROSION */
    if (scoreErosion >= 80) {
      mesures.push({
        prio: '🔴 URGENT',
        theme: 'Sol & érosion',
        text: 'La dégradation des sols atteint un niveau critique. Il est nécessaire de déployer un programme massif de restauration des terres : aménagement anti-érosif (cordons pierreux, terrasses, haies vives), reboisement des pentes et protection des bassins versants pour éviter une perte irréversible de fertilité.',
      });
    }

    /* 🔴 URGENCE DÉFORESTATION */
    if (scoreDefor >= 80) {
      mesures.push({
        prio: '🔴 URGENT',
        theme: 'Forêts & ressources naturelles',
        text: 'La pression sur les formations forestières est très élevée. Il est recommandé de mettre en place un moratoire local sur les défrichements, d’intensifier le reboisement communautaire et de renforcer la surveillance écologique afin de stabiliser les écosystèmes.',
      });
    }

    /* 🟠 AGRICULTURE */
    if (scoreEau >= 60 || scoreErosion >= 60) {
      mesures.push({
        prio: '🟠 IMPORTANT',
        theme: 'Agriculture durable',
        text: 'Le système agricole présente une vulnérabilité croissante. Une transition vers des pratiques agroécologiques est recommandée : diversification culturale, agroforesterie, conservation des sols et amélioration de la gestion de l’eau agricole afin de renforcer la résilience des exploitations.',
      });
    }

    /* 🟡 BIODIVERSITÉ */
    if (scoreBiodiv >= 60) {
      mesures.push({
        prio: '🟡 IMPORTANT',
        theme: 'Biodiversité & conservation',
        text: 'La biodiversité locale est en déclin. Il est conseillé de renforcer les zones protégées, créer des corridors écologiques et restaurer les habitats naturels afin de préserver les services écosystémiques essentiels.',
      });
    }
    /* 🌾 OCCUPATION DOMINANTE AGRICOLE */
    if (
      dominante === 'Culture pluviale' &&
      (scoreEau >= 60 || scoreErosion >= 60)
    ) {
      mesures.push({
        prio: '🟠 IMPORTANT',
        theme: 'Agriculture pluviale',
        text: 'Les cultures pluviales dominantes deviennent vulnérables face au déficit hydrique et à la dégradation des sols. Il est recommandé de renforcer les techniques agroécologiques, les systèmes de rétention d’eau et les pratiques de conservation des sols.',
      });
    }

    /* 🌿 OCCUPATION FORESTIÈRE */
    if (dominante === 'Forêt naturelle' && scoreDefor >= 60) {
      mesures.push({
        prio: '🔴 URGENT',
        theme: 'Protection forestière',
        text: 'Les formations forestières naturelles subissent une forte pression. Il est nécessaire de renforcer la surveillance, le reboisement communautaire et les dispositifs de conservation des habitats.',
      });
    }

    /* ⛰️ SOLS NUS */
    if (dominante === 'Sols nus / dénudés') {
      mesures.push({
        prio: '🔴 URGENT',
        theme: 'Restauration des sols',
        text: 'La dominance des sols nus expose fortement le territoire à l’érosion hydrique et à la perte de fertilité. Des actions immédiates de végétalisation et de stabilisation des pentes sont nécessaires.',
      });
    }

    /* 🌾 RIZIÈRES */
    if (dominante === 'Rizière' && scoreEau >= 60) {
      mesures.push({
        prio: '🟠 IMPORTANT',
        theme: 'Sécurisation rizicole',
        text: 'Les systèmes rizicoles deviennent sensibles au déficit hydrique. Il est recommandé de sécuriser les infrastructures d’irrigation et améliorer la gestion de l’eau agricole.',
      });
    }

    /* 🏘️ ZONE URBAINE */
    if (dominante === 'Agglomération / bâti') {
      mesures.push({
        prio: '🟡 IMPORTANT',
        theme: 'Urbanisation durable',
        text: 'La pression d’urbanisation nécessite une meilleure planification territoriale afin de limiter l’artificialisation des sols et préserver les zones sensibles.',
      });
    }
    /* 🟢 STABLE */
    if (mesures.length === 0) {
      mesures.push({
        prio: '🟢 STABLE',
        theme: 'Gestion territoriale',
        text: 'La situation environnementale est globalement stable. Il est recommandé de maintenir les actions de suivi, de prévention et de gestion durable déjà en place pour conserver cet équilibre.',
      });
    }

    const scoreGlobal =
      (scoreEau + scoreErosion + scoreDefor + scoreBiodiv) / 4;

    const niveau =
      scoreGlobal >= 80
        ? 'CRITIQUE'
        : scoreGlobal >= 60
        ? 'ALERTE'
        : scoreGlobal >= 40
        ? 'MODÉRÉ'
        : 'STABLE';

    return {
      title: '🛠️ Orientation de decision',
      scoreGlobal,
      niveau,
      list: mesures,
    };
  })();

  function render(label, key, options) {
    const val = inputs[key] || '';

    /* CALCULS CACHÉS */
    const score = map(val, options);
    const w = poids(score);
    const finalScore = (score * w).toFixed(2);

    return (
      <tr>
        <td style={styles.tdLeft}>{label}</td>

        <td style={styles.td}>
          <select
            value={val}
            onChange={(e) =>
              setInputs({
                ...inputs,
                [key]: e.target.value.trim(),
              })
            }
            style={styles.select}
          >
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>

          {/* CALCUL CACHÉ */}
          <span style={{ display: 'none' }}>
            {score} {w} {finalScore}
          </span>
        </td>
      </tr>
    );
  }
  const renderBaseMap = () => {
    switch (baseMap) {
      case 'satellite':
        return (
          <TileLayer
            attribution="Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        );

      case 'osm':
        return (
          <TileLayer
            attribution="OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        );

      default:
        return (
          <TileLayer
            attribution="Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
          />
        );
    }
  };
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🌿 Analyse environnementale</h2>

      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.selectGroup}>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setDistrict('');
              setCommune('');
            }}
            style={styles.selectProLeft}
          >
            <option>🌍 Région</option>

            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            style={styles.selectProMiddle}
          >
            <option>🏘️ District</option>

            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            style={styles.selectProRight}
          >
            <option>🏡 Commune</option>
            {communes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.buttonGroup}>
          <select
            value={baseMap}
            onChange={(e) => setBaseMap(e.target.value)}
            style={styles.baseMapSelect}
          >
            <option value="topo">🗺️ ESRI Topographique</option>

            <option value="satellite">🛰️ ESRI Satellite</option>

            <option value="osm">🌍 OpenStreetMap</option>
          </select>
          <button style={styles.btnPrimary} onClick={() => setShowAI(true)}>
            📊 Analyser
          </button>

          <button style={styles.btn}>🔄 Reinitialiser</button>

          <button style={styles.btn}>↩️ Annuler</button>

          <button style={styles.btnExport}>📁 Exporter</button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={styles.grid}>
        {/* ================= COLONNE GAUCHE ================= */}
        <div style={styles.leftPanel}>
          {/* OCCUPATION SOL */}
          <div style={styles.card}>
            <div style={styles.header}>📊 Occupation du sol</div>

            <div style={styles.doubleTable}>
              {/* TABLEAU GAUCHE */}
              <table style={styles.table}>
                <tbody>
                  {occupation.slice(0, 5).map((o, i) => {
                    const score = scoreOcc(o.value);
                    const w = poids(score);

                    return (
                      <tr key={i}>
                        <td style={styles.tdLeft}>{o.type}</td>

                        <td style={styles.td}>
                          <input
                            type="number"
                            value={o.value}
                            onChange={(e) =>
                              updateValue(i, Number(e.target.value))
                            }
                            style={styles.input}
                          />

                          <span style={{ display: 'none' }}>
                            {score}
                            {w}
                            {(score * w).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* TABLEAU DROIT */}
              <table style={styles.table}>
                <tbody>
                  {occupation.slice(5, 10).map((o, i) => {
                    const realIndex = i + 5;

                    const score = scoreOcc(o.value);
                    const w = poids(score);

                    return (
                      <tr key={realIndex}>
                        <td style={styles.tdLeft}>{o.type}</td>

                        <td style={styles.td}>
                          <input
                            type="number"
                            value={o.value}
                            onChange={(e) =>
                              updateValue(realIndex, Number(e.target.value))
                            }
                            style={styles.input}
                          />

                          <span style={{ display: 'none' }}>
                            {score}
                            {w}
                            {(score * w).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* INDICATEURS */}
          <div style={styles.card}>
            <div style={styles.header}>🧠 Indicateurs environnementaux</div>

            <div style={styles.doubleTable}>
              {/* GAUCHE */}
              <table style={styles.table}>
                <tbody>
                  {[occDominante, occMoyenne, occFaible].map((o, i) => (
                    <tr key={i}>
                      <td style={styles.tdLeft}>
                        {i === 0
                          ? 'Occupation dominante'
                          : i === 1
                          ? 'Occupation moyenne'
                          : 'Occupation faible'}
                      </td>

                      <td style={styles.tdLeft}>{o.type}</td>
                    </tr>
                  ))}

                  {render('Biodiversité', 'biodiv', [
                    'Très élevée',
                    'Élevée',
                    'Modérée',
                    'Faible',
                    'Très faible',
                  ])}

                  {render('Déforestation', 'defor', [
                    '<5%',
                    '5-10%',
                    '10-20%',
                    '20-30%',
                    '>30%',
                  ])}

                  {render('Feux', 'feux', [
                    '<5%',
                    '5-10%',
                    '10-20%',
                    '20-30%',
                    '>30%',
                  ])}
                </tbody>
              </table>

              {/* DROITE */}
              <table style={styles.table}>
                <tbody>
                  {render('Érosion du sol', 'erosion', [
                    'Très faible',
                    'Faible',
                    'Modérée',
                    'Forte',
                    'Très forte',
                  ])}

                  {render('Pente dominante', 'pente', ['≤ 15%', '> 15%'])}

                  {render('Qualité eau', 'qualite', [
                    'Excellente',
                    'Bonne',
                    'Moyenne',
                    'Mauvaise',
                  ])}

                  {render('Disponibilité eau', 'eau', [
                    'Très élevée',
                    'Élevée',
                    'Modérée',
                    'Faible',
                    'Très faible',
                  ])}

                  {render('Distance AP', 'distance', [
                    '<500m',
                    '0.5-1km',
                    '1-3km',
                    '3-5km',
                    '>5km',
                  ])}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== 4 BLOCS ===== */}
          {showAI && (
            <>
              <div style={styles.aiTitle}>🧠 Résultat de votre analyse</div>

              <div style={styles.aiGridTop}>
                <div style={styles.aiCardGreen}>
                  <div style={styles.aiHeader}>{bloc1.title}</div>
                  <div style={styles.aiText}>{bloc1.d}</div>
                </div>

                <div style={styles.aiCardRed}>
                  <div style={styles.aiHeader}>{bloc2.title}</div>
                  <div style={styles.aiText}>{bloc2.d}</div>
                </div>

                <div style={styles.aiCardOrange}>
                  <div style={styles.aiHeader}>{bloc3.title}</div>
                  <div style={styles.aiText}>{bloc3.d}</div>
                </div>

                <div style={styles.aiCardBlue}>
                  <div style={styles.aiHeader}>{bloc4.title}</div>
                  <div style={styles.aiText}>{bloc4.d}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ================= COLONNE DROITE ================= */}
        <div style={styles.card}>
          <div style={styles.header}>🗺️ Carte Madagascar</div>

          <div style={styles.mapContainer}>
            {loading ? (
              <div>Chargement...</div>
            ) : (
              <MapContainer
                center={[-18.8, 47]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                whenCreated={(map) => {
                  setTimeout(() => map.invalidateSize(), 500);
                }}
              >
                <FixMap />

                {renderBaseMap()}

                {/* REGION */}
                {geoData && (
                  <RegionLayer
                    geoData={geoData}
                    region={region}
                    setRegion={setRegion}
                  />
                )}

                {/* DISTRICT (au-dessus de la région) */}
                {districtData && (
                  <DistrictLayer
                    districtData={districtData}
                    district={district}
                    setDistrict={setDistrict}
                    region={region}
                  />
                )}

                {/* COMMUNE (toujours en dernier pour éviter conflit d'affichage) */}
                {communeData && (
                  <CommuneLayer
                    communeData={communeData}
                    commune={commune}
                    district={district}
                  />
                )}

                {/* LABEL */}
                <DistrictLabel
                  district={district}
                  districtData={districtData}
                />
              </MapContainer>
            )}
          </div>
          {/* ===== 2 BLOCS BAS ===== */}
          {showAI && (
            <div style={styles.aiGridBottom}>
              <div style={styles.aiCardPurple}>
                <div style={styles.aiHeader}>{bloc5.title}</div>
                <div style={styles.aiText}>{bloc5.d}</div>
              </div>

              <div style={styles.aiCardDark}>
                <div style={styles.aiHeader}>{bloc6.title}</div>
                <div style={styles.aiText}>{bloc6.d}</div>
              </div>
            </div>
          )}
        </div>

        {/* ================= BLOC 7 FULL WIDTH ================= */}
        {showAI && (
          <div style={styles.fullWidthBlock}>
            <div style={styles.aiCardMeasureFull}>
              <div style={styles.aiHeader}>{bloc7.title}</div>

              <div style={styles.horizontalScroll}>
                {bloc7.list.map((m, i) => (
                  <div key={i} style={styles.measureCard}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      {m.prio} — {m.theme}
                    </div>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const labelStyle = document.createElement('style') as HTMLStyleElement;

labelStyle.innerHTML = `
.region-label {
  background: rgba(29,78,216,0.95);
  border: none;
  color: white;
  font-weight: 700;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
}

.district-label {
  background: rgba(220,38,38,0.95);
  border: none;
  color: white;
  font-weight: 700;
  font-size: 12px;
  padding: 3px 7px;
  border-radius: 6px;
}

.commune-label {
  background: rgba(255,255,255,0.95);
  border: 1px solid #16a34a;
  color: #14532d;
  font-weight: 600;
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 4px;
}

.leaflet-tooltip {
  z-index: 9999 !important;
}
`;

document.head.appendChild(labelStyle);

const styles = {
  container: {
    padding: 16,
    background: 'none',
    minHeight: '100vh',
  },

  title: {
    fontWeight: 800,
    fontSize: 20,
    marginBottom: 14,
  },

  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  selectGroup: {
    display: 'flex',
    alignItems: 'center',
  },

  selectProLeft: {
    padding: 10,
    border: '1px solid #d1d5db',
    borderRadius: '10px 0 0 10px',
    outline: 'none',
    minWidth: 180,
    fontWeight: 600,
    background: 'white',
  },

  selectProRight: {
    padding: 10,
    border: '1px solid #d1d5db',
    borderLeft: 'none',
    borderRadius: '0 10px 10px 0',
    outline: 'none',
    minWidth: 180,
    fontWeight: 600,
    background: 'white',
  },

  selectProMiddle: {
    padding: 10,
    border: '1px solid #d1d5db',
    borderLeft: 'none',
    outline: 'none',
    minWidth: 180,
    fontWeight: 600,
    background: 'white',
  },

  btnPrimary: {
    background: '#003399',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
    alignItems: 'start',
  },

  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },

  card: {
    background: 'white',
    borderRadius: 14,
    padding: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },

  header: {
    background: '#003399',
    color: 'white',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontWeight: 700,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },

  th: {
    background: '#eef3ff',
    border: '1px solid #ddd',
    padding: 8,
    textAlign: 'center',
  },

  thLeft: {
    background: '#eef3ff',
    border: '1px solid #ddd',
    padding: 8,
    textAlign: 'left',
  },

  td: {
    border: '1px solid #ddd',
    padding: 7,
    textAlign: 'center',
  },

  tdLeft: {
    border: '1px solid #ddd',
    padding: 7,
    textAlign: 'left',
  },

  input: {
    width: '100%',
    border: 'none',
    outline: 'none',
    textAlign: 'center',
    background: 'transparent',
  },

  select: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
  },

  mapContainer: {
    height: 630,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },

  aiTitle: {
    marginTop: 6,
    marginBottom: 6,
    fontWeight: 800,
    fontSize: 15,
  },

  aiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },

  aiHeader: {
    fontWeight: 700,
    marginBottom: 8,
    fontSize: 13,
  },

  aiText: {
    fontSize: 12,
    lineHeight: 1.5,
  },

  aiCardGreen: {
    background: 'white',
    borderLeft: '5px solid #22c55e',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },

  aiCardRed: {
    background: 'white',
    borderLeft: '5px solid #ef4444',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },

  aiCardOrange: {
    background: 'white',
    borderLeft: '5px solid #f59e0b',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },

  aiCardBlue: {
    background: 'white',
    borderLeft: '5px solid #3b82f6',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },

  aiCardPurple: {
    background: 'white',
    borderLeft: '5px solid #8b5cf6',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },

  aiCardDark: {
    background: 'white',
    borderLeft: '5px solid #111827',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },

  aiGridTop: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginTop: 0,
  },

  aiGridBottom: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 10,
  },

  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },

  btnExport: {
    background: '#10b981',
    color: 'white',
    padding: 7,
    border: 'none',
    borderRadius: 8,
  },

  btn: {
    background: '#e5e7eb',
    padding: 10,
    border: 'none',
    borderRadius: 8,
  },
  buttonGroup: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  doubleTable: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    alignItems: 'start',
  },
  baseMapSelect: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: 'white',
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
  },

  aiCardMeasure: {
    background: 'white',
    borderLeft: '5px solid #14b8a6',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },

  aiCardMeasureFull: {
    background: 'white',
    borderLeft: '5px solid #14b8a6',
    borderRadius: 14,
    padding: 14,
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },

  horizontalScroll: {
    display: 'grid',
    gap: 10,
    overflowX: 'auto',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    paddingTop: 10,
  },

  fullWidthBlock: {
    marginTop: 14,
    width: '100%',
    gridColumn: '1 / -1', // 👈 IMPORTANT
  },

  measureCard: {
    background: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
};
