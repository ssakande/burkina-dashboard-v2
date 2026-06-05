// Dashboard Burkina Faso - Version Leaflet + Chart.js
const { useState, useEffect, useRef, useMemo } = React;

const MONTHS_ORDER = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const YEARS = [2018,2019,2020,2021,2022];
const BURKINA_CENTER = [12.3,-1.5];
const PALETTE = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6','#14B8A6','#F97316'];

const fmt = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('fr-FR');
};

const getColor = (ratio) => {
  if (ratio > 0.75) return '#DC2626';
  if (ratio > 0.50) return '#F59E0B';
  if (ratio > 0.25) return '#FCD34D';
  return '#10B981';
};

// ─── Composant Carte Leaflet ───────────────────────────────────────────────
const LeafletMap = ({ geoData, values, title, legendLabels }) => {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;
    instanceRef.current = L.map(mapRef.current, { scrollWheelZoom: false }).setView(BURKINA_CENTER, 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(instanceRef.current);
  }, []);

  useEffect(() => {
    if (!instanceRef.current || !geoData || !values) return;
    if (layerRef.current) layerRef.current.remove();

    const maxVal = Math.max(...Object.values(values).filter(v => !isNaN(v)), 1);

    layerRef.current = L.geoJSON(geoData, {
      style: (feature) => {
        const name = feature.properties.ADM1_FR || feature.properties.ADM2_FR || '';
        const val = values[name] || 0;
        return {
          fillColor: getColor(val / maxVal),
          fillOpacity: 0.7,
          color: '#1F2937',
          weight: 1.5
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.ADM1_FR || feature.properties.ADM2_FR || '';
        const val = values[name];
        const display = val !== undefined ? fmt(val) : 'N/A';
        layer.bindPopup(`<strong>${name}</strong><br>${title}: ${display}`);
        layer.on('mouseover', e => e.target.setStyle({ weight: 3, color: '#6366F1' }));
        layer.on('mouseout', e => layerRef.current.resetStyle(e.target));
      }
    }).addTo(instanceRef.current);
  }, [geoData, values]);

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height: '380px', borderRadius: '8px', overflow: 'hidden' }} />
      {/* Légende */}
      <div className="absolute bottom-6 left-3 bg-white rounded-lg shadow-lg p-3 z-[999]">
        <p className="text-xs font-bold text-gray-700 mb-2">Légende</p>
        {(legendLabels || ['0-25% (Faible)','25-50% (Moyen)','50-75% (Élevé)','75-100% (Critique)']).map((label, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: ['#10B981','#FCD34D','#F59E0B','#DC2626'][i] }} />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Composant Graphique Chart.js ─────────────────────────────────────────
const ChartBox = ({ type, data, options, height = 320 }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, { type, data, options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
      ...options
    }});
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return <canvas ref={canvasRef} style={{ height: `${height}px` }} />;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, color }) => (
  <div className={`bg-gradient-to-br ${color} text-white p-5 rounded-xl shadow-lg`}>
    <p className="text-sm font-medium opacity-90">{label}</p>
    <p className="text-3xl font-bold mt-1">{value}</p>
    {sub && <p className="text-xs mt-1 opacity-75">{sub}</p>}
  </div>
);

// ─── Tableau province ──────────────────────────────────────────────────────
const ProvinceTable = ({ data }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b-2 border-gray-200 text-left">
          <th className="py-2 px-3 font-semibold text-gray-700">Province</th>
          <th className="py-2 px-3 font-semibold text-gray-700">Région</th>
          <th className="py-2 px-3 font-semibold text-gray-700 text-right">Fermées</th>
          <th className="py-2 px-3 font-semibold text-gray-700 text-right">Taux</th>
          <th className="py-2 px-3 font-semibold text-gray-700 text-right">Enfants</th>
        </tr>
      </thead>
      <tbody>
        {data.slice(0,10).map((r, i) => (
          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="py-2 px-3 font-medium">{r.province}</td>
            <td className="py-2 px-3 text-gray-500 text-xs">{r.region}</td>
            <td className="py-2 px-3 text-right">{r.schoolsClosed}/{r.totalSchools}</td>
            <td className="py-2 px-3 text-right">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                r.closureRate>75?'bg-red-100 text-red-700':r.closureRate>50?'bg-orange-100 text-orange-700':r.closureRate>25?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'
              }`}>{r.closureRate.toFixed(1)}%</span>
            </td>
            <td className="py-2 px-3 text-right">{fmt(r.childrenAffected)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── APP PRINCIPALE ────────────────────────────────────────────────────────
const BurkinaDashboard = () => {
  const [page, setPage] = useState('dashboard');
  const [year, setYear] = useState(2022);
  const [month, setMonth] = useState('Décembre');
  const [region, setRegion] = useState('all');
  const [province, setProvince] = useState('all');
  const [mapView, setMapView] = useState('regions');
  const [mapLayer, setMapLayer] = useState('closures');

  const [rawData, setRawData] = useState([]);
  const [regionsGeo, setRegionsGeo] = useState(null);
  const [provincesGeo, setProvincesGeo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState('');
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoadMsg('Chargement des données...');
        const d = await (await fetch('./burkina-data.json')).json();
        setRawData(d);
        setLoadMsg('Chargement des régions...');
        const rg = await (await fetch('./burkina-regions-simplified.json')).json();
        setRegionsGeo(rg);
        setLoadMsg('Chargement des provinces...');
        const pg = await (await fetch('./burkina-provinces-simplified.json')).json();
        setProvincesGeo(pg);
        setLoading(false);
      } catch(e) {
        setLoadErr('Fichier introuvable: ' + e.message);
      }
    })();
  }, []);

  // Données filtrées (mois + année sélectionnés = snapshot cumulatif)
  const filtered = useMemo(() => rawData.filter(r =>
    r.Year === year && r.Month === month &&
    (region === 'all' || r.Region === region) &&
    (province === 'all' || r.Province === province)
  ), [rawData, year, month, region, province]);

  // Agrégation nationale
  const stats = useMemo(() => {
    const s = filtered.reduce((a, r) => {
      a.totalSchools    += r.NbTotalSchool    || 0;
      a.schoolsClosed   += r.SchoolClosed     || 0;
      a.childrenAff     += r.ChildrenAffected || 0;
      a.teachersAff     += r.TeacherAffected  || 0;
      a.reopened        += r.SchoolReopened   || 0;
      a.idps            += r.IDPs             || 0;
      a.idpsSchool      += r.IDPs_SchoolAge   || 0;
      a.incidents       += r.NbEvents         || 0;
      a.healthInc       += r.NbHealthEvents   || 0;
      a.educInc         += r.NbEducEvents     || 0;
      a.totalPop        += r.TotalPop         || 0;
      a.schoolAgePop    += r.SchoolAgePop     || 0;
      a.totalPIN        += r.TotalPIN         || 0;
      a.educPIN         += r.EducationPIN     || 0;
      return a;
    }, { totalSchools:0,schoolsClosed:0,childrenAff:0,teachersAff:0,reopened:0,idps:0,idpsSchool:0,incidents:0,healthInc:0,educInc:0,totalPop:0,schoolAgePop:0,totalPIN:0,educPIN:0 });
    s.closureRate  = s.totalSchools  > 0 ? s.schoolsClosed / s.totalSchools * 100 : 0;
    s.reopenRate   = s.schoolsClosed > 0 ? s.reopened      / s.schoolsClosed * 100 : 0;
    return s;
  }, [filtered]);

  // Données par région
  const byRegion = useMemo(() => {
    const m = {};
    filtered.forEach(r => {
      if (!m[r.Region]) m[r.Region] = { region:r.Region, totalSchools:0, schoolsClosed:0, childrenAff:0, idps:0, incidents:0 };
      m[r.Region].totalSchools  += r.NbTotalSchool    || 0;
      m[r.Region].schoolsClosed += r.SchoolClosed     || 0;
      m[r.Region].childrenAff   += r.ChildrenAffected || 0;
      m[r.Region].idps          += r.IDPs             || 0;
      m[r.Region].incidents     += r.NbEvents         || 0;
    });
    return Object.values(m).map(d => ({ ...d, closureRate: d.totalSchools > 0 ? d.schoolsClosed/d.totalSchools*100 : 0 }))
      .sort((a,b) => b.closureRate - a.closureRate);
  }, [filtered]);

  // Données par province
  const byProvince = useMemo(() => {
    const m = {};
    filtered.forEach(r => {
      if (!m[r.Province]) m[r.Province] = { province:r.Province, region:r.Region, totalSchools:0, schoolsClosed:0, childrenAffected:0, idps:0, incidents:0 };
      m[r.Province].totalSchools    += r.NbTotalSchool    || 0;
      m[r.Province].schoolsClosed   += r.SchoolClosed     || 0;
      m[r.Province].childrenAffected+= r.ChildrenAffected || 0;
      m[r.Province].idps            += r.IDPs             || 0;
      m[r.Province].incidents       += r.NbEvents         || 0;
    });
    return Object.values(m).map(d => ({ ...d, closureRate: d.totalSchools > 0 ? d.schoolsClosed/d.totalSchools*100 : 0 }))
      .sort((a,b) => b.closureRate - a.closureRate);
  }, [filtered]);

  // Évolution temporelle (mois fixe, toutes les années)
  const temporal = useMemo(() => YEARS.map(y => {
    const rows = rawData.filter(r => r.Year===y && r.Month===month && (region==='all'||r.Region===region));
    const tot   = rows.reduce((a,r) => a+(r.NbTotalSchool||0), 0);
    const cls   = rows.reduce((a,r) => a+(r.SchoolClosed||0), 0);
    const idps  = rows.reduce((a,r) => a+(r.IDPs||0), 0);
    const inc   = rows.reduce((a,r) => a+(r.NbEvents||0), 0);
    return { year:y, closureRate: tot>0?cls/tot*100:0, idps, incidents:inc, schoolsClosed:cls };
  }), [rawData, month, region]);

  // Données pour la carte
  const mapValues = useMemo(() => {
    const isRegion = mapView === 'regions';
    const data = isRegion ? byRegion : byProvince;
    const nameKey = isRegion ? 'region' : 'province';
    const result = {};
    data.forEach(d => {
      let v = 0;
      if (mapLayer === 'closures')  v = d.closureRate;
      if (mapLayer === 'idps')      v = d.idps;
      if (mapLayer === 'incidents') v = d.incidents;
      if (mapLayer === 'needs')     v = d.childrenAff || d.childrenAffected || 0;
      result[d[nameKey]] = v;
    });
    return result;
  }, [byRegion, byProvince, mapView, mapLayer]);

  // Listes de filtres
  const regions   = useMemo(() => [...new Set(rawData.map(d=>d.Region))].sort(), [rawData]);
  const provinces = useMemo(() => {
    const list = region==='all' ? rawData : rawData.filter(d=>d.Region===region);
    return [...new Set(list.map(d=>d.Province))].sort();
  }, [rawData, region]);

  // ── Données Chart.js ──
  const chartClosureByRegion = useMemo(() => ({
    labels: byRegion.map(d => d.region.length > 15 ? d.region.substring(0,15)+'…' : d.region),
    datasets: [{ label: 'Taux de fermeture (%)', data: byRegion.map(d => +d.closureRate.toFixed(1)),
      backgroundColor: byRegion.map(d => d.closureRate>75?'#DC262680':d.closureRate>50?'#F59E0B80':d.closureRate>25?'#FCD34D80':'#10B98180'),
      borderColor: byRegion.map(d => d.closureRate>75?'#DC2626':d.closureRate>50?'#F59E0B':d.closureRate>25?'#FCD34D':'#10B981'),
      borderWidth: 1 }]
  }), [byRegion]);

  const chartTemporal = useMemo(() => ({
    labels: temporal.map(d => d.year),
    datasets: [
      { label: 'Taux de fermeture (%)', data: temporal.map(d => +d.closureRate.toFixed(1)), borderColor: '#EF4444', backgroundColor: '#EF444420', fill: true, tension: 0.3 },
      { label: 'Incidents', data: temporal.map(d => d.incidents), borderColor: '#F59E0B', backgroundColor: '#F59E0B20', fill: true, tension: 0.3 }
    ]
  }), [temporal]);

  const chartIDPs = useMemo(() => ({
    labels: byRegion.map(d => d.region.length > 12 ? d.region.substring(0,12)+'…' : d.region),
    datasets: [{ label: 'PDI', data: byRegion.map(d => d.idps),
      backgroundColor: PALETTE.map(c => c+'99'), borderColor: PALETTE, borderWidth: 1 }]
  }), [byRegion]);

  const chartIncidents = useMemo(() => ({
    labels: byRegion.map(d => d.region.length > 12 ? d.region.substring(0,12)+'…' : d.region),
    datasets: [{ label: 'Incidents', data: byRegion.map(d => d.incidents),
      backgroundColor: '#EF444499', borderColor: '#EF4444', borderWidth: 1 }]
  }), [byRegion]);

  const chartPie = useMemo(() => ({
    labels: byRegion.slice(0,8).map(d => d.region),
    datasets: [{ data: byRegion.slice(0,8).map(d => d.schoolsClosed),
      backgroundColor: PALETTE, borderWidth: 2, borderColor: '#fff' }]
  }), [byRegion]);

  const chartCorrelation = useMemo(() => ({
    labels: byRegion.map(d => d.region),
    datasets: [{ label: 'Taux fermeture / Incidents', data: byRegion.map(d => ({ x: d.incidents, y: +d.closureRate.toFixed(1) })),
      backgroundColor: '#8B5CF699', borderColor: '#8B5CF6', pointRadius: 8, pointHoverRadius: 12 }]
  }), [byRegion]);

  // ─── Rendu ────────────────────────────────────────────────────────────────
  if (loadErr) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-md text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-red-600 mb-2">Erreur</h2>
        <p className="text-gray-600 mb-4">{loadErr}</p>
        <p className="text-sm text-gray-400">Vérifiez que tous les fichiers JSON sont présents dans le dépôt GitHub.</p>
        <button onClick={() => location.reload()} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg">Réessayer</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50">
      <div className="bg-white p-8 rounded-xl shadow-xl text-center">
        <div style={{ border:'4px solid #E0E7FF', borderTop:'4px solid #6366F1', borderRadius:'50%', width:'60px', height:'60px', animation:'spin 1s linear infinite', margin:'0 auto 20px' }}></div>
        <p className="text-lg font-medium text-gray-700">{loadMsg}</p>
        <p className="text-xs text-gray-400 mt-2">Première visite : ~15 secondes</p>
      </div>
    </div>
  );

  const mapLegendLabels = {
    closures:  ['0-25% fermées','25-50% fermées','50-75% fermées','75-100% fermées'],
    idps:      ['Faible','Moyen','Élevé','Très élevé'],
    incidents: ['Faible','Moyen','Élevé','Très élevé'],
    needs:     ['Faible','Moyen','Élevé','Critique'],
  };

  const nav = [
    { id:'dashboard',   label:'📊 Vue d\'ensemble' },
    { id:'education',   label:'🏫 Éducation' },
    { id:'deplacements',label:'👥 Déplacements' },
    { id:'securite',    label:'⚠️ Sécurité' },
    { id:'analyses',    label:'📈 Analyses croisées' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-8">
        <h1 className="text-3xl font-bold">Dashboard Humanitaire — Burkina Faso</h1>
        <p className="text-indigo-200 mt-1">Analyse de la situation éducative et sécuritaire</p>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow sticky top-0 z-40">
        <div className="flex gap-1 px-4 py-2 overflow-x-auto">
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-all ${page===n.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Année :</label>
            <select value={year} onChange={e => setYear(+e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Mois :</label>
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500">
              {MONTHS_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Région :</label>
            <select value={region} onChange={e => { setRegion(e.target.value); setProvince('all'); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="all">Toutes les régions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Province :</label>
            <select value={province} onChange={e => setProvince(e.target.value)}
              disabled={region==='all'}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100">
              <option value="all">Toutes les provinces</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="ml-auto text-xs text-gray-500 bg-indigo-50 px-3 py-1.5 rounded-lg font-medium">
            {month} {year}{region!=='all'&&` • ${region}`}{province!=='all'&&` • ${province}`}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6 max-w-screen-xl mx-auto">

        {/* ─── VUE D'ENSEMBLE ─────────────────────────────────────────────── */}
        {page === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI label="Taux de fermeture"  value={`${stats.closureRate.toFixed(1)}%`}    sub={`${fmt(stats.schoolsClosed)} / ${fmt(stats.totalSchools)} écoles`} color="from-red-500 to-red-600" />
              <KPI label="Enfants affectés"   value={fmt(stats.childrenAff)}                 sub={`${fmt(stats.teachersAff)} enseignants`}                           color="from-orange-500 to-orange-600" />
              <KPI label="Personnes déplacées" value={fmt(stats.idps)}                       sub={`${fmt(stats.idpsSchool)} en âge scolaire`}                        color="from-blue-500 to-blue-600" />
              <KPI label="Incidents sécurité" value={fmt(stats.incidents)}                   sub={`${fmt(stats.educInc)} liés à l'éducation`}                        color="from-purple-500 to-purple-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Carte */}
              <div className="bg-white p-5 rounded-xl shadow">
                <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-800">Carte de situation</h2>
                  <div className="flex gap-2">
                    <select value={mapView} onChange={e => setMapView(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1">
                      <option value="regions">Régions</option>
                      <option value="provinces">Provinces</option>
                    </select>
                    <select value={mapLayer} onChange={e => setMapLayer(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1">
                      <option value="closures">Fermetures</option>
                      <option value="idps">Déplacements</option>
                      <option value="incidents">Incidents</option>
                      <option value="needs">Besoins</option>
                    </select>
                  </div>
                </div>
                <LeafletMap
                  geoData={mapView==='regions' ? regionsGeo : provincesGeo}
                  values={mapValues}
                  title={mapLayer==='closures'?'Taux fermeture (%)':mapLayer==='idps'?'PDI':mapLayer==='incidents'?'Incidents':'Besoins'}
                  legendLabels={mapLegendLabels[mapLayer]}
                />
              </div>

              {/* Évolution temporelle */}
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-bold text-gray-800 mb-4">Évolution temporelle — {month}</h2>
                <ChartBox type="line" data={chartTemporal} height={330}
                  options={{ scales: { y: { beginAtZero: true } } }} />
              </div>
            </div>

            {/* Taux de fermeture par région */}
            <div className="bg-white p-5 rounded-xl shadow">
              <h2 className="font-bold text-gray-800 mb-4">Taux de fermeture par région</h2>
              <ChartBox type="bar" data={chartClosureByRegion} height={280}
                options={{ indexAxis:'y', scales: { x: { beginAtZero:true, max:100 } }, plugins: { legend: { display:false } } }} />
            </div>
          </div>
        )}

        {/* ─── ÉDUCATION ──────────────────────────────────────────────────── */}
        {page === 'education' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPI label="Écoles fermées"    value={fmt(stats.schoolsClosed)} sub={`sur ${fmt(stats.totalSchools)} écoles`}  color="from-red-500 to-red-600" />
              <KPI label="Enfants affectés"  value={fmt(stats.childrenAff)}   sub={`${((stats.childrenAff/Math.max(stats.schoolAgePop,1))*100).toFixed(1)}% pop. scolaire`} color="from-orange-500 to-orange-600" />
              <KPI label="Taux réouverture"  value={`${stats.reopenRate.toFixed(1)}%`} sub={`${fmt(stats.reopened)} écoles rouvertes`} color="from-green-500 to-green-600" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-bold text-gray-800 mb-4">Fermetures par région</h2>
                <ChartBox type="bar" data={chartClosureByRegion} height={300}
                  options={{ indexAxis:'y', scales: { x:{ beginAtZero:true, max:100 } }, plugins:{ legend:{ display:false } } }} />
              </div>
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-bold text-gray-800 mb-4">Évolution des fermetures — {month}</h2>
                <ChartBox type="line" data={{ labels: temporal.map(d=>d.year), datasets: [{
                  label: 'Écoles fermées', data: temporal.map(d=>d.schoolsClosed),
                  borderColor:'#EF4444', backgroundColor:'#EF444420', fill:true, tension:0.3
                }]}} height={300} options={{ scales:{ y:{ beginAtZero:true } } }} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              <h2 className="font-bold text-gray-800 mb-4">Top 10 provinces les plus affectées</h2>
              <ProvinceTable data={byProvince} />
            </div>
          </div>
        )}

        {/* ─── DÉPLACEMENTS ───────────────────────────────────────────────── */}
        {page === 'deplacements' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPI label="Total PDI"          value={fmt(stats.idps)}      sub={`${((stats.idps/Math.max(stats.totalPop,1))*100).toFixed(1)}% de la population`} color="from-blue-500 to-blue-600" />
              <KPI label="PDI âge scolaire"   value={fmt(stats.idpsSchool)} sub={`${((stats.idpsSchool/Math.max(stats.idps,1))*100).toFixed(1)}% des PDI`}       color="from-purple-500 to-purple-600" />
              <KPI label="Education PIN"      value={fmt(stats.educPIN)}   sub={`sur ${fmt(stats.totalPIN)} PIN total`}                                           color="from-indigo-500 to-indigo-600" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-bold text-gray-800 mb-4">PDI par région</h2>
                <ChartBox type="bar" data={chartIDPs} height={300}
                  options={{ scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ display:false } } }} />
              </div>
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-bold text-gray-800 mb-4">Évolution des PDI — {month}</h2>
                <ChartBox type="line" data={{ labels: temporal.map(d=>d.year), datasets:[{
                  label:'PDI', data: temporal.map(d=>d.idps),
                  borderColor:'#3B82F6', backgroundColor:'#3B82F620', fill:true, tension:0.3
                }]}} height={300} options={{ scales:{ y:{ beginAtZero:true } } }} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              <h2 className="font-bold text-gray-800 mb-4">Carte des déplacements</h2>
              <LeafletMap
                geoData={mapView==='regions' ? regionsGeo : provincesGeo}
                values={Object.fromEntries((mapView==='regions'?byRegion:byProvince).map(d => [d[mapView==='regions'?'region':'province'], d.idps]))}
                title="PDI"
                legendLabels={['Faible','Moyen','Élevé','Très élevé']}
              />
            </div>
          </div>
        )}

        {/* ─── SÉCURITÉ ───────────────────────────────────────────────────── */}
        {page === 'securite' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPI label="Incidents totaux"  value={fmt(stats.incidents)}  sub="pour la période"                                                                    color="from-red-500 to-red-600" />
              <KPI label="Incidents éducation" value={fmt(stats.educInc)}  sub={`${((stats.educInc/Math.max(stats.incidents,1))*100).toFixed(1)}% du total`}        color="from-orange-500 to-orange-600" />
              <KPI label="Incidents santé"   value={fmt(stats.healthInc)}  sub={`${((stats.healthInc/Math.max(stats.incidents,1))*100).toFixed(1)}% du total`}       color="from-yellow-500 to-yellow-600" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-bold text-gray-800 mb-4">Incidents par région</h2>
                <ChartBox type="bar" data={chartIncidents} height={300}
                  options={{ scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ display:false } } }} />
              </div>
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-bold text-gray-800 mb-4">Évolution des incidents — {month}</h2>
                <ChartBox type="line" data={{ labels:temporal.map(d=>d.year), datasets:[{
                  label:'Incidents', data:temporal.map(d=>d.incidents),
                  borderColor:'#EF4444', backgroundColor:'#EF444420', fill:true, tension:0.3
                }]}} height={300} options={{ scales:{ y:{ beginAtZero:true } } }} />
              </div>
            </div>
          </div>
        )}

        {/* ─── ANALYSES CROISÉES ──────────────────────────────────────────── */}
        {page === 'analyses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-bold text-gray-800 mb-4">Corrélation incidents — taux de fermeture</h2>
                <ChartBox type="scatter" data={chartCorrelation} height={300}
                  options={{ scales:{ x:{ title:{ display:true, text:'Incidents' } }, y:{ title:{ display:true, text:'Taux fermeture (%)' } } } }} />
              </div>
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="font-bold text-gray-800 mb-4">Distribution des fermetures par région</h2>
                <ChartBox type="pie" data={chartPie} height={300}
                  options={{ plugins:{ legend:{ position:'right', labels:{ font:{ size:10 } } } } }} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              <h2 className="font-bold text-gray-800 mb-4">Comparaison multi-critères par région</h2>
              <ChartBox type="bar" data={{
                labels: byRegion.map(d => d.region.length>12?d.region.substring(0,12)+'…':d.region),
                datasets: [
                  { label:'Taux fermeture (%)', data:byRegion.map(d=>+d.closureRate.toFixed(1)), backgroundColor:'#EF444480', borderColor:'#EF4444', borderWidth:1 },
                  { label:'Incidents (×2)',      data:byRegion.map(d=>d.incidents*2),             backgroundColor:'#F59E0B80', borderColor:'#F59E0B', borderWidth:1 }
                ]
              }} height={280} options={{ scales:{ y:{ beginAtZero:true } } }} />
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-4 mt-8 text-center text-sm">
        <p>Dashboard Burkina Faso — {month} {year}</p>
        <p className="text-gray-400 text-xs mt-1">Analyse de la situation humanitaire et éducative</p>
      </div>
    </div>
  );
};
